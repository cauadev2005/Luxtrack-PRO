import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";
import { OrderDetail } from "./OrderDetail.jsx";

export function OrdersView({ metadata, drivers, orders, selectedOrder, setSelectedOrder, onFilter }) {
  const [filters, setFilters] = useState({ status: "ALL", driverId: "ALL", region: "ALL", date: "", q: "" });

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Lista completa com filtros operacionais" />
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            value={filters.q}
            onChange={(event) => updateFilter("q", event.target.value)}
            placeholder="Buscar pedido"
          />
        </div>
        <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
          <option value="ALL">Todos os status</option>
          {statusOrder.map((status) => (
            <option key={status} value={status}>
              {statusMeta(metadata, status).label}
            </option>
          ))}
        </select>
        <input type="date" value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} />
        <select value={filters.driverId} onChange={(event) => updateFilter("driverId", event.target.value)}>
          <option value="ALL">Todos os motoristas</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
        <select value={filters.region} onChange={(event) => updateFilter("region", event.target.value)}>
          <option value="ALL">Todas as regioes</option>
          {(metadata?.regions || []).map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <button type="button" className="secondary-action" onClick={() => onFilter(filters)}>
          <Filter size={16} />
          Filtrar
        </button>
      </div>

      <div className="split-layout orders-layout">
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Status</th>
                <th>Regiao</th>
                <th>Motorista</th>
                <th>Data</th>
                <th>Custo</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className={selectedOrder?.id === order.id ? "selected" : ""}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td>
                    <strong>{order.code}</strong>
                    <span>{order.customerName}</span>
                  </td>
                  <td>
                    <StatusBadge metadata={metadata} status={order.status} />
                  </td>
                  <td>{order.region}</td>
                  <td>{order.driver?.name || "Sem motorista"}</td>
                  <td>{formatDate(order.scheduledFor)}</td>
                  <td>{currency(order.costEstimate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <OrderDetail order={selectedOrder || orders[0]} metadata={metadata} />
      </div>
    </>
  );
}
