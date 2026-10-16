const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "audit-search-test-secret-over-32-characters";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);
const auth = (id) => ({ headers: { Authorization: `Bearer ${tokenFor(id)}` } });

test("HU-26: buscar por título sin acentos y combinar estado, año y riesgo", async (context) => {
  const base = await startTestServer(context, app);
  const response = await fetch(`${base}/api/planning/search?q=auditoria&status=OPEN&year=2026&risk=Medio`, auth(2));
  assert.equal(response.status, 200);
  const { audits } = await response.json();
  assert.ok(audits.length > 0);
  assert.ok(audits.every((audit) => audit.status === "OPEN" && audit.year === 2026 && audit.risk === "Medio"));
  assert.ok(audits.some((audit) => audit.id === "AUD-01"));
});

test("HU-26: el auditor solo encuentra expedientes asignados", async (context) => {
  const base = await startTestServer(context, app);
  const all = await fetch(`${base}/api/planning/search`, auth(5));
  assert.equal(all.status, 200);
  const { audits } = await all.json();
  assert.ok(audits.every((audit) => audit.responsibleId === 5));
  const byId = await fetch(`${base}/api/planning/search?q=AUD-01`, auth(5));
  assert.equal(byId.status, 200);
  assert.deepEqual((await byId.json()).audits, []);
});

test("HU-26: requiere sesión y rechaza filtros inválidos", async (context) => {
  const base = await startTestServer(context, app);
  assert.equal((await fetch(`${base}/api/planning/search`)).status, 401);
  for (const query of ["status=UNKNOWN", "risk=Cr%C3%ADtico", "year=2019", "q=x&q=y", `q=${"x".repeat(121)}`]) {
    const response = await fetch(`${base}/api/planning/search?${query}`, auth(2));
    assert.equal(response.status, 400, query);
  }
});
