export default function DeleteAccountPage() {
  return (
    <div style={{ background: "#0d0e13", minHeight: "100dvh", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #7c5cfc, #5b8dee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🎓</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>Kurspal</span>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 12 }}>
          Account & Data Deletion
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
          You have the right to delete your Kurspal account and the data associated with it at any time.
        </p>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
            How to request deletion
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                step: "1",
                title: "Email us",
                body: <>Send an email to <a href="mailto:support@kurspal.com" style={{ color: "#7c5cfc" }}>support@kurspal.com</a> with the subject line <strong style={{ color: "#e2e8f0" }}>"Delete my account"</strong> from the email address associated with your Kurspal account.</>,
              },
              {
                step: "2",
                title: "Confirm your identity",
                body: "We may ask you to confirm your identity to prevent accidental or unauthorized deletions. We'll reply within 2 business days.",
              },
              {
                step: "3",
                title: "Deletion is processed",
                body: "Once confirmed, your account and all associated data will be permanently deleted within 30 days.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} style={{
                background: "#161820", borderRadius: 12, padding: "20px 24px",
                display: "flex", gap: 16, alignItems: "flex-start",
                border: "1px solid #232535",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c5cfc, #5b8dee)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, color: "#fff", flexShrink: 0,
                }}>{step}</div>
                <div>
                  <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>{title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.6 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
            What gets deleted
          </h2>
          <div style={{ background: "#161820", borderRadius: 12, padding: "20px 24px", border: "1px solid #232535" }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Your account profile (name, email address)",
                "All courses and course materials you uploaded",
                "All assignments and AI-generated drafts",
                "Your tone profile and writing samples",
                "Your AI usage history and session data",
                "Subscription information stored by Kurspal",
              ].map((item) => (
                <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#94a3b8", fontSize: 15 }}>
                  <span style={{ color: "#22c55e", marginTop: 2 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
            What may be retained
          </h2>
          <div style={{ background: "#161820", borderRadius: 12, padding: "20px 24px", border: "1px solid #232535" }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { item: "Billing and transaction records", note: "retained for up to 7 years as required by law" },
                { item: "Anonymized, aggregated usage statistics", note: "not linked to your identity" },
              ].map(({ item, note }) => (
                <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15 }}>
                  <span style={{ color: "#f59e0b", marginTop: 2 }}>!</span>
                  <span>
                    <span style={{ color: "#e2e8f0" }}>{item}</span>
                    {" — "}
                    <span style={{ color: "#94a3b8" }}>{note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
            Third-party services
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.6 }}>
            Kurspal uses Stripe for payment processing. Stripe retains billing records independently in accordance with their own{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#7c5cfc" }}>Privacy Policy</a>.
            We will request deletion of your customer record from Stripe as part of the deletion process.
          </p>
        </section>

        <div style={{
          background: "#161820", borderRadius: 12, padding: "20px 24px",
          border: "1px solid #232535", textAlign: "center",
        }}>
          <p style={{ color: "#94a3b8", fontSize: 15, margin: 0 }}>
            Questions? Contact us at{" "}
            <a href="mailto:support@kurspal.com" style={{ color: "#7c5cfc" }}>support@kurspal.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
