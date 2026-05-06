import express from "express";
import createError from "http-errors";
import { v4 as uuidv4 } from "uuid";

import { AgentRun } from "../models/AgentRun.js";
import { CompanyProject } from "../models/CompanyProject.js";
import { gatewayManager } from "../services/GatewayManager.js";
import "../services/runEventPipeline.js";

export const agentRouter = express.Router();

agentRouter.get("/status", async (_req, res) => {
  res.json({
    gateway: gatewayManager.getStatus(),
  });
});

agentRouter.post("/projects/:projectId/command", async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      throw createError(400, "prompt is required");
    }

    const project = await CompanyProject.findById(req.params.projectId);

    if (!project) {
      throw createError(404, "Project not found");
    }

    const gatewayRequestId = uuidv4();
    const openClawRunId = uuidv4();
    const run = await AgentRun.create({
      project: project._id,
      agentId: project.primaryAgentId,
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
        projectId: project._id.toString(),
        localRunId: run._id.toString(),
        requestId: gatewayRequestId,
        openClawRunId,
      });

      run.openClawRunId = dispatch.openClawRunId;
      await run.save();

      project.activeOpenClawRunId = dispatch.openClawRunId;
      await project.save();

      res.status(202).json({
        run,
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
