# Design Reference — extracted from casino-madness-nextjs (legacy)

Source: `C:\Users\capac\Documents\casino-madness-nextjs` (Next.js 13 Pages/App Router hybrid,
Tailwind 3, CSS Modules, Redux Toolkit, Framer Motion, react-parallax-tilt). Read-only extraction —
nothing here was copied verbatim into code; this is a spec for rebuilding the _look_ on the new stack.

Concept: "Casino Madness" — a comic-book / DC-villain-themed play-money casino. Each game is skinned
as a villain vs. hero matchup: **Poker = Harley Quinn & Joker**, **Blackjack = Superman & Lex Luthor**,
**Craps (unbuilt) = Two-Face**, **Slots = Gotham City**. Worth preserving as the overall theme hook if
the new build wants a visual identity beyond generic felt-green.

> **⚠️ Copyright note**: Harley Quinn, Joker, Superman, Lex Luthor, Two-Face, and Gotham City are
> DC Comics IP. Per this project's own rule ("no real-casino branding or IP," CC0-preferred assets),
> the specific DC characters/names/likenesses **cannot** be reused in the new build and must be
> replaced with an original or generic villain/hero theme (e.g. a made-up rogues' gallery, or a
> different genre entirely) that preserves the _structure_ of the concept — a comic-book
> good-vs-evil mascot per game — without infringing on existing IP. Everything else in this doc
> (palette, type, effects, component patterns) is original CSS/layout work and carries forward
> independent of the character theme.

## Color palette

| Token                    | Value                                                                                                                                                                      | Usage                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `red-blood`              | `rgb(219, 11, 21)` / `#DB0B15`                                                                                                                                             | Primary accent — buttons, borders, hover states, gradients  |
| `red-bloodTrans`         | `rgba(219, 11, 21, 0.5)`                                                                                                                                                   | Ribbon badges, translucent overlays                         |
| Neon red glow            | `#FE1323`                                                                                                                                                                  | Text-shadow / box-shadow glow color (buttons, headers)      |
| Neon blue glow           | `#194FFF`                                                                                                                                                                  | Alt glow color used only on the slots "Spin" button         |
| `gTitle` (title grey)    | `rgb(230, 230, 230)`                                                                                                                                                       | Game title text color, sits on comic-bg headers             |
| `azure`                  | `#F0FFFF`                                                                                                                                                                  | Hero heading text, light-on-black accents                   |
| Base background          | `#000000` (black)                                                                                                                                                          | Body background, nav background, card backs                 |
| Cyan divider             | `#00FFFF` (`#0ff`)                                                                                                                                                         | Slot reel divider borders                                   |
| Poker felt               | deep green table image (`poker-table-green.png`)                                                                                                                           | Poker table background                                      |
| Blackjack/card-hand felt | radial gradient `rgb(194,1,1) → rgb(131,1,1) 30% → rgb(41,0,0) 70% → black`, 15px outset grey border `rgba(162,162,172,0.9)`, `border-radius: 20%`, heavy black box-shadow | "Hand" felt container — a red velvet look rather than green |
| Card front placeholder   | `#ffcc00` (yellow)                                                                                                                                                         | Card.jsx CSS-module fallback before art loads               |
| Card back panel          | `#333`                                                                                                                                                                     | Card.jsx CSS-module fallback                                |

No CSS custom-property design-token system was used beyond a couple of RGB vars for the (unused)
light/dark background gradient in `globals.css`. Color values are otherwise hardcoded per-component
via Tailwind arbitrary values or the two custom Tailwind colors (`red.blood`, `red.bloodTrans`,
`gTitle`, `azure`) added in `tailwind.config.js`.

## Typography

Four fonts, all via `next/font/google`, no self-hosted files:

- **Bangers** (`bangers`) — comic-book shout font. Used for: hero H1 ("Welcome To Casino Madness"),
  game preview card titles, CTA buttons, slot machine bet/winnings labels, login modal heading, nav
  link labels alongside Roboto Slab in some places.
- **Nosifer** (`nosifer`) — dripping/horror display font. Used _only_ for in-game titles
  (`GameHeader` — "5 Card Draw", etc.), paired with a CSS 3D perspective transform + red/white/black
  text-shadow (`.TitleTransform`) to look carved/embossed.
