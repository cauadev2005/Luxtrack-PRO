import { AlertTriangle, BarChart3, Camera, CheckCircle2, ClipboardList, FileDown, Filter, Navigation, PenLine, Plus, Route, Search, Truck, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openMonthlyPdf, request } from "../api.js";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "../components/common.jsx";
import { MapSurface } from "../components/MapSurface.jsx";
import { statusOrder } from "../constants.js";
import { currency, formatDate, formatDateTime, statusMeta } from "../utils/formatters.js";
import { OrderDetail } from "./OrderDetail.jsx";

export function ProofView({ auth, token, metadata, orders, selectedOrder, onSubmitted }) {
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
