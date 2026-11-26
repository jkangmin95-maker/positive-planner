const ROUTES = [
  { re: /^\/$/, name: "home" },
  { re: /^\/today$/, name: "today" },
  { re: /^\/day\/(\d{4}-\d{2}-\d{2})$/, name: "today", keys: ["date"] },
  { re: /^\/week$/, name: "week" },
  { re: /^\/week\/(\d{4}-\d{2}-\d{2})$/, name: "week", keys: ["date"] },
  { re: /^\/worksheet$/, name: "worksheets" },
  { re: /^\/worksheet\/([abc])$/, name: "worksheet", keys: ["type"] },
  { re: /^\/worksheet\/([abc])\/([0-9a-f-]{8,}|new)$/i, name: "worksheetEdit", keys: ["type", "id"] },
  { re: /^\/review$/, name: "review" },
  { re: /^\/review\/(week|4week|13week)$/, name: "review", keys: ["kind"] },
  { re: /^\/month$/, name: "month" },
  { re: /^\/month\/(\d{4}-\d{2})$/, name: "month", keys: ["month"] },
  { re: /^\/guide$/, name: "guide" },
  { re: /^\/practice$/, name: "practice" },
  { re: /^\/settings$/, name: "settings" },
  { re: /^\/more$/, name: "more" },
  { re: /^\/install$/, name: "install" },
];

export function stripBase(pathname, base) {
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  if (!normalized || normalized === "") return pathname || "/";
  if (pathname === normalized || pathname === `${normalized}/`) return "/";
  if (pathname.startsWith(`${normalized}/`)) return pathname.slice(normalized.length) || "/";
  return pathname || "/";
}

export function matchPath(fullPath) {
  const noHash = fullPath.split("#")[0];
  const qIndex = noHash.indexOf("?");
  const pathname = qIndex >= 0 ? noHash.slice(0, qIndex) : noHash;
  const query = new URLSearchParams(qIndex >= 0 ? noHash.slice(qIndex + 1) : "");
  const path = pathname || "/";
  for (const route of ROUTES) {
    const match = path.match(route.re);
    if (!match) continue;
    const params = {};
    (route.keys || []).forEach((key, index) => {
      params[key] = match[index + 1];
    });
    return { name: route.name, params, query };
  }
  return { name: "missing", params: {}, query };
}

export function currentRoute() {
  const base = document.querySelector("base")?.getAttribute("href") || "/";
  const path = stripBase(location.pathname, base);
  return matchPath(`${path}${location.search}`);
}

export function toUrl(path) {
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const qIndex = withoutHash.indexOf("?");
  const pathname = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const search = new URLSearchParams(qIndex >= 0 ? withoutHash.slice(qIndex + 1) : "");
  const preview = new URLSearchParams(location.search).get("preview");
  if (preview && !search.has("preview")) search.set("preview", preview);
  const baseAttr = document.querySelector("base")?.getAttribute("href") || "/";
  const basePath = baseAttr.endsWith("/") ? baseAttr.slice(0, -1) : baseAttr;
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const qs = search.toString();
  return `${basePath}${clean}${qs ? `?${qs}` : ""}${hash}`;
}

export function go(path, { replace = false } = {}) {
  const url = toUrl(path);
  if (replace) history.replaceState({}, "", url);
  else history.pushState({}, "", url);
  window.dispatchEvent(new CustomEvent("pp-navigate"));
}
