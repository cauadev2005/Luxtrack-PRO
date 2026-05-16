import { WebSocket } from "ws";
import { nowIso } from "../data.js";
import { locationPayload } from "../services/luxtrackService.js";

export function createLocationSocket(wss) {
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

  function registerLocationSocket() {
    wss.on("connection", (socket) => {
      socket.send(
        JSON.stringify({
          type: "locations",
          at: nowIso(),
          drivers: locationPayload()
        })
      );
    });
  }

  return { broadcastLocations, registerLocationSocket };
}
