// Leonida Ledger — GTA VI trophy guide & tracker. Vanilla JS, offline, no network
// beyond the one local data file beside this script. State lives in localStorage.
const KEY = 'leonida-ledger-v3';
const doc = await (await fetch('data/trophies.json')).json();
const TROPHIES = doc.trophies;
const SOURCES = doc.sources;
const byId = new Map(TROPHIES.map((t) => [t.id, t]));
const srcById = new Map(SOURCES.map((s) => [s.id, s]));

const STAGES = {
  1: 'S1 · Chapter 1 — Arrival in Leonida',
  2: 'S2 · Chapter 2 — Making moves',
  3: 'S3 · Chapter 3 — The heat rises',
  4: 'S4 · Chapter 4 — Point of no return',
  5: 'S5 · Finale — The last score',
  6: 'S6 · Cleanup — Activities & collectibles',
  7: 'S7 · Free roam — Money, world & 100%',
};
const GRADE_TOTAL = { platinum: 1, gold: 2, silver: 6, bronze: 46 };

let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { saved = {}; }
const state = {
  earned: new Set(saved.earned ?? []),
  counters: saved.counters ?? {},
  spoiler: saved.spoiler !== false,
  tab: saved.tab ?? 'checklist',
  selected: saved.selected ?? 28,
  revealed: new Set(saved.revealed ?? []),
};
let chip = 'all';
let query = '';
let gradeFilter = 'all';

