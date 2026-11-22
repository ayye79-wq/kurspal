import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ai, fakeClerk, fakeOpenAI, fakeStripeClient, stripe } from "./helpers";

vi.mock("@workspace/db", async () => (await import("./helpers")).createTestDb());
vi.mock("@workspace/integrations-openai-ai-server", () => ({ openai: fakeOpenAI }));
vi.mock("@clerk/express", () => fakeClerk);
vi.mock("../src/stripeClient", () => fakeStripeClient);

const { default: app } = await import("../src/app");
const { db, usersTable, courseMaterialsTable } = await import("@workspace/db");
const { getUsageToday, usageDate, FREE_DAILY_AI_LIMIT } = await import("../src/lib/premium");
const { eq } = await import("drizzle-orm");

let n = 0;
// A fresh Clerk user id per test keeps tests independent without resetting the database.
const newUser = () => `user_test_${++n}_${Date.now()}`;
const as = (userId: string) => ({ "x-test-user": userId, "x-timezone": "America/Chicago" });

async function createCourse(userId: string, name = "Biology 101") {
  const res = await request(app).post("/api/courses").set(as(userId)).send({ name });
  expect(res.status).toBe(201);
  return res.body as { id: number };
}

async function chat(userId: string, courseId?: number) {
  return request(app)
    .post("/api/ai/chat")
    .set(as(userId))
    .send({ courseId, messages: [{ role: "user", content: "Explain mitosis" }] });
}

beforeEach(() => {
  ai.fail = false;
  ai.calls = [];
});

describe("sign-in", () => {
  it("rejects requests without a signed-in user", async () => {
    expect((await request(app).get("/api/courses")).status).toBe(401);
    expect((await request(app).post("/api/ai/chat").send({ messages: [] })).status).toBe(401);
  });
});

describe("data isolation", () => {
  it("never shows one student's course to another", async () => {
    const alice = newUser();
    const bob = newUser();
    const course = await createCourse(alice);

    expect((await request(app).get(`/api/courses/${course.id}`).set(as(bob))).status).toBe(404);
    const list = await request(app).get("/api/courses").set(as(bob));
    expect(list.body).toEqual([]);
    const rename = await request(app).put(`/api/courses/${course.id}`).set(as(bob)).send({ name: "Mine now" });
    expect(rename.status).toBe(404);
    expect((await request(app).delete(`/api/courses/${course.id}`).set(as(bob))).status).toBe(404);
    expect((await request(app).get(`/api/courses/${course.id}`).set(as(alice))).body.name).toBe("Biology 101");
  });

  it("won't let another student delete or read materials", async () => {
    const alice = newUser();
    const bob = newUser();
    const course = await createCourse(alice);
    const added = await request(app)
      .post(`/api/courses/${course.id}/materials`)
      .set(as(alice))
      .send({ title: "Week 1 notes", content: "Cells divide by mitosis.", materialType: "notes" });
    expect(added.status).toBe(201);

    expect((await request(app).get(`/api/courses/${course.id}/materials`).set(as(bob))).status).toBe(404);
    const del = await request(app).delete(`/api/courses/${course.id}/materials/${added.body.id}`).set(as(bob));
    expect(del.status).toBe(404);
    const rows = await db.select().from(courseMaterialsTable).where(eq(courseMaterialsTable.id, added.body.id));
    expect(rows).toHaveLength(1);
  });

  it("won't attach an assignment to another student's course", async () => {
    const alice = newUser();
    const bob = newUser();
    const course = await createCourse(alice);
    const res = await request(app)
      .post("/api/assignments")
      .set(as(bob))
      .send({ courseId: course.id, title: "Essay", prompt: "Write about cells" });
    expect(res.status).toBe(404);
  });

  it("keeps another student's course out of the AI's context", async () => {
    const alice = newUser();
    const bob = newUser();
    const course = await createCourse(alice, "Secret Seminar");
    expect((await chat(bob, course.id)).status).toBe(200);
    expect(JSON.stringify(ai.calls.at(-1))).not.toContain("Secret Seminar");
    expect((await chat(alice, course.id)).status).toBe(200);
    expect(JSON.stringify(ai.calls.at(-1))).toContain("Secret Seminar");
  });

  it("lets a student delete their account and everything in it", async () => {
    const alice = newUser();
    await createCourse(alice);
    expect((await request(app).delete("/api/me").set(as(alice))).status).toBe(204);
    expect((await request(app).get("/api/courses").set(as(alice))).body).toEqual([]);
  });
});

