# Pennysummary — Export the Monthly Summary as a PDF

## What this feature is

The **Summary** tab (`src/components/MonthlySummary.tsx`) shows spend-per-category for a chosen
month with prev/next navigation. This feature lets the owner get that summary out of the app as a
shareable / printable PDF (for personal records, an accountant, etc.).

## Decisions (2026-09-09)

- **Method: browser print-to-PDF.** An "Export PDF" button opens the browser's print dialog
  showing a clean, print-only rendering of the summary; the user picks "Save as PDF".
  - No new dependencies — respects `bunfig.toml`'s 24 h supply-chain guard and avoids lockfile
    churn that would sync to Lovable.
  - Works identically in local dev and on the deployed site; PDF text stays selectable.
- **Contents:** header (Pennywise, the month, date generated) → a short **computed summary
  paragraph** (total, dominant categories and share, largest single expense, change vs the
  previous month — not AI-generated) → per-category breakdown (category, amount, % of month) →
  an itemized table of every expense in that month (date, category, amount, note).

**Why not the alternatives**

| Option | Rejected because |
|---|---|
| Server-side HTML→PDF | Lovable's server target is Cloudflare Workers (edge) — no filesystem, no headless browser |
| `html2canvas` + `jspdf` | `html2canvas` mis-renders the app's `oklch()` colors; output is a rasterized image, not selectable text |
| `jspdf` + `jspdf-autotable` | Adds two dependencies and a lot of manual layout code for marginal gain over a print stylesheet |

## Approach

A dedicated **print-only DOM block** inside `MonthlySummary`, revealed only by `@media print`,
built from data the component already computes. The button just calls `window.print()`.

### 1. `src/styles.css` — add one `@media print` block

Append after the `@layer base { … }` block (~line 147):

```css
@media print {
  /* Hide the whole app; show only the summary's print block. */
  body * { visibility: hidden; }
  #pennywise-print, #pennywise-print * { visibility: visible; }
  #pennywise-print { position: absolute; inset: 0; width: 100%; }

  @page { margin: 18mm 16mm; }

  /* Plain black-on-white typography for the print block (sidesteps oklch). */
  #pennywise-print { font-size: 11pt; color: #1a1a1a; }
  #pennywise-print h1 { font-size: 20pt; margin: 0; }
  #pennywise-print table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
  #pennywise-print th, #pennywise-print td {
    text-align: left; padding: 4pt 6pt; border-bottom: 1px solid #ccc;
  }
  #pennywise-print .num { text-align: right; font-variant-numeric: tabular-nums; }
  #pennywise-print thead { display: table-header-group; } /* repeat header per page */
  #pennywise-print tr { break-inside: avoid; }
}
```

`visibility` (not `display`) preserves ancestor layout so only the print node paints;
`position: absolute; inset: 0` pulls it to the page origin past the (now-invisible but still
space-occupying) app chrome. Entirely inside `@media print` — **zero effect on normal use.**

### 2. `src/lib/expenses.ts` — add helpers

- `expensesInMonth(expenses, month)` — expenses in a `YYYY-MM` month, oldest first (for the
  itemized table).
- `shiftMonth(month, delta)` — step a `YYYY-MM` key by N calendar months (moved out of
  `MonthlySummary` so both the nav and the paragraph use one copy).
- `monthSummaryParagraph(expenses, month)` — the computed recap: `"In August 2026 you spent
  $3,134.67 across 32 expenses. Bills was the biggest category at $2,032.58 (65% of the month),
  then Food at $462.06. The largest single expense was $1,800.00 on Bills — Rent - August. That
  is $1,011.17 less than July 2026 (down 32%)."` Handles single-category months ("It all went
  to Food."), no previous month (drops the comparison), and empty months.

Consistent with the existing `monthKey` / `summarizeByCategory` / `listMonths` helpers; reuses
`formatAmount`, `formatDate`, `monthLabel`, `todayISO`, `summarizeByCategory` as-is.

### 3. `src/components/MonthlySummary.tsx` — button + print block

- Import `Printer` from `lucide-react`; import `expensesInMonth`, `formatDate` from
  `@/lib/expenses`.
- Derive `const items = useMemo(() => expensesInMonth(expenses, month), [expenses, month])`.
- **Export button:** right-aligned `<Button variant="outline" size="sm">` on its own row above
  the month nav (mirrors the Dashboard "Insights" action-row at `Dashboard.tsx:157-181`),
  `disabled={rows.length === 0}`, `onClick={() => window.print()}`, label `Export PDF` with a
  `<Printer className="mr-2 h-4 w-4" />`.
- **Print block:** `<div id="pennywise-print" className="hidden print:block">` at the end of the
  component:
  - `<h1>Pennywise</h1>` + "Monthly summary" subhead
  - `<p>{monthLabel(month)} · generated {formatDate(todayISO())}</p>`
  - the **computed summary paragraph** (`monthSummaryParagraph(expenses, month)`, memoised)
  - **Category table** — `Category | Amount | %` from `rows` (`.num` class on numeric cells)
  - **Itemized table** — `Date | Category | Amount | Note` from `items`
    (`formatDate(e.date)`, `e.category`, `formatAmount(e.amount)`, `e.note ?? "—"`)
  - `hidden print:block` keeps it out of the on-screen flow; `@media print` reveals it.
- The on-screen JSX (nav + card) is unchanged. No change needed in `src/routes/index.tsx`.

## Critical files

- `src/styles.css` — the `@media print` block (only global change)
- `src/lib/expenses.ts` — `expensesInMonth` helper
- `src/components/MonthlySummary.tsx` — Export button + `#pennywise-print` block

## Verification

1. `bunx tsc --noEmit` — no new errors (ignore the pre-existing `__root.tsx` one). Do **not**
   run repo-wide prettier/eslint --fix (Windows CRLF — see `CLAUDE.md`).
2. `bun run dev` → http://localhost:8080, sign in, open **Summary**.
3. DevTools → **Rendering → Emulate CSS media type: `print`** — only the summary document shows
   (no app header, tabs, nav arrows, on-screen card), both tables present with correct numbers.
   Switch back to `screen` — tab looks exactly as before.
4. Pick **August 2026** (seeded data), click **Export PDF** → print dialog opens with the
   one/two-page summary; "Save as PDF" produces a clean file.
5. A month with no expenses → **Export PDF** disabled.
6. Regression: Dashboard and Expenses tabs unchanged; no stray absolutely-positioned element on
   normal pages.
7. Commit the three files to `main` (syncs to Lovable); keep `main` working.

## Estimated size

~3 files, roughly +70 / −0 lines. No dependencies, no DB change, no server work.
