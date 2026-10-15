
const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase login logging requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { url: url.replace(/\/+$/, ""), key };
};

const recordLogin = async ({ user, ip, method }) => {
  const { url, key } = getSupabaseConfig();

  let response;

  try {
    response = await fetch(`${url}/rest/v1/logins`, {
      method: "POST",
      headers: {
        apikey: key,
        ...(key.startsWith("sb_secret_")
          ? {}
          : { Authorization: `Bearer ${key}` }),
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        user_id: user.id,
        username: user.username,
        ip_address: ip || null,
        method
      })
    });
  } catch (cause) {
    throw new Error(
      "No se pudo conectar con Supabase para registrar el inicio de sesión.",
      { cause }
    );
  }

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Supabase rejected login log (${response.status}): ${details}`
    );
  }
};

module.exports = { recordLogin };