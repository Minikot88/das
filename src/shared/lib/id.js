export function createEntityId(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  return `${prefix}-${Date.now()}`;
}

export function createInstanceId() {
  return createEntityId("inst");
}

export function createTimestampId(existingIds = []) {
  let nextId = Date.now();
  const used = new Set(existingIds);

  while (used.has(nextId)) {
    nextId += 1;
  }

  return nextId;
}

export function createCopyName(value = "Untitled") {
  return /\(copy(?: \d+)?\)$/i.test(value) ? value : `${value} (copy)`;
}
