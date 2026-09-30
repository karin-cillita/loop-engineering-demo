# Demo: an engineering loop driven by a product goal

A repeatable 5-minute demo with Claude Code. Instead of iterating on prompts by
hand, you write **one product goal** and the agent iterates on the code, using
an eval as the only source of truth, until the criteria are met or it runs out
of attempts.

The product: a **patient message triage classifier**
(`urgent` / `appointment` / `admin`), defined in [`PRD.md`](PRD.md).

Adapted to English and trimmed to 5 minutes from
[pachocamacho1990/loop-engineering-demo](https://github.com/pachocamacho1990/loop-engineering-demo)
(the original is Spanish and 15 minutes, with an optional Linear act that is not
included here).

## Requirements

- Node ≥ 20. No npm dependencies; everything runs locally, no network needed
  for the eval.
- Claude Code running at the root of this repo.

## Layout

| Path | What it is | Survives reset? |
|---|---|---|
| `PRD.md` | The product requirement (including the business rule) | ✅ |
| `eval/cases.json` | 100 patient messages with their correct label | ✅ |
| `eval/run-eval.mjs` | The gate: `npm run eval` | ✅ |
| `src/classifier.js` | Starting point: the naive MVP from one "build what PRD.md describes" prompt | ✅ restored to the naive version |
| `.claude/skills/goal/` | The `/goal` command that runs the loop | ✅ |
| `.claude/settings.json` | Pre-approves edits to `src/`, **denies** edits to `eval/` and `PRD.md` | ✅ |
| `CLAUDE.md` | Rules of the game for the agent (immutables, no overfitting) | ✅ |
| `RUNBOOK.md` | The minute-by-minute script for the presenter | ✅ |
| `scripts/reset.sh` | Puts the repo back at the starting state | ✅ |
| `runs/` | Eval history + dashboard (`report.html`) | ❌ deleted |

## Running it

```bash
npm run reset -- --yes          # back to the naive MVP, empty history
npm run eval; npm run dashboard # → 69%, 1 urgent patient routed to billing
# in Claude Code:
/goal raise the npm run eval pass rate to 90% or higher, with zero urgent cases classified as admin. Stop after 4 attempts.
git diff --stat demo-baseline   # only src/ changed
```

The full script, timings and plan B are in [`RUNBOOK.md`](RUNBOOK.md).

## Changing the demo

`npm run reset` runs `git clean -fd`: **anything uncommitted is lost.** If you
change the PRD, cases or skill, commit and move the anchor:
`git add -A && git commit -m "..." && git tag -f demo-baseline`.
