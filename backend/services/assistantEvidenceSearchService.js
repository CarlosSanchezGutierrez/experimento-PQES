const evidenceRepository = require("../repositories/evidenceRepository");
const evidenceTextIndex = require("../repositories/evidenceTextIndex");
const { buildAssistantContext } = require("./assistantContextService");
const { askAzureOpenAi } = require("./azureOpenAiService");
const { SEARCHABLE_MIME } = require("./evidenceTextExtraction");

const allowedEvidence = (items, visibleRecords) => {
  const ids = {
    RISK: new Set(visibleRecords.risks.map((item) => item.id)),
    CONTROL: new Set(visibleRecords.controls.map((item) => item.id)),
    AUDIT: new Set(visibleRecords.audits.map((item) => item.id))
  };
  return items.filter((item) => item.file && SEARCHABLE_MIME.has(item.file.mime) &&
    ids[item.entityType]?.has(item.entityId));
};

const searchAssistantEvidence = async (user, question, focus = null,
  { getEvidence = evidenceRepository.getAll, search = evidenceTextIndex.search,
    ask = askAzureOpenAi } = {}) => {
  const { context, visibleRecords, references, sourceCatalog, asOf } =
    await buildAssistantContext(user, question, focus);
  const allowed = allowedEvidence(await getEvidence(), visibleRecords);
  const scoped = allowed.slice(0, evidenceTextIndex.MAX_SEARCH_FILES);
  const partialFiles = scoped.length < allowed.length;
  const byId = new Map(scoped.map((item) => [item.id, item]));
  const rows = await search(scoped.map((item) => item.id), question);
  // Nunca se confía en IDs devueltos por el índice para ampliar el alcance.
  const selected = rows.filter((row) => byId.has(row.evidenceId) &&
    Number.isInteger(row.chunkIndex) && typeof row.content === "string" && row.content.trim())
    .slice(0, 5);
  const coverage = { visibleFiles: allowed.length, searchedFiles: scoped.length,
    includedChunks: selected.length, partial: partialFiles, indexedOnly: true };
  if (!selected.length) return { answer: "No encontré fragmentos ya indexados que respondan esta pregunta. " +
    "Prueba con un término concreto o consulta el archivo individual para indexarlo.",
  mode: "no-match", citations: [], references: [], coverage, asOf, usage: null };

  const evidenceSources = selected.map((row) => {
    const item = byId.get(row.evidenceId);
    return { sourceId: `evidence:${item.id}:chunk:${row.chunkIndex}`, type: "Fragmento de evidencia",
      evidenceId: item.id, title: item.title, pageNumber: row.pageNumber, excerpt: row.content,
      path: `/evidencias#evidence-${encodeURIComponent(item.id)}` };
  });
  const modelContext = {
    ...context,
    scope: `${context.scope}. Fragmentos de evidencias privadas ya indexadas y visibles para este usuario.`,
    counts: { ...context.counts, evidenceFiles: allowed.length },
    selection: { ...context.selection, evidence: { visible: allowed.length, included: selected.length,
      searchedFiles: scoped.length } },
    sources: [...context.sources, ...evidenceSources.map(({ sourceId, type, title, pageNumber }) =>
      ({ sourceId, type, title, pageNumber }))],
    records: { ...context.records, evidence: evidenceSources.map(({ sourceId, pageNumber, excerpt }) =>
      ({ sourceId, pageNumber, text: excerpt })) }
  };
  const result = await ask({ question, context: modelContext });
  const catalog = new Map([...sourceCatalog, ...evidenceSources].map((item) => [item.sourceId, item]));
  const cited = result.sourceIds.map((id) => catalog.get(id)).filter(Boolean);
  if (!cited.some((item) => item.evidenceId)) return { answer: "No puedo respaldar una respuesta documental " +
    "con los fragmentos encontrados.", mode: "uncited", citations: [], references: [],
  coverage, asOf, usage: result.usage || null };
  return { answer: result.answer, mode: "document-search", citations: cited, references,
    coverage, asOf, usage: result.usage || null };
};

module.exports = { allowedEvidence, searchAssistantEvidence };
