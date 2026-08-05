import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FieldMapping from "@modules/dashboards/designer-v2/components/FieldMapping";
import { getAggregationOptions } from "@modules/dashboards/designer-v2/components/utils/fieldAggregation";
import type { DataField, MappingSlot } from "@modules/dashboards/designer-v2/components/types";

vi.mock("react-dnd", () => ({
  useDrag: () => [{ isDragging: false }, vi.fn()],
  useDrop: () => [{ isOver: false, validDrop: true }, vi.fn()],
}));

const revenueField: DataField = {
  id: "revenue",
  name: "Revenue",
  label: "Revenue",
  type: "number",
  semanticType: "currency",
  table: "orders",
  description: "Order revenue",
  sampleValues: [1200],
  isMeasure: true,
  isDimension: false,
  defaultAggregation: "Sum",
};

const mappings: MappingSlot[] = [
  {
    id: "xAxis",
    label: "X Axis",
    helper: "Choose a field",
    fields: [],
    aggregation: "None",
  },
];

describe("FieldMapping keyboard assignment", () => {
  it("recommends count distinct for an identifier instead of numeric summation", () => {
    const identifierSlot: MappingSlot = {
      id: "yAxis",
      label: "Value",
      helper: "Choose a value",
      fields: [{ ...revenueField, id: "article_id", name: "articles.id", label: "articles.id", semanticType: "identifier", isPrimaryKey: true, isMeasure: false, defaultAggregation: "Count Distinct" }],
      aggregation: "Count Distinct",
    };

    expect(getAggregationOptions(identifierSlot)).toEqual(["Count", "Count Distinct"]);
  });

  it("lets a keyboard user assign the selected field to a mapping target", async () => {
    const user = userEvent.setup();
    const onDropField = vi.fn();

    render(
      <FieldMapping
        mappings={mappings}
        rows={[]}
        filters={{}}
        chartType="bar"
        focusedSlotId={null}
        selectedField={revenueField}
        onDropField={onDropField}
        onRemoveField={vi.fn()}
        onAggregationChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSortSlot={vi.fn()}
      />
    );

    const target = screen.getByRole("button", { name: /Revenue.*X Axis/i });
    target.focus();
    await user.keyboard("{Enter}");

    expect(onDropField).toHaveBeenCalledWith("xAxis", revenueField);
  });

  it("lets a keyboard user replace a populated mapping target", async () => {
    const user = userEvent.setup();
    const onDropField = vi.fn();
    const currentField = { ...revenueField, id: "cost", name: "Cost", label: "Cost" };

    render(
      <FieldMapping
        mappings={[{ ...mappings[0], fields: [currentField] }]}
        rows={[]}
        filters={{}}
        chartType="bar"
        focusedSlotId={null}
        selectedField={revenueField}
        onDropField={onDropField}
        onRemoveField={vi.fn()}
        onAggregationChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSortSlot={vi.fn()}
      />
    );

    const target = screen.getByRole("button", { name: "แทนที่ X Axis ด้วย Revenue" });
    target.focus();
    await user.keyboard("{Enter}");

    expect(onDropField).toHaveBeenCalledWith("xAxis", revenueField);
  });
});
