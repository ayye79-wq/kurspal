import { eq } from "drizzle-orm";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { stripeStorage } from "./stripeStorage";
import { db, usersTable } from "@workspace/db";
import { logger } from "./lib/logger";
import { track } from "./lib/analytics";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "This usually means express.json() parsed the body before this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const sync = await getStripeSync();
    // Verifies the signature (throws if it's wrong) and mirrors the data into the stripe schema.
    await sync.processWebhook(payload, signature);

    // processWebhook resolves to nothing, so the verified payload is parsed here for
    // Kurspal's own logic. (It used to test that return value, which skipped this step.)
    const event = JSON.parse(payload.toString("utf8"));
    await WebhookHandlers.handleEvent(event);
  }

  static async handleEvent(event: any): Promise<void> {
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) return;

        if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
          const subscriptionId = session.subscription as string | null;
          if (subscriptionId) {
            await stripeStorage.updateUserStripeInfo(userId, {
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: session.customer as string,
            });
          }
          // One-time Finals Mode purchases last 7 days; subscriptions stay active until cancelled.
          const expiresAt = subscriptionId ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await stripeStorage.setUserPremium(userId, true, expiresAt);
          logger.info({ userId, subscriptionId }, "Kurspal Premium activated");
          track(userId, "premium_granted", { source: "stripe", subscription: !!subscriptionId });
        }
      }

      if (event.type === "customer.subscription.updated") {
        const sub = event.data.object;
        const [user] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.stripeSubscriptionId, sub.id));
        if (user) {
          const isActive = sub.status === "active" || sub.status === "trialing";
          await stripeStorage.setUserPremium(user.id, isActive, null);
          logger.info({ userId: user.id, status: sub.status }, "Subscription updated");
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const [user] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.stripeSubscriptionId, sub.id));
        if (user) {
          await stripeStorage.setUserPremium(user.id, false, null);
          logger.info({ userId: user.id }, "Subscription cancelled — premium revoked");
        }
      }

      if (event.type === "charge.refunded") {
        const charge = event.data.object;
        const stripe = await getUncachableStripeClient();
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: charge.payment_intent,
          limit: 1,
        });
        const session = sessions.data[0];
        const userId = session?.metadata?.userId;
        if (userId) {
          await stripeStorage.setUserPremium(userId, false, null);
          logger.info({ userId }, "Premium revoked due to refund");
        }
      }
    } catch (err: any) {
      logger.error({ err, type: event?.type }, "Error handling Stripe event");
      // A non-2xx answer makes Stripe retry, so a database hiccup can't lose a purchase.
      throw err;
    }
  }
}
