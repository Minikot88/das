import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MainLayout } from "./Layout";

describe("MainLayout accessibility", () => {
  it("provides one main landmark and a keyboard skip link", () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/home" element={<section aria-label="หน้าแรก">เนื้อหา</section>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "ข้ามไปยังเนื้อหาหลัก" })).toHaveAttribute("href", "#main-content");
  });

  it("updates the route title and moves focus to the main landmark", async () => {
    render(
      <MemoryRouter initialEntries={["/datasets"]}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/datasets" element={<h1>Datasets</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(main).toHaveFocus());
    expect(document.title).toBe("Datasets | Mini BI");
  });
});
