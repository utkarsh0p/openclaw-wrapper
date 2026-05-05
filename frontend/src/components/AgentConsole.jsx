import React, { useEffect, useMemo, useState } from "react";

import { api } from "../lib/api.js";
import { createSocket } from "../lib/socket.js";

const STATUS_STYLES = {
  idle: "bg-emerald-500 text-emerald-950",
  queued: "bg-cyan-400 text-cyan-950",
  thinking: "bg-sky-400 text-sky-950 animate-soft-pulse",
  using_tools: "bg-amber-300 text-amber-950",
  completed: "bg-emerald-500 text-emerald-950",
  failed: "bg-rose-500 text-rose-50",
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Live";
}

function formatStatusLabel(status) {
  if (status === "using_tools") {
    return "Using tools";
  }

  return status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferConsoleStatus(run) {
  if (!run) {
    return "idle";
  }

  return run.status || "idle";
}

function getRunId(run) {
  return run._id || run.id;
}

function getSessionId(run) {
  return run.sessionId || run.sessionKey || `legacy-${run.agentId || "main"}`;
}

function getSessionTitle(session) {
  return session.title || "New session";
}

function getTimestamp(value) {
  return value ? new Date(value).getTime() : 0;
}

function buildSessionMap(runs, sessions, project) {
  const map = new Map();

  (sessions || []).forEach((session) => {
    const sessionId = session._id || session.id;
    map.set(sessionId, {
      ...session,
      id: sessionId,
      runs: [],
    });
  });

  (runs || []).forEach((run) => {
    const sessionId = getSessionId(run);
    const existing = map.get(sessionId) || {
      id: sessionId,
      _id: run.sessionId || sessionId,
      agentId: run.agentId || project?.primaryAgentId || "main",
      sessionKey: run.sessionKey || null,
      title: run.prompt?.slice(0, 48) || "Imported session",
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      lastRunAt: run.updatedAt || run.createdAt,
      runs: [],
    };

    existing.runs.push(run);
    existing.lastRunAt = getTimestamp(existing.lastRunAt) > getTimestamp(run.updatedAt || run.createdAt)
      ? existing.lastRunAt
      : run.updatedAt || run.createdAt;
    map.set(sessionId, existing);
  });

  return Array.from(map.values())
    .map((session) => ({
      ...session,
      runs: session.runs.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }))
    .sort((a, b) => getTimestamp(b.lastRunAt || b.createdAt) - getTimestamp(a.lastRunAt || a.createdAt));
}

function buildConversation(session) {
  if (!session) {
    return [];
  }

  return session.runs.flatMap((run) => {
    const items = [
      {
        id: `${getRunId(run)}-user`,
        role: "user",
        body: run.prompt,
        meta: formatDate(run.createdAt),
      },
    ];

    const lastEvent = run.liveEvents?.[run.liveEvents.length - 1];
    const responseText =
      run.finalSummary ||
      run.businessReport ||
      (run.status === "failed" ? lastEvent?.message : "");

    if (responseText) {
      items.push({
        id: `${getRunId(run)}-assistant`,
        role: "assistant",
        body: responseText,
        meta: run.completedAt ? formatDate(run.completedAt) : formatStatusLabel(run.status || "idle"),
        status: run.status,
        events: run.liveEvents || [],
      });
    } else {
      items.push({
        id: `${getRunId(run)}-assistant-pending`,
        role: "assistant",
        body: "OpenClaw is processing this message.",
        meta: formatStatusLabel(run.status || "queued"),
        status: run.status,
        events: run.liveEvents || [],
      });
    }

    return items;
  });
}

export function AgentConsole({ project, initialRuns, initialSessions, gateway }) {
  const [prompt, setPrompt] = useState("");
  const [runs, setRuns] = useState(initialRuns || []);
  const [sessions, setSessions] = useState(initialSessions || []);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    setRuns(initialRuns || []);
  }, [initialRuns]);

  useEffect(() => {
    setSessions(initialSessions || []);
  }, [initialSessions]);

  const sessionList = useMemo(() => buildSessionMap(runs, sessions, project), [runs, sessions, project]);

  useEffect(() => {
    if (!sessionList.length) {
      setActiveSessionId(null);
      return;
    }

    if (!activeSessionId || !sessionList.find((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessionList[0].id);
    }
  }, [activeSessionId, sessionList]);

  useEffect(() => {
    if (!project?._id && !project?.id) {
      return undefined;
    }

    const projectId = project._id || project.id;
    const socket = createSocket();

    socket.emit("project:subscribe", projectId);

    socket.on("agent:event", ({ run }) => {
      setRuns((currentRuns) => {
        const nextRuns = [...currentRuns];
        const index = nextRuns.findIndex((entry) => getRunId(entry) === run.id);

        if (index >= 0) {
          nextRuns[index] = { ...nextRuns[index], ...run };
          return nextRuns;
        }

        return [run, ...nextRuns];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [project]);

  const activeSession = sessionList.find((session) => session.id === activeSessionId) || null;
  const activeRun = activeSession?.runs?.[activeSession.runs.length - 1] || null;
  const conversation = useMemo(() => buildConversation(activeSession), [activeSession]);
  const status = inferConsoleStatus(activeRun);

  async function handleCreateSession() {
    if (!project) {
      return;
    }

    setCreatingSession(true);

    try {
      const projectId = project._id || project.id;
      const response = await api.post(`/agent/projects/${projectId}/sessions`);
      const nextSession = response.data.session;

      setSessions((currentSessions) => [nextSession, ...currentSessions.filter((entry) => (entry._id || entry.id) !== (nextSession._id || nextSession.id))]);
      setActiveSessionId(nextSession._id || nextSession.id);
    } finally {
      setCreatingSession(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!prompt.trim() || !project) {
      return;
    }

    setSubmitting(true);

    try {
      const projectId = project._id || project.id;
      const response = await api.post(`/agent/projects/${projectId}/command`, {
        prompt,
        sessionId: activeSession?._id || activeSession?.id || null,
      });

      const createdRun = response.data.run;
      const updatedSession = response.data.session;

      setRuns((currentRuns) => [createdRun, ...currentRuns]);
      if (updatedSession) {
        setSessions((currentSessions) => [updatedSession, ...currentSessions.filter((entry) => (entry._id || entry.id) !== (updatedSession._id || updatedSession.id))]);
        setActiveSessionId(updatedSession._id || updatedSession.id);
      }
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-panel/80 p-6 shadow-neon backdrop-blur">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-sky-200/70">MVP Interface</p>
          <h2 className="font-display text-3xl text-white">Chat with OpenClaw</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Each session stays separate, keeps its own history, and routes to the matching OpenClaw agent thread.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold ${STATUS_STYLES[status]}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
            <span>{formatStatusLabel(status)}</span>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${gateway?.connected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}`}>
            <span className={`h-2 w-2 rounded-full ${gateway?.connected ? "bg-emerald-300" : "bg-rose-300"}`} />
            <span>{gateway?.connected ? "Gateway connected" : "Gateway disconnected"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.6fr_1.35fr_0.55fr]">
        <aside className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Sessions</h3>
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={creatingSession}
              className="rounded-full border border-sky-300/30 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingSession ? "Creating..." : "New session"}
            </button>
          </div>
          <div className="space-y-3">
            {sessionList.length > 0 ? (
              sessionList.map((session) => {
                const sessionRun = session.runs[session.runs.length - 1];
                const sessionStatus = sessionRun?.status || "idle";
                const selected = session.id === activeSessionId;

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setActiveSessionId(session.id)}
                    className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-sky-300/60 bg-sky-300/10" : "border-white/10 bg-slate-900/70 hover:border-white/20"}`}
                  >
                    <p className="text-sm font-medium text-slate-100">{getSessionTitle(session)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{formatDate(session.lastRunAt || session.createdAt)}</span>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[sessionStatus]}`}>{formatStatusLabel(sessionStatus)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{session.agentId || project.primaryAgentId || "main"}</p>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                No sessions yet. Create one and start chatting.
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{activeSession ? getSessionTitle(activeSession) : "Current session"}</h3>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {activeRun ? `Run ${activeRun.openClawRunId || "pending"}` : activeSession ? "Session ready" : "Ready"}
              </span>
            </div>
            <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-1">
              {conversation.length > 0 ? (
                conversation.map((entry) => (
                  <article key={entry.id} className={`max-w-[88%] rounded-3xl px-4 py-3 ${entry.role === "user" ? "ml-auto bg-sky-300 text-slate-950" : "border border-white/10 bg-slate-900/80 text-slate-100"}`}>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] opacity-70">{entry.role === "user" ? "You" : "OpenClaw"}</span>
                      <span className="text-xs opacity-70">{entry.meta}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{entry.body}</p>
                    {entry.role === "assistant" && entry.status && entry.status !== "completed" ? (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                        {(entry.events || []).slice(-3).map((event, index) => (
                          <div key={`${entry.id}-${event.rawType}-${index}`} className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                            <span className="font-semibold text-sky-100">{event.title}:</span> {event.message}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                  {activeSession ? "No messages in this session yet." : "No active session selected."}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <label className="mb-3 block text-sm font-medium text-slate-200">Message</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder={activeSession ? "Ask OpenClaw something..." : "Create or pick a session first..."}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300"
            />
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                {activeSession
                  ? `Messages in this thread go to ${activeSession.agentId || project.primaryAgentId || "main"} and stay in session history.`
                  : "Create a session to start a new OpenClaw thread."}
              </p>
              <button
                type="submit"
                disabled={submitting || !prompt.trim() || !gateway?.connected || !activeSession}
                className="rounded-full bg-sky-300 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {submitting ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <h3 className="text-lg font-semibold text-white">Current Session</h3>
            <dl className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-400">Project</dt>
                <dd className="text-right text-slate-100">{project.name}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-400">Agent</dt>
                <dd className="text-right text-slate-100">{activeSession?.agentId || project.primaryAgentId || "main"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-400">Session key</dt>
                <dd className="max-w-[12rem] break-all text-right text-slate-100">{activeSession?.sessionKey || "Not created yet"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-400">Gateway</dt>
                <dd className="text-right text-slate-100">{gateway?.url || "Unknown"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <h3 className="mb-4 text-lg font-semibold text-white">Session History</h3>
            <div className="space-y-3">
              {activeSession?.runs?.length ? (
                activeSession.runs
                  .slice()
                  .reverse()
                  .map((run) => {
                    const runStatus = run.status || "idle";

                    return (
                      <article key={getRunId(run)} className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                        <p className="text-sm font-medium text-slate-100">{run.prompt}</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-400">{formatDate(run.createdAt)}</span>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[runStatus]}`}>{formatStatusLabel(runStatus)}</span>
                        </div>
                      </article>
                    );
                  })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  No history in this session yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
