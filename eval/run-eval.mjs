#!/usr/bin/env node
// The demo's gate: evaluates src/classifier.js against eval/cases.json.
// Demo infrastructure — this file and cases.json are NOT modified during the loop.
//
// Outputs per run:
//   - summary + progress bars in the terminal
//   - runs/history.json   (history of attempts)
//   - runs/report.html    (auto-refreshing dashboard for the projector)
//
// Exit code: 0 if the PRD's acceptance criteria are met, 1 otherwise.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THRESHOLD = Number(process.env.EVAL_THRESHOLD ?? 90);
const LABELS = new Set(['urgent', 'appointment', 'admin']);

const cases = JSON.parse(readFileSync(path.join(root, 'eval/cases.json'), 'utf8'));

// ── load the classifier (may not exist yet: greenfield repo) ────────────────
let classify = null;
let loadError = null;
const classifierPath = path.join(root, 'src/classifier.js');
if (!existsSync(classifierPath)) {
  loadError = 'src/classifier.js does not exist yet — the product has not been built';
} else {
  try {
    const mod = await import(pathToFileURL(classifierPath).href + `?t=${Date.now()}`);
    classify = mod.classify ?? mod.default;
    if (typeof classify !== 'function') {
      loadError = 'src/classifier.js does not export a classify(message) function';
      classify = null;
    }
  } catch (e) {
    loadError = `src/classifier.js failed to load: ${e.message}`;
  }
}

// ── evaluate ────────────────────────────────────────────────────────────────
const results = [];
for (const c of cases) {
  let got = null;
  let error = loadError;
  if (classify) {
    try {
      const raw = await classify(c.message);
      got = String(raw ?? '').trim().toLowerCase();
      if (!LABELS.has(got)) error = `invalid answer: "${got}"`;
    } catch (e) {
      error = e.message;
    }
  }
  const pass = !error && got === c.expected;
  results.push({ id: c.id, message: c.message, expected: c.expected, got, pass, error: error ?? null });
}

const total = results.length;
const passed = results.filter(r => r.pass).length;
const passRate = Math.round((passed / total) * 100);
const urgToAdmin = results.filter(r => r.expected === 'urgent' && r.got === 'admin').length;
const goalMet = passRate >= THRESHOLD && urgToAdmin === 0;

// ── history ─────────────────────────────────────────────────────────────────
const runsDir = path.join(root, 'runs');
mkdirSync(runsDir, { recursive: true });
const historyPath = path.join(runsDir, 'history.json');
const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')) : [];
history.push({
  run: history.length + 1,
  ts: new Date().toISOString(),
  passRate, passed, total, urgToAdmin, goalMet,
  cases: results.map(({ id, expected, got, pass }) => ({ id, expected, got, pass })),
});
writeFileSync(historyPath, JSON.stringify(history, null, 2));
writeFileSync(path.join(runsDir, 'report.html'), renderReport(history, results));

