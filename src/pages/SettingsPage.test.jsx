import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./SettingsPage";

const updateAppSettings = vi.fn();
const storeState = {
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
};

vi.mock("../store/useStore", () => ({
  useStore: (selector) => selector(storeState),
}));

describe("SettingsPage feature honesty", () => {
  beforeEach(() => {
    updateAppSettings.mockClear();
  });

  it("keeps consumed appearance settings enabled and marks unconsumed settings unavailable", () => {
    render(<SettingsPage />);

    expect(screen.getByLabelText("ธีม")).toBeEnabled();
    expect(screen.getByLabelText("ความหนาแน่น")).toBeEnabled();

    expect(screen.getByLabelText("รูปแบบวันที่")).toBeDisabled();
    expect(screen.getByLabelText("รูปแบบตัวเลข")).toBeDisabled();
    expect(screen.getByLabelText("พื้นที่วิเคราะห์เริ่มต้น")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /แสดงหัววิดเจ็ต/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /แสดงท้ายวิดเจ็ต/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /รีเฟรชแดชบอร์ดอัตโนมัติ/ })).toBeDisabled();
    expect(screen.getAllByText("ยังไม่พร้อมใช้งาน — รอการเชื่อมต่อกับระบบจริง")).toHaveLength(6);
  });

  it("does not persist a change from an unavailable setting", () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("รูปแบบวันที่"), {
      target: { value: "yyyy-MM-dd" },
    });

    expect(updateAppSettings).not.toHaveBeenCalled();
  });
});
