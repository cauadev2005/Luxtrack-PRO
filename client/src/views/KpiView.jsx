import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";

export function KpiView({ token }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState(null);

  useEffect(() => {
    request(`/kpis?month=${month}`, { token }).then((data) => setReport(data.report));
  }, [month, token]);

  if (!report) return <EmptyState icon={BarChart3} title="Carregando KPIs" />;

  const maxDeliveries = Math.max(1, ...report.byDriver.map((driver) => driver.delivered));

  return (
    <>
      <PageHeader
        title="KPIs"
        subtitle="Prazo, custo por km e entregas por motorista"
        action={<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />}
      />
      <div className="metric-grid">
        <MetricCard icon={CheckCircle2} label="No prazo" value={report.totals.onTimeRate} suffix="%" tone="green" />
        <MetricCard icon={Navigation} label="Custo/km" value={currency(report.totals.costPerKm)} tone="teal" />
        <MetricCard icon={Truck} label="Entregues" value={report.totals.delivered} tone="blue" />
        <MetricCard icon={XCircle} label="Falhas" value={report.totals.failed} tone="red" />
      </div>
      <section className="chart-panel">
        <h3>Entregas por motorista</h3>
        <div className="bar-chart">
          {report.byDriver.map((driver) => (
            <div key={driver.driverId} className="bar-row">
              <span>{driver.name}</span>
              <div className="bar-track">
                <b style={{ width: `${(driver.delivered / maxDeliveries) * 100}%` }} />
              </div>
              <strong>{driver.delivered}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
