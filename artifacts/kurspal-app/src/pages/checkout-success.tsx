import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/courses");
    }, 3000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-20 h-20 bg-[#7c5cfc]/10 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-[#7c5cfc]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful</h1>
        <p className="text-[#8585a8]">Thank you for upgrading. Redirecting to your courses...</p>
      </div>
    </div>
  );
}
