// Read-only snapshot of a Kurspal database: which host it is and how much is in it.
// Used during the move off Replit to compare the old and new databases.
//   node lib/db/stats.mjs                 (uses DATABASE_URL)
//   node lib/db/stats.mjs "postgres://…"  (any other database)
// Prints the host only, never the password.
import pg from "pg";

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url) {
  console.error("No database URL: set DATABASE_URL or pass one as the first argument.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
const count = async (table, column) => {
  try {
    const { rows } = await client.query(
      `select count(*)::int as n${column ? `, max(${column}) as latest` : ""} from ${table}`,
    );
    return rows[0];
  } catch {
    return { n: "missing" };
  }
};

console.log("host:", new URL(url).hostname);
for (const [table, column] of [
  ["users", "updated_at"],
  ["courses", "created_at"],
  ["course_materials", "created_at"],
  ["assignments", "created_at"],
  ["daily_usage", "usage_date"],
  ["ai_usage", "created_at"],
]) {
  const { n, latest } = await count(table, column);
  console.log(`${table.padEnd(17)} ${String(n).padStart(7)}${latest ? `   latest ${new Date(latest).toISOString().slice(0, 16)}` : ""}`);
}
await client.end();
