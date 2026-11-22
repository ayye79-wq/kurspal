import type { Request, Response } from "express";
import { db, aiUsageTable } from "@workspace/db";
import { logger } from "./logger";
import { track } from "./analytics";

// US dollars per million tokens [input, output]. Estimates for budgeting, not billing;
// update when OpenAI changes prices or a feature switches model.
const PRICE_PER_MILLION: Record<string, [number, number]> = {
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "gpt-5-mini": [0.25, 2],
};

export type TokenUsage = { prompt_tokens?: number; completion_tokens?: number } | null | undefined;

export function estimateCostMicros(model: string, usage: TokenUsage): number {
  const [input, output] = PRICE_PER_MILLION[model] ?? [0, 0];
  // $/1M tokens × tokens = millionths of a dollar.
  return Math.round((usage?.prompt_tokens ?? 0) * input + (usage?.completion_tokens ?? 0) * output);
}

// Feature name from the route, e.g. /ai/chat → "chat".
export function featureFromPath(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? "unknown";
}

// Records what one OpenAI call cost. Never throws: losing a usage row must not fail the answer.
export function recordAiUsage(opts: {
  userId: string | null | undefined;
  feature: string;
  model: string;
  usage: TokenUsage;
}): void {
  const promptTokens = opts.usage?.prompt_tokens ?? 0;
  const completionTokens = opts.usage?.completion_tokens ?? 0;
  const costMicros = estimateCostMicros(opts.model, opts.usage);
  db.insert(aiUsageTable)
    .values({ userId: opts.userId ?? null, feature: opts.feature, model: opts.model, promptTokens, completionTokens, costMicros })
    .catch((err: unknown) => logger.warn({ err, feature: opts.feature }, "Failed to record AI usage"));
  track(opts.userId, "ai_request", {
    feature: opts.feature,
    model: opts.model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    cost_usd: costMicros / 1_000_000,
  });
}

// For quota-counted /ai routes: marks the request answered (so it counts toward the
// free limit) and records its cost.
export function markAiAnswered(req: Request, res: Response, model: string, usage: TokenUsage): void {
  res.locals.aiAnswered = true;
  recordAiUsage({ userId: req.clerkUserId, feature: featureFromPath(req.path), model, usage });
}
