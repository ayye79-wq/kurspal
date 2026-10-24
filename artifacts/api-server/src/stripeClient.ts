import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

// Describes a key without revealing it, e.g. "sk_live… (107 chars)" or "missing".
function describeKey(value: string | undefined): string {
  if (!value) return "missing";
  return `${value.slice(0, value.indexOf("_", 3) + 1 || 3)}… (${value.length} chars)`;
}

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // Keys straight from the Stripe dashboard win over the Replit connector.
  // Replit withholds STRIPE_* deployment secrets from the app, so on Replit
  // the keys are stored under KURSPAL_STRIPE_* instead.
  const secretKey = (process.env.KURSPAL_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY)?.trim();
  const publishableKey = (process.env.KURSPAL_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY)?.trim();
  if (secretKey && publishableKey) {
    return { secretKey, publishableKey };
  }
  if (secretKey || publishableKey) {
    throw new Error(
      `Stripe keys incomplete: secret key is ${describeKey(secretKey)}, publishable key is ${describeKey(publishableKey)}.`,
    );
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Stripe keys missing: set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.",
    );
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText} (no KURSPAL_STRIPE_* or STRIPE_* keys are set on this server)`,
    );
  }

  const data = await resp.json();
  const settings = data.items?.[0]?.settings;

  if (!settings?.secret || !settings?.publishable) {
    throw new Error(
      "Stripe integration not connected or missing keys. Connect Stripe via the Integrations tab first.",
    );
  }

  return { publishableKey: settings.publishable, secretKey: settings.secret };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" as any });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

  const { secretKey } = await getCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 2 },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: "",
  });
}
