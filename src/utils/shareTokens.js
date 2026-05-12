export function createShareToken(prefix = "shr") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${prefix}-${token}`;
  }

  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${fallback}`;
}
