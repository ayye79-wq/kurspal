import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetCourse,
  useAddCourseMaterial,
  useDeleteCourseMaterial,
  useCreateAssignment,
  getGetCourseQueryKey,
} from "@workspace/api-client-react";
import { useSSE, DailyLimitError } from "@/hooks/use-sse";
import { PaywallModal, type PaywallFeature } from "@/components/paywall-modal";
import { useProgress } from "@/hooks/use-progress";
import { ExplainOutput } from "@/components/explain-output";
import { QuizOutput, type QuizQuestion } from "@/components/quiz-output";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
  ArrowLeft, GraduationCap, Calendar, Plus, FileText,
  Loader2, Upload, Send, Sparkles, PenLine, ClipboardList,
  Clock, ChevronRight, RotateCcw, BookOpen, Check, Copy,
  Camera, X, ScanLine, ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Message = { role: "user" | "assistant"; content: string; mode?: string };
type Mode = "chat" | "explain" | "discussion" | "assignment";

const MODES: { id: Mode; label: string; icon: React.ReactNode; hint: string; accentColor: string; accentBg: string; accentText: string }[] = [
  { id: "explain",    label: "Explain",    icon: <Sparkles className="w-4 h-4"/>,       hint: "Instant clarity on any concept",   accentColor: "#7c5cfc", accentBg: "hsl(256 90% 67% / 0.12)", accentText: "#a78bfa" },
  { id: "discussion", label: "Discussion Post", icon: <PenLine className="w-4 h-4"/>,   hint: "Write posts in your own voice",    accentColor: "#4f8ef7", accentBg: "hsl(217 90% 60% / 0.12)", accentText: "#93c5fd" },
  { id: "assignment", label: "Assignment", icon: <ClipboardList className="w-4 h-4"/>,  hint: "Turn prompts into a clear plan",  accentColor: "#2dd4bf", accentBg: "hsl(172 66% 50% / 0.12)", accentText: "#5eead4" },
];

