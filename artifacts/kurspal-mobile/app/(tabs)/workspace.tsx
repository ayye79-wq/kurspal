import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Platform, Modal, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { API_BASE_URL } from "@/lib/config";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import {
  useListCourses,
  useGetToneProfile,
  getGetToneProfileQueryKey,
  useCreateAssignment,
  useSaveDraft,
} from "@workspace/api-client-react";

type Step = "input" | "analyzing" | "analyzed" | "drafting" | "drafted";

const REFINE_CHIPS = ["Shorter", "More like me", "Add detail", "More direct", "Less formal", "More academic"];

export default function WorkspaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { getToken } = useAuth();

  const { data: courses } = useListCourses();
  const { data: toneProfile } = useGetToneProfile({ query: { retry: false, queryKey: getGetToneProfileQueryKey() } });
  const createAssignment = useCreateAssignment();
  const saveDraftMutation = useSaveDraft();

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [angles, setAngles] = useState("");
  const [selectedAngle, setSelectedAngle] = useState("");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const [isRefining, setIsRefining] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");

  const [classmatePost, setClassmatePost] = useState("");
  const [replyOutput, setReplyOutput] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replyCopied, setReplyCopied] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const domain = API_BASE_URL.replace("https://", "");

  const streamToState = async (url: string, body: object, setter: (v: string) => void) => {
    const token = await getToken();
    const resp = await fetch(`https://${domain}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error("Something went wrong. Please try again.");
    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No reader");
    const dec = new TextDecoder();
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = dec.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.content) { out += parsed.content; setter(out); }
        } catch {}
      }
    }
    return out;
  };

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setStep("analyzing");
    setAngles("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await streamToState("/api/ai/analyze", {
        prompt, courseId: selectedCourseId,
      }, setAngles);
      setStep("analyzed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setStep("input");
    }
  };

  const handleDraft = async (angle: string) => {
    setSelectedAngle(angle);
    setStep("drafting");
    setDraft("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await streamToState("/api/ai/draft", {
        prompt,
        courseId: selectedCourseId,
        ideaDirection: angle,
        toneSummary: toneProfile?.toneSummary ?? undefined,
      }, setDraft);
      setStep("drafted");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setStep("analyzed");
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!draft || isRefining) return;
    setIsRefining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await streamToState("/api/ai/refine", {
        currentDraft: draft,
        instruction,
        prompt,
        toneSummary: toneProfile?.toneSummary ?? undefined,
        courseId: selectedCourseId,
      }, setDraft);
      setCustomInstruction("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Refinement failed", "Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateReply = async () => {
    if (!classmatePost.trim() || isReplying) return;
    setIsReplying(true);
    setReplyOutput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await streamToState("/api/ai/classmate-replies", {
        originalPrompt: prompt,
        classmatePost,
        toneSummary: toneProfile?.toneSummary ?? undefined,
        courseId: selectedCourseId,
      }, setReplyOutput);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Reply failed", "Please try again.");
    } finally {
      setIsReplying(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!saveTitle.trim()) return;
    setIsSaving(true);
    try {
      const assignment = await createAssignment.mutateAsync({
        data: {
          title: saveTitle.trim(),
          prompt,
          courseId: selectedCourseId,
          subject: courses?.find(c => c.id === selectedCourseId)?.name ?? undefined,
        },
      });
      await saveDraftMutation.mutateAsync({
        id: assignment.id,
        data: { content: draft, draftType: "initial" },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaveOpen(false);
      setSaveTitle("");
      Alert.alert("Saved!", "Find it in your Saved tab.");
    } catch {
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep("input"); setPrompt(""); setAngles(""); setDraft("");
    setSelectedAngle(""); setCustomInstruction("");
    setClassmatePost(""); setReplyOutput("");
  };

  const selectedCourse = courses?.find(c => c.id === selectedCourseId);
  const s = makeStyles(colors, insets, isWeb);

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: isWeb ? 67 : insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Write</Text>
            <Text style={s.headerSub}>What are you stuck on?</Text>
          </View>
          {step !== "input" && (
            <TouchableOpacity onPress={handleReset} style={s.resetBtn}>
              <Feather name="rotate-ccw" size={15} color={colors.mutedForeground} />
              <Text style={s.resetBtnText}>Start over</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step indicator */}
        <StepIndicator step={step} colors={colors} />

        <View style={s.content}>

          {/* Tone nudge */}
          {!toneProfile?.toneSummary && step === "input" && (
            <TouchableOpacity style={s.nudgeBanner} onPress={() => router.push("/voice")}>
              <Feather name="mic" size={14} color="#fb923c" />
              <Text style={s.nudgeText}>
                Set your voice so drafts sound like <Text style={s.nudgeBold}>you</Text>, not AI.{" "}
                <Text style={s.nudgeLink}>2 min setup →</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* Step 1: Input */}
          {(step === "input" || step === "analyzing") && (
            <View style={s.section}>
              <Text style={s.label}>Course (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.courseScroll}>
                {(courses ?? []).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.courseChip, selectedCourseId === c.id && s.courseChipActive]}
                    onPress={() => setSelectedCourseId(selectedCourseId === c.id ? null : c.id)}
                  >
                    <Text style={[s.courseChipText, selectedCourseId === c.id && s.courseChipTextActive]} numberOfLines={1}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[s.label, { marginTop: 20 }]}>This week's prompt</Text>
              <TextInput
                style={s.promptInput}
                placeholder="Paste your discussion prompt here..."
                placeholderTextColor={colors.mutedForeground}
                value={prompt}
                onChangeText={setPrompt}
                multiline
              />

              <TouchableOpacity
                style={[s.primaryBtn, (!prompt.trim() || step === "analyzing") && { opacity: 0.5 }]}
                onPress={handleAnalyze}
                disabled={!prompt.trim() || step === "analyzing"}
              >
                {step === "analyzing" ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <>
                    <Feather name="cpu" size={16} color={colors.primaryForeground} />
                    <Text style={s.primaryBtnText}>Break it down</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Angles */}
          {(step === "analyzed" || step === "drafting") && (
            <View style={s.section}>
              <Text style={s.stepTitle}>Pick an angle</Text>
              {selectedCourse && (
                <View style={s.courseTag}>
                  <View style={[s.courseDot, { backgroundColor: colors.primary }]} />
                  <Text style={s.courseTagText}>{selectedCourse.name}</Text>
                </View>
              )}
              <View style={s.analysisCard}>
                <Text style={s.analysisText}>{angles}</Text>
              </View>

              {["Angle 1", "Angle 2", "Angle 3"].map((a) => {
                const match = angles.match(new RegExp(`\\*\\*${a}[^:]*:\\*\\*([\\s\\S]*?)(?=\\*\\*Angle|$)`));
                if (!match) return null;
                const content = match[1].trim();
                return (
                  <TouchableOpacity
                    key={a}
                    style={[s.angleCard, step === "drafting" && selectedAngle === content && s.angleCardActive]}
                    onPress={() => handleDraft(content)}
                    disabled={step === "drafting"}
                  >
                    <Text style={s.angleLabel}>{a}</Text>
                    <Text style={s.angleContent} numberOfLines={4}>{content}</Text>
                    {step === "drafting" && selectedAngle === content ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
                    ) : (
                      <Feather name="arrow-right" size={16} color={colors.primary} style={{ marginTop: 8, alignSelf: "flex-end" }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Step 3: Draft */}
          {step === "drafted" && (
            <View style={s.section}>
              <Text style={s.stepTitle}>Your draft</Text>

              <View style={s.draftCard}>
                <Text style={s.draftText}>{draft}</Text>
                {isRefining && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
              </View>

              {!isRefining && (
                <View style={s.readyBadge}>
                  <Feather name="check-circle" size={13} color="#16a34a" />
                  <Text style={s.readyBadgeText}>Ready to submit — edit if needed</Text>
                </View>
              )}

              {/* Actions row */}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={async () => {
                    await Clipboard.setStringAsync(draft);
                    setCopied(true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Feather name={copied ? "check" : "copy"} size={15} color={colors.primary} />
                  <Text style={s.secondaryBtnText}>{copied ? "Copied!" : "Copy"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.secondaryBtn, { flex: 1 }]}
                  onPress={() => setSaveOpen(true)}
                >
                  <Feather name="bookmark" size={15} color={colors.primary} />
                  <Text style={s.secondaryBtnText}>Save draft</Text>
                </TouchableOpacity>
              </View>

              {/* Refine chips */}
              <View style={s.refineSection}>
                <Text style={s.refineSectionLabel}>Adjust it</Text>
                <View style={s.chipRow}>
                  {REFINE_CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[s.chip, isRefining && { opacity: 0.4 }]}
                      onPress={() => handleRefine(chip)}
                      disabled={isRefining}
                    >
                      <Text style={s.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.customRefineRow}>
                  <TextInput
                    style={s.customRefineInput}
                    placeholder="Tell me what to change…"
                    placeholderTextColor={colors.mutedForeground}
                    value={customInstruction}
                    onChangeText={setCustomInstruction}
                    editable={!isRefining}
                  />
                  <TouchableOpacity
                    style={[s.goBtn, (!customInstruction.trim() || isRefining) && { opacity: 0.4 }]}
                    onPress={() => handleRefine(customInstruction)}
                    disabled={!customInstruction.trim() || isRefining}
                  >
                    <Text style={s.goBtnText}>Go</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reply to classmate */}
              <View style={s.replySection}>
                <Text style={s.stepTitle}>Reply to a classmate</Text>
                <Text style={s.replySub}>Paste their post and get two options — one that agrees and builds, one that pushes back.</Text>
                <TextInput
                  style={[s.promptInput, { minHeight: 80 }]}
                  placeholder="Paste their post here…"
                  placeholderTextColor={colors.mutedForeground}
                  value={classmatePost}
                  onChangeText={setClassmatePost}
                  multiline
                />
                <TouchableOpacity
                  style={[s.outlineBtn, (!classmatePost.trim() || isReplying) && { opacity: 0.5 }]}
                  onPress={handleGenerateReply}
                  disabled={!classmatePost.trim() || isReplying}
                >
                  {isReplying ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text style={s.outlineBtnText}>Get reply options</Text>
                  )}
                </TouchableOpacity>

                {replyOutput ? (
                  <View style={s.replyOutputCard}>
                    <Text style={s.replyOutputText}>{replyOutput}</Text>
                    <TouchableOpacity
                      style={s.copyReplyBtn}
                      onPress={async () => {
                        await Clipboard.setStringAsync(replyOutput);
                        setReplyCopied(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setTimeout(() => setReplyCopied(false), 2000);
                      }}
                    >
                      <Feather name={replyCopied ? "check" : "copy"} size={14} color={colors.mutedForeground} />
                      <Text style={s.copyReplyBtnText}>{replyCopied ? "Copied!" : "Copy reply"}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>

      {/* Save draft modal */}
      <Modal visible={saveOpen} transparent animationType="fade" onRequestClose={() => setSaveOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Save this draft</Text>
            <Text style={s.modalSub}>Give it a name to find it in your Saved tab.</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Week 3 Discussion"
              placeholderTextColor={colors.mutedForeground}
              value={saveTitle}
              onChangeText={setSaveTitle}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => { setSaveOpen(false); setSaveTitle(""); }}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSave, (!saveTitle.trim() || isSaving) && { opacity: 0.4 }]}
                onPress={handleSaveDraft}
                disabled={!saveTitle.trim() || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={s.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const STEP_LABELS = ["Paste prompt", "Break it down", "Write it"];

function getStepNum(step: Step): number {
  if (step === "input") return 1;
  if (step === "analyzing" || step === "analyzed") return 2;
  return 3;
}

function StepIndicator({ step, colors }: { step: Step; colors: any }) {
  const current = getStepNum(step);
  return (
    <View style={si.row}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={label}>
            <View style={si.item}>
              <View style={[
                si.circle,
                done && { backgroundColor: "#8860f7", borderColor: "#8860f7" },
                active && { borderColor: "#8860f7", backgroundColor: "#8860f718" },
                !done && !active && { borderColor: "#4a5280", backgroundColor: colors.card },
              ]}>
                {done
                  ? <Feather name="check" size={11} color="#fff" />
                  : <Text style={[si.num, { color: active ? "#a78bfa" : "#9ba3c0" }]}>{n}</Text>
                }
              </View>
              <Text style={[si.label, { color: active ? colors.foreground : "#9ba3c0" }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
            {i < STEP_LABELS.length - 1 && (
              <View style={[si.line, { backgroundColor: done ? "#8860f7" : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  item: { alignItems: "center", gap: 4, width: 72 },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
  },
  num: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  line: { flex: 1, height: 2, borderRadius: 1, marginBottom: 18 },
});

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      flexDirection: "row", alignItems: "center",
    },
    headerTitle: { fontSize: 26, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    resetBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.muted },
    resetBtnText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    content: { padding: 20, paddingBottom: isWeb ? 34 : insets.bottom + 80, gap: 20 },
    nudgeBanner: {
      flexDirection: "row", alignItems: "flex-start", gap: 10,
      backgroundColor: "#2b2218", borderWidth: 1, borderColor: "#ea6c2040",
      borderRadius: colors.radius, padding: 12,
    },
    nudgeText: { flex: 1, fontSize: 13, color: "#fb923c", fontFamily: "Inter_400Regular", lineHeight: 19 },
    nudgeBold: { fontFamily: "Inter_700Bold" },
    nudgeLink: { fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
    section: { gap: 4 },
    label: { fontSize: 12, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    courseScroll: { marginBottom: 4 },
    courseChip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: colors.muted, marginRight: 8,
    },
    courseChipActive: { backgroundColor: colors.primary },
    courseChipText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    courseChipTextActive: { color: colors.primaryForeground },
    promptInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 14, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.card, fontFamily: "Inter_400Regular",
      minHeight: 120, textAlignVertical: "top", marginBottom: 16,
    },
    primaryBtn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    primaryBtnText: { color: colors.primaryForeground, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    stepTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 12 },
    courseTag: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: -4 },
    courseDot: { width: 8, height: 8, borderRadius: 4 },
    courseTagText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    analysisCard: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, padding: 14, marginBottom: 16,
    },
    analysisText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    angleCard: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, padding: 16, marginBottom: 10,
    },
    angleCardActive: { borderColor: colors.primary, backgroundColor: colors.muted },
    angleLabel: { fontSize: 11, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    angleContent: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    draftCard: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, padding: 16, marginBottom: 8,
    },
    draftText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 24 },
    readyBadge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      marginBottom: 12, paddingHorizontal: 2,
    },
    readyBadgeText: { fontSize: 12, fontWeight: "600", color: "#16a34a", fontFamily: "Inter_600SemiBold" },
    actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    secondaryBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderWidth: 1, borderColor: colors.primary, borderRadius: colors.radius,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    secondaryBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    refineSection: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 24 },
    refineSectionLabel: { fontSize: 11, fontWeight: "700", color: colors.mutedForeground, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    },
    chipText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    customRefineRow: { flexDirection: "row", gap: 8 },
    customRefineInput: {
      flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 12, fontSize: 14, color: colors.foreground,
      backgroundColor: colors.card, fontFamily: "Inter_400Regular",
    },
    goBtn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      paddingHorizontal: 18, alignItems: "center", justifyContent: "center",
    },
    goBtnText: { color: colors.primaryForeground, fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    replySection: { paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
    replySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: -8, marginBottom: 14 },
    outlineBtn: {
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 14, alignItems: "center",
    },
    outlineBtnText: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    replyOutputCard: {
      marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, padding: 16,
    },
    replyOutputText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    copyReplyBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginTop: 10 },
    copyReplyBtnText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    modalOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center", justifyContent: "center", padding: 24,
    },
    modalCard: {
      backgroundColor: colors.background, borderRadius: 16,
      padding: 24, width: "100%", maxWidth: 380,
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 4 },
    modalSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 16 },
    modalInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 14, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.card, fontFamily: "Inter_400Regular", marginBottom: 16,
    },
    modalActions: { flexDirection: "row", gap: 10 },
    modalCancel: {
      flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 14, alignItems: "center",
    },
    modalCancelText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    modalSave: {
      flex: 2, backgroundColor: colors.primary, borderRadius: colors.radius,
      padding: 14, alignItems: "center",
    },
    modalSaveText: { fontSize: 15, fontWeight: "600", color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
  });
}
