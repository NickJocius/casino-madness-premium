import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeltPanel } from "./FeltPanel";

describe("FeltPanel", () => {
  it("renders its children", () => {
    render(
      <FeltPanel>
        <span>hand</span>
      </FeltPanel>,
    );

    expect(screen.getByText("hand")).toBeInTheDocument();
  });

  it("merges a custom className with the base felt-panel class", () => {
    const { container } = render(
      <FeltPanel className="flex gap-2">
        <span>hand</span>
      </FeltPanel>,
    );

    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("felt-panel");
    expect(root).toHaveClass("flex");
    expect(root).toHaveClass("gap-2");
  });
});
