import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ShareDialog from "@modules/dashboards/designer-v2/components/ShareDialog";

describe("Dashboard Designer V2 share dialog", () => {
  it("does not expose the authenticated designer URL as a share or embed target", () => {
    window.history.replaceState({}, "", "/dashboard-v2?chartId=private-chart");

    render(
      <ShareDialog
        open
        access="private"
        copyFallback={null}
        onAccessChange={vi.fn()}
        onClose={vi.fn()}
        onCopy={vi.fn()}
        onCopyEmbed={vi.fn()}
      />,
    );

    expect((screen.getByLabelText("Share link") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Embed code") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByText(/Dashboard.+Local snapshot/i)).not.toBeNull();
    const buttons = screen.getAllByRole("button");
    expect((buttons.at(-1) as HTMLButtonElement).disabled).toBe(true);
    expect((buttons.at(-2) as HTMLButtonElement).disabled).toBe(true);
  });
});
