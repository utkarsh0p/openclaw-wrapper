import { translateToolEvent } from "./toolTranslation.js";

function normalizeAgentStream(payload) {
  const stream = payload.stream || "assistant";
  const data = payload.data || {};
  const runId = payload.runId || null;
  const sessionKey = payload.sessionKey || null;

  if (stream === "assistant") {
    return {
      category: "agent",
      rawType: "event:agent",
      runId,
      sessionKey,
      status: "thinking",
      title: "OpenClaw reply",
      message: data.delta || data.text || "",
      payload,
      finalSummary: data.text || "",
    };
  }

  if (stream === "thinking") {
    return {
      category: "agent",
      rawType: "event:agent",
      runId,
      sessionKey,
      status: "thinking",
      title: "Reasoning",
      message: data.delta || data.text || data.thinking || "Analyzing the request.",
      payload,
    };
  }

  if (stream === "tool") {
    const translated = translateToolEvent(data);
    return {
      category: "tool",
      rawType: "event:tool",
      runId,
      sessionKey,
      status: "using_tools",
      title: translated.title,
      message: translated.message,
      payload,
    };
  }

  if (stream === "lifecycle" && data.phase === "start") {
    return {
      category: "system",
      rawType: "event:lifecycle",
      runId,
      sessionKey,
      status: "thinking",
      title: "Run started",
      message: "OpenClaw accepted the message and started processing.",
      payload,
    };
  }

  if (stream === "lifecycle" && data.phase === "end") {
    return {
      category: "system",
      rawType: "event:lifecycle",
      runId,
      sessionKey,
      status: "completed",
      title: "Run completed",
      message: "OpenClaw finished the response.",
      payload,
    };
  }

  return {
    category: "system",
    rawType: `event:${stream}`,
    runId,
    sessionKey,
    status: "thinking",
    title: "Gateway event",
    message: JSON.stringify(data),
    payload,
  };
}

export function normalizeGatewayMessage(frame) {
  if (frame.type === "event" && frame.event === "agent") {
    return normalizeAgentStream(frame.payload || {});
  }

  if (frame.type === "event" && frame.event === "chat") {
    return {
      category: "system",
      rawType: "event:chat",
      runId: frame.payload?.runId || null,
      sessionKey: frame.payload?.sessionKey || null,
      status: "thinking",
      title: "Chat update",
      message: JSON.stringify(frame.payload || {}),
      payload: frame.payload || {},
    };
  }

  if (frame.type === "error") {
    return {
      category: "system",
      rawType: "error",
      runId: null,
      sessionKey: null,
      status: "failed",
      title: "Gateway error",
      message: frame.message || "Gateway error",
      payload: frame,
    };
  }

  return null;
}
