import { Router, type IRouter } from "express";
import { eq, desc, count, and } from "drizzle-orm";
import { db, assignmentsTable, draftsTable, coursesTable } from "@workspace/db";
import {
  CreateAssignmentBody,
  GetAssignmentParams,
  DeleteAssignmentParams,
  SaveDraftParams,
  SaveDraftBody,
} from "@workspace/api-zod";
import { z } from "zod";
import { requireAuth } from "../middlewares/clerkAuthMiddleware";

const router: IRouter = Router();

router.get("/assignments", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const courseIdParam = req.query.courseId ? z.coerce.number().int().positive().safeParse(req.query.courseId) : null;
  let query = db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.userId, userId))
    .orderBy(desc(assignmentsTable.createdAt))
    .$dynamic();

  if (courseIdParam?.success) {
    query = query.where(and(eq(assignmentsTable.userId, userId), eq(assignmentsTable.courseId, courseIdParam.data)));
  }

  const assignments = await query;
  res.json(assignments);
});

router.get("/assignments/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const [totalCoursesResult] = await db
    .select({ value: count() })
    .from(coursesTable)
    .where(eq(coursesTable.userId, userId));
  const [totalAssignmentsResult] = await db
    .select({ value: count() })
    .from(assignmentsTable)
    .where(eq(assignmentsTable.userId, userId));
  const [totalDraftsResult] = await db
    .select({ value: count() })
    .from(draftsTable)
    .leftJoin(assignmentsTable, eq(draftsTable.assignmentId, assignmentsTable.id))
    .where(eq(assignmentsTable.userId, userId));
  const recentAssignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.userId, userId))
    .orderBy(desc(assignmentsTable.createdAt))
    .limit(5);

  res.json({
    totalCourses: totalCoursesResult?.value ?? 0,
    totalAssignments: totalAssignmentsResult?.value ?? 0,
    totalDrafts: totalDraftsResult?.value ?? 0,
    recentAssignments,
  });
});

router.post("/assignments", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const parsed = CreateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [assignment] = await db
    .insert(assignmentsTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(assignment);
});

router.get("/assignments/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = GetAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, params.data.id), eq(assignmentsTable.userId, userId)));
  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  const drafts = await db
    .select()
    .from(draftsTable)
    .where(eq(draftsTable.assignmentId, params.data.id))
    .orderBy(desc(draftsTable.createdAt));
  res.json({ ...assignment, drafts });
});

router.delete("/assignments/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = DeleteAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(assignmentsTable)
    .where(and(eq(assignmentsTable.id, params.data.id), eq(assignmentsTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/assignments/:id/drafts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.clerkUserId!;
  const params = SaveDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SaveDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, params.data.id), eq(assignmentsTable.userId, userId)));
  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  const [draft] = await db
    .insert(draftsTable)
    .values({ assignmentId: params.data.id, ...parsed.data })
    .returning();
  res.status(201).json(draft);
});

export default router;
