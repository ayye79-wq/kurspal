import { PostHog } from "posthog-node";
import { logger } from "./logger";

// Product analytics (PostHog). A no-op until POSTHOG_KEY is set, so local runs and
// tests send nothing. distinctId is the Clerk user id, the same id the website identifies with.
const client = process.env.POSTHOG_KEY
  ? new PostHog(process.env.POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 20,
      flushInterval: 10_000,
    })
  : null;

export function track(distinctId: string | null | undefined, event: string, properties: Record<string, unknown> = {}): void {
  if (!client) return;
  try {
    client.capture({ distinctId: distinctId || "anonymous", event, properties });
  } catch (err) {
    logger.warn({ err, event }, "Analytics capture failed");
  }
}

export async function shutdownAnalytics(): Promise<void> {
  await client?.shutdown();
}
