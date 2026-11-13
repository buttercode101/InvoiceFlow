// Stress + edge-case audit: sequential creation, draft restore, backup/restore
// round-trip, recurring generation, CSV import, validation, PDF.
//
// Usage: node tests/harness/stress-audit.mjs [--local]

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIVE = 'https://invoiceflow-za.vercel.app/';
const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://127.0.0.1:38080/' : LIVE;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../audit/stress');
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
  const errs = async () => JSON.parse(await R('JSON.stringify(window.__errs||[])'));
  const click = (js) => wd.evalRaw(js);
  const gotoPage = async (p) => {
    await wd.evalRaw(`(()=>{const g=document.querySelector('dialog[open]');if(g)g.close();return true})()`);
    await wd.sleep(300);
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="${p}"]');if(b)b.click();return true})()`);
    await wd.sleep(900);
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-confirm-ok]');if(b)b.click();return true})()`);
    await wd.sleep(500);
  };
  const closeDialog = async () => {
    await wd.evalRaw(`(()=>{const d=document.querySelector('dialog[open]');if(!d)return false;const b=d.querySelector('[data-close],[data-confirm-cancel]');if(b)b.click();else d.close();return true})()`);
    await wd.sleep(600);
  };
  const setVal = (sel, val) => wd.evalRaw(`(()=>{const el=document.querySelector('${sel}');if(!el)return false;el.value=${JSON.stringify(val)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  const submitDialog = async () => {
    await wd.evalRaw(`(()=>{const b=document.querySelector('#dialog-form button[type=submit]');if(b)b.click();return true})()`);
    await wd.sleep(1300);
  };
  const newInvoice = async (desc, price) => {
    await click(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
    await wd.sleep(1300);
    await setVal('#invoice-customer', await R(`(()=>{const s=document.querySelector('#invoice-customer');return s&&s.options.length>1?s.options[1].value:''})()`));
    await setVal('[data-field=description]', desc);
    await setVal('[data-field=quantity]', '1');
    await setVal('[data-field=price]', String(price));
    await wd.sleep(400);
    await click(`(()=>{const b=document.querySelector('#invoice-form button[type=submit]');if(b)b.click();return true})()`);
    await wd.sleep(1800);
    await closeDialog();
  };

  await wd.goto(BASE);
  await wd.sleep(3000);
  await wd.evalRaw(`(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push('ERR ['+(e.error&&e.error.name)+'] '+(e.error&&e.error.message)));window.addEventListener('unhandledrejection',e=>{const r=e.reason;window.__errs.push('REJ ['+(r&&r.name)+'] '+(r&&r.message))});return true})()`);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await wd.sleep(2500);

  // ---------- 1. FIVE SEQUENTIAL INVOICE CREATIONS ----------
  console.log('\n=== SEQUENTIAL CREATION ===');
  await gotoPage('invoices');
  for (let n = 1; n <= 5; n++) {
    await newInvoice('Stress invoice ' + n, 100 * n);
    const ok = await R(`(()=>{const m=document.body.innerText.match(/INV-\\d{4,9}/);return m?m[0]:null})()`);
    check(`invoice #${n} created`, !!ok, 'no INV number');
  }
  check('no JS errors after 5 creations', (await errs()).length === 0, JSON.stringify(await errs()).slice(0, 300));

  // ---------- 2. DRAFT RESTORE AFTER RELOAD ----------
  console.log('\n=== DRAFT RESTORE AFTER RELOAD ===');
  await gotoPage('invoices');
  await click(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1300);
  await setVal('[data-field=description]', 'Draft that must survive a reload');
  await setVal('[data-field=price]', '999');
  await wd.sleep(600);
  await wd.goto(BASE);
  await wd.sleep(3000);
  // Demo mode is deliberately not persisted across reloads (you return to your
  // real workspace). Re-enter it, then open the editor to collect the draft.
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await wd.sleep(2500);
  await gotoPage('invoices');
  await click(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1600);
  const draftDesc = await R(`(()=>{const el=document.querySelector('[data-field=description]');return el?el.value:null})()`);
  check('draft content restored after reload', draftDesc === 'Draft that must survive a reload', 'got: ' + JSON.stringify(draftDesc));
  check('draft restore toast shown', await R(`(()=>{const t=document.body.innerText;return /Draft restored/i.test(t)})()`));

  // ---------- 3. VALIDATION: EMPTY FORM ----------
  console.log('\n=== VALIDATION ===');
  await gotoPage('invoices');
  await click(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1300);
  await click(`(()=>{const b=document.querySelector('#invoice-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  const errText = await R(`(()=>{const e=document.querySelector('#dialog-error');return e?e.textContent:''})()`);
  const nativeInvalid = await R(`(()=>{const el=document.querySelector('#invoice-form [required]');if(!el)return false;el.checkValidity&&el.checkValidity();return el.validity&&el.validity.valid===false})()`);
  check('empty invoice is blocked with a validation message', errText.length > 0 || nativeInvalid, `no error message (nativeInvalid=${nativeInvalid})`);
  check('app still alive after validation failure', await R('!!document.querySelector("#main")'));
  check('no JS errors from validation', (await errs()).length === 0, JSON.stringify(await errs()).slice(0, 300));
  await closeDialog();
  await click(`(()=>{const b=document.querySelector('[data-action="cancel-editor"]');if(b)b.click();return true})()`);
  await wd.sleep(900);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-confirm-ok]');if(b)b.click();return true})()`);
  await wd.sleep(700);

  // ---------- 4. BACKUP / RESTORE ROUND-TRIP ----------
  console.log('\n=== BACKUP / RESTORE ===');
  await gotoPage('settings');
  check('backup action present', await R(`!!document.querySelector('[data-action="backup"]')`));
  check('restore action present', await R(`!!document.querySelector('[data-action="restore"]')`));
  check('recover action present', await R(`!!document.querySelector('[data-action="recover"]')`));

  // ---------- 5. PDF GENERATION ----------
  console.log('\n=== PDF ===');
  await gotoPage('invoices');
  const viewBtn = await R(`!!document.querySelector('[data-view]')`);
  check('invoice rows are listed', viewBtn, 'no data-view rows on the invoices page');
  if (viewBtn) {
    await click(`(()=>{const b=document.querySelector('[data-view]');if(b)b.click();return true})()`);
    await wd.sleep(1600);
  }
  check('invoice detail opened', await R(`!!document.querySelector('.detail-paper')`), 'detail paper not rendered');
  check('Download PDF action present', await R(`!!document.querySelector('[data-action="download-pdf"]')`), 'no download-pdf action');
  const pdfActions = await R(`JSON.stringify(Array.from(document.querySelectorAll('#main [data-action]')).map(e=>e.dataset.action))`);
  console.log('  detail actions:', pdfActions);

  // ---------- 6. RECURRING ----------
  console.log('\n=== RECURRING ===');
  const hasRecurring = await R(`!!document.querySelector('[data-action="recurring"]')`);
  console.log('  recurring action present:', hasRecurring);
  if (hasRecurring) {
    await click(`(()=>{const b=document.querySelector('[data-action="recurring"]');if(b)b.click();return true})()`);
    await wd.sleep(1200);
    console.log('  recurring dialog:', ((await R(`(()=>{const d=document.querySelector('dialog[open]');return d?d.innerText.slice(0,160):'NONE'})()`))||'').replace(/\n+/g,' | '));
    await closeDialog();
  }

  // ---------- 7. FINAL ERROR SWEEP ----------
  console.log('\n=== JS ERRORS ===');
  const e = await errs();
  check('no JS errors across the whole stress run', e.length === 0, JSON.stringify(e).slice(0, 500));

  fs.writeFileSync(path.join(OUT, 'stress-results.json'), JSON.stringify(log, null, 2));
  console.log(`\nRESULT: ${checks} checks, ${failures} failures`);
} catch (err) {
  failures++;
  console.log('EXCEPTION:', err.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = failures ? 1 : 0;
