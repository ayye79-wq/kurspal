import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  useGetToneProfile,
  useSaveToneProfile,
  getGetToneProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function VoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetToneProfile({
    query: { retry: false, queryKey: getGetToneProfileQueryKey() },
  });
  const saveToneProfile = useSaveToneProfile();

  const [writingSample, setWritingSample] = useState("");

  useEffect(() => {
    if (profile?.writingSample) {
      setWritingSample(profile.writingSample);
    }
  }, [profile]);

  const wordCount = writingSample.trim().split(/\s+/).filter(Boolean).length;
  const hasEnoughWords = wordCount >= 150;
  const isChanged = writingSample !== (profile?.writingSample ?? "");

  const handleSave = async () => {
    if (!writingSample.trim() || !hasEnoughWords) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await saveToneProfile.mutateAsync({ data: { writingSample } });
      queryClient.invalidateQueries({ queryKey: getGetToneProfileQueryKey() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    }
  };

  const s = makeStyles(colors, insets, isWeb);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: isWeb ? 34 : insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: isWeb ? 67 : insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Your Voice</Text>
          <Text style={s.headerSub}>Makes drafts sound like you</Text>
        </View>
      </View>

      <View style={s.content}>

        {/* Intro */}
        <Text style={s.introText}>
          Paste something you've written. Kurspal will study how you phrase things, your sentence rhythm, your level of formality — and write drafts that sound like <Text style={s.introEm}>you</Text>, not AI.
        </Text>

        {/* Writing sample input */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Writing Sample</Text>
          <Text style={s.cardSub}>A discussion post, essay paragraph, or email — anything you wrote. Aim for 200+ words.</Text>

          <View style={{ position: "relative" }}>
            <TextInput
              style={s.sampleInput}
              placeholder="Paste your writing here…"
              placeholderTextColor={colors.mutedForeground}
              value={writingSample}
              onChangeText={setWritingSample}
              multiline
              textAlignVertical="top"
            />
            {writingSample.length > 0 && (
              <Text style={[s.wordCount, hasEnoughWords && { color: colors.primary }]}>
                {wordCount} {wordCount === 1 ? "word" : "words"}
                {!hasEnoughWords && wordCount > 0 ? ` — add ${150 - wordCount} more` : ""}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[s.analyzeBtn, (!writingSample.trim() || saveToneProfile.isPending || !isChanged || !hasEnoughWords) && { opacity: 0.4 }]}
            onPress={handleSave}
            disabled={!writingSample.trim() || saveToneProfile.isPending || !isChanged || !hasEnoughWords}
          >
            {saveToneProfile.isPending ? (
              <>
                <ActivityIndicator color={colors.primaryForeground} size="small" />
                <Text style={s.analyzeBtnText}>Analyzing…</Text>
              </>
            ) : (
              <>
                <Feather name="zap" size={16} color={colors.primaryForeground} />
                <Text style={s.analyzeBtnText}>
                  {profile?.toneSummary ? "Update Voice Profile" : "Analyze My Voice"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!hasEnoughWords && wordCount > 0 && (
            <View style={s.hintRow}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={s.hintText}>More text gives a more accurate profile.</Text>
            </View>
          )}
        </View>

        {/* Tone summary result */}
        {(profile?.toneSummary || saveToneProfile.isPending) && (
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <Feather name="star" size={16} color={colors.primary} />
              <Text style={s.resultTitle}>How your classmate sees your voice</Text>
            </View>

            {saveToneProfile.isPending ? (
              <View style={s.analyzingState}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={s.analyzingText}>Reading your vocabulary, pacing, and tone…</Text>
              </View>
            ) : (
              <>
                <Text style={s.summaryText}>{profile!.toneSummary}</Text>
                <View style={s.activeRow}>
                  <Feather name="check-circle" size={14} color={colors.primary} />
                  <Text style={s.activeText}>Active on all drafts across every course</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* How it works */}
        {!profile?.toneSummary && !saveToneProfile.isPending && (
          <View style={s.howItWorks}>
            <Text style={s.howTitle}>How this works</Text>
            <Text style={s.howSub}>Paste something you've already written — a discussion post, a paragraph from an essay, even a detailed email. Kurspal reads how you phrase things, your sentence rhythm, and builds a profile.</Text>
            {[
              { n: "1", text: "Paste 150+ words of your own writing above" },
              { n: "2", text: 'Tap "Analyze My Voice" — takes about 5 seconds' },
              { n: "3", text: "Every draft from now on will sound like you wrote it" },
            ].map(({ n, text }) => (
              <View key={n} style={s.howRow}>
                <View style={s.howNum}>
                  <Text style={s.howNumText}>{n}</Text>
                </View>
                <Text style={s.howRowText}>{text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 36, alignItems: "center" },
    headerCenter: { flex: 1, marginLeft: 8 },
    headerTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    content: { padding: 20, gap: 20 },
    introText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 21 },
    introEm: { fontFamily: "Inter_600SemiBold", color: colors.foreground },
    card: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, padding: 16, gap: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    cardSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 4 },
    sampleInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius,
      padding: 14, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.background, fontFamily: "Inter_400Regular",
      minHeight: 220, marginBottom: 8,
    },
    wordCount: {
      fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular",
      textAlign: "right", marginBottom: 8,
    },
    analyzeBtn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    analyzeBtnText: { color: colors.primaryForeground, fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
    hintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    hintText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    resultCard: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: `${colors.primary}40`,
      borderRadius: colors.radius, padding: 16, gap: 12,
    },
    resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    resultTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    analyzingState: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
    analyzingText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    summaryText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 21 },
    activeRow: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingTop: 12, borderTopWidth: 1, borderTopColor: `${colors.primary}25`,
    },
    activeText: { fontSize: 13, fontWeight: "600", color: colors.primary, fontFamily: "Inter_600SemiBold" },
    howItWorks: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, overflow: "hidden",
    },
    howTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", padding: 16, paddingBottom: 6 },
    howSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 19, paddingHorizontal: 16, paddingBottom: 12 },
    howRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      padding: 14, borderTopWidth: 1, borderTopColor: colors.border,
    },
    howNum: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center", justifyContent: "center",
    },
    howNumText: { fontSize: 12, fontWeight: "700", color: colors.primary, fontFamily: "Inter_700Bold" },
    howRowText: { flex: 1, fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
}
