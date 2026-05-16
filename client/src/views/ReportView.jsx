import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function ReportView({ token }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    request(`/reports/monthly?month=${month}`, { token }).then((data) => setReport(data.report));
  }, [month, token]);

  async function exportPdf() {
    setBusy(true);
    try {
      await openMonthlyPdf(token, month);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Relatorio mensal"
        subtitle="PDF exportavel com dados do periodo"
        action={
          <div className="header-actions">
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <button type="button" className="primary-action" onClick={exportPdf} disabled={busy}>
              <FileDown size={18} />
              {busy ? "Gerando..." : "Exportar PDF"}
            </button>
          </div>
        }
      />
      {report ? (
        <div className="report-grid">
          <MetricCard icon={ClipboardList} label="Pedidos" value={report.totals.orders} tone="blue" />
          <MetricCard icon={CheckCircle2} label="Entregues" value={report.totals.delivered} tone="green" />
          <MetricCard icon={Navigation} label="Km rodados" value={report.totals.distanceKm} tone="teal" />
          <MetricCard icon={XCircle} label="Falhas" value={report.totals.failed} tone="red" />
          <section className="chart-panel span-all">
            <h3>Resumo por regiao</h3>
            <div className="region-list wide">
              {report.byRegion.map((region) => (
                <article key={region.region}>
                  <strong>{region.region}</strong>
                  <span>{region.orders} pedidos</span>
                  <small>{region.delivered} entregues</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <EmptyState icon={FileDown} title="Carregando relatorio" />
      )}
    </>
  );
}
