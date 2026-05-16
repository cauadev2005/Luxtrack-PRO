import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function LiveMapView({ overview, drivers, orders, metadata }) {
  const activeOrders = orders.filter((order) => ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.status));
  const totals = overview?.totals || {};

  return (
    <>
      <PageHeader title="Mapa ao vivo" subtitle="Motoristas, pedidos ativos e sinal em tempo real" />
      <div className="metric-grid">
        <MetricCard iconName="card-checklist" label="Pedidos" value={totals.orders ?? 0} tone="blue" />
        <MetricCard iconName="signpost-2-fill" label="Em andamento" value={totals.active ?? 0} tone="teal" />
        <MetricCard iconName="exclamation-triangle-fill" label="Atrasados" value={totals.late ?? 0} tone="amber" />
        <MetricCard iconName="truck-front-fill" label="Online" value={totals.driversOnline ?? 0} tone="green" />
      </div>
      <div className="split-layout map-layout">
        <MapSurface drivers={drivers} orders={activeOrders} />
        <aside className="side-panel">
          <h3>Motoristas</h3>
          <div className="driver-list">
            {drivers.map((driver) => (
              <article key={driver.id} className="driver-row">
                <span className={`presence ${driver.status}`} />
                <div>
                  <strong>{driver.name}</strong>
                  <span>{driver.vehicle?.plate || driver.region}</span>
                </div>
                <small>{driver.activeOrders ?? driver.todayStops ?? 0} paradas</small>
              </article>
            ))}
          </div>
          <h3>Pedidos ativos</h3>
          <div className="compact-list">
            {activeOrders.map((order) => (
              <article key={order.id}>
                <div>
                  <strong>{order.code}</strong>
                  <span>{order.region}</span>
                </div>
                <StatusBadge metadata={metadata} status={order.status} />
              </article>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
