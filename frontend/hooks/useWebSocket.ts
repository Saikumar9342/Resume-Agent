"use client";

import { useEffect, useRef, useCallback } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { useAuthStore } from "@/store/authStore";
import { getWsUrl } from "@/lib/api";
import type { WSMessage, AIRewriteResult, AIActivity } from "@/types/resume";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const PING_INTERVAL_MS = 30_000;

export function useResumeWebSocket(resumeId: string | null, onError?: (msg: string) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeIdRef = useRef(resumeId);
  resumeIdRef.current = resumeId;

  const {
    setAIStreaming, setPendingAIResult, appendGhostToken, clearGhostText,
    addActivity, setStreamingSection, appendSectionToken, commitSection, setActiveModel,
  } = useResumeStore();
  const { clearAuth } = useAuthStore();

  const disconnect = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent auth-clear on intentional close
      wsRef.current.close(1000, "idle");
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    const id = resumeIdRef.current;
    if (!id) return;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl(id));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data as string);
      handleMessage(msg);
    };

    ws.onerror = () => console.error("[WS] connection error");

    ws.onclose = (event) => {
      if (event.code === 4001 || event.code === 1008) {
        clearAuth();
      }
    };

    pingRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping", payload: {} }));
      }
    }, PING_INTERVAL_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset idle timer on any activity — called before every send
  const resetIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      disconnect();
    }, IDLE_TIMEOUT_MS);
  }, [disconnect]);

  // Ensure connected + reset idle, then run fn
  const withConnection = useCallback((fn: () => void) => {
    connect();
    // If ws just opened, wait for it
    const ws = wsRef.current!;
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.addEventListener("open", () => { resetIdle(); fn(); }, { once: true });
    } else {
      resetIdle();
      fn();
    }
  }, [connect, resetIdle]);

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

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!resumeId) return;
    connect();
    resetIdle();
    return () => disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const sendPatch = useCallback((patch: unknown) => {
    withConnection(() => {
      wsRef.current?.send(JSON.stringify({ type: "patch", payload: patch }));
    });
  }, [withConnection]);

  const requestAI = useCallback(
    (rawText: string, jobDescription?: string, section?: string) => {
      withConnection(() => {
        wsRef.current?.send(
          JSON.stringify({
            type: "request_ai",
            payload: { raw_text: rawText, job_description: jobDescription, section },
          })
        );
      });
    },
    [withConnection]
  );

  const requestGhost = useCallback((context: string) => {
    withConnection(() => {
      wsRef.current?.send(
        JSON.stringify({ type: "request_ghost", payload: { context } })
      );
    });
  }, [withConnection]);

  const cancelAI = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "cancel_ai", payload: {} }));
  }, []);

  return { sendPatch, requestAI, requestGhost, cancelAI };
}
