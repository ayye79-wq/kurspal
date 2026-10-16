import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { LiveDemo } from "@/components/live-demo";

export default function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="text-center space-y-3 pt-2">
        <div className="w-14 h-14 bg-[#7c5cfc] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#7c5cfc]/20">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Kurspal</h1>
        <p className="text-[#8585a8] text-base max-w-[300px] mx-auto">
          Your AI study companion. Understand assignments, draft posts, and actually pass.
        </p>
      </div>

      <LiveDemo />

      <div className="w-full space-y-3 pt-1">
        {!isSignedIn ? (
          <>
            <Link href="/sign-up" className="w-full block">
              <Button className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl h-12 text-base font-semibold">
                Get Started Free
              </Button>
            </Link>
            <Link href="/sign-in" className="w-full block">
              <Button variant="ghost" className="w-full h-12 text-[#8585a8] hover:text-white rounded-xl text-base">
                I already have an account
              </Button>
            </Link>
          </>
        ) : (
          <Link href="/courses" className="w-full block">
            <Button className="w-full bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl h-12 text-base font-semibold">
              Go to Courses
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
