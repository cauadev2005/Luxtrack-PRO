import { randomUUID } from "node:crypto";
import { db, deterministicGeocode, haversineKm, nowIso } from "../data.js";
import { authorize } from "../middlewares/auth.js";
import { findOrderForUser, publicOrder, scopedOrders, transitionOrder } from "../services/luxtrackService.js";

export function registerOrderRoutes(app) {
  app.get("/api/orders", (req, res) => {
        const { status, driverId, region, date, q } = req.query;
        const limit = Math.min(Number(req.query.limit || 50), 100);
        const cursor = Number(req.query.cursor || 0);
        let orders = scopedOrders(req.user);

        if (status && status !== "ALL") orders = orders.filter((order) => order.status === status);
        if (driverId && driverId !== "ALL") orders = orders.filter((order) => order.driverId === driverId);
        if (region && region !== "ALL") orders = orders.filter((order) => order.region === region);
        if (date) orders = orders.filter((order) => order.scheduledFor.slice(0, 10) === date);
        if (q) {
          const term = String(q).toLowerCase();
          orders = orders.filter(
            (order) =>
              order.code.toLowerCase().includes(term) ||
              order.customerName.toLowerCase().includes(term) ||
              order.recipient.name.toLowerCase().includes(term)
          );
        }

        orders = orders.sort((a, b) => new Date(b.scheduledFor) - new Date(a.scheduledFor));
        const page = orders.slice(cursor, cursor + limit);

        res.json({
          orders: page.map(publicOrder),
          pagination: {
            limit,
            cursor,
            nextCursor: cursor + limit < orders.length ? cursor + limit : null,
            total: orders.length
          }
        });
      });

      app.post("/api/orders", authorize("admin", "dispatcher"), (req, res) => {
        const {
          customerName,
          customerEmail,
          customerPhone,
          recipient,
          pickupAddress,
          deliveryAddress,
          region,
          scheduledFor,
          dueAt,
          priority
        } = req.body;

        if (!customerName || !pickupAddress || !deliveryAddress || !recipient?.name || !region) {
          return res.status(400).json({ error: "Campos obrigatorios ausentes" });
        }

        const id = `order-${randomUUID()}`;
        const code = `LUX-${Math.floor(10000 + Math.random() * 89999)}`;
        const pickupCoordinates = deterministicGeocode(pickupAddress);
        const deliveryCoordinates = deterministicGeocode(deliveryAddress);
        const distanceKm = haversineKm(pickupCoordinates, deliveryCoordinates);

        const order = {
          id,
          companyId: req.user.companyId,
          code,
          status: "CREATED",
          customerName,
          customerEmail,
          customerPhone,
          recipient,
          pickupAddress,
          deliveryAddress,
          pickupCoordinates,
          deliveryCoordinates,
          region,
          driverId: null,
          scheduledFor: scheduledFor || nowIso(),
          dueAt:
            dueAt ||
            new Date(new Date(scheduledFor || Date.now()).getTime() + 6 * 60 * 60 * 1000).toISOString(),
          deliveredAt: null,
          distanceKm,
          costEstimate: Number((distanceKm * 6.35 + 22).toFixed(2)),
          priority: priority || "Normal",
          proof: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          deletedAt: null
        };

        db.orders.unshift(order);
        db.statusHistory.push({
          id: `hist-${randomUUID()}`,
          companyId: order.companyId,
          orderId: order.id,
          fromStatus: null,
          toStatus: "CREATED",
          actor: req.user.name,
          note: "Pedido criado",
          at: nowIso()
        });
        transitionOrder(order, "GEOCODED", "Servico de geocoding", "Enderecos convertidos em coordenadas");

        res.status(201).json({ order: publicOrder(order) });
      });

      app.get("/api/orders/:id", (req, res) => {
        const order = findOrderForUser(req.params.id, req.user);
        if (!order) return res.status(404).json({ error: "Pedido nao encontrado" });
        res.json({ order: publicOrder(order) });
      });

      app.patch("/api/orders/:id/assign", authorize("admin", "dispatcher"), (req, res) => {
        const order = findOrderForUser(req.params.id, req.user);
        const driver = db.drivers.find(
          (item) => item.id === req.body.driverId && item.companyId === req.user.companyId
        );

        if (!order) return res.status(404).json({ error: "Pedido nao encontrado" });
        if (!driver) return res.status(404).json({ error: "Motorista nao encontrado" });
        if (["DELIVERED", "CANCELED"].includes(order.status)) {
          return res.status(409).json({ error: "Pedido finalizado nao pode ser atribuido" });
        }

        order.driverId = driver.id;
        if (order.status === "CREATED") {
          transitionOrder(order, "GEOCODED", req.user.name, "Geocoding confirmado antes da atribuicao");
        }
        if (order.status !== "ASSIGNED") {
          transitionOrder(order, "ASSIGNED", req.user.name, `Atribuido para ${driver.name}`);
        } else {
          order.updatedAt = nowIso();
          db.statusHistory.push({
            id: `hist-${randomUUID()}`,
            companyId: order.companyId,
            orderId: order.id,
            fromStatus: "ASSIGNED",
            toStatus: "ASSIGNED",
            actor: req.user.name,
            note: `Motorista alterado para ${driver.name}`,
            at: nowIso()
          });
        }

        res.json({ order: publicOrder(order) });
      });

      app.patch("/api/orders/:id/status", (req, res) => {
        const order = findOrderForUser(req.params.id, req.user);
        if (!order) return res.status(404).json({ error: "Pedido nao encontrado" });
        if (req.user.role === "driver" && order.driverId !== req.user.driverId) {
          return res.status(403).json({ error: "Motorista sem acesso a este pedido" });
        }

        try {
          transitionOrder(order, req.body.status, req.user.name, req.body.note || "Atualizacao manual");
          res.json({ order: publicOrder(order) });
        } catch (error) {
          res.status(error.status || 500).json({ error: error.message });
        }
      });

      app.delete("/api/orders/:id", authorize("admin"), (req, res) => {
        const order = findOrderForUser(req.params.id, req.user);
        if (!order) return res.status(404).json({ error: "Pedido nao encontrado" });
        order.deletedAt = nowIso();
        order.updatedAt = nowIso();
        res.status(204).end();
      });
}
