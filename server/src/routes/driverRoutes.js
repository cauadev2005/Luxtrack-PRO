import { randomUUID } from "node:crypto";
import { db, nowIso } from "../data.js";
import { authorize } from "../middlewares/auth.js";
import { sameTenant, vehicleFor } from "../services/luxtrackService.js";

export function registerDriverRoutes(app, { broadcastLocations }) {
  app.get("/api/drivers", (req, res) => {
        const drivers = db.drivers
          .filter((driver) => sameTenant(driver, req.user))
          .map((driver) => ({
            ...driver,
            vehicle: vehicleFor(driver),
            todayStops: db.orders.filter(
              (order) =>
                order.driverId === driver.id &&
                !["DELIVERED", "FAILED", "CANCELED"].includes(order.status)
            ).length
          }));
        res.json({ drivers });
      });

  app.post("/api/drivers/:id/location", authorize("admin", "dispatcher", "driver"), (req, res) => {
        const driver = db.drivers.find(
          (item) => item.id === req.params.id && item.companyId === req.user.companyId
        );
        if (!driver) return res.status(404).json({ error: "Motorista nao encontrado" });
        if (req.user.role === "driver" && driver.id !== req.user.driverId) {
          return res.status(403).json({ error: "Motorista so pode enviar a propria posicao" });
        }

        const lat = Number(req.body.lat);
        const lng = Number(req.body.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: "Latitude e longitude invalidas" });
        }

        driver.currentPosition = {
          lat,
          lng,
          speed: Number(req.body.speed || 0),
          heading: Number(req.body.heading || 0)
        };
        driver.status = "online";
        driver.updatedAt = nowIso();
        db.gpsPositions.push({
          id: `gps-${randomUUID()}`,
          companyId: driver.companyId,
          driverId: driver.id,
          ...driver.currentPosition,
          recordedAt: driver.updatedAt
        });
        if (db.gpsPositions.length > 1000) db.gpsPositions.splice(0, db.gpsPositions.length - 1000);
        broadcastLocations();

        res.json({ driver });
      });
}
