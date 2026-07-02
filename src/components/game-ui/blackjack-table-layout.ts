export const TABLE_ASPECT_RATIO = "1672 / 941";

// Just below the curved top rail, aligned with the art's printed dealing-tray
// outline (~6.4%-18.6% of image height) - dealer's row starts inside it.
export const DEALER_CARD_ZONE = { top: "10%", left: "50%" } as const;

// There is no clean centered gap at any height: the felt's printed paytable
// banner spans roughly x 29.5%-70.5% / y 34%-47% (widest line, "DEALER MUST
// DRAW...", is the binding edge), and the dealer card row (9cqw slots,
// centered) spans roughly x 36.5%-63.5% / y 10%-32% - every centered
// position collides with one or the other. The genuinely open felt is off to
// the side of the banner row instead (x ~71%-100%, same y 34%-47% band),
// clear of both the printed text and the card spread, and above the faint
// unused "ghost" betting circle on that side (which sits lower, ~y 50%-71%).
// This is meant for a small badge (a hand-value number), not a wide banner -
// a large element here would still run into the ghost circle or the table's
// edge. Reviewer-verified against the source image.
export const DEALER_HAND_VALUE_ZONE = { top: "38%", left: "78%" } as const;

// Just above the main betting circle (circle top ~56%), so dealt cards sit
// above the circle and leave it visible underneath for future chip art.
export const PLAYER_CARD_ZONE = { top: "43%", left: "50%" } as const;

// Below the main betting circle (bottom ~74%) and the side "ghost" circles
// (bottom ~71%), above the wood/leather rail (starts ~84%) - a fully clean,
// full-width band of open felt with nothing printed on it at any x. Centered
// horizontally since there's no competing element anywhere in this band to
// dodge, unlike the dealer badge's off-center placement.
//
// `top` is the badge's TOP edge (no translateY), so the badge's own rendered
// HEIGHT eats into this band too, not just its anchor point. HandValueBadge
// sizes itself in cqw (not fixed px) with an explicit leading-[1.2], so this
// height stays a near-constant proportion of table height at any viewport:
// line-height 1.2*1.4cqw=1.68cqw + py-[0.4cqw]*2=0.8cqw + the badge's fixed
// 2px border (not cqw-scaled, so its cqw-equivalent grows on a narrow table -
// worst case ~0.53cqw on a ~375px-wide table) totals ~2.68-3.01cqw. Table
// height is 941/1672~=56.3% of its own width, so that's ~4.75%-5.35% of
// table height - use the worse (narrow-viewport) ~5.4% for margin planning.
// 76% + ~5.4% badge height lands around 81.4%, leaving ~2% margin above
// (circle bottom ~74%) and ~2.6% below (rail top ~84%). Reviewer-verified
// against the source image; the leading value must stay locked to keep this
// math valid (see HandValueBadge's comment).
export const PLAYER_HAND_VALUE_ZONE = { top: "76%", left: "50%" } as const;
