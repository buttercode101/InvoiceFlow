// InvoiceFlow visual, interaction, accessibility and offline audit.
//
// Runs against the live site by default, or against a local static server:
//   node tests/harness/ui-audit.mjs                 # audit the live deployment
//   node tests/harness/ui-audit.mjs --local         # audit dist/ via a local server
//
// Requires geckodriver on $WD_URL and Firefox. Exits non-zero on any failure.

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';

const LIVE = 'https://invoiceflow-za.vercel.app/';
const LOCAL = process.argv.includes('--local');
const BASE = LOCAL ? 'http://127.0.0.1:38080/' : LIVE;

const PAGES = ['overview','invoices','quotes','collections','expenses','cashflow','customers','compliance','settings','items','reports'];
const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

let failures = 0, checks = 0;
function check(name, cond, detail = '') {
  checks++;
  if (cond) console.log('  PASS', name);
  else { failures++; console.log('  FAIL', name, detail); }
}

// Elements that escape their container or the viewport. Intentional horizontal
// scroll regions (.table-wrap) are excluded — they are the responsive pattern.
const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  for (const el of document.querySelectorAll('#main *')) {
    if (el.closest('.table-wrap')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (r.right > vw + 1 || r.left < -1) {
      const tag = el.tagName.toLowerCase();
      const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\\s+/).slice(0,3).join('.') : '';
      bad.push({kind:'viewport', tag, cls, left: Math.round(r.left), right: Math.round(r.right), vw});
    }
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      const tag = el.tagName.toLowerCase();
      const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\\s+/).slice(0,3).join('.') : '';
      bad.push({kind:'container', tag, cls, sw: el.scrollWidth, cw: el.clientWidth});
    }
  }
  return JSON.stringify({vw, scrollW: document.documentElement.scrollWidth, count: bad.length, bad: bad.slice(0,8)});
})()`;

// Accessibility: images need alt, inputs need an accessible name, buttons need text.
const A11Y = `(() => {
  const problems = [];
  const named = el => (el.id && document.querySelector('label[for="'+el.id+'"]'))
    || el.closest('label')
    || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) problems.push({kind:'img-alt', sel: img.getAttribute('src') || img.className});
  }
  for (const el of document.querySelectorAll('input,select,textarea')) {
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
    if (!named(el)) problems.push({kind:'field-label', sel: el.id || el.name || el.type});
  }
  for (const b of document.querySelectorAll('button')) {
    const text = (b.textContent || '').trim();
    const label = b.getAttribute('aria-label');
    if (!text && !label) problems.push({kind:'button-name', sel: b.className || b.dataset.action || b.id});
  }
  for (const el of document.querySelectorAll('[role=img],svg')) {
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (!el.getAttribute('aria-label') && !el.getAttribute('role')) problems.push({kind:'svg-label', sel: el.className || el.tagName});
  }
  return JSON.stringify(problems);
})()`;

let wd, server;
try {
  if (LOCAL) {
    server = await startStaticServer();
    console.log(`Local server: ${'http://127.0.0.1:38080/'}`);
  }
  wd = await WD();
  const R = (s) => wd.evalRaw('return ' + s);
  const goto = async (page) => {
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="${page}"]');if(b)b.click();return true})()`);
    await wd.sleep(700);
  };
  const probe = async (label) => {
    const d = JSON.parse(await R(PROBE));
    check(`${label}: no horizontal overflow`, d.scrollW <= d.vw + 1, `scrollW=${d.scrollW} vw=${d.vw}`);
    check(`${label}: no overflowing elements`, d.count === 0, `${d.count}: ` + JSON.stringify(d.bad.slice(0, 4)));
  };

  await wd.goto(BASE);
  await wd.sleep(3000);
  check('app boots', await R('!!document.querySelector("#main")'));
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await wd.sleep(2500);

  // ---------- 1. Responsive sweep ----------
  console.log('\n=== RESPONSIVE SWEEP ===');
  for (const width of WIDTHS) {
    await wd.rect(width, 900);
    await wd.sleep(450);
    for (const page of PAGES) {
      await goto(page);
      await probe(`${page}@${width}`);
    }
  }

  // ---------- 2. Dark mode ----------
  console.log('\n=== DARK MODE ===');
  await wd.rect(1440, 900); await wd.sleep(400);
  await wd.evalRaw(`(()=>{document.documentElement.setAttribute('data-theme','dark');return true})()`);
  await wd.sleep(700);
  for (const page of ['overview','invoices','collections','cashflow','compliance','settings']) {
    await goto(page);
    const d = JSON.parse(await R(PROBE));
    check(`dark ${page}: no overflow`, d.count === 0, JSON.stringify(d.bad.slice(0, 3)));
  }
  const darkBg = await R('getComputedStyle(document.body).backgroundColor');
  check('dark theme applied', !/246, 247, 244|#f6f7f4/.test(darkBg), darkBg);
  await wd.evalRaw(`(()=>{document.documentElement.removeAttribute('data-theme');return true})()`);
  await wd.sleep(500);

  // ---------- 3. Editor + draft guard ----------
  console.log('\n=== EDITOR ===');
  await goto('invoices');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
  await wd.sleep(1200);
  check('new-invoice opens the editor', await R('document.body.innerText.includes("Let’s make an invoice.")'));
  await probe('editor@1440');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="invoices"]');if(b)b.click();return true})()`);
  await wd.sleep(1000);
  check('leaving the editor asks before discarding', await R('document.body.innerText.includes("Leave this invoice?")'));
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-confirm-ok]');if(b)b.click();return true})()`);
  await wd.sleep(900);

  // ---------- 4. Expense photo dialog ----------
  console.log('\n=== EXPENSE PHOTO DIALOG ===');
  await goto('expenses');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="new-expense-photo"]');if(b)b.click();return true})()`);
  await wd.sleep(2200);
  check('photo dialog opens', await R('!!document.querySelector("dialog[open]")'));
  check('photo dialog has VAT field', await R('!!document.querySelector("#photo-vat")'));
  let readBtn = null;
  for (let i = 0; i < 12 && !readBtn; i++) {
    readBtn = await R('(()=>{const b=document.querySelector("#photo-read");if(!b)return null;const s=getComputedStyle(b);return JSON.stringify({disabled:b.disabled,opacity:s.opacity})})()');
    if (!readBtn) await wd.sleep(500);
  }
  check('Read-with-AI disabled before a file is chosen', readBtn !== null && JSON.parse(readBtn).disabled === true, readBtn);
  check('disabled button is visually muted', readBtn !== null && Number(JSON.parse(readBtn).opacity) < 1, readBtn);
  await wd.evalRaw(`(()=>{const g=document.querySelector("dialog[open]");if(g)g.close();return true})()`);
  await wd.sleep(400);

  // ---------- 5. Detail views ----------
  console.log('\n=== DETAIL VIEWS ===');
  for (const width of [390, 1440]) {
    await wd.rect(width, 900); await wd.sleep(400);
    await goto('invoices');
    const inv = await R(`(()=>{const b=document.querySelector('[data-view]');if(!b)return null;b.click();return b.dataset.view})()`);
    await wd.sleep(1000);
    if (inv) await probe(`invoice-detail@${width}`); else console.log(`  SKIP invoice-detail@${width}`);
    await goto('customers');
    const cust = await R(`(()=>{const b=document.querySelector('[data-client-view]');if(!b)return null;b.click();return b.dataset.clientView})()`);
    await wd.sleep(1000);
    if (cust) await probe(`client-detail@${width}`); else console.log(`  SKIP client-detail@${width} (no customers in demo data)`);
    await goto('quotes');
    const q = await R(`(()=>{const b=document.querySelector('[data-quote-view]');if(!b)return null;b.click();return b.dataset.quoteView})()`);
    await wd.sleep(1000);
    if (q) await probe(`quote-detail@${width}`); else console.log(`  SKIP quote-detail@${width} (no quotes in demo data)`);
  }

  // ---------- 6. Accessibility ----------
  console.log('\n=== ACCESSIBILITY ===');
  await wd.rect(1440, 900); await wd.sleep(400);
  for (const page of ['overview','invoices','expenses','compliance','settings']) {
    await goto(page);
    const problems = JSON.parse(await R(A11Y));
    check(`a11y ${page}: images, fields and buttons named`, problems.length === 0, JSON.stringify(problems.slice(0, 5)));
  }

  // ---------- 7. Offline readiness ----------
  console.log('\n=== OFFLINE ===');
  await goto('overview');
  await wd.evalAsync(`
    const done = arguments[arguments.length-1];
    (async()=>{ try{ await navigator.serviceWorker.ready; }catch(e){} done(true); })();
  `);
  await wd.sleep(2500);
  const swState = await R(`JSON.stringify({controller: !!navigator.serviceWorker.controller, ready: !!navigator.serviceWorker})`);
  check('service worker controls the page', JSON.parse(swState).controller === true, swState);
  const cacheNames = await wd.evalAsync(`
    const done = arguments[arguments.length-1];
    (async()=>{ let k=[]; try{ k=await caches.keys(); }catch(e){} done(JSON.stringify(k)); })();
  `);
  check('offline cache populated', JSON.parse(cacheNames).some(k => k.startsWith('invoiceflow-')), cacheNames);

  console.log(`\nRESULT: ${checks} checks, ${failures} failures`);
} catch (e) {
  failures++;
  console.log('EXCEPTION:', e.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = failures ? 1 : 0;
