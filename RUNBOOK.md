# RUNBOOK — 5-minute demo: a loop driven by a product goal

For the presenter; the agent doesn't need this file.

**The one idea the audience should leave with:** when you write down what
"done" means as something a machine can check, you stop negotiating with the
model prompt by prompt, and the agent can do the iterating for you.

## Screen layout

Split the projector: **terminal with Claude Code on the left** (font 20pt+),
**dashboard in the browser on the right**. The dashboard refreshes itself every
3 seconds. Each eval run adds a bar: red while an urgent patient is being
routed to billing, blue once the rule holds but the score is short, green at
the goal.

## Pre-flight

The night before:
- [ ] Rehearse end to end at least twice. Write down how many attempts it
      took and how long the loop ran (budget: under 2:20). First dry run:
      69% → 81% → 99%, goal met in 2 attempts, 78 seconds of agent time. Expect
      a live run in the interactive UI to be slower than that, so treat the
      slack as your margin.
- [ ] Do the rehearsal in the real Claude Code UI and confirm `/goal` loads
      this repo's skill: its first move should be reading `PRD.md` and running
      the eval.
- [ ] Record one successful run (screen + voice) as plan B.

30 minutes before:
- [ ] `npm run reset -- --yes` → repo at the naive MVP, no history.
- [ ] Open Claude Code in the repo root. Turn on **fast mode** (`/fast`): same
      model, faster output, which is what makes the loop fit in the slot.
- [ ] Type the goal command into the prompt **without pressing Enter** (or have
      it in your clipboard):
      ```
      /goal raise the npm run eval pass rate to 90% or higher, with zero urgent cases classified as admin. Stop after 4 attempts.
      ```
- [ ] Have a second terminal tab ready with `npm run eval; npm run dashboard`
      typed but not run.
- [ ] Wi-Fi: only Claude Code needs it; the eval is fully local.

## Script

| Time | On screen | What you say |
|---|---|---|
| **0:00–0:40** | `PRD.md`, scrolled to the categories table and the business rule. | "A clinic gets a message: *Can you send me the invoice for Tuesday's visit? Also, I've had a pain in my chest for three days.* Where should it go? The PRD answers with three teams and one rule nobody gets to negotiate: **an urgent message never ends up in the billing queue.**" |
| **0:40–1:30** | Run `npm run eval; npm run dashboard`. The terminal shows **69%** and **urgent→admin: 1**; the dashboard shows the first red bar. Point at the highlighted row at the top of the table (case c007, the insulin message). | "Before this talk I asked Claude, in one prompt, to build what the PRD describes. It took a few seconds and the code looks reasonable. Then I gave it to the gate, and the gate says sixty-nine percent. And look at the red row: *I'm diabetic and I haven't been able to get my insulin since yesterday.* **It sent that patient to billing.** That's vibe coding: I asked, I accepted, and nobody decided whether sixty-nine was good enough." |
| **1:30–1:50** | Switch to Claude Code, press Enter on the `/goal` command. Read it aloud as it starts. | "I'm not going to write a better prompt. I'll write down what done means: ninety percent, zero patients in billing, four attempts. Two numbers the eval can check, and a limit on how long it gets to try." |
| **1:50–4:10** (usually ends early; the extra time goes to the skeptic beat below) | The loop runs. Each attempt prints a hypothesis line, then a result line, and a new bar appears on the dashboard. | Narrate the bars as they move (see *beats while it runs* below). Stay quiet for a few seconds at a time; the moving chart carries the room. |
| **4:10–4:35** | Goal met: green bar above the dashed line. Run `git diff --stat demo-baseline` (or let the final report show it). | "Everything that changed lives in `src/`. The eval, the PRD and the definition of done are exactly as I wrote them, and the agent was never allowed to touch them: that's a deny rule in the project settings, so it isn't left to good behavior." |
| **4:35–5:00** | Dashboard, full screen. | "I wrote a criterion once, instead of five prompts. The judgment went into deciding what 'good' means, the rule about the chest pain, and that part stayed with me. The whole demo is a repo that resets in one command, so you can run it on your own laptop tonight." |

### Beats while it runs (1:50–4:10)

Use whichever fit the moment:
- **When the first hypothesis line appears:** "It read the failures and wrote
  down what it thinks is wrong. That line is the whole difference: it's reacting
  to evidence, and I'm not the one supplying it."
- **When the red bar turns blue:** "The patient is out of the billing queue.
  The score still matters, but that rule had to hold first."
- **If a bar goes down:** "It got worse, and it knows it got worse, because the
  number came from the gate and not from its own opinion. Watch the next one."
- **If it lands high (the rehearsal hit 99%) and someone looks skeptical:**
  "Fair question: did it memorize the answers? The rules forbid matching case
  text or ids, and the diff is sixty lines of symptom groups (breathing,
  bleeding, missing medication), which you can read." Open `src/classifier.js`
  for five seconds.
- **To fill a quiet stretch:** point at the mixed messages in the table ("*I'll
  pay the balance next week, what I need right now is for someone to see
  me…*"). "Real patients don't write in categories. The eval was written with
  those messages on purpose."

## Plan B

- **The loop is still running at 4:10:** say "it hasn't converged yet, and it
  will tell me where it stopped instead of pretending", then cut to the
  recording's last 30 seconds for the green bar.
- **It stops at 4 attempts without meeting the goal:** that's an honest ending,
  so show it as one. "It stopped, it told me where it landed, and it didn't
  claim success. A person under deadline pressure doesn't always do that."
- **Nothing runs (network, auth):** play the recording from 1:30.

## Commands

```bash
npm run reset -- --yes        # back to the naive MVP, empty history
npm run eval                  # the gate: pass rate + business rule + dashboard
npm run dashboard             # open runs/report.html
EVAL_VERBOSE=1 npm run eval   # list every failure, not only the first 15
git diff --stat demo-baseline # what the loop changed
```

## What survives the reset

| Survives | Deleted |
|---|---|
| `PRD.md`, `CLAUDE.md`, `RUNBOOK.md`, `README.md` | everything the loop wrote in `src/` (restored to the naive MVP) |
| `eval/` (100 cases + script) | commits made during the demo |
| `scripts/`, `.claude/` | `runs/` (history and dashboard) |

The reset anchor is the git tag `demo-baseline`. If you change the demo's
setup, commit and move the tag: `git tag -f demo-baseline`. **The reset runs
`git clean -fd`: anything uncommitted is gone for good.**
