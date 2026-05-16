import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function RoutesView({ auth, token, drivers, orders, metadata }) {
  const initialDriver = auth.user.role === "driver" ? auth.user.driverId : drivers[0]?.id;
  const [driverId, setDriverId] = useState(initialDriver || "");
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const selectedDriver = drivers.find((driver) => driver.id === driverId);

  useEffect(() => {
    if (!driverId && initialDriver) setDriverId(initialDriver);
  }, [driverId, initialDriver]);

  async function optimize() {
    if (!driverId) return;
    setBusy(true);
    try {
      const data = await request("/routes/optimize", {
        token,
        method: "POST",
        body: { driverId }
      });
      setRoute(data.route);
    } finally {
      setBusy(false);
    }
  }

  const routeOrders = route?.stops || orders.filter((order) => order.driverId === driverId);

  return (
    <>
      <PageHeader
        title="Rota otimizada"
        subtitle="Sequencia de paradas calculada por proximidade"
        action={
          <div className="header-actions">
            {auth.user.role !== "driver" && (
              <select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="primary-action" onClick={optimize} disabled={busy}>
              <Route size={18} />
              {busy ? "Calculando..." : "Otimizar"}
            </button>
          </div>
        }
      />
      <div className="split-layout map-layout">
        <MapSurface drivers={selectedDriver ? [{ ...selectedDriver, position: selectedDriver.currentPosition }] : []} orders={routeOrders} route={route} mode="routes" />
        <aside className="side-panel">
          <h3>{selectedDriver?.name || "Motorista"}</h3>
          {route && (
            <div className="route-summary">
              <strong>{route.distanceKm} km</strong>
              <span>{route.etaMinutes} min estimados</span>
            </div>
          )}
          <div className="stop-list">
            {routeOrders.length ? (
              routeOrders.map((order, index) => (
                <article key={order.id}>
                  <b>{order.sequence || index + 1}</b>
                  <div>
                    <strong>{order.code}</strong>
                    <span>{order.deliveryAddress}</span>
                  </div>
                  <StatusBadge metadata={metadata} status={order.status} />
                </article>
              ))
            ) : (
              <EmptyState compact icon={Route} title="Sem paradas ativas" />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
