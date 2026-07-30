import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DataPanel from "./DataPanel";

vi.mock("@modules/dashboards/designer-v2/components/DraggableField", () => ({
  default: ({ field }: { field: { name: string } }) => <div>{field.name}</div>,
}));

describe("DataPanel", () => {
  it("uses the complete explorer pane for the tree without a duplicated metadata footer", () => {
    render(
      <DataPanel
        datasources={[{ id: "scopus", name: "scopus.sc_affiliations", database: "PostgreSQL", schema: "scopus", table: "sc_affiliations", rowCount: 3985, fieldCount: 6, lastUpdated: "2026-07-29T19:45:03.537Z" }]}
        schemaCatalog={[{ schemaName: "scopus", displayName: "scopus", tables: [{ name: "sc_affiliations", rowCountEstimate: 3985 }] }]}
        activeDatasourceId="scopus"
        fields={[{ id: "id", name: "id", label: "id", type: "text", semanticType: "category", table: "sc_affiliations", description: "", sampleValues: [], isMeasure: false, isDimension: true, defaultAggregation: "Count" }]}
        rows={[{ id: 1 }]}
        searchValue=""
        selectedTable="sc_affiliations"
        selectedFieldId={null}
        onSearchChange={vi.fn()}
        onDatasourceChange={vi.fn()}
        onSelectTable={vi.fn()}
        onSelectField={vi.fn()}
      />,
    );

    expect(screen.getByRole("tree")).toHaveClass("dashboard-v2-scrollarea");
    expect(screen.queryByText("2026-07-29T19:45:03.537Z")).not.toBeInTheDocument();
    expect(screen.queryByText("1 rows · 1 fields")).not.toBeInTheDocument();
  });

  it("lets users activate any catalog table instead of rendering inert table rows", () => {
    const onSelectTable = vi.fn();
    render(
      <DataPanel
        datasources={[{ id: "articles", name: "scopus.sc_articles", database: "PostgreSQL", schema: "scopus", table: "sc_articles", rowCount: 6004, fieldCount: 2, lastUpdated: "" }]}
        schemaCatalog={[{ schemaName: "scopus", displayName: "scopus", tables: [{ name: "sc_articles", rowCountEstimate: 6004 }, { name: "sc_authors", rowCountEstimate: 16299 }] }]}
        activeDatasourceId="articles"
        fields={[{ id: "id", name: "id", label: "id", type: "text", semanticType: "category", table: "sc_articles", description: "", sampleValues: [], isMeasure: false, isDimension: true, defaultAggregation: "Count" }]}
        rows={[]}
        searchValue=""
        selectedTable="sc_articles"
        selectedFieldId={null}
        onSearchChange={vi.fn()}
        onDatasourceChange={vi.fn()}
        onSelectTable={onSelectTable}
        onSelectField={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "scopus" }));
    fireEvent.click(screen.getByRole("button", { name: /^Tables/ }));
    fireEvent.click(screen.getByRole("button", { name: "sc_authors" }));
    expect(onSelectTable).toHaveBeenCalledWith("scopus", "sc_authors");
    expect(screen.getByText("เลือกเพิ่มได้สูงสุด 6 ตาราง")).toBeInTheDocument();
  });
});
