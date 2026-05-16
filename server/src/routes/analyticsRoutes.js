import PDFDocument from "pdfkit";
import { db } from "../data.js";
import { authorize } from "../middlewares/auth.js";
import { reportForMonth, scopedOrders } from "../services/luxtrackService.js";

export function registerAnalyticsRoutes(app) {
  app.get("/api/kpis", authorize("admin", "dispatcher"), (req, res) => {
        const month = req.query.month || new Date().toISOString().slice(0, 7);
        res.json({ report: reportForMonth(req.user, month) });
      });

      app.get("/api/heatmap", authorize("admin", "dispatcher"), (req, res) => {
        const orders = scopedOrders(req.user);
        const points = orders.map((order) => ({
          id: order.id,
          code: order.code,
          region: order.region,
          lat: order.deliveryCoordinates.lat,
          lng: order.deliveryCoordinates.lng,
          weight: order.status === "FAILED" ? 1 : order.status === "DELIVERED" ? 0.55 : 0.35,
          kind: order.status === "FAILED" ? "failure" : "delivery",
          status: order.status
        }));
        const regions = reportForMonth(req.user, new Date().toISOString().slice(0, 7)).byRegion;
        res.json({ points, regions });
      });

  app.get("/api/reports/monthly", authorize("admin", "dispatcher"), (req, res) => {
        res.json({ report: reportForMonth(req.user, req.query.month) });
      });

      app.get("/api/reports/monthly.pdf", authorize("admin", "dispatcher"), (req, res) => {
        const report = reportForMonth(req.user, req.query.month);
        const company = db.companies.find((item) => item.id === req.user.companyId);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="luxtrack-relatorio-${report.month}.pdf"`
        );

        const doc = new PDFDocument({ margin: 48, size: "A4" });
        doc.pipe(res);
        doc.fontSize(20).text("LuxTrack Pro", { continued: true }).fontSize(12).text("  Relatorio mensal");
        doc.moveDown(0.6);
        doc.fontSize(10).fillColor("#526071").text(`${company?.name || "Empresa"} | Periodo: ${report.month}`);
        doc.moveDown();
        doc.fillColor("#121826").fontSize(14).text("Resumo operacional");
        doc.moveDown(0.4);
        doc.fontSize(11);
        doc.text(`Pedidos: ${report.totals.orders}`);
        doc.text(`Entregues: ${report.totals.delivered}`);
        doc.text(`Falhas: ${report.totals.failed}`);
        doc.text(`Taxa no prazo: ${report.totals.onTimeRate}%`);
        doc.text(`Distancia rodada: ${report.totals.distanceKm} km`);
        doc.text(`Custo por km: R$ ${report.totals.costPerKm}`);
        doc.moveDown();
        doc.fontSize(14).text("Entregas por motorista");
        doc.moveDown(0.4);
        report.byDriver.forEach((driver) => {
          doc
            .fontSize(10)
            .text(
              `${driver.name}: ${driver.delivered} entregas, ${driver.failed} falhas, ${driver.distanceKm} km`
            );
        });
        doc.moveDown();
        doc.fontSize(14).text("Regioes");
        doc.moveDown(0.4);
        report.byRegion.forEach((region) => {
          doc
            .fontSize(10)
            .text(
              `${region.region}: ${region.orders} pedidos, ${region.delivered} entregues, ${region.failed} falhas`
            );
        });
        doc.moveDown();
        doc
          .fontSize(8)
          .fillColor("#6b7280")
          .text(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
        doc.end();
      });
}
