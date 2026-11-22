import * as Sentry from "@sentry/node";

// Crash and error reporting. Imported first in index.ts so it is set up before
// anything else loads. Without SENTRY_DSN, Sentry stays off and sends nothing.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  // Errors only; no performance tracing, which would use up the free quota.
  tracesSampleRate: 0,
  // Don't attach request bodies, IPs or cookies: students' notes and drafts stay out of Sentry.
  sendDefaultPii: false,
});
