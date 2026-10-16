import { useGetAssignment, useDeleteAssignment, getGetAssignmentQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Trash2, Calendar, BookOpen, Copy, Check,
  Play, FileText, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AssignmentDetail() {
  const { id } = useParams();
  const assignmentId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: assignment, isLoading } = useGetAssignment(assignmentId, {
    query: { enabled: !!assignmentId, queryKey: getGetAssignmentQueryKey(assignmentId) }
  });

  const deleteAssignment = useDeleteAssignment();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const handleDelete = () => {
    deleteAssignment.mutate({ id: assignmentId }, {
      onSuccess: () => {
        toast({ title: "Discussion deleted" });
        setLocation(assignment?.courseId ? `/courses/${assignment.courseId}` : "/assignments");
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" })
    });
  };

  const copyToClipboard = (text: string, draftId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(draftId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied!" });
  };

  const handleContinue = () => {
    if (assignment?.prompt) {
      sessionStorage.setItem("classmate_prefill_prompt", assignment.prompt);
    }
    const dest = assignment?.courseId
      ? `/workspace?courseId=${assignment.courseId}`
      : "/workspace";
    setLocation(dest);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in max-w-3xl">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Discussion not found</h2>
        <Link href="/assignments">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        </Link>
      </div>
    );
  }

  const drafts = assignment.drafts ?? [];
  const latestDraft = drafts[drafts.length - 1];
  const promptIsLong = assignment.prompt.length > 300;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl pb-12">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        {assignment.courseId ? (
          <Link
            href={`/courses/${assignment.courseId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {assignment.subject ?? "Course"}
          </Link>
        ) : (
          <Link
            href="/assignments"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Discussions
          </Link>
        )}
      </div>

      {/* Header */}
      <div className="space-y-3">
        {assignment.subject && (
          <Link href={assignment.courseId ? `/courses/${assignment.courseId}` : "/courses"}>
            <Badge variant="secondary" className="gap-1.5 cursor-pointer hover:bg-secondary/80 transition-colors font-normal">
              <BookOpen className="w-3 h-3" />
              {assignment.subject}
            </Badge>
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-snug">{assignment.title}</h1>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(assignment.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <Button onClick={handleContinue} variant="outline" size="sm">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Continue working
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this discussion?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the prompt and all saved drafts. Can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Original Prompt</span>
        </div>
        <div className="px-5 py-4">
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!promptExpanded && promptIsLong ? "line-clamp-4" : ""}`}>
            {assignment.prompt}
          </p>
          {promptIsLong && (
            <button
              onClick={() => setPromptExpanded(!promptExpanded)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {promptExpanded
                ? <><ChevronUp className="w-3 h-3" /> Show less</>
                : <><ChevronDown className="w-3 h-3" /> Show full prompt</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Drafts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">
            {drafts.length > 0 ? `${drafts.length} draft${drafts.length !== 1 ? "s" : ""}` : "No drafts yet"}
          </h2>
          {drafts.length > 0 && (
            <span className="text-xs text-muted-foreground">newest first</span>
          )}
        </div>

        {drafts.length > 0 ? (
          <div className="space-y-4">
            {[...drafts].reverse().map((draft, i) => (
              <Card
                key={draft.id}
                className={`border-border/50 ${i === 0 ? "border-primary/30 shadow-sm" : ""}`}
              >
                <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    {i === 0 && (
                      <Badge className="text-[10px] h-4 px-1.5 font-normal">Latest</Badge>
                    )}
                    <div>
                      <span className="text-sm font-medium">
                        {draft.draftType === "initial" ? "First draft" : "Revised"}
                      </span>
                      {draft.instructions && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          "{draft.instructions}"
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(draft.createdAt), "h:mm a")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(draft.content, draft.id)}
                    >
                      {copiedId === draft.id
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-7 font-sans text-foreground/90">
                    {draft.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center border border-dashed border-border/50 rounded-xl">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No drafts saved for this discussion yet.</p>
            <Button onClick={handleContinue} variant="outline" size="sm">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start drafting
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
