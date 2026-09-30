---
name: goal
description: Runs an engineering loop driven by a product goal - modifies the code and uses npm run eval as the only source of truth until the criteria are met or the allowed attempts run out.
---

# /goal — a loop driven by a product goal

The user defined this goal:

> $ARGUMENTS

If no arguments were given, the default goal is the acceptance criteria in
`PRD.md`: `npm run eval` pass rate ≥ 90% and zero `urgent` cases classified as
`admin`, with a maximum of **4 attempts**. If the user's goal mentions an
attempt limit, respect it; otherwise use 4.

This runs live in front of an audience. Be brief: one line before each
attempt, one line after. No long explanations in between.

## How to run the loop

1. **Read `PRD.md`** and `src/classifier.js`. The PRD defines the product and
   the technical contract; the goal defines when to stop.
2. **Run `npm run eval`** to learn the starting point before touching
   anything. That run doesn't count as an attempt.
3. **Iterate.** Each attempt follows the same cycle:
   - Announce in one line: `Attempt N — hypothesis: <what you think is failing and what you'll change>`.
   - Change the code in `src/`. Address a whole *class* of failures per
     attempt (e.g. "patient-safety signals must win over billing words"), not
     one case at a time.
   - Run `npm run eval` and read the failing cases — that output is your
     feedback; analyze it before the next change.
   - Report in one line: `Attempt N: X% → Y%, urgent→admin: Z`.
4. **Stop** at whichever comes first:
   - The goal is met (the eval exits with code 0) → final report.
   - The attempts run out → an honest report of where it landed and what's
     missing.

## Hard rules

- Only `src/` is modified. Never touch `eval/`, `PRD.md`, `RUNBOOK.md`,
  `CLAUDE.md`, `scripts/` or `runs/`. Making the eval pass by changing the eval
  is cheating, not meeting the goal.
- No overfitting: no conditions tied to the literal texts or ids in
  `eval/cases.json`. Rules must generalize (the PRD requires it).
- Never report a percentage you haven't seen in the eval's actual output.

## Final report

When done (success or limit), keep it short:

1. Attempts table: number, one-line hypothesis, pass rate, business-rule
   violations.
2. `git diff --stat demo-baseline` and 2 sentences on what the solution ended
   up being.
