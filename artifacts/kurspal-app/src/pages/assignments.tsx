import { Link } from "wouter";
import { Bookmark, FileText } from "lucide-react";
import { useListAssignments } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AssignmentsPage() {
  const { data: assignments, isLoading } = useListAssignments();

  return (
    <div className="flex-1 flex flex-col p-4 space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Saved Work</h1>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl bg-[#1a1728]" />
          ))}
        </div>
      ) : assignments && assignments.length > 0 ? (
        <div className="grid gap-3">
          {assignments.map(assignment => (
            <Link key={assignment.id} href={`/assignments/${assignment.id}`}>
              <div className="bg-[#1a1728] border border-[#2a2340] rounded-2xl p-4 flex gap-4 active:scale-[0.98] transition-transform">
                <div className="w-12 h-12 rounded-xl bg-[#2a2340] flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-[#7c5cfc]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-semibold text-white truncate">{assignment.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#8585a8] mt-1">
                    {assignment.courseId && <span className="bg-[#2a2340] px-2 py-0.5 rounded text-[#a78bfa]">Course Work</span>}
                    <span>{format(new Date(assignment.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#1a1728] rounded-full flex items-center justify-center border border-[#2a2340]">
            <Bookmark className="w-8 h-8 text-[#8585a8]" />
          </div>
          <div>
            <p className="text-white font-medium text-lg">No saved work</p>
            <p className="text-sm text-[#8585a8] mt-1">Drafts and assignments you save will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
