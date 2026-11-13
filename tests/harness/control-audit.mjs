// Exhaustive control audit: enumerate every interactive element on every page,
// click each one, and record whether it breaks the app.
//
// Usage: node tests/harness/control-audit.mjs [--local]

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIVE = 'https://invoiceflow-za.vercel.app/';
const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://127.0.0.1:38080/' : LIVE;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../audit/controls');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = ['overview','invoices','quotes','collections','expenses','cashflow','customers','compliance','settings','items','reports'];

let wd, server;
const results = [];
let failures = 0;

function record(page, control, outcome, detail = '') {
  results.push({ page, control, outcome, detail });
  if (outcome === 'FAIL') {
    failures++;
    console.log(`  FAIL ${page} :: ${control} — ${detail}`);
  } else if (outcome === 'SKIP') {
    console.log(`  skip ${page} :: ${control} — ${detail}`);
  }
}

try {
  if (LOCAL) server = await startStaticServer();
  wd = await WD({ width: 1440, height: 1000 });
  const R = (s) => wd.evalRaw('return ' + s);

  await wd.goto(BASE);
  await wd.sleep(3000);
  // install error traps
  await wd.evalRaw(`(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push('ERR ['+(e.error&&e.error.name||'Error')+'] '+(e.error&&e.error.message||e.message)+'\\n'+(e.error&&e.error.stack||'')));window.addEventListener('unhandledrejection',e=>{const r=e.reason;window.__errs.push('REJ ['+(r&&r.name||'Rejection')+'] '+(r&&r.message||String(r))+'\\n'+(r&&r.stack||''))});return true})()`);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await wd.sleep(2500);

  const errors = () => R('JSON.stringify(window.__errs||[])');
  const clearErrors = () => wd.evalRaw('window.__errs=[];return true');
  const errs = async () => { const e = JSON.parse(await errors()); return e; };

  const closeDialogs = async () => {
    for (let i = 0; i < 3; i++) {
      const open = await R('!!document.querySelector("dialog[open]")');
      if (!open) break;
      // prefer a real close/cancel button, else close() directly
      const closed = await R(`(()=>{const d=document.querySelector('dialog[open]');if(!d)return false;const b=d.querySelector('[data-close],[data-confirm-cancel]');if(b){b.click();return true}d.close();return true})()`);
      await wd.sleep(500);
      if (!closed) break;
    }
  };

  const gotoPage = async (p) => {
    await closeDialogs();
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="${p}"]');if(b)b.click();return true})()`);
    await wd.sleep(900);
    // dismiss the unsaved-draft guard if it appears
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-confirm-ok]');if(b)b.click();return true})()`);
    await wd.sleep(600);
  };

  for (const page of PAGES) {
    console.log(`\n=== ${page} ===`);
    await gotoPage(page);
    await clearErrors();

    // enumerate every control on the page
    const controls = JSON.parse(await R(`(()=>{
      const out=[];
      const seen=new Set();
      for(const el of document.querySelectorAll('#main [data-action], #main [data-page], #main [data-view], #main [data-quote-view], #main [data-client-view], #main [data-quote-action], #main [data-filter], #main [data-edit-customer], #main [data-edit-item], #main [data-edit-expense], #main [data-delete-item], #main [data-statement], #main [data-receipt], #main [data-reverse-payment], #main [data-credit-pdf], #main [data-generate], #main [data-pause], #main [data-remove-line], #main [data-view]')){
        const key=el.tagName+'|'+(el.dataset.action||el.dataset.page||el.dataset.view||el.dataset.quoteView||el.dataset.clientView||el.dataset.quoteAction||el.dataset.filter||el.dataset.editCustomer||el.dataset.editItem||el.dataset.editExpense||el.dataset.deleteItem||el.dataset.statement||el.dataset.receipt||el.dataset.reversePayment||el.dataset.creditPdf||el.dataset.generate||el.dataset.pause||el.dataset.removeLine)+'|'+(el.textContent||'').trim().slice(0,28);
        if(seen.has(key))continue;seen.add(key);
        out.push({tag:el.tagName.toLowerCase(),kind:el.dataset.action?'action':el.dataset.page?'page':el.dataset.view?'view':el.dataset.quoteView?'quoteView':el.dataset.clientView?'clientView':el.dataset.quoteAction?'quoteAction':el.dataset.filter?'filter':el.dataset.removeLine!==undefined?'removeLine':'other',id:el.dataset.action||el.dataset.page||el.dataset.view||el.dataset.quoteView||el.dataset.clientView||el.dataset.quoteAction||el.dataset.filter||el.dataset.editCustomer||el.dataset.editItem||el.dataset.editExpense||el.dataset.deleteItem||el.dataset.statement||el.dataset.receipt||el.dataset.reversePayment||el.dataset.creditPdf||el.dataset.generate||el.dataset.pause||el.dataset.removeLine,label:(el.textContent||'').trim().slice(0,40),disabled:el.disabled===true});
      }
      return JSON.stringify(out);
    })()`));

    console.log(`  ${controls.length} controls`);
    for (const c of controls) {
      if (c.disabled) { record(page, `${c.kind}:${c.id||c.label}`, 'SKIP', 'disabled'); continue; }
      // skip destructive ones in this pass (handled in the flows audit)
      if (['delete-item','reverse-payment','void-invoice','delete-draft','cashflow-reset'].includes(c.id)) {
        record(page, `${c.kind}:${c.id||c.label}`, 'SKIP', 'destructive — flows audit');
        continue;
      }
      await gotoPage(page);
      await clearErrors();
      const label = c.id || c.label;
      try {
        const clicked = await R(`(()=>{const el=document.querySelector('#main [${c.kind === 'action' ? 'data-action' : c.kind === 'page' ? 'data-page' : c.kind === 'view' ? 'data-view' : c.kind === 'quoteView' ? 'data-quote-view' : c.kind === 'clientView' ? 'data-client-view' : c.kind === 'quoteAction' ? 'data-quote-action' : c.kind === 'filter' ? 'data-filter' : 'data-remove-line'}="${c.id}"]');if(!el)return 'not-found';el.click();return 'clicked'})()`);
        await wd.sleep(1100);
        // dismiss any dialog/confirm the control opened
        await closeDialogs();
        const e = await errs();
        const mainOk = await R('!!document.querySelector("#main") && document.querySelector("#main").innerText.length>50');
        if (clicked === 'not-found') record(page, `${c.kind}:${label}`, 'SKIP', 'element gone after nav');
        else if (e.length) record(page, `${c.kind}:${label}`, 'FAIL', e[0].slice(0, 220));
        else if (!mainOk) record(page, `${c.kind}:${label}`, 'FAIL', 'main content vanished');
        else record(page, `${c.kind}:${label}`, 'PASS');
      } catch (err) {
        record(page, `${c.kind}:${label}`, 'FAIL', err.message.slice(0, 220));
      }
    }
  }

  fs.writeFileSync(path.join(OUT, 'control-results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter(r => r.outcome === 'PASS').length;
  const skipped = results.filter(r => r.outcome === 'SKIP').length;
  console.log(`\nRESULT: ${results.length} controls — ${passed} pass, ${skipped} skipped, ${failures} FAIL`);
} catch (e) {
  failures++;
  console.log('EXCEPTION:', e.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = failures ? 1 : 0;
