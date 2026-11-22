# Moving Kurspal off Replit (to Render + Neon)

After the move:

| Piece | Where it runs | Cost |
|---|---|---|
| API + website (kurspal.com) | Render web service "kurspal" (Starter) | ~$7/month |
| Database | Neon Postgres (free tier, 0.5 GB) | $0 |
| AI | Your own OpenAI account | pay per use, billed by OpenAI |
| Payments, sign-in | Stripe, Clerk (unchanged) | unchanged |
| Crash reports | Sentry (free tier) | $0 |
| Usage analytics | PostHog (free tier) | $0 |

The mobile app keeps calling `https://kurspal.com`, so **it doesn't need a rebuild**. Only the server behind the domain changes.

Do the steps in order. Each step says **where** to do it.

---

## 1. Create accounts and get keys (browser)

1. **Render**: sign up at https://render.com with your GitHub account (ayye79-wq).
2. **Neon**: sign up at https://neon.tech. Create a project named `kurspal`, Postgres version **16**, region **AWS US West 2 (Oregon)**, which is the same region as Render.
   Open **Connection Details**, turn **Pooled connection** off, and copy the connection string. This is your **NEON_URL** (`postgresql://...neon.tech/neondb?sslmode=require`).
3. **OpenAI**: at https://platform.openai.com, add billing, then go to **API keys → Create new secret key**. This is **OPENAI_API_KEY** (`sk-...`). Set a monthly spending limit under **Limits**.
4. **Stripe**: at https://dashboard.stripe.com, switch to the **New business** account (the one Kurspal's live prices are in), make sure **Test mode is OFF**, then go to **Developers → API keys**. Copy the **Publishable key** (`pk_live_...`) and the **Secret key** (`sk_live_...`).
5. **Clerk keys** (in the Replit **Kurspal** workspace → **Secrets**, or the Clerk dashboard → **API keys**): copy `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PROXY_URL`.
   If the two `VITE_` ones aren't there, use the same publishable key for `VITE_CLERK_PUBLISHABLE_KEY`, and `https://kurspal.com/api/__clerk` for `VITE_CLERK_PROXY_URL`.

6. **RevenueCat keys** (Replit **Secrets**): copy `REVENUECAT_WEBHOOK_AUTH` and `REVENUECAT_SECRET_KEY`.
7. **Sentry**: sign up at https://sentry.io, create a project of type **Node.js** named `kurspal`, and copy its **DSN** (`https://…@….ingest.sentry.io/…`). The server and the website use the same DSN.
8. **PostHog**: sign up at https://posthog.com (US cloud), and copy the **Project API key** (`phc_…`) from **Project settings**.

Keep these values somewhere private, such as a password manager. Never put them in GitHub.

## 2. Find the Replit *production* database URL (Replit)

Replit keeps separate development and production databases, and your real users are in **production**.

In the Kurspal workspace, open the **Database** tool, switch to **Production**, and copy its connection string. This is **REPLIT_PROD_URL**.
If you can't find it, open **Deployments → Settings / Secrets** and look for `DATABASE_URL` there.

## 3. Test-copy the data to Neon (Replit Shell)

Open the **Shell** tab in the Kurspal Replit workspace. Paste each command, replacing the words in CAPITALS and keeping the quotes:

```bash
pg_dump "REPLIT_PROD_URL" --no-owner --no-acl --format=custom --file=kurspal.dump
```

```bash
pg_restore --no-owner --no-acl --dbname="NEON_URL" kurspal.dump
```

Check that the data arrived. The numbers should match what you expect:

```bash
psql "NEON_URL" -c "select (select count(*) from users) as users, (select count(*) from courses) as courses, (select count(*) from assignments) as assignments;"
```

A few `already exists` warnings from `pg_restore` are normal.
Also download `kurspal.dump` from the Replit file tree to your PC and keep it as a backup.

## 4. Create the server on Render (browser)

