import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";

// One row per OpenAI call, so cost per feature and per free user can be measured.
// costMicros is an estimate in millionths of a dollar (see api-server lib/aiUsage.ts).
export const aiUsageTable = pgTable(
  "ai_usage",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    costMicros: integer("cost_micros").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_usage_created_at_idx").on(table.createdAt),
    index("ai_usage_user_id_idx").on(table.userId),
  ],
);

export type AiUsage = typeof aiUsageTable.$inferSelect;
