import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChartCard from "./ChartCard";

vi.mock("../charts/ChartRenderer", () => ({ default: () => <div>chart canvas</div> }));
vi.mock("../charts/ChartSkeleton", () => ({ default: () => <div>loading chart</div> }));

describe("ChartCard accessible data", () => {
  it("provides a compact table equivalent for graphical rows", () => {
    render(
      <ChartCard
        chart={{
          id: "chart-accessible",
          title: "Revenue by region",
          type: "bar",
          dataset: "sales.csv",
          rows: [
            { region: "North", revenue: 42 },
            { region: "South", revenue: 18 },
          ],
        }}
        pixelHeight={320}
      />
    );

    const table = screen.getByRole("table", { name: "Data preview for Revenue by region" });
    expect(within(table).getByRole("columnheader", { name: "region" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "North" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "42" })).toBeInTheDocument();
  });
});
