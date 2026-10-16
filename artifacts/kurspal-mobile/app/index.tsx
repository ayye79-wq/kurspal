import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/expo";

const ND = Platform.OS !== "web";
const IS_WEB = Platform.OS === "web";

const ACTIONS = [
  {
    icon: "zap" as const,
    color: "#a78bfa",
    bg: "#231f3e",
    darkBg: "#8860f7",
    label: "Explain something",
    sub: "Simple, clear breakdown",
    intent: "explain" as const,
  },
  {
    icon: "edit-2" as const,
    color: "#4ade80",
    bg: "#1a2e27",
    darkBg: "#16a34a",
    label: "Write my post",
    sub: "Sounds like you, not AI",
    intent: "write" as const,
  },
  {
    icon: "check-square" as const,
    color: "#fb923c",
    bg: "#2e2218",
    darkBg: "#ea6c20",
    label: "Start my assignment",
    sub: "From stuck → ready fast",
    intent: "assignment" as const,
  },
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(30)).current;
  const a0o = useRef(new Animated.Value(0)).current;
  const a0y = useRef(new Animated.Value(20)).current;
  const a1o = useRef(new Animated.Value(0)).current;
  const a1y = useRef(new Animated.Value(20)).current;
  const a2o = useRef(new Animated.Value(0)).current;
  const a2y = useRef(new Animated.Value(20)).current;
  const btno = useRef(new Animated.Value(0)).current;

  const cards = [
    { o: a0o, y: a0y },
    { o: a1o, y: a1y },
    { o: a2o, y: a2y },
  ];

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(tabs)/" as any);
      return;
    }
    startAnimations();
  }, [isLoaded, isSignedIn]);

  function startAnimations() {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: ND }),
      Animated.timing(heroSlide, { toValue: 0, duration: 500, useNativeDriver: ND }),
    ]).start(() => {
      Animated.stagger(
        90,
        cards.map(({ o, y }) =>
          Animated.parallel([
            Animated.timing(o, { toValue: 1, duration: 340, useNativeDriver: ND }),
            Animated.timing(y, { toValue: 0, duration: 340, useNativeDriver: ND }),
          ])
        )
      ).start(() => {
        Animated.timing(btno, { toValue: 1, duration: 300, useNativeDriver: ND }).start();
      });
    });
  }

  const handleStart = () => {
    router.push("/demo" as any);
  };

  const handleSignIn = () => {
    router.push("/(auth)/sign-in" as any);
  };

  const pt = IS_WEB ? 60 : insets.top + 16;
  const pb = IS_WEB ? 40 : insets.bottom + 24;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.container, { paddingTop: pt, paddingBottom: pb }]}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[s.hero, { opacity: heroOpacity, transform: [{ translateY: heroSlide }] }]}>
        <LinearGradient
          colors={["#7c5cfc", "#5037c8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.logoBox}
        >
          <Ionicons name="sparkles" size={36} color="#fff" />
        </LinearGradient>
        <View style={s.statusBadge}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>Your AI classmate is ready.</Text>
        </View>
        <Text style={s.headline}>What's stressing{"\n"}you out today?</Text>
        <Text style={s.subline}>Drop your prompt. Your AI classmate handles the rest.</Text>
      </Animated.View>

      <View style={s.cards}>
        {ACTIONS.map((action, i) => (
          <Animated.View
            key={action.label}
            style={{ opacity: cards[i].o, transform: [{ translateY: cards[i].y }] }}
          >
            <TouchableOpacity
              style={[s.card, { backgroundColor: action.bg }]}
              activeOpacity={0.85}
              onPress={() => router.push(`/demo?intent=${action.intent}` as any)}
            >
              <View style={[s.cardIcon, { backgroundColor: action.darkBg }]}>
                <Feather name={action.icon} size={20} color="#fff" />
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardLabel, { color: action.color }]}>{action.label}</Text>
                <Text style={s.cardSub}>{action.sub}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#56566e" />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[s.proofRow, { opacity: btno }]}>
        {["No fluff, just clarity", "Ready-to-use answers", "Sounds like you, not AI"].map((p) => (
          <View key={p} style={s.proofItem}>
            <Feather name="check" size={12} color="#8860f7" />
            <Text style={s.proofText}>{p}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[s.ctaWrap, { opacity: btno }]}>
        <TouchableOpacity style={s.primaryBtn} onPress={handleStart} activeOpacity={0.85}>
          <>
            <Ionicons name="sparkles" size={17} color="#fff" />
            <Text style={[s.primaryBtnText, { marginLeft: 8 }]}>Try Kurspal free — no sign up</Text>
          </>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
          <Text style={s.signInText}>Already have an account? <Text style={s.signInLink}>Sign in</Text></Text>
        </TouchableOpacity>
        <Text style={s.legal}>
          By continuing, you agree to our{" "}
          <Text style={s.legalLink} onPress={() => router.push("/legal?tab=terms")}>
            Terms of Service
          </Text>
          {" "}and{" "}
          <Text style={s.legalLink} onPress={() => router.push("/legal?tab=privacy")}>
            Privacy Policy
          </Text>
          .
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0d0e13" },
  container: { paddingHorizontal: 24, gap: 24 },
  hero: { alignItems: "center", paddingTop: 8, gap: 10 },
  logoBox: {
    width: 88, height: 88, borderRadius: 22, marginBottom: 4,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#8860f7", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 18, elevation: 10,
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1b2033", paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: "#242938",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#34c759" },
  statusText: { fontSize: 12, color: "#a0a4b8", fontFamily: "Inter_500Medium" },
  headline: {
    fontSize: 32, fontWeight: "800", color: "#e4e7f0",
    fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 40, letterSpacing: -0.5,
  },
  subline: { fontSize: 14, color: "#a0a4b8", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  cards: { gap: 12 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, gap: 14 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 2 },
  cardSub: { fontSize: 12, color: "#a0a4b8", fontFamily: "Inter_400Regular" },
  proofRow: { gap: 6 },
  proofItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  proofText: { fontSize: 12, color: "#a0a4b8", fontFamily: "Inter_400Regular" },
  ctaWrap: { gap: 12 },
  primaryBtn: {
    backgroundColor: "#8860f7", borderRadius: 14, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    shadowColor: "#8860f7", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  signInText: { textAlign: "center", fontSize: 13, color: "#a0a4b8", fontFamily: "Inter_400Regular" },
  signInLink: { color: "#a78bfa", fontFamily: "Inter_600SemiBold" },
  legal: { fontSize: 11, color: "#a0a4b8", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
  legalLink: { color: "#a78bfa", textDecorationLine: "underline", fontFamily: "Inter_400Regular" },
});
