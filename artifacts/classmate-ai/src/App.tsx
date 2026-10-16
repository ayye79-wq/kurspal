import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Onboarding } from "@/components/onboarding";
import { AiConsentModal, useAiConsent } from "@/components/ai-consent-modal";

import Workspace from "@/pages/workspace";
import AssignmentsPage from "@/pages/assignments";
import AssignmentDetail from "@/pages/assignment-detail";
import ToneProfilePage from "@/pages/tone-profile";
import CoursesPage from "@/pages/courses";
import CourseDetailPage from "@/pages/course-detail";
import CheckoutSuccess from "@/pages/checkout-success";
import CheckoutCancel from "@/pages/checkout-cancel";
import PrivacyPage from "@/pages/privacy";
import SupportPage from "@/pages/support";
import DeleteAccountPage from "@/pages/delete-account";
import LandingPage from "@/pages/landing";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#7c5cfc",
    colorForeground: "#e4e7f0",
    colorMutedForeground: "#a0a4b8",
    colorDanger: "#ef4444",
    colorBackground: "#13111e",
    colorInput: "#1e1b2e",
    colorInputForeground: "#e4e7f0",
    colorNeutral: "#2a2340",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#1a1728] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl border border-[#2a2340]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#e4e7f0]",
    headerSubtitle: "text-[#a0a4b8]",
    socialButtonsBlockButtonText: "text-[#e4e7f0]",
    formFieldLabel: "text-[#c4c8d8]",
    footerActionLink: "text-[#a78bfa] hover:text-[#7c5cfc]",
    footerActionText: "text-[#a0a4b8]",
    dividerText: "text-[#a0a4b8]",
    identityPreviewEditButton: "text-[#a78bfa]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-[#e4e7f0]",
    logoBox: "mb-1",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border-[#2a2340] bg-[#1e1b2e] hover:bg-[#252236] text-[#e4e7f0]",
    formButtonPrimary: "bg-[#7c5cfc] hover:bg-[#6b4ef0] text-white",
    formFieldInput: "bg-[#1e1b2e] border-[#2a2340] text-[#e4e7f0]",
    footerAction: "border-t border-[#2a2340]",
    dividerLine: "bg-[#2a2340]",
    alert: "bg-[#1e1b2e] border-[#2a2340]",
    otpCodeFieldInput: "bg-[#1e1b2e] border-[#2a2340] text-[#e4e7f0]",
    formFieldRow: "",
    main: "",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4" style={{ background: "#0d0e13" }}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4" style={{ background: "#0d0e13" }}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function AuthenticatedApp() {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem("kurspal_onboarded"));
  const { accepted: aiConsented, accept: acceptAi } = useAiConsent();

  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: "#0d0e13" }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#7c5cfc] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    const cleanPath = location.split("?")[0].replace(/\/$/, "") || "/";
    if (cleanPath === "" || cleanPath === "/") {
      return <LandingPage />;
    }
    // Guests can browse the app — sign-in is only prompted on upgrade/save
  }

  if (isSignedIn && !onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  return (
    <>
      <AiConsentModal open={!aiConsented} onAccept={acceptAi} />
      <Layout>
        <Switch>
          <Route path="/" component={CoursesPage} />
          <Route path="/courses" component={CoursesPage} />
          <Route path="/courses/:id" component={CourseDetailPage} />
          <Route path="/workspace" component={Workspace} />
          <Route path="/assignments" component={AssignmentsPage} />
          <Route path="/assignments/:id" component={AssignmentDetail} />
          <Route path="/tone-profile" component={ToneProfilePage} />
          <Route path="/checkout/success" component={CheckoutSuccess} />
          <Route path="/checkout/cancel" component={CheckoutCancel} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back to Kurspal", subtitle: "Sign in to continue studying" } },
        signUp: { start: { title: "Create your Kurspal account", subtitle: "Your AI study companion awaits" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route path="/terms" component={PrivacyPage} />
            <Route path="/support" component={SupportPage} />
            <Route path="/delete-account" component={DeleteAccountPage} />
            <Route component={AuthenticatedApp} />
          </Switch>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
