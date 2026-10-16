import { useState } from "react";
import { Sparkles, ArrowRight, Loader2, Lock, RotateCcw } from "lucide-react";
import { useSSE, DailyLimitError } from "../hooks/use-sse";

const DEMO_EXAMPLES = [
  { tag: "Explain a concept", color: "#7c5cfc", prompt: "Explain SQL injection to me like I'm a beginner." },
  { tag: "Write my post", color: "#4f8ef7", prompt: "Write a Week 6 discussion post on cybercrime for my Security 101 class." },
  { tag: "Start my assignment", color: "#2dd4bf", prompt: "Help me start my psychology assignment on cognitive dissonance." },
];

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2">
          {bullets.map((l, i) => (
            <li key={i} className="flex gap-2.5 leading-[1.6]">
              <span className="mt-[0.5em] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#7c5cfc" }} />
              <span>{renderInline(l.replace(/^[•\-*]\s*/, ""))}</span>
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    if (/^[•\-*]\s/.test(trimmed)) {
      bullets.push(trimmed);
    } else {
      flush();
      if (trimmed === "---") continue;
      elements.push(
        <p key={`p-${elements.length}`} className="leading-[1.6] my-1.5">
          {renderInline(trimmed)}
        </p>,
      );
    }
  }
  flush();
  return elements;
}

export function LiveDemo({ onSignUp }: { onSignUp: () => void }) {
  const { stream, isStreaming, content } = useSSE();
  const [prompt, setPrompt] = useState(DEMO_EXAMPLES[0].prompt);
  const [activeTag, setActiveTag] = useState<string | null>(DEMO_EXAMPLES[0].tag);
  const [hasRun, setHasRun] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState(false);

  const run = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming) return;
    setHasRun(true);
    setError(false);
    setLimitReached(false);
    try {
      await stream("/api/ai/demo", { prompt: trimmed });
    } catch (e) {
      if (e instanceof DailyLimitError) setLimitReached(true);
      else setError(true);
    }
  };

  const pickExample = (ex: (typeof DEMO_EXAMPLES)[number]) => {
    if (isStreaming) return;
    setPrompt(ex.prompt);
    setActiveTag(ex.tag);
  };

  const done = hasRun && !isStreaming && content.length > 0 && !limitReached && !error;

  return (
    <section className="py-10">
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
          style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.25)", color: "#a78bfa" }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Try it live — no sign up
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">See Kurspal think — right now</h2>
        <p className="text-sm mt-2" style={{ color: "hsl(220 10% 62%)" }}>
          Pick an example or type your own. Watch a real answer stream in live.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)" }}>
        {/* ── Input ── */}
        <div className="px-5 sm:px-6 py-5" style={{ borderBottom: content || hasRun ? "1px solid hsl(225 12% 16%)" : "none" }}>
          <div className="flex flex-wrap gap-2 mb-3">
            {DEMO_EXAMPLES.map((ex) => (
              <button
                key={ex.tag}
                onClick={() => pickExample(ex)}
                disabled={isStreaming}
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-all disabled:opacity-50"
                style={{
                  background: activeTag === ex.tag ? `${ex.color}22` : "hsl(225 14% 14%)",
                  color: activeTag === ex.tag ? ex.color : "hsl(220 10% 60%)",
                  border: `1px solid ${activeTag === ex.tag ? `${ex.color}45` : "hsl(225 12% 18%)"}`,
                }}
              >
                {ex.tag}
              </button>
            ))}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setActiveTag(null);
            }}
            disabled={isStreaming}
            rows={2}
            maxLength={2000}
            placeholder="Ask anything — a concept to explain, a post to write, an assignment to start…"
            className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white placeholder:text-[hsl(220_10%_42%)] outline-none transition-colors disabled:opacity-60"
            style={{ background: "hsl(225 18% 8%)", border: "1px solid hsl(225 12% 20%)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#7c5cfc")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(225 12% 20%)")}
          />

          <button
            onClick={run}
            disabled={isStreaming || !prompt.trim()}
            className="mt-3 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:translate-y-0"
            style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 20px hsl(256 90% 67% / 0.35)" }}
          >
            {isStreaming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Kurspal is thinking…
              </>
            ) : done ? (
              <>
                <RotateCcw className="w-4 h-4" /> Try another
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> See Kurspal answer
              </>
            )}
          </button>
        </div>

        {/* ── Output ── */}
        {(content || (isStreaming && hasRun)) && !limitReached && (
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg, #7c5cfc, #5037c8)" }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-2" style={{ color: "#9d80ff" }}>
                  Kurspal
                </p>
                <div className="text-sm" style={{ color: "hsl(220 10% 78%)" }}>
                  {renderMarkdown(content)}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "#9d80ff", borderRadius: 1 }} />
                  )}
                </div>
                {content && (
                  <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: "hsl(220 10% 42%)" }}>
                    <span className="inline-block w-1 h-1 rounded-full shrink-0" style={{ background: "hsl(220 10% 35%)" }} />
                    AI-generated · verify with your course materials
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="px-5 sm:px-6 py-5">
            <p className="text-sm" style={{ color: "hsl(0 70% 70%)" }}>
              Something went wrong reaching Kurspal. Please try again in a moment.
            </p>
          </div>
        )}

        {/* ── Limit reached ── */}
        {limitReached && (
          <div className="px-5 sm:px-6 py-6 text-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "hsl(256 90% 67% / 0.14)", border: "1px solid hsl(256 90% 67% / 0.28)" }}
            >
              <Lock className="w-5 h-5" style={{ color: "#9d80ff" }} />
            </div>
            <p className="text-base font-bold text-white mb-1.5">You've used up the free demo</p>
            <p className="text-sm mb-4 max-w-sm mx-auto" style={{ color: "hsl(220 10% 64%)" }}>
              Create a free account to keep going — 7 days of full access, no credit card.
            </p>
            <button
              onClick={onSignUp}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 20px hsl(256 90% 67% / 0.35)" }}
            >
              Create free account <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Post-answer CTA ── */}
        {done && (
          <div
            className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderTop: "1px solid hsl(225 12% 16%)", background: "linear-gradient(135deg, hsl(256 30% 12%) 0%, hsl(225 20% 10%) 100%)" }}
          >
            <p className="text-sm text-center sm:text-left" style={{ color: "hsl(220 10% 78%)" }}>
              <span className="font-bold text-white">Like that?</span> Sign up free to save it, add your courses, and get unlimited answers.
            </p>
            <button
              onClick={onSignUp}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 20px hsl(256 90% 67% / 0.35)" }}
            >
              Create free account <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