// ── terminal output ─────────────────────────────────────────────────────────
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', DIM = '\x1b[2m', BOLD = '\x1b[1m', RESET = '\x1b[0m';

console.log(`\n${BOLD}── EVAL · patient message triage ───────────────────────────────${RESET}`);
if (loadError) console.log(`${YELLOW}⚠ ${loadError}${RESET}`);

const fails = loadError ? [] : results.filter(r => !r.pass);
const MAX_SHOWN = process.env.EVAL_VERBOSE ? Infinity : 15;
for (const r of fails.slice(0, MAX_SHOWN)) {
  const detail = r.error ? `error: ${r.error}` : `got: ${r.got}`;
  const biz = r.expected === 'urgent' && r.got === 'admin' ? `  ${RED}⚠ BUSINESS RULE${RESET}` : '';
  console.log(`${RED} ✗ ${r.id}${RESET}  expected: ${r.expected.padEnd(12)} ${detail}${biz}`);
  console.log(`${DIM}        “${r.message.slice(0, 80)}${r.message.length > 80 ? '…' : ''}”${RESET}`);
}
if (fails.length > MAX_SHOWN) {
  console.log(`${DIM} … and ${fails.length - MAX_SHOWN} more failures (EVAL_VERBOSE=1 npm run eval to see them all; full detail in runs/report.html)${RESET}`);
}
if (passed === total) console.log(`${GREEN} ✓ all ${total} cases pass${RESET}`);

console.log(`${BOLD}────────────────────────────────────────────────────────────────${RESET}`);
const bizColor = urgToAdmin > 0 ? RED : GREEN;
console.log(`${BOLD} pass rate: ${passRate}% (${passed}/${total})${RESET} · failures: ${total - passed} · ${bizColor}urgent→admin: ${urgToAdmin}${urgToAdmin > 0 ? ' ⚠' : ''}${RESET}`);
console.log(` goal: ≥${THRESHOLD}% and 0 urgent→admin → ${goalMet ? GREEN + '✅ MET' : RED + '✗ NOT MET'}${RESET}`);

console.log(`\n${BOLD} loop progress${RESET}  ${DIM}(dashboard: runs/report.html)${RESET}`);
const W = 30;
for (const h of history) {
  const filled = Math.round((h.passRate / 100) * W);
  const bar = '█'.repeat(filled) + '░'.repeat(W - filled);
  const flag = h.goalMet ? ` ${GREEN}✅${RESET}` : h.urgToAdmin > 0 ? ` ${RED}⚠ business rule${RESET}` : '';
  console.log(`  #${String(h.run).padStart(2)} ${bar} ${String(h.passRate).padStart(3)}%${flag}`);
}
console.log(`      ${DIM}${' '.repeat(Math.round((THRESHOLD / 100) * W) - 1)}▲ goal ${THRESHOLD}%${RESET}\n`);

process.exit(goalMet ? 0 : 1);

// ── HTML dashboard (self-contained, refreshes itself) ───────────────────────
function renderReport(history, results) {
  const latest = history[history.length - 1];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const bars = history.map(h => `
      <div class="bar-col" title="Attempt ${h.run}: ${h.passRate}% (${h.passed}/${h.total}) · urgent→admin: ${h.urgToAdmin}">
        <div class="bar-value">${h.passRate}%${h.urgToAdmin > 0 ? ` <span class="warn">⚠${h.urgToAdmin}</span>` : ''}</div>
        <div class="bar ${h.goalMet ? 'met' : h.urgToAdmin > 0 ? 'risk' : ''}" style="height:${Math.max(h.passRate, 2)}%"></div>
        <div class="bar-label">#${h.run}</div>
      </div>`).join('');

  const ordered = [...results].sort((a, b) => {
    const rank = r => (r.pass ? 2 : r.expected === 'urgent' && r.got === 'admin' ? 0 : 1);
    return rank(a) - rank(b);
  });
  const rows = ordered.map(r => {
    const biz = r.expected === 'urgent' && r.got === 'admin';
    const status = r.pass
      ? '<span class="st good">✓ pass</span>'
      : biz ? '<span class="st crit">✗ business rule</span>' : '<span class="st fail">✗ fail</span>';
    return `<tr class="${r.pass ? 'ok' : 'bad'}${biz ? ' biz' : ''}">
      <td class="mono">${r.id}</td>
      <td class="msg">${esc(r.message)}</td>
      <td class="mono">${r.expected}</td>
      <td class="mono">${r.got ?? '—'}</td>
      <td>${status}</td>
    </tr>`;
  }).join('');

  const bizTone = latest.urgToAdmin > 0 ? 'crit' : 'good';
  const bizIcon = latest.urgToAdmin > 0 ? '⚠' : '✓';

  return `<!-- generated by eval/run-eval.mjs — do not edit by hand -->
<meta charset="utf-8">
<meta http-equiv="refresh" content="3">
<title>Triage demo — gate</title>
<style>
  :root {
    color-scheme: light;
    --surface: #fcfcfb; --page: #f9f9f7;
    --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
    --grid: #e1e0d9; --baseline: #c3c2b7; --ring: rgba(11,11,11,.10);
    --series: #2a78d6; --good: #0ca30c; --crit: #d03b3b; --good-text: #006300; --crit-bg: rgba(208,59,59,.08);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --surface: #1a1a19; --page: #0d0d0d;
      --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
      --grid: #2c2c2a; --baseline: #383835; --ring: rgba(255,255,255,.10);
      --series: #3987e5; --good: #0ca30c; --crit: #e05252; --good-text: #2bc42b; --crit-bg: rgba(224,82,82,.12);
    }
  }
  * { box-sizing: border-box; margin: 0; }
  body { background: var(--page); color: var(--ink); font: 17px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; padding: 28px; }
  h1 { font-size: 24px; } .sub { color: var(--ink-2); margin: 4px 0 20px; }
  .tiles { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .tile { background: var(--surface); border: 1px solid var(--ring); border-radius: 10px; padding: 14px 20px; min-width: 170px; }
  .tile .k { color: var(--ink-2); font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
  .tile .v { font-size: 42px; font-weight: 650; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .tile .v small { font-size: 16px; color: var(--muted); font-weight: 400; }
  .v.good { color: var(--good-text); } .v.crit { color: var(--crit); }
  .card { background: var(--surface); border: 1px solid var(--ring); border-radius: 10px; padding: 18px 20px; margin-bottom: 20px; }
  .card h2 { font-size: 15px; color: var(--ink-2); font-weight: 600; margin-bottom: 14px; }
  .chart { position: relative; height: 260px; display: flex; align-items: flex-end; gap: 16px; padding: 0 6px; border-bottom: 1px solid var(--baseline); }
  .goal { position: absolute; left: 0; right: 0; bottom: ${THRESHOLD}%; border-top: 2px dashed var(--baseline); }
  .goal span { position: absolute; right: 0; top: -22px; font-size: 13px; color: var(--muted); }
  .bar-col { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; width: 64px; }
  .bar { width: 40px; background: var(--series); border-radius: 4px 4px 0 0; }
  .bar.risk { background: var(--crit); } .bar.met { background: var(--good); }
  .bar-value { font-size: 14px; color: var(--ink-2); margin-bottom: 4px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .bar-value .warn { color: var(--crit); font-weight: 600; }
  .bar-label { position: absolute; bottom: -24px; font-size: 13px; color: var(--muted); }
  .legend { display: flex; gap: 16px; margin-top: 34px; font-size: 13px; color: var(--ink-2); flex-wrap: wrap; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  th { text-align: left; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; font-weight: 600; padding: 6px 10px; border-bottom: 1px solid var(--grid); }
  td { padding: 7px 10px; border-bottom: 1px solid var(--grid); vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr.biz td { background: var(--crit-bg); }
  .mono { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .msg { color: var(--ink-2); }
  tr.bad .msg { color: var(--ink); }
  .st { font-weight: 600; white-space: nowrap; }
  .st.good { color: var(--good-text); } .st.fail { color: var(--crit); } .st.crit { color: var(--crit); }
</style>
<h1>Patient message triage — product gate</h1>
<div class="sub">Acceptance criteria: pass rate ≥ ${THRESHOLD}% and 0 urgent→admin · last run: ${esc(latest.ts)} · refreshes itself</div>
<div class="tiles">
  <div class="tile"><div class="k">Pass rate</div><div class="v ${latest.goalMet ? 'good' : ''}">${latest.passRate}% <small>${latest.passed}/${latest.total}</small></div></div>
  <div class="tile"><div class="k">Failures</div><div class="v">${latest.total - latest.passed}</div></div>
  <div class="tile"><div class="k">Urgent → admin</div><div class="v ${bizTone}">${bizIcon} ${latest.urgToAdmin}</div></div>
  <div class="tile"><div class="k">Eval runs</div><div class="v">${history.length}</div></div>
</div>
<div class="card">
  <h2>Pass rate per run</h2>
  <div class="chart">
    <div class="goal"><span>goal ${THRESHOLD}%</span></div>
    ${bars}
  </div>
  <div class="legend">
    <span><i style="background:var(--crit)"></i>urgent patients sent to billing</span>
    <span><i style="background:var(--series)"></i>below goal, rule respected</span>
    <span><i style="background:var(--good)"></i>goal met</span>
  </div>
</div>
<div class="card">
  <h2>Cases in the latest run</h2>
  <table>
    <thead><tr><th>Case</th><th>Message</th><th>Expected</th><th>Got</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}
