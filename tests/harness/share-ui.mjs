// Browser verification for PDF-first sharing.
// Usage: node tests/harness/share-ui.mjs [--local]

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://127.0.0.1:38080/' : 'https://invoiceflow-za.vercel.app/';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../audit/share');
fs.mkdirSync(OUT, { recursive: true });

let wd, server;
let failures = 0, checks = 0;
const log = [];
function check(name, cond, detail = '') {
  checks++;
  if (cond) { console.log('  PASS', name); log.push({ name, ok: true }); }
  else { failures++; console.log('  FAIL', name, detail); log.push({ name, ok: false, detail }); }
}

try {
  if (LOCAL) server = await startStaticServer();
  wd = await WD({ width: 1440, height: 1000 });
  const R = (s) => wd.evalRaw('return ' + s);
  const click = (js) => wd.evalRaw(js);
  const errs = async () => JSON.parse(await R('JSON.stringify(window.__errs||[])'));

  await wd.goto(BASE);
  await wd.sleep(3500);
  await wd.evalRaw(`(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push('ERR ['+(e.error&&e.error.name)+'] '+(e.error&&e.error.message)));window.addEventListener('unhandledrejection',e=>{const r=e.reason;window.__errs.push('REJ ['+(r&&r.name)+'] '+(r&&r.message))});return true})()`);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await wd.sleep(2500);

  // --- Invoice sharing ---
  console.log('\n=== INVOICE SHARE ===');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="invoices"]');if(b)b.click();return true})()`);
  await wd.sleep(900);
  await click(`(()=>{document.querySelector('[data-view]').click();return true})()`);
  await wd.sleep(1200);
  check('invoice page offers Share invoice PDF', await R(`!!document.querySelector('[data-action="share-pdf"]')`));
  check('invoice page still offers message text', await R(`!!document.querySelector('[data-action="share-invoice"]')`));
  check('old "Share invoice text" label is gone', !(await R('document.body.innerText')).includes('Share invoice text'), 'old label still present');

  // Clicking share-pdf must either hand off to the OS share sheet or download a PDF.
  // In headless Firefox the share sheet may be unavailable, so accept a download too.
  const before = await R(`(()=>{const t=document.querySelector('#toast');return t?t.textContent:''})()`);
  await click(`(()=>{document.querySelector('[data-action="share-pdf"]').click();return true})()`);
  await wd.sleep(3000);
  const toast = await R(`document.querySelector('#toast')?.textContent||''`);
  const shareOrDownload = /PDF|attach|share|download/i.test(toast);
  check('share-pdf produced a share handoff or a PDF download', shareOrDownload, 'toast=' + JSON.stringify(toast) + ' before=' + JSON.stringify(before));
  check('no error surfaced', !(await R(`document.querySelector('#dialog-error')?.textContent||''`)), await R(`document.querySelector('#dialog-error')?.textContent||''`));

  // --- Quote sharing ---
  console.log('\n=== QUOTE SHARE ===');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="quotes"]');if(b)b.click();return true})()`);
  await wd.sleep(900);
  if (!(await R(`!!document.querySelector('[data-quote-view]')`))) {
    await click(`(()=>{const b=document.querySelector('[data-action="new-quote"]');if(b)b.click();return true})()`);
    await wd.sleep(1500);
    await click(`(()=>{const s=document.querySelector('#invoice-customer');if(s&&s.options.length>1){s.selectedIndex=1;s.dispatchEvent(new Event('change',{bubbles:true}))}return true})()`);
    await wd.sleep(600);
    await click(`(()=>{const d=document.querySelector('.invoice-line [data-field="description"]');const p=document.querySelector('.invoice-line [data-field="price"]');if(d){d.value='Design work';d.dispatchEvent(new Event('input',{bubbles:true}))}if(p){p.value='500';p.dispatchEvent(new Event('input',{bubbles:true}))}return true})()`);
    await wd.sleep(400);
    await click(`(()=>{const b=document.querySelector('#invoice-form button[type="submit"]');if(b)b.click();return true})()`);
    await wd.sleep(2000);
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="quotes"]');if(b)b.click();return true})()`);
    await wd.sleep(1000);
  }
  const hasQuote = await R(`!!document.querySelector('[data-quote-view]')`);
  if (hasQuote) {
    await click(`(()=>{document.querySelector('[data-quote-view]').click();return true})()`);
    await wd.sleep(1200);
    check('quote page offers Share quote PDF', await R(`!!document.querySelector('[data-action="quote-share-pdf"]')`));
    check('quote page still offers message text', await R(`!!document.querySelector('[data-action="quote-share"]')`));
    await click(`(()=>{document.querySelector('[data-action="quote-share-pdf"]').click();return true})()`);
    await wd.sleep(3000);
    const qToast = await R(`document.querySelector('#toast')?.textContent||''`);
    check('quote share produced a handoff or download', /PDF|attach|share|download/i.test(qToast), 'toast=' + JSON.stringify(qToast));
  } else {
    check('a quote exists to inspect', false, 'no quote in demo data');
  }

  console.log('\n=== JS ERRORS ===');
  const e = await errs();
  check('no JS errors', e.length === 0, JSON.stringify(e).slice(0, 400));

  fs.writeFileSync(path.join(OUT, 'share-ui.json'), JSON.stringify(log, null, 2));
  console.log(`\nRESULT: ${checks} checks, ${failures} failures`);
} catch (err) {
  failures++;
  console.log('EXCEPTION:', err.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = failures ? 1 : 0;
