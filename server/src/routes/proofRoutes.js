import { randomUUID } from "node:crypto";
import { nowIso } from "../data.js";
import { authorize } from "../middlewares/auth.js";
import { findOrderForUser, publicOrder, transitionOrder } from "../services/luxtrackService.js";

export function registerProofRoutes(app, { upload }) {
  app.post(
        "/api/orders/:id/proof",
        authorize("admin", "dispatcher", "driver"),
        upload.single("photo"),
        (req, res) => {
          const order = findOrderForUser(req.params.id, req.user);
          if (!order) return res.status(404).json({ error: "Pedido nao encontrado" });
          if (req.user.role === "driver" && order.driverId !== req.user.driverId) {
            return res.status(403).json({ error: "Motorista sem acesso a este pedido" });
          }

          try {
            if (order.status === "ASSIGNED") {
              transitionOrder(order, "PICKED_UP", req.user.name, "Coleta confirmada antes do comprovante");
            }
            if (order.status === "PICKED_UP") {
              transitionOrder(order, "IN_TRANSIT", req.user.name, "Rota iniciada antes do comprovante");
            }
            if (order.status === "IN_TRANSIT") {
              transitionOrder(order, "DELIVERED", req.user.name, "Comprovante anexado");
            }
          } catch (error) {
            return res.status(error.status || 500).json({ error: error.message });
          }

          order.proof = {
            id: `proof-${randomUUID()}`,
            photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
            signatureDataUrl: req.body.signature || null,
            receiverName: req.body.receiverName || order.recipient.name,
            document: req.body.document || order.recipient.document,
            capturedAt: nowIso()
          };
          order.updatedAt = nowIso();

          return res.json({ order: publicOrder(order) });
        }
      );
}
