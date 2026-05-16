import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function CreateOrderView({ metadata, token, onCreated }) {
  const [form, setForm] = useState({
    customerName: "Cliente Lux",
    customerEmail: "cliente@luxtrack.pro",
    customerPhone: "+55 11 94444-0000",
    recipientName: "Destinatario",
    recipientPhone: "+55 11 98888-2222",
    recipientDocument: "CPF 000.000.000-00",
    pickupAddress: "Av. Paulista, 1000 - Bela Vista, Sao Paulo - SP",
    deliveryAddress: "Rua Vergueiro, 2400 - Vila Mariana, Sao Paulo - SP",
    region: "Sul",
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    priority: "Normal"
  });
  const [busy, setBusy] = useState(false);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await request("/orders", {
        token,
        method: "POST",
        body: {
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          recipient: {
            name: form.recipientName,
            phone: form.recipientPhone,
            document: form.recipientDocument
          },
          pickupAddress: form.pickupAddress,
          deliveryAddress: form.deliveryAddress,
          region: form.region,
          scheduledFor: new Date(form.scheduledFor).toISOString(),
          priority: form.priority
        }
      });
      onCreated(data.order);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Criar pedido" subtitle="Coleta, entrega e dados do destinatario" />
      <form className="form-grid" onSubmit={submit}>
        <label>
          Cliente
          <input value={form.customerName} onChange={(event) => change("customerName", event.target.value)} />
        </label>
        <label>
          E-mail
          <input type="email" value={form.customerEmail} onChange={(event) => change("customerEmail", event.target.value)} />
        </label>
        <label>
          Telefone
          <input value={form.customerPhone} onChange={(event) => change("customerPhone", event.target.value)} />
        </label>
        <label>
          Destinatario
          <input value={form.recipientName} onChange={(event) => change("recipientName", event.target.value)} />
        </label>
        <label>
          Documento
          <input value={form.recipientDocument} onChange={(event) => change("recipientDocument", event.target.value)} />
        </label>
        <label>
          Telefone do destinatario
          <input value={form.recipientPhone} onChange={(event) => change("recipientPhone", event.target.value)} />
        </label>
        <label className="span-2">
          Endereco de coleta
          <input value={form.pickupAddress} onChange={(event) => change("pickupAddress", event.target.value)} />
        </label>
        <label className="span-2">
          Endereco de entrega
          <input value={form.deliveryAddress} onChange={(event) => change("deliveryAddress", event.target.value)} />
        </label>
        <label>
          Regiao
          <select value={form.region} onChange={(event) => change("region", event.target.value)}>
            {(metadata?.regions || []).map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label>
          Agendamento
          <input
            type="datetime-local"
            value={form.scheduledFor}
            onChange={(event) => change("scheduledFor", event.target.value)}
          />
        </label>
        <label>
          Prioridade
          <select value={form.priority} onChange={(event) => change("priority", event.target.value)}>
            <option>Baixa</option>
            <option>Normal</option>
            <option>Alta</option>
          </select>
        </label>
        <div className="form-actions span-2">
          <button type="submit" className="primary-action" disabled={busy}>
            <Plus size={18} />
            {busy ? "Criando..." : "Criar pedido"}
          </button>
        </div>
      </form>
    </>
  );
}
