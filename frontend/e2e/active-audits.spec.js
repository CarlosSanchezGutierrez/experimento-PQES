import { test, expect } from "@playwright/test";
import { useSession } from "./fixtures.js";

test("HU-09: matrix selection reveals linked risks, controls and audit navigation", async ({ page }) => {
  await useSession(page, "DIRECTOR", 2);
  const audit = {
    id: "AUD-451", title: "Auditoría operativa", objective: "Revisar controles",
    area: "Operaciones", responsible: "Auditora", likelihood: 3, impact: 2,
    status: "ACTIVE", startedAt: "2026-10-01T00:00:00.000Z"
  };
  await page.route("**/api/planning/active", (route) => route.fulfill({ json: { audits: [audit] } }));
  await page.route("**/api/planning", (route) => route.fulfill({ json: { proposals: [audit] } }));
  await page.route("**/api/risks/**", (route) => route.fulfill({ json: { risks: [{
    id: "RSK-451", title: "Riesgo operativo", description: "Exposición registrada",
    linkedAuditId: audit.id, level: "Alto", score: 6
  }] } }));
  await page.route("**/api/controls/**", (route) => route.fulfill({ json: { controls: [{
    id: "CTL-451", title: "Revisión mensual", riskIds: ["RSK-451"], effectiveness: 4
  }] } }));

  await page.goto("/auditorias-activas");
  await page.getByRole("button", { name: "Ver auditorías con probabilidad Alta e impacto Media: 1" }).click();

  const detail = page.getByRole("region", { name: "Detalle de la celda seleccionada" });
  await expect(detail.getByText("Riesgo operativo")).toBeVisible();
  await expect(detail.getByText(/Revisión mensual.*4\/5/)).toBeVisible();
  await detail.getByRole("link", { name: "Ir a la auditoría AUD-451" }).click();
  await expect(page).toHaveURL(/#audit-AUD-451$/);
  await expect(page.locator("#audit-AUD-451")).toBeVisible();
});
