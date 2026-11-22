import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, coursesTable, assignmentsTable, toneProfilesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/clerkAuthMiddleware";
import {
  FREE_DAILY_AI_LIMIT,
  ensureUserRow,
  getUsageToday,
  hasActivePremium,
  rememberTimeZone,
  syncStripeEntitlement,
} from "../lib/premium";

const router: IRouter = Router();

// Plan and today's AI usage, so the apps can show "3 of 10 left" or a Premium badge.
router.get("/me/usage", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  let user = await ensureUserRow(userId);
  const timeZone = await rememberTimeZone(user, req.get("x-timezone"));
  // Someone who went through web checkout but isn't premium here may have a missed webhook.
  if (!hasActivePremium(user) && user.stripeCustomerId && (await syncStripeEntitlement(user))) {
    user = await ensureUserRow(userId);
  }
  const isPremium = hasActivePremium(user);
  res.json({
    isPremium,
    premiumExpiresAt: user.premiumExpiresAt,
    used: await getUsageToday(userId, timeZone),
    limit: isPremium ? null : FREE_DAILY_AI_LIMIT,
    trialEligible: !user.stripeSubscriptionId,
  });
});

// Permanently deletes the signed-in user's data and their Clerk account.
// Materials and drafts cascade from courses and assignments.
router.delete("/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  try {
    await db.transaction(async (tx) => {
      await tx.delete(assignmentsTable).where(eq(assignmentsTable.userId, userId));
      await tx.delete(coursesTable).where(eq(coursesTable.userId, userId));
      await tx.delete(toneProfilesTable).where(eq(toneProfilesTable.userId, userId));
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });
    await clerkClient.users.deleteUser(userId);
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Account deletion failed");
    res.status(500).json({ error: "Account deletion failed" });
  }
});

export default router;
