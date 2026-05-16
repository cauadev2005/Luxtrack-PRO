import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function OrderDetail({ order, metadata }) {
  if (!order) return <EmptyState icon={ClipboardList} title="Selecione um pedido" />;

  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <div>
          <span>{order.code}</span>
          <h3>{order.customerName}</h3>
        </div>
        <StatusBadge metadata={metadata} status={order.status} />
      </div>

      <div className="detail-grid">
        <div>
          <small>Coleta</small>
          <strong>{order.pickupAddress}</strong>
        </div>
        <div>
          <small>Entrega</small>
          <strong>{order.deliveryAddress}</strong>
        </div>
        <div>
          <small>Destinatario</small>
          <strong>{order.recipient?.name}</strong>
        </div>
        <div>
          <small>Janela</small>
          <strong>{formatDateTime(order.scheduledFor)} ate {formatDateTime(order.dueAt)}</strong>
        </div>
      </div>

      <h4>Linha do tempo</h4>
      <ol className="timeline">
        {(order.history || []).map((item) => (
          <li key={item.id}>
            <span />
            <div>
              <strong>{statusMeta(metadata, item.toStatus).label}</strong>
              <small>{formatDateTime(item.at)} - {item.actor}</small>
              <p>{item.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
