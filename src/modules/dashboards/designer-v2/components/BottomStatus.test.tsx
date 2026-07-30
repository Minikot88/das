import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BottomStatus from "./BottomStatus";

describe("BottomStatus", () => {
  it("shows one truthful save status without demo or auto-save labels", () => {
    render(
      <BottomStatus
        mappings={[]}
        datasourceName="scopus.sc_articles"
        sourceLabel="Dataset"
        rowCount={6004}
        fieldCount={5}
        filteredRowCount={6004}
        activeFilterCount={0}
        saveStatus="unsaved"
        lastSavedAt="18:07"
      />,
    );

    expect(screen.getByText("ยังไม่ได้บันทึก")).toBeInTheDocument();
    expect(screen.getByText("บันทึกล่าสุด 18:07")).toBeInTheDocument();
    expect(screen.queryByText("Auto Save")).not.toBeInTheDocument();
    expect(screen.queryByText("Server: Local")).not.toBeInTheDocument();
  });

  it("shows the same active filter count used by Preview", () => {
    render(
      <BottomStatus
        mappings={[]}
        datasourceName="scopus.sc_affiliations"
        sourceLabel="Dataset"
        rowCount={3985}
        fieldCount={6}
        filteredRowCount={120}
        activeFilterCount={2}
        saveStatus="failed"
        lastSavedAt="18:07"
      />,
    );
    expect(screen.getByText("2 Filters")).toBeInTheDocument();
    expect(screen.getByText("บันทึกไม่สำเร็จ")).toBeInTheDocument();
  });
});
