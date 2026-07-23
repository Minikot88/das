export function resolveLoginRedirect(from) {
  const pathname = typeof from?.pathname === "string" ? from.pathname : "";
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return "/dashboard";
  const search = typeof from?.search === "string" && from.search.startsWith("?") ? from.search : "";
  const hash = typeof from?.hash === "string" && from.hash.startsWith("#") ? from.hash : "";
  return `${pathname}${search}${hash}`;
}
