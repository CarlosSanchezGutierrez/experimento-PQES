const memory = new Map();
const TABLE = "vera_evidence_text_chunks";
const VALID_ID = /^EVD-[A-Za-z0-9-]{1,80}$/;
const MAX_SEARCH_FILES = 500;

class EvidenceIndexError extends Error {
  constructor(message) { super(message); this.status = 503; }
}

const configured = () => process.env.VERA_EVIDENCE_COMMENT_STORE === "supabase";
const config = () => {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !key) throw new EvidenceIndexError("El índice privado de evidencias no está configurado.");
  let root;
  try { root = new URL(process.env.SUPABASE_URL); } catch {
    throw new EvidenceIndexError("La URL del índice privado no es válida.");
  }
  if (root.protocol !== "https:") throw new EvidenceIndexError("El índice privado requiere HTTPS.");
  return { root, key };
};

const request = async (method, evidenceId, chunks) => {
  const { root, key } = config();
  const url = new URL(`/rest/v1/${TABLE}`, root);
  const headers = { apikey: key, Accept: "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  if (method === "GET") {
    url.searchParams.set("select", "chunk_index,page_number,content");
    url.searchParams.set("evidence_id", `eq.${evidenceId}`);
    url.searchParams.set("order", "chunk_index.asc");
    url.searchParams.set("limit", "60");
  } else {
    url.searchParams.set("on_conflict", "evidence_id,chunk_index");
    headers["Content-Type"] = "application/json";
    headers.Prefer = "resolution=merge-duplicates,return=minimal";
  }
  let response;
  try {
    response = await fetch(url, { method, headers,
      body: chunks ? JSON.stringify(chunks.map((item) => ({ evidence_id: evidenceId,
        chunk_index: item.chunkIndex, page_number: item.pageNumber, content: item.content }))) : undefined,
      signal: AbortSignal.timeout(10_000) });
  } catch { throw new EvidenceIndexError("No se pudo conectar con el índice privado de evidencias."); }
  if (!response.ok) throw new EvidenceIndexError("El índice privado de evidencias rechazó la operación.");
  return method === "GET" ? response.json() : null;
};

const validate = (evidenceId) => {
  if (!VALID_ID.test(evidenceId)) throw new EvidenceIndexError("Identificador de evidencia no válido.");
};

const get = async (evidenceId) => {
  validate(evidenceId);
  if (!configured()) return (memory.get(evidenceId) || []).map((item) => ({ ...item }));
  const rows = await request("GET", evidenceId);
  return rows.map((item) => ({ chunkIndex: item.chunk_index, pageNumber: item.page_number,
    content: item.content }));
};

const replace = async (evidenceId, chunks) => {
  validate(evidenceId);
  if (!Array.isArray(chunks) || chunks.length > 50 || chunks.some((item, index) =>
    item.chunkIndex !== index || !Number.isInteger(item.chunkIndex) ||
    (item.pageNumber !== null && (!Number.isInteger(item.pageNumber) || item.pageNumber < 1)) ||
    typeof item.content !== "string" || !item.content.trim() || item.content.length > 1000)) {
    throw new EvidenceIndexError("Los fragmentos de evidencia no son válidos.");
  }
  if (!chunks.length) return 0;
  if (!configured()) memory.set(evidenceId, chunks.map((item) => ({ ...item })));
  else await request("POST", evidenceId, chunks);
  return chunks.length;
};

const search = async (evidenceIds, question) => {
  if (!Array.isArray(evidenceIds) || evidenceIds.length > MAX_SEARCH_FILES ||
      evidenceIds.some((id) => typeof id !== "string" || !VALID_ID.test(id)) ||
      typeof question !== "string" || question.trim().length < 3 || question.length > 500) {
    throw new EvidenceIndexError("La búsqueda privada no es válida.");
  }
  if (!evidenceIds.length) return [];
  if (!configured()) {
    const words = [...new Set(question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .match(/[\p{L}\p{N}]{4,}/gu) || [])];
    return evidenceIds.flatMap((evidenceId) => (memory.get(evidenceId) || []).map((item) => {
      const content = item.content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return { ...item, evidenceId, score: words.reduce((sum, word) => sum + Number(content.includes(word)), 0) };
    })).filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.evidenceId.localeCompare(b.evidenceId) || a.chunkIndex - b.chunkIndex)
      .slice(0, 5);
  }
  const { root, key } = config();
  const url = new URL("/rest/v1/rpc/vera_search_evidence_text_chunks", root);
  const headers = { apikey: key, Accept: "application/json", "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  let response;
  try {
    response = await fetch(url, { method: "POST", headers,
      body: JSON.stringify({ p_evidence_ids: evidenceIds, p_query: question, p_limit: 5 }),
      signal: AbortSignal.timeout(10_000) });
  } catch { throw new EvidenceIndexError("No se pudo conectar con el índice privado de evidencias."); }
  if (!response.ok) throw new EvidenceIndexError("El índice privado de evidencias rechazó la búsqueda.");
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new EvidenceIndexError("El índice privado devolvió una búsqueda inválida.");
  return rows.map((item) => ({ evidenceId: item.evidence_id, chunkIndex: item.chunk_index,
    pageNumber: item.page_number, content: item.content, score: item.score }));
};

module.exports = { EvidenceIndexError, MAX_SEARCH_FILES, get, replace, search };
