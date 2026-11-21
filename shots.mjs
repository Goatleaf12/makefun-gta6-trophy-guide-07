// shots.mjs — renders this entry's four screenshots with headless Chromium over CDP.
// No dependencies: Node's global WebSocket speaks to the DevTools protocol directly.
// Prereq: `node serve.ts` running (serves app/ on :8080). Run: `node shots.mjs`.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`;
const PORT = 9333;
const BASE = 'http://localhost:8080/';
const KEY = 'leonida-ledger-v3';
const QUALITY = Number(process.env.SHOT_QUALITY ?? 82);

// The demo progress baked into the screenshots: 11 trophies pre-earned (a believable
// mid-playthrough state), the meditation counter at 6/18, spoilers hidden.
const EARNED = [2, 3, 8, 16, 21, 35, 42, 44, 46, 53, 55];
const SHOTS = [
  { file: '1-checklist.jpg', state: { earned: EARNED, counters: { 28: 6 }, spoiler: true, tab: 'checklist', selected: 28, revealed: [] } },
  { file: '2-roadmap.jpg', state: { earned: EARNED, counters: { 28: 6, 15: 132, 17: 19, 31: 41, 16: 9, 35: 100, 42: 52, 53: 100000, 55: 10 }, spoiler: true, tab: 'roadmap', selected: 28, revealed: [] } },
  { file: '3-missables.jpg', state: { earned: EARNED, counters: { 28: 6 }, spoiler: true, tab: 'missables', selected: 28, revealed: [] } },
  { file: '4-sources.jpg', state: { earned: EARNED, counters: { 28: 6 }, spoiler: true, tab: 'sources', selected: 28, revealed: [] } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForVersion() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chromium devtools endpoint never came up');
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/leonida-shots-profile', '--no-first-run', '--no-sandbox',
  '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,800',
], { stdio: 'ignore' });

try {
  const wsUrl = await waitForVersion();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  const sessions = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  function send(method, params = {}, sessionId) {
    seq += 1;
    const id = seq;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify(payload)); });
  }

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  sessions.set('page', sessionId);
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable');
  await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await S('Page.navigate', { url: BASE });
  await sleep(1500);

  for (const shot of SHOTS) {
    await S('Runtime.evaluate', {
      expression: `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(shot.state))}); location.reload();`,
    });
    await sleep(1600);
    const { result } = await S('Page.captureScreenshot', { format: 'jpeg', quality: QUALITY, fromSurface: true });
    const buf = Buffer.from(result.data, 'base64');
    writeFileSync(join(here, 'screenshots', shot.file), buf);
    console.log(`${shot.file}: ${buf.length} bytes`);
  }
  ws.close();
} finally {
  chrome.kill('SIGKILL');
}
