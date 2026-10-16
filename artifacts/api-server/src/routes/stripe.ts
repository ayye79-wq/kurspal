import { Router, type IRouter } from "express";
import { stripeStorage } from "../stripeStorage";
import { stripeService } from "../stripeService";
import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { requireAuth } from "../middlewares/clerkAuthMiddleware";

const router: IRouter = Router();

router.get("/stripe/config", async (_req: Request, res: Response) => {
  try {
    const publishableKey = await stripeService.getPublishableKey();
    res.json({ publishableKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stripe/products", async (_req: Request, res: Response) => {
  try {
    const stripe = await stripeService["getPublishableKey"]().then(() => null).catch(() => null);
    void stripe;
    const { getUncachableStripeClient } = await import("../stripeClient");
    const client = await getUncachableStripeClient();
    const products = await client.products.list({ active: true, expand: ["data.default_price"] });
    const data = await Promise.all(
      products.data.map(async (p) => {
        const prices = await client.prices.list({ product: p.id, active: true });
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          metadata: p.metadata,
          prices: prices.data.map((pr) => ({
            id: pr.id,
            unitAmount: pr.unit_amount,
            currency: pr.currency,
            recurring: pr.recurring,
          })),
        };
      }),
    );
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/stripe/checkout", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.clerkUserId!;

    const { priceId } = req.body as { priceId?: unknown };
    if (typeof priceId !== "string" || !priceId) {
      return res.status(400).json({ error: "priceId is required" });
    }

    const stripe = await (await import("../stripeClient")).getUncachableStripeClient();
    const price = await stripe.prices.retrieve(priceId).catch(() => null);
    if (!price || !price.active) return res.status(400).json({ error: "Unknown price" });

    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    const user = await stripeStorage.ensureUser(userId, email);
    if (!user) return res.status(500).json({ error: "Could not load user" });

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(email ?? "", userId);
      await stripeStorage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    // userId in metadata lets the webhook flip isPremium
    const host = `${req.protocol}://${req.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: price.recurring ? "subscription" : "payment",
      success_url: `${host}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host}/checkout/cancel`,
      metadata: { userId, priceId },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error({ err }, "Checkout failed");
    res.status(500).json({ error: "Checkout failed" });
  }
});

router.get("/stripe/subscription", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await stripeStorage.getUser(req.clerkUserId!);
    if (!user?.stripeSubscriptionId) return res.json({ subscription: null });

    const subscription = await stripeStorage.getSubscription(user.stripeSubscriptionId);
    res.json({ subscription });
  } catch (err: any) {
    req.log.error({ err }, "Subscription lookup failed");
    res.status(500).json({ error: "Subscription lookup failed" });
  }
});

export default router;
