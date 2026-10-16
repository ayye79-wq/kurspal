import { useState, useEffect } from "react";
import { useSSE } from "@/hooks/use-sse";
import { useGetToneProfile, useCreateAssignment, useSaveDraft, useGetCourse, getGetCourseQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Sparkles, Copy, Check, Save, RotateCcw, Mic } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useSearch, Link } from "wouter";

type Step = "input" | "analyzing" | "analyzed" | "drafting" | "drafted";

const STEPS = [
  { n: 1, label: "Paste prompt" },
  { n: 2, label: "Break it down" },
  { n: 3, label: "Write it" },
];

function getStepNumber(step: Step): number {
  if (step === "input") return 1;
  if (step === "analyzing" || step === "analyzed") return 2;
  return 3;
}

export default function Workspace() {
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const courseIdParam = searchParams.get("courseId");
  const courseId = courseIdParam ? parseInt(courseIdParam, 10) : null;

  const { data: course } = useGetCourse(courseId!, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId!) }
  });

  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState("");

  // Pre-fill prompt from sessionStorage (set by assignment detail page)
  useEffect(() => {
    const prefill = sessionStorage.getItem("classmate_prefill_prompt");
    if (prefill) {
      setPrompt(prefill);
      sessionStorage.removeItem("classmate_prefill_prompt");
    }
  }, []);

  const { data: toneProfile } = useGetToneProfile({ query: { retry: false, queryKey: ["tone-profile"] as const } });

  const { stream: analyzeStream, isStreaming: isAnalyzing, content: analyzeContent } = useSSE();
  const { stream: draftStream, isStreaming: isDrafting, content: draftContent } = useSSE();
  const { stream: refineStream, isStreaming: isRefining, content: refineContent } = useSSE();
  const { stream: replyStream, isStreaming: isReplying, content: replyContent } = useSSE();

  const [step, setStep] = useState<Step>("input");
  const [selectedDirection, setSelectedDirection] = useState("");
  const [currentDraft, setCurrentDraft] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [classmatePost, setClassmatePost] = useState("");

  const createAssignment = useCreateAssignment();
  const saveDraft = useSaveDraft();

  const handleReset = () => {
    setStep("input");
    setPrompt("");
    setSubject("");
    setSelectedDirection("");
    setCurrentDraft("");
    setCustomInstruction("");
    setClassmatePost("");
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setStep("analyzing");
    try {
      await analyzeStream("/api/ai/analyze", {
        prompt,
        subject: course ? course.name : (subject || undefined),
        courseId: course?.id || undefined
      });
      setStep("analyzed");
    } catch {
      toast({ title: "Analysis failed", variant: "destructive" });
      setStep("input");
    }
  };

  const handleGenerateDraft = async () => {
    setStep("drafting");
    try {
      const content = await draftStream("/api/ai/draft", {
        prompt,
        subject: course ? course.name : (subject || undefined),
        ideaDirection: selectedDirection || undefined,
        toneSummary: toneProfile?.toneSummary || undefined,
        courseId: course?.id || undefined
      });
      setCurrentDraft(content);
      setStep("drafted");
    } catch {
      toast({ title: "Drafting failed", variant: "destructive" });
      setStep("analyzed");
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!currentDraft) return;
    try {
      const content = await refineStream("/api/ai/refine", {
        currentDraft,
        instruction,
        prompt,
        toneSummary: toneProfile?.toneSummary || undefined,
        courseId: course?.id || undefined
      });
      setCurrentDraft(content);
    } catch {
      toast({ title: "Refinement failed", variant: "destructive" });
    }
  };

  const handleGenerateReply = async () => {
    if (!prompt || !classmatePost) return;
    try {
      await replyStream("/api/ai/classmate-replies", {
        originalPrompt: prompt,
        classmatePost,
        toneSummary: toneProfile?.toneSummary || undefined,
        courseId: course?.id || undefined
      });
    } catch {
      toast({ title: "Reply generation failed", variant: "destructive" });
    }
  };

  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedReply, setIsCopiedReply] = useState(false);

  const copyToClipboard = (text: string, which: "draft" | "reply" = "draft") => {
    navigator.clipboard.writeText(text);
    if (which === "reply") {
      setIsCopiedReply(true);
      setTimeout(() => setIsCopiedReply(false), 2000);
    } else {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    toast({ title: "Copied!" });
  };

  const [saveTitle, setSaveTitle] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleSaveToAssignment = () => {
    if (!saveTitle) return;
    createAssignment.mutate({
      data: {
        title: saveTitle,
        prompt,
        subject: course ? course.name : (subject || undefined),
        courseId: course?.id || undefined
      }
    }, {
      onSuccess: (assignment) => {
        saveDraft.mutate({ id: assignment.id, data: { content: currentDraft, draftType: "initial" } }, {
          onSuccess: () => {
            toast({ title: "Saved!", description: "Find it under All Discussions." });
            setSaveDialogOpen(false);
            setSaveTitle("");
          }
        });
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" })
    });
  };

  const currentStep = getStepNumber(step);
  const isInProgress = step !== "input";

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: "#7c5cfc" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#7c5cfc" }} />
            </span>
            <span className="text-xs font-semibold tracking-wide" style={{ color: "#9d80ff" }}>Your AI classmate is ready</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">What are you stuck on?</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(220 10% 70%)" }}>Drop your prompt, get unstuck in seconds — always in your own voice.</p>
          {course ? (
            <div className="flex items-center gap-2 mt-2.5 px-3 py-1.5 rounded-lg w-fit" style={{ background: `${course.color || "#7c5cfc"}15`, border: `1px solid ${course.color || "#7c5cfc"}30` }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: course.color || "#7c5cfc" }} />
              <span className="text-xs font-semibold" style={{ color: course.color || "#9d80ff" }}>
                {course.name}
              </span>
              <span className="text-xs" style={{ color: "hsl(220 10% 68%)" }}>— context loaded</span>
            </div>
          ) : (
            <p className="text-sm mt-2" style={{ color: "hsl(220 10% 68%)" }}>
              <Link href="/courses" className="font-semibold hover:underline" style={{ color: "#9d80ff" }}>Add a course</Link>{" "}
              so your classmate knows what class this is for.
            </p>
          )}
        </div>
        {isInProgress && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 mt-1"
            style={{ color: "hsl(220 10% 68%)", background: "hsl(225 14% 13%)", border: "1px solid hsl(225 12% 20%)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 85%)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 68%)"; }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start over
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done = currentStep > s.n;
          const active = currentStep === s.n;
          return (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300"
                  style={done
                    ? { background: "linear-gradient(135deg, #7c5cfc, #5037c8)", color: "white", boxShadow: "0 0 12px hsl(256 90% 67% / 0.4)" }
                    : active
                    ? { background: "hsl(256 90% 67% / 0.15)", color: "#9d80ff", border: "2px solid hsl(256 90% 67% / 0.6)" }
                    : { background: "hsl(225 14% 13%)", color: "hsl(220 10% 60%)", border: "1px solid hsl(225 12% 20%)" }
                  }
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : s.n}
                </div>
                <span className="text-xs hidden sm:block whitespace-nowrap font-medium" style={{ color: active ? "hsl(220 20% 85%)" : "hsl(220 10% 60%)" }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-3 transition-all duration-500" style={{ background: done ? "linear-gradient(90deg, #7c5cfc, hsl(225 12% 22%))" : "hsl(225 12% 18%)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Voice nudge — only when no profile set */}
      {!toneProfile?.toneSummary && step === "input" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border" style={{ background: "hsl(256 90% 67% / 0.08)", borderColor: "hsl(256 90% 67% / 0.25)", color: "hsl(256 90% 75%)" }}>
          <Mic className="w-4 h-4 shrink-0" />
          <p className="text-xs leading-relaxed">
            Your classmate doesn't know your writing voice yet.{" "}
            <Link href="/tone-profile" className="underline font-medium hover:opacity-80">Set it up in 2 minutes</Link>
            {" "}and drafts will sound like you, not AI.
          </p>
        </div>
      )}

      {/* Step 1 — Prompt input */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(225 14% 13%)", border: "1px solid hsl(225 12% 20%)" }}>
        <div className="p-5 space-y-4">
          {!course && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold" style={{ color: "hsl(220 10% 74%)" }}>Subject <span className="font-normal" style={{ color: "hsl(220 10% 62%)" }}>(optional)</span></Label>
              <Input
                placeholder="e.g. Cybersecurity 301"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={step !== "input"}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: "hsl(220 10% 74%)" }}>Discussion prompt</Label>
            <Textarea
              placeholder="Paste the prompt or question here… (Cmd+Enter to submit)"
              className="min-h-[140px] resize-none"
              style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={step !== "input"}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && step === "input" && prompt.trim()) {
                  e.preventDefault();
                  handleAnalyze();
                }
              }}
            />
          </div>
          {step === "input" && (
            <button
              onClick={handleAnalyze}
              disabled={!prompt.trim() || isAnalyzing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 20px hsl(256 90% 67% / 0.3)" }}
            >
              {isAnalyzing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Breaking it down…</>
                : <><Sparkles className="w-4 h-4" /> Break it down</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Step 2 — Analysis */}
      {(step === "analyzing" || step === "analyzed" || step === "drafting" || step === "drafted") && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(248 20% 13%)", border: "1px solid hsl(256 90% 67% / 0.2)", boxShadow: "0 0 0 1px hsl(256 90% 67% / 0.05) inset" }}>
          <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid hsl(256 90% 67% / 0.12)" }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(256 90% 67% / 0.15)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#9d80ff" }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "hsl(220 20% 82%)" }}>Here's what we're working with</span>
          </div>
          <div className="p-5 space-y-5">
            <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "hsl(220 10% 75%)" }}>
              {analyzeContent || (
                <div className="flex items-center gap-2" style={{ color: "hsl(220 10% 65%)" }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Reading the prompt…
                </div>
              )}
            </div>

            {step === "analyzed" && (
              <div className="space-y-3 pt-4" style={{ borderTop: "1px solid hsl(256 90% 67% / 0.12)" }}>
                <Label className="text-sm font-semibold" style={{ color: "hsl(220 10% 74%)" }}>
                  Which angle do we go with?{" "}
                  <span className="font-normal" style={{ color: "hsl(220 10% 62%)" }}>(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. Angle 2, or type your own direction…"
                  value={selectedDirection}
                  onChange={(e) => setSelectedDirection(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateDraft()}
                  style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }}
                />
                <button
                  onClick={handleGenerateDraft}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 20px hsl(256 90% 67% / 0.3)" }}
                >
                  Let's write it <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — Draft */}
      {(step === "drafting" || step === "drafted") && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(225 14% 13%)", border: "1px solid hsl(225 12% 20%)" }}>
          <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid hsl(225 12% 18%)" }}>
            <span className="text-sm font-semibold" style={{ color: "hsl(220 20% 82%)" }}>Here's your draft</span>
            {step === "drafted" && !isDrafting && !isRefining && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "hsl(142 70% 42% / 0.12)", color: "hsl(142 60% 55%)", border: "1px solid hsl(142 70% 42% / 0.2)" }}>
                <Check className="w-3 h-3" /> Ready
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-5 min-h-[180px] whitespace-pre-wrap text-sm leading-7 font-sans" style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)", color: "hsl(220 10% 82%)" }}>
              {isRefining ? refineContent : (isDrafting ? draftContent : currentDraft)}
              {(isDrafting || isRefining) && <span className="animate-pulse ml-0.5 text-primary">▋</span>}
            </div>

            {step === "drafted" && !isRefining && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => copyToClipboard(currentDraft)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "hsl(225 14% 17%)", border: "1px solid hsl(225 12% 22%)", color: "hsl(220 10% 60%)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 82%)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 60%)"; }}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? "Copied" : "Copy"}
                </button>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-px"
                      style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 14px hsl(256 90% 67% / 0.3)" }}
                    >
                      <Save className="w-3.5 h-3.5" /> Save draft
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save this discussion</DialogTitle>
                      <DialogDescription>Give it a name to find it later under All Discussions.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                      <Label>Title</Label>
                      <Input
                        placeholder="e.g. Week 3 Discussion"
                        value={saveTitle}
                        onChange={(e) => setSaveTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveTitle && handleSaveToAssignment()}
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveToAssignment} disabled={!saveTitle || createAssignment.isPending || saveDraft.isPending}>
                        {(createAssignment.isPending || saveDraft.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}


            {step === "drafted" && (
              <div className="pt-4 space-y-3" style={{ borderTop: "1px solid hsl(225 12% 18%)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(220 10% 65%)" }}>Refine the tone</p>
                <div className="flex flex-wrap gap-2">
                  {["Shorter", "More like me", "Add detail", "More direct", "Less formal", "More academic"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleRefine(opt)}
                      disabled={isRefining}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40"
                      style={{ background: "hsl(225 14% 17%)", border: "1px solid hsl(225 12% 22%)", color: "hsl(220 10% 74%)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(256 90% 67% / 0.35)"; (e.currentTarget as HTMLButtonElement).style.color = "#9d80ff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(225 12% 22%)"; (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 74%)"; }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tell me what to change…"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && customInstruction.trim() && handleRefine(customInstruction)}
                    disabled={isRefining}
                    className="text-sm"
                    style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }}
                  />
                  <button
                    onClick={() => handleRefine(customInstruction)}
                    disabled={!customInstruction.trim() || isRefining}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 hover:-translate-y-px"
                    style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)" }}
                  >
                    {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reply to classmate */}
      {step === "drafted" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(225 14% 13%)", border: "1px solid hsl(225 12% 20%)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid hsl(225 12% 18%)" }}>
            <p className="text-sm font-semibold" style={{ color: "hsl(220 20% 82%)" }}>Reply to a classmate</p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(220 10% 68%)" }}>Paste their post — get two reply options, one agreeable, one that pushes back.</p>
          </div>
          <div className="p-5 space-y-3">
            <Textarea
              placeholder="Paste their post here…"
              className="min-h-[90px] resize-none text-sm"
              style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }}
              value={classmatePost}
              onChange={(e) => setClassmatePost(e.target.value)}
            />
            <button
              onClick={handleGenerateReply}
              disabled={!classmatePost.trim() || isReplying}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 hover:-translate-y-px"
              style={{ background: "hsl(210 80% 58% / 0.12)", border: "1px solid hsl(210 80% 58% / 0.25)", color: "#7bb3f7" }}
            >
              {isReplying
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing options…</>
                : <><Mic className="w-4 h-4" /> Get reply options</>
              }
            </button>

            {(replyContent || isReplying) && (
              <div className="rounded-xl p-5 whitespace-pre-wrap text-sm font-sans leading-7" style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)", color: "hsl(220 10% 78%)" }}>
                {replyContent}
                {isReplying && <span className="animate-pulse ml-0.5 text-primary">▋</span>}
              </div>
            )}
            {replyContent && !isReplying && (
              <div className="flex justify-end">
                <button
                  onClick={() => copyToClipboard(replyContent, "reply")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: "hsl(220 10% 52%)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 75%)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 52%)"; }}
                >
                  {isCopiedReply ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy reply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
