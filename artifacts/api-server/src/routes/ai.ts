import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, coursesTable, courseMaterialsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/clerkAuthMiddleware";
import { requireAiQuota } from "../middlewares/aiQuotaMiddleware";
import {
  AnalyzePromptBody,
  GenerateDraftBody,
  RefineDraftBody,
  GenerateClassmateRepliesBody,
} from "@workspace/api-zod";

const CourseChatBody = z.object({
  courseId: z.number().optional().nullable(),
  currentWeek: z.string().optional().nullable(),
  mode: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
});

const CourseConceptsBody = z.object({
  courseId: z.number(),
});

const router: IRouter = Router();
// Scoped to /ai so routers mounted after this one (e.g. public Stripe routes) stay reachable.
router.use("/ai", requireAuth, requireAiQuota);

function setupSSE(res: import("express").Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

async function streamCompletion(
  res: import("express").Response,
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<void> {
  // Stop paying for tokens once the student leaves the screen.
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  try {
    const stream = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        max_completion_tokens: 2048,
        messages,
        stream: true,
      },
      { signal: abort.signal },
    );

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  } catch (err) {
    if (abort.signal.aborted) return;
    res.req.log.error({ err }, "AI stream failed");
    res.write(`data: ${JSON.stringify({ error: "Couldn't reach the AI. Please try again." })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

async function buildCourseContext(userId: string, courseId: number | null | undefined): Promise<string> {
  if (!courseId) return "";
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(and(eq(coursesTable.id, courseId), eq(coursesTable.userId, userId)));
  if (!course) return "";

  const materials = await db
    .select()
    .from(courseMaterialsTable)
    .where(eq(courseMaterialsTable.courseId, courseId));

  let context = `\n\n--- COURSE CONTEXT ---\nCourse: ${course.name}`;
  if (course.instructor) context += `\nInstructor: ${course.instructor}`;
  if (course.term) context += `\nTerm: ${course.term}`;
  if (course.description) context += `\nDescription: ${course.description}`;

  const syllabus = materials.find((m) => m.materialType === "syllabus");
  if (syllabus) {
    context += `\n\nSyllabus:\n${syllabus.content.slice(0, 3000)}`;
  }

  const otherMaterials = materials.filter((m) => m.materialType !== "syllabus").slice(0, 3);
  for (const mat of otherMaterials) {
    context += `\n\n${mat.title} (${mat.materialType}):\n${mat.content.slice(0, 1500)}`;
  }

  context += "\n--- END COURSE CONTEXT ---";
  return context;
}

router.post("/ai/analyze", async (req, res): Promise<void> => {

  const parsed = AnalyzePromptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  setupSSE(res);

  const { prompt, subject, courseId } = parsed.data;
  const courseContext = await buildCourseContext(req.clerkUserId!, courseId);
  const classContext = courseId ? "" : subject ? ` We're in a ${subject} class.` : "";

  await streamCompletion(res, [
    {
      role: "system",
      content: `You are a fellow student — a classmate who has done the readings, been paying attention, and genuinely wants to help think through this together.${classContext} You don't lecture. You think out loud, use "we", and talk like a peer who's sitting next to them.${courseContext}

When you read a discussion prompt together, you:
1. Cut through the academic language and say what it's REALLY asking — like "This is basically asking us to pick a side on X" or "They want us to connect Y concept to something real"
2. Offer 3 angles we could take — frame each as a genuine suggestion, not an assignment. Use phrases like "We could go at this from the angle of...", "Another way in is...", "Or we could take the position that..."

Use this exact format:

**What this is really asking:**
[One plain-language sentence. No academic jargon. Just what the professor actually wants from us.]

**Angle 1 — [short title]:**
[2-3 sentences. "We could argue that..." or "This angle would look at...". If we have course materials, mention a specific concept, reading, or theory from the class.]

**Angle 2 — [short title]:**
[Same style. Another genuine direction.]

**Angle 3 — [short title]:**
[Same style. Could be more contrarian, more personal, or more theoretical — give variety.]

Keep it tight. Sound like a smart classmate, not a textbook.`,
    },
    {
      role: "user",
      content: `Here's this week's prompt:\n\n${prompt}`,
    },
  ]);
});

router.post("/ai/draft", async (req, res): Promise<void> => {

  const parsed = GenerateDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  setupSSE(res);

  const { prompt, subject, ideaDirection, toneSummary, courseId } = parsed.data;
  const courseContext = await buildCourseContext(req.clerkUserId!, courseId);
  const classContext = courseId ? "" : subject ? ` This is for a ${subject} class.` : "";
  const directionLine = ideaDirection
    ? `\n\nThe angle we're going with: ${ideaDirection}`
    : "";
  const toneInstruction = toneSummary
    ? `\n\nThis person's writing style: ${toneSummary}. Write so it sounds exactly like them — their vocabulary, their sentence rhythm, their level of formality. Don't upgrade their language or make it more polished than they'd naturally write.`
    : "\n\nWrite like a real student wrote this — thoughtful, clear, with their own voice. Not polished to the point of sounding fake. No AI tells: no 'In conclusion', no 'It is important to note', no 'In today's rapidly evolving world'.";

  await streamCompletion(res, [
    {
      role: "system",
      content: `You are a classmate helping write a discussion response together.${classContext} The goal is a post that sounds authentically human — like someone who actually engaged with the material, not like they ran it through AI.

When course materials are available, weave in specific concepts, readings, or examples from class naturally — the way a student who was paying attention would. Don't announce it ("According to the syllabus..."), just use it.

Write 150-250 words. Use the first person. Sound real.${toneInstruction}${directionLine}${courseContext}`,
    },
    {
      role: "user",
      content: `Write a discussion response for this prompt:\n\n${prompt}`,
    },
  ]);
});

router.post("/ai/refine", async (req, res): Promise<void> => {

  const parsed = RefineDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  setupSSE(res);

  const { currentDraft, instruction, prompt, toneSummary, courseId } = parsed.data;
  const courseContext = await buildCourseContext(req.clerkUserId!, courseId);
  const toneInstruction = toneSummary
    ? `\n\nTheir writing voice: ${toneSummary}. Every edit should stay true to that voice — don't make it more formal, don't clean it up beyond what they'd write.`
    : "\n\nKeep their natural voice intact. Don't over-polish. It should still sound like a real student wrote it.";
  const promptContext = prompt ? `\n\nOriginal discussion prompt: ${prompt}` : "";

  await streamCompletion(res, [
    {
      role: "system",
      content: `You are a classmate helping edit a discussion post based on a specific note. Apply exactly what was asked. Don't rewrite things that weren't mentioned. Keep it human.

Output ONLY the revised post — no explanation, no "here's what I changed", no preamble.${toneInstruction}${promptContext}${courseContext}`,
    },
    {
      role: "user",
      content: `Note: ${instruction}\n\nCurrent draft:\n${currentDraft}`,
    },
  ]);
});

router.post("/ai/classmate-replies", async (req, res): Promise<void> => {

  const parsed = GenerateClassmateRepliesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  setupSSE(res);

  const { originalPrompt, classmatePost, toneSummary, courseId } = parsed.data;
  const courseContext = await buildCourseContext(req.clerkUserId!, courseId);
  const toneInstruction = toneSummary
    ? `\n\nTheir voice: ${toneSummary}. Both replies should sound like them.`
    : "\n\nWrite in a genuine, conversational student voice — not stiff, not overly academic.";

  await streamCompletion(res, [
    {
      role: "system",
      content: `You are a classmate helping write a reply to someone else's discussion post. Give two options — because there's always more than one way to respond.

Option 1 should agree and build: find the strongest part of what they said, confirm it, and then add something new — a detail they missed, a connection to something else from class, a personal example.

Option 2 should push back or add nuance: respectfully challenge an assumption, offer a counterpoint, or complicate something they oversimplified. Not hostile — just intellectually honest.

Both replies should be 75-120 words. Both should sound like a real student, not a bot. No opener like "Great post!" or "I really liked how you..."${toneInstruction}

If course materials are available, either option can draw on specific class content naturally.${courseContext}

Use this format:

**Option 1 — Agree and add:**
[Reply]

**Option 2 — Push back or add nuance:**
[Reply]`,
    },
    {
      role: "user",
      content: `Discussion prompt: ${originalPrompt}\n\nClassmate's post:\n${classmatePost}\n\nHelp me reply to this.`,
    },
  ]);
});

router.post("/ai/chat", async (req, res): Promise<void> => {

  const parsed = CourseChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  setupSSE(res);

  const { courseId, currentWeek, messages, mode } = parsed.data;
  const courseContext = await buildCourseContext(req.clerkUserId!, courseId);
  const weekLine = currentWeek ? `\n\nRight now we're on: ${currentWeek}. When the student asks about "this week" or "today's topic", that's what they mean. Ground your answers in that.` : "";

  let modeInstructions = "";
  if (mode === "explain") {
    modeInstructions = `\n\nThe student wants you to EXPLAIN something. Your job is to make it click — that "ohhh I get it now" feeling. Use EXACTLY this format with these exact section headers, in this order:

## What this means
1–2 sentences ONLY. Plain English. No jargon. The moment you'd text a friend who missed class. Should feel like sudden clarity — not a definition, not a summary.

## Key ideas
3–5 short bullet points. No academic language. Each bullet = one thought, one line. Easy to scan, easy to memorize. Bold the core term at the start of each using **bold**.

## Break it down
2–3 sentences of context. This is DIFFERENT from key ideas — this is the bigger picture: why this concept exists, why some things succeed and others fail, what it reveals about the world. Make it meaningful, not just informative.

## Real example
Start with a relevant emoji, then give ONE vivid real-world example in 2–3 sentences. Make it something the student can picture — something they'd screenshot and send to a friend. Connect it to something they already know.

## Say it like this
ONE sentence. The exact words a student could say in class or write in a discussion post to sound like they truly get it. Confident, clear, not robotic.

## If you remember ONE thing…
One short, punchy sentence in bold. The single most important takeaway from everything above. The thing that should stick even after they forget everything else.

---
No intro. No "Great question!" No "In conclusion." Start directly with ## What this means.`;
  } else if (mode === "discussion") {
    modeInstructions = `\n\nThe student needs help writing a DISCUSSION POST. Write one that sounds like a real student who actually thought about this — not robotic, not AI-polished, not starting with "In today's society...". Natural voice. 150-250 words. Make an actual argument or take a real position. If course materials are available, weave in a specific concept or reading naturally — the way someone who was paying attention would, not by announcing it.`;
  } else if (mode === "assignment") {
    modeInstructions = `\n\nThe student needs help with an ASSIGNMENT. Don't write it for them — guide them through it. First, cut through the academic language and say in plain English what it's actually asking. Then give a concrete outline: what each part should do, in what order, and roughly how much to say for each. End with one sentence on where to start. Make it feel like a knowledgeable classmate sitting next to them walking through it together.`;
  }

  const systemPrompt = `You are a fellow student in this class — someone who has done the readings, been paying attention, and is genuinely happy to think things through together. You're not a tutor, not a professor. You're a peer.

Speak like one: "oh yeah, I think that's about...", "honestly the key thing is...", "we could look at it as...", "good question — I got confused by that too". Use "we" and "us" naturally. Be direct. Be real.

When asked about course content, draw on the specific materials you have. Name the readings, reference the syllabus sections, bring up actual concepts from class — the way a classmate who actually did the work would.

Keep it conversational. Don't over-explain. Don't lecture. Don't bullet-point unless it genuinely helps.${modeInstructions}${weekLine}${courseContext}`;

  await streamCompletion(res, [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ]);
});

const ScanBody = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().default("image/jpeg"),
});

