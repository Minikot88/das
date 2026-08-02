export function resolveLoginRedirect(from) {
  const pathname = typeof from?.pathname === "string" ? from.pathname : "";
  if (!isSafeInternalPathname(pathname)) return "/dashboard";
  const search = typeof from?.search === "string" && from.search.startsWith("?") ? from.search : "";
  const hash = typeof from?.hash === "string" && from.hash.startsWith("#") ? from.hash : "";
  return `${pathname}${search}${hash}`;
}

function isSafeInternalPathname(pathname) {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\")) return false;
  let decoded = pathname;
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return false;
  }
  return !decoded.startsWith("//") && !decoded.includes("\\") && !hasControlCharacter(decoded);
}

function hasControlCharacter(value) {
  return [...value].some((character) => character.codePointAt(0) <= 0x1f || character.codePointAt(0) === 0x7f);
}
