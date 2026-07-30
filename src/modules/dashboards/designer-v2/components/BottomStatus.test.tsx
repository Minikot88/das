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
        saveStatus="unsaved"
        lastSavedAt="18:07"
      />,
    );

    expect(screen.getByText("ยังไม่ได้บันทึก")).toBeInTheDocument();
    expect(screen.getByText("บันทึกล่าสุด 18:07")).toBeInTheDocument();
    expect(screen.queryByText("Auto Save")).not.toBeInTheDocument();
    expect(screen.queryByText("Server: Local")).not.toBeInTheDocument();
  });
});
