import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useListAssignments, useGetAssignmentStats } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";

export default function AssignmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();

  const { data: assignments, isLoading, refetch, isRefetching } = useListAssignments();
  const { data: stats } = useGetAssignmentStats();

  const s = makeStyles(colors, insets, isWeb);

  const STAT_CARDS = [
    { label: "Courses", value: stats?.totalCourses ?? 0, icon: "book-open", color: colors.primary, bg: `${colors.primary}15` },
    { label: "Discussions", value: stats?.totalAssignments ?? 0, icon: "file-text", color: colors.secondary, bg: `${colors.secondary}15` },
    { label: "Drafts", value: stats?.totalDrafts ?? 0, icon: "edit-3", color: "#7c3aed", bg: "#7c3aed15" },
  ];

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: isWeb ? 67 : insets.top + 12 }]}>
        <Text style={s.headerTitle}>Saved</Text>
        <Text style={s.headerSub}>Your discussions & drafts</Text>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={assignments ?? []}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View>
              {/* Stats cards */}
              <View style={s.statsRow}>
                {STAT_CARDS.map((card) => (
                  <View key={card.label} style={[s.statCard, { backgroundColor: card.bg }]}>
                    <View style={[s.statIcon, { backgroundColor: `${card.color}25` }]}>
                      <Feather name={card.icon as any} size={18} color={card.color} />
                    </View>
                    <Text style={[s.statValue, { color: card.color }]}>{card.value}</Text>
                    <Text style={s.statLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>

              {(assignments ?? []).length > 0 && (
                <Text style={s.sectionTitle}>History</Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/assignment/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={s.cardLeft}>
                <View style={s.iconCircle}>
                  <Feather name="file-text" size={15} color={colors.primary} />
                </View>
                <View style={s.cardText}>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.cardMeta}>
                    {item.subject ? (
                      <View style={s.subjectChip}>
                        <Text style={s.subjectChipText}>{item.subject}</Text>
                      </View>
                    ) : null}
                    <Text style={s.cardDate}>
                      {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="file-plus" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No saved discussions yet</Text>
              <Text style={s.emptyText}>Write a draft in the Draft tab and save it here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 20, paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 26, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 16, gap: 10, paddingBottom: isWeb ? 34 : insets.bottom + 80 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    statCard: {
      flex: 1, borderRadius: colors.radius, padding: 14,
      alignItems: "center", gap: 6,
    },
    statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    statValue: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" },
    sectionTitle: {
      fontSize: 18, fontWeight: "700", color: colors.foreground,
      fontFamily: "Inter_700Bold", marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border, padding: 14,
      flexDirection: "row", alignItems: "center", gap: 12,
    },
    cardLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
    iconCircle: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: `${colors.primary}15`,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
    cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    subjectChip: {
      backgroundColor: colors.muted, borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    subjectChipText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    cardDate: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    empty: { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.foreground, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
  });
}
