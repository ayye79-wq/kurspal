import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { PhoneShell } from "@/components/phone-shell";
import { BottomNav } from "@/components/bottom-nav";

import LandingPage from "@/pages/landing";
import CoursesPage from "@/pages/courses";
import CourseDetailPage from "@/pages/course-detail";
import WorkspacePage from "@/pages/workspace";
import AssignmentsPage from "@/pages/assignments";
import AssignmentDetailPage from "@/pages/assignment-detail";
import ToneProfilePage from "@/pages/tone-profile";
import NotFound from "@/pages/not-found";

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
  variables: {
    colorPrimary: "#7c5cfc",
    colorBackground: "#1a1728",
    colorInputBackground: "#0d0e13",
    colorInputText: "#ffffff",
    fontFamily: "Inter, sans-serif",
    borderRadius: "16px",
  },
  elements: {
    cardBox: "shadow-none border border-[#2a2340] bg-[#1a1728] w-full max-w-full rounded-2xl",
    card: "bg-transparent shadow-none",
    headerTitle: "text-white",
    headerSubtitle: "text-[#8585a8]",
    formButtonPrimary: "bg-[#7c5cfc] hover:bg-[#a78bfa] text-white shadow-none",
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

function AuthRoute({ component: Component, path }: { component: any, path: string }) {
  return (
    <Route path={path}>
      <PhoneShell>
        <div className="flex-1 flex items-center justify-center p-4">
          <Component routing="path" path={`${basePath}${path}`} />
        </div>
      </PhoneShell>
    </Route>
  );
}

function AuthenticatedApp() {
  const { isLoaded, isSignedIn } = useAuth();
  const [location] = useLocation();

  if (!isLoaded) {
    return (
      <PhoneShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#7c5cfc] border-t-transparent animate-spin" />
        </div>
      </PhoneShell>
    );
  }

  if (!isSignedIn) {
    const cleanPath = location.split("?")[0].replace(/\/$/, "") || "/";
    if (cleanPath === "" || cleanPath === "/") {
      return (
        <PhoneShell>
          <LandingPage />
        </PhoneShell>
      );
    }
  }

  return (
    <PhoneShell>
      <Switch>
        <Route path="/" component={CoursesPage} />
        <Route path="/courses" component={CoursesPage} />
        <Route path="/courses/:id" component={CourseDetailPage} />
        <Route path="/workspace" component={WorkspacePage} />
        <Route path="/assignments" component={AssignmentsPage} />
        <Route path="/assignments/:id" component={AssignmentDetailPage} />
        <Route path="/tone-profile" component={ToneProfilePage} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </PhoneShell>
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
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Toaster />
          <Switch>
            <AuthRoute path="/sign-in" component={SignIn} />
            <AuthRoute path="/sign-up" component={SignUp} />
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
