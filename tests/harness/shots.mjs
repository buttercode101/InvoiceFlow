// Capture representative screenshots across viewports and themes for visual review.
// Usage: node tests/harness/shots.mjs   (needs geckodriver + Firefox)

import fs from 'node:fs';
import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';

const APP = 'http://127.0.0.1:38080';
const OUT = process.env.SHOT_DIR || '/data/data/com.termux/files/home/.hermes/cache/scratch/if/shots';
fs.mkdirSync(OUT, { recursive: true });

const server = await startStaticServer();
const wd = await WD();
const sleep = (ms) => wd.sleep(ms);
const goto = async (p) => { await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="${p}"]');if(b)b.click();return true})()`); await sleep(650); };
const shot = async (name) => { const v = await wd.cmd('GET', '/screenshot'); const p = `${OUT}/${name}.png`; fs.writeFileSync(p, Buffer.from(v, 'base64')); console.log('shot', p); };

try {
  await wd.goto(APP + '/');
  await sleep(2600);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await sleep(2600);

  const pages = ['overview', 'invoices', 'collections', 'cashflow', 'compliance', 'customers', 'expenses', 'settings'];
  for (const width of [390, 1440]) {
    await wd.rect(width, 900); await sleep(500);
    for (const p of pages) { await goto(p); await shot(`${p}-${width}-light`); }
  }

  // dark, desktop
  await wd.rect(1440, 900); await sleep(400);
  await wd.evalRaw(`(()=>{document.documentElement.setAttribute('data-theme','dark');return true})()`);
  await sleep(700);
  for (const p of ['overview', 'invoices', 'collections', 'cashflow', 'compliance', 'settings']) { await goto(p); await shot(`${p}-1440-dark`); }

  // dark, mobile
  await wd.rect(390, 900); await sleep(500);
  for (const p of ['overview', 'invoices', 'collections']) { await goto(p); await shot(`${p}-390-dark`); }

  // invoice detail (document) light desktop
  await wd.evalRaw(`(()=>{document.documentElement.removeAttribute('data-theme');return true})()`);
  await wd.rect(1440, 900); await sleep(400);
  await goto('invoices');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-view]');if(b)b.click();return true})()`);
  await sleep(1200);
  await shot('invoice-detail-1440-light');

  // editor
  await goto('invoices');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await sleep(1400);
  await shot('editor-1440-light');
  await wd.rect(390, 900); await sleep(500);
  await shot('editor-390-light');
} catch (e) { console.log('EXCEPTION', e.message); }
finally { await wd.close(); await stopStaticServer(server); }
