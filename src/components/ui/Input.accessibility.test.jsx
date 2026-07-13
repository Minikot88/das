import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Input from "./Input";

describe("Input accessibility", () => {
  it("associates its label and validation message with the input", () => {
    render(<Input label="Project name" error="Project name is required" />);

    const input = screen.getByRole("textbox", { name: "Project name" });
    const error = screen.getByRole("alert");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(error).toHaveTextContent("Project name is required");
  });
});
