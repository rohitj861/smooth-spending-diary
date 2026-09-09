# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository location

The git repository and all application code live in `smooth-spending-diary/`. Sessions often
open at the parent folder `C:\Pennywise Tracker` — `cd smooth-spending-diary` first, and note
that `pennywise-architecture.html` at the parent level is a throwaway explainer, not part of the app.

## Commands

Package manager is **bun** (`bun.lock` is the committed lockfile; `bunfig.toml` configures a
24‑hour supply‑chain delay — a newly published package version won't install until it's a day
old unless you pass `--minimum-release-age 0`). npm also works and the README uses it.

| Task | Command |
|---|---|
| Install | `bun install` |
| Dev server | `bun run dev` → http://localhost:8080 (port is fixed by `@lovable.dev/vite-tanstack-config`) |
| Production build | `bun run build` (Vite + Nitro; SSR entry is `src/server.ts`) |
| Lint | `bun run lint` (`eslint .`) |
| Format | `bun run format` (`prettier --write .`) |
| Typecheck | `bunx tsc --noEmit` (no script for this; there is one **pre-existing** unrelated error in `src/routes/__root.tsx`) |

There is **no test suite** — no test runner is configured.

On a Windows checkout with `git config core.autocrlf=true`, `bun run lint` reports a
`Delete ␍ prettier/prettier` error on every line of every file (the tree is CRLF, prettier wants
LF). This is cosmetic and local — the committed files are LF and lint is clean on Linux/CI. Do
**not** run a repo‑wide `prettier --write` / `eslint --fix` to "fix" it; that rewrites every file.
Verify your own changes with `bunx tsc --noEmit` instead.

## Lovable sync (important)

This project is developed in [Lovable](https://lovable.dev). The `main` branch is bidirectionally
synced with the Lovable editor: commits pushed to `main` appear in Lovable and rebuild the live
site (`smooth-spending-diary.lovable.app`); prompts in Lovable commit back to `main`.
Consequences:

- Never rewrite published history (no force‑push, rebase, amend, or squash of pushed commits).
- Keep `main` in a working state after every commit.
- Feature branches do **not** sync to Lovable.

## Architecture

**Stack:** TanStack Start (SSR) + React 19, TanStack Router (file-based), TanStack Query,
Supabase, Tailwind v4, shadcn/ui. TypeScript is maximally strict — `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` are all on, which is why env
access is written `process.env["FOO"]` and indexed lookups need explicit guards.

### Request lifecycle

- `src/server.ts` — SSR fetch handler. Wraps `@tanstack/react-start/server-entry`, catches
  errors h3 would otherwise swallow into an opaque 500, and renders `src/lib/error-page.ts`.
- `src/start.ts` — global middleware registration:
  - `attachSupabaseAuth` (function middleware) puts the browser's Supabase access token on every
    server-function call as `Authorization: Bearer …`.
  - CSRF middleware, scoped to `handlerType === "serverFn"`.
  - an error-to-HTML request middleware.
- `src/router.tsx` / `src/routeTree.gen.ts` — router setup; `routeTree.gen.ts` is generated,
  never edit it.
- `src/routes/__root.tsx` — HTML shell, `<head>`, fonts, `<Toaster>`, and the app's 404 / error
  boundary components.

### The app is essentially one route

`src/routes/index.tsx` is the whole product. It runs an auth gate (`supabase.auth`), showing
`AuthCard` when signed out and the `Tracker` component when signed in. `Tracker` owns **all**
expense CRUD directly from the browser via TanStack Query mutations against the Supabase client —
there are no server functions for expenses. It also holds the `Tabs` shell (Dashboard / Expenses
/ Summary) and the edit `Dialog`.

### Server-only vs client-bundled modules

A naming convention, enforced by eslint (`no-restricted-imports` bans the `server-only` package):

- `*.server.ts` — runs only on the server. May import the service-role client and read secrets
  at module top level. Example: `src/lib/insights.server.ts`.
- `*.functions.ts` — `createServerFn` RPC definitions. **These ship to the client bundle**, so
  they must not import secrets or server-only code at top level; they only reference `*.server.ts`
  helpers inside handler bodies. Example: `src/lib/insights.functions.ts`.
- Route files also ship to the client — same rule.

Server functions follow this shape (see `src/lib/insights.functions.ts`):
`createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => …)`,
called from components via `useServerFn(fn)`. `.validator()` is available for typed input but
not yet used anywhere.

### Three Supabase clients

| Module | Key | RLS | Use |
|---|---|---|---|
| `src/integrations/supabase/client.ts` | publishable/anon | enforced via the user's session | all browser reads/writes |
| `src/integrations/supabase/client.server.ts` | service role | **bypassed** | trusted server-only admin work (currently unused) |
| `requireSupabaseAuth` in `auth-middleware.ts` | publishable + caller's bearer token | enforced as that user | the RLS-scoped client + `userId` injected into server-fn `context` |

Everything under `src/integrations/supabase/` is auto-generated and marked "Do not edit"
(`types.ts`, `client.ts`, `client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`,
`previewAuthStorage.ts`, `cron-auth.ts`). `cron-auth.ts` and `client.server.ts` are scaffolding
with no current callers.

### Data model

One table, `public.expenses` (`amount numeric`, `category text` — no DB-side enum/check,
`date`, `note`, `user_id`, timestamps). RLS policy `auth.uid() = user_id` FOR ALL. Therefore:

- Browser reads never filter by user — RLS does it. The main query in `index.tsx` selects the
  **entire** table (no date filter); month and category slicing happens in the browser via the
  helpers in `src/lib/expenses.ts` (`monthKey`, `listMonths`, `summarizeByCategory`,
  `monthLabel`, `colorForCategory`). `Dashboard.tsx` and `MonthlySummary.tsx` both consume these.
- Inserts **must** set `user_id` explicitly (RLS `WITH CHECK` blocks it otherwise); updates/
  deletes are guarded by RLS and don't need it.

### AI features

`insights.functions.ts` → `insights.server.ts` calls the **Lovable AI gateway**
(`https://ai.gateway.lovable.dev/v1/chat/completions`, OpenAI-compatible, model
`google/gemini-2.5-flash`, `LOVABLE_API_KEY`) for the monthly insight text, and **ElevenLabs**
(`ELEVENLABS_API_KEY`) for the spoken summary. Both keys are injected by Lovable at runtime and
are **absent from local `.env`**, so these features throw "not configured" under `bun run dev` —
they only work in Lovable preview/deploy.

### Database migrations

`supabase/migrations/<utc-timestamp>_<uuid>.sql`. There is no local Supabase CLI flow — apply
migrations through the Supabase MCP (`apply_migration`) or Lovable, then regenerate
`src/integrations/supabase/types.ts` (`generate_typescript_types`). Land the migration, the
regenerated types, and the consuming code in one commit so `main` never breaks.

## Environment variables

`.env` (committed) holds only the public Supabase values, doubled as `VITE_*` (client, inlined at
build) and bare (`SUPABASE_URL` etc., server). Server-only secrets — `SUPABASE_SERVICE_ROLE_KEY`,
`LOVABLE_API_KEY`, `ELEVENLABS_API_KEY`, `LOVABLE_CRON_SECRET` — are injected by Lovable Cloud and
are not present locally.

## Design intent

From the README: "Calm, premium" — warm cream background, one terracotta accent, generous
spacing, rounded cards, `Manrope` sans-serif. Keep new UI consistent with this; primitives live
in `src/components/ui/` (shadcn/ui).
