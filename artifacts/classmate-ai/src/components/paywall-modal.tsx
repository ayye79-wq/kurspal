import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Brain, GraduationCap, Sparkles, ScanLine, Mic, Zap, Check, X, Loader2 } from "lucide-react";
import { useAuth, useClerk } from "@clerk/react";
import { useCheckout, PRICE_MONTHLY, PRICE_ANNUAL } from "@/hooks/use-checkout";

export type PaywallFeature = "upgrade" | "explain_limit" | "quiz" | "study-guide" | "multi-scan" | "tone";

const FEATURE_COPY: Record<PaywallFeature, { icon: React.ReactNode; headline: string; sub: string }> = {
  upgrade: {
    icon: <Sparkles className="w-6 h-6" />,
    headline: "Unlock Kurspal Premium",
    sub: "Unlimited AI help for every class, plus quizzes and study guides. Cancel anytime.",
  },
  explain_limit: {
    icon: <Sparkles className="w-6 h-6" />,
    headline: "You're using this a lot 👀",
    sub: "You've hit your free limit for today. Unlock unlimited access with Kurspal Premium.",
  },
  quiz: {
    icon: <Brain className="w-6 h-6" />,
    headline: "Quiz me is a Premium feature",
    sub: "Test yourself on anything you've studied. Instant feedback, real questions — unlock with Kurspal Premium.",
  },
  "study-guide": {
    icon: <GraduationCap className="w-6 h-6" />,
    headline: "Study guides are a Premium feature",
    sub: "Turn any explanation into a structured study guide with key concepts, definitions, and exam questions.",
  },
  "multi-scan": {
    icon: <ScanLine className="w-6 h-6" />,
    headline: "Multi-page scan is Premium",
    sub: "Scan entire chapters or handouts across multiple pages and combine them into one study session.",
  },
  tone: {
    icon: <Mic className="w-6 h-6" />,
    headline: "Tone controls are Premium",
    sub: "Make every draft sound exactly like you — casual, academic, confident, shorter. Your voice, your grades.",
  },
};

const PREMIUM_PERKS = [
  { icon: <Sparkles className="w-3.5 h-3.5 text-violet-500" />, text: "Unlimited explanations every day" },
  { icon: <Brain className="w-3.5 h-3.5 text-violet-500" />, text: "Quiz me — interactive tests from your notes" },
  { icon: <GraduationCap className="w-3.5 h-3.5 text-violet-500" />, text: "Study guide generator" },
  { icon: <ScanLine className="w-3.5 h-3.5 text-violet-500" />, text: "Multi-page scan — full chapters at once" },
  { icon: <Mic className="w-3.5 h-3.5 text-violet-500" />, text: "Advanced tone controls" },
  { icon: <Zap className="w-3.5 h-3.5 text-violet-500" />, text: "Cancel anytime from your account" },
];

interface PaywallModalProps {
  feature: PaywallFeature | null;
  onClose: () => void;
}

export function PaywallModal({ feature, onClose }: PaywallModalProps) {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const { startCheckout, loading, error } = useCheckout();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  // Signed-out visitors are new by definition; signed-in users ask the server.
  const [trialEligible, setTrialEligible] = useState(true);

  useEffect(() => {
    if (!feature || !isSignedIn) return;
    fetch("/api/me/usage", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (u) setTrialEligible(!!u.trialEligible); })
      .catch(() => {});
  }, [feature, isSignedIn]);

  if (!feature) return null;

  const copy = FEATURE_COPY[feature];
  const isAnnual = billing === "annual";

  const handleUnlock = async () => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    await startCheckout(isAnnual ? PRICE_ANNUAL : PRICE_MONTHLY);
  };

  return (
    <Dialog open={!!feature} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-600 to-violet-800 px-6 pt-8 pb-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4 text-white">
            {copy.icon}
          </div>
          <h2 className="text-lg font-bold leading-snug mb-1.5">{copy.headline}</h2>
          <p className="text-sm text-violet-200 leading-relaxed">{copy.sub}</p>
        </div>

        {/* Perks */}
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">What you get with Premium</p>
          {PREMIUM_PERKS.map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.25)" }}>
                {perk.icon}
              </div>
              <span className="text-sm text-foreground">{perk.text}</span>
            </div>
          ))}
        </div>

        {/* Billing toggle + CTA */}
        <div className="px-5 pb-5 space-y-3">
          {/* Plan toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setBilling("monthly")}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors"
              style={billing === "monthly" ? { background: "linear-gradient(135deg, #7c5cfc 0%, #5e3fde 100%)", color: "#fff" } : {}}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className="flex-1 py-2.5 text-sm font-semibold transition-colors relative"
              style={billing === "annual" ? { background: "linear-gradient(135deg, #7c5cfc 0%, #5e3fde 100%)", color: "#fff" } : {}}
            >
              Annual
              <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                SAVE 33%
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "hsl(256 90% 67% / 0.08)", border: "1px solid hsl(256 90% 67% / 0.2)" }}>
            <div>
              <p className="text-sm font-bold text-foreground">Kurspal Premium</p>
              <p className="text-[11px] text-muted-foreground">
                {trialEligible
                  ? `7 days free, then ${isAnnual ? "$39.99/year" : "$4.99/month"} · cancel anytime`
                  : isAnnual ? "$3.33/mo · billed as $39.99/year" : "Billed monthly · cancel anytime"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-primary">{isAnnual ? "$39.99" : "$4.99"}</p>
              <p className="text-[10px] text-muted-foreground">{isAnnual ? "/year" : "/month"}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Check className="w-3 h-3 text-emerald-400" />
            Cancel anytime · no commitment
          </div>

          {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
          {!isSignedIn && (
            <p className="text-[11px] text-muted-foreground text-center">
              You'll sign in first, then complete checkout.
            </p>
          )}

          <button
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5e3fde 100%)", boxShadow: "0 4px 20px rgba(124,92,252,0.35)" }}
            onClick={handleUnlock}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Taking you to checkout…</>
            ) : !isSignedIn ? (
              "Sign in to unlock Premium →"
            ) : trialEligible ? (
              "Start 7-day free trial →"
            ) : (
              `Get Premium · ${isAnnual ? "$39.99/yr" : "$4.99/mo"} →`
            )}
          </button>
          <button onClick={onClose} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors">
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
