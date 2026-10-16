import { Link, useLocation } from "wouter";
import { BookOpen, PenSquare, Bookmark, User } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { name: "Courses", href: "/courses", icon: BookOpen },
    { name: "Write", href: "/workspace", icon: PenSquare },
    { name: "Saved", href: "/assignments", icon: Bookmark },
    { name: "Profile", href: "/tone-profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#1a1728]/95 backdrop-blur-md border-t border-[#2a2340] z-50 px-2 pb-safe pt-2">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = location.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center justify-center py-2 gap-1 touch-manipulation">
              <tab.icon className={`w-5 h-5 ${isActive ? "text-[#7c5cfc]" : "text-[#8585a8]"}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-[#7c5cfc]" : "text-[#8585a8]"}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
