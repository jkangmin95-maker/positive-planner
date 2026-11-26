import { createClient } from "@supabase/supabase-js";

export function createSupabase(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

export async function readSession(supabase) {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error };
}

export function authRedirectUrl() {
  return document.querySelector("base")?.href || `${location.origin}/`;
}

export async function signInWithGoogle(supabase) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authRedirectUrl() },
  });
}

export async function signInWithEmail(supabase, email) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: authRedirectUrl(),
      shouldCreateUser: true,
    },
  });
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function consumeAuthError() {
  const url = new URL(location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const raw =
    url.searchParams.get("error_description") ||
    hash.get("error_description") ||
    url.searchParams.get("error") ||
    hash.get("error") ||
    "";
  if (url.searchParams.has("code") || url.searchParams.has("error") || url.hash.includes("error") || url.hash.includes("access_token")) {
    url.searchParams.delete("code");
    url.searchParams.delete("error");
    url.searchParams.delete("error_code");
    url.searchParams.delete("error_description");
    const search = url.searchParams.toString();
    history.replaceState({}, "", `${url.pathname}${search ? `?${search}` : ""}`);
  }
  return raw;
}

export function koreanAuthMessage(raw) {
  const text = String(raw || "").toLowerCase();
  if (!text) return "";
  if (text.includes("code verifier") || text.includes("pkce") || text.includes("both auth code")) {
    return "이 브라우저에서 받은 링크가 아닙니다. 이 창에서 로그인 링크를 다시 받아 주세요.";
  }
  if (text.includes("expired") || text.includes("invalid") || text.includes("otp")) {
    return "링크의 시간이 지났거나 이미 쓰였습니다. 다시 받아 주세요.";
  }
  if (text.includes("rate") || text.includes("seconds") || text.includes("once every")) {
    return "잠시 뒤에 다시 요청해 주세요.";
  }
  if (text.includes("fetch") || text.includes("network") || text.includes("failed to fetch")) {
    return "연결을 확인해 주세요. 잠시 뒤 다시 시도해 주세요.";
  }
  if (text.includes("provider") || text.includes("unsupported")) {
    return "Google 로그인이 아직 켜져 있지 않습니다. 이메일 링크를 쓰시거나, 설정의 Google 제공자를 켜 주세요.";
  }
  return "로그인되지 않았습니다. 잠시 뒤 다시 시도해 주세요.";
}
