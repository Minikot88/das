import { useSyncExternalStore } from "react";
import { workspaceRepository } from "@infrastructure/persistence/workspace-repository/workspaceRepository";

export function useWorkspaceSelector(selector, repository = workspaceRepository) {
  const snapshot = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  );
  return selector(snapshot);
}
