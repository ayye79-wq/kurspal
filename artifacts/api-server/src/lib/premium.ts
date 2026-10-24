import { and, eq, sql } from "drizzle-orm";
import { db, usersTable, dailyUsageTable, type User } from "@workspace/db";
import { logger } from "./logger";

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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsageToday(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: dailyUsageTable.count })
    .from(dailyUsageTable)
    .where(and(eq(dailyUsageTable.userId, userId), eq(dailyUsageTable.usageDate, today())));
  return row?.count ?? 0;
}

export async function incrementUsageToday(userId: string): Promise<number> {
  const [row] = await db
    .insert(dailyUsageTable)
    .values({ userId, usageDate: today(), count: 1 })
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
