import type { Request, Response, NextFunction } from "express";
import {
  FREE_DAILY_AI_LIMIT,
  ensureUserRow,
  hasActivePremium,
  incrementUsageToday,
  syncRevenueCatEntitlement,
} from "../lib/premium";

// Free accounts get FREE_DAILY_AI_LIMIT AI requests per UTC day; premium is unlimited.
// Runs after requireAuth. The 429 status is what the web client already treats as
// "daily limit reached"; the error text is written so older app builds can show it as-is.
export const requireAiQuota = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.clerkUserId!;
  try {
    const user = await ensureUserRow(userId);
    if (hasActivePremium(user)) return next();

    const used = await incrementUsageToday(userId);
    if (used <= FREE_DAILY_AI_LIMIT) return next();

    if (await syncRevenueCatEntitlement(userId)) return next();

    res.status(429).json({
      error: `You've used your ${FREE_DAILY_AI_LIMIT} free AI requests for today. Upgrade to Kurspal Premium for unlimited use, or come back tomorrow.`,
      code: "daily_limit",
      limit: FREE_DAILY_AI_LIMIT,
    });
  } catch (err) {
    // A usage-tracking failure shouldn't lock students out of studying.
    req.log.error({ err }, "AI quota check failed; allowing request");
    next();
  }
};
