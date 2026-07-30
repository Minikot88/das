import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MultiTableContext from "./MultiTableContext";
import type { DataField } from "./types";

const fields: DataField[] = [
  {
    id: "articles_journal_id", name: "articles.journal_id", label: "articles.journal_id",
    type: "number", semanticType: "category", table: "scopus.sc_articles", description: "",
    sampleValues: [], isMeasure: false, isDimension: true, defaultAggregation: "Count",
    physicalType: "bigint", sourceSchema: "scopus", sourceTable: "sc_articles", sourceAlias: "articles",
  },
  {
    id: "journals_id", name: "journals.id", label: "journals.id",
    type: "number", semanticType: "category", table: "scopus.sc_journals", description: "",
    sampleValues: [], isMeasure: false, isDimension: true, defaultAggregation: "Count",
    physicalType: "bigint", sourceSchema: "scopus", sourceTable: "sc_journals", sourceAlias: "journals",
  },
];

describe("MultiTableContext", () => {
  it("exposes a keyboard-operable manual join and explicit type controls", () => {
    const onSetJoin = vi.fn();
    const onSemanticTypeChange = vi.fn();
    const onSafeCastChange = vi.fn();
    render(<MultiTableContext
      tables={[
        { schema: "scopus", table: "sc_articles", alias: "articles" },
        { schema: "scopus", table: "sc_journals", alias: "journals" },
      ]}
      joins={[]}
      fields={fields}
      queryPreview={null}
      safeCasts={{}}
      onSetJoin={onSetJoin}
      onRemoveTable={vi.fn()}
      onSemanticTypeChange={onSemanticTypeChange}
      onSafeCastChange={onSafeCastChange}
      onAddCalculatedField={vi.fn()}
    />);

    const summary = screen.getByRole("button", { name: /^ตารางที่ใช้/ });
    if (summary.getAttribute("aria-expanded") === "false") fireEvent.click(summary);
    expect(screen.getByRole("group", { name: /Manual Join/ })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText("Left column"));
    fireEvent.click(screen.getByRole("option", { name: /articles\.journal_id/ }));
    fireEvent.mouseDown(screen.getByLabelText("Right column"));
    fireEvent.click(screen.getByRole("option", { name: /journals\.id/ }));
    fireEvent.click(screen.getByRole("button", { name: "ตรวจสอบและใช้ Join" }));
    expect(onSetJoin).toHaveBeenCalledWith(expect.objectContaining({
      left: expect.objectContaining({ column: "journal_id" }),
      right: expect.objectContaining({ column: "id" }),
      joinType: "left",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Physical / Semantic Type" }));
    expect(screen.getByLabelText("Semantic Type ของ articles.journal_id")).toBeInTheDocument();
    expect(screen.getByLabelText("Safe Cast ของ articles.journal_id")).toBeInTheDocument();
  });
});
