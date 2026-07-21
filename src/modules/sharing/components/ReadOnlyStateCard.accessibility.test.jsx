import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ReadOnlyStateCard from "@modules/sharing/components/ReadOnlyStateCard";

describe("ReadOnlyStateCard accessibility", () => {
  it("has no detectable WCAG A/AA violations in its unavailable state", async () => {
    const { container } = render(
      <MemoryRouter>
        <ReadOnlyStateCard
          kicker="ลิงก์ Local"
          title="ไม่พบแดชบอร์ด"
          description="ลิงก์นี้ใช้ได้เฉพาะเบราว์เซอร์ที่สร้างลิงก์"
          linkTo="/login"
          linkLabel="กลับไปหน้าเข้าสู่ระบบ"
        />
      </MemoryRouter>
    );

    const result = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });

    expect(result.violations).toEqual([]);
  });

  it("supports a page-level heading for standalone readonly states", () => {
    render(
      <MemoryRouter>
        <ReadOnlyStateCard
          headingLevel={1}
          title="ไม่พบแดชบอร์ด"
          description="ลิงก์นี้ไม่พร้อมใช้งาน"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "ไม่พบแดชบอร์ด" })).toBeInTheDocument();
  });
});
