export const STATUSES = {
  CREATED: { label: "Criado", tone: "neutral" },
  GEOCODED: { label: "Geocodificado", tone: "info" },
  ASSIGNED: { label: "Atribuido", tone: "warning" },
  PICKED_UP: { label: "Coletado", tone: "info" },
  IN_TRANSIT: { label: "Em rota", tone: "info" },
  DELIVERED: { label: "Entregue", tone: "success" },
  FAILED: { label: "Falha", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "neutral" }
};

export const STATUS_FLOW = {
  CREATED: ["GEOCODED", "CANCELED"],
  GEOCODED: ["ASSIGNED", "CANCELED"],
  ASSIGNED: ["PICKED_UP", "FAILED", "CANCELED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  FAILED: ["ASSIGNED", "CANCELED"],
  DELIVERED: [],
  CANCELED: []
};

export const ROLE_LABELS = {
  admin: "Admin",
  dispatcher: "Despachante",
  driver: "Motorista"
};