describe("free daily limit", () => {
  async function waitForUsage(userId: string, expected: number) {
    await vi.waitFor(async () => expect(await getUsageToday(userId, "America/Chicago")).toBe(expected));
  }

  it("allows the free limit, then answers 429", async () => {
    const student = newUser();
    for (let i = 1; i <= FREE_DAILY_AI_LIMIT; i++) {
      expect((await chat(student)).status).toBe(200);
      await waitForUsage(student, i);
    }
    const blocked = await chat(student);
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("daily_limit");
  });

  it("doesn't count requests the AI failed to answer", async () => {
    const student = newUser();
    ai.fail = true;
    const res = await chat(student);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Couldn't reach the AI");
    await new Promise((r) => setTimeout(r, 50));
    expect(await getUsageToday(student, "America/Chicago")).toBe(0);
  });

  it("gives active premium unlimited use, and limits expired premium", async () => {
    const premium = newUser();
    const expired = newUser();
    await db.insert(usersTable).values([
      { id: premium, isPremium: true, premiumExpiresAt: new Date(Date.now() + 86_400_000) },
      { id: expired, isPremium: true, premiumExpiresAt: new Date(Date.now() - 1000) },
    ]);
    const { dailyUsageTable } = await import("@workspace/db");
    const today = usageDate("America/Chicago");
    await db.insert(dailyUsageTable).values([
      { userId: premium, usageDate: today, count: FREE_DAILY_AI_LIMIT },
      { userId: expired, usageDate: today, count: FREE_DAILY_AI_LIMIT },
    ]);
    expect((await chat(premium)).status).toBe(200);
    expect((await chat(expired)).status).toBe(429);
  });

  it("remembers the student's time zone", async () => {
    const student = newUser();
    await chat(student);
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, student));
    expect(row.timeZone).toBe("America/Chicago");
  });
});

describe("web purchases", () => {
  it("turns premium on when Stripe reports a completed checkout", async () => {
    const student = newUser();
    await db.insert(usersTable).values({ id: student });
    const event = {
      type: "checkout.session.completed",
      data: { object: { metadata: { userId: student }, payment_status: "paid", subscription: "sub_123", customer: "cus_123" } },
    };
    const res = await request(app)
      .post("/api/stripe/webhook")
      .set("stripe-signature", "t=1,v1=verified-by-library")
      .set("content-type", "application/json")
      .send(JSON.stringify(event));
    expect(res.status).toBe(200);
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, student));
    expect(row.isPremium).toBe(true);
    expect(row.stripeSubscriptionId).toBe("sub_123");
  });

  it("restores premium from Stripe for a subscriber whose webhook was missed", async () => {
    const student = newUser();
    await db.insert(usersTable).values({ id: student, stripeCustomerId: "cus_missed" });
    const { dailyUsageTable } = await import("@workspace/db");
    await db.insert(dailyUsageTable).values({ userId: student, usageDate: usageDate("America/Chicago"), count: FREE_DAILY_AI_LIMIT });
    stripe.liveSubscriptionFor = "cus_missed";
    try {
      expect((await chat(student)).status).toBe(200);
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, student));
      expect(row.isPremium).toBe(true);
    } finally {
      stripe.liveSubscriptionFor = null;
    }
  });
});

describe("usage day", () => {
  it("resets at the student's local midnight", () => {
    const lateEveningInLA = new Date("2026-11-23T05:30:00Z"); // 21:30 on the 22nd in Los Angeles
    expect(usageDate("America/Los_Angeles", lateEveningInLA)).toBe("2026-11-22");
    expect(usageDate("Europe/Berlin", lateEveningInLA)).toBe("2026-11-23");
  });

  it("falls back to US Eastern for missing or invalid zones", () => {
    const at = new Date("2026-11-23T03:00:00Z"); // 22:00 on the 22nd in New York
    expect(usageDate(null, at)).toBe("2026-11-22");
    expect(usageDate("Not/AZone", at)).toBe("2026-11-22");
  });
});

describe("web host", () => {
  it("sends website pages on the bare domain to www, but keeps the API there", async () => {
    const page = await request(app).get("/courses/3?x=1").set("host", "kurspal.com");
    expect(page.status).toBe(301);
    expect(page.headers.location).toBe("https://www.kurspal.com/courses/3?x=1");
    expect((await request(app).get("/api/healthz").set("host", "kurspal.com")).status).toBe(200);
    expect((await request(app).get("/api/healthz").set("host", "www.kurspal.com")).status).toBe(200);
  });
});

describe("request size", () => {
  it("rejects oversized JSON outside photo scan", async () => {
    const big = "x".repeat(2 * 1024 * 1024);
    const res = await request(app).post("/api/courses").set(as(newUser())).send({ name: big });
    expect(res.status).toBe(413);
  });

  it("accepts a large photo for scan", async () => {
    const res = await request(app)
      .post("/api/ai/scan")
      .set(as(newUser()))
      .send({ imageBase64: "A".repeat(2 * 1024 * 1024), mimeType: "image/jpeg" });
    expect(res.status).toBe(200);
  });
});
