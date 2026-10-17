const memory = new Map();
const TABLE = "vera_ai_feedback";
const PAGE_SIZE = 1000;
const MAX_ROWS = 10000;

class FeedbackStorageError extends Error {
  constructor(message, status = 503) { super(message); this.status = status; }
}

const remote = () => process.env.VERA_USER_STORE === "supabase";
const config = () => {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !key) throw new FeedbackStorageError("La bitácora de calidad no está configurada.");
  let root;
  try { root = new URL(process.env.SUPABASE_URL); } catch {
    throw new FeedbackStorageError("La URL de la bitácora de calidad no es válida.");
  }
  if (root.protocol !== "https:") throw new FeedbackStorageError("La bitácora de calidad requiere HTTPS.");
  return { root, key };
};

const request = async (method, query = {}, body, range) => {
  const { root, key } = config();
  const url = new URL(`/rest/v1/${TABLE}`, root);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  const headers = { apikey: key, Accept: "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  if (body) { headers["Content-Type"] = "application/json"; headers.Prefer = "return=minimal"; }
  if (range) headers.Range = range;
  let response;
  try { response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000) }); }
  catch { throw new FeedbackStorageError("No se pudo conectar con la bitácora de calidad."); }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    if (detail.code === "23505") throw new FeedbackStorageError("Esta respuesta ya fue valorada.", 409);
    throw new FeedbackStorageError("La bitácora de calidad rechazó la operación.");
  }
  return method === "GET" ? response.json() : null;
};

const save = async ({ interactionId, channel, mode, rating }) => {
  if (memory.has(interactionId) && !remote()) throw new FeedbackStorageError("Esta respuesta ya fue valorada.", 409);
  const row = { interaction_id: interactionId, channel, response_mode: mode, rating,
    created_at: new Date().toISOString() };
  if (remote()) await request("POST", {}, row);
  else memory.set(interactionId, row);
  return { recorded: true };
};

const summary = async ({ now = new Date(), days = 30 } = {}) => {
  const since = new Date(now.getTime() - days * 86400000).toISOString();
  let rows;
  let partial = false;
  if (remote()) {
    rows = [];
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const batch = await request("GET", { select: "rating,channel,response_mode,created_at",
        created_at: `gte.${since}`, order: "created_at.desc" }, undefined, `${offset}-${offset + PAGE_SIZE - 1}`);
      if (!Array.isArray(batch)) throw new FeedbackStorageError("La bitácora devolvió datos inválidos.");
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      if (offset + PAGE_SIZE >= MAX_ROWS) partial = true;
    }
  } else rows = [...memory.values()].filter((row) => row.created_at >= since);
  const helpful = rows.filter((row) => row.rating === "helpful").length;
  const unhelpful = rows.filter((row) => row.rating === "unhelpful").length;
  const byMode = {};
  for (const row of rows) {
    const key = row.response_mode;
    byMode[key] ||= { helpful: 0, unhelpful: 0 };
    byMode[key][row.rating] += 1;
  }
  return { windowDays: days, asOf: now.toISOString(), total: rows.length, helpful, unhelpful,
    helpfulPercent: rows.length ? Math.round(100 * helpful / rows.length) : null, byMode, partial };
};

module.exports = { FeedbackStorageError, save, summary };
