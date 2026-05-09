import {
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileDown,
  Filter,
  LogOut,
  Map as MapIcon,
  MapPin,
  Navigation,
  PackageCheck,
  PenLine,
  Plus,
  RadioTower,
  Route,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
  UserCog,
  Users,
  XCircle
} from "lucide-react";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { openMonthlyPdf, request, wsLocationsUrl } from "./api.js";

function Bi({ name, className = "" }) {
  return <i className={`bi bi-${name} ${className}`.trim()} aria-hidden="true" />;
}

function LogoMark({ compact = false, invert = false }) {
  return (
    <div className={`lux-logo ${compact ? "compact" : ""} ${invert ? "invert" : ""}`.trim()}>
      <img className="lux-logo-image" src="/assets/luxtrack.png" alt="LuxTrack Pro" />
    </div>
  );
}

const profiles = [
  {
    role: "admin",
    label: "Admin",
    email: "admin@luxtrack.pro",
    password: "lux123",
    iconName: "shield-lock-fill"
  },
  {
    role: "dispatcher",
    label: "Despachante",
    email: "despachante@luxtrack.pro",
    password: "lux123",
    iconName: "broadcast-pin"
  },
  {
    role: "driver",
    label: "Motorista",
    email: "motorista@luxtrack.pro",
    password: "lux123",
    iconName: "truck-front-fill"
  }
];

const statusOrder = [
  "CREATED",
  "GEOCODED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELED"
];

const roleViews = {
  admin: ["live", "orders", "create", "assign", "routes", "kpis", "heatmap", "report", "driver", "proof"],
  dispatcher: ["live", "orders", "create", "assign", "routes", "kpis", "heatmap", "report"],
  driver: ["driver", "routes", "proof"]
};

const navItems = [
  { id: "live", label: "Mapa", iconName: "radar" },
  { id: "orders", label: "Pedidos", iconName: "card-checklist" },
  { id: "create", label: "Novo pedido", iconName: "plus-square-fill" },
  { id: "assign", label: "Atribuicao", iconName: "people-fill" },
  { id: "routes", label: "Rotas", iconName: "signpost-split-fill" },
  { id: "kpis", label: "KPIs", iconName: "bar-chart-line-fill" },
  { id: "heatmap", label: "Heatmap", iconName: "fire" },
  { id: "report", label: "Relatorio", iconName: "file-earmark-bar-graph-fill" },
  { id: "driver", label: "Mobile", iconName: "phone-fill" },
  { id: "proof", label: "Comprovante", iconName: "camera-fill" }
];

