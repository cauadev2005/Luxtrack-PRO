import { randomUUID } from "node:crypto";
import { STATUSES, STATUS_FLOW, db, haversineKm, nowIso } from "../data.js";

export function sameTenant(record, user) {
  return record.companyId === user.companyId;
}

export function driverFor(order) {
  return order.driverId ? db.drivers.find((driver) => driver.id === order.driverId) : null;
}

export function vehicleFor(driver) {
  return driver ? db.vehicles.find((vehicle) => vehicle.id === driver.vehicleId) : null;
}

export function timelineFor(orderId) {
  return db.statusHistory
    .filter((item) => item.orderId === orderId)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

export function publicOrder(order) {
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

export function scopedOrders(user) {
  return db.orders.filter((order) => {
    if (!sameTenant(order, user) || order.deletedAt) return false;
    if (user.role === "driver") return order.driverId === user.driverId;
    return true;
  });
}

export function findOrderForUser(id, user) {
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

export function transitionOrder(order, toStatus, actor, note = "Transicao de status") {
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

export function locationPayload() {
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

export function nearestRoute(start, stops) {
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

export function reportForMonth(user, month) {
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
