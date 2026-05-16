export const profiles = [
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

export const statusOrder = [
  "CREATED",
  "GEOCODED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELED"
];

export const roleViews = {
  admin: ["live", "orders", "create", "assign", "routes", "kpis", "heatmap", "report", "driver", "proof"],
  dispatcher: ["live", "orders", "create", "assign", "routes", "kpis", "heatmap", "report"],
  driver: ["driver", "routes", "proof"]
};

export const navItems = [
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
