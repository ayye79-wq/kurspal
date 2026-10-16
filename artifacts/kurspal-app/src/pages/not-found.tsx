import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 min-h-[100dvh] bg-[#0d0e13]">
      <div className="w-16 h-16 bg-[#1a1728] border border-[#2a2340] rounded-2xl flex items-center justify-center text-[#ef4444]">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-[#8585a8]">The page you're looking for doesn't exist or has been moved.</p>
      </div>
      <Link href="/courses">
        <Button className="bg-[#7c5cfc] hover:bg-[#a78bfa] text-white rounded-xl h-12 px-8 font-semibold">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
