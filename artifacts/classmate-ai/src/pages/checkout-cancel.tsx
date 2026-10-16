import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { XCircle } from "lucide-react";

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setLocation("/courses"), 3000);
    return () => clearTimeout(t);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5">
        <XCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">No worries</h1>
      <p className="text-muted-foreground text-sm max-w-xs">
        You cancelled checkout. You can unlock Premium whenever you're ready.
      </p>
      <p className="text-xs text-muted-foreground/60 mt-4">Redirecting you back…</p>
    </div>
  );
}
