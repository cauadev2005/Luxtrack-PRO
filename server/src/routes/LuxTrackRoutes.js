import { authenticate } from "../middlewares/auth.js";
import { registerAnalyticsRoutes } from "./analyticsRoutes.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerCoreRoutes } from "./coreRoutes.js";
import { registerDriverRoutes } from "./driverRoutes.js";
import { registerOccurrenceRoutes } from "./occurrenceRoutes.js";
import { registerOrderRoutes } from "./orderRoutes.js";
import { registerProofRoutes } from "./proofRoutes.js";
import { registerRouteOptimizationRoutes } from "./routeOptimizationRoutes.js";

export class LuxTrackRoutes {
  constructor(app, upload, { broadcastLocations }) {
    this.app = app;
    this.upload = upload;
    this.broadcastLocations = broadcastLocations;
  }

  register() {
    registerAuthRoutes(this.app);
    this.app.use("/api", authenticate);
    registerCoreRoutes(this.app);
    registerDriverRoutes(this.app, { broadcastLocations: this.broadcastLocations });
    registerOrderRoutes(this.app);
    registerRouteOptimizationRoutes(this.app);
    registerAnalyticsRoutes(this.app);
    registerOccurrenceRoutes(this.app);
    registerProofRoutes(this.app, { upload: this.upload });
  }
}
