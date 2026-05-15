"use client";

import { useEffect, useRef, useCallback } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { useAuthStore } from "@/store/authStore";
import { getWsUrl } from "@/lib/api";
import type { WSMessage, AIRewriteResult, AIActivity } from "@/types/resume";

export function useResumeWebSocket(resumeId: string | null, onError?: (msg: string) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const {
    setAIStreaming, setPendingAIResult, appendGhostToken, clearGhostText,
    addActivity, setStreamingSection, appendSectionToken, commitSection, setActiveModel,
  } = useResumeStore();
  const { clearAuth } = useAuthStore();

  useEffect(() => {
    if (!resumeId) return;

    const ws = new WebSocket(getWsUrl(resumeId));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data as string);
      handleMessage(msg);
    };

    ws.onerror = () => console.error("[WS] connection error");

    ws.onclose = (event) => {
      // 4001 = invalid token (set by our backend), 1008 = policy violation (403)
      if (event.code === 4001 || event.code === 1008) {
        clearAuth();   // wipe stale token → page.tsx will show AuthModal
      }
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping", payload: {} }));
      }
    }, 30_000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  function handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case "ai_stream_start":
        setAIStreaming(true);
        clearGhostText();
        break;

      case "ai_activity": {
        const { node, message, model } = msg.payload as { node: AIActivity["node"]; message: string; model?: string };
        addActivity({ node, message });
        if (model) setActiveModel(model);
        break;
      }

      case "section_stream_start":
        setStreamingSection((msg.payload as { section: string }).section);
        break;

      case "section_token": {
        const { section, token } = msg.payload as { section: string; token: string };
        appendSectionToken(section, token);
        break;
      }

      case "section_done": {
        const { section, content } = msg.payload as { section: string; content: unknown };
        commitSection(section, content);
        break;
      }

      case "ai_suggestion":
        setAIStreaming(false);
        setPendingAIResult(msg.payload as AIRewriteResult);
        break;

      case "ghost_token":
        appendGhostToken((msg.payload as { token: string }).token);
        break;

      case "ai_cancelled":
        setAIStreaming(false);
        clearGhostText();
        break;

      case "ai_error":
        setAIStreaming(false);
        onErrorRef.current?.((msg.payload as { message: string }).message || "Unknown error");
        break;

      case "ghost_done":
      case "patch":
      case "pong":
        break;

      default:
        break;
    }
  }

  const sendPatch = useCallback((patch: unknown) => {
    wsRef.current?.send(JSON.stringify({ type: "patch", payload: patch }));
  }, []);

  const requestAI = useCallback(
    (rawText: string, jobDescription?: string, section?: string) => {
      wsRef.current?.send(
        JSON.stringify({
          type: "request_ai",
          payload: { raw_text: rawText, job_description: jobDescription, section },
        })
      );
    },
    []
  );

  const requestGhost = useCallback((context: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "request_ghost", payload: { context } })
    );
  }, []);

  const cancelAI = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "cancel_ai", payload: {} }));
  }, []);

  return { sendPatch, requestAI, requestGhost, cancelAI };
}
