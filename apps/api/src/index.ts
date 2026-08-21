import express from "express";
import { Queue } from "bullmq";
import { z } from "zod";
import { pool, ensureSchema, type DeliveryJobData } from "@webhook/shared";

const app = express();
app.use(express.json());

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

const deliveryQueue = new Queue<DeliveryJobData>("deliveries", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
  },
});

const eventSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.unknown()),
});

const subscriptionSchema = z.object({
  eventType: z.string().min(1),
  targetUrl: z.string().url(),
  secret: z.string().min(8),
});

app.post("/events", async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { type, payload } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO events (type, payload) VALUES ($1, $2) RETURNING id`,
    [type, payload],
  );
  const eventId = rows[0].id as string;

  const { rows: subs } = await pool.query(
    `SELECT id FROM subscriptions WHERE event_type = $1`,
    [type],
  );

  for (const sub of subs) {
    await deliveryQueue.add("deliver", {
      eventId,
      subscriptionId: sub.id,
    });
  }

  res.status(201).json({ id: eventId, subscribers: subs.length });
});

app.post("/subscriptions", async (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { eventType, targetUrl, secret } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO subscriptions (event_type, target_url, secret) VALUES ($1, $2, $3) RETURNING id`,
    [eventType, targetUrl, secret],
  );

  res.status(201).json({ id: rows[0].id });
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);

ensureSchema().then(() => {
  app.listen(port, () => console.log(`api listening on :${port}`));
});
