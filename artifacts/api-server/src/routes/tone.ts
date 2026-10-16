import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, toneProfilesTable } from "@workspace/db";
import { SaveToneProfileBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/clerkAuthMiddleware";

const router: IRouter = Router();

router.get("/tone-profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const [profile] = await db
    .select()
    .from(toneProfilesTable)
    .where(eq(toneProfilesTable.userId, userId))
    .orderBy(desc(toneProfilesTable.updatedAt))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "No tone profile found" });
    return;
  }
  res.json(profile);
});

router.post("/tone-profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const parsed = SaveToneProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { writingSample } = parsed.data;

  let toneSummary: string | null = null;
  try {
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "You are a writing style analyst. Analyze the provided writing sample and produce a concise 2-3 sentence summary of the writer's tone, voice, vocabulary level, sentence structure, and style. Focus on what makes this writing sound like this specific person. Be specific and actionable — this summary will be used to guide AI-generated writing to match the user's voice.",
        },
        {
          role: "user",
          content: `Analyze this writing sample:\n\n${writingSample}`,
        },
      ],
    });
    toneSummary = summaryResponse.choices[0]?.message?.content ?? null;
  } catch (err) {
    req.log.warn({ err }, "Failed to generate tone summary");
  }

  const existing = await db
    .select()
    .from(toneProfilesTable)
    .where(eq(toneProfilesTable.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    const [updated] = await db
      .update(toneProfilesTable)
      .set({ writingSample, toneSummary })
      .where(eq(toneProfilesTable.userId, userId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(toneProfilesTable)
      .values({ userId, writingSample, toneSummary })
      .returning();
    res.json(created);
  }
});

export default router;