- **Roboto Slab** (`roboto_slab`) — slab-serif workhorse font. Used for: nav links, stat panels,
  instructions body copy, form labels, button labels inside action bars. This is the de facto "UI
  body" font, not Inter.
- **Inter** — set globally on `<body>` in root layout but immediately overridden by the above three
  almost everywhere; effectively only backs plain untouched text.

Hierarchy takeaway: **display/hero text → Bangers**, **carved game-title text → Nosifer**, **everything
else (labels, stats, buttons, body) → Roboto Slab**. Recommend the new build pick 2 Google fonts
(a comic display + a slab/serif body) rather than 3, to cut bundle weight — Nosifer's effect is
achievable with Bangers + the same text-shadow recipe if you want to drop a font.

## Signature visual effects (worth recreating with Tailwind + CSS, not literal font/asset reuse)

**Neon glow text** (`.glowText` in `globals.css`):

```css
color: #fff;
font-weight: bold;
text-shadow:
  0 0 7px #fe1323,
  0 0 42px #fff,
  0 0 82px #fff,
  0 0 92px #fff;
```

**Neon glow container** (`.glowContainer`) — wraps stat panels/buttons in a red halo:

```css
box-shadow:
  0 0 0.2rem #fff,
  0 0 0.2rem #fff,
  0 0 1.2rem #fe1323,
  0 0 0.8rem #fe1323,
  0 0 2rem #fe1323,
  inset 0 0 1.3rem #fe1323;
```

**Neon pill button** (`.gameButton` / `.spinButton`) — combines the glow text + glow container recipe
on a fully-rounded pill:

```css
border: 0.2rem solid #fff;
border-radius: 2rem;
padding: 0.4em;
color: #fff;
text-shadow:
  0 0 7px #fe1323,
  0 0 10px #fe1323,
  0 0 21px #fe1323,
  0 0 42px #fff,
  0 0 82px #fff,
  0 0 92px #fff,
  0 0 102px #fff,
  0 0 151px #fff;
box-shadow: /* same as glowContainer */;
```

Slots swaps `#fe1323` → `#194fff` for a blue neon variant on the Spin button — a reusable pattern:
**one glow-button mixin parameterized by accent color**.

**Neon sign header** (`.neonHeader` + `::before` reflection pseudo-element + `@keyframes lightson`) —
flickering marquee-sign effect on the homepage H1: opacity/text-shadow animate through a 4-step
flicker sequence on load, plus a blurred/skewed `::before` duplicate of the text underneath to fake a
reflection (`-webkit-box-reflect`, `perspective(1.5em) rotateX(40deg) scale(1.2,.3)`, `blur(9px)`).
Nice detail worth porting as a reusable `<NeonHeading>` component with `motion`-driven keyframes
instead of raw CSS `@keyframes` + `data-text` attr trick.

**Carved title effect** (`.TitleTransform`, used with Nosifer for game titles):

```css
text-shadow:
  red 1px 1px 1px,
  white 0 -4px 0,
  black 2px 2px 2px;
transform: perspective(350px) rotateX(-35deg);
```

**Glassmorphism stat/action panels**: translucent red background + blur, e.g.
`bg-red-blood/30 backdrop-blur-md` for the stats HUD, `bg-red-blood/20 backdrop-blur-sm` for action
buttons. Consistent pattern: **panels and buttons are never solid — always `red-blood` at 10–30%
opacity over blur**, so the felt/background art shows through.

## Component patterns worth adapting (not copying)

### 1. Game preview / lobby card (`Previews/GamePreview.jsx`)

White rounded card, image on top (fixed aspect via `h-3/6`), title + description body, footer is a
red→black horizontal gradient bar with a black pill "Play" CTA. Hover: `translate-y-1` lift +
`scale-105` + border color shift to red. Optional "Testing" ribbon badge (absolutely positioned,
rotated 45°, translucent red) for WIP games. **Adapt as**: `GameLobbyCard` component — good pattern
for a game-select dashboard grid, drop the ribbon unless there's an actual beta-flag need.

### 2. Game title header (`Headers/GameHeader.jsx`)

Full-width banner: container padding, background image (comic art) at low opacity behind a large
carved-look H1. **Adapt as**: a per-game page header — pass a background image + title, keep the
carved-text effect, drop the exact image dependency (need CC0 replacements per AGENTS/CLAUDE rules).

