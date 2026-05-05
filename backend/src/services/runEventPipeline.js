import { AgentRun } from "../models/AgentRun.js";
import { AgentSession } from "../models/AgentSession.js";
import { CompanyProject } from "../models/CompanyProject.js";
import { getSocketServer } from "../socket/index.js";
import { gatewayManager } from "./GatewayManager.js";

function serializeRun(run) {
  return {
    id: run._id.toString(),
    project: run.project.toString(),
    agentId: run.agentId,
    sessionId: run.sessionId?.toString?.() || run.sessionId,
    sessionKey: run.sessionKey,
    openClawRunId: run.openClawRunId,
    prompt: run.prompt,
    status: run.status,
    finalSummary: run.finalSummary,
    businessReport: run.businessReport,
    liveEvents: run.liveEvents,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

function buildAssistantSummary(run) {
  return run.liveEvents
    .filter((event) => event.kind === "agent" && event.title === "OpenClaw reply")
    .map((event) => event.message)
    .join("")
    .trim();
}

async function appendEventToRun(normalized) {
  const query = normalized.runId
    ? { openClawRunId: normalized.runId }
    : normalized.sessionKey
      ? { sessionKey: normalized.sessionKey, status: { $in: ["queued", "thinking", "using_tools"] } }
      : { gatewayRequestId: normalized.requestId };

  const run = await AgentRun.findOne(query);

  if (!run) {
    return;
  }

  run.status = normalized.status;
  run.liveEvents.push({
    kind: normalized.category,
    status: normalized.status,
    rawType: normalized.rawType,
    title: normalized.title,
    message: normalized.message,
    payload: normalized.payload,
  });

  if (normalized.status === "completed") {
    run.completedAt = new Date();
    const summary = normalized.finalSummary || buildAssistantSummary(run) || normalized.message;
    run.finalSummary = summary;
    run.businessReport = summary;
    await CompanyProject.findByIdAndUpdate(run.project, {
      activeOpenClawRunId: null,
      lastReportAt: run.completedAt,
    });
  }

  if (normalized.status === "failed") {
    run.completedAt = new Date();
    await CompanyProject.findByIdAndUpdate(run.project, {
      activeOpenClawRunId: null,
    });
  }

  await run.save();
  await AgentSession.findByIdAndUpdate(run.sessionId, {
    lastRunAt: run.completedAt || run.updatedAt || new Date(),
  });

  const io = getSocketServer();
  const payload = {
    run: serializeRun(run),
    event: normalized,
  };

  io.to(`project:${run.project.toString()}`).emit("agent:event", payload);
  io.to(`run:${run._id.toString()}`).emit("agent:event", payload);
}

gatewayManager.on("gateway:event", (normalized) => {
  appendEventToRun(normalized).catch((error) => {
    console.error("failed to persist gateway event", error);
  });
});

gatewayManager.on("connected", () => {
  console.log("openclaw gateway connected");
});

gatewayManager.on("disconnected", ({ code, reason } = {}) => {
  console.warn(`openclaw gateway disconnected${code ? ` (${code})` : ""}${reason ? `: ${reason}` : ""}`);
});
