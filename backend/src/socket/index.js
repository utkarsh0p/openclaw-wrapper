import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { resolveAllowedOrigins } from "../utils/allowedOrigins.js";

let io;

export function initializeSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: resolveAllowedOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Missing socket token"));
    }

    try {
      socket.user = jwt.verify(token, process.env.APP_JWT_SECRET);
      return next();
    } catch (_error) {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("project:subscribe", (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on("run:subscribe", (runId) => {
      socket.join(`run:${runId}`);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) {
    throw new Error("Socket.io server has not been initialized");
  }

  return io;
}
