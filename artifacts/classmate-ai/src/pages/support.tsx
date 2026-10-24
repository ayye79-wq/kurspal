import React from "react";
import { Sparkles, Mail, MessageCircle, BookOpen, Zap, Edit2 } from "lucide-react";

const FAQS = [
  {
    q: "How do I add a course?",
    a: "On the Courses page, tap the + button and enter your course name, instructor, and term. You can also add a syllabus or notes to give the AI more context.",
  },
  {
    q: "Why does the AI sound generic?",
    a: "Set up your Voice Profile — paste a sample of your own writing and Kurspal will match your tone in every draft it generates.",
  },
  {
    q: "What's the difference between Explain, Draft, and Assignment modes?",
    a: "Explain breaks down confusing concepts in plain language. Draft writes discussion posts in your voice. Assignment gives you a step-by-step guide to approaching a task.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "On iOS, go to Settings → Apple ID → Subscriptions → Kurspal and tap Cancel. On the web, contact us at admin@kurspal.com and we'll handle it right away.",
  },
  {
    q: "I hit my daily limit — what now?",
    a: "Free accounts get 10 AI requests per day. Upgrade to Premium for unlimited usage, or wait for the daily reset at midnight UTC (8 pm Eastern).",
  },
  {
    q: "Can I delete my account?",
    a: "Yes — go to Settings → Delete Account inside the app. This permanently removes your account and all associated data within 30 days.",
  },
  {
    q: "Is my course content private?",
    a: "Your notes and materials are stored securely and are only used to generate your AI responses. We do not sell your data or use it to train AI models.",
  },
  {
    q: "The AI gave me wrong information — what should I do?",
    a: "Always verify AI-generated content against your course materials and instructor guidance. Kurspal is a study aid, not a source of truth. If something looks wrong, cross-check it.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Kurspal</span>
          </div>
          <a
            href="mailto:admin@kurspal.com"
            className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact us
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 pb-20">
        {/* Hero */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Help & Support</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Get answers or reach our team</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: BookOpen, label: "Add a course", color: "text-blue-400", bg: "bg-blue-500/10" },
            { icon: Zap, label: "Explain mode", color: "text-violet-400", bg: "bg-violet-500/10" },
            { icon: Edit2, label: "Draft mode", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          ].map(({ icon: Icon, label, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4 flex flex-col items-center gap-2 text-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-xs font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="text-base font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-3 mb-10">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1.5">{q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 text-center">
          <Mail className="w-8 h-8 text-violet-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground mb-1">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Our team responds within 24 hours on weekdays.
          </p>
          <a
            href="mailto:admin@kurspal.com"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Mail className="w-4 h-4" />
            admin@kurspal.com
          </a>
        </div>
      </main>
    </div>
  );
}
