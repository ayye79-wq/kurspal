import { useState, useEffect } from "react";
import { useCreateCourse } from "@workspace/api-client-react";
import { useSSE } from "@/hooks/use-sse";
import { ExplainOutput } from "@/components/explain-output";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface OnboardingProps {
  onComplete: () => void;
}

function ProgressDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`rounded-full transition-all duration-300 ${
            n === current
              ? "w-5 h-2 bg-primary"
              : n < current
              ? "w-2 h-2 bg-primary/40"
              : "w-2 h-2 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<1 | 2 | 3>(1);
  const [courseName, setCourseName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [semester, setSemester] = useState("");
  const [createdCourseId, setCreatedCourseId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [explainDone, setExplainDone] = useState(false);
  const [, setLocation] = useLocation();

  const createCourse = useCreateCourse();
  const { stream, isStreaming, content: explainContent } = useSSE();

  const LOADING_MSGS = [
    "Breaking this down…",
    "Simplifying concepts…",
    "Pulling out key ideas…",
    "Making it make sense…",
  ];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  useEffect(() => {
    if (!isStreaming) { setLoadingMsgIdx(0); return; }
    const id = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MSGS.length), 2200);
    return () => clearInterval(id);
  }, [isStreaming]);

  const COLORS = ["#7c5cfc", "#4f8ef7", "#2dd4bf", "#f472b6", "#fb923c"];

  const finish = (courseId?: number) => {
    localStorage.setItem("kurspal_onboarded", "1");
    onComplete();
    const id = courseId ?? createdCourseId;
    if (id) {
      setLocation(`/courses/${id}`);
    }
  };

  const handleContinue = () => {
    if (!courseName.trim()) {
      setScreen(3);
      return;
    }
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    createCourse.mutate(
      { data: { name: courseName.trim(), instructor: instructor.trim() || undefined, term: semester.trim() || undefined, color } },
      {
        onSuccess: (course) => {
          setCreatedCourseId(course.id);
          setScreen(3);
        },
        onError: () => setScreen(3),
      }
    );
  };

  const handleExplain = async () => {
    if (!notes.trim() || isStreaming) return;
    await stream("/api/ai/chat", {
      courseId: createdCourseId ?? undefined,
      mode: "explain",
      messages: [{ role: "user", content: notes }],
    });
    setExplainDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">

      {/* Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <img src="/kurspal-logo.png" alt="Kurspal" className="h-8 w-8 rounded-lg" />
        <span className="text-sm font-semibold tracking-tight">Kurspal</span>
      </div>

      <div className="w-full max-w-md">
        <ProgressDots current={screen} />

        {/* ── Screen 1: Promise ── */}
        {screen === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold leading-tight mb-3">
              From confused<br />→ clear in seconds.
            </h1>
            <p className="text-muted-foreground text-base mb-5 leading-relaxed">
              Break down your notes. Draft like you. No fluff.
            </p>
            <div className="flex flex-wrap gap-2 mb-7">
              {["Essays", "Discussion posts", "Study guides", "Exam prep"].map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "hsl(256 90% 67% / 0.1)", border: "1px solid hsl(256 90% 67% / 0.22)", color: "#9d80ff" }}>{tag}</span>
              ))}
            </div>
            <Button size="lg" className="w-full text-base h-12" onClick={() => setScreen(2)}>
              Get started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">Free to use · No account required · Takes ~30 seconds</p>
          </div>
        )}

        {/* ── Screen 2: Add a course ── */}
        {screen === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <h1 className="text-2xl font-bold mb-1">Add your course</h1>
            <p className="text-muted-foreground text-sm mb-6">Kurspal uses this to give you class-specific answers.</p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Course name</label>
                <Input
                  placeholder="e.g. Intro to Psychology"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleContinue()}
                  autoFocus
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Instructor <span className="font-normal">(optional)</span></label>
                  <Input placeholder="Dr. Smith" value={instructor} onChange={e => setInstructor(e.target.value)} className="h-10" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Semester <span className="font-normal">(optional)</span></label>
                  <Input placeholder="Fall 2026" value={semester} onChange={e => setSemester(e.target.value)} className="h-10" />
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-12 text-base mb-3"
              onClick={handleContinue}
              disabled={createCourse.isPending}
            >
              {createCourse.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
                : <>Continue <ChevronRight className="w-4 h-4 ml-1" /></>
              }
            </Button>
            <button
              onClick={() => setScreen(3)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Screen 3: Paste & Explain ── */}
        {screen === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            {!explainContent && !isStreaming && (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.2)" }}>
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-1">Drop your notes. I'll break it down.</h1>
                <p className="text-muted-foreground text-sm mb-5">Clear explanation. Key points. Ready-to-use answers.</p>
              </>
            )}

            {!explainContent && !isStreaming && (
              <>
                <Textarea
                  placeholder="Paste your notes here…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="min-h-[160px] resize-none text-sm mb-3"
                  autoFocus
                />
                {/* Preview teaser */}
                <div className="rounded-xl border px-4 py-3 mb-4" style={{ background: "hsl(256 90% 67% / 0.08)", borderColor: "hsl(256 90% 67% / 0.2)" }}>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">What you'll get</p>
                  <ul className="space-y-1">
                    {[
                      "Simple explanation — no jargon",
                      "Key points you can remember",
                      '"Say it like this" for discussions',
                      "Quick check questions",
                    ].map(item => (
                      <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-primary font-bold text-[10px]">✔</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={handleExplain}
                  disabled={!notes.trim() || isStreaming}
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Explain this
                </Button>
                <button
                  onClick={() => finish()}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
                >
                  Skip — go straight to Kurspal
                </button>
              </>
            )}

            {(isStreaming || explainContent) && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(256 90% 67% / 0.12)" }}>
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground transition-all duration-300">
                    {isStreaming ? LOADING_MSGS[loadingMsgIdx] : "Here's your breakdown"}
                  </span>
                  {isStreaming && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>

                {isStreaming ? (
                  <div className="bg-muted/40 border border-border/50 rounded-xl p-4 max-h-[300px] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 mb-5">
                    {explainContent}
                    <span className="animate-pulse ml-0.5">▋</span>
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto mb-5 space-y-2">
                    <ExplainOutput content={explainContent} />
                  </div>
                )}

                {explainDone && (
                  <Button
                    size="lg"
                    className="w-full h-12 text-base animate-in fade-in duration-500"
                    onClick={() => finish()}
                  >
                    Open Kurspal <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
