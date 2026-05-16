import cors from "cors";
import express from "express";
import multer from "multer";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { startDriverLocationSimulator, startNotificationDispatcher } from "./jobs/runtimeJobs.js";
import { createLocationSocket } from "./realtime/locationSocket.js";
import { LuxTrackRoutes } from "./routes/LuxTrackRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../..");
const uploadDir = join(rootDir, "uploads");
const distDir = join(rootDir, "dist");
const PORT = Number(process.env.PORT || 4000);

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/locations" });
const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(uploadDir));

const { broadcastLocations, registerLocationSocket } = createLocationSocket(wss);

new LuxTrackRoutes(app, upload, { broadcastLocations }).register();
registerLocationSocket();
startDriverLocationSimulator(broadcastLocations);
startNotificationDispatcher();

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/.*/, (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`LuxTrack Pro API rodando em http://localhost:${PORT}`);
});
