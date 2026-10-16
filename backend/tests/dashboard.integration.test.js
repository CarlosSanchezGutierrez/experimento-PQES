const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "dashboard-integration-test-secret-32-characters";

const app = require("../server");
const { startTestServer } = require("./helpers/testServer");

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const json = (token, method = "GET", body) => ({
  method,
  headers: {
    Authorization: `Bearer ${token}`,
    ...(body ? { "Content-Type": "application/json" } : {})
  },
  ...(body ? { body: JSON.stringify(body) } : {})
});

test("HU-07: dashboard data is authenticated and scoped according to the user's role", async (context) => {
  const baseUrl = await startTestServer(context, app);

  const anonymous = await fetch(`${baseUrl}/api/dashboard`);
  assert.equal(anonymous.status, 401);

  const proposalResponse = await fetch(`${baseUrl}/api/planning`, json(tokenFor(3), "POST", {
    title: `HU-07 assigned ${Date.now()}`,
    objective: "Validar la vista de carga por usuario.",
    scope: "Auditorías asignadas al equipo.",
    justification: "Se requiere seguimiento de la carga.",
    area: "Tecnología",
    responsibleId: 5,
    likelihood: 3,
    impact: 2,
    year: 2026,
    quarter: "Q2"
  }));
  assert.equal(proposalResponse.status, 201);
  const proposal = (await proposalResponse.json()).proposal;

  const activeResponse = await fetch(`${baseUrl}/api/planning/${proposal.id}/approve`, json(tokenFor(2), "POST", { quarter: "Q2" }));
  assert.equal(activeResponse.status, 200);
  const startedResponse = await fetch(`${baseUrl}/api/planning/${proposal.id}/start`, json(tokenFor(2), "POST", {}));
  assert.equal(startedResponse.status, 200);

  const auditorResponse = await fetch(`${baseUrl}/api/dashboard`, json(tokenFor(5)));
  assert.equal(auditorResponse.status, 200);
  const auditorDashboard = await auditorResponse.json();
  assert.equal(auditorDashboard.role, "AUDITOR");
  assert.equal(auditorDashboard.scopeLabel, "Solo mis asignaciones");
  assert.ok(auditorDashboard.pendingItems.some((item) => item.id === proposal.id));
  assert.equal(auditorDashboard.permissions.canCreate, false);
  assert.equal(auditorDashboard.permissions.canApprove, false);
  assert.equal(auditorDashboard.metrics.total, 1);
  assert.equal(auditorDashboard.metrics.active, 1);
  assert.equal(auditorDashboard.riskMatrix.flat().reduce((sum, cell) => sum + cell.count, 0), 1);

  const auditorPlanningResponse = await fetch(`${baseUrl}/api/planning`, json(tokenFor(5)));
  const auditorPlanning = await auditorPlanningResponse.json();
  assert.ok(auditorPlanning.proposals.every((item) => item.responsibleId === 5));
  const auditorActiveResponse = await fetch(`${baseUrl}/api/planning/active`, json(tokenFor(5)));
  const auditorActive = await auditorActiveResponse.json();
  assert.ok(auditorActive.audits.every((item) => item.responsibleId === 5));

  const directorResponse = await fetch(`${baseUrl}/api/dashboard`, json(tokenFor(2)));
  assert.equal(directorResponse.status, 200);
  const directorDashboard = await directorResponse.json();
  assert.equal(directorDashboard.scopeLabel, "Portafolio completo");
  assert.ok(directorDashboard.metrics.total > auditorDashboard.metrics.total);
  assert.equal(directorDashboard.permissions.canApprove, true);
  assert.ok(directorDashboard.statusCounts.some((entry) => entry.status === "OPEN" && entry.count > 0));
  assert.equal(directorDashboard.riskMatrix.flat().reduce((sum, cell) => sum + cell.count, 0), 1);
});

