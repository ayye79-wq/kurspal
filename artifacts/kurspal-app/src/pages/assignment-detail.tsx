import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Clock, BookOpen, PenSquare } from "lucide-react";
import { useGetAssignment, getGetAssignmentQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AssignmentDetailPage() {
  const [, params] = useRoute("/assignments/:id");
  const [, setLocation] = useLocation();
  
  const assignmentId = params?.id ? parseInt(params.id) : 0;
  
  const { data: assignment, isLoading } = useGetAssignment(assignmentId, {
    query: { enabled: !!assignmentId, queryKey: getGetAssignmentQueryKey(assignmentId) }
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-8 w-1/3 bg-[#1a1728] rounded-xl" />
        <Skeleton className="h-48 w-full bg-[#1a1728] rounded-2xl" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#8585a8]">Assignment not found.</p>
      </div>
    );
  }

  const latestDraft = assignment.drafts?.[0];

  return (
    <div className="flex-1 flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-[#0d0e13]/90 backdrop-blur-md border-b border-[#2a2340] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="text-white hover:bg-[#1a1728]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-white tracking-tight">Assignment</h1>
      </header>

      <div className="p-4 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{assignment.title}</h2>
          <div className="flex items-center gap-4 text-xs text-[#8585a8]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(assignment.createdAt), 'MMM d, yyyy')}
            </span>
            {assignment.courseId && (
              <span className="flex items-center gap-1 bg-[#2a2340] text-[#a78bfa] px-2 py-0.5 rounded">
                <BookOpen className="w-3 h-3" />
                Course Attached
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#8585a8] uppercase tracking-wider">Prompt</h3>
          <div className="bg-[#1a1728] border border-[#2a2340] rounded-2xl p-4 text-white text-sm whitespace-pre-wrap">
            {assignment.prompt}
          </div>
        </div>

        {latestDraft && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#8585a8] uppercase tracking-wider">Latest Draft</h3>
            <div className="bg-[#1a1728] border border-[#2a2340] rounded-2xl p-5 text-white whitespace-pre-wrap leading-relaxed">
              {latestDraft.content}
            </div>
          </div>
        )}

        <Button 
          onClick={() => setLocation("/workspace")} 
          className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white h-14 rounded-xl text-base font-semibold mt-4"
        >
          <PenSquare className="w-5 h-5 mr-2" />
          Refine in Workspace
        </Button>
      </div>
    </div>
  );
}
