import { db } from "../data.js";
import { authorize } from "../middlewares/auth.js";
import { nearestRoute, publicOrder, scopedOrders } from "../services/luxtrackService.js";

export function registerRouteOptimizationRoutes(app) {
  app.post("/api/routes/optimize", authorize("admin", "dispatcher", "driver"), (req, res) => {
        const driverId = req.body.driverId || req.user.driverId;
        const driver = db.drivers.find(
          (item) => item.id === driverId && item.companyId === req.user.companyId
        );
        if (!driver) return res.status(404).json({ error: "Motorista nao encontrado" });
        if (req.user.role === "driver" && driver.id !== req.user.driverId) {
          return res.status(403).json({ error: "Motorista sem acesso a esta rota" });
        }

        const stops = scopedOrders(req.user).filter(
          (order) =>
            order.driverId === driver.id &&
            ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.status)
        );
        const { ordered, distanceKm } = nearestRoute(driver.currentPosition, stops);

        res.json({
          route: {
            driver,
            distanceKm,
            etaMinutes: Math.round(distanceKm * 3.8 + ordered.length * 9),
            stops: ordered.map((order, index) => ({
              sequence: index + 1,
              ...publicOrder(order)
            })),
            polyline: [driver.currentPosition, ...ordered.map((order) => order.deliveryCoordinates)]
          }
        });
      });
}
