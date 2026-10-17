const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "assistant-evidence-search-test-secret-32";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");
const riskRepository = require("../repositories/riskRepository");
const evidenceTextIndex = require("../repositories/evidenceTextIndex");
const { allowedEvidence, searchAssistantEvidence } = require("../services/assistantEvidenceSearchService");

const evidence = (id, entityId, title = "Informe privado") => ({ id, entityType: "RISK", entityId,
  title, file: { mime: "application/pdf" }, createdAt: new Date().toISOString() });

test("Búsqueda unificada: limita el índice y el modelo a evidencias del rol", async () => {
  const own = riskRepository.create({ title: "Riesgo propio de compras", ownerId: 5, area: "Compras",
    level: "Alto", score: 6, likelihood: 3, impact: 2, createdBy: { id: 2 } });
  const foreign = riskRepository.create({ title: "Riesgo ajeno confidencial", ownerId: 4,
    level: "Alto", score: 6, likelihood: 3, impact: 2, createdBy: { id: 2 } });
  const ownFile = evidence("EVD-SEARCH-OWN", own.id);
  const foreignFile = evidence("EVD-SEARCH-FOREIGN", foreign.id, "Informe ajeno confidencial");
  let searched = false;
  const result = await searchAssistantEvidence({ id: 5, role: "AUDITOR" },
    "¿Qué dice el informe sobre compras?", null, {
      getEvidence: async () => [ownFile, foreignFile],
      search: async (ids) => {
        searched = true;
        assert.deepEqual(ids, [ownFile.id]);
        return [
          { evidenceId: ownFile.id, chunkIndex: 0, pageNumber: 2, content: "Compras requiere doble validación." },
          { evidenceId: foreignFile.id, chunkIndex: 0, pageNumber: 1, content: "Texto ajeno confidencial." }
        ];
      },
      ask: async ({ context }) => {
        assert.ok(!JSON.stringify(context).includes("ajeno confidencial"));
        assert.equal(context.records.evidence.length, 1);
        return { answer: "El informe pide doble validación.",
          sourceIds: [`evidence:${ownFile.id}:chunk:0`], usage: { prompt_tokens: 80 } };
      }
    });
  assert.equal(searched, true);
  assert.equal(result.mode, "document-search");
  assert.equal(result.citations[0].pageNumber, 2);
  assert.equal(result.citations[0].evidenceId, ownFile.id);
  assert.equal(result.coverage.visibleFiles, 1);
  assert.ok(!JSON.stringify(result).includes("ajeno confidencial"));
});

test("Búsqueda unificada: sin coincidencia o cita del archivo no inventa respuesta", async () => {
  const own = riskRepository.create({ title: "Riesgo propio de pagos", ownerId: 5,
    level: "Medio", score: 4, likelihood: 2, impact: 2, createdBy: { id: 2 } });
  const file = evidence("EVD-SEARCH-PAYMENTS", own.id);
  const base = { getEvidence: async () => [file] };
  const missing = await searchAssistantEvidence({ id: 5, role: "AUDITOR" }, "¿Qué dice de criptografía?", null, {
    ...base, search: async () => [], ask: async () => { throw new Error("No debe llamar a Azure."); }
  });
  assert.equal(missing.mode, "no-match");
  const uncited = await searchAssistantEvidence({ id: 5, role: "AUDITOR" }, "¿Qué dice de pagos?", null, {
    ...base, search: async () => [{ evidenceId: file.id, chunkIndex: 0, pageNumber: 1,
      content: "Los pagos se revisan semanalmente." }],
    ask: async () => ({ answer: "Afirmación sin fuente.", sourceIds: [] })
  });
  assert.equal(uncited.mode, "uncited");
  assert.ok(!uncited.answer.includes("Afirmación"));
});

test("Búsqueda unificada: omite imágenes y referencias sin archivo; reporta truncamiento", async () => {
  assert.deepEqual(allowedEvidence([
    { id: "EVD-PNG", entityType: "RISK", entityId: "RSK-1", file: { mime: "image/png" } },
    { id: "EVD-LINK", entityType: "RISK", entityId: "RSK-1" },
    { id: "EVD-TXT", entityType: "RISK", entityId: "RSK-1", file: { mime: "text/plain" } }
  ], { risks: [{ id: "RSK-1" }], controls: [], audits: [] }).map((item) => item.id), ["EVD-TXT"]);
  const own = riskRepository.create({ title: "Riesgo para límite de búsqueda", ownerId: 5,
    level: "Bajo", score: 1, likelihood: 1, impact: 1, createdBy: { id: 2 } });
  const many = Array.from({ length: 501 }, (_, index) => evidence(`EVD-SEARCH-${index}`, own.id));
  const result = await searchAssistantEvidence({ id: 5, role: "AUDITOR" }, "¿Qué dice el documento?", null, {
    getEvidence: async () => many,
    search: async (ids) => { assert.equal(ids.length, 500); return []; },
    ask: async () => { throw new Error("No debe llamar a Azure."); }
  });
  assert.equal(result.coverage.visibleFiles, 501);
  assert.equal(result.coverage.searchedFiles, 500);
  assert.equal(result.coverage.partial, true);
});

test("Búsqueda unificada: el RPC privado recibe solamente IDs del servidor y limita resultados", async () => {
  const previous = { store: process.env.VERA_EVIDENCE_COMMENT_STORE,
    url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY, fetch: global.fetch };
  process.env.VERA_EVIDENCE_COMMENT_STORE = "supabase";
  process.env.SUPABASE_URL = "https://mock.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).pathname, "/rest/v1/rpc/vera_search_evidence_text_chunks");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.apikey, "sb_secret_test");
    assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { p_evidence_ids: ["EVD-SEARCH-OWN"],
      p_query: "¿Qué dice de compras?", p_limit: 5 });
    return { ok: true, json: async () => [{ evidence_id: "EVD-SEARCH-OWN", chunk_index: 0,
      page_number: 2, content: "Compras revisadas.", score: 0.9 }] };
  };
  try {
    const result = await evidenceTextIndex.search(["EVD-SEARCH-OWN"], "¿Qué dice de compras?");
    assert.equal(result[0].evidenceId, "EVD-SEARCH-OWN");
    assert.equal(result[0].pageNumber, 2);
    await assert.rejects(() => evidenceTextIndex.search(["EVD-SEARCH-OWN", "otro/archivo"], "compras"));
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [["VERA_EVIDENCE_COMMENT_STORE", previous.store],
      ["SUPABASE_URL", previous.url], ["SUPABASE_SECRET_KEY", previous.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("Búsqueda unificada: la ruta exige sesión y valida la pregunta", async (t) => {
  const base = await startTestServer(t, app);
  const route = `${base}/api/assistant/search-evidence`;
  assert.equal((await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "compras" }) })).status, 401);
  const token = jwt.sign({ id: 5 }, process.env.JWT_SECRET);
  const invalid = await fetch(route, { method: "POST", headers: {
    Authorization: `Bearer ${token}`, "Content-Type": "application/json"
  }, body: JSON.stringify({ question: "a" }) });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get("cache-control"), "no-store");
});
