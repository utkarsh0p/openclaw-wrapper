import React from "react";

import { AgentConsole } from "./components/AgentConsole.jsx";

export default function App() {
  return (
    <main className="min-h-screen px-4 py-6 text-[#1c1230] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_35%),linear-gradient(135deg,_#fff7f1_0%,_#ffe3d1_38%,_#ffd1a8_100%)] px-6 py-8 shadow-[0_30px_80px_rgba(61,6,95,0.15)] sm:px-8 sm:py-10">
          <p className="text-xs uppercase tracking-[0.45em] text-[#7b4b29]">OpenClaw Wrapper MVP</p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.9] text-[#3d065f] sm:text-6xl">
            Direct gateway control in your own frontend.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#5e3c49] sm:text-base">
            This MVP keeps the scope narrow: one plain user, one frontend, one direct OpenClaw gateway connection. No auth flow, no employee roles, no agent management layer yet.
          </p>
        </header>

        <AgentConsole />
      </div>
    </main>
  );
}
