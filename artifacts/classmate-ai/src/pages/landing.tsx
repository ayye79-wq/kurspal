import { useAuth, useClerk } from "@clerk/react";
import { Redirect } from "wouter";
import { Sparkles, PenLine, ClipboardList, ArrowRight, CheckCircle2, Mic, BookOpen, ChevronRight } from "lucide-react";
import { LiveDemo } from "../components/live-demo";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const STEPS = [
  {
    n: "01",
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Paste your assignment",
    desc: "Drop in a discussion prompt, rubric, or any instructions from your professor.",
    color: "#7c5cfc",
  },
  {
    n: "02",
    icon: <Sparkles className="w-5 h-5" />,
    title: "Kurspal breaks it down",
    desc: "See exactly what your professor is asking for — no more guessing what they want.",
    color: "#4f8ef7",
  },
  {
    n: "03",
    icon: <PenLine className="w-5 h-5" />,
    title: "Get a draft in your voice",
    desc: "Clear, natural writing that sounds like you — ready to submit or refine.",
    color: "#2dd4bf",
  },
];

const EXAMPLES = [
  {
    prompt: "Explain SQL injection to me like I'm a beginner.",
    tag: "Explain something",
    tagColor: "#7c5cfc",
    output: "SQL injection is when someone tricks your app into running unintended database commands. Imagine a lock that opens if you say the right password — SQL injection is like whispering \"...or just open anyway\" right after the password. Attackers sneak extra SQL code into form fields to dump your database, bypass logins, or delete data entirely. Prevention: always use parameterized queries, never concatenate raw user input into SQL strings.",
  },
  {
    prompt: "Write a Week 6 discussion post on cybercrime for my Security 101 class.",
    tag: "Write my post",
    tagColor: "#4f8ef7",
    output: "Cybercrime continues to evolve faster than legislation can keep pace. This week's readings reinforced something I've been thinking about: the biggest vulnerability isn't software — it's the assumption that security is someone else's responsibility. From the Colonial Pipeline attack to everyday phishing scams, the common thread is human error compounded by a lack of layered defenses. My takeaway: organizations need a culture of security, not just a policy document.",
  },
  {
    prompt: "Help me start my psychology assignment on cognitive dissonance.",
    tag: "Start my assignment",
    tagColor: "#2dd4bf",
    output: "Your assignment is asking you to explain the theory, give a real-world example, and analyze how people resolve dissonance. Strong angle: start with the 2004 study where smokers downplayed health risks rather than quit — it makes the theory immediately concrete. Structure: (1) define cognitive dissonance in your own words, (2) walk through the smoker example, (3) compare two resolution strategies — attitude change vs. rationalization. This gives you a clear 3-part argument to write to.",
  },
];

