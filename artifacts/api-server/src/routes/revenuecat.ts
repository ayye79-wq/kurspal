import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter } from "express";
import { applyStorePremium } from "../lib/premium";

const router: IRouter = Router();

const ENTITLEMENT = "premium";
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);
// CANCELLATION and BILLING_ISSUE keep access until the stored expiry passes, so
// they need no change here.

type RevenueCatEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  transferred_from?: string[];
};

function authorized(header: string | undefined): boolean {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Clerk user IDs only; purchases made before sign-in carry anonymous RevenueCat IDs.
function knownUserIds(ids: (string | undefined)[]): string[] {
  return [...new Set(ids.filter((id): id is string => !!id && !id.startsWith("$RCAnonymousID")))];
}

// RevenueCat → Dashboard → Integrations → Webhooks. Set the Authorization header
// value there to the same secret as REVENUECAT_WEBHOOK_AUTH.
router.post("/revenuecat/webhook", async (req, res): Promise<void> => {
  if (!authorized(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const event = (req.body as { event?: RevenueCatEvent })?.event;
  if (!event?.type) {
    res.status(400).json({ error: "Missing event" });
    return;
  }

  const userIds = knownUserIds([event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]);
  const touchesPremium = !event.entitlement_ids || event.entitlement_ids.includes(ENTITLEMENT);

  try {
    if (GRANT_EVENTS.has(event.type) && touchesPremium) {
      const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
      for (const id of userIds) await applyStorePremium(id, true, expiresAt);
      req.log.info({ type: event.type, userIds }, "Store premium granted");
    } else if (event.type === "EXPIRATION" && touchesPremium) {
      for (const id of userIds) await applyStorePremium(id, false, null);
      req.log.info({ userIds }, "Store premium expired");
    } else if (event.type === "TRANSFER") {
      // The receiving account is picked up by the entitlement check when it next hits the free limit.
      for (const id of knownUserIds(event.transferred_from ?? [])) await applyStorePremium(id, false, null);
    }
    res.sendStatus(200);
  } catch (err) {
    req.log.error({ err, type: event.type }, "RevenueCat webhook failed");
    // Non-2xx makes RevenueCat retry later.
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
