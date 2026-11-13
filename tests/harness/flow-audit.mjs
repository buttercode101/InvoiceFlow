// End-to-end business flow audit: exercises complete journeys, including
// destructive ones, and verifies the resulting state each time.
//
// Usage: node tests/harness/flow-audit.mjs [--local]

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIVE = 'https://invoiceflow-za.vercel.app/';
const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://127.0.0.1:38080/' : LIVE;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../audit/flows');
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
    await wd.sleep(1200);
  };

  await wd.goto(BASE);
  await wd.sleep(3000);
  await wd.evalRaw(`(()=>{window.__errs=[];window.addEventListener('error',e=>window.__errs.push('ERR '+(e.error&&e.stack||e.message)));window.addEventListener('unhandledrejection',e=>{const r=e.reason;window.__errs.push('REJ '+(r&&r.stack||r&&r.message||r))});return true})()`);
  const errs = async () => JSON.parse(await R('JSON.stringify(window.__errs||[])'));

  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await wd.sleep(2500);

  // ---------------- INVOICE LIFECYCLE ----------------
  console.log('\n=== INVOICE LIFECYCLE ===');
  await gotoPage('invoices');
  await click(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1300);
  check('editor opens', await R('document.body.innerText.includes("Let’s make an invoice.")'));
  await setVal('#invoice-customer', await R(`(()=>{const s=document.querySelector('#invoice-customer');return s&&s.options.length>1?s.options[1].value:''})()`));
  await setVal('[data-field=description]', 'Flow audit work');
  await setVal('[data-field=quantity]', '2');
  await setVal('[data-field=price]', '500');
  await wd.sleep(500);
  await click(`(()=>{const b=document.querySelector('#invoice-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(2000);
  await closeDialog();
  const invNo = await R(`(()=>{const m=document.body.innerText.match(/INV-\\d{4,9}/);return m?m[0]:null})()`);
  check('invoice draft saved', !!invNo, 'no INV number found');
  check('invoice is shown on screen', (await R('document.body.innerText')).includes(invNo || ''), 'invoice number not visible');

  // edit the draft
  await click(`(()=>{const b=document.querySelector('[data-view]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  check('invoice detail opens', await R(`!!document.querySelector('.detail-paper')`));
  await click(`(()=>{const b=document.querySelector('[data-action="edit-draft"]');if(b)b.click();return true})()`);
  await wd.sleep(1300);
  check('edit draft reopens the editor', await R('document.body.innerText.includes("Edit INV-")'));
  await click(`(()=>{const b=document.querySelector('#invoice-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1800);
  await closeDialog();

  // mark sent
  await click(`(()=>{const b=document.querySelector('[data-action="issue-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  await submitDialog();
  await wd.sleep(1500);
  await closeDialog();
  check('invoice marked sent', /SENT/i.test(await R('document.body.innerText')), 'status not SENT');

  // record a part payment
  await click(`(()=>{const b=document.querySelector('[data-action="payment"]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  await setVal('#payment-amount', '300');
  await submitDialog();
  await wd.sleep(1500);
  await closeDialog();
  const afterPay = await R('document.body.innerText');
  check('payment recorded', /PARTIAL|PAID/i.test(afterPay), 'status not PARTIAL/PAID');
  check('balance reduced by the payment', afterPay.includes('700'), 'expected R 700,00 balance after paying 300 of 1000');

  // reverse the payment
  await click(`(()=>{const b=document.querySelector('[data-reverse-payment]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  await setVal('#reversal-reason', 'Flow audit reversal');
  await submitDialog();
  await wd.sleep(1500);
  await closeDialog();
  check('payment reversal recorded', (await R('document.body.innerText')).includes('Reversed entry'));

  // void while still eligible (no credit notes yet)
  check('void button offered on a clean issued invoice', await R(`!!document.querySelector('[data-action="void-invoice"]')`));
  await click(`(()=>{const b=document.querySelector('[data-action="void-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  await submitDialog();
  await wd.sleep(1500);
  await closeDialog();
  check('invoice voided', /VOID/i.test(await R('document.body.innerText')), 'status not VOID');

  // a fresh invoice carrying a credit note must NOT offer void
  await gotoPage('invoices');
  await click(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1400);
  await setVal('#invoice-customer', await R(`(()=>{const s=document.querySelector('#invoice-customer');return s&&s.options.length>1?s.options[1].value:''})()`));
  await setVal('[data-field=description]', 'Credit note flow');
  await setVal('[data-field=price]', '400');
  await wd.sleep(400);
  await click(`(()=>{const b=document.querySelector('#invoice-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1800);
  await closeDialog();
  await click(`(()=>{const b=document.querySelector('[data-action="issue-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await submitDialog();
  await wd.sleep(1500);
  await closeDialog();
  await click(`(()=>{const b=document.querySelector('[data-action="credit"]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  await setVal('#credit-reason', 'Flow audit credit');
  await submitDialog();
  await wd.sleep(1500);
  await closeDialog();
  check('credit note issued', (await R('document.body.innerText')).includes('CRN-'));
  check('void button hidden once a credit note exists', !(await R(`!!document.querySelector('[data-action="void-invoice"]')`)));

  // ---------------- SECOND INVOICE (regression) ----------------
  console.log('\n=== SECOND INVOICE (regression) ===');
  await gotoPage('invoices');
  await click(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1500);
  check('second invoice editor opens (the reported bug)', await R('document.body.innerText.includes("Let’s make an invoice.")'));
  check('no JS errors after second open', (await errs()).length === 0, JSON.stringify(await errs()));
  await click(`(()=>{const b=document.querySelector('[data-action="cancel-editor"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-confirm-ok]');if(b)b.click();return true})()`);
  await wd.sleep(800);

  // ---------------- QUOTE LIFECYCLE ----------------
  console.log('\n=== QUOTE LIFECYCLE ===');
  await gotoPage('quotes');
  await click(`(()=>{const b=document.querySelector('[data-action="new-quote"]');if(b)b.click();return true})()`);
  await wd.sleep(1300);
  check('quote editor opens', (await R('document.body.innerText')).includes('Clear scope. Ready for approval.'));
  await setVal('#invoice-customer', await R(`(()=>{const s=document.querySelector('#invoice-customer');return s&&s.options.length>1?s.options[1].value:''})()`));
  await setVal('[data-field=description]', 'Flow audit quote');
  await setVal('[data-field=price]', '750');
  await wd.sleep(500);
  await click(`(()=>{const b=document.querySelector('#invoice-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1800);
  await closeDialog();
  const qNo = await R(`(()=>{const m=document.body.innerText.match(/QTE-\\d{4,9}/);return m?m[0]:null})()`);
  check('quote saved', !!qNo, 'no QTE number');
  await click(`(()=>{const b=document.querySelector('[data-quote-view]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  check('quote detail opens', await R(`!!document.querySelector('.detail-paper')`));
  await click(`(()=>{const b=document.querySelector('[data-quote-action="sent"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await submitDialog();
  await wd.sleep(1200);
  await closeDialog();
  await click(`(()=>{const b=document.querySelector('[data-quote-action="accepted"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await submitDialog();
  await wd.sleep(1200);
  await closeDialog();
  check('quote accepted', (await R('document.body.innerText')).includes('accepted'));
  await click(`(()=>{const b=document.querySelector('[data-quote-action="convert"]');if(b)b.click();return true})()`);
  await wd.sleep(1500);
  await closeDialog();
  check('quote converted to an invoice', (await R(`(()=>{const m=document.body.innerText.match(/INV-\\d{4,9}/);return m?m[0]:null})()`)) !== null);

  // ---------------- CUSTOMER / ITEM / EXPENSE ----------------
  console.log('\n=== CUSTOMER / ITEM / EXPENSE ===');
  await gotoPage('customers');
  await click(`(()=>{const b=document.querySelector('[data-action="new-customer"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await setVal('#customer-name', 'Flow Audit Customer');
  await setVal('#customer-address', '9 Test Road, Durban');
  await submitDialog();
  await wd.sleep(1200);
  check('customer created', (await R('document.body.innerText')).includes('Flow Audit Customer'));

  await gotoPage('items');
  await click(`(()=>{const b=document.querySelector('[data-action="new-item"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await setVal('#item-name', 'Flow Audit Item');
  await setVal('#item-price', '250');
  await submitDialog();
  await wd.sleep(1200);
  check('item created', (await R('document.body.innerText')).includes('Flow Audit Item'));

  await gotoPage('expenses');
  await click(`(()=>{const b=document.querySelector('[data-action="new-expense"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  await setVal('#expense-desc', 'Flow audit expense');
  await setVal('#expense-amount', '120');
  await setVal('#expense-vat', '18');
  await submitDialog();
  await wd.sleep(1200);
  check('expense created with VAT', (await R('document.body.innerText')).includes('Flow audit expense'));

  // ---------------- SETTINGS ----------------
  console.log('\n=== SETTINGS ===');
  await gotoPage('settings');
  await setVal('#business-name', 'Flow Audit Studio');
  await click(`(()=>{const b=document.querySelector('#settings-form button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1500);
  check('business details saved', (await R('document.body.innerText')).includes('Business details saved'));

  // ---------------- COMPLIANCE ----------------
  console.log('\n=== COMPLIANCE ===');
  await gotoPage('compliance');
  check('VAT201 panel renders', (await R('document.body.innerText')).includes('VAT201'));
  check('CIPC panel renders', (await R('document.body.innerText')).includes('CIPC'));

  // ---------------- CASH FLOW ----------------
  console.log('\n=== CASH FLOW ===');
  await gotoPage('cashflow');
  check('cash flow forecast renders', (await R('document.body.innerText')).includes('Safe to spend') || (await R('document.body.innerText')).includes('forecast'));
  await setVal('#cf-late', '10');
  await click(`(()=>{const b=document.querySelector('#cashflow-scenarios button[type=submit]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  check('cash flow scenario applied', !((await R('document.body.innerText')).includes('Check amounts')));

  // ---------------- BACKUP / RESTORE ----------------
  console.log('\n=== BACKUP / RESTORE ===');
  await gotoPage('settings');
  check('backup action available', await R(`!!document.querySelector('[data-action="backup"]')`));

  // ---------------- ERRORS ----------------
  console.log('\n=== JS ERRORS ===');
  const e = await errs();
  check('no JS errors across all flows', e.length === 0, JSON.stringify(e).slice(0, 400));

  fs.writeFileSync(path.join(OUT, 'flow-results.json'), JSON.stringify(log, null, 2));
  console.log(`\nRESULT: ${checks} checks, ${failures} failures`);
} catch (err) {
  failures++;
  console.log('EXCEPTION:', err.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = failures ? 1 : 0;
