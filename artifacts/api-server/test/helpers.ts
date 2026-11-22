import { vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "@workspace/db/schema";

// Stands in for @workspace/db: the real schema in an in-memory Postgres (PGlite),
// so tests need no database server or DATABASE_URL.
export async function createTestDb() {
  const client = new PGlite();
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  for (const statement of statements) await client.exec(statement);
  const db = drizzle(client, { schema });
  return { ...schema, db, pool: null };
}

// What the mocked OpenAI client does next: answer, or fail.
export const ai = {
  fail: false,
  // Every message list sent to OpenAI, so tests can check what context a request got.
  calls: [] as { role: string; content: unknown }[][],
};

async function* fakeStream() {
  yield { choices: [{ delta: { content: "Here is an answer." } }], usage: null };
  yield { choices: [], usage: { prompt_tokens: 120, completion_tokens: 30 } };
}

export const fakeOpenAI = {
  chat: {
    completions: {
      create: vi.fn(async (params: { stream?: boolean; messages: { role: string; content: unknown }[] }) => {
        ai.calls.push(params.messages);
        if (ai.fail) throw new Error("OpenAI is down");
        if (params.stream) return fakeStream();
        return {
          choices: [{ message: { content: '{"questions":[]}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 20 },
        };
      }),
    },
  },
};

// Stripe: the sync library accepts any signature here (it is trusted to verify in
// production), and subscriptions.list answers from `stripe.liveSubscriptionFor`.
export const stripe = { liveSubscriptionFor: null as string | null };
export const fakeStripeClient = {
  getStripeSync: async () => ({ processWebhook: async () => undefined }),
  getUncachableStripeClient: async () => ({
    subscriptions: {
      list: async ({ customer }: { customer: string }) => ({
        data: customer === stripe.liveSubscriptionFor ? [{ id: "sub_live_1", status: "active" }] : [],
      }),
    },
  }),
  getStripePublishableKey: async () => "pk_test_fake",
};

// Sign-in is simulated with an x-test-user header carrying the Clerk user id.
export const fakeClerk = {
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: (req: { headers: Record<string, string | undefined> }) => ({ userId: req.headers["x-test-user"] ?? null }),
  clerkClient: {
    users: {
      getUser: vi.fn(async (id: string) => ({ id, primaryEmailAddress: { emailAddress: `${id}@example.com` } })),
      deleteUser: vi.fn(async () => ({})),
    },
  },
};
