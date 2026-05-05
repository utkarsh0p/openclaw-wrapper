import EventEmitter from "node:events";

import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";

import { normalizeGatewayMessage } from "../utils/normalizeGatewayMessage.js";

class GatewayManager extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connected = false;
    this.hello = null;
    this.connectPromise = null;
    this.reconnectTimer = null;
    this.pending = new Map();
  }

  async connect() {
    if (this.connected && this.ws && this.hello) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const url = process.env.OPENCLAW_GATEWAY_URL;
    const token = process.env.OPENCLAW_GATEWAY_TOKEN;

    if (!url || !token) {
      throw new Error("OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN are required");
    }

    this.connectPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      let settled = false;

      ws.on("open", () => {
        this.connected = false;
        this.hello = null;
      });

      ws.on("message", (buffer) => {
        this.handleMessage(buffer.toString(), { token, resolve, reject, settledRef: () => settled, markSettled: () => { settled = true; } });
      });

      ws.on("close", (code, reasonBuffer) => {
        const reason = reasonBuffer.toString();
        this.connected = false;
        this.hello = null;
        this.connectPromise = null;
        this.flushPending(new Error(`gateway closed (${code}): ${reason}`));
        this.emit("disconnected", { code, reason });
        this.scheduleReconnect();
        if (!settled) {
          settled = true;
          reject(new Error(`gateway closed (${code}): ${reason}`));
        }
      });

      ws.on("error", (error) => {
        this.emit("error", error);
        if (!this.connected && !settled) {
          settled = true;
          this.connectPromise = null;
          reject(error);
        }
      });
    });

    return this.connectPromise;
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        console.error("gateway reconnect failed", error.message);
        this.scheduleReconnect();
      }
    }, 3000);
  }

  sendRequest(method, params = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("OpenClaw gateway is not connected");
    }

    const id = uuidv4();
    const frame = {
      type: "req",
      id,
      method,
      params,
    };

    this.ws.send(JSON.stringify(frame));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  sendRaw(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("OpenClaw gateway is not connected");
    }

    this.ws.send(JSON.stringify(payload));
  }

  getSessionKey(agentId = process.env.OPENCLAW_AGENT_ID || "main", sessionId = "main") {
    if (sessionId === "main") {
      return `agent:${agentId}:main`;
    }

    return `agent:${agentId}:web:channel:${sessionId}`;
  }

  async dispatchTask({ agentId, prompt, sessionKey, projectId, localRunId, requestId = uuidv4(), openClawRunId = uuidv4() }) {
    await this.connect();

    const response = await this.sendRequest("chat.send", {
      sessionKey,
      message: prompt,
      deliver: false,
      idempotencyKey: requestId,
    });

    return {
      requestId,
      openClawRunId: response.runId || openClawRunId,
      sessionKey,
      gatewayStatus: response.status || null,
    };
  }

  flushPending(error) {
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  async handleMessage(rawMessage, context = null) {
    let parsed;

    try {
      parsed = JSON.parse(rawMessage);
    } catch (error) {
      this.emit("error", new Error(`Invalid gateway JSON: ${rawMessage}`));
      return;
    }

    if (parsed.type === "event" && parsed.event === "connect.challenge" && context) {
      this.sendRaw({
        type: "req",
        id: uuidv4(),
        method: "connect",
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "gateway-client",
            version: "dev",
            platform: process.platform,
            mode: "backend",
          },
          role: "operator",
          scopes: ["operator.admin"],
          caps: [],
          auth: {
            token: context.token,
          },
        },
      });
      return;
    }

    if (parsed.type === "res") {
      const pending = this.pending.get(parsed.id);
      if (pending) {
        this.pending.delete(parsed.id);
        if (parsed.ok) {
          pending.resolve(parsed.payload);
        } else {
          pending.reject(new Error(parsed.error?.message || "Gateway request failed"));
        }
      }

      if (parsed.ok && parsed.payload?.type === "hello-ok" && context && !context.settledRef()) {
        this.connected = true;
        this.hello = parsed.payload;
        context.markSettled();
        this.emit("connected", parsed.payload);
        context.resolve(parsed.payload);
      }
      return;
    }

    const normalized = normalizeGatewayMessage(parsed);
    if (normalized) {
      this.emit("gateway:event", normalized, parsed);
    }
  }

  getStatus() {
    return {
      connected: this.connected,
      url: process.env.OPENCLAW_GATEWAY_URL || null,
      agentId: process.env.OPENCLAW_AGENT_ID || "main",
      sessionKey: this.getSessionKey(),
    };
  }
}

export const gatewayManager = new GatewayManager();
