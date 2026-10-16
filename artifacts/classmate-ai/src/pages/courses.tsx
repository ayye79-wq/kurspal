import { useState, useRef, useEffect } from "react";
import { useListCourses, useCreateCourse, useDeleteCourse, getListCoursesQueryKey, useGetToneProfile } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Trash2, GraduationCap, Calendar,
  Sparkles, PenLine, ClipboardList, ChevronRight,
  Upload, Clock, ArrowRight, MessageCircle, BookOpen, Settings, Loader2, Mic,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

type HeroMode = "explain" | "discussion" | "assignment";

const HERO_ACTIONS: {
  id: HeroMode;
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  glow: string;
}[] = [
  {
    id: "explain",
    icon: <Sparkles className="w-4 h-4" />,
    label: "Explain something",
    sub: "Instant clarity on any concept",
    color: "#7c5cfc",
    glow: "rgba(124,92,252,0.35)",
  },
  {
    id: "discussion",
    icon: <PenLine className="w-4 h-4" />,
    label: "Write my post",
    sub: "Write posts in your own voice",
    color: "#4f8ef7",
    glow: "rgba(79,142,247,0.35)",
  },
  {
    id: "assignment",
    icon: <ClipboardList className="w-4 h-4" />,
    label: "Start my assignment",
    sub: "Turn prompts into a clear plan",
    color: "#2dd4bf",
    glow: "rgba(45,212,191,0.35)",
  },
];

const COLORS = ["#7c5cfc","#4f8ef7","#2dd4bf","#f472b6","#fb923c","#a3e635","#e879f9","#38bdf8"];

const DEMO_COURSES = [
  { name: "Intro to Psychology", instructor: "Prof. Martinez", term: "Spring 2025", color: "#9b7ab0", materials: 3, discussions: 2 },
  { name: "Cybersecurity 101", instructor: "Dr. Patel", term: "Spring 2025", color: "#4f8ef7", materials: 5, discussions: 4 },
  { name: "Biology 201", instructor: "Prof. Chen", term: "Spring 2025", color: "#2dd4bf", materials: 2, discussions: 1 },
];