test("HU-07/HU-09: el panel toma hallazgos reales del expediente asignado", async (context) => {
  const base = await startTestServer(context, app);
  const created = await fetch(`${base}/api/planning`, json(tokenFor(3), "POST", {
    title: `Hallazgo en panel ${Date.now()}`, objective: "Revisar conciliación del área.",
    scope: "Muestra mensual de registros.", justification: "Existen diferencias sin resolver.",
    area: "Finanzas", responsibleId: 5, likelihood: 2, impact: 2, year: 2026, quarter: "Q3"
  }));
  assert.equal(created.status, 201);
  const proposal = (await created.json()).proposal;
  const riskResponse = await fetch(`${base}/api/risks`, json(tokenFor(3), "POST", {
    title: `Riesgo de panel ${Date.now()}`, description: "Diferencias de conciliación sin revisión.",
    area: "Finanzas", ownerId: 5, linkedAuditId: proposal.id, likelihood: 2, impact: 2,
    note: "La muestra mensual identificó diferencias sin explicación."
  }));
  assert.equal(riskResponse.status, 201);
  const risk = (await riskResponse.json()).risk;
  const controlResponse = await fetch(`${base}/api/controls`, json(tokenFor(3), "POST", {
    title: `Control de panel ${Date.now()}`, description: "Conciliación mensual de cuentas.",
    type: "DETECTIVE", frequency: "Monthly", ownerId: 5, riskIds: [risk.id], rating: 2,
    note: "El control no detectó oportunamente todas las diferencias."
  }));
  assert.equal(controlResponse.status, 201);
  const control = (await controlResponse.json()).control;
  const findingResponse = await fetch(`${base}/api/findings`, json(tokenFor(5), "POST", {
    controlId: control.id, riskId: risk.id, title: "Diferencias sin aprobación",
    description: "La conciliación contiene diferencias sin aprobación."
  }));
  assert.equal(findingResponse.status, 201);
  const finding = (await findingResponse.json()).finding;
  assert.equal(finding.auditId, proposal.id);
  const otherRiskResponse = await fetch(`${base}/api/risks`, json(tokenFor(3), "POST", {
    title: `Riesgo de otra persona ${Date.now()}`, description: "Riesgo del mismo expediente con otro responsable.",
    area: "Finanzas", ownerId: 4, linkedAuditId: proposal.id, likelihood: 2, impact: 2,
    note: "La evaluación corresponde a otra persona responsable."
  }));
  assert.equal(otherRiskResponse.status, 201);
  const otherRisk = (await otherRiskResponse.json()).risk;
  const otherControlResponse = await fetch(`${base}/api/controls`, json(tokenFor(3), "POST", {
    title: `Control de otra persona ${Date.now()}`, description: "Revisión independiente de registros.",
    type: "DETECTIVE", frequency: "Monthly", ownerId: 4, riskIds: [otherRisk.id], rating: 2,
    note: "El control requiere una evaluación adicional."
  }));
  assert.equal(otherControlResponse.status, 201);
  const otherControl = (await otherControlResponse.json()).control;
  assert.equal((await fetch(`${base}/api/findings`, json(tokenFor(3), "POST", {
    controlId: otherControl.id, riskId: otherRisk.id, title: "Hallazgo fuera de asignación",
    description: "Este hallazgo pertenece a un riesgo de otra persona."
  }))).status, 201);
  const dashboard = await fetch(`${base}/api/dashboard`, json(tokenFor(5)));
  assert.equal(dashboard.status, 200);
  assert.equal((await dashboard.json()).metrics.openFindings, 1);
  const directorDashboard = await fetch(`${base}/api/dashboard`, json(tokenFor(2)));
  assert.equal((await directorDashboard.json()).metrics.openFindings, 2);
  const visible = await fetch(`${base}/api/findings`, json(tokenFor(5)));
  const visibleFindings = (await visible.json()).findings;
  assert.ok(visibleFindings.some((item) => item.id === finding.id));
  assert.ok(visibleFindings.every((item) => item.riskId !== otherRisk.id));
});
