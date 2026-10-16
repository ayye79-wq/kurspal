import { useState } from "react";
import { Link } from "wouter";
import { Sparkles, ArrowRight, Loader2, Lock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMO_EXAMPLES = [
  { tag: "Explain", prompt: "Explain SQL injection to me like I'm a beginner." },
  { tag: "Write a post", prompt: "Write a Week 6 discussion post on cybercrime for my Security 101 class." },
  { tag: "Assignment", prompt: "Help me start my psychology assignment on cognitive dissonance." },
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
            <li key={i} className="flex gap-2 leading-relaxed">
              <span className="mt-[0.5em] w-1.5 h-1.5 rounded-full bg-[#7c5cfc] shrink-0" />
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
        <p key={`p-${elements.length}`} className="leading-relaxed my-1.5">
          {renderInline(trimmed)}
        </p>,
      );
    }
  }
  flush();
  return elements;
}

export function LiveDemo() {
  const [prompt, setPrompt] = useState(DEMO_EXAMPLES[0].prompt);
  const [activeTag, setActiveTag] = useState<string | null>(DEMO_EXAMPLES[0].tag);
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState(false);

  const run = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming) return;
    setHasRun(true);
    setOutput("");
    setError(false);
    setLimitReached(false);
    setIsStreaming(true);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}../api/ai/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (res.status === 429) {
        setLimitReached(true);
        setIsStreaming(false);
        return;
      }
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.done) {
              setIsStreaming(false);
              return;
            }
            if (json.content) setOutput((prev) => prev + json.content);
          } catch {
            /* ignore parse errors on partial chunks */
          }
        }
      }
    } catch {
      setError(true);
    } finally {
      setIsStreaming(false);
    }
  };

  const pickExample = (ex: (typeof DEMO_EXAMPLES)[number]) => {
    if (isStreaming) return;
    setPrompt(ex.prompt);
    setActiveTag(ex.tag);
  };

  const done = hasRun && !isStreaming && output.length > 0 && !limitReached && !error;

  return (
    <div className="w-full bg-[#1a1728] border border-[#2a2340] rounded-2xl overflow-hidden text-left">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3 bg-[#7c5cfc]/12 border border-[#7c5cfc]/25">
          <Sparkles className="w-3 h-3 text-[#a78bfa]" />
          <span className="text-[11px] font-semibold text-[#a78bfa]">Try it live — no sign up</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {DEMO_EXAMPLES.map((ex) => (
            <button
              key={ex.tag}
              onClick={() => pickExample(ex)}
              disabled={isStreaming}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                activeTag === ex.tag
                  ? "bg-[#7c5cfc]/20 text-[#a78bfa] border-[#7c5cfc]/40"
                  : "bg-[#0d0e13] text-[#8585a8] border-[#2a2340]"
              }`}
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
          placeholder="Ask anything…"
          className="w-full resize-none rounded-xl bg-[#0d0e13] border border-[#2a2340] text-white text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[#7c5cfc] disabled:opacity-60"
        />

        <Button
          onClick={run}
          disabled={isStreaming || !prompt.trim()}
          className="w-full mt-3 bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl h-11 text-sm font-semibold"
        >
          {isStreaming ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kurspal is thinking…
            </>
          ) : done ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2" /> Try another
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> See Kurspal answer
            </>
          )}
        </Button>
      </div>

      {/* Output */}
      {(output || (isStreaming && hasRun)) && !limitReached && (
        <div className="px-4 py-4 border-t border-[#2a2340]">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#7c5cfc] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#a78bfa] mb-1.5">Kurspal</p>
              <div className="text-sm text-[#c4c7d4]">
                {renderMarkdown(output)}
                {isStreaming && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-[#a78bfa] animate-pulse rounded-[1px]" />}
              </div>
              {output && (
                <p className="text-[10px] text-[#56566e] mt-2.5">AI-generated · verify with your course materials</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-4 border-t border-[#2a2340]">
          <p className="text-sm text-red-300">Something went wrong reaching Kurspal. Please try again.</p>
        </div>
      )}

      {/* Limit reached */}
      {limitReached && (
        <div className="px-4 py-5 border-t border-[#2a2340] text-center">
          <div className="w-9 h-9 rounded-xl bg-[#7c5cfc]/14 border border-[#7c5cfc]/28 flex items-center justify-center mx-auto mb-2.5">
            <Lock className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <p className="text-sm font-bold text-white mb-1">You've used up the free demo</p>
          <p className="text-xs text-[#8585a8] mb-3.5">Create a free account to keep going — 7 days free, no card.</p>
          <Link href="/sign-up" className="block">
            <Button className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl h-11 text-sm font-semibold">
              Create free account <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Post-answer CTA */}
      {done && (
        <div className="px-4 py-4 border-t border-[#2a2340] bg-gradient-to-br from-[#231f3e] to-[#15131f]">
          <p className="text-sm text-[#c4c7d4] mb-3">
            <span className="font-bold text-white">Like that?</span> Sign up free to save it, add your courses, and get unlimited answers.
          </p>
          <Link href="/sign-up" className="block">
            <Button className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl h-11 text-sm font-semibold">
              Create free account <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
