import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Sparkles } from "lucide-react";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setLocation("/courses"), 4000);
    return () => clearTimeout(t);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <CheckCircle className="w-8 h-8 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Premium!</h1>
      <p className="text-muted-foreground text-sm mb-1 max-w-xs">
        Your Kurspal Premium subscription is active. Unlimited explanations, quizzes, study guides — all unlocked.
      </p>
      <p className="text-xs text-muted-foreground/60 mt-2 max-w-xs">
        Manage or cancel your subscription anytime from your account settings.
      </p>
      <div className="flex items-center gap-1.5 text-violet-600 text-xs font-medium mt-5">
        <Sparkles className="w-3.5 h-3.5" />
        Redirecting you back in a moment…
      </div>
    </div>
  );
}
