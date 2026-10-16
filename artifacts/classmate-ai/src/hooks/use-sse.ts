import { useState, useCallback, useRef } from "react";

export class DailyLimitError extends Error {
  constructor() {
    super("DAILY_LIMIT_REACHED");
    this.name = "DailyLimitError";
  }
}

export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (url: string, body: any) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsStreaming(true);
    setContent("");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      if (response.status === 429) throw new DailyLimitError();
      if (response.status === 401) throw new Error("UNAUTHENTICATED");
      if (!response.ok) throw new Error("Stream failed");
      if (!response.body) throw new Error("No body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.done) break;
              if (data.content) {
                fullContent += data.content;
                setContent(fullContent);
              }
            } catch (e) {
              console.error("Failed to parse SSE data", e);
            }
          }
        }
      }
      return fullContent;
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("SSE error", e);
      }
      throw e;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { stream, stop, isStreaming, content };
}
