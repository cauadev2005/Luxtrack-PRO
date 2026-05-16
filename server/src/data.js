export { ROLE_LABELS, STATUSES, STATUS_FLOW } from "./data/constants.js";
export { deterministicGeocode, haversineKm } from "./data/geo.js";
import { deterministicGeocode } from "./data/geo.js";

export function nowIso() {
  return new Date().toISOString();
}

export function isoHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const regions = {
  Norte: { lat: -23.493, lng: -46.625 },
  Sul: { lat: -23.668, lng: -46.642 },
  Leste: { lat: -23.545, lng: -46.47 },
  Oeste: { lat: -23.557, lng: -46.72 },
  Centro: { lat: -23.548, lng: -46.638 }
};

function regionAddress(region, street, number) {
  return `${street}, ${number} - ${region}, Sao Paulo - SP`;
}

function buildHistory(orderId, statuses, startHoursAgo) {
  return statuses.map((status, index) => ({
    id: `hist-${orderId}-${index + 1}`,
    orderId,
    fromStatus: index === 0 ? null : statuses[index - 1],
    toStatus: status,
    actor: index < 2 ? "Sistema" : index === 2 ? "Despachante" : "Motorista",
    note:
      status === "GEOCODED"
        ? "Enderecos convertidos em coordenadas"
        : status === "ASSIGNED"
          ? "Pedido vinculado ao motorista"
          : status === "FAILED"
            ? "Ocorrencia registrada durante a entrega"
            : "Transicao do pipeline",
    at: isoHoursAgo(startHoursAgo - index * 1.4)
  }));
}

function makeOrder({
  id,
  code,
  status,
  region,
  driverId,
  street,
  number,
  customerName,
  recipientName,
  dayOffset,
  distanceKm,
  costEstimate,
  history
}) {
  const pickupAddress = "Av. Paulista, 1000 - Bela Vista, Sao Paulo - SP";
  const deliveryAddress = regionAddress(region, street, number);
  const scheduledFor = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  const dueAt = new Date(scheduledFor.getTime() + 6 * 60 * 60 * 1000);
  const histories = buildHistory(id, history, 42 - dayOffset * 6);
  const deliveredAt =
    status === "DELIVERED"
      ? new Date(new Date(histories.at(-1).at).getTime() + 35 * 60 * 1000).toISOString()
      : null;

  return {
    id,
    companyId: "company-lux",
    code,
    status,
    customerName,
    customerEmail: `${customerName.toLowerCase().replaceAll(" ", ".")}@cliente.com`,
    customerPhone: "+55 11 90000-0000",
    recipient: {
      name: recipientName,
      document: "CPF 000.000.000-00",
      phone: "+55 11 98888-0000"
    },
    pickupAddress,
    deliveryAddress,
    pickupCoordinates: deterministicGeocode(pickupAddress),
    deliveryCoordinates: {
      lat: Number((regions[region].lat + (Math.random() - 0.5) / 35).toFixed(6)),
      lng: Number((regions[region].lng + (Math.random() - 0.5) / 35).toFixed(6))
    },
    region,
    driverId,
    scheduledFor: scheduledFor.toISOString(),
    dueAt: dueAt.toISOString(),
    deliveredAt,
    distanceKm,
    costEstimate,
    priority: status === "FAILED" ? "Alta" : dayOffset <= 0 ? "Normal" : "Baixa",
    proof: null,
    createdAt: histories[0].at,
    updatedAt: histories.at(-1).at,
    deletedAt: null,
    history: histories
  };
}

