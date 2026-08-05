import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { MainLayout } from "@app/layouts/Layout";
import { SessionContext } from "@modules/session/sessionContext";

const verifiedSession = {
  status: "authenticated",
  session: { displayName: "Test operator", authMode: "external" },
  error: null,
  refresh: async () => {},
};

function renderLayout(initialEntry, child) {
  return render(
    <SessionContext.Provider value={verifiedSession}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<MainLayout />}>{child}</Route>
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>,
  );
}

describe("MainLayout accessibility", () => {
  it("provides one main landmark and a keyboard skip link", () => {
    renderLayout(
      "/home",
      <Route path="/home" element={<section aria-label="หน้าแรก">เนื้อหา</section>} />,
    );

    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "ข้ามไปยังเนื้อหาหลัก" })).toHaveAttribute("href", "#main-content");
  });

  it("updates the route title and moves focus to the main landmark", async () => {
    renderLayout(
      "/datasets",
      <Route path="/datasets" element={<h1>Datasets</h1>} />,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(main).toHaveFocus());
    expect(document.title).toBe("Datasets | Mini BI");
  });
});
