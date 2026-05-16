import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function HeatmapView({ token, drivers, orders }) {
  const [heatmap, setHeatmap] = useState({ points: [], regions: [] });

  useEffect(() => {
    request("/heatmap", { token }).then(setHeatmap);
  }, [token]);

  return (
    <>
      <PageHeader title="Heatmap" subtitle="Regioes com mais entregas e falhas" />
      <div className="split-layout map-layout">
        <MapSurface drivers={drivers} orders={[]} heatmap={heatmap.points} mode="heatmap" />
        <aside className="side-panel">
          <h3>Regioes</h3>
          <div className="region-list">
            {heatmap.regions.map((region) => (
              <article key={region.region}>
                <strong>{region.region}</strong>
                <span>{region.orders} pedidos</span>
                <small>{region.failed} falhas</small>
              </article>
            ))}
          </div>
          <h3>Falhas recentes</h3>
          <div className="compact-list">
            {orders
              .filter((order) => order.status === "FAILED")
              .map((order) => (
                <article key={order.id}>
                  <div>
                    <strong>{order.code}</strong>
                    <span>{order.region}</span>
                  </div>
                  <AlertTriangle size={18} />
                </article>
              ))}
          </div>
        </aside>
      </div>
    </>
  );
}
