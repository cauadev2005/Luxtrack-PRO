import { ROLE_LABELS, STATUSES, db } from "../data.js";
import { locationPayload, publicOrder, sameTenant, scopedOrders } from "../services/luxtrackService.js";

export function registerCoreRoutes(app) {
  app.get("/api/me", (req, res) => {
        res.json({ user: req.user });
      });

      app.get("/api/metadata", (req, res) => {
        res.json({
          statuses: STATUSES,
          roles: ROLE_LABELS,
          regions: ["Norte", "Sul", "Leste", "Oeste", "Centro"]
        });
      });

      app.get("/api/overview", (req, res) => {
        const orders = scopedOrders(req.user);
        const active = orders.filter((order) =>
          ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.status)
        );
        const late = orders.filter(
          (order) =>
            !["DELIVERED", "CANCELED"].includes(order.status) && new Date(order.dueAt) < new Date()
        );
        res.json({
          totals: {
            orders: orders.length,
            active: active.length,
            late: late.length,
            driversOnline: db.drivers.filter(
              (driver) => sameTenant(driver, req.user) && driver.status === "online"
            ).length
          },
          locations: locationPayload(),
          recentOrders: orders.slice(0, 6).map(publicOrder)
        });
      });
}
