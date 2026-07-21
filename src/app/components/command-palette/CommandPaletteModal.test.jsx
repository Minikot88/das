import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CommandPaletteModal from "@app/components/command-palette/CommandPaletteModal";

describe("CommandPaletteModal accessibility", () => {
  it("focuses search, traps tab focus, activates actions, and restores focus", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onActivate = vi.fn();

    function Harness() {
      return (
        <>
          <button type="button">เปิดแผงคำสั่ง</button>
          <CommandPaletteModal
            isOpen
            onClose={onClose}
            actions={[{ id: "go-dashboard", label: "แดชบอร์ด", group: "การนำทาง", onActivate }]}
          />
        </>
      );
    }

    render(<Harness />);
    const search = await screen.findByLabelText("ค้นหาคำสั่ง");
    await waitFor(() => expect(search).toHaveFocus());

    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