router.post("/ai/scan", async (req, res): Promise<void> => {
  const parsed = ScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { imageBase64, mimeType } = parsed.data;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" },
            },
            {
              type: "text",
              text: "Extract ALL text visible in this image exactly as it appears. Include every word, heading, number, label, and bullet point. Preserve the original structure and line breaks where meaningful. Output only the raw extracted text — no commentary, no explanation, no markdown formatting unless it was already there.",
            },
          ],
        },
      ],
    } as Parameters<typeof openai.chat.completions.create>[0]);

    const text = response.choices[0]?.message?.content ?? "";
    res.json({ text });
  } catch (err) {
    req.log.error(err, "scan failed");
    res.status(500).json({ error: "Failed to extract text from image" });
  }
});

router.post("/ai/concepts", async (req, res): Promise<void> => {
  const parsed = CourseConceptsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  setupSSE(res);

  const { courseId } = parsed.data;
  const courseContext = await buildCourseContext(req.clerkUserId!, courseId);

  if (!courseContext) {
    res.write(`data: ${JSON.stringify({ content: "Add some course materials first and I'll pull out the key concepts for you." })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  await streamCompletion(res, [
    {
      role: "system",
      content: `You are a classmate summarizing the most important concepts from course materials for a fellow student. Be concise, use plain language, and focus on what's actually going to matter for discussions and assignments. Format as a clean list — each item is a concept name followed by a one-sentence plain-English explanation. No jargon unless it's a term they genuinely need to know. Max 8 concepts.${courseContext}`,
    },
    {
      role: "user",
      content: "What are the key concepts we need to know for this course?",
    },
  ]);
});

const QuizBody = z.object({
  content: z.string(),
  courseId: z.number().optional().nullable(),
});

router.post("/ai/quiz", async (req, res): Promise<void> => {

  const parsed = QuizBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const { content, courseId } = parsed.data;
  const courseContext = await buildCourseContext(req.clerkUserId!, courseId);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1500,
      stream: false,
      messages: [
        {
          role: "system",
          content: `You are a quiz generator for a student study app. Generate a quiz based on the given content. Return ONLY valid JSON — no markdown, no explanation, just raw JSON.

Format exactly:
{"questions":[{"type":"mcq","question":"...","options":["A text","B text","C text","D text"],"answer":0,"explanation":"..."},{"type":"short","question":"...","answer":"Model answer in 1-2 sentences.","explanation":"..."}]}

Rules:
- Exactly 5 MCQ questions and 2 short-answer questions (7 total)
- "answer" for MCQ is 0-indexed integer matching the correct option
- Questions go from easier to harder
- Explanations are concise (1-2 sentences) and educational
- Use plain language, no filler${courseContext}`,
        },
        {
          role: "user",
          content: `Generate a quiz from this content:\n\n${content.slice(0, 3000)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const data = JSON.parse(jsonStr);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Quiz generation failed" });
  }
});

export default router;
