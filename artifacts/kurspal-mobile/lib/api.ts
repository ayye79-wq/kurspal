import { Alert } from "react-native";
import { fetch } from "expo/fetch";
import type { Router } from "expo-router";
import { API_BASE_URL } from "@/lib/config";

type GetToken = () => Promise<string | null>;

// Thrown when a free account has used up today's AI requests (server answers 429).
export class AiLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiLimitError";
  }
}

// Native apps send no cookies, so every API call needs the Clerk session token.
export async function authHeaders(getToken: GetToken): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function postAi(path: string, body: object, getToken: GetToken) {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders(getToken)) },
    body: JSON.stringify(body),
  });
  if (resp.status === 429) {
    const data = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new AiLimitError(data.error ?? "You've used today's free AI requests.");
  }
  return resp;
}

export function showLimitAlert(err: AiLimitError, router: Router) {
  Alert.alert("Daily limit reached", err.message, [
    { text: "Not now", style: "cancel" },
    { text: "See Premium", onPress: () => router.push("/paywall") },
  ]);
}