const mapBounds = {
  minLat: -23.71,
  maxLat: -23.45,
  minLng: -46.78,
  maxLng: -46.41
};

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value || 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toPoint(position) {
  if (!position) return { x: 50, y: 50 };
  const x = ((position.lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
  const y = ((mapBounds.maxLat - position.lat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
  return {
    x: clamp(x, 4, 96),
    y: clamp(y, 4, 96)
  };
}

function statusMeta(metadata, status) {
  return metadata?.statuses?.[status] || { label: status, tone: "neutral" };
}

function StatusBadge({ metadata, status }) {
  const meta = statusMeta(metadata, status);
  return <span className={`status-badge ${meta.tone}`}>{meta.label}</span>;
}

function EmptyState({ icon: Icon, title, compact = false }) {
  return (
    <div className={compact ? "empty-state compact" : "empty-state"}>
      <Icon size={compact ? 20 : 28} />
      <span>{title}</span>
    </div>
  );
}

function LoginMapPreview() {
  return (
    <article className="login-delivery-map">
      <div className="delivery-map-header">
        <div>
          <span>Live route</span>
          <strong>LUX-10418</strong>
        </div>
        <b>
          <Bi name="record-circle-fill" />
          Em movimento
        </b>
      </div>

      <div className="delivery-map-stage" aria-hidden="true">
        <div className="delivery-map-grid" />
        <span className="delivery-road road-main" />
        <span className="delivery-road road-cross-a" />
        <span className="delivery-road road-cross-b" />
        <span className="delivery-zone zone-a">Centro</span>
        <span className="delivery-zone zone-b">Oeste</span>
        <svg className="delivery-route-svg" viewBox="0 0 640 300" preserveAspectRatio="none">
          <path
            className="delivery-route-shadow"
            d="M78 218 C170 170 230 185 304 138 S432 70 562 98"
          />
          <path
            className="delivery-route-line"
            d="M78 218 C170 170 230 185 304 138 S432 70 562 98"
          />
        </svg>
        <span className="delivery-point start-point">
          <Bi name="box-seam-fill" />
        </span>
        <span className="delivery-point end-point">
          <Bi name="geo-alt-fill" />
        </span>
        <span className="delivery-truck">
          <Bi name="truck-front-fill" />
        </span>
      </div>

      <div className="delivery-map-footer">
        <div>
          <span>ETA</span>
          <strong>12 min</strong>
        </div>
        <div>
          <span>Distancia</span>
          <strong>4.8 km</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>Em rota</strong>
        </div>
      </div>
    </article>
  );
}

function markerIcon(type, tone = "neutral", label = "") {
  const iconName = type === "driver" ? "truck-front-fill" : tone === "danger" ? "exclamation-triangle-fill" : "box-seam-fill";
  return L.divIcon({
    className: "",
    html: `
      <span class="leaflet-lux-marker ${type} ${tone}">
        <i class="bi bi-${iconName}"></i>
        ${label ? `<b>${label}</b>` : ""}
      </span>
    `,
    iconSize: type === "driver" ? [44, 44] : [38, 38],
    iconAnchor: type === "driver" ? [22, 22] : [19, 19],
    popupAnchor: [0, -18]
  });
}

function FitRouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), {
      padding: [42, 42],
      maxZoom: 13,
      animate: true
    });
  }, [map, positions]);

  return null;
}

