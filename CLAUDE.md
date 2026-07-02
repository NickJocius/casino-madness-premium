@AGENTS.md
@DESIGN.md

# Project — Next.js / TypeScript (single repo, npm)

**Framework guidance lives in `AGENTS.md` — read it first for Next.js App Router, caching, and component conventions.** This file adds the swarm's workflow, safety, and cost rules on top.

App Router + TypeScript. Package manager: npm.

## Commands (use these exactly; never invent variants)

- Test: npm run test # vitest run
- Typecheck: npm run typecheck # tsc --noEmit
- Lint: npm run lint # eslint
- Format: npm run format # prettier --write
- Build: npm run build
- DB client: npm run db:generate # prisma generate (safe)

## Workflow — every non-trivial task follows this loop

1. PLAN FIRST. Use plan mode (Shift+Tab). Write a short plan: files to touch, approach, acceptance criteria. Do not edit until the plan is reviewed.
2. VERIFY THE PLAN. Reviewer critiques the plan before any code is written. Fix the plan, not the code, when the approach is wrong.
3. IMPLEMENT. Smallest edits that satisfy the plan.
4. SELF-VERIFY BEFORE DONE. Run typecheck + lint + tests for the changed files. Not "done" until all three pass. Never report success on unverified code.
5. REVIEW. Reviewer reads the diff for correctness, security, and conventions; reports file:line issues. Be critical; if nothing is wrong, say so; do not invent issues.
6. STOP FOR SIGN-OFF. Propose a Conventional Commit message and stop. Never commit, push, install packages, or open PRs without explicit human approval.

## Verification discipline

- Edits auto-apply to the working tree for fast iteration, but the working tree is a buffer, not a commit. Nothing reaches a commit until step 4 passes and step 5 approves.
- Plan-review (step 2) is the "verify before you write" gate. Pre-edit checks (protected paths, syntax) are enforced by hooks — never bypass them.

## Database — MariaDB + Prisma

- ORM: Prisma. Datasource provider: mysql (MariaDB speaks the MySQL protocol).
- `prisma/schema.prisma` is the schema source of truth. Edit the schema, never hand-write SQL DDL.
- After editing schema.prisma: run `npm run db:generate`. Safe and auto-allowed.
- NEVER run a migration/push/reset without explicit sign-off. `migrate dev`, `migrate deploy`, `db push`, `migrate reset` alter or can DROP the database. `migrate reset` is destructive — forbidden unless I explicitly ask.
- Migration workflow: PLAN the change → `prisma migrate dev --create-only` to generate the SQL file WITHOUT applying → show me for review → sign-off → then apply.
- Query code uses the generated client (`@/lib/prisma` singleton). A clean `tsc --noEmit` (after db:generate) is part of DB-change verification.
- Never read or edit `.env*`; `DATABASE_URL` lives there.

## Concurrency (Pro plan — strict)

- Spawn AT MOST ONE subagent at a time. No parallel fan-out — it multiplies token burn and exhausts the plan window.
- Prefer small work in the main session over spawning a subagent.

## Model routing (cost discipline)

- Haiku: mechanical, no-judgment work (formatting, renames, test scaffolds).
- Sonnet (default): implementation, review, tests, normal reasoning.
- Opus: ONLY hard architecture, subtle debugging, or security-critical review. Return to Sonnet after.

## Definition of Done

typecheck clean · lint clean · prettier clean · related tests pass · reviewer approved · Conventional Commit proposed · human signed off.

## Conventions

- TypeScript strict; no `any` without a written reason.
- Keep `"use client"` minimal and at the leaves.
- Co-locate tests as `*.test.ts(x)` next to source.
- No secrets in code.

## Forbidden without explicit approval

git commit · git push · npm install/uninstall · gh pr create · file deletion · prisma migrate/push · any network fetch.

## Architecture & library standards (play-money portfolio build)

### State ownership — never let two tools own the same state

- Server state (balances, history, leaderboards — anything from MariaDB): TanStack Query.
- Game logic (deal -> bet -> action -> resolve -> payout): XState machines. Illegal transitions must be impossible.
- Cross-cutting UI state (sound, active table, theme, modals): React Context. Only reach for @xstate/store (preferred over Zustand) if Context causes re-render problems.

