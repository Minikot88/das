import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DemoHint from "@/components/dashboard-v2/DemoHint";
import { safeSetLocalStorage } from "@/services/projectStorage";
import { deleteSavedChart } from "@modules/charts/persistence/savedChartsStorage";
import { loadBuilderDraft } from "@/utils/storage";
import { readStoredThemeMode, writeStoredThemeMode } from "@shared/lib/themeMode";

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");

function blockLocalStorage() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("Storage access is blocked", "SecurityError");
    },
  });
}

describe("blocked browser storage", () => {
  beforeEach(blockLocalStorage);

  afterEach(() => {
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, "localStorage", originalLocalStorageDescriptor);
    }
  });

  it("falls back safely for shared storage utilities", () => {
    expect(readStoredThemeMode("system")).toBe("system");
    expect(() => writeStoredThemeMode("dark")).not.toThrow();
    expect(loadBuilderDraft()).toBeNull();
    expect(safeSetLocalStorage("blocked-storage-test", "value")).toBe(false);
    expect(deleteSavedChart("missing-chart")).toEqual([]);
  });

  it("keeps demo hints usable without persistent storage", () => {
    render(<DemoHint id="blocked-storage" title="Demo tip" description="Try this locally." />);

    expect(screen.getByText("Demo tip")).toBeInTheDocument();
    expect(() => fireEvent.click(screen.getByRole("button", { name: /ซ่อนคำแนะนำ/i }))).not.toThrow();
    expect(screen.queryByText("Demo tip")).not.toBeInTheDocument();
  });
});
