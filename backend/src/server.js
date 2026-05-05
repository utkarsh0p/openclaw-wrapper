import "dotenv/config";

import http from "node:http";

import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { initializeSocketServer } from "./socket/index.js";
import { gatewayManager } from "./services/GatewayManager.js";

const port = Number(process.env.PORT || 4000);
const app = createApp();
const server = http.createServer(app);

initializeSocketServer(server);

async function bootstrap() {
  await connectDatabase(process.env.MONGODB_URI);
  await gatewayManager.connect();

  server.listen(port, () => {
    console.log(`backend listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("fatal startup error", error);
  process.exit(1);
});

