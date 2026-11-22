import { and, eq, sql } from "drizzle-orm";
import { db, usersTable, dailyUsageTable, type User } from "@workspace/db";
import { logger } from "./logger";
import { getUncachableStripeClient } from "../stripeClient";

export const FREE_DAILY_AI_LIMIT = Number(process.env.FREE_DAILY_AI_LIMIT) || 10;
const REVENUECAT_ENTITLEMENT = "premium";

// Premium needs the flag on and, for time-limited passes (Finals Mode, store
// purchases), an expiry still in the future. A null expiry never runs out.
export function hasActivePremium(
  user: Pick<User, "isPremium" | "premiumExpiresAt"> | null | undefined,
  now = new Date(),
): boolean {
  return !!user?.isPremium && (!user.premiumExpiresAt || user.premiumExpiresAt > now);
}

// Mobile-only users never pass through Stripe checkout, so their row may not exist yet.
export async function ensureUserRow(userId: string): Promise<User> {
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing({ target: usersTable.id });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user;
}

// Most students are in the US; used until an app reports the student's own zone.
export const DEFAULT_TIME_ZONE = "America/New_York";

export function isValidTimeZone(zone: string | null | undefined): zone is string {
  if (!zone || zone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// The free limit resets at the student's local midnight, not UTC midnight.
export function usageDate(timeZone: string | null | undefined, now = new Date()): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(now);
}

// Stores the zone the app sends in X-Timezone so every endpoint agrees on "today".
export async function rememberTimeZone(user: User, reported: string | undefined): Promise<string | null> {
  if (isValidTimeZone(reported) && reported !== user.timeZone) {
    await db.update(usersTable).set({ timeZone: reported }).where(eq(usersTable.id, user.id));
    return reported;
  }
  return user.timeZone;
}

export async function getUsageToday(userId: string, timeZone: string | null): Promise<number> {
  const [row] = await db
    .select({ count: dailyUsageTable.count })
    .from(dailyUsageTable)
    .where(and(eq(dailyUsageTable.userId, userId), eq(dailyUsageTable.usageDate, usageDate(timeZone))));
  return row?.count ?? 0;
}

export async function incrementUsageToday(userId: string, timeZone: string | null): Promise<number> {
  const [row] = await db
    .insert(dailyUsageTable)
    .values({ userId, usageDate: usageDate(timeZone), count: 1 })
    .onConflictDoUpdate({
      target: [dailyUsageTable.userId, dailyUsageTable.usageDate],
      set: { count: sql`${dailyUsageTable.count} + 1` },
    })
    .returning({ count: dailyUsageTable.count });
  return row.count;
}

// Records an App Store / Google Play entitlement. A live Stripe subscription
// (premium with no expiry) is left alone so a store event can't cancel it.
export async function applyStorePremium(userId: string, active: boolean, expiresAt: Date | null): Promise<void> {
  const user = await ensureUserRow(userId);
  if (user.stripeSubscriptionId && hasActivePremium(user) && !user.premiumExpiresAt) return;
  await db
    .update(usersTable)
    .set({ isPremium: active, premiumExpiresAt: active ? expiresAt : null })
    .where(eq(usersTable.id, userId));
}

// Asks Stripe directly whether the user has a live web subscription. Repairs accounts
// whose purchase webhook was missed (before Nov 2026 web purchases never set premium).
export async function syncStripeEntitlement(user: User): Promise<boolean> {
  if (!user.stripeCustomerId) return false;
  try {
    const stripe = await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 10 });
    const live = subs.data.find((s) => s.status === "active" || s.status === "trialing");
    if (!live) return false;
    await db
      .update(usersTable)
      .set({ isPremium: true, premiumExpiresAt: null, stripeSubscriptionId: live.id })
      .where(eq(usersTable.id, user.id));
    logger.info({ userId: user.id, subscriptionId: live.id }, "Web premium restored from Stripe");
    return true;
  } catch (err) {
    logger.warn({ err, userId: user.id }, "Stripe entitlement check failed");
    return false;
  }
}

// Asks RevenueCat directly whether the user has the premium entitlement. Covers
// webhook delays right after a purchase. Returns false when no secret key is set.
export async function syncRevenueCatEntitlement(userId: string): Promise<boolean> {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) return false;
  try {
    const resp = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
    };
    const entitlement = data.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT];
    if (!entitlement) return false;
    const expiresAt = entitlement.expires_date ? new Date(entitlement.expires_date) : null;
    if (expiresAt && expiresAt <= new Date()) return false;
    await applyStorePremium(userId, true, expiresAt);
    return true;
  } catch (err) {
    logger.warn({ err, userId }, "RevenueCat entitlement check failed");
    return false;
  }
}
