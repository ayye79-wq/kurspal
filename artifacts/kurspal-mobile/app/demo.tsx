import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import { API_BASE_URL } from "@/lib/config";

type Intent = "explain" | "write" | "assignment";

const EXAMPLES: { id: Intent; tag: string; prompt: string }[] = [
  { id: "explain", tag: "Explain", prompt: "Explain SQL injection to me like I'm a beginner." },
  { id: "write", tag: "Write a post", prompt: "Write a Week 6 discussion post on cybercrime for my Security 101 class." },
  { id: "assignment", tag: "Assignment", prompt: "Help me start my psychology assignment on cognitive dissonance." },
];

function InlineText({ text, style }: { text: string; style: any }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontFamily: "Inter_700Bold", color: "#e4e7f0" }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

function RichAnswer({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  lines.forEach((line, idx) => {
    const t = line.trim();
    if (!t || t === "---") {
      return;
    }
    if (/^[•\-*]\s/.test(t)) {
      out.push(
        <View key={idx} style={s.bulletRow}>
          <View style={s.bulletDot} />
          <InlineText text={t.replace(/^[•\-*]\s*/, "")} style={s.bulletText} />
        </View>,
      );
    } else {
      out.push(<InlineText key={idx} text={t} style={s.answerPara} />);
    }
  });
  return <>{out}</>;
}

export default function DemoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();

  const initial = EXAMPLES.find((e) => e.id === intent) ?? EXAMPLES[0];
  const [prompt, setPrompt] = useState(initial.prompt);
  const [activeTag, setActiveTag] = useState<string | null>(initial.tag);
  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const run = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isStreaming) return;
    setHasRun(true);
    setOutput("");
    setError(false);
    setLimitReached(false);
    setIsStreaming(true);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/ai/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (resp.status === 429) {
        setLimitReached(true);
        setIsStreaming(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.done) {
              setIsStreaming(false);
              return;
            }
            if (json.content) {
              setOutput((prev) => prev + json.content);
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          } catch {
            /* ignore partial chunk parse errors */
          }
        }
      }
    } catch {
      setError(true);
    } finally {
      setIsStreaming(false);
    }
  };

  const pickExample = (ex: (typeof EXAMPLES)[number]) => {
    if (isStreaming) return;
    setPrompt(ex.prompt);
    setActiveTag(ex.tag);
  };

  const goSignUp = () => router.push("/(auth)/sign-up" as any);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/" as any));

  const done = hasRun && !isStreaming && output.length > 0 && !limitReached && !error;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} hitSlop={10} accessibilityLabel="Go back">
          <Feather name="arrow-left" size={22} color="#e4e7f0" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Try Kurspal</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: "#0d0e13" }}
        contentContainerStyle={[s.container, { paddingBottom: insets.bottom + 32, flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.badge}>
          <Ionicons name="sparkles" size={12} color="#a78bfa" />
          <Text style={s.badgeText}>Try it live — no sign up</Text>
        </View>
        <Text style={s.title}>See Kurspal think — right now</Text>
        <Text style={s.subtitle}>Pick an example or type your own. Watch a real answer stream in.</Text>

        <View style={s.chips}>
          {EXAMPLES.map((ex) => {
            const active = activeTag === ex.tag;
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => pickExample(ex)}
                disabled={isStreaming}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{ex.tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={s.input}
          value={prompt}
          onChangeText={(t) => {
            setPrompt(t);
            setActiveTag(null);
          }}
          editable={!isStreaming}
          multiline
          maxLength={2000}
          placeholder="Ask anything…"
          placeholderTextColor="#56566e"
        />

        <TouchableOpacity
          style={[s.primaryBtn, (isStreaming || !prompt.trim()) && s.primaryBtnDisabled]}
          onPress={run}
          disabled={isStreaming || !prompt.trim()}
          activeOpacity={0.85}
        >
          {isStreaming ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={s.primaryBtnText}>Kurspal is thinking…</Text>
            </>
          ) : done ? (
            <>
              <Feather name="rotate-ccw" size={17} color="#fff" />
              <Text style={s.primaryBtnText}>Try another</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={17} color="#fff" />
              <Text style={s.primaryBtnText}>See Kurspal answer</Text>
            </>
          )}
        </TouchableOpacity>

        {(output || (isStreaming && hasRun)) && !limitReached && (
          <View style={s.answerCard}>
            <View style={s.answerHeader}>
              <View style={s.answerAvatar}>
                <Ionicons name="sparkles" size={12} color="#fff" />
              </View>
              <Text style={s.answerLabel}>Kurspal</Text>
            </View>
            {output ? <RichAnswer text={output} /> : null}
            {isStreaming && !output ? (
              <ActivityIndicator size="small" color="#a78bfa" style={{ alignSelf: "flex-start", marginTop: 4 }} />
            ) : null}
            {output ? <Text style={s.disclaimer}>AI-generated · verify with your course materials</Text> : null}
          </View>
        )}

        {error && (
          <View style={s.answerCard}>
            <Text style={s.errorText}>Something went wrong reaching Kurspal. Please try again.</Text>
          </View>
        )}

        {limitReached && (
          <View style={s.ctaCard}>
            <View style={s.lockIcon}>
              <Feather name="lock" size={18} color="#a78bfa" />
            </View>
            <Text style={s.ctaTitle}>You've used up the free demo</Text>
            <Text style={s.ctaSub}>Create a free account to keep going — 7 days free, no card.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={goSignUp} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Create free account</Text>
              <Feather name="arrow-right" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {done && (
          <View style={s.ctaCard}>
            <Text style={s.ctaTitle}>Like that?</Text>
            <Text style={s.ctaSub}>Sign up free to save it, add your courses, and get unlimited answers.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={goSignUp} activeOpacity={0.85}>
              <Text style={s.ctaBtnText}>Create free account</Text>
              <Feather name="arrow-right" size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in" as any)} activeOpacity={0.7}>
              <Text style={s.signInText}>
                Already have an account? <Text style={s.signInLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d0e13" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1b1f2e",
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, color: "#e4e7f0", fontFamily: "Inter_700Bold" },
  container: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#231f3e",
    borderWidth: 1,
    borderColor: "#3a2f63",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, color: "#a78bfa", fontFamily: "Inter_600SemiBold" },
  title: {
    fontSize: 24,
    color: "#e4e7f0",
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  subtitle: { fontSize: 14, color: "#a0a4b8", fontFamily: "Inter_400Regular", lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#15131f",
    borderWidth: 1,
    borderColor: "#2a2340",
  },
  chipActive: { backgroundColor: "#2a2147", borderColor: "#5037c8" },
  chipText: { fontSize: 13, color: "#8585a8", fontFamily: "Inter_600SemiBold" },
  chipTextActive: { color: "#a78bfa" },
  input: {
    backgroundColor: "#15131f",
    borderWidth: 1,
    borderColor: "#2a2340",
    borderRadius: 14,
    padding: 14,
    color: "#e4e7f0",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 72,
    textAlignVertical: "top",
    lineHeight: 21,
  },
  primaryBtn: {
    backgroundColor: "#8860f7",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      default: {
        shadowColor: "#8860f7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  answerCard: {
    backgroundColor: "#15131f",
    borderWidth: 1,
    borderColor: "#2a2340",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    gap: 4,
  },
  answerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  answerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#7c5cfc",
    alignItems: "center",
    justifyContent: "center",
  },
  answerLabel: { fontSize: 12, color: "#a78bfa", fontFamily: "Inter_600SemiBold" },
  answerPara: { fontSize: 14.5, color: "#c4c7d4", fontFamily: "Inter_400Regular", lineHeight: 22, marginVertical: 4 },
  bulletRow: { flexDirection: "row", gap: 8, marginVertical: 3, paddingRight: 4 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#7c5cfc", marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14.5, color: "#c4c7d4", fontFamily: "Inter_400Regular", lineHeight: 22 },
  disclaimer: { fontSize: 11, color: "#56566e", fontFamily: "Inter_400Regular", marginTop: 8 },
  errorText: { fontSize: 14, color: "#fca5a5", fontFamily: "Inter_400Regular" },
  ctaCard: {
    backgroundColor: "#1c1830",
    borderWidth: 1,
    borderColor: "#3a2f63",
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    gap: 10,
    alignItems: "flex-start",
  },
  lockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#231f3e",
    borderWidth: 1,
    borderColor: "#3a2f63",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: { fontSize: 17, color: "#e4e7f0", fontFamily: "Inter_700Bold" },
  ctaSub: { fontSize: 13.5, color: "#a0a4b8", fontFamily: "Inter_400Regular", lineHeight: 20 },
  ctaBtn: {
    backgroundColor: "#8860f7",
    borderRadius: 13,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    marginTop: 2,
  },
  ctaBtnText: { color: "#fff", fontSize: 15.5, fontFamily: "Inter_700Bold" },
  signInText: { fontSize: 13, color: "#a0a4b8", fontFamily: "Inter_400Regular", alignSelf: "center", marginTop: 2 },
  signInLink: { color: "#a78bfa", fontFamily: "Inter_600SemiBold" },
});
