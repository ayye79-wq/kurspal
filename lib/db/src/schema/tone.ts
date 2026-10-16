import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toneProfilesTable = pgTable("tone_profiles", {
  id: serial("id").primaryKey(),
  writingSample: text("writing_sample").notNull(),
  toneSummary: text("tone_summary"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertToneProfileSchema = createInsertSchema(toneProfilesTable).omit({ id: true, updatedAt: true });

export type InsertToneProfile = z.infer<typeof insertToneProfileSchema>;
export type ToneProfile = typeof toneProfilesTable.$inferSelect;
