const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "assistant-insights-test-secret-32-characters";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");
const { buildDecisionInsights } = require("../services/assistantInsightService");
const riskRepository = require("../repositories/riskRepository");
const controlRepository = require("../repositories/controlRepository");
const auth = (id) => ({ Authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}` });

test("Insights: ranks visible, cited records with an explicit attention formula", () => {
  const risks = [{ id: "RSK-1", title: "Riesgo alto", level: "Alto", score: 6 },
    { id: "RSK-2", title: "Riesgo medio", level: "Medio", score: 3 }];
  const controls = [{ id: "CTL-1", title: "Control débil", riskIds: ["RSK-1", "RSK-FOREIGN"], effectiveness: 2 }];
  const findings = [{ id: "FDG-1", riskId: "RSK-1", status: "OPEN" }];
  const result = buildDecisionInsights({ visibleRecords: { audits: [], risks, controls, findings, pending: [] },
    asOf: "2026-10-16T12:00:00.000Z" });
  assert.equal(result.method, "rule-based-attention-v1");
  assert.equal(result.insights[0].key, "risk:RSK-1");
  assert.equal(result.insights[0].score, 85);
  assert.equal(result.insights[0].source.sourceId, "risks:RSK-1");
  assert.equal(result.insights[0].factors[2], "Controles por revisar: 1");
  assert.ok(!JSON.stringify(result).includes("RSK-FOREIGN"));
  assert.ok(!JSON.stringify(result).includes("residual"));
});

test("Insights: detects due audits, bounds output and handles empty data", () => {
  const audit = { id: "AUD-1", title: "Auditoría en curso", status: "ACTIVE",
    endDate: "2026-10-15", progress: 20 };
  const risks = Array.from({ length: 9 }, (_, index) => ({ id: `RSK-${index}`, title: `Riesgo ${index}`,
    level: "Alto", score: 6 }));
  const result = buildDecisionInsights({ visibleRecords: { audits: [audit], risks }, asOf: "2026-10-16T12:00:00.000Z" });
  assert.equal(result.insights[0].key, "audit:AUD-1");
  assert.equal(result.insights.length, 6);
  assert.equal(result.partial, true);
  assert.equal(result.evaluated, 10);
  assert.deepEqual(buildDecisionInsights({ visibleRecords: {} }).insights, []);
});

test("Insights: the API requires a session and does not expose another auditor's risk", async (context) => {
  const base = await startTestServer(context, app);
  const stamp = Date.now();
  const own = riskRepository.create({ title: `Riesgo visible ${stamp}`, ownerId: 5, level: "Alto",
    score: 6, likelihood: 3, impact: 2, createdBy: { id: 3 } });
  const foreign = riskRepository.create({ title: `Riesgo secreto ${stamp}`, ownerId: 4, level: "Alto",
    score: 9, likelihood: 3, impact: 3, createdBy: { id: 3 } });
  controlRepository.create({ title: `Control compartido ${stamp}`, riskIds: [own.id, foreign.id],
    effectiveness: 2, createdBy: { id: 3 } });
  assert.equal((await fetch(`${base}/api/assistant/insights`)).status, 401);
  const response = await fetch(`${base}/api/assistant/insights`, { headers: auth(5) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.ok(body.insights.some((item) => item.key === `risk:${own.id}`));
  assert.ok(!JSON.stringify(body).includes(`Riesgo secreto ${stamp}`));
  assert.ok(!JSON.stringify(body).includes(`risk:${foreign.id}`));
});
