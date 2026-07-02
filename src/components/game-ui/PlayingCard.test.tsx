import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayingCard } from "./PlayingCard";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test stub standing in for next/image
    return <img {...rest} />;
  },
}));

describe("PlayingCard", () => {
  it("renders both the front and back face images when faceUp is true", () => {
    render(<PlayingCard card={{ suit: "hearts", rank: "A" }} faceUp={true} />);

    expect(screen.getByAltText("A of hearts")).toHaveAttribute("src", "/images/heartsA.png");
    expect(screen.getByAltText("Card back")).toHaveAttribute("src", "/images/cardback.png");
  });

  it("renders the same two image assets when faceUp is false (only the CSS transform changes)", () => {
    render(<PlayingCard card={{ suit: "hearts", rank: "A" }} faceUp={false} />);

    expect(screen.getByAltText("A of hearts")).toHaveAttribute("src", "/images/heartsA.png");
    expect(screen.getByAltText("Card back")).toHaveAttribute("src", "/images/cardback.png");
  });

  it("marks the front face visible and the back face hidden when faceUp is true", () => {
    render(<PlayingCard card={{ suit: "hearts", rank: "A" }} faceUp={true} />);

    const frontFace = screen.getByAltText("A of hearts").closest(".card-face-front");
    const backFace = screen.getByAltText("Card back").closest(".card-face-back");

    expect(frontFace).toHaveAttribute("aria-hidden", "false");
    expect(backFace).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the back face visible and the front face hidden when faceUp is false", () => {
    render(<PlayingCard card={{ suit: "hearts", rank: "A" }} faceUp={false} />);

    const frontFace = screen.getByAltText("A of hearts").closest(".card-face-front");
    const backFace = screen.getByAltText("Card back").closest(".card-face-back");

    expect(frontFace).toHaveAttribute("aria-hidden", "true");
    expect(backFace).toHaveAttribute("aria-hidden", "false");
  });

  it("renders only the back face and no front-face image element when card is null", () => {
    const { container } = render(<PlayingCard card={null} faceUp={false} />);

    expect(screen.getByAltText("Card back")).toHaveAttribute("src", "/images/cardback.png");

    // Prefer a direct DOM query for the front-face wrapper over queryByAltText with a
    // suit/rank regex: it doesn't depend on guessing every possible alt-text pattern and
    // directly proves the front <Image> (and its network-triggering src) never mounts.
    expect(container.querySelector(".card-face-front")).toBeNull();
    expect(screen.queryByAltText(/of (hearts|diamonds|clubs|spades)/)).toBeNull();
  });

  it("throws a contract-violation error when faceUp is true but card is null", () => {
    // PlayingCard throws synchronously during render (no error boundary involved), so
    // RTL's render() surfaces it directly here. React may additionally log a
    // console.error for the uncaught render error — that's expected noise, not a bug.
    expect(() => render(<PlayingCard card={null} faceUp={true} />)).toThrow();
  });
});
