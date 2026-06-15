import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import EnterpriseDataTable from "./EnterpriseDataTable";

const rows = Array.from({ length: 80 }, (_, index) => ({
  id: `row-${index}`,
  name: index === 42 ? "Needle" : `Item ${index}`,
  value: index,
}));

const columns = [
  { key: "name", label: "Name" },
  { key: "value", label: "Value" },
];

describe("EnterpriseDataTable", () => {
  it("filters, sorts, paginates, and exposes sort state", async () => {
    const user = userEvent.setup();
    render(<EnterpriseDataTable title="ตัวอย่างชุดข้อมูล" rows={rows} columns={columns} initialPageSize={25} />);

    expect(screen.getByText("ตัวอย่างชุดข้อมูล")).toBeInTheDocument();
    await user.type(screen.getByLabelText("กรองตาราง"), "Needle");
    expect(screen.getByText("Needle")).toBeInTheDocument();
    expect(screen.getByText("1 แถว / 2 คอลัมน์")).toBeInTheDocument();

    const valueHeader = screen.getByRole("columnheader", { name: /valueเรียง/i });
    await user.click(within(valueHeader).getByRole("button", { name: "เรียงตาม Value" }));
    expect(valueHeader).toHaveAttribute("aria-sort", "ascending");
  });
});
