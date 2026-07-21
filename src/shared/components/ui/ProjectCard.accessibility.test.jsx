import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ProjectCard from "@shared/components/ui/ProjectCard";

const project = {
  id: "project-1",
  name: "Quarterly review",
  dashboards: [],
  datasets: [],
  charts: [],
};

describe("ProjectCard accessibility", () => {
  it("keeps project actions outside a nested interactive card control", () => {
    const { container } = render(
      <ProjectCard project={project} onOpen={vi.fn()} summary={{ dashboardList: [] }} />
    );

    expect(container.querySelectorAll('[role="button"] button')).toHaveLength(0);
  });

  it("does not open the project when a keyboard user opens the manage menu", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { container } = render(
      <ProjectCard project={project} onOpen={onOpen} summary={{ dashboardList: [] }} />
    );

    const manageButton = container.querySelector(".project-card-manage-btn");
    expect(manageButton).not.toBeNull();

    manageButton.focus();
    await user.keyboard("{Enter}");

    expect(onOpen).not.toHaveBeenCalled();
    expect(manageButton).toHaveAttribute("aria-expanded", "true");
  });
});
