export function Workspace() {
  const steps = [
    { n: 1, label: "Paste prompt", active: false, done: true },
    { n: 2, label: "Break it down", active: false, done: true },
    { n: 3, label: "Write it", active: true, done: false },
  ];

  const draft = `The rise of social media has fundamentally transformed how people communicate, consume information, and form relationships. While platforms like Instagram and TikTok have connected billions globally, their psychological impact remains a subject of intense debate among researchers and mental health professionals.

Studies suggest that excessive social media use correlates with increased anxiety and depression, particularly in adolescents. The constant stream of curated content creates unrealistic social comparisons, while algorithmic feeds are designed to maximize engagement rather than user wellbeing.

However, dismissing social media entirely overlooks its genuine benefits — from mental health communities that reduce isolation to grassroots organizing that drives real-world change.`;

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
          {[
            { icon: "⊞", label: "Courses" },
            { icon: "↗", label: "Workspace", active: true },
            { icon: "◷", label: "Assignments" },
            { icon: "♪", label: "Voice Profile" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, marginBottom: 2, background: item.active ? "rgba(124,92,252,0.15)" : "transparent", color: item.active ? "#a78bfa" : "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 14, fontWeight: item.active ? 600 : 400 }}>
              <span style={{ width: 18, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 600, height: 500, background: "radial-gradient(ellipse at center, rgba(124,92,252,0.09) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ padding: "36px 48px", maxWidth: 860, position: "relative" }}>
          {/* Course badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.25)", borderRadius: 999, padding: "5px 14px", marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4f8ef7" }} />
            <span style={{ fontSize: 12, color: "#6ba4fb", fontWeight: 600 }}>Working in: Introduction to Psychology</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.4px" }}>AI Workspace</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 32px" }}>Analyze, draft, and refine your assignments with AI.</p>

          {/* Step progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: s.done ? "rgba(124,92,252,0.25)" : s.active ? "linear-gradient(135deg,#7c5cfc,#5037c8)" : "rgba(255,255,255,0.06)", color: s.done ? "#a78bfa" : s.active ? "#fff" : "rgba(255,255,255,0.3)", border: s.active ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                    {s.done ? "✓" : s.n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: s.active ? 700 : 400, color: s.active ? "#e4e0f0" : s.done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div style={{ width: 48, height: 1, background: "rgba(255,255,255,0.1)", margin: "0 12px" }} />}
              </div>
            ))}
          </div>

          {/* Draft output */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c5cfc" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Your Draft</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "5px 12px", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Copy</button>
                <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "5px 12px", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Save</button>
              </div>
            </div>
            <div style={{ padding: "22px 24px", fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.75)", whiteSpace: "pre-wrap" }}>{draft}</div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
              AI-generated · may contain errors · verify with your course materials
            </div>
          </div>

          {/* Refine bar */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <input placeholder="Refine this draft... (e.g. make it more formal)" style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e4e0f0", fontSize: 14, "::placeholder": { color: "rgba(255,255,255,0.3)" } } as any} />
            <button style={{ background: "linear-gradient(135deg,#7c5cfc,#5037c8)", border: "none", borderRadius: 999, padding: "9px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 12px rgba(124,92,252,0.35)" }}>Refine →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
