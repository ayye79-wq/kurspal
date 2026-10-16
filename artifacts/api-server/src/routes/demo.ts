import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const DEMO_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
// Hard cap on tracked IPs so a flood of distinct keys can't grow the Map unbounded.
const MAX_TRACKED_IPS = 50_000;
// Global backstop: bounds total OpenAI spend per window even if per-IP keying is
// defeated (e.g. spoofed/rotated client IPs). Generous enough that real demo
// traffic never hits it.
const GLOBAL_LIMIT = 2000;

const ipHits = new Map<string, { count: number; resetAt: number }>();
let globalCount = 0;
let globalResetAt = Date.now() + WINDOW_MS;

function getClientIp(req: Request): string {
  // `trust proxy` is enabled (app.ts), so req.ip is derived from X-Forwarded-For.
  // Best-effort key for per-IP throttling; falls back to the socket address.
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function sweepExpired(now: number): void {
  for (const [key, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(key);
  }
}

function withinGlobalLimit(now: number): boolean {
  if (now > globalResetAt) {
    globalCount = 0;
    globalResetAt = now + WINDOW_MS;
  }
  return globalCount < GLOBAL_LIMIT;
}

function checkRateLimit(ip: string, now: number): boolean {
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    if (ipHits.size >= MAX_TRACKED_IPS) {
      sweepExpired(now);
      if (ipHits.size >= MAX_TRACKED_IPS) ipHits.clear();
    }
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= DEMO_LIMIT) return false;
  entry.count += 1;
  return true;
}

const DEMO_SYSTEM_PROMPT = `You are Kurspal, an AI study companion for a student who is trying you out for the first time. A student typed something they need help with — it might be a concept to explain, a discussion post to write, or an assignment to start. Read what they actually want and help with THAT, like a sharp classmate sitting next to them.

- If they want something EXPLAINED: make it click in plain English first, then 3-4 key points (bold the core term at the start of each), then ONE vivid real-world example they can picture.
- If they want a DISCUSSION POST or any writing: write it in a natural, authentic student voice (150-200 words). Take a real position. No AI clichés — never "In today's society", "In conclusion", or "It is important to note".
- If they want help STARTING an assignment: say in plain English what it's really asking, then give a short, concrete outline they can write to.

Use clean markdown with short **bold** headers. Keep it tight and genuinely useful. No preamble, no "Great question!". Get straight to the help.`;

const DemoBody = z.object({
  prompt: z.string().min(1).max(2000),
});

router.post("/ai/demo", async (req, res): Promise<void> => {
  const parsed = DemoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const now = Date.now();
  const ip = getClientIp(req);
  if (!withinGlobalLimit(now) || !checkRateLimit(ip, now)) {
    res.status(429).json({ error: "DEMO_LIMIT_REACHED" });
    return;
  }
  globalCount += 1;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { prompt } = parsed.data;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      // gpt-5 is a reasoning model: reasoning tokens count against this budget,
      // so keep effort low (fast, cheaper) and leave headroom for visible output.
      max_completion_tokens: 2000,
      reasoning_effort: "low",
      stream: true,
      messages: [
        { role: "system", content: DEMO_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    let emittedContent = false;
    let finishReason: string | null = null;
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const content = choice?.delta?.content;
      if (content) {
        emittedContent = true;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (choice?.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }
    // gpt-5 reasoning can rarely consume the whole token budget, ending with
    // finish_reason "length" and no visible text. Surface that as an error so
    // the demo UI can prompt a retry instead of showing an empty result.
    if (!emittedContent) {
      req.log.warn({ finishReason }, "demo stream produced no content");
      res.write(
        `data: ${JSON.stringify({ error: "No response generated. Please try again." })}\n\n`,
      );
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err, "demo stream failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Demo failed" });
    } else {
      res.end();
    }
  }
});

export default router;
