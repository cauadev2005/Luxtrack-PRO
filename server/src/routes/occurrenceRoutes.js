import { randomUUID } from "node:crypto";
import { STATUS_FLOW, db, nowIso } from "../data.js";
import { authorize } from "../middlewares/auth.js";
import { findOrderForUser, publicOrder, transitionOrder } from "../services/luxtrackService.js";

export function registerOccurrenceRoutes(app) {
  app.post("/api/occurrences", authorize("admin", "dispatcher", "driver"), (req, res) => {
        const order = findOrderForUser(req.body.orderId, req.user);
        if (!order) return res.status(404).json({ error: "Pedido nao encontrado" });

        const occurrence = {
          id: `occ-${randomUUID()}`,
          companyId: order.companyId,
          orderId: order.id,
          driverId: req.user.role === "driver" ? req.user.driverId : req.body.driverId || order.driverId,
          type: req.body.type || "Ocorrencia",
          note: req.body.note || "",
          lat: req.body.lat || order.deliveryCoordinates.lat,
          lng: req.body.lng || order.deliveryCoordinates.lng,
          createdAt: nowIso()
        };

        db.occurrences.unshift(occurrence);
        if (req.body.markFailed && STATUS_FLOW[order.status]?.includes("FAILED")) {
          transitionOrder(order, "FAILED", req.user.name, occurrence.type);
        }

        res.status(201).json({ occurrence, order: publicOrder(order) });
      });
}
