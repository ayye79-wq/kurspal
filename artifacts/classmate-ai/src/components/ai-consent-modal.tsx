import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Brain, Shield, Server, AlertTriangle, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";

const CONSENT_KEY = "kurspal_ai_consent_v1";

export function useAiConsent() {
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem(CONSENT_KEY) === "true"; } catch { return false; }
  });

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, "true"); } catch {}
    setAccepted(true);
  };

  return { accepted, accept };
}

interface AiConsentModalProps {
  open: boolean;
  onAccept: () => void;
}

const DISCLOSURE_ITEMS = [
  {
    icon: Brain,
    iconColor: "#7c5cfc",
    title: "What the AI does",
    body: "Kurspal uses OpenAI's GPT models to explain your notes, generate quizzes, create study guides, and help draft text. It reads the content you paste or upload — nothing else.",
  },
  {
    icon: Server,
    iconColor: "#4f8ef7",
    title: "What data is sent",
    body: "Only the notes or text you explicitly submit are sent to OpenAI's API for processing. Your name, email, and account information are never shared with OpenAI.",
  },
  {
    icon: Shield,
    iconColor: "#2dd4bf",
    title: "Your privacy",
    body: "We do not sell your data. Your content is used only to generate your response and is not used to train AI models.",
  },
  {
    icon: AlertTriangle,
    iconColor: "#fb923c",
    title: "AI has limits",
    body: "AI-generated explanations may contain errors. Always verify important information with your course materials, textbooks, or instructor.",
  },
  {
    icon: GraduationCap,
    iconColor: "#34d399",
    title: "Use it responsibly",
    body: "Always follow your school's AI policy. Use Kurspal to learn and draft in your own voice — not to submit work that isn't yours.",
  },
];

export function AiConsentModal({ open, onAccept }: AiConsentModalProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden gap-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">AI Usage Disclosure</DialogTitle>
        <DialogDescription className="sr-only">How Kurspal uses AI and what data is sent to process your requests.</DialogDescription>

        {/* Header */}
        <div
          className="px-6 pt-7 pb-5 text-white"
          style={{ background: "linear-gradient(135deg, hsl(256 90% 25%) 0%, hsl(225 20% 14%) 100%)" }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "hsl(256 90% 67% / 0.15)", border: "1px solid hsl(256 90% 67% / 0.25)" }}
          >
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-base font-bold mb-1">Kurspal uses AI to help you study</h2>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(256 90% 90% / 0.7)" }}>
            Before you continue, here's exactly how it works and what that means for you.
          </p>
        </div>

        {/* Disclosures */}
        <div className="px-5 py-4 space-y-3">
          {DISCLOSURE_ITEMS.map(({ icon: Icon, iconColor, title, body }) => (
            <div key={title} className="flex gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}30` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{body}</p>
              </div>
            </div>
          ))}

          {/* Collapsible details */}
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
          >
            {detailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {detailsOpen ? "Show less" : "More details about data handling"}
          </button>

          {detailsOpen && (
            <div className="text-[11px] text-muted-foreground leading-relaxed bg-muted/40 rounded-lg p-3 space-y-1.5">
              <p>• Content you submit is processed by OpenAI's API under their <span className="underline">data usage policy</span>.</p>
              <p>• Kurspal stores your course names and uploaded materials on secure servers to provide the service.</p>
              <p>• You can delete your data at any time by contacting support.</p>
              <p>• This app is not affiliated with or endorsed by your educational institution.</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={onAccept}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:brightness-110 active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5e3fde 100%)", boxShadow: "0 4px 20px rgba(124,92,252,0.3)" }}
          >
            I understand — let's study
          </button>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2 leading-relaxed">
            By continuing you agree to Kurspal's Terms of Service and Privacy Policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
