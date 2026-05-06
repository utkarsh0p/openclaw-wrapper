import cors from "cors";
import express from "express";
import createError from "http-errors";

import { authRouter } from "./routes/authRoutes.js";
import { projectRouter } from "./routes/projectRoutes.js";
import { agentRouter } from "./routes/agentRoutes.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { resolveAllowedOrigins } from "./utils/allowedOrigins.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: resolveAllowedOrigins(),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use(requireAuth);
  app.use("/api/projects", projectRouter);
  app.use("/api/agent", agentRouter);

  app.use((_req, _res, next) => {
    next(createError(404, "Route not found"));
  });

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || "Internal server error",
    });
  });

  return app;
}
