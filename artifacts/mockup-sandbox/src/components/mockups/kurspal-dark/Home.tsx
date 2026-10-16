export function Home() {
  const courses = [
    { name: "Introduction to Psychology", instructor: "Dr. Sarah Mills", term: "Fall 2025", color: "#7c5cfc" },
    { name: "Business Communication", instructor: "Prof. James Carter", term: "Fall 2025", color: "#4f8ef7" },
    { name: "Intro to Data Science", instructor: "Dr. Priya Nair", term: "Fall 2025", color: "#2dd4bf" },
  ];

  const actions = [
    { icon: "✦", label: "Explain something", sub: "Instant clarity on any concept", color: "#7c5cfc", bg: "rgba(124,92,252,0.12)" },
    { icon: "✎", label: "Write my post", sub: "Write posts in your own voice", color: "#4f8ef7", bg: "rgba(79,142,247,0.12)" },
    { icon: "☑", label: "Start my assignment", sub: "Turn prompts into a clear plan", color: "#2dd4bf", bg: "rgba(45,212,191,0.12)" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0812", fontFamily: "'Inter', sans-serif", color: "#e4e0f0", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 240, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#7c5cfc,#5037c8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>Kurspal</span>
          </div>
        </div>
        <div style={{ padding: "16px 12px", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 8px", marginBottom: 8 }}>Navigation</div>
          {[
            { icon: "⊞", label: "Courses", active: true },
            { icon: "↗", label: "Workspace" },
            { icon: "◷", label: "Assignments" },
            { icon: "♪", label: "Voice Profile" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 2, background: item.active ? "rgba(124,92,252,0.15)" : "transparent", color: item.active ? "#a78bfa" : "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 14, fontWeight: item.active ? 600 : 400 }}>
              <span style={{ width: 18, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "16px 8px 8px", marginTop: 8 }}>My Courses</div>
          {courses.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 8, marginBottom: 2, cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(124,92,252,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#a78bfa" }}>K</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Student</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Free Trial · 5 days left</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {/* Glow */}
        <div style={{ position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 600, background: "radial-gradient(ellipse at center, rgba(124,92,252,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ padding: "40px 48px", position: "relative" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(124,92,252,0.15)", border: "1px solid rgba(124,92,252,0.3)", borderRadius: 999, padding: "4px 12px", marginBottom: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c5cfc" }} />
                <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, letterSpacing: "0.05em" }}>YOUR COURSES</span>
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.5px", margin: 0, marginBottom: 8 }}>
                What do you need<br />help with right now?
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>Pick a mode below or open a course to get started.</p>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#7c5cfc,#5037c8)", border: "none", borderRadius: 999, padding: "11px 20px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.2px", boxShadow: "0 4px 20px rgba(124,92,252,0.4)" }}>
              + New Course
            </button>
          </div>

          {/* Action cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 48 }}>
            {actions.map((a) => (
              <div key={a.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px", cursor: "pointer", transition: "border-color .2s" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: a.bg, border: `1px solid ${a.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, fontSize: 18, marginBottom: 14 }}>{a.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#e4e0f0" }}>{a.label}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{a.sub}</div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: a.color }}>Open →</div>
              </div>
            ))}
          </div>

          {/* Courses */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Active Courses</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {courses.map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", cursor: "pointer" }}>
                <div style={{ width: 4, height: 44, borderRadius: 2, background: c.color, marginRight: 18, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{c.instructor} · {c.term}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ background: "rgba(124,92,252,0.12)", border: "1px solid rgba(124,92,252,0.25)", borderRadius: 999, padding: "7px 16px", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Open</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