const MODE_ACTIVE: Record<Mode, { border: string; bg: string; text: string }> = {
  chat:       { border: "transparent", bg: "transparent", text: "" },
  explain:    { border: "#7c5cfc50", bg: "hsl(256 90% 67% / 0.12)", text: "#a78bfa" },
  discussion: { border: "#4f8ef750", bg: "hsl(217 90% 60% / 0.12)", text: "#93c5fd" },
  assignment: { border: "#2dd4bf50", bg: "hsl(172 66% 50% / 0.12)", text: "#5eead4" },
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const courseId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useGetCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) },
  });

  const addMaterial = useAddCourseMaterial();
  const deleteMaterial = useDeleteCourseMaterial();
  const createAssignment = useCreateAssignment();

  // ── Chat state ────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<Mode>("chat");
  const [suggestedMode, setSuggestedMode] = useState<Mode | null>(null);
  const { stream: chatStream, isStreaming, content: streamingContent } = useSSE();
  const [paywall, setPaywall] = useState<PaywallFeature | null>(null);
  const limitHit = (e: unknown) => {
    if (!(e instanceof DailyLimitError)) return false;
    setPaywall("explain_limit");
    return true;
  };
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // ── Smart highlight ───────────────────────────────────────────────
  const [highlight, setHighlight] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleMessagesMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 8) { setHighlight(null); return; }
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    if (!rect) return;
    setHighlight({ text, x: rect.left + rect.width / 2, y: rect.top });
  };

  useEffect(() => {
    if (!highlight) return;
    const dismiss = () => setHighlight(null);
    document.addEventListener("mousedown", dismiss, { capture: true });
    return () => document.removeEventListener("mousedown", dismiss, { capture: true });
  }, [highlight]);

  // ── Progress tracking ─────────────────────────────────────────────
  const { trackSession } = useProgress();


  // ── Quiz ──────────────────────────────────────────────────────────
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizContent, setQuizContent] = useState("");

  // ── Kurspal Scan ──────────────────────────────────────────────────
  const scanInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPages, setScanPages] = useState<{ preview: string; text: string }[]>([]);
  const [scanEditText, setScanEditText] = useState("");

  const closeScan = () => {
    setScanPages([]);
    setScanEditText("");
    if (scanInputRef.current) scanInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  const addScanPage = () => {
    uploadInputRef.current?.click();
  };

  const handleScanFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setIsScanning(true);
    if (scanInputRef.current) scanInputRef.current.value = "";

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const [header, imageBase64] = dataUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";

      try {
        const res = await fetch("/api/ai/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mimeType }),
        });
        if (res.status === 429) throw new DailyLimitError();
        if (!res.ok) throw new Error("scan failed");
        const { text } = await res.json();
        setScanPages(prev => {
          const updated = [...prev, { preview: dataUrl, text }];
          setScanEditText(
            updated.length === 1
              ? text
              : updated.map((p, i) => `--- Page ${i + 1} ---\n${p.text}`).join("\n\n")
          );
          return updated;
        });
      } catch (e) {
        if (limitHit(e)) { if (scanPages.length === 0) closeScan(); return; }
        toast({ title: "Couldn't read the image", description: "Try a clearer photo", variant: "destructive" });
        if (scanPages.length === 0) closeScan();
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Rotating loading messages ─────────────────────────────────────
  const LOADING_MSGS = ["Breaking this down…", "Simplifying concepts…", "Pulling out key ideas…", "Making it make sense…"];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  useEffect(() => {
    if (!isStreaming) { setLoadingMsgIdx(0); return; }
    const id = setInterval(() => setLoadingMsgIdx(i => (i + 1) % LOADING_MSGS.length), 2200);
    return () => clearInterval(id);
  }, [isStreaming]);

  // Pick up quick mode set by hero action buttons
  useEffect(() => {
    const quickMode = sessionStorage.getItem("classmate_quick_mode") as Mode | null;
    if (quickMode && ["explain", "discussion", "assignment"].includes(quickMode)) {
      sessionStorage.removeItem("classmate_quick_mode");
      setActiveMode(quickMode);
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async (mode: Mode = activeMode) => {
    const content = input.trim();
    if (!content || isStreaming) return;

  
    const newMessages: Message[] = [...messages, { role: "user", content, mode }];
    setMessages(newMessages);
    setInput("");
    setActiveMode("chat");

    try {
      const reply = await chatStream("/api/ai/chat", {
        courseId,
        mode: mode !== "chat" ? mode : undefined,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      trackSession();
    } catch (e: any) {
      if (e?.name !== "AbortError" && !limitHit(e)) {
        toast({ title: "Something went wrong", variant: "destructive" });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Mobile keyboard: scroll input into view after keyboard opens
  const handleTextareaFocus = () => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 350);
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // ── Quick follow-up actions ───────────────────────────────────────
  const sendQuickFollowUp = async (text: string) => {
    if (isStreaming) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    try {
      const reply = await chatStream("/api/ai/chat", {
        courseId,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      trackSession();
    } catch (e) {
      if (!limitHit(e)) toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const sendStudyGuide = (content: string) => {
    sendQuickFollowUp(
      "Turn this into a study guide with: key concepts and definitions, a bullet-point summary, and 3 likely exam questions with answers"
    );
  };

  const launchQuiz = async (content: string) => {
    if (quizLoading) return;
    setQuizContent(content);
    setQuizData(null);
    setQuizLoading(true);
    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, courseId }),
      });
      if (res.status === 429) throw new DailyLimitError();
      if (!res.ok) throw new Error("quiz failed");
      const data = await res.json();
      setQuizData(data.questions ?? []);
    } catch (e) {
      if (limitHit(e)) return;
      toast({ title: "Couldn't generate quiz", description: "Try again in a moment", variant: "destructive" });
    } finally {
      setQuizLoading(false);
    }
  };

  const sendWithText = async (text: string, mode: Mode) => {
    const content = text.trim();
    if (!content || isStreaming) return;
    closeScan();
    const newMessages: Message[] = [...messages, { role: "user", content, mode }];
    setMessages(newMessages);
    setActiveMode("chat");
    try {
      const reply = await chatStream("/api/ai/chat", {
        courseId,
        mode: mode !== "chat" ? mode : undefined,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      if (!limitHit(e)) toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  const tryAgain = async () => {
    if (isStreaming || messages.length < 2) return;
    const lastUser = messages[messages.length - 2];
    if (lastUser?.role !== "user") return;
    const prevMessages = messages.slice(0, -2);
    const newMessages: Message[] = [...prevMessages, { role: "user", content: lastUser.content, mode: lastUser.mode }];
    setMessages(newMessages);
    try {
      const reply = await chatStream("/api/ai/chat", {
        courseId,
        mode: lastUser.mode && lastUser.mode !== "chat" ? lastUser.mode : undefined,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      if (!limitHit(e)) toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  // ── Save discussion ───────────────────────────────────────────────
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [draftToSave, setDraftToSave] = useState("");

  const openSave = (content: string) => {
    setDraftToSave(content);
    setSaveOpen(true);
  };

  const handleSave = () => {
    if (!saveTitle) return;
    createAssignment.mutate(
      { data: { title: saveTitle, prompt: input || draftToSave.slice(0, 200), courseId, subject: course?.name } },
      {
        onSuccess: () => {
          toast({ title: "Saved to My Work" });
          setSaveOpen(false); setSaveTitle(""); setDraftToSave("");
          queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  // ── Materials ─────────────────────────────────────────────────────
  const [matOpen, setMatOpen] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matType, setMatType] = useState("syllabus");
  const [matContent, setMatContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetMat = () => { setMatTitle(""); setMatType("syllabus"); setMatContent(""); setUploadFile(null); };

  const hasSyllabus = (course?.materials ?? []).some(m => m.materialType === "syllabus");

  const handleAddText = () => {
    if (!matTitle || !matContent) return;
    addMaterial.mutate({ id: courseId, data: { title: matTitle, materialType: matType, content: matContent } }, {
      onSuccess: () => {
        toast({ title: "Added — your classmate has read it" });
        setMatOpen(false); resetMat();
        queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      },
      onError: () => toast({ title: "Failed to add", variant: "destructive" }),
    });
  };

  const handleUpload = async () => {
    if (!matTitle || !uploadFile) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", matTitle); fd.append("materialType", matType); fd.append("file", uploadFile);
      const res = await fetch(`/api/courses/${courseId}/materials/upload`, { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      toast({ title: "Uploaded" });
      setMatOpen(false); resetMat();
      queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally { setIsUploading(false); }
  };

  const handleDeleteMaterial = (materialId: number) => {
    deleteMaterial.mutate({ courseId, materialId }, {
      onSuccess: () => {
        toast({ title: "Removed" });
        queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
      },
    });
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4 animate-in fade-in">
        <Skeleton className="h-4 w-24"/>
        <Skeleton className="h-20 w-full rounded-2xl"/>
        <Skeleton className="h-12 w-full rounded-xl"/>
        <Skeleton className="h-[400px] w-full rounded-xl"/>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Course not found</h2>
        <Link href="/courses"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2"/>Back</Button></Link>
      </div>
    );
  }

  const accent = course.color || "#6B8F71";
  const recentWork = (course.assignments ?? []).slice(-3).reverse();

  return (
    <div className="max-w-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <PaywallModal feature={paywall} onClose={() => setPaywall(null)} />

      {/* Back */}
      <Link href="/courses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5"/> All Courses
      </Link>

      {/* ── Course header ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(225 20% 10%) 0%, hsl(240 18% 12%) 100%)`,
          borderLeft: `3px solid ${course.color || "#7c5cfc"}`,
          border: `1px solid hsl(225 12% 18%)`,
        }}
      >
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: course.color || "#7c5cfc" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: course.color || "#7c5cfc" }} />
            </span>
            <span className="text-xs font-semibold tracking-wide" style={{ color: course.color || "#7c5cfc" }}>Your AI classmate for this course</span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight">{course.name}</h1>
          {(course.instructor || course.term) && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-sm text-muted-foreground">
              {course.instructor && <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5"/>{course.instructor}</span>}
              {course.term && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>{course.term}</span>}
            </div>
          )}
        </div>
        <div className="px-6 pb-4 pt-0 flex items-center gap-3" style={{ borderTop: "1px solid hsl(225 12% 16%)" }}>
          <span className="text-xs text-muted-foreground">
            {(course.materials ?? []).length > 0
              ? `${(course.materials ?? []).length} material${(course.materials ?? []).length === 1 ? "" : "s"} loaded`
              : "Upload your syllabus so answers match your professor and assignments"}
          </span>
          <button
            onClick={() => setMatOpen(true)}
            className="ml-auto text-xs font-semibold px-3 py-1 rounded-full transition-all hover:brightness-110"
            style={{ background: `${course.color || "#7c5cfc"}20`, color: course.color || "#7c5cfc", border: `1px solid ${course.color || "#7c5cfc"}35` }}
          >
            + Add material
          </button>
        </div>
      </div>

      {/* ── 3 Action cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {MODES.map(m => {
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setActiveMode(activeMode === m.id ? "chat" : m.id);
                textareaRef.current?.focus();
              }}
              className={`flex flex-col items-start gap-2.5 px-4 py-4 rounded-xl border-2 transition-all text-left ${
                isActive ? "shadow-md" : "border-border/40 bg-card hover:shadow-sm"
              }`}
              style={isActive
                ? { backgroundColor: m.accentBg, borderColor: m.accentColor + "50" }
                : { backgroundColor: "var(--card)" }
              }
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                style={{ backgroundColor: isActive ? m.accentColor : m.accentColor + "20" }}
              >
                <span style={{ color: isActive ? "#fff" : m.accentColor }}>{m.icon}</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{m.label}</p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "hsl(220 10% 68%)" }}>{m.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active mode banner */}
      {activeMode !== "chat" && (() => {
        const m = MODES.find(x => x.id === activeMode)!;
        return (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: m.accentBg, color: m.accentText }}>
            <span>
              {activeMode === "explain" && "Paste your lecture notes or a concept — I'll break it down simply."}
              {activeMode === "discussion" && "Paste the discussion prompt — I'll write a natural, human-sounding post."}
              {activeMode === "assignment" && "Paste the assignment instructions — I'll give you an outline and next steps."}
            </span>
            <button onClick={() => setActiveMode("chat")} className="opacity-60 hover:opacity-100 ml-3 shrink-0">✕</button>
          </div>
        );
      })()}

      {/* ── Chat ── */}
      <Card className="border-border/60 shadow-md overflow-hidden" style={{ borderTop: `2.5px solid ${accent}` }}>
        {/* Messages */}
        <CardContent className="p-0">
          {messages.length > 0 && (
            <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto border-b border-border/40" onMouseUp={handleMessagesMouseUp}>
              {messages.map((msg, i) => {
                const prevUser = messages[i - 1];
                const isExplain = msg.role === "assistant" && prevUser?.mode === "explain";
                const isDiscussion = msg.role === "assistant" && prevUser?.mode === "discussion";
                const isAssignment = msg.role === "assistant" && prevUser?.mode === "assignment";
                const wordCount = msg.content.trim().split(/\s+/).length;
                const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;

                // ── Explain mode: full-width structured output ──
                if (isExplain) {
                  return (
                    <div key={i} className="group space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}80` }}>
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-foreground">Kurspal</span>
                        <span className="text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.25)" }}>Explain</span>
                      </div>
                      <ExplainOutput
                        content={msg.content}
                        onAction={isLastAssistant && !isStreaming ? sendQuickFollowUp : undefined}
                        onStudyGuide={isLastAssistant && !isStreaming ? () => sendStudyGuide(msg.content) : undefined}
                        onQuiz={isLastAssistant && !isStreaming && !quizLoading ? () => launchQuiz(msg.content) : undefined}
                        isActing={isStreaming || quizLoading}
                      />
                      <div className="flex items-center gap-1 pt-0.5">
                        <button onClick={() => copyMessage(msg.content, i)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-all">
                          {copiedIdx === i ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                          {copiedIdx === i ? "Copied" : "Copy all"}
                        </button>
                      </div>
                    </div>
                  );
                }

                // ── Regular message bubble ──
                return (
                  <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}80` }}>
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="group relative max-w-[85%]">
                      {msg.role === "user" && msg.mode && msg.mode !== "chat" && (
                        <div className={`text-[10px] font-medium mb-1 text-right capitalize ${
                          msg.mode === "explain" ? "text-violet-500" :
                          msg.mode === "discussion" ? "text-emerald-500" : "text-orange-500"
                        }`}>{msg.mode} →</div>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted/40 text-foreground rounded-tl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      {msg.role === "assistant" && (
                        <div className="mt-1.5 space-y-1.5">
                          {isDiscussion && (
                            <div className="flex items-center gap-2 pl-0.5">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: "#4f8ef7", background: "hsl(217 90% 60% / 0.12)", border: "1px solid hsl(217 90% 60% / 0.25)" }}>
                                ~{wordCount} words · ready to post
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <button onClick={() => copyMessage(msg.content, i)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-all">
                              {copiedIdx === i ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                              {copiedIdx === i ? "Copied" : "Copy"}
                            </button>
                            <button onClick={() => openSave(msg.content)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/60 transition-all">
                              <BookOpen className="w-3 h-3"/> Save
                            </button>
                          </div>
                          {isLastAssistant && !isStreaming && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {isDiscussion ? (
                                <>
                                  <button onClick={() => sendQuickFollowUp("Rewrite this in a more casual, conversational tone — like texting a classmate")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">More casual</button>
                                  <button onClick={() => sendQuickFollowUp("Rewrite this in a more academic, formal tone suitable for a graded discussion board")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">More academic</button>
                                  <button onClick={() => sendQuickFollowUp("Make this shorter — cut to 100 words or less, keep the main point")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Shorter</button>
                                  <button onClick={() => sendQuickFollowUp("Rewrite this with a stronger, more confident and assertive voice — make a clear, bold claim")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">More confident</button>
                                  <button onClick={tryAgain} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5"/>Try again</button>
                                </>
                              ) : isAssignment ? (
                                <>
                                  <button onClick={() => sendQuickFollowUp("Simplify this even further — explain it like I'm a complete beginner")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Simplify more</button>
                                  <button onClick={() => sendQuickFollowUp("Make this shorter — give me just the essentials")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Make shorter</button>
                                  <button onClick={() => sendQuickFollowUp("Now turn this outline into a full first draft I can submit")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Turn into draft</button>
                                  <button onClick={() => !quizLoading && launchQuiz(msg.content)} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/8 transition-all">Quiz me</button>
                                  <button onClick={tryAgain} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5"/>Try again</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => sendQuickFollowUp("Simplify this even further — explain it like I'm a complete beginner")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Simplify more</button>
                                  <button onClick={() => sendQuickFollowUp("Make this shorter, keep only the key ideas")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Make shorter</button>
                                  <button onClick={() => sendQuickFollowUp("Make this more formal and academic in tone")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">More formal</button>
                                  <button onClick={() => sendQuickFollowUp("Now turn this into a full discussion post draft I can submit")} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">Turn into draft</button>
                                  <button onClick={() => !quizLoading && launchQuiz(msg.content)} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/8 transition-all">Quiz me</button>
                                  <button onClick={tryAgain} className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5"/>Try again</button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming response */}
              {isStreaming && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}80` }}>
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed bg-muted/40 text-foreground whitespace-pre-wrap">
                    {streamingContent
                      ? <>{streamingContent}<span className="animate-pulse ml-0.5">▋</span></>
                      : <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin"/>{LOADING_MSGS[loadingMsgIdx]}</span>
                    }
                  </div>
                </div>
              )}
              {/* Quiz loading indicator */}
              {quizLoading && (
                <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl animate-in fade-in duration-200" style={{ background: "hsl(256 90% 67% / 0.08)", border: "1px solid hsl(256 90% 67% / 0.25)" }}>
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  <p className="text-sm text-primary font-medium">Building your quiz…</p>
                </div>
              )}

              {/* Quiz panel */}
              {quizData && quizData.length > 0 && (
                <QuizOutput
                  questions={quizData}
                  onClose={() => setQuizData(null)}
                  onRetry={() => launchQuiz(quizContent)}
                />
              )}

              <div ref={chatBottomRef}/>
            </div>
          )}

          {/* Empty state — mode-aware sample output preview */}
          {messages.length === 0 && (
            <div className="px-4 py-6 space-y-3 animate-in fade-in duration-300">
              <p className="text-xs font-semibold text-muted-foreground/60 px-1 uppercase tracking-widest">Preview</p>

              {/* ── Explain preview ── */}
              {(activeMode === "explain" || activeMode === "chat") && (
                <div className="bg-card border border-border/30 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/20">
                    <p className="text-sm text-muted-foreground/70">Here's the simple version</p>
                    <span className="text-xs font-medium text-primary">⚡ ~8s</span>
                  </div>
                  <div className="px-6 pb-5">
                    <div className="py-5 border-b border-border/20">
                      <p className="text-[19px] font-bold leading-[1.45] text-foreground">
                        Understanding {course?.name ?? "this course"} means seeing how the big ideas connect — not just memorising facts.
                      </p>
                    </div>
                    <div className="py-4 border-b border-border/20">
                      <p className="text-[15px] font-semibold text-foreground mb-2">Key ideas</p>
                      <ul className="space-y-2">
                        {["Every concept builds on the one before it", "Context matters as much as content", "The goal is to be able to explain it simply"].map(item => (
                          <li key={item} className="flex gap-2.5 text-[15px] leading-[1.6] text-foreground/75">
                            <span className="mt-[0.45em] w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="py-4 border-b border-border/20">
                      <p className="text-[15px] font-semibold text-foreground mb-1.5">Say it like this</p>
                      <div className="pl-4 border-l-2 border-primary/40">
                        <p className="text-[15px] leading-[1.6] text-foreground/75 italic">"The core idea here is that everything connects — once you see the pattern, {course?.name ?? "the subject"} starts making sense."</p>
                      </div>
                    </div>
                    <div className="pt-4">
                      <p className="text-[15px] font-semibold text-primary mb-1.5">Remember this</p>
                      <p className="text-[15px] leading-[1.6] text-foreground/80 font-medium">If you can explain it in one sentence, you understand it.</p>
                    </div>
                  </div>
                  <div className="px-6 pb-5 pt-1 border-t border-border/20 flex flex-wrap gap-2">
                    {["Simplify more", "Make shorter", "Turn into draft", "Quiz me"].map(label => (
                      <span key={label} className="text-[13px] font-medium px-3.5 py-1.5 rounded-full border border-border/60 bg-background text-muted-foreground">{label}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Draft preview ── */}
              {activeMode === "discussion" && (
                <div className="bg-card border border-border/30 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-border/20">
                    <p className="text-sm text-muted-foreground/70">Your discussion post — sounds like you</p>
                  </div>
                  <div className="px-6 py-5 border-b border-border/20">
                    <p className="text-[15px] leading-[1.6] text-foreground/80 italic">
                      "What struck me most about this topic is how it challenges the way we usually think about it. In {course?.name ?? "this course"}, it's easy to focus on the details, but stepping back reveals something more interesting…"
                    </p>
                  </div>
                  <div className="px-6 py-4 border-b border-border/20">
                    <p className="text-[13px] font-semibold text-foreground/60 mb-2.5">✍️ Make it sound like you</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {["Casual", "Academic", "Shorter", "More confident"].map(t => (
                        <span key={t} className="text-[13px] font-medium px-3 py-1 rounded-full border border-border/60 bg-background text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="px-6 py-3">
                    <p className="text-xs text-muted-foreground/50">Sounds natural. Not AI-written.</p>
                  </div>
                </div>
              )}

              {/* ── Assignment preview ── */}
              {activeMode === "assignment" && (
                <div className="bg-card border border-border/30 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 pt-5 pb-4 border-b border-border/20 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground/70">Your game plan</p>
                    <span className="text-xs font-semibold text-primary">⚡ ~20 min to finish</span>
                  </div>
                  <div className="px-6 py-5 border-b border-border/20">
                    <p className="text-[15px] font-semibold text-foreground mb-3">Step-by-step plan</p>
                    <ol className="space-y-2.5">
                      {["Understand exactly what's being asked", "Identify the key concepts from your notes", "Build your argument around those concepts"].map((s, i) => (
                        <li key={s} className="flex gap-3 text-[15px] leading-[1.6] text-foreground/80 items-start">
                          <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="px-6 py-5 border-b border-border/20">
                    <p className="text-[15px] font-semibold text-foreground mb-2.5">Outline</p>
                    <ul className="space-y-2">
                      {["Introduction — state your position", "Body — support with evidence", "Conclusion — tie it back to the question"].map(s => (
                        <li key={s} className="flex gap-2 text-[15px] leading-[1.6] text-foreground/80">
                          <span className="text-primary/60 font-medium shrink-0">—</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-[13px] font-semibold text-primary mb-1">👉 Do this first</p>
                    <p className="text-[15px] leading-[1.6] text-foreground/75">Start by writing one sentence that defines the core concept — this anchors your whole response.</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground/40 text-center pt-1">Paste your content below to get your real output →</p>
            </div>
          )}

          {/* Input */}
          <div className="p-3 flex flex-col gap-2">
            {/* Hidden inputs — camera scan + file upload */}
            <input
              ref={scanInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleScanFile(f); }}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleScanFile(f); }}
            />

            {/* Quick-pick chips — only when input is empty and chat hasn't started */}
            {!isScanning && scanPages.length === 0 && !input.trim() && messages.length === 0 && !isStreaming && (
              <div className="flex flex-wrap gap-1.5 pb-0.5">
                {([
                  { label: "📄 Lecture notes", mode: "explain" as Mode },
                  { label: "💬 Discussion prompt", mode: "discussion" as Mode },
                  { label: "📘 Textbook page", mode: "explain" as Mode },
                  { label: "📋 Assignment brief", mode: "assignment" as Mode },
                ] as { label: string; mode: Mode }[]).map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => { setActiveMode(chip.mode); setTimeout(() => textareaRef.current?.focus(), 50); }}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-border/60 bg-muted/30 text-muted-foreground hover:bg-background hover:text-foreground hover:border-border transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Scan Panel (replaces textarea while active) ── */}
            {(isScanning || scanPages.length > 0) ? (
              <div
                className="rounded-xl overflow-hidden animate-in fade-in duration-200"
                style={{ background: "hsl(256 90% 67% / 0.06)", border: "1px solid hsl(256 90% 67% / 0.25)" }}
              >
                {/* Panel header */}
                <div
                  className="flex items-center gap-2.5 px-3 py-2.5"
                  style={{ borderBottom: "1px solid hsl(256 90% 67% / 0.15)", background: "hsl(256 90% 67% / 0.06)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-primary">
                        {isScanning && scanPages.length === 0
                          ? "Reading your image…"
                          : isScanning
                          ? `Adding page ${scanPages.length + 1}…`
                          : scanPages.length === 1
                          ? "From your scan"
                          : `From your scan · ${scanPages.length} pages`}
                      </p>
                      {course && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ color: "hsl(256 90% 75%)", background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.25)" }}
                        >
                          {course.name}
                        </span>
                      )}
                    </div>
                    {!isScanning && (
                      <p className="text-[11px] text-primary/60 mt-0.5">Edit the text below if needed, then choose an action</p>
                    )}
                  </div>
                  {!isScanning && (
                    <button onClick={closeScan} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Page thumbnails strip */}
                {(scanPages.length > 0) && (
                  <div className="flex items-center gap-2 px-3 pt-2.5 pb-0 overflow-x-auto">
                    {scanPages.map((page, i) => (
                      <div key={i} className="relative shrink-0 group">
                        <img
                          src={page.preview}
                          alt={`Page ${i + 1}`}
                          className="w-12 h-12 rounded-lg object-cover"
                          style={{ border: "2px solid hsl(256 90% 67% / 0.4)" }}
                        />
                        <span className="absolute -bottom-1 -right-1 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#7c5cfc" }}>
                          {i + 1}
                        </span>
                      </div>
                    ))}
                    {isScanning && (
                      <div className="relative shrink-0 w-12 h-12 rounded-lg flex items-center justify-center" style={{ border: "2px dashed hsl(256 90% 67% / 0.4)", background: "hsl(256 90% 67% / 0.06)" }}>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                    {!isScanning && (
                      <button
                        onClick={addScanPage}
                        className="shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors hover:brightness-110"
                        style={{ border: "2px dashed hsl(256 90% 67% / 0.35)", background: "hsl(256 90% 67% / 0.06)" }}
                        title="Scan another page"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[9px] text-primary/60 font-medium leading-none">page</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Editable extracted text / loading state */}
                {isScanning && scanPages.length === 0 ? (
                  <div className="px-3 py-4 flex items-center justify-center gap-2 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting text from image…
                  </div>
                ) : (
                  <div className="p-3 space-y-3">
                    {scanPages.length > 1 && (
                      <p className="text-[10px] text-primary/60 font-medium">
                        Text from all {scanPages.length} pages combined — edit freely
                      </p>
                    )}
                    <textarea
                      value={scanEditText}
                      onChange={e => setScanEditText(e.target.value)}
                      className="w-full text-sm leading-relaxed rounded-lg px-3 py-2.5 resize-none min-h-[100px] max-h-[200px] focus:outline-none text-foreground overflow-y-auto bg-muted/40"
                      style={{ border: "1px solid hsl(256 90% 67% / 0.2)" }}
                      rows={4}
                    />

                    {/* Quick action buttons */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider">
                        {scanPages.length > 1 ? "What do you want to do with these pages?" : "What do you want to do with this?"}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => sendWithText(scanEditText, "explain")}
                          disabled={!scanEditText.trim() || isStreaming}
                          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5e3fde 100%)" }}
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          Make this make sense
                        </button>
                        <button
                          onClick={() => sendWithText(scanEditText, "discussion")}
                          disabled={!scanEditText.trim() || isStreaming}
                          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg, #4f8ef7 0%, #2563eb 100%)" }}
                        >
                          <PenLine className="w-3.5 h-3.5 shrink-0" />
                          Write discussion
                        </button>
                        <button
                          onClick={() => sendWithText(`Turn these into clean, organized study notes with key points and definitions:\n\n${scanEditText}`, "chat")}
                          disabled={!scanEditText.trim() || isStreaming}
                          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)" }}
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          Turn into notes
                        </button>
                      </div>
                      <button
                        onClick={() => { setInput(scanEditText); closeScan(); setTimeout(() => textareaRef.current?.focus(), 50); }}
                        className="w-full text-[11px] text-primary/60 hover:text-primary py-1 transition-colors"
                      >
                        Or just use the text in my message →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Normal textarea ── */
              <>
                <Textarea
                  ref={textareaRef}
                  placeholder={
                    activeMode === "explain"    ? "Paste your notes, textbook page, or confusing concept — I'll break it down clearly." :
                    activeMode === "discussion" ? "Paste the discussion prompt — I'll draft a response in your voice, not AI voice." :
                    activeMode === "assignment" ? "Paste the assignment instructions — I'll show you how to tackle it step by step." :
                    "Paste your notes, assignment, or confusing topic…"
                  }
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    const text = e.target.value;
                    if (text.trim().length > 50) {
                      const lower = text.toLowerCase();
                      const isDiscussion = /\b(discuss|discussion|post|respond|response|reply|classmate|board|forum|prompt)\b/.test(lower);
                      const isAssignment = /\b(assignment|essay|paper|write a|due|submit|rubric|outline|thesis|argument|analyze)\b/.test(lower);
                      const isExplain = /\b(chapter|lecture|notes|textbook|concept|definition|theory|explains|means|define|module)\b/.test(lower);
                      const detected: Mode | null =
                        isDiscussion ? "discussion" :
                        isAssignment ? "assignment" :
                        isExplain    ? "explain" : null;
                      setSuggestedMode(detected !== activeMode ? detected : null);
                    } else {
                      setSuggestedMode(null);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={handleTextareaFocus}
                  disabled={isStreaming}
                  className="resize-none text-sm min-h-[90px] max-h-[220px] border-border/50"
                  rows={3}
                />
                {/* Smart mode suggestion */}
                {suggestedMode && suggestedMode !== activeMode && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-[11px] text-muted-foreground flex-1 leading-tight">
                      This looks like {suggestedMode === "discussion" ? "a discussion prompt" : suggestedMode === "assignment" ? "an assignment" : "lecture notes"}
                    </span>
                    <button
                      onClick={() => { setActiveMode(suggestedMode); setSuggestedMode(null); }}
                      className="text-[11px] font-semibold text-primary hover:underline whitespace-nowrap shrink-0"
                    >
                      Try {suggestedMode === "discussion" ? "Draft" : suggestedMode === "assignment" ? "Assignment" : "Explain"} →
                    </button>
                    <button onClick={() => setSuggestedMode(null)} className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  {messages.length > 0 ? (
                    <button onClick={() => setMessages([])} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="w-3 h-3"/> Clear chat
                    </button>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-2">
                    {/* Scan (camera) */}
                    <button
                      onClick={() => scanInputRef.current?.click()}
                      disabled={isStreaming}
                      title="Scan from book, screen, or screenshot"
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/8 transition-all disabled:opacity-40"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Scan</span>
                      <span className="sm:hidden">📷</span>
                    </button>
                    {/* Upload image file */}
                    <button
                      onClick={() => uploadInputRef.current?.click()}
                      disabled={isStreaming}
                      title="Upload a book page, screenshot, or photo"
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/8 transition-all disabled:opacity-40"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Upload</span>
                      <span className="sm:hidden">🖼</span>
                    </button>

                    {activeMode !== "chat" ? (
                      <Button
                        onClick={() => sendMessage(activeMode)}
                        disabled={!input.trim() || isStreaming}
                        size="sm"
                      >
                        {isStreaming ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> : null}
                        {MODES.find(m => m.id === activeMode)?.label} this
                      </Button>
                    ) : (
                      <Button size="icon" className="h-9 w-9" onClick={() => sendMessage()} disabled={!input.trim() || isStreaming}>
                        <Send className="w-4 h-4"/>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Microcopy hint */}
                <p className="text-[11px] text-muted-foreground/55 text-center -mt-0.5">
                  Scan = book · screen · screenshot · photo of notes
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Materials (compact, collapsible) ── */}
      {hasSyllabus && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uploaded Materials</p>
            <Dialog open={matOpen} onOpenChange={setMatOpen}>
              <DialogTrigger asChild>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3"/> Add more
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Add Course Material</DialogTitle>
                  <DialogDescription>Your classmate reads this and uses it to give you class-specific answers.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="e.g. Week 3 Lecture Notes" value={matTitle} onChange={e => setMatTitle(e.target.value)} autoFocus/>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={matType} onValueChange={setMatType}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="syllabus">Syllabus</SelectItem>
                        <SelectItem value="lecture_notes">Lecture Notes</SelectItem>
                        <SelectItem value="reading">Reading / Article</SelectItem>
                        <SelectItem value="assignment_instructions">Rubric</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Tabs defaultValue="paste" className="w-full">
                    <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="paste">Paste Text</TabsTrigger><TabsTrigger value="upload">Upload File</TabsTrigger></TabsList>
                    <TabsContent value="paste" className="space-y-4 pt-4">
                      <Textarea placeholder="Paste your content here…" value={matContent} onChange={e => setMatContent(e.target.value)} className="min-h-[140px]"/>
                      <Button onClick={handleAddText} disabled={!matTitle || !matContent || addMaterial.isPending} className="w-full">
                        {addMaterial.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}Save
                      </Button>
                    </TabsContent>
                    <TabsContent value="upload" className="space-y-4 pt-4">
                      <label htmlFor="file-up" className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all">
                        <Upload className="w-6 h-6 text-muted-foreground"/>
                        <span className="text-sm font-medium">{uploadFile ? uploadFile.name : "Click to choose"}</span>
                        <span className="text-xs text-muted-foreground">PDF, TXT, MD</span>
                        <input id="file-up" type="file" accept=".pdf,.txt,.md" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)}/>
                      </label>
                      <Button onClick={handleUpload} disabled={!matTitle || !uploadFile || isUploading} className="w-full">
                        {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}Upload
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {(course.materials ?? []).map(mat => (
              <div key={mat.id} className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 text-xs">
                <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground/90 font-medium">{mat.title}</span>
                  {mat.summary && (
                    <p className="text-muted-foreground mt-0.5 leading-snug">{mat.summary}</p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground hover:text-destructive transition-all text-sm leading-none shrink-0">×</button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Remove "{mat.title}"?</AlertDialogTitle><AlertDialogDescription>It won't be used for context anymore.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteMaterial(mat.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Work ── */}
      {recentWork.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Work</p>
          <div className="space-y-1">
            {recentWork.map(a => (
              <Link key={a.id} href={`/assignments/${a.id}`}>
                <div className="group flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
                    <span className="text-sm truncate group-hover:text-primary transition-colors">{a.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                    <span className="text-xs flex items-center gap-1"><Clock className="w-3 h-3"/>{format(new Date(a.createdAt), "MMM d")}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:text-primary transition-colors"/>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Material upload dialog (opened from syllabus nudge) */}
      <Dialog open={matOpen} onOpenChange={setMatOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Course Material</DialogTitle>
            <DialogDescription>Your classmate reads this and uses it to give you class-specific answers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Course Syllabus" value={matTitle} onChange={e => setMatTitle(e.target.value)} autoFocus/>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={matType} onValueChange={setMatType}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="syllabus">Syllabus</SelectItem>
                  <SelectItem value="lecture_notes">Lecture Notes</SelectItem>
                  <SelectItem value="reading">Reading / Article</SelectItem>
                  <SelectItem value="assignment_instructions">Rubric</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs defaultValue="paste" className="w-full">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="paste">Paste Text</TabsTrigger><TabsTrigger value="upload">Upload File</TabsTrigger></TabsList>
              <TabsContent value="paste" className="space-y-4 pt-4">
                <Textarea placeholder="Paste your content here…" value={matContent} onChange={e => setMatContent(e.target.value)} className="min-h-[140px]"/>
                <Button onClick={handleAddText} disabled={!matTitle || !matContent || addMaterial.isPending} className="w-full">
                  {addMaterial.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}Save
                </Button>
              </TabsContent>
              <TabsContent value="upload" className="space-y-4 pt-4">
                <label htmlFor="file-up2" className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <Upload className="w-6 h-6 text-muted-foreground"/>
                  <span className="text-sm font-medium">{uploadFile ? uploadFile.name : "Click to choose"}</span>
                  <span className="text-xs text-muted-foreground">PDF, TXT, MD</span>
                  <input id="file-up2" type="file" accept=".pdf,.txt,.md" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)}/>
                </label>
                <Button onClick={handleUpload} disabled={!matTitle || !uploadFile || isUploading} className="w-full">
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}Upload
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart highlight popover */}
      {highlight && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{ left: highlight.x, top: highlight.y - 8, transform: "translate(-50%, -100%)" }}
        >
          <button
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-xl animate-in fade-in zoom-in-95 duration-150"
            style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 16px hsl(256 90% 67% / 0.45)" }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const text = highlight.text;
              setHighlight(null);
              window.getSelection()?.removeAllRanges();
              sendQuickFollowUp(`Explain this part in more detail: "${text.slice(0, 200)}"`);
            }}
          >
            <Sparkles className="w-3 h-3" />
            Explain this
          </button>
        </div>
      )}

      {/* Save draft dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save to My Work</DialogTitle><DialogDescription>Give it a name to find it later.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Title</Label>
            <Input placeholder="e.g. Week 3 Discussion" value={saveTitle} onChange={e => setSaveTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && saveTitle && handleSave()} autoFocus/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!saveTitle || createAssignment.isPending}>
              {createAssignment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
