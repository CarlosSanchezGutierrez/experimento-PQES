const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "findings-integration-test-secret-32-characters";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");
const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const json = (id, method = "GET", body) => ({
  method,
  headers: { Authorization: `Bearer ${tokenFor(id)}`, ...(body ? { "Content-Type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});

test("HU-15: un hallazgo conserva control, riesgo, auditoría y versión de evaluación", async (context) => {
  const base = await startTestServer(context, app);
  const riskResponse = await fetch(`${base}/api/risks`, json(3, "POST", {
    title: `Riesgo de hallazgo ${Date.now()}`, description: "Falla de conciliación detectada en revisión mensual.",
    area: "Finanzas", ownerId: 5, linkedAuditId: "AUD-01", likelihood: 2, impact: 2,
    note: "La revisión de la muestra mostró excepciones documentadas."
  }));
  assert.equal(riskResponse.status, 201);
  const risk = (await riskResponse.json()).risk;
  const controlResponse = await fetch(`${base}/api/controls`, json(3, "POST", {
    title: `Control de hallazgo ${Date.now()}`, description: "Conciliación mensual de registros contables.",
    type: "DETECTIVE", frequency: "Monthly", ownerId: 5, riskIds: [risk.id], rating: 2,
    note: "La muestra contiene varias discrepancias sin corregir."
  }));
  assert.equal(controlResponse.status, 201);
  const control = (await controlResponse.json()).control;
  const body = { controlId: control.id, riskId: risk.id, title: "Excepciones de conciliación", description: "Tres diferencias carecen de revisión y aprobación." };

  assert.equal((await fetch(`${base}/api/findings`, json(4, "POST", body))).status, 403);
  assert.equal((await fetch(`${base}/api/findings`, json(5, "POST", { ...body, riskId: "RSK-999" }))).status, 404);
  const createdResponse = await fetch(`${base}/api/findings`, json(5, "POST", body));
  assert.equal(createdResponse.status, 201);
  const finding = (await createdResponse.json()).finding;
  assert.equal(finding.controlId, control.id);
  assert.equal(finding.riskId, risk.id);
  assert.equal(finding.auditId, "AUD-01");
  assert.equal(finding.evaluationVersion, 1);
  assert.equal(finding.createdBy.id, 5);
  assert.equal(finding.status, "OPEN");
  assert.equal((await fetch(`${base}/api/findings`, json(5, "POST", body))).status, 409);
  const visible = await fetch(`${base}/api/findings?controlId=${control.id}`, json(5));
  assert.equal(visible.status, 200);
  assert.ok((await visible.json()).findings.some((item) => item.id === finding.id));
  assert.equal((await fetch(`${base}/api/findings`)).status, 401);
});

test("HU-15: no abre hallazgo con evaluación efectiva", async (context) => {
  const base = await startTestServer(context, app);
  const riskResponse = await fetch(`${base}/api/risks`, json(3, "POST", {
    title: `Riesgo sin hallazgo ${Date.now()}`, description: "Probabilidad de error en la conciliación de cuentas.",
    area: "Operaciones", ownerId: 5, likelihood: 1, impact: 2,
    note: "Se examinó una muestra independiente de registros."
  }));
  const risk = (await riskResponse.json()).risk;
  const controlResponse = await fetch(`${base}/api/controls`, json(3, "POST", {
    title: `Control efectivo ${Date.now()}`, description: "Revisión independiente de los registros.",
    type: "PREVENTIVE", frequency: "Monthly", ownerId: 5, riskIds: [risk.id], rating: 4,
    note: "La evidencia es suficiente para esta muestra."
  }));
  const control = (await controlResponse.json()).control;
  const response = await fetch(`${base}/api/findings`, json(3, "POST", {
    controlId: control.id, riskId: risk.id, title: "Hallazgo improcedente",
    description: "Este control tiene una evaluación efectiva."
  }));
  assert.equal(response.status, 409);
});