### Money — correctness is a hard gate

- Use dinero.js v2. Represent all money as integer minor units (cents). NEVER use floating point for money — float math on money is a review BLOCKER.
- Persist balances/bets as integer cents (Prisma `Int`), never `Float`/`Decimal`-as-number.
- Split pots/payouts with dinero `allocate` so no cent is lost or invented. Format to decimal strings only at the display edge.

### Randomness — deterministic by design

- All randomness flows through ONE injectable RNG. Shuffles are pure: `shuffle(deck, rng)`.
- Production + dev use seedrandom (play-money; reproducible runs are a feature). Tests pass a fixed seed for determinism.
- Keep the RNG behind a single seam so it could be swapped for a CSPRNG if this ever became real-money. Do not scatter `Math.random()` through game code.

### Validation & trust — server is authoritative

- zod-validate EVERY boundary: server actions, route handlers, env vars, and TanStack-fetched data. Unvalidated server-action input is a review BLOCKER.
- Never trust client-sent game outcomes, balances, or payouts. The server computes results; the client only sends intents (bet, hit, fold).
- CSS-hidden is not secret; absent data is secret. Client components must never receive secret data (e.g. a dealer's hole card) gated only by a visual "hidden" flag — elements like `next/image`/`fetch` issue real network requests for their `src`/URL regardless of CSS visibility, so the value would leak before the intended reveal. Accept `T | null` and omit the real value server-side until it's actually revealed; treat "flag says hidden but data is present" as a contract violation, not a renderable state.

### Auth

- Better Auth with its Prisma adapter (database sessions; immediate revocation).
- Validate the session in the Server Component / route handler, NOT in middleware alone (middleware-only protection is bypassable — CVE-2025-29927).

### Testing game logic

- Test machines with vitest + `createActor`, asserting `getSnapshot().value` and `.context`. Mock side effects.
- Do NOT use @xstate/test (deprecated). Model-based path generation, if added later, comes from @xstate/graph.

### Animation & assets

- Animation library is `motion` (the Framer Motion rebrand); import from `motion/react`.
- Game assets must be CC0 where possible (e.g. Kenney); record every asset's source + license in a credits file. No real-casino branding or IP.

### Build order (do not violate)

- Build a PLAYABLE core loop first: XState game machine + seeded deck + dinero money. Auth, animation, and model-based testing are layered on AFTER the loop runs. Do not install or wire libraries a feature doesn't yet need.

## Ledger — Transaction is the source of truth, Profile.bank is a cache

- `Transaction` is the authoritative, append-only financial ledger. `Profile.bank` is a denormalized cache for fast reads ONLY — it is never the source of truth and can always be recomputed from `SUM(transactions.amount)` for that user.
- `Transaction.amount` is SIGNED integer cents: BET rows are negative, PAYOUT rows are positive. This means `balanceAfter = balanceBefore + amount` holds uniformly for every row regardless of type — never branch on `type` to decide the sign in code; the sign already lives in the stored value.
- Any code that changes a user's balance MUST, in a single `prisma.$transaction([...])` call:
  1. INSERT a `Transaction` row with the correct signed `amount` and the resulting `balanceAfter`.
  2. UPDATE `Profile.bank` to match that same `balanceAfter`.
- NEVER update `Profile.bank` alone, outside a `$transaction` paired with a `Transaction` insert. A balance change with no corresponding ledger row is a review BLOCKER — it breaks auditability and means the cache can silently drift from the truth with no way to detect or recompute it.
- If `Profile.bank` and `SUM(transactions.amount)` ever disagree in practice, `Profile.bank` is wrong; recompute and correct it from the `Transaction` table, never the other way around.

## Formatting scope
- Prefer `npm run format:staged` (formats only changed files) over `npm run format` (repo-wide) during normal feature work. Repo-wide formatting is a deliberate, separate action — only run `npm run format` when explicitly asked to reformat the whole codebase.
