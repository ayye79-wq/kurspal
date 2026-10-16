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
import { useSignUp, useClerk } from "@clerk/expo";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { setActive } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const isFetching = fetchStatus === "fetching";

  const handleSignUp = async () => {
    setLoading(true);
    setGeneralError("");
    try {
      await (signUp as any).create({ emailAddress: email, password });
      await (signUp as any).prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (e: any) {
      const msg =
        e?.errors?.[0]?.longMessage ??
        e?.errors?.[0]?.message ??
        e?.message ??
        "Sign-up failed. Please try again.";
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setGeneralError("");
    try {
      const result = await (signUp as any).attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        if (returnTo === "paywall") {
          router.replace("/paywall" as any);
        } else {
          router.replace("/(tabs)" as any);
        }
      } else {
        setGeneralError("Verification failed. Please check the code and try again.");
      }
    } catch (e: any) {
      const msg =
        e?.errors?.[0]?.longMessage ??
        e?.errors?.[0]?.message ??
        "Verification failed.";
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View
        style={[
          s.container,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            flex: 1,
            backgroundColor: "#0d0e13",
          },
        ]}
      >
        <Text style={s.title}>Verify your email</Text>
        <Text style={s.subtitle}>We sent a 6-digit code to {email}</Text>

        <TextInput
          style={s.input}
          value={code}
          onChangeText={setCode}
          placeholder="6-digit code"
          placeholderTextColor="#6b7280"
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields.code && (
          <Text style={s.error}>{errors.fields.code.message}</Text>
        )}
        {generalError ? <Text style={s.error}>{generalError}</Text> : null}

        <TouchableOpacity
          style={[s.btn, (loading || isFetching) && s.btnDisabled]}
          onPress={handleVerify}
          disabled={loading || isFetching}
          activeOpacity={0.85}
        >
          {loading || isFetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>Verify & get started</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (signUp as any).prepareEmailAddressVerification({ strategy: "email_code" })}
          style={s.linkBtn}
        >
          <Text style={s.linkText}>Resend code</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

        <Text style={s.title}>Create your account</Text>
        <Text style={s.subtitle}>Your AI study companion awaits</Text>

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
          {errors.fields.emailAddress && (
            <Text style={s.error}>{errors.fields.emailAddress.message}</Text>
          )}

          <Text style={[s.label, { marginTop: 16 }]}>Password</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
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
            <Text style={s.error}>{errors.fields.password.message}</Text>
          )}
        </View>

        {generalError ? <Text style={s.error}>{generalError}</Text> : null}

        <TouchableOpacity
          style={[
            s.btn,
            (!email || !password || loading || isFetching) && s.btnDisabled,
          ]}
          onPress={handleSignUp}
          disabled={!email || !password || loading || isFetching}
          activeOpacity={0.85}
        >
          {loading || isFetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>Create account</Text>
          )}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={s.footerLink}>Sign in</Text>
          </Link>
        </View>

        <View nativeID="clerk-captcha" />
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
  linkBtn: { alignItems: "center", marginTop: 12 },
  linkText: { color: "#a78bfa", fontFamily: "Inter_500Medium", fontSize: 14 },
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
  error: {
    color: "#f87171",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
