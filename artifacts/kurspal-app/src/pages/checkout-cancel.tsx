import { useEffect } from "react";
import { useLocation } from "wouter";
import { XCircle } from "lucide-react";

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/courses");
    }, 3000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-20 h-20 bg-[#ef4444]/10 rounded-full flex items-center justify-center">
        <XCircle className="w-10 h-10 text-[#ef4444]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
        <p className="text-[#8585a8]">Your payment was cancelled. Redirecting back...</p>
      </div>
    </div>
  );
}
