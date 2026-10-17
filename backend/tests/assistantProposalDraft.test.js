const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "assistant-draft-test-secret-32-characters";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");
const { buildProposalDraft, parseGeneratedFields } = require("../services/assistantProposalDraftService");
const riskRepository = require("../repositories/riskRepository");
const planningRepository = require("../repositories/planningRepository");
const auth = (id, body) => ({ method: "POST", headers: { Authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`,
  "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("Draft: only bounded structured fields are accepted from the model", () => {
  const valid = { title: "Revisión de compras", objective: "Evaluar los controles de compras.",
    scope: "Procesos de compra del periodo acordado.", justification: "El riesgo requiere seguimiento." };
  assert.deepEqual(parseGeneratedFields(JSON.stringify(valid)), valid);
  assert.equal(parseGeneratedFields("texto libre"), null);
  assert.equal(parseGeneratedFields(JSON.stringify({ ...valid, scope: "" })), null);
  assert.equal(parseGeneratedFields(JSON.stringify({ ...valid, title: "x".repeat(121) })), null);
});

test("Draft: a cited risk produces a review-only proposal without dates or responsible", async () => {
  const risk = riskRepository.create({ title: `Riesgo de proveedores ${Date.now()}`, description: "Falta revisión periódica.",
    area: "Compras", ownerId: 5, level: "Alto", score: 6, likelihood: 3, impact: 2, createdBy: { id: 3 } });
  const before = planningRepository.getAll().length;
  const answer = JSON.stringify({ title: "Auditoría de proveedores", objective: "Evaluar el proceso de revisión de proveedores.",
    scope: "Delimitar compras y las revisiones del periodo.", justification: "El riesgo registrado requiere evaluación documentada." });
  const draft = await buildProposalDraft({ id: 3, role: "GERENTE" }, risk.id, { ask: async ({ context }) => {
    assert.equal(context.focus.id, risk.id);
    assert.equal(context.sources.length, 1);
    return { answer, sourceIds: [`risks:${risk.id}`], usage: { prompt_tokens: 50, completion_tokens: 30 } };
  } });
  assert.equal(draft.mode, "generated");
  assert.equal(draft.draft.area, "Compras");
  assert.equal(draft.draft.startDate, "");
  assert.equal(draft.draft.responsibleId, "");
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.persisted, false);
  assert.equal(planningRepository.getAll().length, before);
  const uncited = await buildProposalDraft({ id: 3, role: "GERENTE" }, risk.id,
    { ask: async () => ({ answer, sourceIds: [] }) });
  assert.equal(uncited.mode, "template");
  assert.equal(uncited.source.sourceId, `risks:${risk.id}`);
});

test("Draft: route denies anonymous, Director and Auditor, hides foreign risk and never writes", async (context) => {
  const base = await startTestServer(context, app);
  const risk = riskRepository.create({ title: `Riesgo privado ${Date.now()}`, description: "Riesgo de prueba.",
    area: "Operaciones", ownerId: 4, level: "Alto", score: 9, likelihood: 3, impact: 3, createdBy: { id: 3 } });
  const before = planningRepository.getAll().length;
  assert.equal((await fetch(`${base}/api/assistant/draft-proposal`, { method: "POST" })).status, 401);
  assert.equal((await fetch(`${base}/api/assistant/draft-proposal`, auth(2, { riskId: risk.id }))).status, 403);
  assert.equal((await fetch(`${base}/api/assistant/draft-proposal`, auth(5, { riskId: risk.id }))).status, 403);
  const allowed = await fetch(`${base}/api/assistant/draft-proposal`, auth(3, { riskId: risk.id }));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("cache-control"), "no-store");
  assert.equal((await allowed.json()).mode, "template");
  assert.equal(planningRepository.getAll().length, before);
  await assert.rejects(() => buildProposalDraft({ id: 5, role: "AUDITOR" }, risk.id, { generate: false }),
    (error) => error.status === 404);
});