function save() {
  localStorage.setItem(KEY, JSON.stringify({
    earned: [...state.earned],
    counters: state.counters,
    spoiler: state.spoiler,
    tab: state.tab,
    selected: state.selected,
    revealed: [...state.revealed],
  }));
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const citeStr = (cites) => cites.map((c) => `[${c}]`).join('');

/* ---------- counted facts (the audit strip is computed from the data itself) ---------- */
function computeStats() {
  let steps = 0, cited = 0, instances = 0, multi = 0;
  const guidesCiting = new Map(SOURCES.map((s) => [s.id, 0]));
  const stepCites = new Map(SOURCES.map((s) => [s.id, 0]));
  for (const t of TROPHIES) {
    for (const id of t.sources) guidesCiting.set(id, (guidesCiting.get(id) ?? 0) + 1);
    for (const st of t.steps) {
      steps += 1;
      if (st.cites.length > 0) cited += 1;
      instances += st.cites.length;
      if (st.cites.length >= 2) multi += 1;
      for (const c of st.cites) stepCites.set(c, (stepCites.get(c) ?? 0) + 1);
    }
  }
  return {
    steps, cited, instances, multi, guidesCiting, stepCites,
    hidden: TROPHIES.filter((t) => t.hidden).length,
    guidesWithSources: TROPHIES.filter((t) => t.sources.length > 0).length,
    missable: TROPHIES.filter((t) => t.missable_status === 'possibly').length,
    watch: TROPHIES.filter((t) => t.missable_status === 'watch').length,
    unconfirmed: TROPHIES.filter((t) => t.confirm_status === 'unconfirmed').length,
    single: TROPHIES.filter((t) => t.confirm_status === 'single-source').length,
    disagree: TROPHIES.filter((t) => t.disagree).length,
  };
}
const STATS = computeStats();

/* ---------- header / audit ---------- */
function renderHeader() {
  document.getElementById('earned-count').textContent = String(state.earned.size);
  for (const g of Object.keys(GRADE_TOTAL)) {
    const n = TROPHIES.filter((t) => t.grade === g && state.earned.has(t.id)).length;
    document.getElementById(`chip-${g}`).textContent = `${g[0].toUpperCase()} ${n}/${GRADE_TOTAL[g]}`;
  }
}
function renderAudit() {
  const parts = [
    `<strong>55</strong> official`, '1P 2G 6S 46B',
    `<strong>${STATS.hidden}</strong> hidden`,
    `<strong>${STATS.guidesWithSources}/55</strong> guides cite a source`,
    `<strong>${STATS.cited}/${STATS.steps}</strong> steps cited`,
    `<strong>${STATS.instances}</strong> citations`,
    `<strong>${STATS.multi}</strong> steps backed by 2+ sources`,
    `<strong>${SOURCES.length}</strong> sources read ${esc(doc.read_date)}`,
    `<strong>${STATS.missable}</strong> possibly missable`,
    `<strong>${STATS.watch}</strong> watch`,
    `<strong>${STATS.unconfirmed}</strong> unconfirmed`,
    `<strong>${STATS.single}</strong> single-source`,
    `<strong>${STATS.disagree}</strong> disagree`,
  ];
  document.getElementById('audit-strip').innerHTML = parts.join('<span class="dot">·</span> ');
}

/* ---------- filtering ---------- */
const CHIP_DEFS = [
  ['all', 'All', () => true],
  ['story', 'Story', (t) => t.kind === 'story'],
  ['collectibles', 'Collectibles', (t) => t.kind === 'collectibles'],
  ['activities', 'Activities', (t) => t.kind === 'activities'],
  ['side', 'Side', (t) => t.kind === 'side'],
  ['crime', 'Crime', (t) => t.kind === 'crime'],
  ['world', 'World', (t) => t.kind === 'world'],
  ['money', 'Money', (t) => t.kind === 'money'],
  ['missable', 'Missable', (t) => t.missable_status === 'possibly'],
  ['watch', 'Watch', (t) => t.missable_status === 'watch'],
  ['unconfirmed', 'Unconfirmed', (t) => t.confirm_status === 'unconfirmed'],
  ['single', 'Single-source', (t) => t.confirm_status === 'single-source'],
  ['disagree', 'Disagree', (t) => t.disagree],
  ['earned', 'Earned only', (t) => state.earned.has(t.id)],
  ['unearned', 'Unearned only', (t) => !state.earned.has(t.id)],
];
function chipFn() { return CHIP_DEFS.find(([k]) => k === chip)[2]; }
function visible(t) {
  if (!chipFn()(t)) return false;
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  if (query) {
    const q = query.toLowerCase();
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
function renderChips() {
  const box = document.getElementById('chips');
  box.replaceChildren();
  for (const [key, label, fn] of CHIP_DEFS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (chip === key ? ' active' : '');
    const n = key === 'all' ? TROPHIES.length : TROPHIES.filter(fn).length;
    b.innerHTML = `${esc(label)} <span class="n">${n}</span>`;
    b.addEventListener('click', () => { chip = key; renderChips(); renderList(); });
    box.append(b);
  }
}

/* ---------- masking ---------- */
function masked(t) {
  return state.spoiler && !state.earned.has(t.id) && (t.hidden || t.kind === 'story') && !state.revealed.has(t.id);
}
function badges(t) {
  const out = [`<span class="pill ${t.grade}">${t.grade.toUpperCase()}</span>`, `<span class="pill stage">S${t.stage}</span>`];
  if (t.missable_status === 'possibly') out.push('<span class="pill miss">MISSABLE?</span>');
  if (t.missable_status === 'watch') out.push('<span class="pill watch">WATCH</span>');
  if (t.hidden) out.push('<span class="pill hidden">HIDDEN ON PSN</span>');
  if (t.confirm_status === 'unconfirmed') out.push('<span class="pill unc">UNCONFIRMED</span>');
  if (t.confirm_status === 'single-source') out.push('<span class="pill unc">1 SOURCE</span>');
  if (t.disagree) out.push('<span class="pill dis">SOURCES DISAGREE</span>');
  return out.join(' ');
}

/* ---------- checklist ---------- */
function renderList() {
  const list = document.getElementById('list');
  list.replaceChildren();
  const shown = TROPHIES.filter(visible);
  if (shown.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No trophies match this filter.';
    list.append(p);
    return;
  }
  for (let s = 1; s <= 7; s += 1) {
    const inStage = shown.filter((t) => t.stage === s);
    if (inStage.length === 0) continue;
    const head = document.createElement('div');
    head.className = 'stage-head';
    const totalInStage = TROPHIES.filter((t) => t.stage === s).length;
    const earnedInStage = TROPHIES.filter((t) => t.stage === s && state.earned.has(t.id)).length;
    head.innerHTML = `<span>${esc(STAGES[s])}</span><span class="frac">${earnedInStage}/${totalInStage}</span>`;
    list.append(head);
    for (const t of inStage) list.append(rowFor(t));
  }
}
function rowFor(t) {
  const row = document.createElement('div');
  row.className = 'trow' + (state.selected === t.id ? ' selected' : '') + (state.earned.has(t.id) ? ' earned' : '');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.earned.has(t.id);
  box.title = 'Mark earned';
  box.addEventListener('click', (e) => e.stopPropagation());
  box.addEventListener('change', () => {
    if (box.checked) state.earned.add(t.id); else state.earned.delete(t.id);
    save(); renderAll();
  });
  const body = document.createElement('div');
  if (masked(t)) {
    body.innerHTML = `<div class="tname masked-name">Hidden trophy — hidden until earned</div>
      <div class="tdesc">Spoiler protection is on. <button type="button" class="reveal-btn">Reveal</button></div>
      <div class="tmeta">${badges(t)}</div>`;
    body.querySelector('.reveal-btn').addEventListener('click', (e) => {
      e.stopPropagation(); state.revealed.add(t.id); save(); renderList(); renderDetail();
    });
  } else {
    const allCites = [...new Set(t.steps.flatMap((st) => st.cites))].sort((a, b) => a - b);
    body.innerHTML = `<div class="tname">${esc(t.name)}</div>
      <div class="tdesc">${esc(t.description)}</div>
      <div class="tmeta">${badges(t)} <span class="cites">${citeStr(allCites)}</span></div>`;
  }
  row.append(box, body);
  row.addEventListener('click', () => { state.selected = t.id; save(); renderList(); renderDetail(); });
  return row;
}

/* ---------- detail pane ---------- */
function renderDetail() {
  const t = byId.get(state.selected) ?? TROPHIES[0];
  const el = document.getElementById('detail');
  if (masked(t)) {
    el.innerHTML = `<h2 class="masked-name">Hidden trophy — hidden until earned</h2>
      <p class="src-line">This trophy is masked by the spoiler setting because it is
      ${t.hidden ? 'hidden on PSN' : 'a story trophy'} and not yet earned.</p>
      <div class="detail-actions"><button type="button" id="d-reveal">Reveal this trophy</button>
      <button type="button" id="d-mark">Mark earned</button></div>`;
    el.querySelector('#d-reveal').addEventListener('click', () => { state.revealed.add(t.id); save(); renderList(); renderDetail(); });
    el.querySelector('#d-mark').addEventListener('click', () => { state.earned.add(t.id); save(); renderAll(); });
    return;
  }
  const earned = state.earned.has(t.id);
  let html = `<div class="detail-head"><h2>${esc(t.name)}</h2> ${badges(t)}</div>`;
  html += `<div class="official"><span class="lbl">OFFICIAL DESCRIPTION · PLAYSTATION</span>${esc(t.description)}</div>`;
  html += `<div class="inshort"><span class="lbl">IN SHORT</span>${esc(t.guide)}</div>`;
  if (t.missable_status === 'possibly') {
    html += `<div class="box missable"><span class="lbl">⚠ POSSIBLY MISSABLE — READ BEFORE PLAYING ON</span>
      This is the one trophy in the list that guides flag as losable. The risk is narrow and specific:
      work through the steps below early rather than leaving this one to the cleanup pass.</div>`;
  }
  if (t.missable_status === 'watch') {
    html += `<div class="box watch"><span class="lbl">WATCH — TIMING MATTERS</span>
      Not proven missable, but tied to a place or a moment that is easiest to reach at one point in the
      story. The steps below mark the safe moment; a second visit may not offer the same chance.</div>`;
  }
  if (t.count) {
    const cur = state.counters[t.id] ?? 0;
    const pct = Math.min(100, Math.round((cur / t.count) * 100));
    html += `<div class="counter"><span>YOUR COUNT</span>
      <button type="button" id="c-minus">−</button>
      <span class="cnum">${cur} / ${t.count}</span>
      <button type="button" id="c-plus">+</button>
      <span>${esc(t.count_label ?? '')}</span>
      <div class="cbar"><div class="cfill" style="width:${pct}%"></div></div></div>`;
  }
  if (t.disagree && t.disagree_note) {
    html += `<div class="box disagree"><span class="lbl">SOURCES DISAGREE — BOTH VERSIONS SHOWN</span>${esc(t.disagree_note)}</div>`;
  }
  if (t.confirm_status === 'unconfirmed') {
    html += `<div class="box status"><span class="lbl">NOT YET CONFIRMED</span>
      No public guide has yet pinned down exactly what triggers this trophy. The steps below are the best
      current reading of the official description; treat them as a working theory, not a promise.</div>`;
  } else if (t.confirm_status === 'single-source') {
    html += `<div class="box status"><span class="lbl">SINGLE-SOURCE</span>
      So far only one of the twelve sources covers this trophy in any detail. The steps rest on that one
      account, cross-checked against the official description.</div>`;
  }
  html += '<ol class="steps">';
  for (const st of t.steps) {
    html += `<li><span class="stext">${esc(st.text)}</span> <span class="cites">${citeStr(st.cites)}</span></li>`;
  }
  html += '</ol>';
  const srcNames = t.sources.map((id) => `[${id}] ${esc(srcById.get(id).name)}`).join(' · ');
  html += `<p class="src-line">Sources for this guide: ${srcNames}</p>`;
  html += `<div class="detail-actions"><button type="button" class="mark-btn" id="d-toggle">${earned ? 'Earned ✓ — tap to undo' : 'Mark earned'}</button></div>`;
  el.innerHTML = html;
  const minus = el.querySelector('#c-minus');
  const plus = el.querySelector('#c-plus');
  if (minus) minus.addEventListener('click', () => { state.counters[t.id] = Math.max(0, (state.counters[t.id] ?? 0) - 1); save(); renderDetail(); renderRoadmap(); });
  if (plus) plus.addEventListener('click', () => { state.counters[t.id] = Math.min(t.count, (state.counters[t.id] ?? 0) + 1); save(); renderDetail(); renderRoadmap(); });
  el.querySelector('#d-toggle').addEventListener('click', () => {
    if (state.earned.has(t.id)) state.earned.delete(t.id); else state.earned.add(t.id);
    save(); renderAll();
  });
}

/* ---------- source rail ---------- */
function renderRail() {
  const rail = document.getElementById('rail');
  rail.replaceChildren();
  for (const s of SOURCES) {
    const d = document.createElement('div');
    d.className = 'src-item';
    d.innerHTML = `<div><span class="snum">[${s.id}]</span> <span class="sname">${esc(s.name)}</span></div>
      <div class="smeta">${esc(s.what)}</div>
      <div class="surl">${esc(s.url)}</div>
      <div class="smeta">read ${esc(s.read)} · ${esc(s.method)}</div>
      <div class="scited">cited by ${STATS.guidesCiting.get(s.id)} of 55 guides · ${STATS.stepCites.get(s.id)} step citations</div>`;
    rail.append(d);
  }
}

/* ---------- roadmap ---------- */
function renderRoadmap() {
  const el = document.getElementById('roadmap');
  const plat = byId.get(1);
  const hundred = byId.get(14);
  const hPct = Math.round((state.earned.size / 55) * 100);
  let html = `<div class="view-pad"><div class="goal-banner"><strong>GOAL · 100% AND THE PLATINUM</strong> —
    ${esc(plat.name)} at ${state.earned.size}/55 trophies (${hPct}%). ${esc(hundred.name)} (the 100% gold)
    is ${state.earned.has(14) ? 'earned ✓' : 'still open'} — it tracks the whole checklist below, so the
    roadmap is the order that finishes story first, cleans activities and collectibles second, and leaves
    money and free-roam grinds for last, when every fast travel and contact is unlocked.</div>`;
  html += '<div class="stage-cards">';
  for (let s = 1; s <= 7; s += 1) {
    const inStage = TROPHIES.filter((t) => t.stage === s);
    const got = inStage.filter((t) => state.earned.has(t.id)).length;
    const pct = Math.round((got / inStage.length) * 100);
    const names = inStage.slice(0, 4).map((t) => (masked(t) ? 'Hidden trophy' : esc(t.name))).join(' · ');
    html += `<div class="stage-card"><h3>${esc(STAGES[s])}</h3>
      <div class="sbar"><div class="sfill" style="width:${pct}%"></div></div>
      <p><strong>${got}/${inStage.length} earned</strong> — ${names}${inStage.length > 4 ? ' · …' : ''}</p></div>`;
  }
  html += '</div>';
  const miss = TROPHIES.find((t) => t.missable_status === 'possibly');
  const nextStory = TROPHIES.filter((t) => t.kind === 'story' && !state.earned.has(t.id)).sort((a, b) => a.stage - b.stage || a.id - b.id)[0];
  const counted = TROPHIES.filter((t) => t.count && !state.earned.has(t.id))
    .map((t) => ({ t, r: (state.counters[t.id] ?? 0) / t.count }))
    .sort((a, b) => b.r - a.r)[0];
  html += '<div class="nextup">';
  html += `<div class="next-card"><h3>Do first — missable</h3><div class="big">${state.earned.has(miss.id) ? 'Done ✓ ' : ''}${esc(miss.name)}</div>
    <p>${state.earned.has(miss.id) ? 'Secured. Nothing else in the list can be lost permanently.' : 'Secure the Chapter 1 balcony meditation before Chapter 1 ends — see its guide for the disagreement and the safe play.'}</p></div>`;
  html += `<div class="next-card"><h3>Next story beat</h3><div class="big">${nextStory ? (masked(nextStory) ? 'Hidden story trophy' : esc(nextStory.name)) : 'Story complete ✓'}</div>
    <p>${nextStory ? `${esc(STAGES[nextStory.stage])} — story trophies are never missable; play on and this one lands on its own.` : 'Every story trophy is earned. The rest is cleanup.'}</p></div>`;
  html += `<div class="next-card"><h3>Closest counter</h3><div class="big">${counted ? esc(counted.t.name) : 'All counters done ✓'}</div>
    <p>${counted ? `${state.counters[counted.t.id] ?? 0} / ${counted.t.count} ${esc(counted.t.count_label ?? '')} — the nearest tracked line to finishing.` : 'Every tracked count has reached its line.'}</p></div>`;
  html += '</div>';
  const tracked = TROPHIES.filter((t) => t.count);
  html += `<h3 class="risk-group">Tracked counters — ${tracked.length} trophies PlayStation counts for you</h3><div class="counter-grid">`;
  for (const t of tracked) {
    const cur = state.counters[t.id] ?? 0;
    const pct = Math.min(100, Math.round((cur / t.count) * 100));
    const label = t.count >= 1000 ? `$${cur.toLocaleString()} / $${t.count.toLocaleString()}` : `${cur} / ${t.count}`;
    html += `<div class="counter-item"><div class="ci-head"><span>${masked(t) ? 'Hidden trophy' : esc(t.name)}</span><span class="ci-num">${state.earned.has(t.id) ? '✓ ' : ''}${label}</span></div>
      <div class="sbar"><div class="sfill" style="width:${pct}%"></div></div>
      <div class="ci-label">${esc(t.count_label ?? '')}</div></div>`;
  }
  html += '</div></div>';
  el.innerHTML = html;
}

/* ---------- missables & watch ---------- */
function riskCard(t) {
  const name = masked(t) ? 'Hidden trophy — hidden until earned' : esc(t.name);
  return `<div class="risk-card" data-jump="${t.id}"><h3>${name}</h3>
    <div class="tmeta">${badges(t)}</div><p>${esc(t.guide)}</p></div>`;
}
function renderMissables() {
  const el = document.getElementById('missables');
  const groups = [
    ['Possibly missable — secure these first', TROPHIES.filter((t) => t.missable_status === 'possibly')],
    ['Watch — timing matters', TROPHIES.filter((t) => t.missable_status === 'watch')],
    ['Unconfirmed — best current reading', TROPHIES.filter((t) => t.confirm_status === 'unconfirmed')],
    ['Single-source — one account so far', TROPHIES.filter((t) => t.confirm_status === 'single-source')],
    ['Sources disagree — both versions in the guide', TROPHIES.filter((t) => t.disagree)],
  ];
  let html = '<div class="view-pad">';
  for (const [title, items] of groups) {
    html += `<h3 class="risk-group">${esc(title)} (${items.length})</h3><div class="risk-grid">`;
    for (const t of items) html += riskCard(t);
    html += '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
  el.querySelectorAll('[data-jump]').forEach((card) => card.addEventListener('click', () => {
    state.selected = Number(card.dataset.jump); state.tab = 'checklist'; save(); renderAll();
  }));
}

/* ---------- sources view ---------- */
function renderSources() {
  const el = document.getElementById('sources');
  let html = `<div class="view-pad"><p>Every step in every guide ends in citation numbers that point at this
    list. Addresses are written as plain text — this app loads nothing from the network; type one into a
    browser to check a claim yourself. “Cited by” counts the guides whose steps use the source;
    “step citations” counts every individual step reference.</p>`;
  html += '<table class="matrix"><thead><tr><th>#</th><th>Source</th><th>What it is</th><th>Address</th><th>Read</th><th>How read</th><th>Cited by</th><th>Step citations</th></tr></thead><tbody>';
  for (const s of SOURCES) {
    html += `<tr><td>[${s.id}]</td><td><strong>${esc(s.name)}</strong></td><td>${esc(s.what)}</td>
      <td class="surl">${esc(s.url)}</td><td>${esc(s.read)}</td><td>${esc(s.method)}</td>
      <td>${STATS.guidesCiting.get(s.id)} of 55 guides</td><td>${STATS.stepCites.get(s.id)}</td></tr>`;
  }
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

/* ---------- tabs / wiring ---------- */
function renderAll() {
  renderHeader(); renderChips(); renderList(); renderDetail(); renderRail(); renderRoadmap(); renderMissables(); renderSources();
  document.querySelectorAll('#tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  for (const v of ['checklist', 'roadmap', 'missables', 'sources']) {
    document.getElementById(`view-${v}`).hidden = state.tab !== v;
  }
  document.getElementById('filters').style.display = state.tab === 'checklist' ? '' : 'none';
}
document.querySelectorAll('#tabs .tab').forEach((b) => b.addEventListener('click', () => {
  state.tab = b.dataset.tab; save(); renderAll();
}));
document.getElementById('search').addEventListener('input', (e) => { query = e.target.value; renderList(); });
document.getElementById('grade-filter').addEventListener('change', (e) => { gradeFilter = e.target.value; renderList(); });
const spoilerBox = document.getElementById('spoiler-toggle');
spoilerBox.checked = state.spoiler;
spoilerBox.addEventListener('change', () => { state.spoiler = spoilerBox.checked; save(); renderAll(); });
document.getElementById('btn-export').addEventListener('click', () => {
  const payload = JSON.stringify({ earned: [...state.earned], counters: state.counters, spoiler: state.spoiler }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    state.earned = new Set((data.earned ?? []).filter((id) => byId.has(id)));
    state.counters = data.counters ?? {};
    state.spoiler = data.spoiler !== false;
    spoilerBox.checked = state.spoiler;
    save(); renderAll();
  } catch { /* unreadable file: keep current state */ }
});

renderAudit();
renderAll();
