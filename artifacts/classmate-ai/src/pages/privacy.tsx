import React, { useState } from "react";
import { Shield, BookOpen, Sparkles } from "lucide-react";

type Tab = "privacy" | "terms";

export default function PrivacyPage() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined" && window.location.hash === "#terms") return "terms";
    return "privacy";
  });

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
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setTab("privacy")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "privacy"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setTab("terms")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "terms"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-10 pb-20">
        {tab === "privacy" ? <PrivacyContent /> : <TermsContent />}
      </main>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground mt-8 mb-2">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-sm text-muted-foreground leading-relaxed flex gap-2 mb-1.5">
      <span className="text-violet-400 mt-0.5 shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

function PrivacyContent() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated: May 8, 2026</p>
        </div>
      </div>

      <H2>1. Information We Collect</H2>
      <P>We collect the following types of information when you use Kurspal:</P>
      <ul className="mb-3">
        <Li><strong className="text-foreground">Account information:</strong> Your name, email address, and profile picture from your Replit account (via OAuth sign-in).</Li>
        <Li><strong className="text-foreground">Course content:</strong> Text, notes, syllabi, and materials you upload or type into the App.</Li>
        <Li><strong className="text-foreground">Usage data:</strong> How often you use AI features, which features you access, and your daily usage count (for free-tier enforcement).</Li>
        <Li><strong className="text-foreground">Device information:</strong> Device type, operating system version, and app version for debugging and support.</Li>
      </ul>

      <H2>2. How We Use Your Information</H2>
      <P>We use the information we collect to:</P>
      <ul className="mb-3">
        <Li>Provide, operate, and improve the Kurspal service.</Li>
        <Li>Send your content to OpenAI's API to generate AI responses.</Li>
        <Li>Enforce usage limits and manage subscriptions.</Li>
        <Li>Respond to support requests and communicate service updates.</Li>
        <Li>Detect and prevent abuse or unauthorized access.</Li>
      </ul>

      <H2>3. AI Processing — OpenAI</H2>
      <P>Kurspal uses OpenAI's API to power its AI features. When you use any AI feature (Explain, Draft, Refine, Quiz, Scan, etc.), the content you provide — including your prompt, course materials context, and any images — is transmitted to OpenAI's servers for processing.</P>
      <P>OpenAI processes this data under its own Privacy Policy and API usage policies. We encourage you to review OpenAI's privacy policy at openai.com/policies/privacy-policy. We do not use your data to train OpenAI models.</P>

      <H2>4. Data Storage</H2>
      <P>Your account data, courses, materials, assignments, and drafts are stored in a secure PostgreSQL database. User sessions are stored server-side and expire after inactivity. We use industry-standard security measures to protect your data.</P>

      <H2>5. Camera and Photo Library</H2>
      <P>Kurspal requests access to your camera and photo library solely to allow you to scan printed materials and handwritten notes for text extraction. Images are processed by OpenAI's vision API and are not stored on our servers after text extraction is complete.</P>

      <H2>6. Payments</H2>
      <P>Subscription payments are processed through Apple's App Store (mobile) and Stripe (web). We do not collect or store your payment card information. Apple and Stripe handle all billing under their own privacy policies.</P>

      <H2>7. Data Sharing</H2>
      <P>We do not sell your personal information. We share data only with:</P>
      <ul className="mb-3">
        <Li><strong className="text-foreground">OpenAI</strong> — to process AI requests (as described above).</Li>
        <Li><strong className="text-foreground">RevenueCat</strong> — to manage in-app subscriptions on mobile.</Li>
        <Li><strong className="text-foreground">Stripe</strong> — to process web subscription payments.</Li>
        <Li><strong className="text-foreground">Replit</strong> — as our hosting and authentication provider.</Li>
        <Li><strong className="text-foreground">Legal requirements</strong> — if required by law or to protect the rights and safety of users.</Li>
      </ul>

      <H2>8. Data Retention</H2>
      <P>We retain your data as long as your account is active. You may request deletion of your account and all associated data by contacting us at admin@kurspal.com or by using the "Delete Account" option in the app's Settings. We will process deletion requests within 30 days.</P>

      <H2>9. Children's Privacy</H2>
      <P>Kurspal is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us personal information, contact us at admin@kurspal.com and we will delete it promptly.</P>

      <H2>10. Your Rights</H2>
      <P>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at admin@kurspal.com or use the account management options within the app.</P>

      <H2>11. Changes to This Policy</H2>
      <P>We may update this Privacy Policy periodically. We will notify you of material changes via the App or email. Your continued use of the App after changes constitutes your acceptance of the revised Policy.</P>

      <H2>12. Contact</H2>
      <P>If you have questions or concerns about this Privacy Policy, contact us at: <a href="mailto:admin@kurspal.com" className="text-violet-400 hover:underline">admin@kurspal.com</a></P>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated: May 8, 2026</p>
        </div>
      </div>

      <H2>1. Acceptance of Terms</H2>
      <P>By downloading or using Kurspal ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.</P>

      <H2>2. Description of Service</H2>
      <P>Kurspal is an AI-powered study companion that helps students understand course material, draft discussion posts, and prepare for assignments. The App uses OpenAI's API to generate AI responses based on content you provide.</P>

      <H2>3. Eligibility</H2>
      <P>You must be at least 13 years old to use Kurspal. By using the App, you represent that you meet this requirement. If you are under 18, you represent that your parent or guardian has reviewed and agreed to these Terms.</P>

      <H2>4. User Accounts</H2>
      <P>You sign in via Replit authentication. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. Notify us immediately of any unauthorized use.</P>

      <H2>5. Acceptable Use</H2>
      <P>You agree not to use Kurspal to:</P>
      <ul className="mb-3">
        <Li>Submit work as your own in violation of your academic institution's honor code or plagiarism policy.</Li>
        <Li>Upload content you do not have the right to share.</Li>
        <Li>Reverse-engineer, decompile, or attempt to extract the source code of the App.</Li>
        <Li>Use the App for any unlawful purpose or in violation of any regulations.</Li>
        <Li>Attempt to gain unauthorized access to any portion of the App or its related systems.</Li>
      </ul>

      <H2>6. Academic Integrity</H2>
      <P>Kurspal is designed to help you understand material and develop your own thinking — not to produce work for direct submission without meaningful contribution of your own. You are solely responsible for ensuring your use of Kurspal complies with your school's academic integrity policies.</P>

      <H2>7. AI-Generated Content Disclaimer</H2>
      <P>All AI-generated content is provided for educational assistance only. AI outputs may contain errors, inaccuracies, or outdated information. Always verify AI-generated content against your course materials and instructor guidance. Kurspal is not liable for any academic or other consequences arising from reliance on AI-generated content.</P>

      <H2>8. Subscriptions and Billing</H2>
      <P>Kurspal offers a 7-day free trial followed by optional paid subscription plans (monthly or annual). Mobile subscriptions are processed through Apple's App Store and are subject to Apple's terms. Web subscriptions are processed through Stripe. You may cancel at any time through your device's subscription settings or account page. Refunds are handled per the applicable platform's standard refund policy.</P>

      <H2>9. Intellectual Property</H2>
      <P>All content, trademarks, and materials in the App are owned by or licensed to Kurspal. You retain ownership of content you upload, but grant Kurspal a limited license to process that content to provide the service.</P>

      <H2>10. Limitation of Liability</H2>
      <P>To the maximum extent permitted by law, Kurspal and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App. Our total liability is limited to the amount you paid for the App in the 12 months preceding the claim.</P>

      <H2>11. Changes to Terms</H2>
      <P>We may update these Terms from time to time. We will notify you of material changes via the App or email. Continued use of the App after changes constitutes your acceptance of the revised Terms.</P>

      <H2>12. Contact</H2>
      <P>For questions about these Terms, contact us at: <a href="mailto:admin@kurspal.com" className="text-violet-400 hover:underline">admin@kurspal.com</a></P>
    </>
  );
}
