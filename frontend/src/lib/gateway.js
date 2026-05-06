const PROTOCOL_VERSION = 3;
const DEVICE_TOKEN_STORAGE_KEY = "openclaw-device-token";

function buildSessionKey(agentId = "main") {
  return `agent:${agentId}:main`;
}

function getStoredDeviceToken() {
  return window.localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
}

function setStoredDeviceToken(token) {
  if (token) {
    window.localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
  }
}

function translateToolEvent(payload = {}) {
  const raw = JSON.stringify(payload);
  const translations = [
    { pattern: /shell|terminal|bash|command/i, title: "Operational research", message: "Gathering and validating live operating data." },
    { pattern: /browser|navigate|click|scrape|search/i, title: "Market scan", message: "Reviewing external web sources for business signals." },
    { pattern: /spreadsheet|sheet|csv|excel/i, title: "Data review", message: "Inspecting business data and reconciling metrics." },
    { pattern: /database|mongo|sql|query/i, title: "Database analysis", message: "Reading internal records and comparing historical performance." },
    { pattern: /file|document|pdf|report/i, title: "Document review", message: "Reviewing supporting documents and extracting decision points." },
  ];

  const matched = translations.find((entry) => entry.pattern.test(raw));
  return matched || {
    title: "Specialist workflow",
    message: "Using connected tools to gather and validate business context.",
  };
}

function normalizeAgentEvent(payload = {}) {
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

function normalizeGatewayFrame(frame) {
  if (frame.type === "event" && frame.event === "agent") {
    return normalizeAgentEvent(frame.payload || {});
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

export class GatewayClient {
  constructor({ onStateChange, onEvent, onFrame } = {}) {
    this.ws = null;
    this.pending = new Map();
    this.connectRequestId = null;
    this.status = {
      phase: "idle",
      connected: false,
      url: null,
      hello: null,
      lastError: "",
    };
    this.onStateChange = onStateChange;
    this.onEvent = onEvent;
    this.onFrame = onFrame;
  }

  emitState(patch) {
    this.status = { ...this.status, ...patch };
    this.onStateChange?.(this.status);
  }

  connect({ url, token, scopes = ["operator.read", "operator.write"], clientId = "frontend-mvp" }) {
    if (!url || !token) {
      throw new Error("Gateway URL and token are required.");
    }

    this.disconnect();

    this.emitState({
      phase: "connecting",
      connected: false,
      url,
      hello: null,
      lastError: "",
    });

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.addEventListener("open", () => {
        this.emitState({ phase: "handshake", url });
      });

      ws.addEventListener("message", (event) => {
        let frame;

        try {
          frame = JSON.parse(event.data);
        } catch (_error) {
          this.emitState({
            phase: "error",
            connected: false,
            lastError: "Received invalid JSON from the gateway.",
          });
          return;
        }

        this.onFrame?.(frame);

        if (frame.type === "event" && frame.event === "connect.challenge") {
          this.connectRequestId = crypto.randomUUID();
          const deviceToken = getStoredDeviceToken();

          this.ws.send(
            JSON.stringify({
              type: "req",
              id: this.connectRequestId,
              method: "connect",
              params: {
                minProtocol: PROTOCOL_VERSION,
                maxProtocol: PROTOCOL_VERSION,
                client: {
                  id: clientId,
                  version: "mvp",
                  platform: navigator.platform || "web",
                  mode: "operator",
                },
                role: "operator",
                scopes,
                caps: [],
                commands: [],
                permissions: {},
                auth: deviceToken ? { token, deviceToken } : { token },
                locale: navigator.language || "en-US",
                userAgent: navigator.userAgent,
              },
            }),
          );
          return;
        }

        if (frame.type === "res") {
          const pending = this.pending.get(frame.id);
          if (pending) {
            this.pending.delete(frame.id);
            if (frame.ok) {
              pending.resolve(frame.payload);
            } else {
              pending.reject(new Error(frame.error?.message || "Gateway request failed."));
            }
          }

          if (frame.id === this.connectRequestId) {
            if (frame.ok && frame.payload?.type === "hello-ok") {
              const deviceToken = frame.payload.auth?.deviceToken;
              setStoredDeviceToken(deviceToken);
              this.emitState({
                phase: "connected",
                connected: true,
                hello: frame.payload,
                lastError: "",
              });
              resolve(frame.payload);
            } else {
              const error = new Error(frame.error?.message || "Gateway handshake failed.");
              this.emitState({
                phase: "error",
                connected: false,
                lastError: error.message,
              });
              reject(error);
            }
          }

          return;
        }

        const normalized = normalizeGatewayFrame(frame);
        if (normalized) {
          this.onEvent?.(normalized, frame);
        }
      });

      ws.addEventListener("close", (event) => {
        this.flushPending(new Error(`Gateway disconnected (${event.code}).`));
        this.emitState({
          phase: "closed",
          connected: false,
          hello: null,
        });
      });

      ws.addEventListener("error", () => {
        const error = new Error("Failed to connect to the gateway.");
        this.flushPending(error);
        this.emitState({
          phase: "error",
          connected: false,
          lastError: error.message,
        });
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.flushPending(new Error("Gateway connection closed."));
    this.emitState({
      phase: "idle",
      connected: false,
      hello: null,
    });
  }

  sendRequest(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Gateway is not connected."));
    }

    const id = crypto.randomUUID();
    const payload = {
      type: "req",
      id,
      method,
      params,
    };

    this.ws.send(JSON.stringify(payload));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  sendChat({ prompt, agentId = "main" }) {
    const sessionKey = buildSessionKey(agentId);

    return this.sendRequest("chat.send", {
      sessionKey,
      message: prompt,
      deliver: false,
      idempotencyKey: crypto.randomUUID(),
    }).then((payload) => ({
      ...payload,
      sessionKey,
      runId: payload?.runId || null,
    }));
  }

  flushPending(error) {
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export function getDefaultGatewayConfig() {
  return {
    url: import.meta.env.VITE_OPENCLAW_GATEWAY_URL || "",
    token: import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN || "",
    agentId: import.meta.env.VITE_OPENCLAW_AGENT_ID || "main",
  };
}

export function getGatewayStatusLabel(state) {
  if (!state.connected) {
    if (state.phase === "connecting" || state.phase === "handshake") {
      return "Connecting";
    }

    if (state.phase === "error") {
      return "Connection failed";
    }

    if (state.phase === "closed") {
      return "Disconnected";
    }

    return "Not connected";
  }

  return "Gateway connected";
}
