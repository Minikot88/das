import { describe, expect, it } from "vitest";
import appStylesheet from "@/styles.css?raw";
import stylesheet from "@/styles/enterpriseBiRedesign.css?raw";
import darkModeStylesheet from "@/styles/realDarkMode.css?raw";

describe("dashboard inspector responsive styles", () => {
  it("does not hide the inspector that contains the properties controls", () => {
    expect(stylesheet).not.toMatch(
      /\.dashboard-workspace-page\s+\.dashboard-sidebar\s*\{\s*display:\s*none\s*!important;/
    );
  });

  it("does not force app chrome to the viewport width when a vertical scrollbar is present", () => {
    const appChromeStyles = `${appStylesheet}\n${darkModeStylesheet}`;

    expect(appChromeStyles).not.toMatch(/min-width:\s*100d?vw\s*!important/);
  });
});
