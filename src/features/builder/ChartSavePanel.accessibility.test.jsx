import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChartSavePanel from "./ChartSavePanel";

function renderPanel(overrides = {}) {
  const props = {
    validation: { valid: true, warnings: [] },
    saving: false,
    onSettingChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  render(<ChartSavePanel {...props} />);
  return props;
}

describe("ChartSavePanel accessibility", () => {
  it("keeps keyboard focus inside the modal", async () => {
    const user = userEvent.setup();
    renderPanel();

    const dialog = screen.getByRole("dialog");
    const buttons = within(dialog).getAllByRole("button");
    const firstButton = buttons[0];
    const lastButton = buttons.at(-1);

    await waitFor(() => expect(firstButton).toHaveFocus());
    lastButton.focus();
    await user.tab();

    expect(firstButton).toHaveFocus();
  });

  it("closes from Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel({ onClose });

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
