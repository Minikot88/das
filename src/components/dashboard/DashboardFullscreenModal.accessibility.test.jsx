import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DashboardFullscreenModal from "@/components/dashboard/DashboardFullscreenModal";

vi.mock("./ChartCard", () => ({
  default: () => <button type="button">Chart action</button>,
}));

describe("DashboardFullscreenModal accessibility", () => {
  it("moves initial focus into the dialog and keeps Tab focus inside it", async () => {
    const user = userEvent.setup();
    render(
      <DashboardFullscreenModal
        chart={{ title: "Revenue", chartType: "bar", dataset: "Orders" }}
        sheetId="sheet-1"
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    const buttons = within(dialog).getAllByRole("button");
    const firstButton = buttons[0];
    const lastButton = buttons.at(-1);

    await waitFor(() => expect(firstButton).toHaveFocus());
    lastButton.focus();
    await user.tab();

    expect(firstButton).toHaveFocus();
  });
});
