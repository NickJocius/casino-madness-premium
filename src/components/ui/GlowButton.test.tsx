import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlowButton } from "./GlowButton";

describe("GlowButton", () => {
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GlowButton onClick={onClick}>Click me</GlowButton>);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <GlowButton onClick={onClick} disabled>
        Click me
      </GlowButton>,
    );

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeDisabled();

    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to the red accent color when no accent prop is passed", () => {
    render(<GlowButton>Sign in</GlowButton>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button.style.getPropertyValue("--glow-accent")).toBe("#FE1323");
  });

  it("sets the blue accent color when accent='blue'", () => {
    render(<GlowButton accent="blue">Sign in</GlowButton>);

    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button.style.getPropertyValue("--glow-accent")).toBe("#194FFF");
  });
});
