import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import { useAuth } from "@clerk/react";

// Crash reports (Sentry) and product analytics (PostHog). Each stays off until its
// key is set at build time, so local and preview builds send nothing.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

export function initMonitoring(): void {
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      // Errors only; no tracing or session replay, which would capture students' notes.
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
  }
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      disable_session_recording: true,
      // Never record what students type into notes, drafts or chat.
      mask_all_text: true,
      mask_all_element_attributes: true,
    });
  }
}

// Ties events to the signed-in Clerk user, the same id the server reports with.
export function MonitoringIdentity() {
  const { isLoaded, userId } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (userId) {
      if (posthogKey) posthog.identify(userId);
      if (sentryDsn) Sentry.setUser({ id: userId });
    } else {
      if (posthogKey) posthog.reset();
      if (sentryDsn) Sentry.setUser(null);
    }
  }, [isLoaded, userId]);
  return null;
}
