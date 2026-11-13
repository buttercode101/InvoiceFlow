// Browser verification for branding (logo + accent) and the reminder stages.
// Usage: node tests/harness/branding-ui.mjs [--local]

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://127.0.0.1:38080/' : 'https://invoiceflow-za.vercel.app/';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../audit/branding');
fs.mkdirSync(OUT, { recursive: true });

let wd, server;
let failures = 0, checks = 0;
const log = [];
function check(name, cond, detail = '') {
  checks++;
  if (cond) { console.log('  PASS', name); log.push({ name, ok: true }); }
  else { failures++; console.log('  FAIL', name, detail); log.push({ name, ok: false, detail }); }
}

// A tiny valid PNG (1x1 transparent) as a data URL.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

try {
  if (LOCAL) server = await startStaticServer();
  wd = await WD({ width: 1440, height: 1000 });
  const R = (s) => wd.evalRaw('return ' + s);
  const click = (js) => wd.evalRaw(js);
  const errs = async () => JSON.parse(await R('JSON.stringify(window.__errs||[])'));
  const gotoPage = async (p) => {
    await wd.evalRaw(`(()=>{const g=document.querySelector('dialog[open]');if(g)g.close();return true})()`);
    await wd.sleep(300);
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="${p}"]');if(b)b.click();return true})()`);
    await wd.sleep(900);
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-confirm-ok]');if(b)b.click();return true})()`);
    await wd.sleep(500);
  };

  await wd.goto(BASE);
  await wd.sleep(3000);
  await wd.evalRaw(`(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push('ERR ['+(e.error&&e.error.name)+'] '+(e.error&&e.error.message)));window.addEventListener('unhandledrejection',e=>{const r=e.reason;window.__errs.push('REJ ['+(r&&r.name)+'] '+(r&&r.message))});return true})()`);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await wd.sleep(2500);

  // --- Branding: accent colour ---
  console.log('\n=== BRANDING: ACCENT ===');
  await gotoPage('settings');
  check('settings has an accent colour field', await R(`!!document.querySelector('#business-accent')`));
  check('settings has a logo upload field', await R(`!!document.querySelector('#business-logo')`));
  const accentBefore = await R(`document.querySelector('#business-accent')?.value`);
  await R(`(()=>{const el=document.querySelector('#business-accent');el.value='#0f766e';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  await click(`(()=>{document.querySelector('#settings-form button[type=submit]').click();return true})()`);
  await wd.sleep(1600);
  check('accent saved without error', !(await R(`document.querySelector('#settings-error')?.textContent||''`)), await R(`document.querySelector('#settings-error')?.textContent||''`));

  // --- Branding: logo upload via the file input ---
  console.log('\n=== BRANDING: LOGO ===');
  // Drive the input's onchange directly with a synthesised data URL.
  await R(`(()=>{
    const dt=new DataTransfer();
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0));
    const file=new File([bytes],'logo.png',{type:'image/png'});
    dt.items.add(file);
    const input=document.querySelector('#business-logo');
    input.files=dt.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  await wd.sleep(1500);
  check('logo preview appears after choosing a file', await R(`!!document.querySelector('#logo-preview')`));
  await click(`(()=>{document.querySelector('#settings-form button[type=submit]').click();return true})()`);
  await wd.sleep(1800);
  check('logo saved without error', !(await R(`document.querySelector('#settings-error')?.textContent||''`)), await R(`document.querySelector('#settings-error')?.textContent||''`));
  check('logo persists in the settings preview', await R(`(()=>{const img=document.querySelector('#logo-preview');return !!img&&img.src.startsWith('data:image/png')})()`));
  check('remove-logo button offered', await R(`!!document.querySelector('#remove-logo')`));

  // --- Branding: applied to the invoice document ---
  // Invoices snapshot the business record when they are created, so branding
  // set just now must be checked on a freshly created invoice.
  console.log('\n=== BRANDING: DOCUMENT ===');
  await gotoPage('overview');
  await click(`(()=>{document.querySelector('[data-action="new-invoice"]').click();return true})()`);
  await wd.sleep(1400);
  await R(`(()=>{const s=document.querySelector('#invoice-customer');s.value=s.options[1].value;s.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  await R(`(()=>{const el=document.querySelector('[data-field=description]');el.value='Branding check';el.dispatchEvent(new Event('input',{bubbles:true}));const p=document.querySelector('[data-field=price]');p.value='3500';p.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  await click(`(()=>{document.querySelector('#invoice-form button[type=submit]').click();return true})()`);
  await wd.sleep(2000);
  check('new invoice created for branding check', !!(await R(`(()=>{const m=document.body.innerText.match(/INV-\\d{4,9}/);return m?m[0]:null})()`)), 'no INV number');
  check('document shows the logo', await R(`(()=>{const img=document.querySelector('.doc-logo');return !!img&&img.src.startsWith('data:image/png')})()`));
  const accentVar = await R(`(()=>{const el=document.querySelector('.detail-paper');return el?getComputedStyle(el).getPropertyValue('--accent').trim():''})()`);
  check('document carries the accent variable', /0f766e/i.test(accentVar), accentVar);

  // --- Reminder stages ---
  console.log('\n=== REMINDER STAGES ===');
  // The branding invoice is still open and is a draft; issue it in place.
  if (await R(`!!document.querySelector('[data-action="issue-invoice"]')`)) {
    await click(`(()=>{document.querySelector('[data-action="issue-invoice"]').click();return true})()`);
    await wd.sleep(900);
    await click(`(()=>{const b=document.querySelector('#dialog-form button[type=submit]');if(b)b.click();return true})()`);
    await wd.sleep(1800);
  }
  check('reminder action available on an unpaid issued invoice', await R(`!!document.querySelector('[data-action="reminder"]')`));
  if (await R(`!!document.querySelector('[data-action="reminder"]')`)) {
    await click(`(()=>{document.querySelector('[data-action="reminder"]').click();return true})()`);
    await wd.sleep(1000);
    check('reminder dialog opens', await R('!!document.querySelector("dialog[open]")'));
    const stageCount = await R(`document.querySelectorAll('#reminder-stage option').length`);
    check('four reminder stages plus generic tones', Number(stageCount) === 6, 'got ' + stageCount);
    await R(`(()=>{const s=document.querySelector('#reminder-stage');s.value='overdue14';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    await click(`(()=>{document.querySelector('#dialog-form button[type=submit]').click();return true})()`);
    await wd.sleep(1400);
    // textDialog closes itself after copying to the clipboard, so the message
    // is captured from the page text instead of the (now removed) textarea.
    const text = await R(`(()=>{const m=document.body.innerText.match(/final notice[\s\S]{0,400}/i);const t=document.querySelector('#message-text');return (t?t.value:'')||(m?m[0]:'')})()`);
    check('final notice message rendered', /final notice/i.test(text), JSON.stringify(text).slice(0,160));
    check('message shows the correct amount', /3\s*500|10\s*000/.test(text), JSON.stringify(text).slice(0,200));
    check('message does not claim it was sent', !/sent|emailed|delivered/i.test(text), JSON.stringify(text).slice(0,160));
  } else {
    check('reminder dialog could be opened', false, 'reminder action not present');
  }

  console.log('\n=== JS ERRORS ===');
  const e = await errs();
  check('no JS errors', e.length === 0, JSON.stringify(e).slice(0, 400));

  fs.writeFileSync(path.join(OUT, 'branding-ui.json'), JSON.stringify(log, null, 2));
  console.log(`\nRESULT: ${checks} checks, ${failures} failures`);
} catch (err) {
  failures++;
  console.log('EXCEPTION:', err.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = failures ? 1 : 0;
