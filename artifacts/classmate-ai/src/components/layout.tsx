import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { FileText, Sparkles, Plus, Menu, X, Home, Edit2, Bookmark, User, LogOut } from "lucide-react";
import { useListCourses } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgress } from "@/hooks/use-progress";
import { useUser, useClerk } from "@clerk/react";

function SidebarContent({
  courses,
  isLoading,
  location,
  onNavigate,
}: {
  courses: any[] | undefined;
  isLoading: boolean;
  location: string;
  onNavigate: () => void;
}) {
  const { sessions } = useProgress();
  const bottomLinks = [
    { href: "/workspace", label: "Write", icon: Sparkles },
    { href: "/assignments", label: "Saved", icon: FileText },
    { href: "/tone-profile", label: "My Voice", icon: User },
  ];

  return (
    <div className="flex flex-col flex-1 px-3 py-4 gap-0.5 overflow-y-auto">
      <p className="text-[10px] font-bold uppercase tracking-widest px-2 mb-2" style={{ color: "hsl(220 14% 80%)" }}>
        Courses
      </p>

      {isLoading ? (
        <div className="space-y-2 px-2 py-1">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-3/5" />
        </div>
      ) : courses && courses.length > 0 ? (
        <>
          {courses.map((course) => {
            const isActive = location === `/courses/${course.id}`;
            const accent = course.color || "#7c5cfc";
            return (
              <Link key={course.id} href={`/courses/${course.id}`} className="contents" onClick={onNavigate}>
                <button
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left text-sm w-full`}
                  style={isActive ? {
                    background: `linear-gradient(90deg, ${accent}28 0%, ${accent}0e 100%)`,
                    borderLeft: `2px solid ${accent}`,
                    paddingLeft: "8px",
                    color: "hsl(220 20% 95%)",
                    fontWeight: 600,
                  } : { color: "hsl(220 10% 72%)" }}
                  onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 90%)"; } }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 72%)"; } }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: accent, opacity: isActive ? 1 : 0.7, boxShadow: isActive ? `0 0 6px ${accent}80` : "none" }}
                  />
                  <span className="truncate">{course.name}</span>
                </button>
              </Link>
            );
          })}
        </>
      ) : (
        <p className="px-2 py-1.5 text-sm" style={{ color: "hsl(220 12% 76%)" }}>No courses yet</p>
      )}

      <Link href="/courses" className="contents" onClick={onNavigate}>
        <button className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left text-xs font-medium mt-1 w-full" style={{ color: "hsl(220 12% 78%)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 88%)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 72%)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          Add course
        </button>
      </Link>

      <div className="my-3 h-px" style={{ background: "hsl(225 12% 20%)" }} />

      {bottomLinks.map((link) => {
        const isActive = location.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className="contents" onClick={onNavigate}>
            <button
              className={`flex items-center gap-2.5 py-2 rounded-lg transition-all text-left text-sm w-full`}
              style={isActive
                ? {
                    background: "linear-gradient(90deg, hsl(256 90% 67% / 0.16) 0%, hsl(256 90% 67% / 0.05) 100%)",
                    color: "hsl(256 90% 80%)",
                    fontWeight: 600,
                    borderLeft: "2px solid hsl(256 90% 67% / 0.75)",
                    paddingLeft: "8px",
                    paddingRight: "10px",
                  }
                : { color: "hsl(220 10% 76%)", paddingLeft: "10px", paddingRight: "10px" }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 20% 90%)"; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 74%)"; } }}
            >
              <link.icon className="w-3.5 h-3.5 shrink-0" />
              {link.label}
            </button>
          </Link>
        );
      })}

      {/* Today's progress */}
      {sessions > 0 && (
        <div className="mx-1 mt-2 px-3 py-2 rounded-xl text-xs" style={{ background: "hsl(256 90% 67% / 0.08)", border: "1px solid hsl(256 90% 67% / 0.18)" }}>
          <p style={{ color: "hsl(256 90% 82%)" }}>
            {sessions === 1
              ? "1 topic studied today"
              : sessions >= 5
              ? `${sessions} topics today — quiz time?`
              : `${sessions} topics studied today`}
          </p>
          {sessions >= 3 && (
            <p className="mt-0.5" style={{ color: "hsl(256 70% 72% / 0.7)", fontSize: "10px" }}>Keep it up!</p>
          )}
        </div>
      )}

    </div>
  );
}

function UserFooter() {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const initials = (user.firstName?.[0] ?? email[0] ?? "?").toUpperCase();

  return (
    <div className="px-3 py-3 border-t border-border/40 shrink-0">
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg" style={{ background: "hsl(270 18% 11%)" }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, #7c5cfc, #5037c8)", color: "#fff" }}
        >
          {initials}
        </div>
        <span
          className="flex-1 text-[11px] truncate"
          style={{ color: "hsl(220 12% 80%)" }}
          title={email}
        >
          {email}
        </span>
        <button
          onClick={() => signOut({ redirectUrl: (import.meta.env.BASE_URL || "/") })}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors hover:text-foreground"
          style={{ color: "hsl(220 10% 52%)" }}
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const SIDEBAR_HEADER_STYLE = {
  background: "hsl(270 28% 6%)",
  borderBottom: "1px solid hsl(268 18% 12%)",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: courses, isLoading } = useListCourses();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const logoLink = (
    <Link href="/courses" className="cursor-pointer" onClick={() => setDrawerOpen(false)}>
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)",
            boxShadow: "0 2px 12px hsl(256 90% 67% / 0.45)",
          }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-white">Kurspal</span>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 border-r border-border flex-col h-screen shrink-0" style={{ background: "hsl(270 26% 7%)" }}>
        <div className="flex flex-col gap-1 px-5 py-5 shrink-0" style={SIDEBAR_HEADER_STYLE}>
          {logoLink}
          <p className="text-[10px] font-semibold tracking-wide mt-0.5" style={{ color: "hsl(256 70% 82%)" }}>Your AI study companion</p>
        </div>
        <SidebarContent
          courses={courses}
          isLoading={isLoading}
          location={location}
          onNavigate={() => {}}
        />
        <UserFooter />
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border shrink-0 sticky top-0 z-30" style={{ background: "hsl(270 26% 7%)" }}>
        {logoLink}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ── */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "hsl(270 26% 7%)" }}
      >
        <div className="flex items-center justify-between px-5 py-5 shrink-0" style={SIDEBAR_HEADER_STYLE}>
          <div>
            {logoLink}
            <p className="text-[10px] font-semibold tracking-wide mt-0.5" style={{ color: "hsl(256 70% 82%)" }}>Your AI study companion</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <SidebarContent
          courses={courses}
          isLoading={isLoading}
          location={location}
          onNavigate={() => setDrawerOpen(false)}
        />
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 p-5 md:p-10 overflow-y-auto pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border flex items-stretch h-16 safe-area-bottom" style={{ background: "hsl(270 26% 7%)" }}>
        {[
          { href: "/", label: "Home", icon: Home, match: (l: string) => l === "/" || l === "/courses" },
          { href: "/workspace", label: "Write", icon: Edit2, match: (l: string) => l.startsWith("/workspace") },
          { href: "/assignments", label: "Saved", icon: Bookmark, match: (l: string) => l.startsWith("/assignments") },
          { href: "/tone-profile", label: "Profile", icon: User, match: (l: string) => l.startsWith("/tone-profile") },
        ].map(({ href, label, icon: Icon, match }) => {
          const isActive = match(location);
          return (
            <Link key={href} href={href} className="flex-1 contents" onClick={() => setDrawerOpen(false)}>
              <button className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                <Icon className={`w-5 h-5 transition-all ${isActive ? "scale-110" : ""}`} />
                <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>{label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
