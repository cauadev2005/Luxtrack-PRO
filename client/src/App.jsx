import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "./components/common.jsx";
import { roleViews } from "./constants.js";
import { useAuth } from "./hooks/useAuth.js";
import { useOperationsData } from "./hooks/useOperationsData.js";
import { useToast } from "./hooks/useToast.js";
import { Shell } from "./layout/Shell.jsx";
import { LoginScreen } from "./views/LoginScreen.jsx";
import {
  AssignmentView,
  CreateOrderView,
  DriverMobileView,
  HeatmapView,
  KpiView,
  LiveMapView,
  OrdersView,
  ProofView,
  ReportView,
  RoutesView
} from "./views/AppViews.jsx";

export default function App() {
  const { auth, login, logout: logoutAuth, loginBusy, loginError } = useAuth();
  const { toast, setToast } = useToast();
  const [activeView, setActiveView] = useState(auth?.user?.role === "driver" ? "driver" : "live");
  const {
    metadata,
    drivers,
    orders,
    overview,
    selectedOrder,
    setSelectedOrder,
    loadOrders,
    refreshAfterChange,
    clearOperationsData
  } = useOperationsData(auth, setToast);

  const visibleNav = useMemo(() => roleViews[auth?.user?.role] || [], [auth]);

  async function handleLogin(profile) {
    const data = await login(profile);
    if (data) {
      setActiveView(data.user.role === "driver" ? "driver" : "live");
    }
  }

  function logout() {
    logoutAuth();
    clearOperationsData();
  }

  if (!auth) {
    return <LoginScreen onLogin={handleLogin} busy={loginBusy} error={loginError} />;
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
