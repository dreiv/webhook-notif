# webhook-service

Minimal tutorial monorepo: an API that ingests events and registers
subscriptions, and a worker that delivers events to subscribers with
retries. Built to learn queues, retries, and event-driven delivery —
not production-hardened (no HMAC signing or idempotency yet — that's
Phase 3 in the roadmap).

## Structure

```
apps/
  api/      Express app — POST /events, POST /subscriptions
  worker/   BullMQ worker — delivers events, retries on failure
packages/
  shared/   DB pool + shared types used by both apps
```

## Setup

Dependency versions in the package.json files are a reasonable starting
point but were not all verified against the npm registry at scaffold
time — before you commit, run `pnpm outdated` (or `pnpm up --latest`
per package, checking changelogs for breaking changes) to confirm
you're on current versions rather than trusting hardcoded numbers.

```bash
pnpm install
cp .env.example .env
docker compose up -d   # or merge docker-compose.reference.yml into yours
pnpm dev                # runs api + worker together via turbo
```

## Try it

```bash
# register a subscriber (use https://webhook.site for a quick target URL)
curl -X POST localhost:3000/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"eventType":"user.created","targetUrl":"https://webhook.site/your-id","secret":"supersecret123"}'

# fire an event
curl -X POST localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"type":"user.created","payload":{"email":"a@b.com"}}'
```
