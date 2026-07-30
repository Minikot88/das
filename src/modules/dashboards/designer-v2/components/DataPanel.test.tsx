import React from "react";
import { render, screen } from "@testing-library/react";
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
});
