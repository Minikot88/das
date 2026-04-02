export function createEntityId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
