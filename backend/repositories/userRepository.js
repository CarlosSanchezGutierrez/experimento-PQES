
const bcrypt = require("bcryptjs");
const { USER_STATUS } = require("../config/accountRules");

const getConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const error = new Error(
      "Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
    );
    error.status = 503;
    throw error;
  }

  return { url: url.replace(/\/+$/, ""), key };
};

const request = async (
  path,
  { method = "GET", body, prefer = "return=representation" } = {}
) => {
  const { url, key } = getConfig();

  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        ...(key.startsWith("sb_secret_")
          ? {}
          : { Authorization: `Bearer ${key}` }),
        "Content-Type": "application/json",
        Accept: "application/json",
        Prefer: prefer
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  } catch (cause) {
    const error = new Error("No se pudo conectar con Supabase.", { cause });
    error.status = 503;
    throw error;
  }

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const error = new Error(
      `Supabase users request failed (${response.status}): ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`
    );
    error.status = 503;
    throw error;
  }

  return data;
};

const fromDb = (row) =>
  row
    ? {
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        password: row.password,
        role: row.role,
        status: row.status,
        requestedAt: row.requested_at || null,
        twoFactorEnabled: Boolean(row.two_factor_enabled),
        twoFactorSecret: row.two_factor_secret || null,
        pendingSecret: row.pending_secret || null,
        createdAt: row.created_at || null
      }
    : null;

const toDb = (user) => {
  const row = {};

  if (user.username !== undefined) row.username = user.username;
  if (user.name !== undefined) row.name = user.name;
  if (user.email !== undefined) row.email = user.email;
  if (user.password !== undefined) row.password = user.password;
  if (user.role !== undefined) row.role = user.role;
  if (user.status !== undefined) row.status = user.status;
  if (user.requestedAt !== undefined) row.requested_at = user.requestedAt;
  if (user.twoFactorEnabled !== undefined) {
    row.two_factor_enabled = user.twoFactorEnabled;
  }
  if (user.twoFactorSecret !== undefined) {
    row.two_factor_secret = user.twoFactorSecret;
  }
  if (user.pendingSecret !== undefined) {
    row.pending_secret = user.pendingSecret;
  }

  return row;
};

const toPublic = (user) =>
  user
    ? {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        requestedAt: user.requestedAt || null,
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        createdAt: user.createdAt || null
      }
    : null;

const getAll = async () => {
  const rows = await request(
    "users?select=id,username,name,email,password,role,status,requested_at,two_factor_enabled,two_factor_secret,pending_secret,created_at&order=id.asc"
  );

  return (rows || []).map(fromDb);
};

const findById = async (id) => {
  const rows = await request(
    `users?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );

  return fromDb(rows?.[0]);
};

const findByLogin = async (identifier) => {
  const value = String(identifier || "").trim();
  if (!value) return null;

  const escaped = value.replace(/[(),.\\]/g, (char) => `\\${char}`);

  const filter =
    `or=(username.ilike.${encodeURIComponent(escaped)},` +
    `email.ilike.${encodeURIComponent(escaped)})`;

  const rows = await request(`users?select=*&${filter}&limit=1`);
  return fromDb(rows?.[0]);
};

const emailExists = async (email) => {
  const value = String(email || "").trim().toLowerCase();
  if (!value) return false;

  const rows = await request(
    `users?select=id&email=ilike.${encodeURIComponent(value)}&limit=1`
  );

  return Boolean(rows?.length);
};

const createPending = async ({ name, email, password, role }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const rows = await request("users", {
    method: "POST",
    body: toDb({
      username: normalizedEmail,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      name,
      role,
      status: USER_STATUS.PENDING,
      requestedAt: new Date().toISOString(),
      twoFactorEnabled: false,
      twoFactorSecret: null,
      pendingSecret: null
    })
  });

  return toPublic(fromDb(rows?.[0]));
};

const updateById = async (id, patch) => {
  const rows = await request(
    `users?id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", body: toDb(patch) }
  );

  return fromDb(rows?.[0]);
};

const updateRole = async (id, role) =>
  toPublic(await updateById(id, { role }));

const setStatus = async (id, status) =>
  toPublic(await updateById(id, { status }));

const updateTwoFactor = async (id, fields) =>
  updateById(id, fields);

const remove = async (id) => {
  const existing = await findById(id);
  if (!existing) return null;

  await request(
    `users?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", prefer: "return=minimal" }
  );

  return toPublic(existing);
};

const upgradePlaintextPassword = async (user, plainPassword) => {
  if (
    !user ||
    typeof user.password !== "string" ||
    user.password.startsWith("$2")
  ) {
    return;
  }

  await updateById(user.id, {
    password: await bcrypt.hash(plainPassword, 10)
  });
};

const checkPassword = async (user, plainPassword) => {
  if (
    !user ||
    typeof plainPassword !== "string" ||
    typeof user.password !== "string"
  ) {
    return false;
  }

  if (user.password.startsWith("$2")) {
    return bcrypt.compare(plainPassword, user.password);
  }

  // Compatibilidad temporal con contraseñas existentes en texto plano.
  return user.password === plainPassword;
};

module.exports = {
  toPublic,
  getAll,
  findById,
  findByLogin,
  emailExists,
  createPending,
  updateRole,
  setStatus,
  updateTwoFactor,
  remove,
  checkPassword,
  upgradePlaintextPassword
};