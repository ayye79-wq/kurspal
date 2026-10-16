import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import multer from "multer";
import { db, coursesTable, courseMaterialsTable, assignmentsTable } from "@workspace/db";
import {
  CreateCourseBody,
  UpdateCourseBody,
  AddCourseMaterialBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod";
import { requireAuth } from "../middlewares/clerkAuthMiddleware";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function autoSummarizeMaterial(title: string, content: string): Promise<string | null> {
  try {
    const excerpt = content.slice(0, 3000);
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "You are a concise academic assistant. Given a course material title and an excerpt of its content, write a single sentence (max 20 words) summarizing what this material covers. Be specific. Do not start with 'This' or 'The'. Just state what it covers directly.",
        },
        {
          role: "user",
          content: `Title: ${title}\n\nContent:\n${excerpt}`,
        },
      ],
      max_tokens: 60,
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const MaterialIdParam = z.object({ courseId: z.coerce.number().int().positive(), materialId: z.coerce.number().int().positive() });

const COURSE_COLORS = [
  "#6B8F71", "#8B7355", "#7B8FA1", "#9B7B8F", "#8B9B7B",
  "#A17B6B", "#7B9B8B", "#8F8B7B", "#7B7B9B", "#9B8B7B",
];

router.get("/courses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const courses = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.userId, userId))
    .orderBy(desc(coursesTable.createdAt));
  res.json(courses);
});

router.post("/courses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const parsed = CreateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const randomColor = parsed.data.color ?? COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)]!;
  const { color: _color, ...rest } = parsed.data;
  const [course] = await db
    .insert(coursesTable)
    .values({ color: randomColor, userId, ...rest })
    .returning();
  res.status(201).json(course);
});

router.get("/courses/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(and(eq(coursesTable.id, params.data.id), eq(coursesTable.userId, userId)));
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const materials = await db
    .select()
    .from(courseMaterialsTable)
    .where(eq(courseMaterialsTable.courseId, params.data.id))
    .orderBy(desc(courseMaterialsTable.createdAt));
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.courseId, params.data.id))
    .orderBy(desc(assignmentsTable.createdAt));
  res.json({ ...course, materials, assignments });
});

router.put("/courses/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateCourseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.instructor !== undefined) updateData.instructor = parsed.data.instructor ?? undefined;
  if (parsed.data.term !== undefined) updateData.term = parsed.data.term ?? undefined;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description ?? undefined;
  if (parsed.data.color !== undefined && parsed.data.color !== null) updateData.color = parsed.data.color;
  const [updated] = await db
    .update(coursesTable)
    .set(updateData)
    .where(and(eq(coursesTable.id, params.data.id), eq(coursesTable.userId, userId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  res.json(updated);
});

router.delete("/courses/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db
    .delete(coursesTable)
    .where(and(eq(coursesTable.id, params.data.id), eq(coursesTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/courses/:id/materials", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(and(eq(coursesTable.id, params.data.id), eq(coursesTable.userId, userId)));
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const materials = await db
    .select()
    .from(courseMaterialsTable)
    .where(eq(courseMaterialsTable.courseId, params.data.id))
    .orderBy(desc(courseMaterialsTable.createdAt));
  res.json(materials);
});

router.post("/courses/:id/materials", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = AddCourseMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(and(eq(coursesTable.id, params.data.id), eq(coursesTable.userId, userId)));
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const summary = await autoSummarizeMaterial(parsed.data.title, parsed.data.content);
  const [material] = await db
    .insert(courseMaterialsTable)
    .values({ courseId: params.data.id, ...parsed.data, summary })
    .returning();
  res.status(201).json(material);
});

router.post("/courses/:id/materials/upload", requireAuth, upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const { title, materialType } = req.body as { title?: string; materialType?: string };
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const [course] = await db
    .select()
    .from(coursesTable)
    .where(and(eq(coursesTable.id, params.data.id), eq(coursesTable.userId, userId)));
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  let content = "";
  const fileName = req.file.originalname;
  const mimeType = req.file.mimetype;

  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    try {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      const parsed = await pdfParse(req.file.buffer);
      content = parsed.text.trim();
    } catch (err) {
      req.log.warn({ err }, "PDF parse failed");
      res.status(422).json({ error: "Could not extract text from PDF" });
      return;
    }
  } else {
    content = req.file.buffer.toString("utf-8");
  }

  if (!content) {
    res.status(422).json({ error: "No text content could be extracted from the file" });
    return;
  }

  const summary = await autoSummarizeMaterial(title, content);
  const [material] = await db
    .insert(courseMaterialsTable)
    .values({
      courseId: params.data.id,
      title,
      materialType: materialType ?? "other",
      content,
      fileName,
      summary,
    })
    .returning();
  res.status(201).json(material);
});

router.delete("/courses/:courseId/materials/:materialId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = MaterialIdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [deleted] = await db
    .delete(courseMaterialsTable)
    .where(eq(courseMaterialsTable.id, params.data.materialId))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
