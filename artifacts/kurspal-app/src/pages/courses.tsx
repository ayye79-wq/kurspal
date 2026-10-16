import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, BookOpen, PenSquare, Play, Sparkles } from "lucide-react";
import { useListCourses, useCreateCourse } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getListCoursesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#527a63", "#c07d5c", "#6b7fa3", "#9b7ab0", "#7a9b6b", "#a07a6b"];

export default function CoursesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: courses, isLoading } = useListCourses();
  const createCourse = useCreateCourse();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [term, setTerm] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    createCourse.mutate({
      data: { name, instructor, term, color }
    }, {
      onSuccess: () => {
        setIsOpen(false);
        setName("");
        setInstructor("");
        setTerm("");
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "Course created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create course", variant: "destructive" });
      }
    });
  };

  const actionStrip = [
    { label: "Explain", icon: Sparkles, action: "explain" },
    { label: "Draft", icon: PenSquare, action: "draft" },
    { label: "Assignment", icon: Play, action: "assignment" },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 space-y-6">
      <header className="flex justify-between items-center pt-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Courses</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-full w-10 h-10 bg-[#1a1728] border border-[#2a2340] text-white">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1728] border-[#2a2340] text-white w-[90%] max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add a Course</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#a0a4b8]">Course Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-[#0d0e13] border-[#2a2340] text-white focus-visible:ring-[#7c5cfc]" placeholder="e.g. Introduction to Psychology" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructor" className="text-[#a0a4b8]">Instructor (Optional)</Label>
                <Input id="instructor" value={instructor} onChange={(e) => setInstructor(e.target.value)} className="bg-[#0d0e13] border-[#2a2340] text-white focus-visible:ring-[#7c5cfc]" placeholder="Dr. Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term" className="text-[#a0a4b8]">Term (Optional)</Label>
                <Input id="term" value={term} onChange={(e) => setTerm(e.target.value)} className="bg-[#0d0e13] border-[#2a2340] text-white focus-visible:ring-[#7c5cfc]" placeholder="Fall 2024" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a4b8]">Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={createCourse.isPending || !name} className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl mt-4">
                {createCourse.isPending ? "Creating..." : "Create Course"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Quick Action Strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {actionStrip.map((item) => (
          <button
            key={item.label}
            onClick={() => setLocation(`/workspace?action=${item.action}`)}
            className="flex-shrink-0 flex items-center gap-2 bg-[#1a1728] border border-[#2a2340] rounded-full px-4 py-2 text-sm font-medium text-white hover:bg-[#252236] transition-colors"
          >
            <item.icon className="w-4 h-4 text-[#7c5cfc]" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-medium text-[#8585a8] uppercase tracking-wider">Your Classes</h2>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl bg-[#1a1728]" />
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-3">
            {courses.map(course => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <div className="bg-[#1a1728] border border-[#2a2340] rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden active:scale-[0.98] transition-transform">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: course.color }} />
                  <div className="pl-2">
                    <h3 className="font-semibold text-lg text-white leading-tight">{course.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#8585a8] mt-1">
                      {course.instructor && <span>{course.instructor}</span>}
                      {course.instructor && course.term && <span>•</span>}
                      {course.term && <span>{course.term}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-[#1a1728] border border-[#2a2340] rounded-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-[#2a2340] rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#8585a8]" />
            </div>
            <div>
              <p className="text-white font-medium">No courses yet</p>
              <p className="text-sm text-[#8585a8] mt-1">Add your first course to get started.</p>
            </div>
            <Button onClick={() => setIsOpen(true)} className="bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl mt-2">
              Add Course
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
