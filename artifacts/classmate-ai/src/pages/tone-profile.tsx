import { useGetToneProfile, useSaveToneProfile, getGetToneProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, Sparkles, CheckCircle2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ToneProfilePage() {
  const { toast } = useToast();
  const { data: profile, isLoading, isError } = useGetToneProfile({
    query: { retry: false, queryKey: getGetToneProfileQueryKey() },
  });
  const saveToneProfile = useSaveToneProfile();

  const [writingSample, setWritingSample] = useState("");

  useEffect(() => {
    if (profile?.writingSample) {
      setWritingSample(profile.writingSample);
    }
  }, [profile]);

  const handleSave = () => {
    if (!writingSample.trim()) return;
    saveToneProfile.mutate(
      { data: { writingSample } },
      {
        onSuccess: () =>
          toast({ title: "Voice profile updated", description: "Your classmate will now sound more like you." }),
        onError: () =>
          toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  const wordCount = writingSample.trim().split(/\s+/).filter(Boolean).length;
  const hasEnoughWords = wordCount >= 150;
  const isChanged = writingSample !== (profile?.writingSample ?? "");

  if (isLoading && !isError) {
    return (
      <div className="space-y-8 animate-in fade-in max-w-3xl">
        <div>
          <Skeleton className="h-10 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Your Voice</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Paste something you've written. Your classmate will study how you phrase things, your sentence rhythm, your level of formality — and write drafts that sound like <em>you</em>, not AI.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Writing Sample</CardTitle>
            <CardDescription className="text-sm">
              A discussion post, a paragraph from an essay, an email — anything you wrote. More is better; aim for 200+ words.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                placeholder="Paste your writing here…"
                className="min-h-[280px] resize-y leading-relaxed"
                value={writingSample}
                onChange={(e) => setWritingSample(e.target.value)}
              />
              <div className={`absolute bottom-3 right-3 text-xs tabular-nums ${hasEnoughWords ? "text-primary" : "text-muted-foreground"}`}>
                {wordCount} {wordCount === 1 ? "word" : "words"}
                {!hasEnoughWords && wordCount > 0 && (
                  <span className="ml-1 text-muted-foreground">— add {150 - wordCount} more</span>
                )}
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={!writingSample.trim() || saveToneProfile.isPending || !isChanged || !hasEnoughWords}
            >
              {saveToneProfile.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</>
                : profile?.toneSummary
                ? "Update Voice Profile"
                : "Analyze My Voice"}
            </Button>
            {!hasEnoughWords && wordCount > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> A bit more text gives a more accurate voice profile.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Voice Analysis result */}
        {(profile?.toneSummary || saveToneProfile.isPending) && (
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                How your classmate sees your voice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {saveToneProfile.isPending ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="text-sm">Reading your vocabulary, pacing, and tone…</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {profile!.toneSummary}
                  </p>
                  <div className="pt-3 border-t border-primary/20 flex items-center gap-2 text-primary text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Active on all drafts across every course
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!profile?.toneSummary && !saveToneProfile.isPending && (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="px-6 py-5 bg-muted/30 border-b border-border/40">
              <p className="text-sm font-semibold mb-1">How this works</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Paste something you've already written — a discussion post, a paragraph from an essay, even a detailed email. Kurspal reads how you phrase things, your sentence rhythm, your level of formality, and builds a profile from it.
              </p>
            </div>
            <div className="divide-y divide-border/40">
              {[
                { step: "1", text: "Paste 150+ words of your own writing above" },
                { step: "2", text: "Click \"Analyze My Voice\" — takes about 5 seconds" },
                { step: "3", text: "Every discussion draft from now on will sound like you wrote it" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-4 px-6 py-3.5 bg-card">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