### 3. Stats/HUD panel (`GameStats/PokerStats.jsx`)

Fixed-position glass panel (top-left, rounded-[20px], glowContainer) listing: current bank, total
losses, total wins, and a bet-size `<select>` (25/50/100/150/250 fixed tiers). **Adapt as**: a
`GameHUD` component reading from TanStack Query (server balance) rather than Redux — this is exactly
the "server state" balance display the new architecture calls for. The fixed bet-tier dropdown is a
reasonable, simple bet-control UX worth keeping (vs. a free-text input) for a play-money casino.

### 4. Action bar / button rail (`ActionBars/PokerBar.jsx`, `PokerPlayBar.jsx`)

Two separate button rails: a vertical "meta" rail (New Game / Reset / Quit) pinned top-right, and a
horizontal "play" rail (Deal / Draw / Stand) pinned bottom-center, each button wrapped in
`react-parallax-tilt` for a 3D tilt-on-hover feel, buttons dim to `opacity-20` + `disabled` when not
actionable. **Adapt as**: a generic `ActionRail` that maps action-name → enabled/disabled from the
XState machine's `can(...)` guards — the disabled/opacity/tilt pattern translates directly to
`motion/react` (whileHover tilt or a small tilt library) driven by machine state instead of local
`useState` booleans.

### 5. Card component (`Cards/Card.jsx`)

3D flip card built on `backface-visibility: hidden` + `rotateY(180deg)`, animated with Framer Motion
(`whileHover: scale 1.3`, `whileTap: scale .9`), sprite naming convention `{suitLetter}{rankValue}.png`
(e.g. `h2.png`…`h14.png` where 11–14 = J/Q/K/A) plus one shared `cardback.png`. Click toggles a
"select for discard" flag (poker draw mechanic) rather than a flip-to-reveal — flipping _state_ is
overloaded with _game logic_ here, which is a smell. **Adapt as**: keep the sprite-sheet naming
convention (cheap to generate/replace with CC0 card art) and the CSS flip technique, but separate
"is face up" (derived from server-authoritative game state) from "is selected for an action"
(local UI-only) — two different booleans, not one.

### 6. Card hand layout (`CardContainers/CardFive.jsx`)

Simple responsive grid (`grid-cols-3` → `sm:4` → `md:5`) for a 5-card hand, absolutely positioned
over the table felt. Works fine as a layout primitive; the absolute-positioning-over-a-background-image
approach is fragile (breaks aspect ratio on resize) — recommend a proper flex/grid table layout with
the felt as a CSS background on a sized container instead of an `<Image fill>` behind
absolutely-positioned children.

### 7. Table felt containers (`GameTables/PokerTable.jsx`, `.Hand` in GameTables css)

Two felt treatments worth keeping conceptually:

- **Poker**: full-bleed background photo of a green felt table (`poker-table-green.png`), UI floats
  on top in glass panels.
- **Blackjack/generic hand**: a CSS-only red radial-gradient "velvet" panel with a thick metallic
  outset border and drop shadow — no image asset required. This is actually the more portable
  pattern (no CC0 licensing concerns, easy to recolor to traditional green felt for blackjack if
  wanted) — recommend building the new blackjack table this way rather than sourcing a felt photo.

### 8. Top nav (`Navs/TopNav.jsx`)

Sticky black nav, hamburger toggle on mobile (`react-icons` `FaBars`), logo image + text links in
Bangers font, red-blood bottom border on mobile-open state and on link hover. Simple and reusable
as-is conceptually; rebuild logout via Better Auth session invalidation instead of the Redux
`resetStore()` call.

### 9. Odds/paytable (`GameOdds/PokerOdds.jsx`)

Plain semantic `<table>` for hand-rank payout odds, dark translucent background, large bold text.
Good minimal reference for a slots/poker paytable component — no changes needed structurally, just
restyle to new palette.

### 10. Auth forms (`AuthForms/LoginForm.jsx`)

White rounded modal card floating on black page background, red-tinted input fields (`bg-red-50`),
black pill submit button that turns red on hover. Note: this form posts directly to a hardcoded
`http://localhost:3000/api/auth` and manages session via Redux — **do not port the auth mechanics**,
only the visual shell (white card / red inputs / black-to-red button) skinned around Better Auth's
own form flow.

## Anti-patterns present in the legacy app — explicitly do NOT carry forward

