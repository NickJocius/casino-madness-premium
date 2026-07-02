import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlackjackTable } from "./BlackjackTable";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test stub standing in for next/image
    return <img {...rest} />;
  },
}));

describe("BlackjackTable", () => {
  it("renders the background table image", () => {
    render(
      <BlackjackTable
        dealerCards={<span>DEALER-MARKER</span>}
        playerCards={<span>PLAYER-MARKER</span>}
        dealerHandValue={null}
        playerHandValue={null}
      />,
    );

    expect(screen.getByAltText("Blackjack table")).toHaveAttribute(
      "src",
      "/images/blackjackTableSingle.png",
    );
  });

  it("renders dealerCards and playerCards, and shows both hand-value badges when both values are non-null", () => {
    render(
      <BlackjackTable
        dealerCards={<span>DEALER-MARKER</span>}
        playerCards={<span>PLAYER-MARKER</span>}
        dealerHandValue={17}
        playerHandValue={20}
      />,
    );

    expect(screen.getByText("DEALER-MARKER")).toBeInTheDocument();
    expect(screen.getByText("PLAYER-MARKER")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("applies the @container class to the root table container so cqw units resolve against it", () => {
    const { container } = render(
      <BlackjackTable
        dealerCards={<span>DEALER-MARKER</span>}
        playerCards={<span>PLAYER-MARKER</span>}
        dealerHandValue={null}
        playerHandValue={null}
      />,
    );

    expect(container.firstElementChild).toHaveClass("@container");
  });

  it("sizes the dealer and player card zones to a 9cqw, 5:7-aspect card slot", () => {
    render(
      <BlackjackTable
        dealerCards={<span>DEALER-MARKER</span>}
        playerCards={<span>PLAYER-MARKER</span>}
        dealerHandValue={null}
        playerHandValue={null}
      />,
    );

    const dealerZone = screen.getByText("DEALER-MARKER").parentElement;
    const playerZone = screen.getByText("PLAYER-MARKER").parentElement;

    expect(dealerZone).toHaveClass("[&>*]:w-[9cqw]");
    expect(dealerZone).toHaveClass("[&>*]:aspect-[5/7]");
    expect(playerZone).toHaveClass("[&>*]:w-[9cqw]");
    expect(playerZone).toHaveClass("[&>*]:aspect-[5/7]");
  });

  it("renders nothing for a null dealerHandValue while still showing a non-null playerHandValue", () => {
    render(
      <BlackjackTable
        dealerCards={<span>DEALER-MARKER</span>}
        playerCards={<span>PLAYER-MARKER</span>}
        dealerHandValue={null}
        playerHandValue={20}
      />,
    );

    expect(screen.getByText("DEALER-MARKER")).toBeInTheDocument();
    expect(screen.getByText("PLAYER-MARKER")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    // The dealer badge must render nothing at all when its value is null -
    // no placeholder, no zero, nothing visible for the hidden hole-card total.
    expect(screen.queryByText("17")).toBeNull();
  });

  it("renders cleanly with zero visible hand-value badges when both dealerHandValue and playerHandValue are null (mid-round, nothing resolved yet)", () => {
    render(
      <BlackjackTable
        dealerCards={<span>DEALER-MARKER</span>}
        playerCards={<span>PLAYER-MARKER</span>}
        dealerHandValue={null}
        playerHandValue={null}
      />,
    );

    expect(screen.getByText("DEALER-MARKER")).toBeInTheDocument();
    expect(screen.getByText("PLAYER-MARKER")).toBeInTheDocument();
    // Neither zone should have rendered a badge element at all.
    const dealerValueZone = screen.getByText("DEALER-MARKER")
      .parentElement?.nextElementSibling as HTMLElement;
    expect(dealerValueZone).toBeEmptyDOMElement();

    const playerValueZone = screen.getByText("PLAYER-MARKER")
      .parentElement?.nextElementSibling as HTMLElement;
    expect(playerValueZone).toBeEmptyDOMElement();
  });
});
