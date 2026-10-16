import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, FileText, ChevronRight, PenSquare, ArrowLeft } from "lucide-react";
import { useListCourses } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function WorkspacePage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialAction = searchParams.get("action") || "";

  const { data: courses, isLoading: coursesLoading } = useListCourses();
  const { toast } = useToast();

  const [step, setStep] = useState(initialAction ? 2 : 1);
  const [action, setAction] = useState(initialAction);
  const [prompt, setPrompt] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const actions = [
    { id: "explain", label: "Explain Concept", icon: Sparkles, desc: "Break down a complex topic" },
    { id: "draft", label: "Draft Post", icon: PenSquare, desc: "Write a discussion board post" },
    { id: "assignment", label: "Assignment Help", icon: FileText, desc: "Get unstuck on homework" },
  ];

  const handleStartStream = async () => {
    if (!prompt) return;
    setStep(3);
    setOutput("");
    setIsStreaming(true);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}../api/ai/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          courseId: courseId ? parseInt(courseId) : undefined 
        })
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.done) {
              setIsStreaming(false);
              return;
            }
            if (json.content) {
              setOutput(prev => prev + json.content);
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (error) {
      toast({ title: "Failed to generate output", variant: "destructive" });
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-10 bg-[#0d0e13]/90 backdrop-blur-md border-b border-[#2a2340] px-4 py-3 flex items-center gap-3">
        {step > 1 && (
          <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} className="text-white hover:bg-[#1a1728]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-lg font-bold text-white tracking-tight">Workspace</h1>
      </header>

      <div className="p-4 flex-1 flex flex-col">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">What do you need help with?</h2>
              <p className="text-sm text-[#8585a8]">Select an action to get started.</p>
            </div>
            
            <div className="space-y-3">
              {actions.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setAction(a.id); setStep(2); }}
                  className="w-full bg-[#1a1728] border border-[#2a2340] rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#7c5cfc]/10 flex items-center justify-center shrink-0">
                    <a.icon className="w-6 h-6 text-[#7c5cfc]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-base">{a.label}</h3>
                    <p className="text-sm text-[#8585a8]">{a.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#2a2340]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                {actions.find(a => a.id === action)?.label || "Enter Prompt"}
              </h2>
            </div>
            
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#a0a4b8]">Course Context (Optional)</label>
                {coursesLoading ? (
                  <Skeleton className="h-12 w-full rounded-xl bg-[#1a1728]" />
                ) : (
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="w-full bg-[#1a1728] border-[#2a2340] text-white h-12 rounded-xl">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1728] border-[#2a2340] text-white">
                      <SelectItem value="none">None</SelectItem>
                      {courses?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-sm font-medium text-[#a0a4b8]">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Paste your assignment prompt, question, or discussion requirements here..."
                  className="w-full flex-1 rounded-xl bg-[#1a1728] border border-[#2a2340] text-white p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#7c5cfc] min-h-[200px]"
                />
              </div>

              <Button 
                onClick={handleStartStream} 
                disabled={!prompt}
                className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white h-14 rounded-xl text-base font-semibold mt-auto"
              >
                Generate
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex-1 bg-[#1a1728] border border-[#2a2340] rounded-2xl p-5 overflow-y-auto">
              <div className="prose prose-invert max-w-none text-white whitespace-pre-wrap font-sans leading-relaxed">
                {output}
                {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-[#7c5cfc] animate-pulse" />}
              </div>
            </div>
            
            {!isStreaming && (
              <div className="flex gap-3 shrink-0">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-[#2a2340] text-white hover:bg-[#2a2340] h-12 rounded-xl">
                  Refine
                </Button>
                <Button className="flex-1 bg-[#7c5cfc] hover:bg-[#a78bfa] text-white h-12 rounded-xl">
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
