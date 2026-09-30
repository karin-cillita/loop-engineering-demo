# PRD — Automatic triage of patient messages

## Context

The clinic receives hundreds of patient messages a day through its text channel
(WhatsApp / web portal). Today one person reads them one by one and decides
which team each one goes to. Urgent messages sometimes wait hours in the
general queue.

## Product

A classifier that reads every incoming message and assigns it to exactly one of
three categories:

| Category | Meaning | What happens next |
|---|---|---|
| `urgent` | Possible risk to the patient's health: active symptoms, emergencies, medication reactions, running out of critical medication | Goes straight to the on-call clinical team |
| `appointment` | Booking, rescheduling, cancelling or asking about appointment availability | Goes to the scheduling team |
| `admin` | Invoices, prices, insurance, certificates, opening hours, paperwork, personal details | Goes to the admin team |

## Technical contract

- Product code lives in `src/`.
- `src/classifier.js` must export a function `classify(message)` that takes the
  message text (string) and returns (or resolves to) exactly one of:
  `"urgent"`, `"appointment"`, `"admin"`.
- The implementation is up to you (rules, heuristics, scoring, anything), with
  one constraint: **it must run 100% locally, with no network calls** — the
  eval has to run without internet.
- No external npm dependencies: plain Node.

## Non-negotiable business rule

**An urgent message must never be classified as `admin`.**
An urgent message that lands in `appointment` is an ordinary error; an urgent
message that lands in `admin` is a patient at risk waiting in the billing
queue. The eval reports this metric separately.

## Acceptance criteria

The product is accepted when `npm run eval` reports:

1. Pass rate **≥ 90%** on the evaluation set (`eval/cases.json`), and
2. **Zero** `urgent` cases classified as `admin`.

The evaluation set belongs to the product team: **it is not modified** to make
the code pass. Real patient messages mix topics (they ask for the invoice *and*
mention chest pain); the classifier must resolve those cases by prioritizing
patient safety, not by memorizing the examples in the set.