1. If the **kurspal** service from October is still on your Render dashboard, open it, go to **Environment**, and add the values below with **+ Add**. Otherwise click **New → Blueprint**, pick the GitHub repo **ayye79-wq/kurspal**, and click **Connect**. Render reads `render.yaml` from the repo.
2. Paste every value. Render doesn't save a field you leave empty, so check the **Environment** page afterwards:
   - `DATABASE_URL`: NEON_URL
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`
   - `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PROXY_URL`
   - `REVENUECAT_WEBHOOK_AUTH` and `REVENUECAT_SECRET_KEY`
   - `SENTRY_DSN` and `VITE_SENTRY_DSN` (the same Sentry DSN in both)
   - `POSTHOG_KEY` and `VITE_POSTHOG_KEY` (the same `phc_` key in both)
3. Click **Apply** (or **Save, rebuild, and deploy**). The first build takes about 5–10 minutes.
4. When it shows **Live**, open `https://kurspal.onrender.com/api/healthz` (the exact address is at the top of the service page). It should say `{"status":"ok"}`.
   Signing in on the `onrender.com` address may not work. That's expected, because Clerk is tied to kurspal.com.

If the deploy fails, open **Logs** and send me the red lines.

## 5. Switch kurspal.com to Render (cutover, about 15 minutes of downtime)

Do this at a quiet time, for example late at night.

1. **Final data copy (Replit Shell).** Copies everything created since step 3:
   ```bash
   pg_dump "REPLIT_PROD_URL" --no-owner --no-acl --format=custom --file=kurspal-final.dump
   ```
   ```bash
   pg_restore --no-owner --no-acl --clean --if-exists --dbname="NEON_URL" kurspal-final.dump
   ```
2. **Render → kurspal service → Settings → Custom Domains.** Add `kurspal.com` and `www.kurspal.com`. Render then shows the DNS records to use.
3. **Replit → Deployments → Settings → Domains.** Remove `kurspal.com` (and `www`) from the Replit deployment.
4. **Your domain registrar** (where you bought kurspal.com). Delete the old Replit `A` and `TXT` records, then add the records Render showed:
   - `A` record for `@` → the IP Render shows
   - `CNAME` record for `www` → `kurspal.onrender.com`
5. Wait for Render to show both domains as **Verified** with a certificate issued. This usually takes 5–30 minutes.
6. Check:
   - `https://kurspal.com/api/healthz` shows `{"status":"ok"}`.
   - The website loads and you can sign in.
   - The phone app loads your courses.
   - **Stripe → Developers → Webhooks**: the `kurspal.com/api/stripe/webhook` endpoint shows recent successful (200) deliveries after a test purchase.
   - **Sentry → Issues** and **PostHog → Activity** show events within a few minutes of using the site.

## 6. Shut Replit down (after about a week with no problems)

1. Replit → Deployments → **Shut down** the Kurspal deployment.
2. Make sure you've downloaded the latest `kurspal-final.dump` to your PC.
3. Cancel or downgrade the Replit plan.

## 7. See what the AI costs (any time after the switch)

Every AI request is logged with its feature and an estimated cost. In Neon, open **SQL Editor** and run:

```sql
SELECT feature, count(*) AS requests, round(sum(cost_micros) / 1e6::numeric, 2) AS usd
FROM ai_usage WHERE created_at > now() - interval '7 days'
GROUP BY feature ORDER BY usd DESC;
```

PostHog shows the same as `ai_request` events, plus `daily_limit_hit`, `checkout_started` and `premium_granted`.

---

### What changed in the code

- The server now reads `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` and `PUBLIC_DOMAINS` directly. It still falls back to the Replit integrations if those aren't set, so nothing breaks before the switch.
- The API server also serves the built website (`/`) and mobile-web app (`/kurspal-app/`), which Replit used to do for it.
- `render.yaml` describes the Render service. Every push to `main` redeploys automatically.
