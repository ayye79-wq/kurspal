import { useListAssignments, useGetAssignmentStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { FileText, Clock, FilePlus, ChevronRight, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AssignmentsPage() {
  const { data: assignments, isLoading: isLoadingAssignments } = useListAssignments();
  const { data: stats, isLoading: isLoadingStats } = useGetAssignmentStats();

  if (isLoadingAssignments || isLoadingStats) {
    return (
      <div className="space-y-8 animate-in fade-in">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Saved Work</h1>
          <p className="text-muted-foreground">Your past work and drafts across all courses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
              <p className="text-3xl font-bold">{stats?.totalCourses || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent border-accent/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-background rounded-full">
              <FileText className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
              <p className="text-3xl font-bold">{stats?.totalAssignments || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-full">
              <Clock className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Drafts</p>
              <p className="text-3xl font-bold">{stats?.totalDrafts || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-muted-foreground uppercase tracking-widest">History</h2>
        {assignments && assignments.length > 0 ? (
          <div className="grid gap-4">
            {assignments.map(assignment => (
              <Link key={assignment.id} href={`/assignments/${assignment.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg mb-2 group-hover:text-primary transition-colors">{assignment.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {assignment.subject && (
                          <span className="flex items-center px-2 py-0.5 bg-muted rounded-full text-xs">
                            {assignment.subject}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDistanceToNow(new Date(assignment.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <FileText className="w-12 h-12 mb-4 text-muted/30" />
              <p>No assignments yet.</p>
              <Link href="/courses">
                <Button variant="link" className="mt-2">Go to Courses</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
