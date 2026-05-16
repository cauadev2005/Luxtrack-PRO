import L from "leaflet";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { Bi, LogoMark } from "./common.jsx";

export function LoginMapPreview() {
  return (
    <article className="login-delivery-map">
      <div className="delivery-map-header">
        <div>
          <span>Live route</span>
          <strong>LUX-10418</strong>
        </div>
        <b>
          <Bi name="record-circle-fill" />
          Em movimento
        </b>
      </div>

      <div className="delivery-map-stage" aria-hidden="true">
        <div className="delivery-map-grid" />
        <span className="delivery-road road-main" />
        <span className="delivery-road road-cross-a" />
        <span className="delivery-road road-cross-b" />
        <span className="delivery-zone zone-a">Centro</span>
        <span className="delivery-zone zone-b">Oeste</span>
        <svg className="delivery-route-svg" viewBox="0 0 640 300" preserveAspectRatio="none">
          <path
            className="delivery-route-shadow"
            d="M78 218 C170 170 230 185 304 138 S432 70 562 98"
          />
          <path
            className="delivery-route-line"
            d="M78 218 C170 170 230 185 304 138 S432 70 562 98"
          />
        </svg>
        <span className="delivery-point start-point">
          <Bi name="box-seam-fill" />
        </span>
        <span className="delivery-point end-point">
          <Bi name="geo-alt-fill" />
        </span>
        <span className="delivery-truck">
          <Bi name="truck-front-fill" />
        </span>
      </div>

      <div className="delivery-map-footer">
        <div>
          <span>ETA</span>
          <strong>12 min</strong>
        </div>
        <div>
          <span>Distancia</span>
          <strong>4.8 km</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>Em rota</strong>
        </div>
      </div>
    </article>
  );
}

function markerIcon(type, tone = "neutral", label = "") {
  const iconName = type === "driver" ? "truck-front-fill" : tone === "danger" ? "exclamation-triangle-fill" : "box-seam-fill";
  return L.divIcon({
    className: "",
    html: `
      <span class="leaflet-lux-marker ${type} ${tone}">
        <i class="bi bi-${iconName}"></i>
        ${label ? `<b>${label}</b>` : ""}
      </span>
    `,
    iconSize: type === "driver" ? [44, 44] : [38, 38],
    iconAnchor: type === "driver" ? [22, 22] : [19, 19],
    popupAnchor: [0, -18]
  });
}

function FitRouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), {
      padding: [42, 42],
      maxZoom: 13,
      animate: true
    });
  }, [map, positions]);

  return null;
}

export function MapSurface({ drivers = [], orders = [], route, heatmap = [], mode = "live", selectedOrderId }) {
  const onlineDrivers = drivers.filter((driver) => driver.status === "online").length;
  const activeSignals = mode === "heatmap" ? heatmap.length : orders.length + drivers.length;
  const routePositions = route?.polyline?.map((point) => [point.lat, point.lng]) || [];
  const center = [-23.5505, -46.6333];
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <section className={`map-frame ${mode}`}>
      <div className="map-toolbar">
        <div className="map-toolbar-brand">
          <LogoMark compact />
          <div>
            <strong>Command Map</strong>
            <span>Sao Paulo, SP</span>
          </div>
        </div>
        <div className="map-toolbar-actions">
          <span>
            <Bi name="broadcast" />
            {onlineDrivers} online
          </span>
          <span>
            <Bi name={mode === "heatmap" ? "fire" : "crosshair"} />
            {activeSignals} sinais
          </span>
        </div>
      </div>

      <div className={`map-surface ${mode}`}>
        <MapContainer center={center} zoom={11} minZoom={10} maxZoom={16} scrollWheelZoom zoomControl={false} className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={tileUrl}
          />
          <ZoomControl position="bottomright" />
          {routePositions.length > 1 && <FitRouteBounds positions={routePositions} />}

          {mode === "heatmap" &&
            heatmap.map((point) => (
              <Circle
                key={point.id}
                center={[point.lat, point.lng]}
                radius={750 + point.weight * 2100}
                pathOptions={{
                  color: point.kind === "failure" ? "#dc2626" : "#0f766e",
                  fillColor: point.kind === "failure" ? "#ef4444" : "#14b8a6",
                  fillOpacity: point.kind === "failure" ? 0.28 : 0.2,
                  weight: 1
                }}
              >
                <Popup>
                  <strong>{point.code}</strong>
                  <br />
                  {point.region} - {point.kind === "failure" ? "falha" : "entrega"}
                </Popup>
              </Circle>
            ))}

          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#0f766e",
                weight: 6,
                opacity: 0.88,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
          )}

          {routePositions.map((position, index) => (
            <CircleMarker
              key={`${position[0]}-${position[1]}-${index}`}
              center={position}
              radius={index === 0 ? 8 : 6}
              pathOptions={{
                color: "#ffffff",
                fillColor: index === 0 ? "#101828" : "#f59e0b",
                fillOpacity: 1,
                weight: 2
              }}
            />
          ))}

          {orders.map((order) => (
            <Marker
              key={order.id}
              position={[order.deliveryCoordinates.lat, order.deliveryCoordinates.lng]}
              icon={markerIcon("order", order.statusTone, order.code.slice(-2))}
              zIndexOffset={selectedOrderId === order.id ? 900 : 200}
            >
              <Popup>
                <strong>{order.code}</strong>
                <br />
                {order.recipient?.name}
                <br />
                {order.region} - {order.statusLabel}
              </Popup>
            </Marker>
          ))}

          {drivers.map((driver) => {
            const position = driver.position || driver.currentPosition;
            if (!position) return null;
            return (
              <Marker
                key={driver.id}
                position={[position.lat, position.lng]}
                icon={markerIcon("driver", driver.status, driver.name.slice(0, 1))}
                zIndexOffset={600}
              >
                <Popup>
                  <strong>{driver.name}</strong>
                  <br />
                  {driver.vehicle?.plate || driver.region}
                  <br />
                  {driver.status === "online" ? "Online" : "Offline"}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="map-overlay-panel">
          <span>
            <Bi name="layers-fill" />
            OpenStreetMap
          </span>
          <span>
            <Bi name="mouse2-fill" />
            Arraste e aproxime
          </span>
        </div>
      </div>

      <div className="map-legend">
        <span>
          <i className="legend-dot driver" />
          Motorista
        </span>
        <span>
          <i className="legend-dot order" />
          Pedido
        </span>
        <span>
          <i className="legend-dot failure" />
          Falha
        </span>
        <span>
          <i className="legend-line" />
          Rota
        </span>
      </div>
    </section>
  );
}
