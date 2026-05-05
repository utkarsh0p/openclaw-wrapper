import React, { useEffect, useState } from "react";

import { AgentConsole } from "./components/AgentConsole.jsx";
import { api } from "./lib/api.js";

function getStoredToken() {
  return window.localStorage.getItem("executive-console-token");
}

async function authenticate(apiKey) {
  const response = await api.post("/auth/token", { apiKey });
  window.localStorage.setItem("executive-console-token", response.data.token);
  return response.data.token;
}

async function ensureProject() {
  const existing = await api.get("/projects");
  if (existing.data.projects.length > 0) {
    return existing.data.projects[0];
  }

  const created = await api.post("/projects", {
    name: "Executive Growth Office",
    ceoName: "CEO",
    description: "Primary command surface for strategic research, operating reviews, and report generation.",
  });

  return created.data.project;
}

export default function App() {
  const [project, setProject] = useState(null);
  const [runs, setRuns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(getStoredToken());
  const [accessKey, setAccessKey] = useState(import.meta.env.VITE_CEO_ACCESS_KEY || "");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        let activeToken = token;

        if (!activeToken && import.meta.env.VITE_CEO_ACCESS_KEY) {
          activeToken = await authenticate(import.meta.env.VITE_CEO_ACCESS_KEY);
          setToken(activeToken);
        }

        if (!activeToken) {
          setLoading(false);
          return;
        }

        const resolvedProject = await ensureProject();
        const projectId = resolvedProject._id || resolvedProject.id;
        const [runsResponse, statusResponse] = await Promise.all([
          api.get(`/projects/${projectId}/runs`),
          api.get("/agent/status"),
        ]);

        setGateway(statusResponse.data.gateway);
        setProject(runsResponse.data.project);
        setRuns(runsResponse.data.runs);
        setSessions(runsResponse.data.sessions || []);
      } finally {
        setLoading(false);
      }
    }

    load().catch(() => {
      setLoading(false);
    });
  }, [token]);

  async function handleAuthenticate(event) {
    event.preventDefault();
    setAuthError("");

    try {
      const nextToken = await authenticate(accessKey);
      setToken(nextToken);
      setLoading(true);
    } catch (_error) {
      setAuthError("Access key rejected.");
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <form onSubmit={handleAuthenticate} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-panel/85 p-8 shadow-neon backdrop-blur">
          <p className="text-xs uppercase tracking-[0.45em] text-sky-200/70">Private Access</p>
          <h1 className="mt-3 font-display text-4xl text-white">Executive Console</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Enter the CEO access key to receive a JWT and unlock the gateway-backed command surface.
          </p>
          <label className="mt-6 block text-sm font-medium text-slate-200">CEO Access Key</label>
          <input
            type="password"
            value={accessKey}
            onChange={(event) => setAccessKey(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-300"
            placeholder="Enter access key"
          />
          {authError ? <p className="mt-3 text-sm text-rose-300">{authError}</p> : null}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
          >
            Request JWT
          </button>
        </form>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="rounded-full border border-sky-200/20 bg-slate-900/70 px-5 py-3 text-sm text-sky-100 shadow-neon">
          Connecting to the executive console...
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12 text-center text-sm text-rose-200">
        Unable to initialize a company project.
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-ink sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.45em] text-sky-200/70">OpenClaw Local Chat</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">Gateway Chat MVP</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
            Simple chat surface over the local OpenClaw gateway. Messages route through the Node bridge, stream live activity, and keep run history in MongoDB.
          </p>
        </header>

        <AgentConsole project={project} initialRuns={runs} initialSessions={sessions} gateway={gateway} />
      </div>
    </main>
  );
}
