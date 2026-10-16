import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

type Tab = "terms" | "privacy";

export default function LegalScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [active, setActive] = useState<Tab>(tab === "privacy" ? "privacy" : "terms");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <View style={[s.container, { paddingTop: isWeb ? 67 : insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#2a211a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Legal</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab selector */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, active === "terms" && s.tabActive]}
          onPress={() => setActive("terms")}
        >
          <Text style={[s.tabText, active === "terms" && s.tabTextActive]}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, active === "privacy" && s.tabActive]}
          onPress={() => setActive("privacy")}
        >
          <Text style={[s.tabText, active === "privacy" && s.tabTextActive]}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {active === "terms" ? <TermsContent /> : <PrivacyContent />}
        <View style={{ height: Math.max(insets.bottom, 24) }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.li}>
      <Text style={s.liDot}>•</Text>
      <Text style={[s.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

function TermsContent() {
  return (
    <>
      <Text style={s.updated}>Last updated: May 8, 2026</Text>

      <Section title="1. Acceptance of Terms">
        <P>By downloading or using Kurspal ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.</P>
      </Section>

      <Section title="2. Description of Service">
        <P>Kurspal is an AI-powered study companion that helps students understand course material, draft discussion posts, and prepare for assignments. The App uses OpenAI's API to generate AI responses based on content you provide.</P>
      </Section>

      <Section title="3. Eligibility">
        <P>You must be at least 13 years old to use Kurspal. By using the App, you represent that you meet this requirement. If you are under 18, you represent that your parent or guardian has reviewed and agreed to these Terms.</P>
      </Section>

      <Section title="4. User Accounts">
        <P>You sign in via Replit authentication. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. Notify us immediately of any unauthorized use.</P>
      </Section>

      <Section title="5. Acceptable Use">
        <P>You agree not to use Kurspal to:</P>
        <Li>Submit work as your own in violation of your academic institution's honor code or plagiarism policy.</Li>
        <Li>Upload content you do not have the right to share.</Li>
        <Li>Reverse-engineer, decompile, or attempt to extract the source code of the App.</Li>
        <Li>Use the App for any unlawful purpose or in violation of any regulations.</Li>
        <Li>Attempt to gain unauthorized access to any portion of the App or its related systems.</Li>
      </Section>

      <Section title="6. Academic Integrity">
        <P>Kurspal is designed to help you understand material and develop your own thinking — not to produce work for direct submission without meaningful contribution of your own. You are solely responsible for ensuring your use of Kurspal complies with your school's academic integrity policies.</P>
      </Section>

      <Section title="7. AI-Generated Content Disclaimer">
        <P>All AI-generated content is provided for educational assistance only. AI outputs may contain errors, inaccuracies, or outdated information. Always verify AI-generated content against your course materials and instructor guidance. Kurspal is not liable for any academic or other consequences arising from reliance on AI-generated content.</P>
      </Section>

      <Section title="8. Subscriptions and Billing">
        <P>Kurspal offers a 7-day free trial followed by optional paid subscription plans (monthly or annual). Subscriptions are processed through Apple's App Store (iOS) and are subject to Apple's terms. You may cancel at any time through your device's subscription settings. Refunds are handled per Apple's standard refund policy.</P>
      </Section>

      <Section title="9. Intellectual Property">
        <P>All content, trademarks, and materials in the App are owned by or licensed to Kurspal. You retain ownership of content you upload, but grant Kurspal a limited license to process that content to provide the service.</P>
      </Section>

      <Section title="10. Limitation of Liability">
        <P>To the maximum extent permitted by law, Kurspal and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App. Our total liability is limited to the amount you paid for the App in the 12 months preceding the claim.</P>
      </Section>

      <Section title="11. Changes to Terms">
        <P>We may update these Terms from time to time. We will notify you of material changes via the App or email. Continued use of the App after changes constitutes your acceptance of the revised Terms.</P>
      </Section>

      <Section title="12. Contact">
        <P>For questions about these Terms, contact us at: admin@kurspal.com</P>
      </Section>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <Text style={s.updated}>Last updated: May 8, 2026</Text>

      <Section title="1. Information We Collect">
        <P>We collect the following types of information when you use Kurspal:</P>
        <Li><Text style={s.bold}>Account information:</Text> Your name, email address, and profile picture from your Replit account (via OAuth sign-in).</Li>
        <Li><Text style={s.bold}>Course content:</Text> Text, notes, syllabi, and materials you upload or type into the App.</Li>
        <Li><Text style={s.bold}>Usage data:</Text> How often you use AI features, which features you access, and your daily usage count (for free-tier enforcement).</Li>
        <Li><Text style={s.bold}>Device information:</Text> Device type, operating system version, and app version for debugging and support.</Li>
      </Section>

      <Section title="2. How We Use Your Information">
        <P>We use the information we collect to:</P>
        <Li>Provide, operate, and improve the Kurspal service.</Li>
        <Li>Send your content to OpenAI's API to generate AI responses.</Li>
        <Li>Enforce usage limits and manage subscriptions.</Li>
        <Li>Respond to support requests and communicate service updates.</Li>
        <Li>Detect and prevent abuse or unauthorized access.</Li>
      </Section>

      <Section title="3. AI Processing — OpenAI">
        <P>Kurspal uses OpenAI's API to power its AI features. When you use any AI feature (Explain, Draft, Refine, Quiz, Scan, etc.), the content you provide — including your prompt, course materials context, and any images — is transmitted to OpenAI's servers for processing.</P>
        <P>OpenAI processes this data under its own Privacy Policy and API usage policies. We encourage you to review OpenAI's privacy policy at openai.com/policies/privacy-policy. We do not use your data to train OpenAI models.</P>
      </Section>

      <Section title="4. Data Storage">
        <P>Your account data, courses, materials, assignments, and drafts are stored in a secure PostgreSQL database. User sessions are stored server-side and expire after inactivity. We use industry-standard security measures to protect your data.</P>
      </Section>

      <Section title="5. Camera and Photo Library">
        <P>Kurspal requests access to your camera and photo library solely to allow you to scan printed materials and handwritten notes for text extraction. Images are processed by OpenAI's vision API and are not stored on our servers after text extraction is complete.</P>
      </Section>

      <Section title="6. Payments">
        <P>Subscription payments are processed through Apple's App Store. We do not collect or store your payment card information. Apple handles all billing under its own privacy policy.</P>
      </Section>

      <Section title="7. Data Sharing">
        <P>We do not sell your personal information. We share data only with:</P>
        <Li><Text style={s.bold}>OpenAI</Text> — to process AI requests (as described above).</Li>
        <Li><Text style={s.bold}>RevenueCat</Text> — to manage in-app subscriptions.</Li>
        <Li><Text style={s.bold}>Replit</Text> — as our hosting and authentication provider.</Li>
        <Li><Text style={s.bold}>Legal requirements</Text> — if required by law or to protect the rights and safety of users.</Li>
      </Section>

      <Section title="8. Data Retention">
        <P>We retain your data as long as your account is active. You may request deletion of your account and all associated data by contacting us at admin@kurspal.com or by using the "Delete Account" option in Settings. We will process deletion requests within 30 days.</P>
      </Section>

      <Section title="9. Children's Privacy">
        <P>Kurspal is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us personal information, contact us at admin@kurspal.com and we will delete it promptly.</P>
      </Section>

      <Section title="10. Your Rights">
        <P>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at admin@kurspal.com or use the account management options within the app.</P>
      </Section>

      <Section title="11. Changes to This Policy">
        <P>We may update this Privacy Policy periodically. We will notify you of material changes via the App or email. Your continued use of the App after changes constitutes your acceptance of the revised Policy.</P>
      </Section>

      <Section title="12. Contact">
        <P>If you have questions or concerns about this Privacy Policy, contact us at: admin@kurspal.com</P>
      </Section>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f0e8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e0d4",
  },
  backBtn: { width: 36, alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#2a211a",
    fontFamily: "Inter_700Bold",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e0d4",
    backgroundColor: "#f5f0e8",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#527a63" },
  tabText: {
    fontSize: 14,
    color: "#9ca3af",
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
  tabTextActive: { color: "#527a63", fontFamily: "Inter_700Bold", fontWeight: "700" },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 4 },
  updated: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  section: { marginTop: 20, gap: 8 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2a211a",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    color: "#4b3f35",
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  bold: { fontFamily: "Inter_700Bold", fontWeight: "700" },
  li: { flexDirection: "row", gap: 8, paddingLeft: 4 },
  liDot: { fontSize: 14, color: "#527a63", lineHeight: 22 },
});