These are called out because the new project's CLAUDE.md architecture rules exist specifically to
avoid them:

- **Float/parseInt money math done client-side and trusted**: `poker/play/page.jsx` computes
  `parseInt(userProfile.bank) + (currentBet * odds)` in the browser and dispatches it straight to a
  Redux thunk that persists it — the client computes and asserts its own balance. New build must
  compute payouts server-side only, in integer cents via dinero, per the ledger rules already in
  CLAUDE.md.
- **Redux for game state**: poker hand/deck/bet state lives in local `useState` + Redux, with no
  formal state machine — illegal transitions (e.g. double-dealing) are only prevented by scattered
  boolean `disabled` flags. New build's XState requirement directly replaces this.
- **No visible server-side validation** on the API routes reviewed (fetch calls send raw JSON with
  no schema). New build's zod-at-every-boundary rule replaces this.
- **`Math.random()` isn't visible in the reviewed files** (deck logic wasn't opened in depth), but
  there's no evidence of a seeded/injectable RNG seam — treat the new project's seedrandom
  requirement as a clean-slate improvement, not a port.

## Assets

Legacy `public/` holds flat PNG sprites: 52 card faces named `{h,d,c,s}{2..14}.png` (11=J,12=Q,13=K,
14=A), one `cardback.png`, table/background photos (`poker-table-green.png`, `cainoFloor.jpg`,
`bluewall.jpg`), villain/hero art (`harley.png`, `heathjoker.png`), and a `madnesslogo.png`. None of
these are confirmed CC0/licensed for reuse — per AGENTS/CLAUDE rules, the new build must source
equivalent art from CC0 packs (e.g. Kenney) and log provenance in a credits file rather than reusing
these files directly. The **naming convention** (`{suit}{rankValue}.png`) is worth keeping since it's
a clean, predictable scheme for whatever new card art is sourced. Note `harley.png`, `heathjoker.png`,
and `madnesslogo.png` in particular are tied to the DC-character theme flagged above and should not
be recreated even in spirit (e.g. a Heath Ledger Joker likeness) — pick original character art.

## Components to adapt (build list)

1. `NeonHeading` — flicker-in marquee text component (motion-driven version of `.neonHeader`)
2. `GlowButton` — pill button with parameterized glow-accent color (red default, extend to other
   accents per game) replacing `.gameButton`/`.spinButton`
3. `GameLobbyCard` — dashboard tile: image, title, description, gradient CTA footer, hover lift
4. `GameHeader` — per-game banner with background art + carved-text title treatment
5. `GameHUD` — glass stat panel bound to TanStack Query balance/session stats + bet-tier selector
6. `ActionRail` — button rail bound to XState `can()` guards, tilt-on-hover, disabled-dim state
7. `PlayingCard` — 3D flip card component with clean separation of face-up state vs. selection state
8. `FeltPanel` — CSS-only radial-gradient velvet table surface (from the `.Hand` recipe), recolorable
   per game (red for blackjack-style, green traditional, etc.)
9. `TopNav` — sticky nav shell with mobile hamburger toggle
10. `Paytable` — dark translucent odds table for poker/slots payout reference

## Available image assets (copied from legacy app, check license before production use)

- `/images/casino-header.png` — the full-width dashboard header banner (Las Vegas skyline + Casino Madness logo treatment). Available for use in the dashboard layout header. Dimensions: approximately 900×200px. Note: contains original app branding.

## Logo / Brand Treatment (from Casino.png header image)

The canonical logo treatment splits "Casino Madness" across two typographic layers:

- **"CASINO"** — large, bold, all-caps, white, neon-white glow (not red). Feels like a lit marquee sign. Font: Bangers or equivalent heavy display.
- **"Madness"** — below and slightly overlapping "CASINO", red cursive/script style, slightly smaller but still large. Neon red glow (#FE1323). Feels handwritten/energetic. Font: Pacifico or similar casino-script.

The two words together form one visual unit — "Casino" is the straight-man, "Madness" is the chaos. They should never appear in the same font or the same color.

Background context in the original: a dark Las Vegas skyline photo with a dark overlay.

This two-tier treatment should be used:

- On the login page logo
- On the main dashboard/lobby header
- Anywhere the full brand name appears as a hero element

For smaller contexts (nav, tab title, etc.) use "Casino Madness" in Bangers only, white, no split treatment.
