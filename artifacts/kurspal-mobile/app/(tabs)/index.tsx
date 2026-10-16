import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Platform,
  RefreshControl, ScrollView, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { fetch } from "expo/fetch";
import { API_BASE_URL } from "@/lib/config";
import { useColors } from "@/hooks/useColors";
import {
  useListCourses,
  useCreateCourse,
  useDeleteCourse,
  useAddCourseMaterial,
  useGetToneProfile,
  getGetCourseQueryKey,
  getGetToneProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const COURSE_COLORS = [
  "#527a63", "#c07d5c", "#6b7fa3", "#9b7ab0", "#7a9b6b", "#a07a6b",
];

const DEMO_COURSES = [
  { name: "Intro to Psychology", instructor: "Prof. Martinez", term: "Spring 2025", color: "#9b7ab0", materials: 3, discussions: 2 },
  { name: "Cybersecurity 101", instructor: "Prof. Chen", term: "Spring 2025", color: "#6b7fa3", materials: 5, discussions: 4 },
  { name: "Biology 201", instructor: "Prof. Williams", term: "Spring 2025", color: "#527a63", materials: 2, discussions: 1 },
];

const HERO_ACTIONS = [
  {
    id: "explain",
    icon: "zap" as const,
    label: "Explain something",
    sub: "Instant clarity on any concept",
    color: "#a78bfa",
  },
  {
    id: "draft",
    icon: "edit-2" as const,
    label: "Write my post",
    sub: "Write posts in your own voice",
    color: "#60a5fa",
  },
  {
    id: "assignment",
    icon: "check-square" as const,
    label: "Start my assignment",
    sub: "Turn prompts into a clear plan",
    color: "#34d399",
  },
];

export default function CoursesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  const { data: courses, isLoading, refetch, isRefetching } = useListCourses();
  const { data: toneProfile } = useGetToneProfile({ query: { retry: false, queryKey: getGetToneProfileQueryKey() } });
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const addMaterial = useAddCourseMaterial();

  const [showCreate, setShowCreate] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [term, setTerm] = useState("");
  const [pickedColor, setPickedColor] = useState(COURSE_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Course picker for hero actions
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Add syllabus bottom sheet
  const [addSheetCourseId, setAddSheetCourseId] = useState<number | null>(null);
  const [addSheetCourseName, setAddSheetCourseName] = useState("");
  const [showTextEntry, setShowTextEntry] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matContent, setMatContent] = useState("");
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleHeroAction = (actionId: string) => {
    Haptics.selectionAsync();
    if (!courses || courses.length === 0) {
      setShowCreate(true);
      return;
    }
    if (courses.length === 1) {
      router.push(`/course/${courses[0].id}?mode=${actionId}`);
      return;
    }
    setPendingAction(actionId);
    setShowPicker(true);
  };

  const handleCreate = async () => {
    if (!courseName.trim()) return;
    setCreating(true);
    try {
      await createCourse.mutateAsync({
        data: { name: courseName.trim(), instructor: instructor.trim() || null, term: term.trim() || null, color: pickedColor },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreate(false);
      setCourseName(""); setInstructor(""); setTerm("");
      refetch();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Course",
      `Remove "${name}"? This will delete all materials and discussions for this course. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCourse.mutateAsync({ id }).then(() => refetch()),
        },
      ]
    );
  };

  const openAddSheet = (courseId: number, courseName: string) => {
    Haptics.selectionAsync();
    setAddSheetCourseId(courseId);
    setAddSheetCourseName(courseName);
    setMatTitle("");
    setMatContent("");
  };

  const closeAddSheet = () => {
    setAddSheetCourseId(null);
    setShowTextEntry(false);
    setMatTitle("");
    setMatContent("");
  };

  const autoSaveMaterial = async (title: string, content: string, materialType: "pdf" | "notes") => {
    if (!addSheetCourseId) return;
    await addMaterial.mutateAsync({
      id: addSheetCourseId,
      data: { title, materialType, content },
    });
    queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(addSheetCourseId) });
    refetch();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveText = async () => {
    if (!matTitle.trim() || !matContent.trim()) return;
    setSavingMaterial(true);
    try {
      await autoSaveMaterial(matTitle.trim(), matContent.trim(), "notes");
      closeAddSheet();
    } finally {
      setSavingMaterial(false);
    }
  };

  const extractTextFromImage = async (base64: string, mimeType: string) => {
    const resp = await fetch(`${API_BASE_URL}/api/ai/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    });
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
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.85, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    setScanning(true);
    closeAddSheet();
    try {
      const text = await extractTextFromImage(result.assets[0].base64, "image/jpeg");
      await autoSaveMaterial("Scanned notes", text, "notes");
    } catch {
      Alert.alert("Scan failed", "Couldn't extract text from the image. Try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Photos access needed", "Allow photo library access in Settings to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85, base64: true });
    if (result.canceled || !result.assets[0]?.base64) return;
    setScanning(true);
    closeAddSheet();
    try {
      const text = await extractTextFromImage(result.assets[0].base64, "image/jpeg");
      await autoSaveMaterial("Uploaded notes", text, "notes");
    } catch {
      Alert.alert("Upload failed", "Couldn't extract text from the image. Try again.");
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
    closeAddSheet();
    try {
      const formData = new FormData();
      formData.append("file", { uri: asset.uri, type: asset.mimeType ?? "application/pdf", name: asset.name } as any);
      formData.append("title", title);
      formData.append("materialType", "pdf");
      const resp = await fetch(`${API_BASE_URL}/api/courses/${addSheetCourseId}/materials/upload`, {
        method: "POST",
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

  const ListHeader = () => (
    <>
      <View style={s.heroCard}>
        <View style={s.heroBadge}>
          <View style={s.heroDot} />
          <Text style={s.heroBadgeText}>Your AI classmate is ready.</Text>
        </View>
        <Text style={s.heroTitle}>What's stressing{"\n"}you out today?</Text>

        <View style={s.heroActions}>
          {HERO_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[s.heroBtn, { borderColor: action.color + "50" }]}
              onPress={() => handleHeroAction(action.id)}
              activeOpacity={0.8}
            >
              <View style={[s.heroBtnIconSmall, { backgroundColor: action.color + "20" }]}>
                <Feather name={action.icon} size={15} color={action.color} />
              </View>
              <View style={s.heroBtnText}>
                <Text style={s.heroBtnLabel}>{action.label}</Text>
                <Text style={s.heroBtnSub}>{action.sub}</Text>
              </View>
              <Feather name="chevron-right" size={15} color={action.color} style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(courses ?? []).length > 0 && !toneProfile?.toneSummary && (
        <TouchableOpacity style={s.voiceNudge} onPress={() => router.push("/voice")} activeOpacity={0.85}>
          <View style={s.voiceNudgeIcon}>
            <Feather name="mic" size={15} color="#a78bfa" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.voiceNudgeTitle}>Make drafts sound like you</Text>
            <Text style={s.voiceNudgeSub}>Takes 2 min — your AI classmate learns your voice</Text>
          </View>
          <Feather name="arrow-right" size={14} color="#a78bfa" />
        </TouchableOpacity>
      )}
    </>
  );

  const renderCourse = ({ item }: { item: any }) => {
    const accent = item.color || colors.primary;
    const materialCount = item.materialCount ?? 0;
    const assignmentCount = item.assignmentCount ?? 0;

    return (
      <View style={[s.card, { borderLeftColor: accent }]}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); router.push(`/course/${item.id}`); }}
          activeOpacity={0.9}
          style={s.cardTop}
        >
          <View style={s.cardInfo}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            <View style={s.cardMeta}>
              {item.instructor ? (
                <View style={s.cardMetaRow}>
                  <Feather name="user" size={12} color={colors.mutedForeground} />
                  <Text style={s.cardMetaText}>{item.instructor}</Text>
                </View>
              ) : null}
              {item.term ? (
                <View style={s.cardMetaRow}>
                  <Feather name="calendar" size={12} color={colors.mutedForeground} />
                  <Text style={s.cardMetaText}>{item.term}</Text>
                </View>
              ) : null}
            </View>
            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Feather name="book-open" size={11} color={colors.mutedForeground} />
                <Text style={s.statText}>{materialCount} note{materialCount !== 1 ? "s" : ""}</Text>
              </View>
              <View style={s.statChip}>
                <Feather name="message-circle" size={11} color={colors.mutedForeground} />
                <Text style={s.statText}>{assignmentCount} discussion{assignmentCount !== 1 ? "s" : ""}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => handleDelete(item.id, item.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </TouchableOpacity>

        {assignmentCount === 0 && (
          <View style={s.emptyStrip}>
            <Feather name="zap" size={11} color="#9d80ff" />
            <Text style={s.emptyStripText}>Your AI classmate is ready — drop your first question</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.askBtn, { borderColor: accent + "40", borderLeftColor: accent }]}
          onPress={() => { Haptics.selectionAsync(); router.push(`/course/${item.id}`); }}
          activeOpacity={0.85}
        >
          <Feather name="zap" size={15} color={accent} />
          <Text style={s.askBtnText}>{assignmentCount > 0 ? "Continue conversation" : "Ask Kurspal"}</Text>
          <Feather name="chevron-right" size={15} color={accent} style={{ marginLeft: "auto", opacity: 0.7 }} />
        </TouchableOpacity>

        <View style={s.pillRow}>
          <TouchableOpacity
            style={[s.pill, materialCount === 0 && { backgroundColor: "#2e2218", borderColor: "#ea6c20" }]}
            onPress={() => openAddSheet(item.id, item.name)}
          >
            <Feather name="upload" size={12} color={materialCount === 0 ? "#fb923c" : colors.mutedForeground} />
            <Text style={[s.pillText, materialCount === 0 && { color: "#fb923c" }]}>
              {materialCount === 0 ? "Add syllabus" : `${materialCount} material${materialCount !== 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.pill}
            onPress={() => { Haptics.selectionAsync(); router.push(`/course/${item.id}`); }}
          >
            <Feather name="edit-2" size={12} color={colors.mutedForeground} />
            <Text style={s.pillText}>New discussion</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <LinearGradient
            colors={["#7c5cfc", "#5037c8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.iconCircle}
          >
            <Ionicons name="sparkles" size={22} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={s.headerTitle}>Kurspal</Text>
            <Text style={s.headerSub}>Your courses</Text>
          </View>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { Haptics.selectionAsync(); setShowCreate(true); }}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {scanning && (
        <View style={s.scanningBanner}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={s.scanningText}>Extracting text…</Text>
        </View>
      )}

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={courses ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCourse}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyHeadline}>Here's what it looks like</Text>
              <Text style={s.emptySubline}>Add your first course and your AI classmate learns it.</Text>

              {DEMO_COURSES.map((demo) => (
                <TouchableOpacity
                  key={demo.name}
                  style={[s.card, { borderLeftColor: demo.color, opacity: 0.55 }]}
                  onPress={() => { Haptics.selectionAsync(); setShowCreate(true); }}
                  activeOpacity={0.9}
                >
                  <View style={s.cardTop}>
                    <View style={s.cardInfo}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={s.cardName}>{demo.name}</Text>
                        <View style={s.demoBadge}><Text style={s.demoBadgeText}>example</Text></View>
                      </View>
                      <View style={s.cardMeta}>
                        <View style={s.cardMetaRow}>
                          <Feather name="user" size={12} color={colors.mutedForeground} />
                          <Text style={s.cardMetaText}>{demo.instructor}</Text>
                        </View>
                        <View style={s.cardMetaRow}>
                          <Feather name="calendar" size={12} color={colors.mutedForeground} />
                          <Text style={s.cardMetaText}>{demo.term}</Text>
                        </View>
                      </View>
                      <View style={s.statsRow}>
                        <View style={s.statChip}>
                          <Feather name="book-open" size={11} color={colors.mutedForeground} />
                          <Text style={s.statText}>{demo.materials} notes</Text>
                        </View>
                        <View style={s.statChip}>
                          <Feather name="message-circle" size={11} color={colors.mutedForeground} />
                          <Text style={s.statText}>{demo.discussions} discussions</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={s.emptyCtaBtn} onPress={() => { Haptics.selectionAsync(); setShowCreate(true); }}>
                <Feather name="plus" size={17} color="#fff" />
                <Text style={s.emptyCtaBtnText}>Add your first course</Text>
              </TouchableOpacity>
              <Text style={s.emptyCtaSub}>Your AI classmate will learn your syllabus and write in your voice</Text>
            </View>
          }
        />
      )}

      {/* Course Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Pick a course</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(courses ?? []).map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  style={s.sheetItem}
                  onPress={() => {
                    setShowPicker(false);
                    router.push(`/course/${c.id}?mode=${pendingAction}`);
                  }}
                >
                  <View style={[s.sheetDot, { backgroundColor: c.color || colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetItemName}>{c.name}</Text>
                    {c.instructor ? <Text style={s.sheetItemMeta}>{c.instructor}</Text> : null}
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Syllabus Bottom Sheet */}
      <Modal
        visible={addSheetCourseId !== null && !showTextEntry}
        transparent
        animationType="slide"
        onRequestClose={closeAddSheet}
      >
        <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={closeAddSheet}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add to {addSheetCourseName}</Text>
            <Text style={s.sheetSub}>Give Kurspal your syllabus or notes so it can answer with course context.</Text>

            <TouchableOpacity style={s.uploadOption} onPress={() => setShowTextEntry(true)}>
              <View style={[s.uploadIconWrap, { backgroundColor: "#231f3e" }]}>
                <Feather name="file-text" size={20} color="#a78bfa" />
              </View>
              <View style={s.uploadOptionText}>
                <Text style={s.uploadOptionLabel}>Paste text</Text>
                <Text style={s.uploadOptionSub}>Paste your syllabus or any notes</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={s.uploadOption} onPress={handlePdfUpload}>
              <View style={[s.uploadIconWrap, { backgroundColor: "#1a2e27" }]}>
                <Feather name="upload" size={20} color="#4ade80" />
              </View>
              <View style={s.uploadOptionText}>
                <Text style={s.uploadOptionLabel}>Upload PDF or file</Text>
                <Text style={s.uploadOptionSub}>PDF, txt, or markdown</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={s.uploadOption} onPress={handleScan}>
              <View style={[s.uploadIconWrap, { backgroundColor: "#2e2218" }]}>
                <Feather name="camera" size={20} color="#fb923c" />
              </View>
              <View style={s.uploadOptionText}>
                <Text style={s.uploadOptionLabel}>Scan with camera</Text>
                <Text style={s.uploadOptionSub}>Photograph a page — AI extracts text</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={s.uploadOption} onPress={handleImageUpload}>
              <View style={[s.uploadIconWrap, { backgroundColor: "#1b2033" }]}>
                <Feather name="image" size={20} color="#60a5fa" />
              </View>
              <View style={s.uploadOptionText}>
                <Text style={s.uploadOptionLabel}>Pick from photos</Text>
                <Text style={s.uploadOptionSub}>Choose an image — AI extracts text</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Text Entry Sheet */}
      <Modal
        visible={showTextEntry}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTextEntry(false)}
      >
        <TouchableOpacity style={s.sheetOverlay} activeOpacity={1} onPress={() => setShowTextEntry(false)}>
          <View style={[s.sheet, s.textSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.textSheetHeader}>
              <TouchableOpacity onPress={() => setShowTextEntry(false)} style={s.backChevron}>
                <Feather name="chevron-left" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Paste text</Text>
              <View style={{ width: 28 }} />
            </View>

            <Text style={s.fieldLabel}>Title</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="e.g. Week 1 Syllabus"
              placeholderTextColor={colors.mutedForeground}
              value={matTitle}
              onChangeText={setMatTitle}
            />

            <Text style={s.fieldLabel}>Content</Text>
            <TextInput
              style={[s.fieldInput, s.fieldInputMulti]}
              placeholder="Paste your syllabus, lecture notes, or any course material here…"
              placeholderTextColor={colors.mutedForeground}
              value={matContent}
              onChangeText={setMatContent}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[s.saveBtn, (!matTitle.trim() || !matContent.trim() || savingMaterial) && { opacity: 0.45 }]}
              onPress={handleSaveText}
              disabled={!matTitle.trim() || !matContent.trim() || savingMaterial}
            >
              {savingMaterial
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveBtnText}>Save material</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Course Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={[s.modal, { paddingTop: insets.top + 16 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Course</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Course name *</Text>
          <TextInput style={s.input} placeholder="e.g. Introduction to Psychology" placeholderTextColor={colors.mutedForeground} value={courseName} onChangeText={setCourseName} autoFocus />

          <Text style={s.label}>Instructor</Text>
          <TextInput style={s.input} placeholder="Optional" placeholderTextColor={colors.mutedForeground} value={instructor} onChangeText={setInstructor} />

          <Text style={s.label}>Term</Text>
          <TextInput style={s.input} placeholder="e.g. Fall 2025" placeholderTextColor={colors.mutedForeground} value={term} onChangeText={setTerm} />

          <Text style={s.label}>Color</Text>
          <View style={s.colorRow}>
            {COURSE_COLORS.map((c) => (
              <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, pickedColor === c && s.colorDotSelected]} onPress={() => setPickedColor(c)} />
            ))}
          </View>

          <TouchableOpacity style={[s.createBtn, (!courseName.trim() || creating) && { opacity: 0.5 }]} onPress={handleCreate} disabled={!courseName.trim() || creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.createBtnText}>Add course</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: isWeb ? 67 : insets.top + 12,
      paddingBottom: 14,
      backgroundColor: colors.background,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconCircle: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 13, color: "#a8b0c4", fontFamily: "Inter_400Regular", marginTop: 2 },
    addBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },

    scanningBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    scanningText: { fontSize: 13, color: "#fff", fontFamily: "Inter_500Medium" },

    heroCard: {
      marginHorizontal: 16, marginTop: 16, marginBottom: 8,
      backgroundColor: "#1b2033",
      borderRadius: 18,
      padding: 18,
      gap: 14,
      borderWidth: 1,
      borderColor: "#242938",
    },
    heroBadge: { flexDirection: "row", alignItems: "center", gap: 7 },
    heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#34c759" },
    heroBadgeText: { fontSize: 12, color: "#a8b0c4", fontFamily: "Inter_500Medium" },
    heroTitle: { fontSize: 22, fontWeight: "800", color: "#e4e7f0", fontFamily: "Inter_700Bold", lineHeight: 29, letterSpacing: -0.3 },
    heroActions: { gap: 10 },
    heroBtn: {
      flexDirection: "row", alignItems: "center",
      borderRadius: 14, padding: 13, gap: 12,
      backgroundColor: "#161322",
      borderWidth: 1,
    },
    heroBtnIconSmall: {
      width: 32, height: 32, borderRadius: 9,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    heroBtnText: { flex: 1 },
    heroBtnLabel: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#e4e0f0" },
    heroBtnSub: { fontSize: 11, color: "#a8b0c4", fontFamily: "Inter_400Regular", marginTop: 1 },

    voiceNudge: {
      flexDirection: "row", alignItems: "center", gap: 12,
      marginHorizontal: 16, marginTop: 10, marginBottom: 4,
      backgroundColor: "#1e1a36", borderWidth: 1, borderColor: "#a78bfa30",
      borderRadius: 14, padding: 14,
    },
    voiceNudgeIcon: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: "#a78bfa18", alignItems: "center", justifyContent: "center",
    },
    voiceNudgeTitle: { fontSize: 14, fontWeight: "600", color: "#e4e0f0", fontFamily: "Inter_600SemiBold" },
    voiceNudgeSub: { fontSize: 11, color: "#a78bfa", fontFamily: "Inter_400Regular", marginTop: 2 },

    emptyWrap: { paddingHorizontal: 0, paddingTop: 8, gap: 12 },
    emptyHeadline: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 2 },
    emptySubline: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 4 },
    demoBadge: {
      backgroundColor: "#2a2340", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    },
    demoBadgeText: { fontSize: 10, color: "#a78bfa", fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
    emptyCtaBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: 14, height: 52,
      marginTop: 4,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
    },
    emptyCtaBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
    emptyCtaSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17, marginTop: 2, paddingHorizontal: 8 },

    list: { paddingBottom: isWeb ? 34 : insets.bottom + 90, gap: 14, paddingTop: 8, paddingHorizontal: 16 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderWidth: 1, borderColor: colors.border,
      overflow: "hidden",
    },
    cardTop: {
      flexDirection: "row", alignItems: "flex-start",
      padding: 16, paddingBottom: 12,
    },
    cardInfo: { flex: 1, gap: 6 },
    cardName: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    cardMeta: { flexDirection: "row", gap: 14 },
    cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    cardMetaText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    statsRow: { flexDirection: "row", gap: 10, marginTop: 2 },
    statChip: { flexDirection: "row", alignItems: "center", gap: 4 },
    statText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    deleteBtn: { padding: 4, marginLeft: 8 },

    emptyStrip: {
      flexDirection: "row", alignItems: "center", gap: 6,
      marginHorizontal: 12, marginBottom: 8,
      backgroundColor: "rgba(124, 92, 252, 0.08)",
      borderWidth: 1, borderColor: "rgba(124, 92, 252, 0.2)",
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    },
    emptyStripText: { fontSize: 11, color: "#a8b0c4", fontFamily: "Inter_400Regular", flex: 1 },

    askBtn: {
      flexDirection: "row", alignItems: "center",
      marginHorizontal: 12, marginTop: 0, marginBottom: 10,
      borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14,
      gap: 8,
      backgroundColor: "#13101c",
      borderWidth: 1,
      borderLeftWidth: 3,
    },
    askBtnText: { fontSize: 13, fontWeight: "600", color: "#d5d0e8", fontFamily: "Inter_600SemiBold", flex: 1 },

    pillRow: {
      flexDirection: "row", gap: 8,
      paddingHorizontal: 12, paddingBottom: 12,
    },
    pill: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: colors.muted,
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
      borderWidth: 1, borderColor: colors.border,
    },
    pillText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    // Shared sheet styles
    sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20,
      maxHeight: "85%",
    },
    textSheet: { maxHeight: "92%" },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 18 },
    sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 4 },
    sheetSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 20 },
    sheetItem: {
      flexDirection: "row", alignItems: "center", gap: 14,
      paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    sheetDot: { width: 12, height: 12, borderRadius: 6 },
    sheetItemName: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    sheetItemMeta: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },

    // Upload options
    uploadOption: {
      flexDirection: "row", alignItems: "center", gap: 14,
      paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    uploadIconWrap: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    uploadOptionText: { flex: 1 },
    uploadOptionLabel: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    uploadOptionSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },

    // Text entry
    textSheetHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginBottom: 20,
    },
    backChevron: { padding: 4 },
    fieldLabel: {
      fontSize: 12, fontWeight: "600", color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5,
      marginBottom: 6, marginTop: 12,
    },
    fieldInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: 10,
      padding: 12, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.background, fontFamily: "Inter_400Regular",
    },
    fieldInputMulti: { height: 140, marginBottom: 4 },
    saveBtn: {
      backgroundColor: colors.primary, borderRadius: 12,
      padding: 15, alignItems: "center", marginTop: 20,
    },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

    // Empty
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", paddingTop: 40, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },

    // Create modal
    modal: { flex: 1, backgroundColor: colors.background, padding: 24 },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    label: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
    input: {
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 14, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.card, fontFamily: "Inter_400Regular",
    },
    colorRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorDotSelected: { borderWidth: 3, borderColor: colors.foreground },
    createBtn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      padding: 16, alignItems: "center", marginTop: 32,
    },
    createBtnText: { color: "#fff", fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  });
}
