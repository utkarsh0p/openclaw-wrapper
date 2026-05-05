import express from "express";
import createError from "http-errors";

import { AgentRun } from "../models/AgentRun.js";
import { AgentSession } from "../models/AgentSession.js";
import { CompanyProject } from "../models/CompanyProject.js";

export const projectRouter = express.Router();

projectRouter.get("/", async (_req, res, next) => {
  try {
    const projects = await CompanyProject.find().sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

projectRouter.post("/", async (req, res, next) => {
  try {
    const { name, ceoName, description } = req.body;

    if (!name || !ceoName) {
      throw createError(400, "name and ceoName are required");
    }

    const project = await CompanyProject.create({
      name,
      ceoName,
      description,
    });

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

projectRouter.get("/:projectId/runs", async (req, res, next) => {
  try {
    const project = await CompanyProject.findById(req.params.projectId);

    if (!project) {
      throw createError(404, "Project not found");
    }

    const [runs, sessions] = await Promise.all([
      AgentRun.find({ project: project._id }).sort({ createdAt: -1 }).limit(100),
      AgentSession.find({ project: project._id }).sort({ lastRunAt: -1, createdAt: -1 }).limit(50),
    ]);

    res.json({ project, runs, sessions });
  } catch (error) {
    next(error);
  }
});
