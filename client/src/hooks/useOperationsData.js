import { useEffect, useState } from "react";
import { request, wsLocationsUrl } from "../api.js";

export function useOperationsData(auth, setToast) {
  const [metadata, setMetadata] = useState({ statuses: {}, regions: [] });
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [overview, setOverview] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  async function loadOrders(filters = {}) {
    if (!auth) return [];
    const params = new URLSearchParams({ limit: "100" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const data = await request(`/orders?${params.toString()}`, { token: auth.token });
    setOrders(data.orders);
    setSelectedOrder((current) => current || data.orders[0] || null);
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

  function clearOperationsData() {
    setOrders([]);
    setDrivers([]);
    setOverview(null);
    setSelectedOrder(null);
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

  return {
    metadata,
    drivers,
    orders,
    overview,
    selectedOrder,
    setSelectedOrder,
    loadOrders,
    refreshAfterChange,
    clearOperationsData
  };
}
