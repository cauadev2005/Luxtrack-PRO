import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function AssignmentView({ token, metadata, drivers, orders, onChanged }) {
  const assignable = orders.filter((order) => ["CREATED", "GEOCODED", "FAILED"].includes(order.status));
  const [orderId, setOrderId] = useState(assignable[0]?.id || "");
  const [driverId, setDriverId] = useState(drivers[0]?.id || "");
  const selectedOrder = orders.find((order) => order.id === orderId);

  useEffect(() => {
    if (!orderId && assignable[0]) setOrderId(assignable[0].id);
    if (!driverId && drivers[0]) setDriverId(drivers[0].id);
  }, [assignable, drivers, driverId, orderId]);

  async function assign() {
    if (!orderId || !driverId) return;
    await request(`/orders/${orderId}/assign`, {
      token,
      method: "PATCH",
      body: { driverId }
    });
    onChanged();
  }

  return (
    <>
      <PageHeader title="Atribuicao" subtitle="Despachante vincula pedidos a motoristas" />
      <div className="assignment-grid">
        <section className="work-column">
          <h3>Fila</h3>
          {assignable.length ? (
            assignable.map((order) => (
              <button
                type="button"
                key={order.id}
                className={orderId === order.id ? "assignment-card active" : "assignment-card"}
                onClick={() => setOrderId(order.id)}
              >
                <strong>{order.code}</strong>
                <span>{order.region} - {order.recipient?.name}</span>
                <StatusBadge metadata={metadata} status={order.status} />
              </button>
            ))
          ) : (
            <EmptyState compact icon={CheckCircle2} title="Fila limpa" />
          )}
        </section>
        <section className="work-column">
          <h3>Motoristas</h3>
          {drivers.map((driver) => (
            <button
              type="button"
              key={driver.id}
              className={driverId === driver.id ? "assignment-card active" : "assignment-card"}
              onClick={() => setDriverId(driver.id)}
            >
              <strong>{driver.name}</strong>
              <span>{driver.vehicle?.plate} - {driver.region}</span>
              <small>{driver.todayStops} paradas</small>
            </button>
          ))}
        </section>
        <section className="dispatch-panel">
          <h3>Despacho</h3>
          {selectedOrder ? (
            <>
              <OrderDetail order={selectedOrder} metadata={metadata} />
              <button type="button" className="primary-action full" onClick={assign}>
                <Truck size={18} />
                Vincular motorista
              </button>
            </>
          ) : (
            <EmptyState icon={ClipboardList} title="Nenhum pedido disponivel" />
          )}
        </section>
      </div>
    </>
  );
}