export default function CoursesPage() {
  const { data: courses, isLoading } = useListCourses();
  const { data: toneProfile } = useGetToneProfile({ query: { retry: false, queryKey: ["tone-profile"] as const } });
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: "", instructor: "", term: "", description: "", color: "#7c5cfc" });

  const [pickerMode, setPickerMode] = useState<HeroMode | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerMode) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerMode(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerMode]);

  const handleHeroAction = (mode: HeroMode) => {
    if (!courses || courses.length === 0) {
      setIsCreateOpen(true);
      return;
    }
    if (courses.length === 1) {
      launchMode(mode, courses[0].id);
      return;
    }
    setPickerMode(pickerMode === mode ? null : mode);
  };

  const launchMode = (mode: HeroMode, courseId: number) => {
    sessionStorage.setItem("classmate_quick_mode", mode);
    setPickerMode(null);
    setLocation(`/courses/${courseId}`);
  };

  const featuredCourseId = (() => {
    if (!courses || courses.length < 2) return null;
    let bestId: number | null = null;
    let bestDate = 0;
    for (const c of courses) {
      const assignments = (c as any).assignments ?? [];
      const materials = (c as any).materials ?? [];
      const allDates = [
        ...assignments.map((a: any) => new Date(a.createdAt).getTime()),
        ...materials.map((m: any) => new Date(m.createdAt).getTime()),
      ];
      const maxDate = allDates.length ? Math.max(...allDates) : 0;
      if (maxDate > bestDate) { bestDate = maxDate; bestId = c.id; }
    }
    return bestDate > 0 ? bestId : null;
  })();

  const recentHelp = (() => {
    if (!courses) return [];
    const items: { title: string; courseName: string; courseId: number; createdAt: string }[] = [];
    for (const c of courses) {
      for (const a of (c as any).assignments ?? []) {
        items.push({ title: a.title, courseName: c.name, courseId: c.id, createdAt: a.createdAt });
      }
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
  })();

  const handleCreate = () => {
    if (!newCourse.name) return;
    createCourse.mutate({ data: newCourse }, {
      onSuccess: (created) => {
        toast({ title: "Course added" });
        setIsCreateOpen(false);
        setNewCourse({ name: "", instructor: "", term: "", description: "", color: "#7c5cfc" });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setLocation(`/courses/${created.id}`);
      },
      onError: () => toast({ title: "Failed to create course", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteCourse.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Course deleted" });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const addCourseDialog = (
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(256 90% 67% / 0.15)", border: "1px solid hsl(256 90% 67% / 0.25)" }}>
              <BookOpen className="w-4 h-4" style={{ color: "#9d80ff" }} />
            </div>
            <div>
              <DialogTitle>Add a Course</DialogTitle>
              <DialogDescription>Give your classmate context — the name is enough to start.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(220 10% 70%)" }}>
              Course Name <span style={{ color: "#f87171" }}>*</span>
            </Label>
            <Input
              placeholder="e.g. Cybersecurity 301"
              value={newCourse.name}
              onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
              onKeyDown={e => e.key === "Enter" && newCourse.name && handleCreate()}
              autoFocus
              style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(220 10% 70%)" }}>Instructor <span className="font-normal normal-case tracking-normal" style={{ color: "hsl(220 10% 58%)" }}>(optional)</span></Label>
              <Input placeholder="Dr. Smith" value={newCourse.instructor} onChange={e => setNewCourse({ ...newCourse, instructor: e.target.value })} style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(220 10% 70%)" }}>Term <span className="font-normal normal-case tracking-normal" style={{ color: "hsl(220 10% 58%)" }}>(optional)</span></Label>
              <Input placeholder="Fall 2026" value={newCourse.term} onChange={e => setNewCourse({ ...newCourse, term: e.target.value })} style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(220 10% 70%)" }}>Description <span className="font-normal normal-case tracking-normal" style={{ color: "hsl(220 10% 58%)" }}>(optional)</span></Label>
            <Textarea placeholder="A quick note about what this course covers…" value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} className="resize-none h-20" style={{ background: "hsl(225 16% 10%)", borderColor: "hsl(225 12% 22%)" }} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(220 10% 70%)" }}>Course color</Label>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map(color => (
                <button key={color} type="button" aria-label={color}
                  onClick={() => setNewCourse({ ...newCourse, color })}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95"
                  style={{
                    backgroundColor: color,
                    boxShadow: newCourse.color === color
                      ? `0 0 0 2px hsl(225 16% 13%), 0 0 0 4px ${color}, 0 0 12px ${color}60`
                      : "none",
                    transform: newCourse.color === color ? "scale(1.15)" : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => setIsCreateOpen(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "hsl(225 14% 18%)", border: "1px solid hsl(225 12% 24%)", color: "hsl(220 10% 72%)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 88%)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 72%)"; }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!newCourse.name || createCourse.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 16px hsl(256 90% 67% / 0.35)" }}
          >
            {createCourse.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><BookOpen className="w-3.5 h-3.5" /> Add Course</>}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* ── Hero ── */}
      <div
        className="relative rounded-2xl px-7 py-7"
        style={{
          background: "linear-gradient(135deg, hsl(225 20% 13%) 0%, hsl(248 22% 16%) 100%)",
          border: "1px solid hsl(225 12% 22%)",
          boxShadow: "0 1px 0 0 hsl(256 90% 67% / 0.10) inset, 0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: "#7c5cfc" }} />
          <div className="absolute -bottom-16 -right-8 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: "#4f8ef7" }} />
        </div>

        <div className="relative z-10">
          {/* Status pill */}
          <div className="flex items-center gap-2 mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#7c5cfc" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#7c5cfc" }} />
            </span>
            <span className="text-xs font-semibold tracking-wide" style={{ color: "#7c5cfc" }}>Your AI classmate is ready</span>
          </div>

          <h1 className="text-[1.65rem] font-bold text-white mb-2 leading-snug tracking-tight">
            What's stressing you out today?
          </h1>
          <p className="text-sm mb-7" style={{ color: "hsl(220 14% 80%)" }}>
            Drop your prompt. Your AI classmate handles the rest.
          </p>

          {/* Action buttons */}
          <div ref={pickerRef} className="flex flex-col sm:flex-row gap-3">
            {HERO_ACTIONS.map((a) => (
              <div key={a.id} className="flex-1 relative">
                <button
                  onClick={() => handleHeroAction(a.id)}
                  className={`group w-full flex items-center gap-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98] ${pickerMode === a.id ? "scale-[1.03] -translate-y-1" : ""} ${a.id === "assignment" ? "px-5 py-5" : "px-5 py-4"}`}
                  style={a.id === "assignment" ? {
                    background: `linear-gradient(135deg, ${a.color}42 0%, ${a.color}22 100%)`,
                    border: `1.5px solid ${a.color}70`,
                    boxShadow: pickerMode === a.id
                      ? `0 16px 48px ${a.glow}, 0 0 0 1px ${a.color}40`
                      : `0 6px 28px ${a.glow}, 0 0 0 1px ${a.color}20`,
                  } : {
                    background: `linear-gradient(135deg, ${a.color}28 0%, ${a.color}12 100%)`,
                    border: `1px solid ${a.color}40`,
                    boxShadow: pickerMode === a.id
                      ? `0 12px 40px ${a.glow}, 0 0 0 1px ${a.color}30`
                      : `0 4px 16px ${a.glow}60`,
                  }}
                >
                  <span className="shrink-0 group-hover:scale-110 transition-transform duration-200" style={{ color: a.color }}>{a.icon}</span>
                  <span className="text-left">
                    <span className={`block ${a.id === "assignment" ? "text-white" : "text-white/90"}`}>{a.label}</span>
                    <span className="block text-xs font-normal mt-0.5" style={{ color: "hsl(220 12% 78%)" }}>{a.sub}</span>
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-all duration-200 ${pickerMode === a.id ? "rotate-90" : "group-hover:translate-x-1"}`} style={{ color: a.color, opacity: a.id === "assignment" ? 1 : 0.7 }} />
                </button>

                {pickerMode === a.id && courses && courses.length > 1 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ background: "hsl(225 14% 12%)", border: "1px solid hsl(225 12% 20%)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
                  >
                    <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest border-b" style={{ color: "hsl(220 10% 65%)", borderColor: "hsl(225 12% 18%)" }}>
                      Pick a course
                    </p>
                    {courses.map(c => (
                      <button
                        key={c.id}
                        onClick={() => launchMode(a.id, c.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b last:border-0"
                        style={{ borderColor: "hsl(225 12% 16%)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "hsl(225 12% 15%)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || "#7c5cfc" }} />
                        <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6">
            {["No fluff, just clarity", "Ready-to-use answers", "Sounds like you, not AI", "Learn first. Submit confidently."].map(item => (
              <span key={item} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "hsl(220 12% 82%)" }}>
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]" style={{ background: "hsl(256 90% 67% / 0.18)", color: "#9d80ff" }}>✔</span>
                {item}
              </span>
            ))}
          </div>

          {recentHelp.length > 0 && (
            <div className="mt-7 pt-5" style={{ borderTop: "1px solid hsl(225 12% 20%)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(220 12% 78%)" }}>Recent</p>
              <div className="flex flex-col gap-1">
                {recentHelp.map((item, i) => (
                  <Link key={i} href={`/courses/${item.courseId}`}>
                    <div className="flex items-center gap-3 group cursor-pointer rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-white/[0.03]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#7c5cfc", opacity: 0.6 }} />
                      <span className="text-sm group-hover:text-white transition-colors truncate" style={{ color: "hsl(220 12% 74%)" }}>
                        {item.title}
                        <span className="ml-1.5 text-xs" style={{ color: "hsl(220 12% 68%)" }}>· {item.courseName}</span>
                      </span>
                      <span className="text-[11px] ml-auto shrink-0 flex items-center gap-1 font-medium" style={{ color: "hsl(220 12% 68%)" }}>
                        <Clock className="w-3 h-3" />{format(new Date(item.createdAt), "MMM d")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Voice nudge ── */}
      {courses && courses.length > 0 && !toneProfile?.toneSummary && (
        <Link href="/tone-profile">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:-translate-y-px"
            style={{
              background: "linear-gradient(90deg, hsl(256 90% 67% / 0.12) 0%, hsl(256 90% 67% / 0.06) 100%)",
              border: "1px solid hsl(256 90% 67% / 0.28)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px hsl(256 90% 67% / 0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(256 90% 67% / 0.18)" }}>
              <Mic className="w-4 h-4" style={{ color: "#9d80ff" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "hsl(220 20% 90%)" }}>Make drafts sound like you</p>
              <p className="text-xs" style={{ color: "hsl(220 10% 68%)" }}>Set your writing voice — takes 2 min</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "hsl(256 90% 67% / 0.6)" }} />
          </div>
        </Link>
      )}

      {/* ── Courses ── */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(220 12% 72%)" }}>Your Courses</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "hsl(220 12% 76%)" }}>
              {courses && courses.length > 0 ? `${courses.length} course${courses.length !== 1 ? "s" : ""} · Kurspal learns as you study` : "Add a course to get started"}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-px active:scale-[0.97]"
                style={{
                  background: "hsl(256 90% 67% / 0.1)",
                  border: "1px solid hsl(256 90% 67% / 0.25)",
                  color: "hsl(256 90% 78%)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsl(256 90% 67% / 0.16)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px hsl(256 90% 67% / 0.2)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsl(256 90% 67% / 0.1)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add course
              </button>
            </DialogTrigger>
          </Dialog>
        </div>
        {addCourseDialog}

        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => {
              const accent = course.color || "#7c5cfc";
              const materials = (course as any).materials ?? [];
              const assignments = (course as any).assignments ?? [];
              const matCount = materials.length;
              const discCount = assignments.length;
              const isFeatured = course.id === featuredCourseId;

              // Last activity
              const lastAssignment = assignments.length
                ? [...assignments].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                : null;
              const lastActivityMs = lastAssignment ? new Date(lastAssignment.createdAt).getTime() : 0;
              const nowMs = Date.now();
              const diffH = lastActivityMs ? Math.floor((nowMs - lastActivityMs) / (1000 * 60 * 60)) : null;
              const lastAskedLabel = diffH === null ? null
                : diffH < 1 ? "Just now"
                : diffH < 24 ? `${diffH}h ago`
                : diffH < 48 ? "Yesterday"
                : format(new Date(lastActivityMs), "MMM d");

              return (
                <div
                  key={course.id}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(145deg, hsl(225 16% 16%) 0%, hsl(240 15% 14%) 100%)`,
                    border: `1px solid hsl(225 12% 22%)`,
                    boxShadow: isFeatured
                      ? `0 0 0 1px ${accent}35, 0 8px 32px ${accent}12`
                      : "0 2px 12px rgba(0,0,0,0.25)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}45`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${accent}30, 0 16px 48px ${accent}18`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(225 12% 19%)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = isFeatured
                      ? `0 0 0 1px ${accent}35, 0 8px 32px ${accent}12`
                      : "0 2px 12px rgba(0,0,0,0.25)";
                  }}
                >
                  {/* Accent top bar + glow */}
                  <div className="relative h-[4px] w-full">
                    <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${accent}ee 0%, ${accent}55 55%, transparent 100%)` }} />
                    <div className="absolute inset-x-0 top-0 h-[8px] blur-sm" style={{ background: `linear-gradient(90deg, ${accent}50 0%, transparent 70%)` }} />
                  </div>
                  {/* Subtle radial corner glow */}
                  <div className="absolute top-0 left-0 w-32 h-24 pointer-events-none" style={{ background: `radial-gradient(ellipse at top left, ${accent}10 0%, transparent 70%)` }} />

                  {/* Top: name + meta */}
                  <div className="px-5 pt-4 pb-4 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-foreground leading-tight truncate">{course.name}</h2>
                        {isFeatured && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}30` }}>
                            Active
                          </span>
                        )}
                      </div>
                      {(course.instructor || course.term) && (
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {course.instructor && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{course.instructor}</span>}
                          {course.term && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{course.term}</span>}
                        </div>
                      )}
                      {materials.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          {materials.slice(0, 3).map((m: any) => (
                            <span key={m.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: `${accent}14`, color: `${accent}cc`, border: `1px solid ${accent}20` }}>
                              {m.title.length > 22 ? m.title.slice(0, 22) + "…" : m.title}
                            </span>
                          ))}
                          {materials.length > 3 && (
                            <span className="text-[10px] font-medium" style={{ color: "hsl(220 10% 58%)" }}>+{materials.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{course.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>Removes all materials and saved discussions. Can't be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(course.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Memory strip: last session or no-activity nudge */}
                  {lastAssignment ? (
                    <div className="mx-4 mb-3 px-3 py-2 rounded-lg" style={{ background: `${accent}0d`, border: `1px solid ${accent}20` }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] flex items-center gap-1.5 truncate">
                          <Clock className="w-3 h-3 shrink-0" style={{ color: accent }} />
                          <span className="truncate" style={{ color: "hsl(220 10% 72%)" }}>
                            {lastAssignment.title}
                          </span>
                        </p>
                        <span className="text-[10px] font-medium shrink-0" style={{ color: `${accent}99` }}>
                          {lastAskedLabel}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-4 mb-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "hsl(256 90% 67% / 0.06)", border: "1px solid hsl(256 90% 67% / 0.18)" }}>
                      <Sparkles className="w-3 h-3 shrink-0" style={{ color: "#9d80ff" }} />
                      <p className="text-[11px]" style={{ color: "hsl(220 15% 68%)" }}>Your AI classmate is ready — drop your first question</p>
                    </div>
                  )}

                  {/* Ask Kurspal — primary CTA */}
                  <div className="px-4 pb-3">
                    <Link href={`/courses/${course.id}`}>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] group/cta"
                        style={{
                          background: "hsl(225 14% 17%)",
                          border: `1px solid ${accent}40`,
                          borderLeft: `3px solid ${accent}`,
                          color: "hsl(220 20% 88%)",
                          boxShadow: `0 2px 12px ${accent}15`,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = `${accent}12`;
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px ${accent}25`;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = "hsl(225 14% 17%)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 12px ${accent}15`;
                        }}
                      >
                        <Sparkles className="w-4 h-4 shrink-0" style={{ color: accent }} />
                        <span>{discCount > 0 ? "Continue conversation" : "Ask Kurspal"}</span>
                        <ChevronRight className="w-4 h-4 shrink-0 ml-auto transition-transform group-hover/cta:translate-x-0.5" style={{ color: accent, opacity: 0.7 }} />
                      </button>
                    </Link>
                  </div>

                  {/* Secondary pills */}
                  <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
                    <Link href={`/courses/${course.id}`}>
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:-translate-y-px"
                        style={{ background: `${accent}10`, border: `1px solid ${accent}28`, color: `${accent}dd` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}1e`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${accent}10`; }}
                      >
                        <Upload className="w-3 h-3" />
                        {matCount === 0 ? "Add syllabus" : `${matCount} material${matCount !== 1 ? "s" : ""}`}
                      </button>
                    </Link>
                    {matCount === 0 && (
                      <p className="w-full text-[11px] mt-0.5 pl-0.5" style={{ color: "hsl(220 10% 68%)" }}>
                        Adds context so answers match your exact course
                      </p>
                    )}
                    {discCount > 0 && (
                      <Link href={`/assignments`}>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:-translate-y-px"
                          style={{ background: "hsl(225 14% 16%)", border: "1px solid hsl(225 12% 22%)", color: "hsl(220 10% 70%)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 88%)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 70%)"; }}
                        >
                          <BookOpen className="w-3 h-3" />
                          {discCount} saved
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add course card */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-200 min-h-[120px] group"
              style={{ background: "hsl(225 14% 11%)", border: "1px solid hsl(225 12% 20%)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(256 90% 67% / 0.3)";
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(256 90% 67% / 0.06)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px hsl(256 90% 67% / 0.1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(225 12% 20%)";
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(225 14% 11%)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all group-hover:scale-110" style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.2)" }}>
                <Plus className="w-4 h-4" style={{ color: "#9d80ff" }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "hsl(220 10% 72%)" }}>New course</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Demo course cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 opacity-60 pointer-events-none select-none">
              {DEMO_COURSES.map((demo) => {
                const accent = demo.color;
                return (
                  <div
                    key={demo.name}
                    className="relative rounded-2xl overflow-hidden"
                    style={{
                      background: "linear-gradient(145deg, hsl(225 16% 14%) 0%, hsl(240 15% 12%) 100%)",
                      border: `1px solid hsl(225 12% 19%)`,
                    }}
                  >
                    <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}ee 0%, ${accent}44 60%, transparent 100%)` }} />
                    <div className="px-4 pt-3 pb-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white truncate">{demo.name}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}30` }}>
                          example
                        </span>
                      </div>
                      <div className="flex gap-x-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{demo.instructor}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{demo.term}</span>
                      </div>
                      <div className="flex gap-2 pt-1 text-[11px]" style={{ color: "hsl(220 10% 62%)" }}>
                        <span>{demo.materials} materials</span>
                        <span>·</span>
                        <span>{demo.discussions} discussions</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div
              className="relative rounded-2xl overflow-hidden px-7 py-8 flex flex-col items-center text-center"
              style={{
                background: "linear-gradient(145deg, hsl(225 18% 10%) 0%, hsl(248 20% 12%) 100%)",
                border: "1px solid hsl(225 12% 20%)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full blur-3xl opacity-10" style={{ background: "#7c5cfc" }} />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto" style={{ background: "hsl(256 90% 67% / 0.14)", border: "1px solid hsl(256 90% 67% / 0.25)" }}>
                  <Sparkles className="w-5 h-5" style={{ color: "#7c5cfc" }} />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Add your first course</h2>
                <p className="text-sm mb-5 max-w-xs mx-auto leading-relaxed" style={{ color: "hsl(220 10% 68%)" }}>
                  Your AI classmate will learn your syllabus and write in your voice.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 16px hsl(256 90% 67% / 0.35)" }}
                >
                  <Plus className="w-4 h-4" /> Add your first course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom ambient anchor ── */}
      {(() => {
        const last = recentHelp[0];
        return (
          <div className="relative rounded-2xl overflow-hidden px-7 py-6" style={{
            background: "linear-gradient(135deg, hsl(225 18% 9%) 0%, hsl(248 20% 11%) 100%)",
            border: "1px solid hsl(225 12% 17%)",
          }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-15" style={{ background: "#7c5cfc" }} />
              <div className="absolute top-0 right-8 w-32 h-20 rounded-full blur-2xl opacity-[0.08]" style={{ background: "#4f8ef7" }} />
            </div>
            <div className="relative z-10 flex items-center gap-5">
              <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.2)" }}>
                <GraduationCap className="w-5 h-5" style={{ color: "#9d80ff" }} />
              </div>
              <div className="flex-1 min-w-0">
                {last ? (
                  <>
                    <p className="text-sm font-semibold text-white">Picked up where you left off</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(220 10% 68%)" }}>
                      <span style={{ color: "#9d80ff" }}>{last.courseName}</span>
                      {" · "}{last.title}
                      {" · "}{format(new Date(last.createdAt), "MMM d")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-white">Keep the momentum going</p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(220 10% 68%)" }}>Kurspal learns from your materials and adapts to your voice over time.</p>
                  </>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: "#7c5cfc" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#7c5cfc" }} />
                </span>
                <span className="text-xs font-medium" style={{ color: "hsl(256 90% 72%)" }}>AI active</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
