This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Application Structure

casino-madness-premium/
├── prisma/
│ ├── schema.prisma # DB schema (User, GameSession, Transaction)
│ └── migrations/ # Version-controlled migrations
│
├── src/
│ ├── app/ # Next.js App Router (UI entry points)
│ │ ├── (auth)/ # Public auth pages — no session required
│ │ │ ├── login/
│ │ │ │ └── page.tsx # Login page
│ │ │
│ │ ├── (authenticated)/ # SESSION GATE — wraps all protected routes
│ │ │ ├── layout.tsx # Session validation → redirect /login if unauthorized
│ │ │ │ # Minimal auth gate — NO visual chrome
│ │ │ │
│ │ │ ├── (dashboard)/ # Dashboard chrome: TopNav, sidebar, balance
│ │ │ │ ├── layout.tsx # Visual shell (TopNav, main wrapper)
│ │ │ │ ├── page.tsx # → "/" — Game lobby
│ │ │ │ ├── profile/
│ │ │ │ │ └── page.tsx # User profile
│ │ │ │ ├── history/ # Game history
│ │ │ │ │ └── page.tsx # Transaction history
│ │ │ │ └── leaderboard/
│ │ │ │ └── page.tsx # Leaderboard
│ │ │ │
│ │ │ └── games/ # Game routes — authenticated but NO dashboard chrome
│ │ │ ├── layout.tsx # (optional) Minimal game chrome or omit
│ │ │ ├── blackjack/
│ │ │ │ ├── page.tsx # → "/games/blackjack" (Server Component)
│ │ │ │ └── _components/ # Blackjack-specific UI
│ │ │ │ ├── BlackjackTable.tsx # Client component
│ │ │ │ ├── PlayerHand.tsx
│ │ │ │ └── DealerHand.tsx
│ │ │ │
│ │ │ ├── poker/
│ │ │ │ ├── page.tsx # → "/games/poker"
│ │ │ │ └── _components/
│ │ │ │
│ │ │ ├── slots/
│ │ │ │ ├── page.tsx # → "/games/slots"
│ │ │ │ └── _components/
│ │ │ │
│ │ │ └── roulette/
│ │ │ ├── page.tsx # → "/games/roulette"
│ │ │ └── _components/
│ │ │
│ │ ├── api/ # API routes (if needed beyond Server Actions)
│ │ │
│ │ ├── layout.tsx # Root layout (fonts, Providers)
│ │ ├── globals.css
│ │ └── providers.tsx # Client-side providers (TanStack Query, Context)
│ │
│ ├── features/ # Feature modules (business logic)
│ │ │
│ │ ├── user/ # User/balance management
│ │ │ ├── actions.ts # Server Actions (updateBalance)
│ │ │ ├── queries.ts # useUser, useBalance, useHistory
│ │ │ ├── schemas.ts # Zod schemas
│ │ │ └── components/
│ │ │ ├── BalanceDisplay.tsx
│ │ │ └── UserAvatar.tsx
│ │ │
│ │ └── games/ # Game features (one per game)
│ │ │
│ │ ├── blackjack/
│ │ │ ├── machines/
│ │ │ │ ├── blackjack.machine.ts # XState machine
│ │ │ │ ├── blackjack.machine.test.ts
│ │ │ │ └── blackjack.types.ts # Machine context/events
│ │ │ │
│ │ │ ├── engine/ # Pure game logic
│ │ │ │ ├── rules.ts # Score, bust, blackjack checks
│ │ │ │ ├── rules.test.ts
│ │ │ │ ├── dealer.ts # Dealer AI
│ │ │ │ └── payout.ts # Payout calculations (dinero)
│ │ │ │
│ │ │ ├── actions.ts # Server Actions (startGame, playerAction)
│ │ │ ├── queries.ts # TanStack Query hooks
│ │ │ ├── schemas.ts # Zod schemas for actions
│ │ │ └── hooks/
│ │ │ └── useBlackjackGame.ts # Wraps XState machine
│ │ │
│ │ ├── poker/
│ │ │ ├── machines/
│ │ │ ├── engine/ # Hand evaluation, showdown
│ │ │ ├── actions.ts
│ │ │ ├── queries.ts
│ │ │ └── schemas.ts
│ │ │
│ │ ├── slots/
│ │ │ ├── machines/
│ │ │ ├── engine/ # Reel logic, payline evaluation
│ │ │ ├── actions.ts
│ │ │ └── schemas.ts
│ │ │
│ │ └── roulette/
│ │ ├── machines/
│ │ ├── engine/ # Wheel logic, bet types
│ │ ├── actions.ts
│ │ └── schemas.ts
│ │
│ ├── lib/ # Shared infrastructure
│ │ ├── prisma.ts # Prisma client singleton
│ │ ├── auth.ts # Better Auth instance
│ │ ├── query-client.ts # TanStack Query config
│ │ ├── env.ts # Zod-validated env vars
│ │ │
│ │ ├── game-core/ # Shared game utilities
│ │ │ ├── deck.ts # Deck creation/shuffling
│ │ │ ├── deck.test.ts
│ │ │ ├── rng.ts # Seedrandom wrapper (injectable)
│ │ │ ├── rng.test.ts
│ │ │ ├── money.ts # Dinero helpers (toCents, toDollars)
│ │ │ ├── money.test.ts
│ │ │ └── types.ts # Card, Suit, Rank types
│ │ │
│ │ └── utils/ # Generic utilities
│ │ ├── cn.ts # Tailwind class merger
│ │ └── format.ts # Date, number formatting
│ │
│ ├── components/ # Shared UI components
│ │ ├── ui/ # Base components (shadcn-style)
│ │ │ ├── button.tsx
│ │ │ ├── card.tsx
│ │ │ ├── dialog.tsx
│ │ │ ├── input.tsx
│ │ │ └── ...
│ │ │
│ │ ├── game-ui/ # Shared game components
│ │ │ ├── PlayingCard.tsx # Card component (motion animated)
│ │ │ ├── ChipStack.tsx # Bet chips
│ │ │ ├── GameTable.tsx # Table layout
│ │ │ ├── BetControls.tsx # Bet UI
│ │ │ └── SoundToggle.tsx
│ │ │
│ │ └── layout/ # Layout components
│ │ ├── Header.tsx
│ │ ├── Sidebar.tsx
│ │ └── Footer.tsx
│ │
│ ├── contexts/ # React Context providers
│ │ ├── SoundContext.tsx # Sound settings
│ │ ├── ThemeContext.tsx # Theme (if not using next-themes)
│ │ └── GameUIContext.tsx # Active table, modals
│ │
│ ├── hooks/ # Shared custom hooks
│ │ ├── useSound.ts
│ │ ├── useSession.ts # Better Auth session
│ │ └── useMediaQuery.ts
│ │
│ └── types/ # Global TypeScript types
│ ├── index.ts # Re-exports
│ ├── api.ts # API response types
│ └── game.ts # Common game types
│
├── public/ # Static assets
│ ├── sounds/ # Audio files
│ │ ├── card-flip.mp3
│ │ ├── chip-bet.mp3
│ │ └── win.mp3
│ │
│ ├── images/
│ │ ├── cards/ # Card SVGs (CC0)
│ │ └── table-felt.jpg
│ │
│ └── CREDITS.md # Asset attribution (CC0 licenses)
│
├── tests/ # Integration/E2E tests (if not co-located)
│ └── e2e/
│
├── .env.local # Local env vars (gitignored)
├── .env.example # Template for env vars
├── AGENTS.md # AI agent rules
├── CLAUDE.md # Project conventions
└── package.json

