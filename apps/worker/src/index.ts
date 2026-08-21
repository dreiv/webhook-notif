import { Worker } from "bullmq";
import { pool, ensureSchema, type DeliveryJobData } from "@webhook/shared";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

async function run() {
  await ensureSchema();

  new Worker<DeliveryJobData>(
    "deliveries",
    async (job) => {
      const { eventId, subscriptionId } = job.data;

      const { rows: eventRows } = await pool.query(
        `SELECT * FROM events WHERE id = $1`,
        [eventId]
      );
      const { rows: subRows } = await pool.query(
        `SELECT * FROM subscriptions WHERE id = $1`,
        [subscriptionId]
      );

      const event = eventRows[0];
      const subscription = subRows[0];
      if (!event || !subscription) return;

      let statusCode: number | null = null;
      let status = "failed";

      try {
        const res = await fetch(subscription.target_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: event.id, type: event.type, payload: event.payload }),
        });
        statusCode = res.status;
        status = res.ok ? "delivered" : "failed";
      } catch {
        status = "failed";
      }

      await pool.query(
        `INSERT INTO deliveries (event_id, subscription_id, status, status_code, attempt)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventId, subscriptionId, status, statusCode, job.attemptsMade]
      );

      // Throwing hands control back to BullMQ, which applies the retry/
      // backoff settings configured when the job was enqueued.
      if (status === "failed") throw new Error(`delivery failed (${statusCode ?? "network error"})`);
    },
    { connection }
  );

  console.log("worker listening for delivery jobs");
}

run();
