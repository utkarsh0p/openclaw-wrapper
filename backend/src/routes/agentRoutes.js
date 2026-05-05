import express from "express";
import createError from "http-errors";
import { v4 as uuidv4 } from "uuid";

import { AgentRun } from "../models/AgentRun.js";
import { AgentSession } from "../models/AgentSession.js";
import { CompanyProject } from "../models/CompanyProject.js";
import { gatewayManager } from "../services/GatewayManager.js";
import "../services/runEventPipeline.js";

export const agentRouter = express.Router();

function buildSessionTitle(prompt) {
  return prompt.trim().slice(0, 48) || "New session";
}

async function ensureSession({ project, sessionId, prompt }) {
  if (sessionId) {
    const existingSession = await AgentSession.findOne({
      _id: sessionId,
      project: project._id,
    });

    if (!existingSession) {
      throw createError(404, "Session not found");
    }

    return existingSession;
  }

  const generatedSessionId = uuidv4();
  const sessionKey = gatewayManager.getSessionKey(project.primaryAgentId, generatedSessionId);

  return AgentSession.create({
    project: project._id,
    agentId: project.primaryAgentId,
    sessionKey,
    title: buildSessionTitle(prompt),
  });
}

agentRouter.get("/status", async (_req, res) => {
  res.json({
    gateway: gatewayManager.getStatus(),
  });
});

agentRouter.post("/projects/:projectId/sessions", async (req, res, next) => {
  try {
    const project = await CompanyProject.findById(req.params.projectId);

    if (!project) {
      throw createError(404, "Project not found");
    }

    const sessionToken = uuidv4();
    const session = await AgentSession.create({
      project: project._id,
      agentId: project.primaryAgentId,
      sessionKey: gatewayManager.getSessionKey(project.primaryAgentId, sessionToken),
      title: "New session",
    });

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

agentRouter.post("/projects/:projectId/command", async (req, res, next) => {
  try {
    const { prompt, sessionId } = req.body;

    if (!prompt) {
      throw createError(400, "prompt is required");
    }

    const project = await CompanyProject.findById(req.params.projectId);

    if (!project) {
      throw createError(404, "Project not found");
    }

    const session = await ensureSession({ project, sessionId, prompt });
    const gatewayRequestId = uuidv4();
    const openClawRunId = uuidv4();
    const run = await AgentRun.create({
      project: project._id,
      agentId: project.primaryAgentId,
      sessionId: session._id,
      sessionKey: session.sessionKey,
      gatewayRequestId,
      openClawRunId,
      prompt,
      liveEvents: [
        {
          kind: "system",
          status: "queued",
          rawType: "queued",
          title: "Task accepted",
          message: "Queued for OpenClaw execution.",
          payload: {},
        },
      ],
    });

    try {
      const dispatch = await gatewayManager.dispatchTask({
        agentId: project.primaryAgentId,
        prompt,
        sessionKey: session.sessionKey,
        projectId: project._id.toString(),
        localRunId: run._id.toString(),
        requestId: gatewayRequestId,
        openClawRunId,
      });

      run.openClawRunId = dispatch.openClawRunId;
      await run.save();
      session.lastRunAt = new Date();
      if (session.title === "New session") {
        session.title = buildSessionTitle(prompt);
      }
      await session.save();

      project.activeOpenClawRunId = dispatch.openClawRunId;
      await project.save();

      res.status(202).json({
        run,
        session,
        gateway: dispatch,
      });
    } catch (dispatchError) {
      run.status = "failed";
      run.completedAt = new Date();
      run.liveEvents.push({
        kind: "system",
        status: "failed",
        rawType: "error",
        title: "Dispatch failed",
        message: dispatchError.message,
        payload: {},
      });
      await run.save();
      throw dispatchError;
    }
  } catch (error) {
    next(error);
  }
});