## Key Architectural Decisions

### Authentication Architecture (Session Gate Pattern)

The route structure enforces authentication in layers:

**Three-Tier Route Groups:**
1. `(auth)/` - Public routes (login, register) - no session required
2. `(authenticated)/layout.tsx` - **Session gate**: validates session, redirects to /login if unauthorized
   - This is the single gate for page rendering — no page inside can render unauthenticated. Server Actions independently re-validate the session (defense-in-depth), since actions are network endpoints that don't pass through layouts.
   - Contains NO visual UI — pure auth logic
3. `(authenticated)/(dashboard)/` and `(authenticated)/games/` - Protected routes
   - Dashboard routes get TopNav + sidebar chrome
   - Game routes get minimal or no chrome (fullscreen game experience)

### Feature-First Organization

- Each game is self-contained under features/games/{game}/
- Easy to add new games without touching existing code
- Clear ownership and boundaries

### Server-Authoritative

- Client sends intents (bet, hit, fold)
- Server computes results (outcome, payout, new state)
- Client renders server-computed state

### Pure Game Engines

- engine/ contains pure functions (no I/O, no side effects)
- 100% testable with simple unit tests
- Portable to other platforms (mobile, backend)

### Co-located Tests

- Tests live next to the code they test
- *.test.ts for unit tests
- Easy to run vitest {game}/ for specific game

### Validation at Every Boundary

- Server Actions: Zod schemas
- Env vars: lib/env.ts (zod)
- API responses: Parse with zod in TanStack Query
- Machine context: TypeScript types

### Scalable Context Usage

- Only for truly global UI state (sound, theme)
- If performance issues arise, swap to @xstate/store
- Never use Context for game logic (XState) or server state (TanStack)