const FEATURES = [
  "Understands your actual course materials",
  "Drafts posts in your writing style",
  "Breaks down confusing rubrics",
  "Suggests classmate replies",
  "Refines drafts with one instruction",
  "Saves all your work automatically",
];

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignUp, openSignIn } = useClerk();

  if (isLoaded && isSignedIn) {
    return <Redirect to="/courses" />;
  }

  const signUp = () => openSignUp({});
  const signIn = () => openSignIn({});

  return (
    <div className="min-h-screen" style={{ background: "#0a0812", color: "#e4e7f0" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: "rgba(10,8,18,0.85)", backdropFilter: "blur(16px)", borderColor: "hsl(225 12% 16%)" }}>
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 2px 12px hsl(256 90% 67% / 0.4)" }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white">Kurspal</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={signIn}
              className="text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
              style={{ color: "hsl(220 10% 72%)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e4e7f0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "hsl(220 10% 72%)"; }}
            >
              Sign in
            </button>
            <button
              onClick={signUp}
              className="text-sm font-bold px-4 py-1.5 rounded-lg text-white transition-all hover:-translate-y-px"
              style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 2px 12px hsl(256 90% 67% / 0.3)" }}
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 pb-24">

        {/* ── Hero ── */}
        <section className="pt-20 pb-16 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl opacity-[0.07]" style={{ background: "#7c5cfc" }} />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold" style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.25)", color: "#a78bfa" }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#7c5cfc" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#7c5cfc" }} />
              </span>
              Your AI classmate is ready
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-5">
              What's stressing<br />
              <span style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #4f8ef7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                you out today?
              </span>
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-8" style={{ color: "hsl(220 10% 68%)" }}>
              Upload your syllabus and Kurspal breaks down assignments and drafts discussion posts that sound like <span className="font-semibold text-white">you</span> — grounded in <span className="font-semibold text-white">your actual course materials</span>, not a generic ChatGPT answer.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <button
                onClick={signUp}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 24px hsl(256 90% 67% / 0.4)" }}
              >
                Start your first assignment free <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs" style={{ color: "hsl(220 10% 56%)" }}>Free to start · no credit card</p>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {["No fluff, just clarity", "Sounds like you, not AI", "Learns your syllabus", "Ready to submit faster"].map(item => (
                <span key={item} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "hsl(220 10% 68%)" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#7c5cfc" }} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Live interactive demo ── */}
        <LiveDemo onSignUp={signUp} />

        {/* ── What Kurspal helps with ── */}
        <section className="py-10">
          <div className="rounded-2xl px-7 py-7" style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "hsl(256 90% 67%)" }}>Kurspal helps students</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "hsl(220 10% 78%)" }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(256 90% 67% / 0.15)" }}>
                    <CheckCircle2 className="w-3 h-3" style={{ color: "#9d80ff" }} />
                  </span>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-10">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(256 90% 67%)" }}>How it works</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Paste → Break down → Draft → Submit</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                <div
                  className="rounded-2xl px-5 py-6 h-full"
                  style={{ background: `linear-gradient(145deg, hsl(225 16% 12%) 0%, hsl(240 15% 10%) 100%)`, border: `1px solid ${step.color}22` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${step.color}18`, border: `1px solid ${step.color}30`, color: step.color }}>
                      {step.icon}
                    </div>
                    <span className="text-xs font-bold" style={{ color: step.color }}>{step.n}</span>
                  </div>
                  <h3 className="font-bold text-white mb-2 text-base leading-snug">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(220 10% 64%)" }}>{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-2 z-10 w-4 h-4 items-center justify-center -translate-y-1/2">
                    <ChevronRight className="w-4 h-4" style={{ color: "hsl(220 10% 40%)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Real examples with output ── */}
        <section className="py-10">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(256 90% 67%)" }}>Real examples</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">See the transformation</h2>
            <p className="text-sm mt-2" style={{ color: "hsl(220 10% 62%)" }}>Actual prompts. Actual output. This is what you get.</p>
          </div>

          <div className="space-y-4">
            {EXAMPLES.map((ex) => (
              <div
                key={ex.prompt}
                className="rounded-2xl overflow-hidden"
                style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)" }}
              >
                {/* Prompt row */}
                <div className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: "1px solid hsl(225 12% 16%)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold" style={{ background: "hsl(225 14% 18%)", color: "hsl(220 10% 60%)" }}>
                    You
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2" style={{ background: `${ex.tagColor}15`, color: ex.tagColor, border: `1px solid ${ex.tagColor}25` }}>
                      {ex.tag}
                    </span>
                    <p className="text-sm text-white">{ex.prompt}</p>
                  </div>
                </div>
                {/* Output row */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #7c5cfc, #5037c8)" }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "#9d80ff" }}>Kurspal</p>
                    <p className="text-sm leading-relaxed" style={{ color: "hsl(220 10% 76%)" }}>{ex.output}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Voice feature ── */}
        <section className="py-10">
          <div
            className="relative rounded-2xl overflow-hidden px-7 py-8"
            style={{ background: "linear-gradient(135deg, hsl(256 30% 12%) 0%, hsl(225 20% 10%) 100%)", border: "1px solid hsl(256 90% 67% / 0.2)" }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-10" style={{ background: "#7c5cfc" }} />
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(256 90% 67% / 0.15)", border: "1px solid hsl(256 90% 67% / 0.25)" }}>
                <Mic className="w-6 h-6" style={{ color: "#9d80ff" }} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">Sounds like YOU, not AI</h2>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(220 10% 68%)" }}>
                  Paste a few sentences you've written before and Kurspal learns your voice — your sentence length, your vocabulary, your tone. Every draft matches your natural style, so the writing genuinely reads as yours instead of a generic AI essay.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Course-aware AI ── */}
        <section className="py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl px-6 py-6" style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "hsl(210 80% 58% / 0.12)", border: "1px solid hsl(210 80% 58% / 0.2)" }}>
                <BookOpen className="w-5 h-5" style={{ color: "#4f8ef7" }} />
              </div>
              <h3 className="font-bold text-white mb-2">Knows your actual course</h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(220 10% 64%)" }}>
                Upload your syllabus, lecture notes, or reading materials. Kurspal references them when answering questions so responses match exactly what your professor taught.
              </p>
            </div>
            <div className="rounded-2xl px-6 py-6" style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "hsl(172 60% 42% / 0.1)", border: "1px solid hsl(172 60% 42% / 0.2)" }}>
                <PenLine className="w-5 h-5" style={{ color: "#2dd4bf" }} />
              </div>
              <h3 className="font-bold text-white mb-2">You're in control</h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(220 10% 64%)" }}>
                Refine any draft with a single instruction — "make it more formal", "add a counterargument", "shorten it". You stay in the driver's seat, Kurspal handles the heavy lifting.
              </p>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="py-10">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(256 90% 67%)" }}>Simple pricing</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Start free. Upgrade when it clicks.</h2>
            <p className="text-sm mt-2" style={{ color: "hsl(220 10% 62%)" }}>Free plan: 10 AI requests a day · Premium starts with a 7-day free trial · cancel anytime</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Monthly */}
            <div className="rounded-2xl px-6 py-7 flex flex-col" style={{ background: "hsl(225 16% 10%)", border: "1px solid hsl(225 12% 18%)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "hsl(220 10% 72%)" }}>Monthly</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold text-white">$4.99</span>
                <span className="text-sm" style={{ color: "hsl(220 10% 56%)" }}>/month</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "hsl(220 10% 56%)" }}>Billed monthly · cancel anytime</p>
              <button
                onClick={signUp}
                className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-px"
                style={{ background: "hsl(225 14% 16%)", color: "#e4e7f0", border: "1px solid hsl(225 12% 22%)" }}
              >
                Start free trial
              </button>
            </div>
            {/* Annual (highlighted) */}
            <div className="relative rounded-2xl px-6 py-7 flex flex-col" style={{ background: "linear-gradient(135deg, hsl(256 30% 13%) 0%, hsl(225 20% 10%) 100%)", border: "1px solid hsl(256 90% 67% / 0.4)" }}>
              <span className="absolute -top-2.5 right-5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white" style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)" }}>Save 33%</span>
              <p className="text-sm font-semibold mb-1" style={{ color: "#a78bfa" }}>Annual</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold text-white">$39.99</span>
                <span className="text-sm" style={{ color: "hsl(220 10% 56%)" }}>/year</span>
              </div>
              <p className="text-xs mb-6" style={{ color: "hsl(220 10% 60%)" }}>Just $3.33/mo · billed annually</p>
              <button
                onClick={signUp}
                className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-px"
                style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 4px 20px hsl(256 90% 67% / 0.35)" }}
              >
                Start free trial
              </button>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-10">
          <div
            className="relative rounded-2xl overflow-hidden px-8 py-12 text-center"
            style={{ background: "linear-gradient(135deg, hsl(248 22% 11%) 0%, hsl(225 20% 9%) 100%)", border: "1px solid hsl(225 12% 18%)" }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-3xl opacity-10" style={{ background: "#7c5cfc" }} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-semibold" style={{ background: "hsl(256 90% 67% / 0.12)", border: "1px solid hsl(256 90% 67% / 0.25)", color: "#a78bfa" }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#7c5cfc" }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#7c5cfc" }} />
                </span>
                No credit card required
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
                Start your first assignment free
              </h2>
              <p className="text-base mb-8 max-w-md mx-auto" style={{ color: "hsl(220 10% 64%)" }}>
                7 days of full access. Then $4.99/month or $39.99/year — less than a single tutoring session.
              </p>
              <button
                onClick={signUp}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-bold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #7c5cfc 0%, #5037c8 100%)", boxShadow: "0 6px 32px hsl(256 90% 67% / 0.45)" }}
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs mt-4" style={{ color: "hsl(220 10% 50%)" }}>
                Already have an account?{" "}
                <button onClick={signIn} className="font-semibold hover:underline" style={{ color: "#a78bfa" }}>Sign in</button>
              </p>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="pt-6 pb-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ borderColor: "hsl(225 12% 16%)", color: "hsl(220 10% 50%)" }}>
          <span>© 2026 Kurspal · your AI classmate for college</span>
          <div className="flex items-center gap-4">
            <a href={`${basePath}/privacy`} className="hover:text-foreground transition-colors">Privacy</a>
            <a href={`${basePath}/support`} className="hover:text-foreground transition-colors">Support</a>
            <button onClick={signIn} className="hover:text-foreground transition-colors">Sign in</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
