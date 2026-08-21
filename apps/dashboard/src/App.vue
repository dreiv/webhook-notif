<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Delivery {
  id: string;
  status: "delivered" | "failed" | "pending";
  status_code: number | null;
  attempt: number;
  created_at: string;
  event_type: string;
  payload: Record<string, unknown>;
  target_url: string;
}

interface Subscription {
  id: string;
  event_type: string;
  target_url: string;
}

const deliveries = ref<Delivery[]>([]);
const subscriptions = ref<Subscription[]>([]);
const error = ref<string | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

async function refresh() {
  try {
    const [deliveriesRes, subsRes] = await Promise.all([
      fetch(`${API_URL}/deliveries`),
      fetch(`${API_URL}/subscriptions`),
    ]);
    if (!deliveriesRes.ok || !subsRes.ok) throw new Error("request failed");
    deliveries.value = await deliveriesRes.json();
    subscriptions.value = await subsRes.json();
    error.value = null;
  } catch {
    error.value = `can't reach the API at ${API_URL} — is it running?`;
  }
}

onMounted(() => {
  refresh();
  timer = setInterval(refresh, 3000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString();
}

function truncateUrl(url: string) {
  return url.length > 42 ? url.slice(0, 39) + "..." : url;
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="title">Deliveries</div>
      <div class="counts">
        <span>{{ subscriptions.length }} subscription{{ subscriptions.length === 1 ? "" : "s" }}</span>
        <span class="dot">·</span>
        <span>{{ deliveries.length }} recent deliver{{ deliveries.length === 1 ? "y" : "ies" }}</span>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="!error && subscriptions.length === 0" class="empty">
      No subscriptions registered yet. POST to <code>/subscriptions</code> to add one.
    </section>

    <table v-if="!error && deliveries.length > 0" class="log">
      <thead>
        <tr>
          <th>Time</th>
          <th>Event</th>
          <th>Target</th>
          <th>Attempt</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in deliveries" :key="d.id">
          <td class="muted">{{ formatTime(d.created_at) }}</td>
          <td>{{ d.event_type }}</td>
          <td class="muted" :title="d.target_url">{{ truncateUrl(d.target_url) }}</td>
          <td class="muted">#{{ d.attempt }}</td>
          <td>
            <span class="badge" :class="d.status">
              {{ d.status }}<template v-if="d.status_code"> · {{ d.status_code }}</template>
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <section v-else-if="!error && subscriptions.length > 0" class="empty">
      No deliveries yet. POST an event to <code>/events</code> matching a subscribed type.
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.counts {
  font-size: 13px;
  color: var(--muted);
}

.dot {
  margin: 0 8px;
}

.error {
  color: var(--fail);
  font-size: 14px;
}

.empty {
  color: var(--muted);
  font-size: 14px;
  border: 1px dashed var(--border);
  border-radius: 4px;
  padding: 24px;
  text-align: center;
}

.empty code {
  color: var(--text);
  background: var(--surface);
  padding: 1px 6px;
  border-radius: 3px;
}

.log {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.log thead th {
  text-align: left;
  color: var(--muted);
  font-weight: 500;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.log tbody td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.log tbody tr:hover {
  background: var(--surface);
}

.muted {
  color: var(--muted);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  border: 1px solid transparent;
}

.badge.delivered {
  color: var(--ok);
  border-color: color-mix(in srgb, var(--ok) 40%, transparent);
  background: color-mix(in srgb, var(--ok) 10%, transparent);
}

.badge.failed {
  color: var(--fail);
  border-color: color-mix(in srgb, var(--fail) 40%, transparent);
  background: color-mix(in srgb, var(--fail) 10%, transparent);
}

.badge.pending {
  color: var(--pending);
  border-color: color-mix(in srgb, var(--pending) 40%, transparent);
  background: color-mix(in srgb, var(--pending) 10%, transparent);
}
</style>
