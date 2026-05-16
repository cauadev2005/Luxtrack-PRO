import { statusMeta } from "../utils/formatters.js";

export function Bi({ name, className = "" }) {
  return <i className={`bi bi-${name} ${className}`.trim()} aria-hidden="true" />;
}

export function LogoMark({ compact = false, invert = false }) {
  return (
    <div className={`lux-logo ${compact ? "compact" : ""} ${invert ? "invert" : ""}`.trim()}>
      <img className="lux-logo-image" src="/assets/luxtrack.png" alt="LuxTrack Pro" />
    </div>
  );
}

export function StatusBadge({ metadata, status }) {
  const meta = statusMeta(metadata, status);
  return <span className={`status-badge ${meta.tone}`}>{meta.label}</span>;
}

export function EmptyState({ icon: Icon, title, compact = false }) {
  return (
    <div className={compact ? "empty-state compact" : "empty-state"}>
      <Icon size={compact ? 20 : 28} />
      <span>{title}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <header className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function MetricCard({ icon: Icon, iconName, label, value, tone, suffix }) {
  return (
    <article className={`metric-card ${tone}`}>
      {iconName ? <Bi name={iconName} /> : <Icon size={20} />}
      <span>{label}</span>
      <strong>{value}{suffix || ""}</strong>
    </article>
  );
}
