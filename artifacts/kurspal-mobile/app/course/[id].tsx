import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, Platform, Modal, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetch } from "expo/fetch";
import { API_BASE_URL } from "@/lib/config";
import { AiLimitError, authHeaders, postAi, showLimitAlert } from "@/lib/api";
import { useAuth } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useColors } from "@/hooks/useColors";
import {
  useGetCourse,
  getGetCourseQueryKey,
  useAddCourseMaterial,
  useDeleteCourseMaterial,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type Mode = "explain" | "draft" | "assignment";
type Message = { role: "user" | "assistant"; content: string; mode?: Mode };
type QuizQuestion =
  | { type: "mcq"; question: string; options: string[]; answer: number; explanation: string }
  | { type: "short"; question: string; answer: string; explanation: string };

const MODES: { id: Mode; label: string; icon: string; hint: string }[] = [
  { id: "explain", label: "Explain", icon: "zap", hint: "Break it down simply" },
  { id: "draft", label: "Draft", icon: "edit-2", hint: "Write it for me" },
  { id: "assignment", label: "Assignment", icon: "clipboard", hint: "Guide me through it" },
];

const MODE_CHAT_MAP: Record<Mode, string> = {
  explain: "explain",
  draft: "discussion",
  assignment: "assignment",
};

export default function CourseDetailScreen() {
  const { id, mode: modeParam } = useLocalSearchParams<{ id: string; mode?: string }>();
  const courseId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const { getToken } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useGetCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) },
  });
  const addMaterial = useAddCourseMaterial();
  const deleteMaterial = useDeleteCourseMaterial();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const initialMode: Mode = (modeParam === "draft" || modeParam === "assignment") ? modeParam : "explain";
  const [activeMode, setActiveMode] = useState<Mode>(initialMode);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [suggestedMode, setSuggestedMode] = useState<Mode | null>(null);
  const [showMaterials, setShowMaterials] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matContent, setMatContent] = useState("");
  const [scanning, setScanning] = useState(false);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const canSend = true;

  const sendMessage = async () => {
    if (!input.trim() || isStreaming || !canSend) return;
    const userMsg: Message = { role: "user", content: input.trim(), mode: activeMode };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const resp = await postAi("/api/ai/chat", {
        courseId,
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        mode: MODE_CHAT_MAP[activeMode],
      }, getToken);

      if (!resp.ok) {
        const errText = "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: errText }]);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let accumulated = "";
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) { streamError = parsed.error; break; }
            if (parsed.content) {
              accumulated += parsed.content;
              setStreamingContent(accumulated);
            }
            if (parsed.done) break;
          } catch {}
        }
      }

      if (streamError) throw new Error(streamError);
      if (accumulated.trim()) {
        setMessages((prev) => [...prev, { role: "assistant", content: accumulated, mode: activeMode }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "No response received. Please try again." }]);
      }
    } catch (err) {
      if (err instanceof AiLimitError) {
        setMessages((prev) => [...prev, { role: "assistant", content: err.message }]);
        showLimitAlert(err, router);
      } else {
        const msg = err instanceof Error && err.message !== "No reader" ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const launchQuiz = async () => {
    const materials = course?.materials ?? [];
    if (materials.length === 0) {
      Alert.alert("No materials", "Add some course materials first — then I can quiz you on them.");
      return;
    }
    const content = materials.map(m => `${m.title}:\n${m.content}`).join("\n\n").slice(0, 6000);
    setShowMaterials(false);
    setShowQuiz(true);
    setQuizLoading(true);
    setQuizQuestions(null);
    setQuizIdx(0);
    setSelectedOption(null);
    setShowAnswer(false);
    setScore(0);
    setQuizDone(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const resp = await postAi("/api/ai/quiz", { content, courseId }, getToken);
      if (!resp.ok) throw new Error("Quiz failed");
      const data = await resp.json() as { questions?: QuizQuestion[] };
      setQuizQuestions(data.questions ?? []);
    } catch (err) {
      if (err instanceof AiLimitError) showLimitAlert(err, router);
      else Alert.alert("Quiz failed", "Couldn't generate a quiz. Try again.");
      setShowQuiz(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswerMCQ = (optionIdx: number) => {
    if (showAnswer) return;
    setSelectedOption(optionIdx);
    setShowAnswer(true);
    const q = quizQuestions![quizIdx] as Extract<QuizQuestion, { type: "mcq" }>;
    if (optionIdx === q.answer) {
      setScore(s => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = quizIdx + 1;
    if (!quizQuestions || nextIdx >= quizQuestions.length) {
      setQuizDone(true);
    } else {
      setQuizIdx(nextIdx);
      setSelectedOption(null);
      setShowAnswer(false);
    }
  };

  const sendQuickFollowUp = async (text: string, targetMode?: Mode) => {
    if (isStreaming) return;
    const modeToUse = targetMode ?? activeMode;
    const userMsg: Message = { role: "user", content: text, mode: modeToUse };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);
    setStreamingContent("");
    try {
      const resp = await postAi("/api/ai/chat", {
        courseId,
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        mode: MODE_CHAT_MAP[modeToUse],
      }, getToken);
      if (!resp.ok) {
        const errText = "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: errText }]);
        return;
      }
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let accumulated = "";
      let streamError: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) { streamError = parsed.error; break; }
            if (parsed.content) { accumulated += parsed.content; setStreamingContent(accumulated); }
            if (parsed.done) break;
          } catch {}
        }
      }
      if (streamError) throw new Error(streamError);
      if (accumulated.trim()) {
        setMessages((prev) => [...prev, { role: "assistant", content: accumulated, mode: modeToUse }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "No response received. Please try again." }]);
      }
    } catch (err) {
      if (err instanceof AiLimitError) {
        setMessages((prev) => [...prev, { role: "assistant", content: err.message }]);
        showLimitAlert(err, router);
      } else {
        const msg = err instanceof Error && err.message !== "No reader" ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleAddMaterial = async () => {
    if (!matTitle.trim() || !matContent.trim()) return;
    await addMaterial.mutateAsync({
      id: courseId,
      data: { title: matTitle.trim(), materialType: "notes", content: matContent.trim() },
    });
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
    setMatTitle(""); setMatContent(""); setAddingMaterial(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const autoSaveMaterial = async (title: string, content: string, materialType: "pdf" | "notes") => {
    await addMaterial.mutateAsync({
      id: courseId,
      data: { title, materialType, content },
    });
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const extractTextFromImage = async (base64: string, mimeType: string) => {
    const resp = await postAi("/api/ai/scan", { imageBase64: base64, mimeType }, getToken);
    const data = await resp.json() as { text?: string; error?: string };
    if (!resp.ok || !data.text) throw new Error(data.error ?? "Extraction failed");
    return data.text;
  };

  const handleScan = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access needed", "Allow camera access in Settings to scan documents.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setScanning(true);
    try {
      const text = await extractTextFromImage(result.assets[0].base64, "image/jpeg");
      await autoSaveMaterial("Scanned notes", text, "notes");
    } catch (err) {
      if (err instanceof AiLimitError) showLimitAlert(err, router);
      else Alert.alert("Scan failed", "Couldn't extract text from the image. Try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Photos access needed", "Allow photo library access in Settings to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setScanning(true);
    try {
      const text = await extractTextFromImage(result.assets[0].base64, "image/jpeg");
      await autoSaveMaterial("Uploaded notes", text, "notes");
    } catch (err) {
      if (err instanceof AiLimitError) showLimitAlert(err, router);
      else Alert.alert("Upload failed", "Couldn't extract text from the image. Try again.");
    } finally {
      setScanning(false);
    }
  };

  const handlePdfUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/plain", "text/markdown"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const title = asset.name.replace(/\.[^/.]+$/, "") || "Uploaded file";
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", { uri: asset.uri, type: asset.mimeType ?? "application/pdf", name: asset.name } as any);
      formData.append("title", title);
      formData.append("materialType", "pdf");
      const resp = await fetch(`${API_BASE_URL}/api/courses/${courseId}/materials/upload`, {
        method: "POST",
        headers: await authHeaders(getToken),
        body: formData,
      });
      const data = await resp.json() as { content?: string; error?: string };
      if (!resp.ok || !data.content) throw new Error(data.error ?? "Upload failed");
      await autoSaveMaterial(title, data.content, "pdf");
    } catch (err: any) {
      Alert.alert("Upload failed", err?.message ?? "Couldn't read the file. Try again.");
    } finally {
      setScanning(false);
    }
  };

  const s = makeStyles(colors, insets, isWeb);

  const allMessages: ({ type: "msg"; data: Message; index: number } | { type: "streaming" })[] = [
    ...messages.map((m, i) => ({ type: "msg" as const, data: m, index: i })),
    ...(isStreaming ? [{ type: "streaming" as const }] : []),
  ];

  const renderMessage = ({ item }: { item: typeof allMessages[number] }) => {
    if (item.type === "streaming") {
      return (
        <View style={[s.bubble, s.assistantBubble]}>
          <Text style={s.bubbleText}>{streamingContent || "..."}</Text>
        </View>
      );
    }
    const { data: msg, index } = item;
    if (msg.role === "user") {
      return (
        <View style={[s.bubble, s.userBubble]}>
          <Text style={[s.bubbleText, s.userText]}>{msg.content}</Text>
        </View>
      );
    }

    const isLastAssistant = index === messages.length - 1;
    const prevMsg = messages[index - 1];
    const isExplain = prevMsg?.mode === "explain";
    const isDraft = prevMsg?.mode === "draft";
    const isAssignment = prevMsg?.mode === "assignment";

    return (
      <View style={s.assistantRow}>
        {isExplain && (
          <View style={s.wowBanner}>
            <Text style={s.wowBannerText}>⭐ Most students struggle with this — here's the simple version</Text>
          </View>
        )}
        <View style={[s.bubble, s.assistantBubble]}>
          <Text style={s.bubbleText}>{msg.content}</Text>
        </View>
        <TouchableOpacity
          style={s.copyBtn}
          onPress={async () => {
            await Clipboard.setStringAsync(msg.content);
            setCopiedIdx(index);
            setTimeout(() => setCopiedIdx(null), 2000);
          }}
        >
          <Feather name={copiedIdx === index ? "check" : "copy"} size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        {isLastAssistant && !isStreaming && (
          <View style={s.engagementChips}>
            {isDraft ? (
              <>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Rewrite this in a more casual, conversational tone — like texting a classmate", "draft")}>
                  <Text style={s.engChipText}>More casual</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Make this shorter — cut to 100 words or less, keep the main point", "draft")}>
                  <Text style={s.engChipText}>Shorter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Rewrite this in a more academic, formal tone suitable for a graded discussion board", "draft")}>
                  <Text style={s.engChipText}>More academic</Text>
                </TouchableOpacity>
              </>
            ) : isAssignment ? (
              <>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Simplify this even further — explain it like I'm a complete beginner", "assignment")}>
                  <Text style={s.engChipText}>Simplify more</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Make this shorter — give me just the essentials", "assignment")}>
                  <Text style={s.engChipText}>Make shorter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Now turn this outline into a full first draft I can submit", "draft")}>
                  <Text style={s.engChipText}>Turn into draft</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={launchQuiz}>
                  <Text style={s.engChipText}>Quiz me</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Simplify this even further — explain it like I'm a complete beginner", "explain")}>
                  <Text style={s.engChipText}>Simplify more</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Make this shorter, keep only the key ideas", "explain")}>
                  <Text style={s.engChipText}>Make shorter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={() => sendQuickFollowUp("Now turn this into a full discussion post draft I can submit", "draft")}>
                  <Text style={s.engChipText}>Turn into draft</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.engChip} onPress={launchQuiz}>
                  <Text style={s.engChipText}>Quiz me</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: isWeb ? 67 : insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{course?.name ?? "Course"}</Text>
          {course?.instructor ? <Text style={s.headerSub}>{course.instructor}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => setShowMaterials(true)} style={s.materialsBtn}>
          <Feather name="folder" size={20} color={colors.primary} />
          {(course?.materials?.length ?? 0) > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{course!.materials.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Mode Selector */}
      <View style={s.modeRow}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[s.modeChip, activeMode === m.id && s.modeChipActive]}
            onPress={() => { setActiveMode(m.id); Haptics.selectionAsync(); }}
          >
            <Feather name={m.icon as any} size={13} color={activeMode === m.id ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[s.modeLabel, activeMode === m.id && s.modeLabelActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={allMessages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={s.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={s.emptyChat}>
              <Feather name="zap" size={28} color={colors.primary} />
              <Text style={s.emptyChatTitle}>Ask anything about {course?.name ?? "this course"}</Text>
              <Text style={s.emptyChatSub}>Pick a mode above, then type your question</Text>
            </View>
          }
        />


        {suggestedMode && (
          <View style={s.suggestedBanner}>
            <Text style={s.suggestedText}>
              Looks like {suggestedMode === "draft" ? "a discussion prompt" : suggestedMode === "assignment" ? "an assignment" : "lecture notes"} —
            </Text>
            <TouchableOpacity onPress={() => { setActiveMode(suggestedMode); setSuggestedMode(null); }}>
              <Text style={s.suggestedAction}>
                Try {suggestedMode === "draft" ? "Draft" : suggestedMode === "assignment" ? "Assignment" : "Explain"} →
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSuggestedMode(null)} style={{ marginLeft: 4 }}>
              <Feather name="x" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, isWeb ? 34 : 8) + 8 }]}>
          <TextInput
            style={s.textInput}
            placeholder={`${activeMode === "explain" ? "What do you need explained?" : activeMode === "draft" ? "Paste your discussion prompt..." : "What's the assignment?"}`}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (text.trim().length > 50) {
                const lower = text.toLowerCase();
                const isDiscussion = /\b(discuss|discussion|post|respond|response|reply|classmate|board|forum|prompt)\b/.test(lower);
                const isAssignmentKw = /\b(assignment|essay|paper|write a|due|submit|rubric|outline|thesis|argument|analyze)\b/.test(lower);
                const isExplainKw = /\b(chapter|lecture|notes|textbook|concept|definition|theory|explains|means|define|module)\b/.test(lower);
                const detected: Mode | null = isDiscussion ? "draft" : isAssignmentKw ? "assignment" : isExplainKw ? "explain" : null;
                setSuggestedMode(detected !== activeMode ? detected : null);
              } else {
                setSuggestedMode(null);
              }
            }}
            multiline
            maxLength={2000}
            editable={canSend}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || isStreaming || !canSend) && { opacity: 0.4 }]}
            onPress={sendMessage}
            disabled={!input.trim() || isStreaming || !canSend}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Feather name="send" size={16} color={colors.primaryForeground} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Materials Modal */}
      <Modal visible={showMaterials} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowMaterials(false)}>
        <View style={[s.modal, { paddingTop: insets.top + 16 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Course Materials</Text>
            <TouchableOpacity onPress={() => setShowMaterials(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={course?.materials ?? []}
            keyExtractor={(m) => String(m.id)}
            renderItem={({ item }) => (
              <View style={s.materialRow}>
                <Feather name="file-text" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.materialTitle}>{item.title}</Text>
                  {item.summary ? (
                    <Text style={s.materialSummary}>{item.summary}</Text>
                  ) : (
                    <Text style={s.materialType}>{item.materialType}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => deleteMaterial.mutateAsync({ courseId, materialId: item.id }).then(() => queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) }))}>
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={s.emptyMat}>No materials yet</Text>}
            style={{ flex: 1 }}
          />

          {addingMaterial ? (
            <View style={s.addMatForm}>
              <TextInput style={s.input} placeholder="Title" placeholderTextColor={colors.mutedForeground} value={matTitle} onChangeText={setMatTitle} />
              <TextInput style={[s.input, { height: 100, marginTop: 8 }]} placeholder="Type or paste your notes here..." placeholderTextColor={colors.mutedForeground} value={matContent} onChangeText={setMatContent} multiline />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={[s.createBtn, { flex: 1, backgroundColor: colors.muted }]} onPress={() => { setAddingMaterial(false); setMatTitle(""); setMatContent(""); }}>
                  <Text style={[s.createBtnText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.createBtn, { flex: 2, opacity: (!matTitle.trim() || !matContent.trim()) ? 0.4 : 1 }]} onPress={handleAddMaterial} disabled={!matTitle.trim() || !matContent.trim()}>
                  <Text style={s.createBtnText}>Save material</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : scanning ? (
            <View style={s.scanningState}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={s.scanningText}>Processing your document…</Text>
            </View>
          ) : (
            <View style={s.addOptions}>
              {(course?.materials?.length ?? 0) > 0 && (
                <TouchableOpacity style={s.quizBtn} onPress={launchQuiz}>
                  <Feather name="zap" size={16} color="#7c3aed" />
                  <Text style={s.quizBtnText}>Quiz me on these materials</Text>
                  <Feather name="arrow-right" size={14} color="#7c3aed" />
                </TouchableOpacity>
              )}
              <Text style={s.addOptionsLabel}>Add material</Text>
              <View style={s.addOptionRow}>
                <TouchableOpacity style={s.addOptionBtn} onPress={handleScan}>
                  <View style={[s.addOptionIcon, { backgroundColor: "#527a6320" }]}>
                    <Feather name="camera" size={18} color={colors.primary} />
                  </View>
                  <Text style={s.addOptionTitle}>Scan</Text>
                  <Text style={s.addOptionSub}>Camera → text</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.addOptionBtn} onPress={handlePdfUpload}>
                  <View style={[s.addOptionIcon, { backgroundColor: "#dc262620" }]}>
                    <Feather name="file-text" size={18} color="#dc2626" />
                  </View>
                  <Text style={s.addOptionTitle}>PDF</Text>
                  <Text style={s.addOptionSub}>PDF / txt file</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.addOptionBtn} onPress={handleUpload}>
                  <View style={[s.addOptionIcon, { backgroundColor: "#c07d5c20" }]}>
                    <Feather name="image" size={18} color={colors.secondary} />
                  </View>
                  <Text style={s.addOptionTitle}>Photo</Text>
                  <Text style={s.addOptionSub}>Image → text</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.addOptionBtn} onPress={() => setAddingMaterial(true)}>
                  <View style={[s.addOptionIcon, { backgroundColor: "#2a211a15" }]}>
                    <Feather name="edit-3" size={18} color={colors.foreground} />
                  </View>
                  <Text style={s.addOptionTitle}>Paste</Text>
                  <Text style={s.addOptionSub}>Type or paste</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Quiz Modal */}
      <Modal visible={showQuiz} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowQuiz(false)}>
        <View style={[s.modal, { paddingTop: insets.top + 16 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Practice Quiz</Text>
            <TouchableOpacity onPress={() => setShowQuiz(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {quizLoading ? (
            <View style={s.quizCenter}>
              <ActivityIndicator color="#7c3aed" size="large" />
              <Text style={s.quizLoadingText}>Generating quiz from your materials…</Text>
            </View>
          ) : quizDone ? (
            <View style={s.quizCenter}>
              <Text style={s.quizDoneEmoji}>🎉</Text>
              <Text style={s.quizDoneScore}>{score} / {quizQuestions?.length ?? 0}</Text>
              <Text style={s.quizDoneLabel}>
                {score === quizQuestions?.length ? "Perfect score!" : score >= (quizQuestions?.length ?? 0) * 0.7 ? "Nice work!" : "Keep studying!"}
              </Text>
              <TouchableOpacity style={s.quizRetakeBtn} onPress={() => { setQuizIdx(0); setSelectedOption(null); setShowAnswer(false); setScore(0); setQuizDone(false); }}>
                <Text style={s.quizRetakeBtnText}>Retake quiz</Text>
              </TouchableOpacity>
            </View>
          ) : quizQuestions && quizQuestions.length > 0 ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 4 }} showsVerticalScrollIndicator={false}>
              <View style={s.quizProgress}>
                <View style={[s.quizProgressBar, { width: `${((quizIdx) / quizQuestions.length) * 100}%` as any }]} />
              </View>
              <Text style={s.quizCounter}>{quizIdx + 1} of {quizQuestions.length}</Text>
              <Text style={s.quizQuestion}>{quizQuestions[quizIdx].question}</Text>

              {quizQuestions[quizIdx].type === "mcq" ? (
                <View style={s.quizOptions}>
                  {(quizQuestions[quizIdx] as Extract<QuizQuestion, { type: "mcq" }>).options.map((opt, i) => {
                    const q = quizQuestions[quizIdx] as Extract<QuizQuestion, { type: "mcq" }>;
                    const isCorrect = i === q.answer;
                    const isSelected = i === selectedOption;
                    let bg = colors.card;
                    let border = colors.border;
                    if (showAnswer && isCorrect) { bg = "#dcfce7"; border = "#16a34a"; }
                    else if (showAnswer && isSelected && !isCorrect) { bg = "#fee2e2"; border = "#dc2626"; }
                    else if (isSelected) { bg = colors.muted; border = colors.primary; }
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[s.quizOption, { backgroundColor: bg, borderColor: border }]}
                        onPress={() => handleAnswerMCQ(i)}
                        disabled={showAnswer}
                      >
                        <View style={[s.quizOptionLetter, showAnswer && isCorrect && { backgroundColor: "#16a34a" }, showAnswer && isSelected && !isCorrect && { backgroundColor: "#dc2626" }]}>
                          <Text style={[s.quizOptionLetterText, (showAnswer && (isCorrect || isSelected)) && { color: "#fff" }]}>
                            {String.fromCharCode(65 + i)}
                          </Text>
                        </View>
                        <Text style={s.quizOptionText}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={s.shortAnswerCard}>
                  <Text style={s.shortAnswerLabel}>Model answer:</Text>
                  <Text style={s.shortAnswerText}>{(quizQuestions[quizIdx] as Extract<QuizQuestion, { type: "short" }>).answer}</Text>
                </View>
              )}

              {showAnswer && (
                <View style={s.explanationCard}>
                  <Text style={s.explanationLabel}>Explanation</Text>
                  <Text style={s.explanationText}>{quizQuestions[quizIdx].explanation}</Text>
                </View>
              )}

              {(showAnswer || quizQuestions[quizIdx].type === "short") && (
                <TouchableOpacity style={s.nextBtn} onPress={handleNextQuestion}>
                  <Text style={s.nextBtnText}>{quizIdx + 1 >= quizQuestions.length ? "See results" : "Next question"}</Text>
                  <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              )}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: "center", justifyContent: "center" },
    header: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 36, alignItems: "center" },
    headerCenter: { flex: 1, marginHorizontal: 8 },
    headerTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    materialsBtn: { width: 36, alignItems: "center", position: "relative" },
    badge: {
      position: "absolute", top: -4, right: -4,
      backgroundColor: colors.secondary, borderRadius: 8,
      minWidth: 16, height: 16, alignItems: "center", justifyContent: "center",
    },
    badgeText: { fontSize: 9, color: colors.secondaryForeground, fontWeight: "700" },
    modeRow: {
      flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10,
      backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modeChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 20, backgroundColor: colors.muted,
    },
    modeChipActive: { backgroundColor: colors.primary },
    modeLabel: { fontSize: 13, fontWeight: "500", color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    modeLabelActive: { color: colors.primaryForeground },
    chatList: { padding: 16, gap: 12, flexGrow: 1, paddingBottom: 8 },
    bubble: { maxWidth: "85%", borderRadius: 16, padding: 14 },
    userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary },
    assistantBubble: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    assistantRow: { alignSelf: "flex-start", maxWidth: "90%" },
    bubbleText: { fontSize: 15, lineHeight: 22, color: colors.cardForeground, fontFamily: "Inter_400Regular" },
    userText: { color: colors.primaryForeground },
    copyBtn: { alignSelf: "flex-start", marginTop: 4, padding: 4 },
    wowBanner: {
      backgroundColor: "#fef9c3", borderWidth: 1, borderColor: "#fde68a",
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6,
    },
    wowBannerText: { fontSize: 11, fontWeight: "600", color: "#92400e", fontFamily: "Inter_600SemiBold" },
    engagementChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    engChip: {
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card,
    },
    engChipText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    suggestedBanner: {
      flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap",
      marginHorizontal: 16, marginBottom: 6,
      backgroundColor: colors.muted, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    suggestedText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    suggestedAction: { fontSize: 12, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
    emptyChatTitle: { fontSize: 16, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingHorizontal: 20 },
    emptyChatSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    limitBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: colors.secondary, marginHorizontal: 16, marginBottom: 8,
      borderRadius: colors.radius, padding: 12,
    },
    limitBannerText: { fontSize: 13, color: colors.secondaryForeground, fontFamily: "Inter_500Medium" },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: 10,
      paddingHorizontal: 16, paddingTop: 8,
      borderTopWidth: 1, borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    textInput: {
      flex: 1, minHeight: 42, maxHeight: 120,
      borderWidth: 1, borderColor: colors.border, borderRadius: 21,
      paddingHorizontal: 16, paddingVertical: 10,
      fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular",
      backgroundColor: colors.card,
    },
    sendBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    modal: { flex: 1, backgroundColor: colors.background, padding: 24 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    materialRow: {
      flexDirection: "row", alignItems: "center",
      padding: 14, backgroundColor: colors.card,
      borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border,
      marginBottom: 8,
    },
    materialTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    materialType: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    materialSummary: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 17 },
    emptyMat: { textAlign: "center", color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 24 },
    addMatForm: { paddingTop: 16 },
    input: {
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 14, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.card, fontFamily: "Inter_400Regular",
    },
    createBtn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      padding: 14, alignItems: "center", marginTop: 12, flexDirection: "row", justifyContent: "center",
    },
    createBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    addOptions: { paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
    addOptionsLabel: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    addOptionRow: { flexDirection: "row", gap: 8 },
    addOptionBtn: {
      flex: 1, alignItems: "center", gap: 5,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, padding: 10,
    },
    addOptionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    addOptionTitle: { fontSize: 12, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    addOptionSub: { fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    scanningState: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    scanningText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    quizBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: "#7c3aed18", borderWidth: 1, borderColor: "#7c3aed40",
      borderRadius: colors.radius, padding: 14, marginBottom: 16,
    },
    quizBtnText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#7c3aed", fontFamily: "Inter_600SemiBold" },
    quizCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    quizLoadingText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    quizDoneEmoji: { fontSize: 48 },
    quizDoneScore: { fontSize: 48, fontWeight: "700", color: "#7c3aed", fontFamily: "Inter_700Bold" },
    quizDoneLabel: { fontSize: 18, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    quizRetakeBtn: {
      marginTop: 12, backgroundColor: "#7c3aed", borderRadius: colors.radius,
      paddingHorizontal: 24, paddingVertical: 14,
    },
    quizRetakeBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    quizProgress: {
      height: 4, backgroundColor: colors.muted, borderRadius: 2,
      marginBottom: 12, overflow: "hidden",
    },
    quizProgressBar: { height: 4, backgroundColor: "#7c3aed", borderRadius: 2 },
    quizCounter: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 8 },
    quizQuestion: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", lineHeight: 25, marginBottom: 20 },
    quizOptions: { gap: 10 },
    quizOption: {
      flexDirection: "row", alignItems: "center", gap: 12,
      borderWidth: 1.5, borderRadius: colors.radius, padding: 14,
    },
    quizOptionLetter: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
    },
    quizOptionLetterText: { fontSize: 12, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    quizOptionText: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    shortAnswerCard: {
      backgroundColor: "#7c3aed10", borderWidth: 1, borderColor: "#7c3aed30",
      borderRadius: colors.radius, padding: 16, marginTop: 8,
    },
    shortAnswerLabel: { fontSize: 11, fontWeight: "700", color: "#7c3aed", fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
    shortAnswerText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    explanationCard: {
      marginTop: 12, backgroundColor: colors.muted, borderRadius: colors.radius, padding: 14,
    },
    explanationLabel: { fontSize: 11, fontWeight: "700", color: colors.mutedForeground, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
    explanationText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 19 },
    nextBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: colors.radius,
      padding: 14, marginTop: 20, marginBottom: 16,
    },
    nextBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  });
}
