import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@modules/settings/pages/SettingsPage";

const updateAppSettings = vi.fn();
const setLanguage = vi.fn();
const runtimeMode = vi.hoisted(() => ({ mock: true }));
const preferencesApi = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
const storeState = {
  locale: "th",
  appSettings: {
    theme: "light",
    density: "comfortable",
    dateFormat: "MMM d, yyyy",
    numberFormat: "compact",
    dashboardPreferences: {
      defaultCanvasPreset: "auto",
      showWidgetHeaders: true,
      showWidgetFooters: true,
      autoRefresh: false,
    },
  },
  updateAppSettings,
  setLanguage,
};

vi.mock("@infrastructure/http/client", () => ({ isMockMode: () => runtimeMode.mock }));

vi.mock("@modules/settings/api/settingsApi", () => ({
  loadPreferences: preferencesApi.load,
  savePreferences: preferencesApi.save,
}));

vi.mock("@app/store/useStore", () => ({
  useStore: (selector) => selector(storeState),
}));

describe("SettingsPage feature honesty", () => {
  beforeEach(() => {
    runtimeMode.mock = true;
    updateAppSettings.mockClear();
    setLanguage.mockClear();
    preferencesApi.load.mockReset();
    preferencesApi.save.mockReset();
  });

  it("keeps persisted appearance and formatting settings enabled while future settings remain unavailable", () => {
    render(<SettingsPage />);

    expect(screen.getByLabelText("ธีม")).toBeEnabled();
    expect(screen.getByLabelText("ความหนาแน่น")).toBeEnabled();

    expect(screen.getByLabelText("รูปแบบวันที่")).toBeEnabled();
    expect(screen.getByLabelText("รูปแบบตัวเลข")).toBeEnabled();
    expect(screen.getByLabelText("พื้นที่วิเคราะห์เริ่มต้น")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /แสดงหัววิดเจ็ต/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /แสดงท้ายวิดเจ็ต/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /รีเฟรชแดชบอร์ดอัตโนมัติ/ })).toBeDisabled();
    expect(screen.getAllByText("ยังไม่พร้อมใช้งาน — รอการเชื่อมต่อกับระบบจริง")).toHaveLength(4);
  });

  it("persists a formatting change in local/mock mode", () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("รูปแบบวันที่"), {
      target: { value: "yyyy-MM-dd" },
    });

    expect(updateAppSettings).toHaveBeenCalledWith({ dateFormat: "yyyy-MM-dd" });
  });

  it("loads and saves preferences through the HTTP adapter", async () => {
    runtimeMode.mock = false;
    preferencesApi.load.mockResolvedValue({
      revision: 4,
      theme: "dark",
      density: "compact",
      dateFormat: "yyyy-MM-dd",
      numberFormat: "standard",
      locale: "en",
    });
    preferencesApi.save.mockResolvedValue({ revision: 5 });

    render(<SettingsPage />);

    expect(await screen.findByRole("status")).toHaveTextContent("บันทึกการตั้งค่าแล้ว");
    expect(updateAppSettings).toHaveBeenCalledWith(expect.objectContaining({
      theme: "dark",
      density: "compact",
      dateFormat: "yyyy-MM-dd",
      numberFormat: "standard",
    }));
    expect(setLanguage).toHaveBeenCalledWith("en");

    fireEvent.change(screen.getByLabelText("รูปแบบตัวเลข"), { target: { value: "currency" } });
    await waitFor(() => expect(preferencesApi.save).toHaveBeenCalledWith(expect.objectContaining({
      revision: 4,
      numberFormat: "currency",
      locale: "th",
    })));
  });
});
