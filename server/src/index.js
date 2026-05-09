import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import PDFDocument from "pdfkit";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import {
  ROLE_LABELS,
  STATUSES,
  STATUS_FLOW,
  db,
  deterministicGeocode,
  haversineKm,
  nowIso
} from "./data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../..");
const uploadDir = join(rootDir, "uploads");
const distDir = join(rootDir, "dist");
const JWT_SECRET = process.env.JWT_SECRET || "luxtrack-dev-secret";
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

function signUser(user) {
  return jwt.sign(
    {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      driverId: user.driverId
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    driverId: user.driverId
  };
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.query.token;

  if (!token) {
    return res.status(401).json({ error: "Token ausente" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((item) => item.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Usuario nao encontrado" });
    }
    req.user = sanitizeUser(user);
    return next();
  } catch {
    return res.status(401).json({ error: "Token invalido" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Perfil sem permissao para esta acao" });
    }
    return next();
  };
}

function sameTenant(record, user) {
  return record.companyId === user.companyId;
}

function driverFor(order) {
  return order.driverId ? db.drivers.find((driver) => driver.id === order.driverId) : null;
}

function vehicleFor(driver) {
  return driver ? db.vehicles.find((vehicle) => vehicle.id === driver.vehicleId) : null;
}

function timelineFor(orderId) {
  return db.statusHistory
    .filter((item) => item.orderId === orderId)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

function publicOrder(order) {
  const driver = driverFor(order);
  return {
    ...order,
    statusLabel: STATUSES[order.status]?.label || order.status,
    statusTone: STATUSES[order.status]?.tone || "neutral",
    driver: driver
      ? {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          status: driver.status,
          vehicle: vehicleFor(driver)
        }
      : null,
    history: timelineFor(order.id)
  };
}

function scopedOrders(user) {
  return db.orders.filter((order) => {
    if (!sameTenant(order, user) || order.deletedAt) return false;
    if (user.role === "driver") return order.driverId === user.driverId;
    return true;
  });
}

function findOrderForUser(id, user) {
  return scopedOrders(user).find((order) => order.id === id || order.code === id);
}

function enqueueNotification(order, status) {
  db.notifications.push({
    id: `notif-${randomUUID()}`,
    companyId: order.companyId,
    orderId: order.id,
    channel: order.customerPhone ? "sms" : "email",
    recipient: order.customerPhone || order.customerEmail,
    template: `status_${status.toLowerCase()}`,
    payload: {
      code: order.code,
      status: STATUSES[status]?.label || status,
      customerName: order.customerName
    },
    state: "queued",
    createdAt: nowIso(),
    sentAt: null
  });
}

function transitionOrder(order, toStatus, actor, note = "Transicao de status") {
  if (!STATUSES[toStatus]) {
    const error = new Error("Status desconhecido");
    error.status = 400;
    throw error;
  }

  if (order.status === toStatus) {
    return order;
  }

  const allowed = STATUS_FLOW[order.status] || [];
  if (!allowed.includes(toStatus)) {
    const error = new Error(`Transicao invalida: ${order.status} -> ${toStatus}`);
    error.status = 409;
    throw error;
  }

  const entry = {
    id: `hist-${randomUUID()}`,
    companyId: order.companyId,
    orderId: order.id,
    fromStatus: order.status,
    toStatus,
    actor,
    note,
    at: nowIso()
  };

  order.status = toStatus;
  order.updatedAt = entry.at;
  if (toStatus === "DELIVERED") {
    order.deliveredAt = entry.at;
  }
  db.statusHistory.push(entry);
  enqueueNotification(order, toStatus);
  return order;
}

function locationPayload() {
  return db.drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    region: driver.region,
    status: driver.status,
    vehicle: vehicleFor(driver),
    position: driver.currentPosition,
    updatedAt: driver.updatedAt,
    activeOrders: db.orders.filter(
      (order) =>
        order.driverId === driver.id &&
        !["DELIVERED", "FAILED", "CANCELED"].includes(order.status) &&
        !order.deletedAt
    ).length
  }));
}

function broadcastLocations() {
  const message = JSON.stringify({
    type: "locations",
    at: nowIso(),
    drivers: locationPayload()
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function nearestRoute(start, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = start;
  let distanceKm = 0;

  while (remaining.length) {
    remaining.sort(
      (a, b) =>
        haversineKm(current, a.deliveryCoordinates) -
        haversineKm(current, b.deliveryCoordinates)
    );
    const next = remaining.shift();
    distanceKm += haversineKm(current, next.deliveryCoordinates);
    ordered.push(next);
    current = next.deliveryCoordinates;
  }

  return { ordered, distanceKm: Number(distanceKm.toFixed(2)) };
}

function reportForMonth(user, month) {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const orders = scopedOrders(user).filter((order) => order.scheduledFor.startsWith(targetMonth));
  const delivered = orders.filter((order) => order.status === "DELIVERED");
  const failed = orders.filter((order) => order.status === "FAILED");
  const distanceKm = orders.reduce((sum, order) => sum + Number(order.distanceKm || 0), 0);
  const totalCost = orders.reduce((sum, order) => sum + Number(order.costEstimate || 0), 0);
  const onTime = delivered.filter(
    (order) => order.deliveredAt && new Date(order.deliveredAt) <= new Date(order.dueAt)
  ).length;

  return {
    month: targetMonth,
    totals: {
      orders: orders.length,
      delivered: delivered.length,
      failed: failed.length,
      inProgress: orders.filter((order) =>
        ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.status)
      ).length,
      onTimeRate: delivered.length ? Number(((onTime / delivered.length) * 100).toFixed(1)) : 0,
      distanceKm: Number(distanceKm.toFixed(1)),
      totalCost: Number(totalCost.toFixed(2)),
      costPerKm: distanceKm ? Number((totalCost / distanceKm).toFixed(2)) : 0
    },
    byDriver: db.drivers
      .filter((driver) => sameTenant(driver, user))
      .map((driver) => {
        const driverOrders = orders.filter((order) => order.driverId === driver.id);
        return {
          driverId: driver.id,
          name: driver.name,
          delivered: driverOrders.filter((order) => order.status === "DELIVERED").length,
          failed: driverOrders.filter((order) => order.status === "FAILED").length,
          distanceKm: Number(
            driverOrders.reduce((sum, order) => sum + Number(order.distanceKm || 0), 0).toFixed(1)
          )
        };
      }),
    byRegion: ["Norte", "Sul", "Leste", "Oeste", "Centro"].map((region) => {
      const regionOrders = orders.filter((order) => order.region === region);
      return {
        region,
        orders: regionOrders.length,
        delivered: regionOrders.filter((order) => order.status === "DELIVERED").length,
        failed: regionOrders.filter((order) => order.status === "FAILED").length
      };
    })
  };
}

app.post("/api/auth/login", (req, res) => {
  const { email, password, role } = req.body;
  const user = db.users.find(
    (item) =>
      item.email.toLowerCase() === String(email || "").toLowerCase() &&
      item.password === password &&
      (!role || item.role === role)
  );

  if (!user) {
    return res.status(401).json({ error: "Credenciais invalidas" });
  }

  return res.json({
    token: signUser(user),
    user: sanitizeUser(user)
  });
});

app.use("/api", authenticate);

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

app.get("/api/kpis", authorize("admin", "dispatcher"), (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  res.json({ report: reportForMonth(req.user, month) });
});

app.get("/api/heatmap", authorize("admin", "dispatcher"), (req, res) => {
  const orders = scopedOrders(req.user);
  const points = orders.map((order) => ({
    id: order.id,
    code: order.code,
    region: order.region,
    lat: order.deliveryCoordinates.lat,
    lng: order.deliveryCoordinates.lng,
    weight: order.status === "FAILED" ? 1 : order.status === "DELIVERED" ? 0.55 : 0.35,
    kind: order.status === "FAILED" ? "failure" : "delivery",
    status: order.status
  }));
  const regions = reportForMonth(req.user, new Date().toISOString().slice(0, 7)).byRegion;
  res.json({ points, regions });
});

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

app.get("/api/reports/monthly", authorize("admin", "dispatcher"), (req, res) => {
  res.json({ report: reportForMonth(req.user, req.query.month) });
});

app.get("/api/reports/monthly.pdf", authorize("admin", "dispatcher"), (req, res) => {
  const report = reportForMonth(req.user, req.query.month);
  const company = db.companies.find((item) => item.id === req.user.companyId);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="luxtrack-relatorio-${report.month}.pdf"`
  );

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  doc.pipe(res);
  doc.fontSize(20).text("LuxTrack Pro", { continued: true }).fontSize(12).text("  Relatorio mensal");
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor("#526071").text(`${company?.name || "Empresa"} | Periodo: ${report.month}`);
  doc.moveDown();
  doc.fillColor("#121826").fontSize(14).text("Resumo operacional");
  doc.moveDown(0.4);
  doc.fontSize(11);
  doc.text(`Pedidos: ${report.totals.orders}`);
  doc.text(`Entregues: ${report.totals.delivered}`);
  doc.text(`Falhas: ${report.totals.failed}`);
  doc.text(`Taxa no prazo: ${report.totals.onTimeRate}%`);
  doc.text(`Distancia rodada: ${report.totals.distanceKm} km`);
  doc.text(`Custo por km: R$ ${report.totals.costPerKm}`);
  doc.moveDown();
  doc.fontSize(14).text("Entregas por motorista");
  doc.moveDown(0.4);
  report.byDriver.forEach((driver) => {
    doc
      .fontSize(10)
      .text(
        `${driver.name}: ${driver.delivered} entregas, ${driver.failed} falhas, ${driver.distanceKm} km`
      );
  });
  doc.moveDown();
  doc.fontSize(14).text("Regioes");
  doc.moveDown(0.4);
  report.byRegion.forEach((region) => {
    doc
      .fontSize(10)
      .text(
        `${region.region}: ${region.orders} pedidos, ${region.delivered} entregues, ${region.failed} falhas`
      );
  });
  doc.moveDown();
  doc
    .fontSize(8)
    .fillColor("#6b7280")
    .text(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
  doc.end();
});

wss.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "locations",
      at: nowIso(),
      drivers: locationPayload()
    })
  );
});

setInterval(() => {
  for (const driver of db.drivers) {
    if (driver.status !== "online") continue;
    const drift = () => Number(((Math.random() - 0.5) / 900).toFixed(6));
    driver.currentPosition = {
      lat: Number((driver.currentPosition.lat + drift()).toFixed(6)),
      lng: Number((driver.currentPosition.lng + drift()).toFixed(6)),
      heading: Math.floor((driver.currentPosition.heading + Math.random() * 26) % 360),
      speed: Math.max(12, Math.min(56, Math.round(driver.currentPosition.speed + Math.random() * 8 - 4)))
    };
    driver.updatedAt = nowIso();
    db.gpsPositions.push({
      id: `gps-${randomUUID()}`,
      companyId: driver.companyId,
      driverId: driver.id,
      ...driver.currentPosition,
      recordedAt: driver.updatedAt
    });
  }
  if (db.gpsPositions.length > 1000) db.gpsPositions.splice(0, db.gpsPositions.length - 1000);
  broadcastLocations();
}, 4000);

setInterval(() => {
  const queued = db.notifications.filter((item) => item.state === "queued").slice(0, 5);
  queued.forEach((item) => {
    item.state = "sent";
    item.sentAt = nowIso();
  });
}, 2500);

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/.*/, (_req, res) => {
    res.sendFile(join(distDir, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`LuxTrack Pro API rodando em http://localhost:${PORT}`);
});