function MapSurface({ drivers = [], orders = [], route, heatmap = [], mode = "live", selectedOrderId }) {
  const onlineDrivers = drivers.filter((driver) => driver.status === "online").length;
  const activeSignals = mode === "heatmap" ? heatmap.length : orders.length + drivers.length;
  const routePositions = route?.polyline?.map((point) => [point.lat, point.lng]) || [];
  const center = [-23.5505, -46.6333];
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <section className={`map-frame ${mode}`}>
      <div className="map-toolbar">
        <div className="map-toolbar-brand">
          <LogoMark compact />
          <div>
            <strong>Command Map</strong>
            <span>Sao Paulo, SP</span>
          </div>
        </div>
        <div className="map-toolbar-actions">
          <span>
            <Bi name="broadcast" />
            {onlineDrivers} online
          </span>
          <span>
            <Bi name={mode === "heatmap" ? "fire" : "crosshair"} />
            {activeSignals} sinais
          </span>
        </div>
      </div>

      <div className={`map-surface ${mode}`}>
        <MapContainer center={center} zoom={11} minZoom={10} maxZoom={16} scrollWheelZoom zoomControl={false} className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={tileUrl}
          />
          <ZoomControl position="bottomright" />
          {routePositions.length > 1 && <FitRouteBounds positions={routePositions} />}

          {mode === "heatmap" &&
            heatmap.map((point) => (
              <Circle
                key={point.id}
                center={[point.lat, point.lng]}
                radius={750 + point.weight * 2100}
                pathOptions={{
                  color: point.kind === "failure" ? "#dc2626" : "#0f766e",
                  fillColor: point.kind === "failure" ? "#ef4444" : "#14b8a6",
                  fillOpacity: point.kind === "failure" ? 0.28 : 0.2,
                  weight: 1
                }}
              >
                <Popup>
                  <strong>{point.code}</strong>
                  <br />
                  {point.region} - {point.kind === "failure" ? "falha" : "entrega"}
                </Popup>
              </Circle>
            ))}

          {routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: "#0f766e",
                weight: 6,
                opacity: 0.88,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
          )}

          {routePositions.map((position, index) => (
            <CircleMarker
              key={`${position[0]}-${position[1]}-${index}`}
              center={position}
              radius={index === 0 ? 8 : 6}
              pathOptions={{
                color: "#ffffff",
                fillColor: index === 0 ? "#101828" : "#f59e0b",
                fillOpacity: 1,
                weight: 2
              }}
            />
          ))}

          {orders.map((order) => (
            <Marker
              key={order.id}
              position={[order.deliveryCoordinates.lat, order.deliveryCoordinates.lng]}
              icon={markerIcon("order", order.statusTone, order.code.slice(-2))}
              zIndexOffset={selectedOrderId === order.id ? 900 : 200}
            >
              <Popup>
                <strong>{order.code}</strong>
                <br />
                {order.recipient?.name}
                <br />
                {order.region} - {order.statusLabel}
              </Popup>
            </Marker>
          ))}

          {drivers.map((driver) => {
            const position = driver.position || driver.currentPosition;
            if (!position) return null;
            return (
              <Marker
                key={driver.id}
                position={[position.lat, position.lng]}
                icon={markerIcon("driver", driver.status, driver.name.slice(0, 1))}
                zIndexOffset={600}
              >
                <Popup>
                  <strong>{driver.name}</strong>
                  <br />
                  {driver.vehicle?.plate || driver.region}
                  <br />
                  {driver.status === "online" ? "Online" : "Offline"}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="map-overlay-panel">
          <span>
            <Bi name="layers-fill" />
            OpenStreetMap
          </span>
          <span>
            <Bi name="mouse2-fill" />
            Arraste e aproxime
          </span>
        </div>
      </div>

      <div className="map-legend">
        <span>
          <i className="legend-dot driver" />
          Motorista
        </span>
        <span>
          <i className="legend-dot order" />
          Pedido
        </span>
        <span>
          <i className="legend-dot failure" />
          Falha
        </span>
        <span>
          <i className="legend-line" />
          Rota
        </span>
      </div>
    </section>
  );
}

function LoginScreen({ onLogin, busy, error }) {
  const [selected, setSelected] = useState(profiles[0]);

  return (
    <main className="login-screen">
      <section className="login-brand-panel">
        <div className="login-brand-row">
          <LogoMark invert />
          <span>Fleet operations suite</span>
        </div>
        <div className="login-copy">
          <p className="eyebrow">Centro de comando logistico</p>
          <h1>Rastreamento de entregas em tempo real.</h1>
          <p className="login-subtitle">
            Uma visao limpa para acompanhar motoristas, rotas, ocorrencias e entregas criticas sem perder o controle da operacao.
          </p>
          <div className="login-signal-grid">
            <article>
              <Bi name="activity" />
              <strong>98.4%</strong>
              <span>SLA hoje</span>
            </article>
            <article>
              <Bi name="truck-front-fill" />
              <strong>04</strong>
              <span>Motoristas</span>
            </article>
            <article>
              <Bi name="geo-alt-fill" />
              <strong>05</strong>
              <span>Regioes</span>
            </article>
          </div>
        </div>
        <LoginMapPreview />
      </section>

      <section className="login-panel">
        <div className="login-panel-head">
          <LogoMark compact />
          <div>
            <span>Entrar no workspace</span>
            <h2>Selecionar usuario</h2>
          </div>
        </div>

        <div className="profile-grid">
          {profiles.map((profile) => {
            return (
              <button
                type="button"
                key={profile.role}
                className={selected.role === profile.role ? "profile-option active" : "profile-option"}
                onClick={() => setSelected(profile)}
              >
                <Bi name={profile.iconName} />
                <span>{profile.label}</span>
              </button>
            );
          })}
        </div>

        <div className="credential-box">
          <b>Credenciais de demo</b>
          <span>
            <Bi name="envelope-at" />
            {selected.email}
          </span>
          <span>
            <Bi name="key-fill" />
            {selected.password}
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          type="button"
          className="primary-action"
          disabled={busy}
          onClick={() => onLogin(selected)}
        >
          <Bi name="arrow-right-circle-fill" />
          {busy ? "Entrando..." : `Entrar como ${selected.label}`}
        </button>
        <p className="login-security-note">
          <Bi name="shield-check" />
          Ambiente demonstrativo com perfis e permissoes separadas.
        </p>
      </section>
    </main>
  );
}

function Shell({ auth, activeView, setActiveView, onLogout, children }) {
  const allowed = roleViews[auth.user.role] || [];
  const items = navItems.filter((item) => allowed.includes(item.id));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <LogoMark invert />
        </div>

        <nav className="nav-list">
          {items.map((item) => {
            return (
              <button
                type="button"
                key={item.id}
                className={activeView === item.id ? "nav-item active" : "nav-item"}
                onClick={() => setActiveView(item.id)}
                title={item.label}
              >
                <Bi name={item.iconName} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <Bi name="person-workspace" />
            <div>
              <strong>{auth.user.name}</strong>
              <span>{auth.user.roleLabel}</span>
            </div>
          </div>
          <button type="button" className="ghost-action full" onClick={onLogout}>
            <Bi name="box-arrow-right" />
            Sair
          </button>
        </div>
      </aside>
      <section className="workspace">{children}</section>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
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

function LiveMapView({ overview, drivers, orders, metadata }) {
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

function MetricCard({ icon: Icon, iconName, label, value, tone, suffix }) {
  return (
    <article className={`metric-card ${tone}`}>
      {iconName ? <Bi name={iconName} /> : <Icon size={20} />}
      <span>{label}</span>
      <strong>{value}{suffix || ""}</strong>
    </article>
  );
}

function OrdersView({ metadata, drivers, orders, selectedOrder, setSelectedOrder, onFilter }) {
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

function OrderDetail({ order, metadata }) {
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

function CreateOrderView({ metadata, token, onCreated }) {
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

function AssignmentView({ token, metadata, drivers, orders, onChanged }) {
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

function RoutesView({ auth, token, drivers, orders, metadata }) {
  const initialDriver = auth.user.role === "driver" ? auth.user.driverId : drivers[0]?.id;
  const [driverId, setDriverId] = useState(initialDriver || "");
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const selectedDriver = drivers.find((driver) => driver.id === driverId);

  useEffect(() => {
    if (!driverId && initialDriver) setDriverId(initialDriver);
  }, [driverId, initialDriver]);

  async function optimize() {
    if (!driverId) return;
    setBusy(true);
    try {
      const data = await request("/routes/optimize", {
        token,
        method: "POST",
        body: { driverId }
      });
      setRoute(data.route);
    } finally {
      setBusy(false);
    }
  }

  const routeOrders = route?.stops || orders.filter((order) => order.driverId === driverId);

  return (
    <>
      <PageHeader
        title="Rota otimizada"
        subtitle="Sequencia de paradas calculada por proximidade"
        action={
          <div className="header-actions">
            {auth.user.role !== "driver" && (
              <select value={driverId} onChange={(event) => setDriverId(event.target.value)}>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="primary-action" onClick={optimize} disabled={busy}>
              <Route size={18} />
              {busy ? "Calculando..." : "Otimizar"}
            </button>
          </div>
        }
      />
      <div className="split-layout map-layout">
        <MapSurface drivers={selectedDriver ? [{ ...selectedDriver, position: selectedDriver.currentPosition }] : []} orders={routeOrders} route={route} mode="routes" />
        <aside className="side-panel">
          <h3>{selectedDriver?.name || "Motorista"}</h3>
          {route && (
            <div className="route-summary">
              <strong>{route.distanceKm} km</strong>
              <span>{route.etaMinutes} min estimados</span>
            </div>
          )}
          <div className="stop-list">
            {routeOrders.length ? (
              routeOrders.map((order, index) => (
                <article key={order.id}>
                  <b>{order.sequence || index + 1}</b>
                  <div>
                    <strong>{order.code}</strong>
                    <span>{order.deliveryAddress}</span>
                  </div>
                  <StatusBadge metadata={metadata} status={order.status} />
                </article>
              ))
            ) : (
              <EmptyState compact icon={Route} title="Sem paradas ativas" />
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function KpiView({ token }) {
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

function HeatmapView({ token, drivers, orders }) {
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

function ReportView({ token }) {
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

function DriverMobileView({ auth, token, metadata, orders, onChanged, goProof }) {
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

function ProofView({ auth, token, metadata, orders, selectedOrder, onSubmitted }) {
  const proofOrders = orders.filter((order) => {
    const visible = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(order.status);
    if (!visible) return false;
    if (auth.user.role === "driver") return order.driverId === auth.user.driverId;
    return true;
  });
  const [orderId, setOrderId] = useState(selectedOrder?.id || proofOrders[0]?.id || "");
  const [receiverName, setReceiverName] = useState(selectedOrder?.recipient?.name || "");
  const [document, setDocument] = useState(selectedOrder?.recipient?.document || "");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const order = proofOrders.find((item) => item.id === orderId) || selectedOrder || proofOrders[0];

  useEffect(() => {
    if (selectedOrder?.id) {
      setOrderId(selectedOrder.id);
      setReceiverName(selectedOrder.recipient?.name || "");
      setDocument(selectedOrder.recipient?.document || "");
    }
  }, [selectedOrder]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(320, Math.floor(rect.width * window.devicePixelRatio));
    canvas.height = Math.floor(170 * window.devicePixelRatio);
    const context = canvas.getContext("2d");
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.lineWidth = 2.6;
    context.lineCap = "round";
    context.strokeStyle = "#12263f";
  }, [orderId]);

  function pointerPosition(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function startDraw(event) {
    drawingRef.current = true;
    const context = canvasRef.current.getContext("2d");
    const point = pointerPosition(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function moveDraw(event) {
    if (!drawingRef.current) return;
    const context = canvasRef.current.getContext("2d");
    const point = pointerPosition(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDraw() {
    drawingRef.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  async function submit(event) {
    event.preventDefault();
    if (!order) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("receiverName", receiverName || order.recipient?.name || "");
      formData.append("document", document || order.recipient?.document || "");
      formData.append("signature", canvasRef.current.toDataURL("image/png"));
      if (photo) formData.append("photo", photo);

      const data = await request(`/orders/${order.id}/proof`, {
        token,
        method: "POST",
        body: formData
      });
      onSubmitted(data.order);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Comprovante de entrega" subtitle="Foto, assinatura digital e recebedor" />
      {order ? (
        <div className="proof-layout">
          <OrderDetail order={order} metadata={metadata} />
          <form className="proof-form" onSubmit={submit}>
            <label>
              Pedido
              <select value={orderId} onChange={(event) => setOrderId(event.target.value)}>
                {proofOrders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.recipient?.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Recebedor
              <input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} />
            </label>
            <label>
              Documento
              <input value={document} onChange={(event) => setDocument(event.target.value)} />
            </label>
            <label>
              Foto
              <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
            </label>
            <div className="signature-box">
              <div>
                <span>Assinatura</span>
                <button type="button" className="ghost-action" onClick={clearSignature}>
                  <PenLine size={15} />
                  Limpar
                </button>
              </div>
              <canvas
                ref={canvasRef}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={stopDraw}
                onPointerLeave={stopDraw}
              />
            </div>
            <button type="submit" className="primary-action" disabled={busy}>
              <Camera size={18} />
              {busy ? "Enviando..." : "Salvar comprovante"}
            </button>
          </form>
        </div>
      ) : (
        <EmptyState icon={Camera} title="Nenhum pedido disponivel" />
      )}
    </>
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("luxtrack-auth");
    return saved ? JSON.parse(saved) : null;
  });
  const [activeView, setActiveView] = useState(auth?.user?.role === "driver" ? "driver" : "live");
  const [metadata, setMetadata] = useState({ statuses: {}, regions: [] });
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [overview, setOverview] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const visibleNav = useMemo(() => roleViews[auth?.user?.role] || [], [auth]);

  async function login(profile) {
    setLoginBusy(true);
    setLoginError("");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: {
          email: profile.email,
          password: profile.password,
          role: profile.role
        }
      });
      setAuth(data);
      setActiveView(data.user.role === "driver" ? "driver" : "live");
      localStorage.setItem("luxtrack-auth", JSON.stringify(data));
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("luxtrack-auth");
    setAuth(null);
    setOrders([]);
    setDrivers([]);
    setOverview(null);
  }

  async function loadOrders(filters = {}) {
    if (!auth) return [];
    const params = new URLSearchParams({ limit: "100" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const data = await request(`/orders?${params.toString()}`, { token: auth.token });
    setOrders(data.orders);
    if (!selectedOrder && data.orders[0]) setSelectedOrder(data.orders[0]);
    return data.orders;
  }

  async function loadBase() {
    if (!auth) return;
    try {
      const [meta, driverData, overviewData] = await Promise.all([
        request("/metadata", { token: auth.token }),
        request("/drivers", { token: auth.token }),
        request("/overview", { token: auth.token })
      ]);
      setMetadata(meta);
      setDrivers(driverData.drivers);
      setOverview(overviewData);
      await loadOrders();
    } catch (error) {
      setToast(error.message);
    }
  }

  async function refreshAfterChange(message = "Atualizado") {
    await loadBase();
    setToast(message);
  }

  useEffect(() => {
    if (auth) loadBase();
  }, [auth?.token]);

  useEffect(() => {
    if (!auth) return undefined;
    const socket = new WebSocket(wsLocationsUrl());
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "locations") {
        setDrivers((current) => {
          const fallback = current.map((driver) => ({ ...driver, position: driver.currentPosition }));
          return data.drivers.map((driver) => {
            const known = current.find((item) => item.id === driver.id);
            return { ...known, ...driver, currentPosition: driver.position };
          }) || fallback;
        });
      }
    };
    return () => socket.close();
  }, [auth?.token]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!auth) {
    return <LoginScreen onLogin={login} busy={loginBusy} error={loginError} />;
  }

  function handleCreated(order) {
    setSelectedOrder(order);
    setActiveView("orders");
    refreshAfterChange("Pedido criado");
  }

  function handleProof(order) {
    setSelectedOrder(order);
    setActiveView("proof");
  }

  const routeOrders = orders.filter((order) => ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(order.status));

  return (
    <Shell auth={auth} activeView={activeView} setActiveView={setActiveView} onLogout={logout}>
      {toast && <div className="toast">{toast}</div>}
      {!visibleNav.includes(activeView) && <EmptyState icon={ShieldCheck} title="Perfil sem acesso a esta tela" />}
      {activeView === "live" && (
        <LiveMapView overview={overview} drivers={drivers} orders={orders} metadata={metadata} />
      )}
      {activeView === "orders" && (
        <OrdersView
          metadata={metadata}
          drivers={drivers}
          orders={orders}
          selectedOrder={selectedOrder}
          setSelectedOrder={setSelectedOrder}
          onFilter={loadOrders}
        />
      )}
      {activeView === "create" && (
        <CreateOrderView metadata={metadata} token={auth.token} onCreated={handleCreated} />
      )}
      {activeView === "assign" && (
        <AssignmentView
          token={auth.token}
          metadata={metadata}
          drivers={drivers}
          orders={orders}
          onChanged={() => refreshAfterChange("Pedido atribuido")}
        />
      )}
      {activeView === "routes" && (
        <RoutesView auth={auth} token={auth.token} drivers={drivers} orders={routeOrders} metadata={metadata} />
      )}
      {activeView === "kpis" && <KpiView token={auth.token} />}
      {activeView === "heatmap" && <HeatmapView token={auth.token} drivers={drivers} orders={orders} />}
      {activeView === "report" && <ReportView token={auth.token} />}
      {activeView === "driver" && (
        <DriverMobileView
          auth={auth}
          token={auth.token}
          metadata={metadata}
          orders={orders}
          onChanged={() => refreshAfterChange("Parada atualizada")}
          goProof={handleProof}
        />
      )}
      {activeView === "proof" && (
        <ProofView
          auth={auth}
          token={auth.token}
          metadata={metadata}
          orders={orders}
          selectedOrder={selectedOrder}
          onSubmitted={(order) => {
            setSelectedOrder(order);
            refreshAfterChange("Comprovante salvo");
          }}
        />
      )}
    </Shell>
  );
}
