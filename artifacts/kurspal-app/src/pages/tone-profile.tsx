import { useState, useEffect } from "react";
import { User, Activity, Sparkles, AlertCircle } from "lucide-react";
import { useGetToneProfile, useSaveToneProfile, getGetToneProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ToneProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: profile, isLoading } = useGetToneProfile({
    query: { retry: false, queryKey: getGetToneProfileQueryKey() }
  });
  
  const saveProfile = useSaveToneProfile();

  const [sample, setSample] = useState("");
  
  useEffect(() => {
    if (profile?.writingSample) {
      setSample(profile.writingSample);
    }
  }, [profile]);

  const handleSave = () => {
    if (!sample || sample.length < 50) {
      toast({ title: "Please provide a longer sample", variant: "destructive" });
      return;
    }

    saveProfile.mutate({
      data: { writingSample: sample }
    }, {
      onSuccess: () => {
        toast({ title: "Voice profile updated" });
        queryClient.invalidateQueries({ queryKey: getGetToneProfileQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">Your Voice</h1>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl bg-[#1a1728]" />
          <Skeleton className="h-20 w-full rounded-2xl bg-[#1a1728]" />
        </div>
      ) : (
        <div className="space-y-6">
          <Alert className="bg-[#7c5cfc]/10 border-[#7c5cfc]/20 text-white">
            <Sparkles className="w-4 h-4 text-[#7c5cfc]" />
            <AlertDescription className="text-sm ml-2">
              Kurspal uses your writing sample to ensure generated posts sound like you.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-[#8585a8] uppercase tracking-wider">Writing Sample</label>
              <span className="text-xs text-[#8585a8]">{sample.length} chars</span>
            </div>
            <textarea
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              placeholder="Paste a previous discussion post, essay, or email you've written..."
              className="w-full h-48 rounded-2xl bg-[#1a1728] border border-[#2a2340] text-white p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#7c5cfc]"
            />
            <Button 
              onClick={handleSave} 
              disabled={saveProfile.isPending || sample === profile?.writingSample}
              className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white h-12 rounded-xl font-semibold"
            >
              {saveProfile.isPending ? "Analyzing..." : "Update Voice Profile"}
            </Button>
          </div>

          {profile?.toneSummary && (
            <div className="bg-[#1a1728] border border-[#2a2340] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#7c5cfc]" />
                <h3 className="font-semibold text-white">Analysis Result</h3>
              </div>
              <p className="text-sm text-[#c4c8d8] leading-relaxed">
                {profile.toneSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
