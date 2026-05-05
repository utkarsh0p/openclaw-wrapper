import { io } from "socket.io-client";

export function createSocket() {
  const token = window.localStorage.getItem("executive-console-token");

  return io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
    auth: {
      token,
    },
    transports: ["websocket"],
  });
}
