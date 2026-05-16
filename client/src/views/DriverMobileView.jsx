import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function DriverMobileView({ auth, token, metadata, orders, onChanged, goProof }) {
  const driverOrders = orders.filter((order) => {
    if (auth.user.role !== "driver") return ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.status);
    return order.driverId === auth.user.driverId && ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.status);
  });
  const [occurrence, setOccurrence] = useState({ orderId: driverOrders[0]?.id || "", type: "Cliente ausente", note: "" });

  useEffect(() => {
    if (!occurrence.orderId && driverOrders[0]) {
      setOccurrence((current) => ({ ...current, orderId: driverOrders[0].id }));
    }
  }, [driverOrders, occurrence.orderId]);

  async function advance(order) {
    const next = {
      ASSIGNED: "PICKED_UP",
      PICKED_UP: "IN_TRANSIT"
    }[order.status];
    if (!next) {
      goProof(order);
      return;
    }
    await request(`/orders/${order.id}/status`, {
      token,
      method: "PATCH",
      body: { status: next, note: "Atualizado pelo app do motorista" }
    });
    onChanged();
  }

  async function submitOccurrence(event) {
    event.preventDefault();
    await request("/occurrences", {
      token,
      method: "POST",
      body: { ...occurrence, markFailed: occurrence.type !== "Observacao" }
    });
    setOccurrence((current) => ({ ...current, note: "" }));
    onChanged();
  }

  return (
    <>
      <PageHeader title="Mobile do motorista" subtitle="Paradas, navegacao e ocorrencias" />
      <div className="mobile-layout">
        <section className="phone-frame">
          <div className="phone-top">
            <strong>Minhas paradas</strong>
            <span>{driverOrders.length}</span>
          </div>
          <div className="phone-list">
            {driverOrders.map((order) => (
              <article key={order.id} className="stop-card">
                <div>
                  <strong>{order.code}</strong>
                  <span>{order.deliveryAddress}</span>
                </div>
                <StatusBadge metadata={metadata} status={order.status} />
                <div className="stop-actions">
                  <button type="button" className="secondary-action" title="Navegar">
                    <Navigation size={16} />
                    Navegar
                  </button>
                  <button type="button" className="primary-action" onClick={() => advance(order)}>
                    <CheckCircle2 size={16} />
                    {order.status === "IN_TRANSIT" ? "Comprovar" : "Avancar"}
                  </button>
                </div>
              </article>
            ))}
            {!driverOrders.length && <EmptyState compact icon={CheckCircle2} title="Sem paradas pendentes" />}
          </div>
        </section>
        <form className="occurrence-panel" onSubmit={submitOccurrence}>
          <h3>Ocorrencia</h3>
          <label>
            Pedido
            <select
              value={occurrence.orderId}
              onChange={(event) => setOccurrence((current) => ({ ...current, orderId: event.target.value }))}
            >
              {driverOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select
              value={occurrence.type}
              onChange={(event) => setOccurrence((current) => ({ ...current, type: event.target.value }))}
            >
              <option>Cliente ausente</option>
              <option>Endereco incorreto</option>
              <option>Avaria</option>
              <option>Observacao</option>
            </select>
          </label>
          <label>
            Nota
            <textarea
              value={occurrence.note}
              onChange={(event) => setOccurrence((current) => ({ ...current, note: event.target.value }))}
            />
          </label>
          <button type="submit" className="primary-action" disabled={!occurrence.orderId}>
            <AlertTriangle size={16} />
            Registrar
          </button>
        </form>
      </div>
    </>
  );
}
