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

  // Set once an emailed code is pending: "signin" when the student chose to sign in
  // by code (works for accounts made with Google), "verify" when Clerk asks for one
  // after the password (a new device, or two-step verification).
  const [codeMode, setCodeMode] = useState<"signin" | "verify" | null>(null);
  const needsCode = codeMode !== null;
  const [code, setCode] = useState("");

  // Clerk's sign-in methods return their error instead of throwing.
  const errorText = (e: any, fallback: string) =>
    e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? e?.longMessage ?? e?.message ?? fallback;

  const finish = async () => {
    await setActive({ session: signIn.createdSessionId });
    router.replace("/(tabs)/" as any);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: pwError } = await signIn.password({ emailAddress: email.trim(), password });
      if (pwError) {
        setError(errorText(pwError, "Wrong email or password."));
      } else if (signIn.status === "complete") {
        await finish();
      } else if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) setError(errorText(sendError, "Couldn't send the verification code."));
        else setCodeMode("verify");
      } else {
        setError(`Sign-in needs another step (${signIn.status}). Please try again or contact support.`);
      }
    } catch (e: any) {
      setError(errorText(e, "Sign-in failed. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleSendSignInCode = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: sendError } = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
      if (sendError) setError(errorText(sendError, "Couldn't send a sign-in code to that email."));
      else setCodeMode("signin");
    } catch (e: any) {
      setError(errorText(e, "Couldn't send a sign-in code. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: codeError } =
        codeMode === "signin"
          ? await signIn.emailCode.verifyCode({ code: code.trim() })
          : await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (codeError) setError(errorText(codeError, "That code didn't work. Check it and try again."));
      else if (signIn.status === "complete") await finish();
      else setError(`Sign-in needs another step (${signIn.status}). Please try again or contact support.`);
    } catch (e: any) {
      setError(errorText(e, "Couldn't verify the code. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = needsCode
    ? code.trim().length < 6 || loading || isFetching
    : !email || !password || loading || isFetching;

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

        <Text style={s.title}>{needsCode ? "Check your email" : "Welcome back"}</Text>
        <Text style={s.subtitle}>
          {needsCode ? `We sent a 6-digit code to ${email.trim()}` : "Sign in to continue studying"}
        </Text>

        {needsCode ? (
          <View style={s.form}>
            <Text style={s.label}>Verification code</Text>
            <TextInput
              style={s.input}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => { setCodeMode(null); setCode(""); setError(""); }}
              style={{ marginTop: 4 }}
            >
              <Text style={s.footerLink}>Use a different account</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.btn, isDisabled && s.btnDisabled]}
          onPress={needsCode ? handleVerifyCode : handleSignIn}
          disabled={isDisabled}
          activeOpacity={0.85}
        >
          {loading || isFetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>{needsCode ? "Verify and sign in" : "Sign in"}</Text>
          )}
        </TouchableOpacity>

        {!needsCode && (
          <TouchableOpacity
            onPress={handleSendSignInCode}
            disabled={!email.trim() || loading || isFetching}
            style={{ alignItems: "center", paddingVertical: 8, opacity: email.trim() ? 1 : 0.5 }}
          >
            <Text style={s.footerLink}>Forgot password or signed up with Google? Email me a code</Text>
          </TouchableOpacity>
        )}

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
