import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SidebarRight from "@app/layouts/SidebarRight";

function renderInspector() {
  return render(
    <SidebarRight
      projectName="Quarterly review"
      dashboardName="Executive summary"
      widgets={[]}
      onToggleCollapsed={vi.fn()}
      onSelectWidget={vi.fn()}
      onRemoveWidget={vi.fn()}
    />
  );
}

describe("SidebarRight inspector tabs", () => {
  it("connects each tab to its panel and uses roving keyboard focus", async () => {
    const user = userEvent.setup();
    renderInspector();

    const tabs = screen.getAllByRole("tab");
    const initialPanel = screen.getByRole("tabpanel");

    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(tabs[0]).toHaveAttribute("aria-controls", initialPanel.id);
    expect(initialPanel).toHaveAttribute("aria-labelledby", tabs[0].id);

    tabs[0].focus();
    await user.keyboard("{ArrowRight}");

    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-controls", screen.getByRole("tabpanel").id);
  });
});
