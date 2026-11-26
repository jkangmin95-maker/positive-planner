function decodeJwtPayload(key) {
  const part = String(key).split(".")[1];
  if (!part) return null;
  try {
    const padded = part
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
}

export function isSecretKey(key) {
  const value = String(key ?? "").trim();
  if (!value) return false;
  if (/^sb_secret_/i.test(value)) return true;
  const payload = decodeJwtPayload(value);
  return payload?.role === "service_role";
}

export function configStatus(config) {
  const url = String(config?.supabaseUrl ?? "").trim();
  const key = String(config?.supabaseAnonKey ?? "").trim();
  if (isSecretKey(key)) return { ok: false, reason: "secret" };
  if (!url || !key) return { ok: false, reason: "missing" };
  if (/your[-_ ]|todo|changeme|placeholder|서비스롤|service_role/i.test(`${url} ${key}`)) {
    return { ok: false, reason: "missing" };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (key.length < 20) return { ok: false, reason: "invalid" };
  return { ok: true, reason: "ready" };
}
