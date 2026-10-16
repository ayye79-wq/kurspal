import { Sparkles, Scissors, PenLine, Brain, GraduationCap, Clock, CheckCircle2 } from "lucide-react";

interface ExplainSection {
  header: string;
  body: string;
}

const SECTION_ORDER = [
  "What this means",
  "Key ideas",
  "Break it down",
  "Real example",
  "Say it like this",
  "If you remember ONE thing…",
];

const SECTION_ALIASES: Record<string, string> = {
  "Why this matters": "Break it down",
  "Check your understanding": "If you remember ONE thing…",
};

function readingSeconds(content: string): number {
  const words = content.trim().split(/\s+/).length;
  const secs = Math.round((words / 200) * 60);
  return Math.max(5, Math.min(secs, 30));
}

function parseExplainSections(content: string): ExplainSection[] {
  const parts = content.split(/^## /m).filter(Boolean);
  return parts.map((part) => {
    const newlineIdx = part.indexOf("\n");
    const rawHeader = newlineIdx === -1 ? part.trim() : part.slice(0, newlineIdx).trim();
    const header = SECTION_ALIASES[rawHeader] ?? rawHeader;
    const body = newlineIdx === -1 ? "" : part.slice(newlineIdx + 1).trim();
    return { header, body };
  });
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  );
}

function renderBody(body: string): React.ReactNode {
  const lines = body.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-2 my-1">
          {bulletBuffer.map((l, i) => (
            <li key={i} className="flex gap-2.5 leading-[1.6]">
              <span className="mt-[0.45em] w-1.5 h-1.5 rounded-full bg-current opacity-30 shrink-0" />
              <span>{renderInline(l.replace(/^[•\-\*]\s*/, ""))}</span>
            </li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flushBullets(); continue; }
    if (/^[•\-\*]\s/.test(trimmed)) {
      bulletBuffer.push(trimmed);
    } else {
      flushBullets();
      if (trimmed === "---") continue;
      elements.push(
        <p key={`p-${elements.length}`} className="leading-[1.6]">
          {renderInline(trimmed)}
        </p>
      );
    }
  }
  flushBullets();
  return elements;
}

const EXPLAIN_ACTIONS: { label: string; prompt: string; icon: React.ReactNode; isStudyGuide?: boolean }[] = [
  {
    label: "Study guide",
    prompt: "Turn this into a study guide with: key concepts and definitions, a bullet-point summary, and 3 likely exam questions with answers",
    icon: <GraduationCap className="w-3.5 h-3.5" />,
    isStudyGuide: true,
  },
  {
    label: "Simplify more",
    prompt: "Simplify this even further — use even simpler words and shorter sentences, like you're explaining to a complete beginner",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    label: "Make shorter",
    prompt: "Make this much shorter — just the essential ideas in 3–5 sentences total",
    icon: <Scissors className="w-3.5 h-3.5" />,
  },
  {
    label: "Turn into draft",
    prompt: "Now write me a 150–200 word discussion post on this topic in a natural student voice",
    icon: <PenLine className="w-3.5 h-3.5" />,
  },
];

interface ExplainOutputProps {
  content: string;
  onAction?: (prompt: string) => void;
  onStudyGuide?: () => void;
  onQuiz?: () => void;
  isActing?: boolean;
}

export function ExplainOutput({ content, onAction, onStudyGuide, onQuiz, isActing }: ExplainOutputProps) {
  const sections = parseExplainSections(content);

  const orderedSections = SECTION_ORDER
    .map((key) => sections.find((s) => s.header === key))
    .filter(Boolean) as ExplainSection[];

  const unknownSections = sections.filter(
    (s) => !SECTION_ORDER.includes(s.header)
  );

  const allSections = [...orderedSections, ...unknownSections];
  const secs = readingSeconds(content);

  const mainSection = allSections.find(s => s.header === "What this means");
  const oneThing = allSections.find(s => s.header === "If you remember ONE thing…");
  const sayItLike = allSections.find(s => s.header === "Say it like this");
  const middleSections = allSections.filter(
    s => s.header !== "What this means" && s.header !== "If you remember ONE thing…" && s.header !== "Say it like this"
  );

  if (allSections.length === 0) {
    return (
      <div className="bg-card border border-border/30 rounded-2xl px-7 py-7 shadow-sm space-y-4">
        <div className="text-base leading-[1.6] text-foreground/90 whitespace-pre-wrap">
          {content}
        </div>
        <p className="text-xs text-muted-foreground/50 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
          AI-generated · verify with your course materials
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/30 rounded-2xl shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-border/20">
        <p className="text-sm text-muted-foreground/70">Here's the simple version</p>
        <span className="flex items-center gap-1 text-xs font-medium text-primary shrink-0 ml-3">
          <Clock className="w-3 h-3" />
          ⚡ {secs}s
        </span>
      </div>

      <div className="px-7 pb-6">

        {/* ── Main explanation: What this means ── */}
        {mainSection && (
          <div className="py-6 border-b border-border/20 text-[20px] font-bold leading-[1.45] text-foreground">
            {renderBody(mainSection.body)}
          </div>
        )}

        {/* ── Middle sections ── */}
        {middleSections.map(section => (
          <div key={section.header} className="py-5 border-b border-border/20">
            <p className="text-[15px] font-semibold text-foreground mb-2.5">{section.header}</p>
            <div className="text-[15px] leading-[1.6] text-foreground/75">
              {renderBody(section.body)}
            </div>
          </div>
        ))}

        {/* ── Say it like this ── */}
        {sayItLike && (
          <div className="py-5 border-b border-border/20">
            <p className="text-[15px] font-semibold text-foreground mb-3">Say it like this</p>
            <div className="pl-4 border-l-2 border-primary/40">
              <div className="text-[15px] leading-[1.6] text-foreground/75 italic">
                {renderBody(sayItLike.body)}
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-primary mt-2.5">
                <CheckCircle2 className="w-3 h-3" />
                Ready to use in your answer
              </span>
            </div>
          </div>
        )}

        {/* ── Remember this ── */}
        {oneThing && (
          <div className="py-5 border-b border-border/20">
            <p className="text-[15px] font-semibold text-primary mb-1.5">Remember this</p>
            <div className="text-[15px] leading-[1.6] text-foreground/80 font-medium">
              {renderBody(oneThing.body)}
            </div>
          </div>
        )}

        {/* ── Disclaimer ── */}
        <p className="text-xs text-muted-foreground/40 flex items-center gap-1.5 pt-4">
          <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
          AI-generated · verify with your course materials
        </p>

      </div>

      {/* ── Action buttons ── */}
      <div className="px-7 pb-6 pt-1 border-t border-border/20 flex flex-wrap gap-2">
        {EXPLAIN_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => action.isStudyGuide ? onStudyGuide?.() : onAction?.(action.prompt)}
            disabled={isActing || (action.isStudyGuide ? !onStudyGuide : !onAction)}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-full border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 transition-all disabled:opacity-40"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        <button
          onClick={onQuiz}
          disabled={isActing || !onQuiz}
          className="flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40"
        >
          <Brain className="w-3.5 h-3.5" />
          Quiz me
        </button>
      </div>
    </div>
  );
}