const orders = [
  makeOrder({
    id: "order-001",
    code: "LUX-10418",
    status: "IN_TRANSIT",
    region: "Centro",
    driverId: "driver-ana",
    street: "Rua Boa Vista",
    number: 84,
    customerName: "Solaris Farma",
    recipientName: "Marina Leal",
    dayOffset: 0,
    distanceKm: 12.4,
    costEstimate: 82,
    history: ["CREATED", "GEOCODED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"]
  }),
  makeOrder({
    id: "order-002",
    code: "LUX-10419",
    status: "ASSIGNED",
    region: "Oeste",
    driverId: "driver-ana",
    street: "Rua dos Pinheiros",
    number: 1185,
    customerName: "Nexa Equipamentos",
    recipientName: "Rafael Ortiz",
    dayOffset: 0,
    distanceKm: 19.7,
    costEstimate: 124,
    history: ["CREATED", "GEOCODED", "ASSIGNED"]
  }),
  makeOrder({
    id: "order-003",
    code: "LUX-10420",
    status: "GEOCODED",
    region: "Sul",
    driverId: null,
    street: "Av. Santo Amaro",
    number: 3200,
    customerName: "Mercato Prime",
    recipientName: "Camila Torres",
    dayOffset: 0,
    distanceKm: 16.1,
    costEstimate: 98,
    history: ["CREATED", "GEOCODED"]
  }),
  makeOrder({
    id: "order-004",
    code: "LUX-10421",
    status: "DELIVERED",
    region: "Leste",
    driverId: "driver-bruno",
    street: "Av. Celso Garcia",
    number: 4820,
    customerName: "Onix Labs",
    recipientName: "Joao Becker",
    dayOffset: -1,
    distanceKm: 23.8,
    costEstimate: 138,
    history: ["CREATED", "GEOCODED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]
  }),
  makeOrder({
    id: "order-005",
    code: "LUX-10422",
    status: "FAILED",
    region: "Norte",
    driverId: "driver-bruno",
    street: "Rua Voluntarios da Patria",
    number: 2380,
    customerName: "Atlas Foods",
    recipientName: "Patricia Melo",
    dayOffset: -1,
    distanceKm: 14.3,
    costEstimate: 91,
    history: ["CREATED", "GEOCODED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "FAILED"]
  }),
  makeOrder({
    id: "order-006",
    code: "LUX-10423",
    status: "DELIVERED",
    region: "Centro",
    driverId: "driver-camila",
    street: "Rua Libero Badaro",
    number: 377,
    customerName: "Aurora Home",
    recipientName: "Helena Prado",
    dayOffset: -2,
    distanceKm: 9.2,
    costEstimate: 64,
    history: ["CREATED", "GEOCODED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]
  }),
  makeOrder({
    id: "order-007",
    code: "LUX-10424",
    status: "ASSIGNED",
    region: "Leste",
    driverId: "driver-camila",
    street: "Rua Tuiuti",
    number: 1540,
    customerName: "Viva Pet",
    recipientName: "Lucas Dantas",
    dayOffset: 1,
    distanceKm: 21.5,
    costEstimate: 131,
    history: ["CREATED", "GEOCODED", "ASSIGNED"]
  }),
  makeOrder({
    id: "order-008",
    code: "LUX-10425",
    status: "GEOCODED",
    region: "Oeste",
    driverId: null,
    street: "Av. Reboucas",
    number: 3970,
    customerName: "Blend Beauty",
    recipientName: "Bianca Sousa",
    dayOffset: 1,
    distanceKm: 13.6,
    costEstimate: 88,
    history: ["CREATED", "GEOCODED"]
  }),
  makeOrder({
    id: "order-009",
    code: "LUX-10426",
    status: "PICKED_UP",
    region: "Sul",
    driverId: "driver-diego",
    street: "Rua Afonso Braz",
    number: 620,
    customerName: "Indigo Tech",
    recipientName: "Renata Vidal",
    dayOffset: 0,
    distanceKm: 18.8,
    costEstimate: 116,
    history: ["CREATED", "GEOCODED", "ASSIGNED", "PICKED_UP"]
  }),
  makeOrder({
    id: "order-010",
    code: "LUX-10427",
    status: "CREATED",
    region: "Norte",
    driverId: null,
    street: "Av. Braz Leme",
    number: 945,
    customerName: "Cobalto Retail",
    recipientName: "Mateus Lima",
    dayOffset: 2,
    distanceKm: 15.4,
    costEstimate: 96,
    history: ["CREATED"]
  })
];

export const db = {
  companies: [
    {
      id: "company-lux",
      name: "LuxTrack Express",
      document: "12.345.678/0001-90",
      timezone: "America/Sao_Paulo",
      createdAt: isoHoursAgo(2400)
    }
  ],
  users: [
    {
      id: "user-admin",
      companyId: "company-lux",
      name: "Helena Martins",
      email: "admin@luxtrack.pro",
      password: "lux123",
      role: "admin",
      driverId: null
    },
    {
      id: "user-dispatcher",
      companyId: "company-lux",
      name: "Gustavo Neri",
      email: "despachante@luxtrack.pro",
      password: "lux123",
      role: "dispatcher",
      driverId: null
    },
    {
      id: "user-driver",
      companyId: "company-lux",
      name: "Ana Costa",
      email: "motorista@luxtrack.pro",
      password: "lux123",
      role: "driver",
      driverId: "driver-ana"
    }
  ],
  drivers: [
    {
      id: "driver-ana",
      companyId: "company-lux",
      name: "Ana Costa",
      phone: "+55 11 95555-0101",
      region: "Centro/Oeste",
      status: "online",
      vehicleId: "vehicle-001",
      currentPosition: { lat: -23.5489, lng: -46.6486, heading: 82, speed: 34 },
      updatedAt: nowIso()
    },
    {
      id: "driver-bruno",
      companyId: "company-lux",
      name: "Bruno Reis",
      phone: "+55 11 95555-0102",
      region: "Norte/Leste",
      status: "online",
      vehicleId: "vehicle-002",
      currentPosition: { lat: -23.5155, lng: -46.592, heading: 128, speed: 27 },
      updatedAt: nowIso()
    },
    {
      id: "driver-camila",
      companyId: "company-lux",
      name: "Camila Rocha",
      phone: "+55 11 95555-0103",
      region: "Centro/Leste",
      status: "online",
      vehicleId: "vehicle-003",
      currentPosition: { lat: -23.5572, lng: -46.5225, heading: 266, speed: 42 },
      updatedAt: nowIso()
    },
    {
      id: "driver-diego",
      companyId: "company-lux",
      name: "Diego Santos",
      phone: "+55 11 95555-0104",
      region: "Sul",
      status: "offline",
      vehicleId: "vehicle-004",
      currentPosition: { lat: -23.6351, lng: -46.6601, heading: 11, speed: 0 },
      updatedAt: isoHoursAgo(1.7)
    }
  ],
  vehicles: [
    {
      id: "vehicle-001",
      companyId: "company-lux",
      plate: "LUX1A24",
      model: "Fiat Fiorino",
      capacityKg: 650,
      driverId: "driver-ana",
      odometerKm: 42180
    },
    {
      id: "vehicle-002",
      companyId: "company-lux",
      plate: "LUX2B91",
      model: "Renault Master",
      capacityKg: 1420,
      driverId: "driver-bruno",
      odometerKm: 66890
    },
    {
      id: "vehicle-003",
      companyId: "company-lux",
      plate: "LUX3C77",
      model: "VW Delivery",
      capacityKg: 1850,
      driverId: "driver-camila",
      odometerKm: 58820
    },
    {
      id: "vehicle-004",
      companyId: "company-lux",
      plate: "LUX4D15",
      model: "Honda CG Cargo",
      capacityKg: 120,
      driverId: "driver-diego",
      odometerKm: 19120
    }
  ],
  orders,
  statusHistory: orders.flatMap((order) => order.history),
  gpsPositions: [],
  occurrences: [
    {
      id: "occ-001",
      companyId: "company-lux",
      orderId: "order-005",
      driverId: "driver-bruno",
      type: "Cliente ausente",
      note: "Portaria informou que o destinatario retorna apos as 18h.",
      lat: -23.493,
      lng: -46.625,
      createdAt: isoHoursAgo(6)
    }
  ],
  notifications: []
};
