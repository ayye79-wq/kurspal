import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

const CONSENT_KEY = "kurspal_ai_consent_v1";

export function AiConsentModal() {
  const colors = useColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  const handleAccept = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={["#7c5cfc", "#5037c8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.iconBox}
          >
            <Ionicons name="sparkles" size={24} color="#fff" />
          </LinearGradient>

          <Text style={[s.title, { color: colors.foreground }]}>AI-powered by Kurspal</Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Before we begin, here's what you should know about how the AI works.
          </Text>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            {[
              {
                icon: "cpu" as const,
                heading: "What the AI does",
                body: "Kurspal uses AI to help you understand prompts, write discussion posts, and get classmate replies — tailored to your course materials.",
              },
              {
                icon: "cloud" as const,
                heading: "Data sent to OpenAI",
                body: "Your prompts, course context, and writing samples are sent to OpenAI's API to generate responses. Do not include personal or sensitive information.",
              },
              {
                icon: "alert-triangle" as const,
                heading: "AI can make mistakes",
                body: "AI-generated content may contain errors or inaccuracies. Always review drafts against your course materials before submitting.",
              },
            ].map((item) => (
              <View key={item.heading} style={[s.row, { borderColor: colors.border }]}>
                <View style={[s.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
                  <Feather name={item.icon} size={15} color={colors.primary} />
                </View>
                <View style={s.rowText}>
                  <Text style={[s.rowHeading, { color: colors.foreground }]}>{item.heading}</Text>
                  <Text style={[s.rowBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[s.acceptBtn, { backgroundColor: colors.primary }]} onPress={handleAccept}>
            <Text style={[s.acceptBtnText, { color: colors.primaryForeground }]}>I understand — let's go</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.privacyLink}
            onPress={() => Linking.openURL("https://kurspal.app/privacy")}
          >
            <Text style={[s.privacyLinkText, { color: colors.mutedForeground }]}>
              View Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 4,
  },
  scroll: {
    width: "100%",
    maxHeight: 260,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: "flex-start",
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  rowText: { flex: 1 },
  rowHeading: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  rowBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  acceptBtn: {
    width: "100%",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  privacyLink: {
    paddingVertical: 4,
  },
  privacyLinkText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
});
