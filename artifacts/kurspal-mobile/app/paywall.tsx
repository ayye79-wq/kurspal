import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, ScrollView, Alert, Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { useAuth } from "@clerk/expo";

const PERKS = [
  { icon: "zap", text: "Unlimited AI explains, drafts & assignment help" },
  { icon: "book-open", text: "All 3 modes — Explain, Draft, Assignment" },
  { icon: "layers", text: "Course materials context for smarter answers" },
  { icon: "refresh-cw", text: "Restore anytime, cancel anytime" },
];

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { offerings, isLoading, offeringsError, offeringsFetching, refetchOfferings, purchase, isPurchasing, restore, isRestoring } = useSubscription();
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [pendingPkg, setPendingPkg] = useState<any>(null);

  const currentOffering = offerings?.current;
  const allPackages = currentOffering?.availablePackages ?? [];
  const monthlyPkg = allPackages.find((p: any) => p.packageType === "MONTHLY") ?? allPackages[0];
  const annualPkg = allPackages.find((p: any) => p.packageType === "ANNUAL");

  const [selectedPkg, setSelectedPkg] = useState<"monthly" | "annual">("annual");
  const pkg = selectedPkg === "annual" && annualPkg ? annualPkg : monthlyPkg;

  const monthlyPrice: string = monthlyPkg?.product?.priceString ?? "$4.99";
  const annualPrice: string = annualPkg?.product?.priceString ?? "$39.99";
  const annualMonthly = annualPkg
    ? "$" + (annualPkg.product?.price / 12).toFixed(2)
    : "$3.33";

  const handlePurchase = () => {
    if (!pkg) return;
    if (!isSignedIn) {
      router.push("/(auth)/sign-up?returnTo=paywall" as any);
      return;
    }
    if (__DEV__) {
      setPendingPkg(pkg);
      setShowTestConfirm(true);
    } else {
      doPurchase(pkg);
    }
  };

  const doPurchase = async (p: any) => {
    try {
      await purchase(p);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert("Purchase failed", err?.message ?? "Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Restored", "Your purchases have been restored.");
      router.back();
    } catch {
      Alert.alert("Error", "Could not restore purchases.");
    }
  };

  const s = makeStyles(colors, insets, isWeb);

  return (
    <View style={s.container}>
      {/* Close button */}
      <TouchableOpacity style={[s.closeBtn, { top: isWeb ? 67 : insets.top + 12 }]} onPress={() => router.back()}>
        <Feather name="x" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.badge}>
            <Feather name="star" size={14} color={colors.secondaryForeground} />
            <Text style={s.badgeText}>KURSPAL PREMIUM</Text>
          </View>
          <Text style={s.heroTitle}>Stop staring at it.</Text>
          <Text style={s.heroSub}>Get from stuck to ready — unlimited, every course, every assignment.</Text>
        </View>

        {/* Perks */}
        <View style={s.perks}>
          {PERKS.map((p, i) => (
            <View key={i} style={s.perk}>
              <View style={s.perkIcon}>
                <Feather name={p.icon as any} size={15} color={colors.primary} />
              </View>
              <Text style={s.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>

        {/* Price CTA */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : offeringsError || !pkg ? (
          <View style={s.errorBox}>
            <View style={s.errorIcon}>
              <Feather name="wifi-off" size={22} color={colors.mutedForeground} />
            </View>
            <Text style={s.errorTitle}>Couldn't load plans</Text>
            <Text style={s.errorText}>
              We couldn't reach the {Platform.OS === "android" ? "Play Store" : "App Store"} to load subscription options. Check your connection and try again.
            </Text>
            <TouchableOpacity
              style={[s.retryBtn, offeringsFetching && { opacity: 0.7 }]}
              onPress={() => refetchOfferings()}
              disabled={offeringsFetching}
              activeOpacity={0.85}
            >
              {offeringsFetching ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="refresh-cw" size={15} color={colors.primaryForeground} />
                  <Text style={s.retryBtnText}>Try again</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <Text style={s.restoreBtnText}>Restore purchases</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.ctaBox}>
            {/* Plan toggle — only show if both plans exist */}
            {annualPkg && monthlyPkg && (
              <View style={s.toggle}>
                <TouchableOpacity
                  style={[s.toggleBtn, selectedPkg === "monthly" && s.toggleBtnActive]}
                  onPress={() => setSelectedPkg("monthly")}
                  activeOpacity={0.8}
                >
                  <Text style={[s.toggleBtnText, selectedPkg === "monthly" && s.toggleBtnTextActive]}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, selectedPkg === "annual" && s.toggleBtnActive]}
                  onPress={() => setSelectedPkg("annual")}
                  activeOpacity={0.8}
                >
                  <Text style={[s.toggleBtnText, selectedPkg === "annual" && s.toggleBtnTextActive]}>Annual</Text>
                  <View style={s.saveBadge}>
                    <Text style={s.saveBadgeText}>SAVE 33%</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Price display */}
            {selectedPkg === "annual" && annualPkg ? (
              <>
                <View style={s.priceRow}>
                  <Text style={s.price}>{annualPrice}</Text>
                  <Text style={s.period}>/year</Text>
                </View>
                <Text style={s.priceNote}>
                  {annualPrice}/year · subscription renews automatically unless cancelled at least 24 hours before the end of the current period · cancel anytime in your {Platform.OS === "android" ? "Google Play" : "App Store"} settings
                </Text>
              </>
            ) : (
              <>
                <View style={s.priceRow}>
                  <Text style={s.price}>{monthlyPrice}</Text>
                  <Text style={s.period}>/month</Text>
                </View>
                <Text style={s.priceNote}>
                  {monthlyPrice}/month · subscription renews automatically unless cancelled at least 24 hours before the end of the current period · cancel anytime in your {Platform.OS === "android" ? "Google Play" : "App Store"} settings
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[s.subscribeBtn, isPurchasing && { opacity: 0.6 }]}
              onPress={handlePurchase}
              disabled={isPurchasing || !pkg}
              activeOpacity={0.85}
            >
              {isPurchasing ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={s.subscribeBtnText}>Get Kurspal Premium</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <Text style={s.restoreBtnText}>Restore purchases</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Test mode confirm modal */}
      <Modal visible={showTestConfirm} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Test Purchase</Text>
            <Text style={s.confirmText}>This is a test store purchase. No real money will be charged. Proceed?</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: colors.muted }]} onPress={() => setShowTestConfirm(false)}>
                <Text style={[s.confirmBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowTestConfirm(false); doPurchase(pendingPkg); }}>
                <Text style={s.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any, insets: any, isWeb: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    closeBtn: {
      position: "absolute", right: 20, zIndex: 10,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
    },
    scroll: { padding: 24, paddingTop: isWeb ? 120 : insets.top + 60, paddingBottom: isWeb ? 34 : insets.bottom + 40 },
    hero: { alignItems: "center", marginBottom: 32 },
    badge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      backgroundColor: colors.secondary, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
    },
    badgeText: { fontSize: 11, fontWeight: "700", color: colors.secondaryForeground, fontFamily: "Inter_700Bold", letterSpacing: 1 },
    heroTitle: { fontSize: 32, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 12 },
    heroSub: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
    perks: { gap: 14, marginBottom: 32 },
    perk: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    perkIcon: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
    },
    perkText: { flex: 1, fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22, paddingTop: 5 },
    ctaBox: { alignItems: "center" },
    toggle: {
      flexDirection: "row", backgroundColor: colors.muted,
      borderRadius: colors.radius, padding: 4,
      marginBottom: 24, width: "100%",
    },
    toggleBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 10, borderRadius: colors.radius - 2,
    },
    toggleBtnActive: { backgroundColor: colors.card },
    toggleBtnText: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
    toggleBtnTextActive: { color: colors.foreground },
    saveBadge: {
      backgroundColor: colors.primary, borderRadius: 4,
      paddingHorizontal: 6, paddingVertical: 2,
    },
    saveBadgeText: { fontSize: 9, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 4 },
    price: { fontSize: 36, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    period: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    priceNote: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 24, textAlign: "center" },
    subscribeBtn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      paddingVertical: 18, paddingHorizontal: 40,
      width: "100%", alignItems: "center", marginBottom: 16,
    },
    subscribeBtnText: { fontSize: 17, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    restoreBtn: { padding: 8 },
    restoreBtnText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    errorBox: { alignItems: "center", paddingVertical: 24 },
    errorIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
      marginBottom: 16,
    },
    errorTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 8 },
    errorText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 8 },
    retryBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, borderRadius: colors.radius,
      paddingVertical: 16, paddingHorizontal: 40, width: "100%", marginBottom: 12,
    },
    retryBtnText: { fontSize: 16, fontWeight: "700", color: colors.primaryForeground, fontFamily: "Inter_700Bold" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
    confirmBox: {
      backgroundColor: colors.card, borderRadius: colors.radius,
      padding: 24, margin: 24, gap: 16,
    },
    confirmTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: "Inter_700Bold" },
    confirmText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    confirmBtns: { flexDirection: "row", gap: 12 },
    confirmBtn: { flex: 1, borderRadius: colors.radius, padding: 14, alignItems: "center" },
    confirmBtnText: { fontSize: 15, fontWeight: "600", color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
  });
}
