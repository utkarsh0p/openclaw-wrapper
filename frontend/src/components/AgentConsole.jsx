import React, { useEffect, useMemo, useRef, useState } from "react";

import { GatewayClient, getDefaultGatewayConfig, getGatewayStatusLabel } from "../lib/gateway.js";

const STATUS_STYLES = {
  idle: "bg-[#efe4ff] text-[#5a2490]",
  queued: "bg-[#d6f0ff] text-[#084f7a]",
  thinking: "bg-[#dfff8f] text-[#214900]",
  using_tools: "bg-[#ffd29f] text-[#7d3f00]",
  completed: "bg-[#d1ffd9] text-[#085b1e]",
  failed: "bg-[#ffd6dc] text-[#7c1027]",
};

function buildTimestampLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatusLabel(status) {
  if (!status) {
    return "Idle";
  }

  if (status === "using_tools") {
    return "Using tools";
  }

  return status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncate(text, max = 100) {
  if (!text) {
    return "";
  }

  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function AgentConsole() {
  const [config, setConfig] = useState(getDefaultGatewayConfig);
  const [gatewayState, setGatewayState] = useState({
    phase: "idle",
    connected: false,
    url: config.url || "",
    hello: null,
    lastError: "",
  });
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [rawEvents, setRawEvents] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeAssistantId, setActiveAssistantId] = useState(null);

  const clientRef = useRef(null);
  const runToMessageRef = useRef(new Map());
  const sessionToMessageRef = useRef(new Map());
  const activeAssistantIdRef = useRef(null);

  useEffect(() => {
    activeAssistantIdRef.current = activeAssistantId;
  }, [activeAssistantId]);

  if (!clientRef.current) {
    clientRef.current = new GatewayClient({
      onStateChange: setGatewayState,
      onFrame: (frame) => {
        setRawEvents((current) => [frame, ...current].slice(0, 12));
      },
      onEvent: (normalized) => {
        setMessages((current) => {
          const next = [...current];
          const messageId =
            (normalized.runId && runToMessageRef.current.get(normalized.runId)) ||
            (normalized.sessionKey && sessionToMessageRef.current.get(normalized.sessionKey)) ||
            activeAssistantIdRef.current;

          if (!messageId) {
            return current;
          }

          const index = next.findIndex((entry) => entry.id === messageId);
          if (index === -1) {
            return current;
          }

          const existing = next[index];
          const nextBody =
            normalized.title === "OpenClaw reply" && normalized.message
              ? `${existing.body}${normalized.message}`
              : existing.body || (normalized.status === "failed" ? normalized.message : "");

          next[index] = {
            ...existing,
            body: nextBody,
            status: normalized.status,
            runId: normalized.runId || existing.runId || null,
            sessionKey: normalized.sessionKey || existing.sessionKey || null,
            updatedAt: buildTimestampLabel(),
            events: [...existing.events, normalized].slice(-8),
          };

          if (normalized.runId) {
            runToMessageRef.current.set(normalized.runId, messageId);
          }

          return next;
        });
      },
    });
  }

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const connectionLabel = getGatewayStatusLabel(gatewayState);
  const latestAssistant = useMemo(
    () => [...messages].reverse().find((entry) => entry.role === "assistant") || null,
    [messages],
  );
  const latestStatus = latestAssistant?.status || "idle";

  async function handleConnect(event) {
    event.preventDefault();

    try {
      await clientRef.current.connect({
        url: config.url,
        token: config.token,
      });
    } catch (_error) {
      // state is already updated inside the client
    }
  }

  function handleDisconnect() {
    clientRef.current.disconnect();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!prompt.trim() || !gatewayState.connected) {
      return;
    }

    const sessionKey = `agent:${config.agentId || "main"}:main`;
    const assistantId = crypto.randomUUID();
    const nowLabel = buildTimestampLabel();

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        body: prompt.trim(),
        status: "completed",
        updatedAt: nowLabel,
        events: [],
      },
      {
        id: assistantId,
        role: "assistant",
        body: "",
        status: "queued",
        updatedAt: nowLabel,
        runId: null,
        sessionKey,
        events: [],
      },
    ]);

    sessionToMessageRef.current.set(sessionKey, assistantId);
    setActiveAssistantId(assistantId);
    setSubmitting(true);

    try {
      const dispatch = await clientRef.current.sendChat({
        prompt: prompt.trim(),
        agentId: config.agentId || "main",
      });

      if (dispatch.runId) {
        runToMessageRef.current.set(dispatch.runId, assistantId);
      }

      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId
            ? {
                ...entry,
                runId: dispatch.runId || entry.runId,
                sessionKey: dispatch.sessionKey || entry.sessionKey,
                updatedAt: buildTimestampLabel(),
              }
            : entry,
        ),
      );

      setPrompt("");
    } catch (error) {
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId
            ? {
                ...entry,
                body: error.message,
                status: "failed",
                updatedAt: buildTimestampLabel(),
              }
            : entry,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.25fr]">
        <div className="rounded-[2rem] bg-[#3d065f] p-6 text-white shadow-[0_30px_70px_rgba(61,6,95,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#d9b6ff]">Connection</p>
              <h2 className="mt-2 font-display text-4xl leading-none">Gateway Setup</h2>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${gatewayState.connected ? "bg-white text-[#3d065f]" : "bg-white/10 text-[#f7e9ff]"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${gatewayState.connected ? "bg-[#2eb84d]" : "bg-[#ffb75f]"}`} />
              <span>{connectionLabel}</span>
            </div>
          </div>

          <form onSubmit={handleConnect} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[#d9b6ff]">Gateway URL</label>
              <input
                type="text"
                value={config.url}
                onChange={(event) => setConfig((current) => ({ ...current, url: event.target.value }))}
                placeholder="ws://localhost:18789"
                className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-[#ffd29f]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[#d9b6ff]">Gateway Token</label>
              <input
                type="password"
                value={config.token}
                onChange={(event) => setConfig((current) => ({ ...current, token: event.target.value }))}
                placeholder="Required by the gateway"
                className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-[#ffd29f]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-[#d9b6ff]">Agent ID</label>
              <input
                type="text"
                value={config.agentId}
                onChange={(event) => setConfig((current) => ({ ...current, agentId: event.target.value }))}
                placeholder="main"
                className="mt-2 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-[#ffd29f]"
              />
            </div>

            {gatewayState.lastError ? (
              <div className="rounded-[1.2rem] bg-[#ffd6dc] px-4 py-3 text-sm text-[#7c1027]">
                {gatewayState.lastError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#181818]"
              >
                Connect
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/90 transition hover:bg-white/10"
              >
                Disconnect
              </button>
            </div>
          </form>

          <dl className="mt-6 grid gap-3 rounded-[1.6rem] bg-white/10 p-4 text-sm text-[#f7e9ff]">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-white/60">Protocol</dt>
              <dd>Gateway WS v3</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-white/60">Role</dt>
              <dd>operator</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-white/60">Session Key</dt>
              <dd className="max-w-[14rem] text-right break-all">{`agent:${config.agentId || "main"}:main`}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-white/60">Hello</dt>
              <dd>{gatewayState.hello ? "Received" : "Waiting"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[2rem] bg-[linear-gradient(180deg,_#083f38_0%,_#0f564d_100%)] p-6 text-white shadow-[0_30px_70px_rgba(8,63,56,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#b9f6ee]">Prompting</p>
              <h2 className="mt-2 font-display text-4xl leading-none">Plain User Flow</h2>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${STATUS_STYLES[latestStatus] || STATUS_STYLES.idle}`}>
              <span className="h-2.5 w-2.5 rounded-full bg-current" />
              <span>{formatStatusLabel(latestStatus)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 rounded-[1.8rem] bg-white/10 p-4">
            <label className="block text-xs uppercase tracking-[0.2em] text-[#c9fff7]">Message</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="Ask OpenClaw something through the VPS-hosted gateway..."
              className="mt-3 w-full rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-4 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-[#dfff8f]"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-xs leading-5 text-[#d6fff8]">
                This live MVP path avoids auth, employee roles, and backend-run project storage. It is only meant to prove direct frontend-to-gateway control.
              </p>
              <button
                type="submit"
                disabled={submitting || !prompt.trim() || !gatewayState.connected}
                className="rounded-full bg-[#dfff8f] px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#143214] transition hover:bg-[#efffc0] disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
              >
                {submitting ? "Sending" : "Send Prompt"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[2rem] bg-[linear-gradient(180deg,_#fff9f4_0%,_#fff1e3_100%)] p-6 shadow-[0_25px_60px_rgba(133,73,28,0.12)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#b86629]">Conversation</p>
              <h3 className="mt-2 font-display text-3xl leading-none text-[#3d065f]">Live Session</h3>
            </div>
            <span className="rounded-full bg-[#3d065f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              {messages.length ? `${messages.length} messages` : "Ready"}
            </span>
          </div>

          <div className="max-h-[40rem] space-y-4 overflow-y-auto pr-1">
            {messages.length > 0 ? (
              messages.map((entry) => (
                <article
                  key={entry.id}
                  className={`max-w-[88%] rounded-[1.8rem] px-4 py-4 shadow-sm ${
                    entry.role === "user"
                      ? "ml-auto bg-[#3d065f] text-white"
                      : "border border-[#f2d7bd] bg-white text-[#2d2338]"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
                      {entry.role === "user" ? "User" : "OpenClaw"}
                    </span>
                    <span className="text-[11px] opacity-70">{entry.updatedAt}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {entry.body || (entry.role === "assistant" ? "Waiting for OpenClaw..." : "")}
                  </p>

                  {entry.role === "assistant" && entry.events.length > 0 ? (
                    <div className="mt-4 space-y-2 border-t border-[#f2d7bd] pt-3">
                      {entry.events.slice(-3).map((event, index) => (
                        <div key={`${entry.id}-${event.rawType}-${index}`} className="rounded-[1.2rem] bg-[#fff6ec] px-3 py-2 text-xs text-[#6d4a54]">
                          <span className="font-semibold text-[#3d065f]">{event.title}:</span> {event.message}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-[#edc79d] bg-white/70 p-6 text-sm text-[#8b5e4e]">
                No prompt has been sent yet. Connect to the gateway and start the first plain-user interaction.
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[2rem] bg-[linear-gradient(180deg,_#d8b4ff_0%,_#f1d6ff_100%)] p-5 shadow-[0_25px_60px_rgba(90,36,144,0.12)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[#6d319f]">Current Focus</p>
            <h3 className="mt-2 font-display text-3xl leading-none text-[#3d065f]">Scope Guardrails</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5b3766]">
              <li>One plain user only.</li>
              <li>Direct frontend-to-gateway connection.</li>
              <li>No auth, no employee roles, no admin flows yet.</li>
              <li>No project creation or assignment layer in this live path.</li>
            </ul>
          </div>

          <div className="rounded-[2rem] bg-[linear-gradient(180deg,_#cfe6ff_0%,_#eef7ff_100%)] p-5 shadow-[0_25px_60px_rgba(8,79,122,0.12)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[#0d5b8f]">Gateway Frames</p>
            <h3 className="mt-2 font-display text-3xl leading-none text-[#154673]">Recent Events</h3>
            <div className="mt-4 space-y-3">
              {rawEvents.length > 0 ? (
                rawEvents.map((frame, index) => (
                  <article key={`${frame.type || "frame"}-${index}`} className="rounded-[1.3rem] bg-white/75 px-4 py-3 text-xs text-[#21506f]">
                    <p className="font-semibold uppercase tracking-[0.14em] text-[#0d5b8f]">
                      {frame.type === "event" ? frame.event : frame.type}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words leading-5">
                      {truncate(JSON.stringify(frame.payload || frame, null, 2), 220)}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.3rem] bg-white/75 px-4 py-3 text-xs text-[#21506f]">
                  No gateway frames captured yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
