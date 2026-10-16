import { Router, type IRouter } from "express";
import { stripeStorage } from "../stripeStorage";
import { stripeService } from "../stripeService";
import type { Request, Response } from "express";

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

router.post("/stripe/checkout", async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Sign in required to purchase" });
    }

    const { priceId } = req.body as { priceId: string };
    if (!priceId) return res.status(400).json({ error: "priceId is required" });

    const userId = req.user.id as string;
    const user = await stripeStorage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(user.email ?? "", userId);
      await stripeStorage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    // Build success URL with userId so webhook can flip isPremium
    const host = `${req.protocol}://${req.get("host")}`;
    const stripe = await (await import("../stripeClient")).getUncachableStripeClient();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${host}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${host}/checkout/cancel`,
      metadata: { userId, priceId },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stripe/subscription", async (req: any, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const user = await stripeStorage.getUser(req.user.id);
    if (!user?.stripeSubscriptionId) return res.json({ subscription: null });

    const subscription = await stripeStorage.getSubscription(user.stripeSubscriptionId);
    res.json({ subscription });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
