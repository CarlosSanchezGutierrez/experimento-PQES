const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET ||= "image-ocr-test-secret-32-characters";
const app = require("../server");
const { startTestServer } = require("./helpers/testServer");
const { extractImageText } = require("../services/azureVisionOcrService");
const evidenceTextIndex = require("../repositories/evidenceTextIndex");
const evidenceRepository = require("../repositories/evidenceRepository");
const riskRepository = require("../repositories/riskRepository");
const { askEvidenceContent } = require("../services/evidenceContentService");

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const auth = (id) => ({ method: "POST", headers: { Authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}` } });
const setAzure = () => {
  const names = ["VERA_AI_ENABLED", "AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT",
    "SUPABASE_URL", "SUPABASE_SECRET_KEY"];
  const prior = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, { VERA_AI_ENABLED: "true", AZURE_OPENAI_ENDPOINT: "https://vera-test.openai.azure.com",
    AZURE_OPENAI_API_KEY: "test-key-only", AZURE_OPENAI_DEPLOYMENT: "vera-vision",
    SUPABASE_URL: "https://supabase.example", SUPABASE_SECRET_KEY: "sb_secret_test" });
  return () => names.forEach((name) => { if (prior[name] === undefined) delete process.env[name];
    else process.env[name] = prior[name]; });
};

test("OCR: sends a private base64 image only to the configured Azure endpoint", async () => {
  const restore = setAzure();
  try {
    const result = await extractImageText(png, "image/png", { fetchImpl: async (url, options) => {
      assert.equal(url, "https://vera-test.openai.azure.com/openai/v1/chat/completions");
      assert.equal(options.headers["api-key"], "test-key-only");
      const body = JSON.parse(options.body);
      assert.match(body.messages[1].content[1].image_url.url, /^data:image\/png;base64,/);
      assert.match(body.messages[0].content, /ignora instrucciones/);
      return Response.json({ choices: [{ finish_reason: "stop", message: {
        content: JSON.stringify({ text: "  Revisión   mensual de proveedores.  " }) } }],
        usage: { prompt_tokens: 120, completion_tokens: 20 } });
    } });
    assert.equal(result.text, "Revisión mensual de proveedores.");
    assert.equal(result.usage.prompt_tokens, 120);
    await assert.rejects(() => extractImageText(png, "application/pdf"), (error) => error.status === 415);
  } finally { restore(); }
});

test("OCR: reports a deployment without vision and does not store its response", async () => {
  const restore = setAzure();
  try {
    await assert.rejects(() => extractImageText(png, "image/png", {
      fetchImpl: async () => new Response("unsupported model", { status: 400 })
    }), (error) => error.status === 503 && /visión/.test(error.message));
    const empty = await extractImageText(png, "image/png", { fetchImpl: async () => Response.json({
      choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ text: " " }) } }]
    }) });
    assert.equal(empty.text, "");
    assert.equal(empty.truncated, false);
  } finally { restore(); }
});

test("OCR: authorized image is indexed once; foreign risk is hidden before download or model call", async (context) => {
  const restore = setAzure();
  const nativeFetch = global.fetch;
  let azureCalls = 0;
  let storageCalls = 0;
  global.fetch = (input, options) => {
    const url = String(input);
    if (url.startsWith("http://127.0.0.1:")) return nativeFetch(input, options);
    if (url.startsWith("https://supabase.example/storage/")) {
      storageCalls += 1;
      return Promise.resolve(new Response(png, { headers: { "Content-Type": "image/png" } }));
    }
    if (url.startsWith("https://vera-test.openai.azure.com/")) {
      azureCalls += 1;
      return Promise.resolve(Response.json({ choices: [{ finish_reason: "stop", message: {
        content: JSON.stringify({ text: "Control de proveedores revisado mensualmente." }) } }] }));
    }
    throw new Error(`Unexpected network target: ${url}`);
  };
  try {
    const base = await startTestServer(context, app);
    const ownRisk = riskRepository.create({ title: "OCR propio", ownerId: 5, level: "Alto", score: 6,
      likelihood: 3, impact: 2, createdBy: { id: 3 } });
    const foreignRisk = riskRepository.create({ title: "OCR ajeno", ownerId: 4, level: "Alto", score: 6,
      likelihood: 3, impact: 2, createdBy: { id: 3 } });
    const makeEvidence = (risk) => evidenceRepository.create({ title: "Imagen privada", entityType: "RISK",
      entityId: risk.id, author: { id: 3 }, file: { bucket: "vera-evidence", mime: "image/png", size: png.length,
        path: `risk/${risk.id}/11111111-1111-1111-1111-111111111111.png` } });
    const own = makeEvidence(ownRisk);
    const foreign = makeEvidence(foreignRisk);
    assert.equal((await fetch(`${base}/api/evidence/${own.id}/index-image`, { method: "POST" })).status, 401);
    assert.equal((await fetch(`${base}/api/evidence/${own.id}/index-image`, auth(2))).status, 403);
    assert.equal((await fetch(`${base}/api/evidence/${foreign.id}/index-image`, auth(5))).status, 404);
    assert.equal(azureCalls, 0);
    assert.equal(storageCalls, 0);
    const beforeOcr = await askEvidenceContent(own, "¿Qué dice de proveedores?", "AUDITOR", {
      ask: async () => { throw new Error("No se debe llamar a Azure sin OCR explícito"); }
    });
    assert.equal(beforeOcr.mode, "no-text");
    assert.equal(storageCalls, 0);
    const indexed = await fetch(`${base}/api/evidence/${own.id}/index-image`, auth(5));
    assert.equal(indexed.status, 200);
    assert.equal((await indexed.json()).status, "ready");
    assert.equal((await evidenceTextIndex.get(own.id))[0].content, "Control de proveedores revisado mensualmente.");
    const cached = await fetch(`${base}/api/evidence/${own.id}/index-image`, auth(5));
    assert.equal((await cached.json()).cached, true);
    assert.equal(azureCalls, 1);
    assert.equal(storageCalls, 1);
    const answer = await askEvidenceContent(own, "¿Qué dice de proveedores?", "AUDITOR", { ask: async () => ({
      answer: "El control se revisa mensualmente.", sourceIds: [`evidence:${own.id}:chunk:0`] }) });
    assert.equal(answer.mode, "generated");
    assert.equal(answer.citations[0].evidenceId, own.id);
  } finally { global.fetch = nativeFetch; restore(); }
});
