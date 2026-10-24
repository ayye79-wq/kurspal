import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { useGetToneProfile, getGetToneProfileQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";
import { API_BASE_URL } from "@/lib/config";
import Constants from "expo-constants";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSubscribed, isLoading, restore, isRestoring } = useSubscription();
  const { signOut, isSignedIn, getToken } = useAuth();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const { data: toneProfile } = useGetToneProfile({
    query: { retry: false, queryKey: getGetToneProfileQueryKey() },
  });

  const s = makeStyles(colors, insets, isWeb);

  const handleRestore = async () => {
    try {
      await restore();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isSubscribed) {
        Alert.alert("Already active", "Your Kurspal Premium subscription is already active.");
      } else {
        Alert.alert("Restored", "Your purchases have been restored.");
      }
    } catch {
      Alert.alert("Nothing to restore", "No previous purchases were found for this account.");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/me`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await signOut().catch(() => {});
      router.replace("/(auth)/sign-in");
    } catch {
      Alert.alert("Couldn't delete account", "Please try again, or email admin@kurspal.com and we'll delete it for you.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account, courses, materials, assignments and voice profile. This can't be undone. Any App Store or Google Play subscription must be cancelled separately in your store settings.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteAccount },
      ],
    );
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: isWeb ? 34 : insets.bottom + 80 }}>
      <View style={[s.header, { paddingTop: isWeb ? 67 : insets.top + 12 }]}>
        <View style={s.headerTop}>
          <View style={s.avatarCircle}>
            <Feather name="user" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={s.headerTitle}>Your Account</Text>
            <Text style={s.headerSub}>Manage your subscription & preferences</Text>
          </View>
        </View>
      </View>

      {/* Subscription status */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Subscription</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : isSubscribed ? (
          <View style={s.proBadge}>
            <Feather name="star" size={16} color={colors.primaryForeground} />
            <Text style={s.proBadgeText}>Kurspal Premium — Active</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.upgradeCard}
            onPress={() => { Haptics.selectionAsync(); router.push("/paywall"); }}
            activeOpacity={0.85}
          >
            <View>
              <Text style={s.upgradeTitle}>Unlock Premium</Text>
              <Text style={s.upgradeSub}>Unlimited AI, all modes, no limits</Text>
            </View>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Voice profile */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Writing</Text>
        <TouchableOpacity
          style={s.row}
          onPress={() => { Haptics.selectionAsync(); router.push("/voice"); }}
        >
          <Feather name="mic" size={16} color={colors.foreground} />
          <View style={s.rowContent}>
            <Text style={s.rowText}>Your Voice</Text>
            <Text style={s.rowSub}>
              {toneProfile?.toneSummary
                ? "Voice profile set — drafts sound like you"
                : "Not set — drafts will sound generic"}
            </Text>
          </View>
          <View style={s.rowRight}>
            {toneProfile?.toneSummary ? (
              <View style={s.activeDot} />
            ) : null}
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Account</Text>
        <TouchableOpacity style={s.row} onPress={handleRestore} disabled={isRestoring}>
          <Feather name="refresh-cw" size={16} color={colors.foreground} />
          <View style={s.rowContent}>
            <Text style={s.rowText}>Restore purchases</Text>
          </View>
          {isRestoring
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
        </TouchableOpacity>
        {isSignedIn ? (
          <TouchableOpacity style={s.row} onPress={handleSignOut}>
            <Feather name="log-out" size={16} color="#dc2626" />
            <View style={s.rowContent}>
              <Text style={[s.rowText, { color: "#dc2626" }]}>Sign out</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        {isSignedIn ? (
          <TouchableOpacity style={s.row} onPress={handleDeleteAccount} disabled={isDeleting}>
            <Feather name="trash-2" size={16} color="#dc2626" />
            <View style={s.rowContent}>
              <Text style={[s.rowText, { color: "#dc2626" }]}>Delete account</Text>
              <Text style={s.rowSub}>Permanently remove your account and data</Text>
            </View>
            {isDeleting ? <ActivityIndicator size="small" color="#dc2626" /> : null}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.row} onPress={() => router.push("/(auth)/sign-in" as any)}>
            <Feather name="log-in" size={16} color={colors.foreground} />
            <View style={s.rowContent}>
              <Text style={s.rowText}>Sign in</Text>
              <Text style={s.rowSub}>Save your progress across devices</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Legal */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Legal</Text>
        <TouchableOpacity
          style={s.row}
          onPress={() => router.push("/legal?tab=privacy")}
        >
          <Feather name="shield" size={16} color={colors.foreground} />
          <View style={s.rowContent}>
            <Text style={s.rowText}>Privacy Policy</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.row}
          onPress={() => router.push("/legal?tab=terms")}
        >
          <Feather name="file-text" size={16} color={colors.foreground} />
          <View style={s.rowContent}>
            <Text style={s.rowText}>Terms of Service</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>About</Text>
        <View style={s.row}>
          <Feather name="info" size={16} color={colors.foreground} />
          <View style={s.rowContent}>
            <Text style={s.rowText}>Version {Constants.expoConfig?.version}</Text>
          </View>
        </View>
      </View>

    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 20, paddingBottom: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTop: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatarCircle: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: `${colors.primary}18`,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    section: { padding: 20, paddingBottom: 0 },
    sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.mutedForeground, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
    proBadge: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: colors.primary, borderRadius: colors.radius,
      padding: 16,
    },
    proBadgeText: { fontSize: 15, fontWeight: "600", color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
    upgradeCard: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: colors.secondary, borderRadius: colors.radius, padding: 16,
    },
    upgradeTitle: { fontSize: 16, fontWeight: "700", color: colors.secondaryForeground, fontFamily: "Inter_700Bold" },
    upgradeSub: { fontSize: 13, color: colors.secondaryForeground, fontFamily: "Inter_400Regular", marginTop: 2, opacity: 0.85 },
    row: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.card, borderRadius: colors.radius,
      borderWidth: 1, borderColor: colors.border,
      padding: 14, marginBottom: 10,
    },
    rowContent: { flex: 1 },
    rowText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular" },
    rowSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
    deleteRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingVertical: 14,
    },
    deleteText: { fontSize: 15, color: "#dc2626", fontFamily: "Inter_400Regular" },
    deleteNote: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2, paddingBottom: 20 },
  });
}
