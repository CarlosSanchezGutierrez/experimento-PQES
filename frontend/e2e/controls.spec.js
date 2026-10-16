import { test, expect } from "@playwright/test";
import { useSession } from "./fixtures.js";

test("HU-15: muestra resultado explícito y conserva el historial de evaluaciones", async ({ page }) => {
  await useSession(page, "AUDITOR", 5);
  await page.route("**/api/risks/**", (route) => route.fulfill({ json: { risks: [{
    id: "RSK-15", title: "Conciliación", area: "Finanzas", level: "Medio"
  }] } }));
  await page.route("**/api/controls/**", (route) => route.fulfill({ json: { controls: [{
    id: "CTL-15", title: "Revisión mensual", description: "Control de conciliación mensual.",
    type: "DETECTIVE", frequency: "Monthly", ownerName: "Auditoría", ownerId: 5,
    riskIds: ["RSK-15"], effectiveness: 2, effectivenessResult: "INEFFECTIVE",
    evaluations: [
      { version: 1, rating: 4, result: "EFFECTIVE", note: "La muestra inicial no tenía diferencias.", assessedBy: { username: "qa" }, assessedAt: "2026-10-01T00:00:00Z" },
      { version: 2, rating: 2, result: "INEFFECTIVE", note: "La muestra nueva presenta excepciones.", assessedBy: { username: "qa" }, assessedAt: "2026-10-16T00:00:00Z" }
    ]
  }] } }));
  await page.route("**/api/findings/**", (route) => route.fulfill({ json: { findings: [] } }));

  await page.goto("/controles");
  const card = page.locator(".control-card").filter({ hasText: "Revisión mensual" });
  await expect(card).toContainText("Inefectivo");
  await card.locator("summary").click();
  await expect(card).toContainText("Versión 1 · 4/5 · Efectivo");
  await expect(card).toContainText("Versión 2 · 2/5 · Inefectivo");
});
