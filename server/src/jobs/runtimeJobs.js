import { randomUUID } from "node:crypto";
import { db, nowIso } from "../data.js";

export function startDriverLocationSimulator(broadcastLocations) {
  return setInterval(() => {
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
}

export function startNotificationDispatcher() {
  return setInterval(() => {
    const queued = db.notifications.filter((item) => item.state === "queued").slice(0, 5);
    queued.forEach((item) => {
      item.state = "sent";
      item.sentAt = nowIso();
    });
  }, 2500);
}
