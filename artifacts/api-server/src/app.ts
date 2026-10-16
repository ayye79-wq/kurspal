import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";

const app: Express = express();

// Behind Replit's reverse proxy: let Express derive req.ip from X-Forwarded-For.
app.set("trust proxy", true);

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Credentialed CORS only for Kurspal's own web origins. Native apps send no Origin header.
const allowedOrigins = new Set(
  [
    "kurspal.com",
    "www.kurspal.com",
    ...(process.env.PUBLIC_DOMAINS?.split(",") ?? []),
    ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
    process.env.REPLIT_DEV_DOMAIN,
  ]
    .filter((d): d is string => !!d)
    .map((d) => `https://${d.trim()}`),
);
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      const isLocalDev =
        process.env.NODE_ENV !== "production" && !!origin && /^http:\/\/localhost(:\d+)?$/.test(origin);
      callback(null, !origin || allowedOrigins.has(origin) || isLocalDev);
    },
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

// Off Replit there is no static router in front of the API, so this server also
// serves the built web apps (paths are relative to the repo root).
const webApps = [
  { base: "/kurspal-app", dir: "artifacts/kurspal-app/dist/public" },
  { base: "/", dir: "artifacts/classmate-ai/dist/public" },
];
for (const { base, dir } of webApps) {
  const root = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(path.join(root, "index.html"))) continue;
  app.use(base, express.static(root, { index: false, maxAge: "1h" }));
  app.get(base === "/" ? "/{*splat}" : [base, `${base}/{*splat}`], (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(root, "index.html"));
  });
}

export default app;
