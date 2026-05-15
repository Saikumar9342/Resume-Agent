"use client";

import { useEffect, useRef, useCallback } from "react";
import { useResumeStore } from "@/store/resumeStore";
import type { WSMessage, AIRewriteResult, AIActivity } from "@/types/resume";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useResumeWebSocket(resumeId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const { setAIStreaming, setPendingAIResult, appendGhostToken, clearGhostText, addActivity } =
    useResumeStore();

  useEffect(() => {
    if (!resumeId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/resume/${resumeId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data as string);
      handleMessage(msg);
    };

    ws.onerror = () => console.error("[WS] connection error");
    ws.onclose = () => console.log("[WS] disconnected");

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
        const { node, message } = msg.payload as { node: AIActivity["node"]; message: string };
        addActivity({ node, message });
        break;
      }

      case "ai_suggestion":
        setAIStreaming(false);
        setPendingAIResult(msg.payload as AIRewriteResult);
        break;

      case "ghost_token":
        appendGhostToken((msg.payload as { token: string }).token);
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

  return { sendPatch, requestAI, requestGhost };
}
