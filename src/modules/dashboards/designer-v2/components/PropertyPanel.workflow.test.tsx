import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PropertyPanel from "@modules/dashboards/designer-v2/components/PropertyPanel";
import { createDefaultConfig } from "@modules/dashboards/designer-v2/components/mockData";
import type { DataField } from "@modules/dashboards/designer-v2/components/types";

const city: DataField = {
  id: "city",
  name: "city",
  label: "city",
  type: "text",
  semanticType: "category",
  table: "scopus.sc_affiliations",
  description: "",
  sampleValues: [],
  isMeasure: false,
  isDimension: true,
  defaultAggregation: "None",
};

const id: DataField = {
  ...city,
  id: "id",
  name: "id",
  label: "id",
  type: "number",
  semanticType: "quantity",
  isMeasure: true,
  isDimension: false,
  defaultAggregation: "Count",
};

function config() {
  const value = createDefaultConfig();
  value.settings.general.title = "";
  value.settings.general.subtitle = "";
  value.mappings = value.mappings.map((slot) =>
    slot.id === "xAxis"
      ? { ...slot, fields: [city], aggregation: "None" }
      : slot.id === "yAxis"
        ? { ...slot, fields: [id], aggregation: "Count" }
        : { ...slot, fields: [] },
  );
  return value;
}

function renderPanel(chartConfig = config(), onSettingsChange = vi.fn()) {
  render(
    <PropertyPanel
      config={chartConfig}
      onSettingsChange={onSettingsChange}
      onSave={vi.fn()}
      onPreview={vi.fn()}
      onShare={vi.fn()}
      onExportJson={vi.fn()}
      onExportCsv={vi.fn()}
      onExportPng={vi.fn()}
      onReset={vi.fn()}
      onCopyConfig={vi.fn()}
      onReplaceConfig={vi.fn()}
      themePresets={[]}
      onThemePresetChange={vi.fn()}
    />,
  );
}

describe("PropertyPanel workflow", () => {
  it("orders settings by the user workflow and exposes axis display outside Advanced", () => {
    renderPanel();
    const headings = screen.getAllByRole("button").map((button) => button.textContent);
    expect(headings).toEqual(expect.arrayContaining(["พื้นฐาน", "ข้อมูลและแกน", "รูปแบบ", "การแสดงผล", "ขั้นสูง"]));
    expect(screen.getByText("X Axis · city")).toBeInTheDocument();
    expect(screen.getByText("Y Axis · Count(id)")).toBeInTheDocument();
    expect(screen.getAllByText("scopus.sc_affiliations")).toHaveLength(2);
  });

  it("switches an automatic axis title to custom and can reset it", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    const value = config();
    const { rerender } = render(
      <PropertyPanel
        config={value}
        onSettingsChange={onSettingsChange}
        onSave={vi.fn()}
        onPreview={vi.fn()}
        onShare={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
        onExportPng={vi.fn()}
        onReset={vi.fn()}
        onCopyConfig={vi.fn()}
        onReplaceConfig={vi.fn()}
        themePresets={[]}
        onThemePresetChange={vi.fn()}
      />,
    );
    const xTitle = screen.getByLabelText("ชื่อแสดงผล X Axis");
    fireEvent.change(xTitle, { target: { value: "เมืองที่ตั้ง" } });
    expect(onSettingsChange).toHaveBeenCalledWith("axis", expect.objectContaining({
      xTitle: { titleMode: "custom", customTitle: "เมืองที่ตั้ง" },
    }));

    value.settings.axis.xTitle = { titleMode: "custom", customTitle: "เมืองที่ตั้ง" };
    rerender(
      <PropertyPanel
        config={value}
        onSettingsChange={onSettingsChange}
        onSave={vi.fn()}
        onPreview={vi.fn()}
        onShare={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
        onExportPng={vi.fn()}
        onReset={vi.fn()}
        onCopyConfig={vi.fn()}
        onReplaceConfig={vi.fn()}
        themePresets={[]}
        onThemePresetChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "กลับไปใช้ชื่ออัตโนมัติ X Axis" }));
    expect(onSettingsChange).toHaveBeenCalledWith("axis", expect.objectContaining({
      xTitle: { titleMode: "auto", customTitle: "" },
    }));
  });

  it.each(["pie", "donut"] as const)("uses Category and Value language for %s", async (chartType) => {
    const value = config();
    value.chartType = chartType;
    value.mappings = value.mappings.map((slot) =>
      slot.id === "category"
        ? { ...slot, fields: [city] }
        : slot.id === "value"
          ? { ...slot, fields: [id], aggregation: "Count" }
          : slot,
    );
    renderPanel(value);
    await userEvent.click(screen.getByRole("button", { name: "ข้อมูลและแกน" }));
    expect(screen.getByText("Category · city")).toBeInTheDocument();
    expect(screen.getByText("Value · Count(id)")).toBeInTheDocument();
    expect(screen.queryByText(/^X Axis ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Y Axis ·/)).not.toBeInTheDocument();
  });
});
