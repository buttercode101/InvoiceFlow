// Browser verification for the templates feature.
// Usage: node tests/harness/templates-ui.mjs [--local]

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://127.0.0.1:38080/' : 'https://invoiceflow-za.vercel.app/';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../audit/templates');
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
  const setVal = (sel, val) => wd.evalRaw(`(()=>{const el=document.querySelector('${sel}');if(!el)return false;el.value=${JSON.stringify(val)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
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

  // 1. Navigate to Templates
  console.log('\n=== TEMPLATES PAGE ===');
  await gotoPage('templates');
  check('Templates page renders', (await R('document.body.innerText')).includes('Templates'), 'no Templates heading');
  check('empty state shown', (await R('document.body.innerText')).includes('Start with your regular work'), 'no empty state');
  check('New template action present', await R(`!!document.querySelector('[data-action="new-template"]')`));

  // 2. Create a template
  console.log('\n=== CREATE TEMPLATE ===');
  await click(`(()=>{const b=document.querySelector('[data-action="new-template"]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  check('template dialog opens', await R('!!document.querySelector("dialog[open]")'));
  await setVal('#template-name', 'Monthly retainer');
  await setVal('#template-description', 'Recurring design retainer');
  await setVal('[data-tfield=description]', 'Design retainer');
  await setVal('[data-tfield=quantity]', '1');
  await setVal('[data-tfield=price]', '3500');
  await wd.sleep(400);
  await click(`(()=>{const b=document.querySelector('#dialog-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1600);
  const pageText = await R('document.body.innerText');
  check('template appears in the list', pageText.includes('Monthly retainer'), 'not listed');
  check('template total shown', /3\s*500/.test(pageText), 'total missing');
  check('template saved and listed once', (await R(`document.querySelectorAll('[data-edit-template]').length`)) === 1, 'expected exactly one template row');

  // 3. Use the template -> editor with prefilled lines
  console.log('\n=== USE TEMPLATE ===');
  await click(`(()=>{const b=document.querySelector('[data-use-template]');if(b)b.click();return true})()`);
  await wd.sleep(1800);
  check('editor opens', (await R('document.body.innerText')).includes('Let’s make an invoice.'), 'editor did not open');
  const desc = await R(`(()=>{const el=document.querySelector('[data-field=description]');return el?el.value:null})()`);
  const price = await R(`(()=>{const el=document.querySelector('[data-field=price]');return el?el.value:null})()`);
  check('template line prefilled', desc === 'Design retainer', 'got ' + JSON.stringify(desc));
  check('template price prefilled', price === '3500.00', 'got ' + JSON.stringify(price));

  // 4. Save the draft created from the template
  console.log('\n=== SAVE DRAFT FROM TEMPLATE ===');
  await setVal('#invoice-customer', await R(`(()=>{const s=document.querySelector('#invoice-customer');return s&&s.options.length>1?s.options[1].value:''})()`));
  await click(`(()=>{const b=document.querySelector('#invoice-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(2000);
  const invNo = await R(`(()=>{const m=document.body.innerText.match(/INV-\\d{4,9}/);return m?m[0]:null})()`);
  check('invoice created from template', !!invNo, 'no INV number');

  // 5. Edit the template
  console.log('\n=== EDIT TEMPLATE ===');
  await gotoPage('templates');
  await click(`(()=>{const b=document.querySelector('[data-edit-template]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  await setVal('#template-name', 'Monthly retainer v2');
  await click(`(()=>{const b=document.querySelector('#dialog-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1600);
  check('template updated', (await R('document.body.innerText')).includes('Monthly retainer v2'), 'name not updated');
  check('still one template', (await R(`document.querySelectorAll('[data-edit-template]').length`)) === 1, 'count changed');

  // 6. Add and remove lines
  console.log('\n=== TEMPLATE LINES ===');
  await click(`(()=>{const b=document.querySelector('[data-edit-template]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  await click(`(()=>{const b=document.querySelector('[data-add-template-line]');if(b)b.click();return true})()`);
  await wd.sleep(500);
  const lineCount = await R(`document.querySelectorAll('.template-line').length`);
  check('add line works', Number(lineCount) === 2, 'got ' + lineCount);
  await click(`(()=>{const b=document.querySelector('[data-remove-template-line="1"]');if(b)b.click();return true})()`);
  await wd.sleep(500);
  const afterRemove = await R(`document.querySelectorAll('.template-line').length`);
  check('remove line works', Number(afterRemove) === 1, 'got ' + afterRemove);
  await wd.evalRaw(`(()=>{const d=document.querySelector('dialog[open]');if(d)d.close();return true})()`);
  await wd.sleep(500);

  // 7. Delete the template
  console.log('\n=== DELETE TEMPLATE ===');
  await click(`(()=>{const b=document.querySelector('[data-delete-template]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await click(`(()=>{const b=document.querySelector('#dialog-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1600);
  check('template deleted', (await R(`document.querySelectorAll('[data-edit-template]').length`)) === 0, 'not deleted');
  check('empty state returns after delete', (await R('document.body.innerText')).includes('Start with your regular work'), 'empty state missing');

  // 8. Error sweep
  console.log('\n=== JS ERRORS ===');
  const e = await errs();
  check('no JS errors', e.length === 0, JSON.stringify(e).slice(0, 400));

  fs.writeFileSync(path.join(OUT, 'templates-ui.json'), JSON.stringify(log, null, 2));
  console.log(`\nRESULT: ${checks} checks, ${failures} failures`);
} catch (err) {
  failures++;
  console.log('EXCEPTION:', err.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = failures ? 1 : 0;
