export interface WebhookEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Subscription {
  id: string;
  eventType: string;
  targetUrl: string;
  secret: string;
}

export interface DeliveryJobData {
  eventId: string;
  subscriptionId: string;
}
