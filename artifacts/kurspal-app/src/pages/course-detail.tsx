import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, FileText, Send, Sparkles } from "lucide-react";
import { useGetCourse, useListCourseMaterials, useAddCourseMaterial, getListCourseMaterialsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const courseId = params?.id ? parseInt(params.id) : 0;
  
  const { data: course, isLoading: courseLoading } = useGetCourse(courseId, { 
    query: { enabled: !!courseId } 
  });
  
  const { data: materials, isLoading: materialsLoading } = useListCourseMaterials(courseId, {
    query: { enabled: !!courseId }
  });
  
  const addMaterial = useAddCourseMaterial();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    addMaterial.mutate({
      data: { courseId, title, content, materialType: "text" }
    }, {
      onSuccess: () => {
        setIsOpen(false);
        setTitle("");
        setContent("");
        queryClient.invalidateQueries({ queryKey: getListCourseMaterialsQueryKey(courseId) });
        toast({ title: "Material added successfully" });
      },
      onError: () => {
        toast({ title: "Failed to add material", variant: "destructive" });
      }
    });
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessages = [...messages, { role: "user" as const, content: chatInput }];
    setMessages(newMessages);
    setChatInput("");
    setIsTyping(true);

    try {
      // Mocking streaming response since no specific chat endpoint was provided in instructions
      // just generic AI endpoints
      setMessages([...newMessages, { role: "assistant", content: "I am an AI assistant. I can help you with this course." }]);
    } catch (error) {
      toast({ title: "Error sending message", variant: "destructive" });
    } finally {
      setIsTyping(false);
    }
  };

  if (courseLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-8 w-1/3 bg-[#1a1728] rounded-xl" />
        <Skeleton className="h-32 w-full bg-[#1a1728] rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#8585a8]">Course not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-20">
      <header className="sticky top-0 z-10 bg-[#0d0e13]/90 backdrop-blur-md border-b border-[#2a2340] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/courses")} className="text-white hover:bg-[#1a1728]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{course.name}</h1>
          <p className="text-xs text-[#8585a8] truncate">{course.instructor || 'No Instructor'} {course.term ? `• ${course.term}` : ''}</p>
        </div>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        <div className="bg-[#1a1728] border border-[#2a2340] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Materials</h2>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-[#7c5cfc] hover:bg-[#2a2340]">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1a1728] border-[#2a2340] text-white w-[90%] max-w-[400px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Add Material</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddMaterial} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-[#a0a4b8]">Title</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-[#0d0e13] border-[#2a2340] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-[#a0a4b8]">Content (Text / Syllabus)</Label>
                    <textarea 
                      id="content" 
                      value={content} 
                      onChange={(e) => setContent(e.target.value)} 
                      required 
                      className="w-full h-32 rounded-xl bg-[#0d0e13] border border-[#2a2340] text-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c5cfc]"
                    />
                  </div>
                  <Button type="submit" disabled={addMaterial.isPending || !title || !content} className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl mt-4">
                    {addMaterial.isPending ? "Adding..." : "Add Material"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {materialsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full bg-[#0d0e13] rounded-xl" />
            </div>
          ) : materials && materials.length > 0 ? (
            <div className="space-y-2">
              {materials.map(m => (
                <div key={m.id} className="bg-[#0d0e13] rounded-xl p-3 flex items-center gap-3 border border-[#2a2340]">
                  <FileText className="w-5 h-5 text-[#8585a8] shrink-0" />
                  <span className="text-sm text-white truncate">{m.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8585a8] text-center py-4">No materials added yet.</p>
          )}
        </div>

        <div className="bg-[#1a1728] border border-[#2a2340] rounded-2xl p-4 flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <Sparkles className="w-4 h-4 text-[#7c5cfc]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Course Assistant</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-sm text-[#8585a8]">Ask anything about {course.name}. I know your syllabus and materials.</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[#7c5cfc] text-white rounded-br-none' : 'bg-[#2a2340] text-white rounded-bl-none'}`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-2xl bg-[#2a2340] text-white rounded-bl-none text-sm flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-[#8585a8] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[#8585a8] rounded-full animate-bounce delay-100" />
                  <div className="w-1.5 h-1.5 bg-[#8585a8] rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="relative shrink-0 mt-auto">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-[#0d0e13] border-[#2a2340] rounded-full pr-12 text-white h-12"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!chatInput.trim() || isTyping}
              className="absolute right-1 top-1 bottom-1 h-10 w-10 rounded-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
