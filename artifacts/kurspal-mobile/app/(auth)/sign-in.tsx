import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSignIn, useClerk } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isFetching = fetchStatus === "fetching";

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn.password({ emailAddress: email, password });
      if (signIn.status === "complete") {
        await setActive({ session: signIn.createdSessionId });
        router.replace("/(tabs)/" as any);
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } catch (e: any) {
      const msg =
        e?.errors?.[0]?.longMessage ??
        e?.errors?.[0]?.message ??
        e?.message ??
        "Sign-in failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !email || !password || loading || isFetching;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0d0e13" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.logoRow}>
          <LinearGradient colors={["#7c5cfc", "#5037c8"]} style={s.logo}>
            <Ionicons name="sparkles" size={28} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to continue studying</Text>

        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.fields.identifier && (
            <Text style={s.errorText}>{errors.fields.identifier.message}</Text>
          )}

          <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#6b7280"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={s.eyeBtn}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
          {errors.fields.password && (
            <Text style={s.errorText}>{errors.fields.password.message}</Text>
          )}
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.btn, isDisabled && s.btnDisabled]}
          onPress={handleSignIn}
          disabled={isDisabled}
          activeOpacity={0.85}
        >
          {loading || isFetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={s.footerLink}>Sign up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 8 },
  logoRow: { alignItems: "center", marginBottom: 16 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#e4e7f0",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#a0a4b8",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 12,
  },
  form: { gap: 4, marginTop: 8 },
  label: {
    fontSize: 13,
    color: "#c4c8d8",
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1e1b2e",
    borderWidth: 1,
    borderColor: "#2a2340",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#e4e7f0",
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginBottom: 4,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: { position: "absolute", right: 14, top: 14 },
  btn: {
    backgroundColor: "#7c5cfc",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#7c5cfc",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: {
    color: "#a0a4b8",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  footerLink: {
    color: "#a78bfa",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  errorText: {
    color: "#f87171",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
