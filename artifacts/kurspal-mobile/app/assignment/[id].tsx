import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useColors } from "@/hooks/useColors";
import {
  useGetAssignment,
  useDeleteAssignment,
  getGetAssignmentQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignmentId = parseInt(id ?? "0", 10);
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: assignment, isLoading } = useGetAssignment(assignmentId, {
    query: { enabled: !!assignmentId, queryKey: getGetAssignmentQueryKey(assignmentId) },
  });
  const deleteAssignment = useDeleteAssignment();

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      "Delete discussion?",
      "This will permanently remove this draft and can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteAssignment.mutate({ id: assignmentId }, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              },
            });
          },
        },
      ]
    );
  };

  const copyDraft = async (content: string, draftId: number) => {
    await Clipboard.setStringAsync(content);
    setCopiedId(draftId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const s = makeStyles(colors, insets, isWeb);

  if (isLoading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={[s.container, s.centered]}>
        <Text style={s.notFoundText}>Discussion not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: isWeb ? 34 : insets.bottom + 40 }}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: isWeb ? 67 : insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{assignment.title}</Text>
          {assignment.subject && (
            <Text style={s.headerSub}>{assignment.subject}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaChip}>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={s.metaText}>{format(new Date(assignment.createdAt), "MMM d, yyyy")}</Text>
          </View>
          {assignment.courseId && (
            <View style={s.metaChip}>
              <Feather name="book-open" size={12} color={colors.mutedForeground} />
              <Text style={s.metaText}>Course #{assignment.courseId}</Text>
            </View>
          )}
        </View>

        {/* Prompt (collapsible) */}
        {assignment.prompt ? (
          <View style={s.section}>
            <TouchableOpacity
              style={s.promptHeader}
              onPress={() => setPromptExpanded(!promptExpanded)}
            >
              <Text style={s.sectionLabel}>Original Prompt</Text>
              <Feather
                name={promptExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {promptExpanded && (
              <Text style={s.promptText}>{assignment.prompt}</Text>
            )}
          </View>
        ) : null}

        {/* Drafts */}
        {(assignment.drafts ?? []).length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionLabel}>
              {assignment.drafts!.length === 1 ? "Draft" : `${assignment.drafts!.length} Drafts`}
            </Text>
            {(assignment.drafts ?? []).map((draft, i) => (
              <View key={draft.id} style={s.draftCard}>
                {assignment.drafts!.length > 1 && (
                  <Text style={s.draftNumber}>Draft {i + 1}</Text>
                )}
                <Text style={s.draftContent}>{draft.content}</Text>
                <TouchableOpacity
                  style={s.copyBtn}
                  onPress={() => copyDraft(draft.content, draft.id)}
                >
                  <Feather
                    name={copiedId === draft.id ? "check" : "copy"}
                    size={14}
                    color={copiedId === draft.id ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[
                    s.copyBtnText,
                    copiedId === draft.id && { color: colors.primary },
                  ]}>
                    {copiedId === draft.id ? "Copied!" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.emptyDrafts}>
            <Feather name="file-text" size={28} color={colors.mutedForeground} />
            <Text style={s.emptyDraftsText}>No drafts saved yet</Text>
          </View>
        )}

        {/* Continue in workspace */}
        <TouchableOpacity
          style={s.continueBtn}
          onPress={() => router.push("/(tabs)/workspace")}
        >
          <Feather name="edit-3" size={16} color={colors.primary} />
          <Text style={s.continueBtnText}>Continue in Draft tab</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    deleteBtn: { width: 36, alignItems: "center" },
    content: { padding: 20, gap: 20 },
    metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    metaChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: colors.muted, borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    metaText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    section: { gap: 10 },
    promptHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: colors.mutedForeground,
      fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5,
    },
    promptText: {
      fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular",
      lineHeight: 21, backgroundColor: colors.muted, borderRadius: colors.radius,
      padding: 14,
    },
    draftCard: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, padding: 16,
    },
    draftNumber: {
      fontSize: 11, fontWeight: "700", color: colors.primary,
      fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
    },
    draftContent: {
      fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 23,
    },
    copyBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      alignSelf: "flex-end", marginTop: 12,
    },
    copyBtnText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyDrafts: { alignItems: "center", paddingVertical: 24, gap: 8 },
    emptyDraftsText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    continueBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      borderWidth: 1, borderColor: colors.primary, borderRadius: colors.radius,
      padding: 14,
    },
    continueBtnText: { fontSize: 15, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    notFoundText: { fontSize: 17, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
    backLink: { padding: 8 },
    backLinkText: { fontSize: 15, color: colors.primary, fontFamily: "Inter_400Regular" },
    destructive: { color: colors.destructive },
  });
}
