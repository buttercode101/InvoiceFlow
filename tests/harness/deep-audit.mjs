// Deep audit: gaps the standard ui-audit does not cover.
//   - empty (live) workspace rendering on every page
//   - WCAG contrast for text in light AND dark themes
//   - touch-target sizes for interactive controls
//   - long-content stress (long names/emails/addresses) via the real UI
//   - runtime error capture during interactions
//
// Usage: node tests/harness/deep-audit.mjs   (needs geckodriver + Firefox; starts its own server)

import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';

const APP = 'http://127.0.0.1:38080';
const PAGES = ['overview', 'invoices', 'quotes', 'collections', 'expenses', 'cashflow', 'customers', 'compliance', 'settings', 'items', 'templates', 'reports'];

let fails = 0, checks = 0;
const check = (n, c, d = '') => { checks++; if (c) console.log('  PASS', n); else { fails++; console.log('  FAIL', n, d); } };

const OVERFLOW = `(()=>{const vw=document.documentElement.clientWidth;const bad=[];for(const el of document.querySelectorAll('#main *')){if(el.closest('.table-wrap'))continue;const r=el.getBoundingClientRect();if(!r.width&&!r.height)continue;if(r.right>vw+1||r.left<-1)bad.push({tag:el.tagName.toLowerCase(),cls:String(el.className||'').slice(0,36),right:Math.round(r.right),vw})}return JSON.stringify({vw,sw:document.documentElement.scrollWidth,n:bad.length,bad:bad.slice(0,6)})})()`;

const CONTRAST = `(()=>{
  const parse=c=>{const i=c.indexOf('(');if(i<0)return null;const p=c.slice(i+1,c.lastIndexOf(')')).split(',').map(x=>parseFloat(x));if(p.length<3||p.some(isNaN))return null;return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
  const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
  const lum=c=>0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b);
  const ratio=(a,b)=>{const L1=lum(a),L2=lum(b),hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05)};
  const blend=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const effBg=el=>{let cur=el,acc=null;while(cur){const bg=parse(getComputedStyle(cur).backgroundColor);if(bg&&bg.a>0){acc=acc?blend(acc,bg):bg;if(acc.a>=1||bg.a>=1)return acc}cur=cur.parentElement}return acc||{r:255,g:255,b:255,a:1}};
  const bad=[];
  for(const el of document.querySelectorAll('#main *, .sidebar *, .topbar *, dialog *')){
    let hasText=false;for(const n of el.childNodes){if(n.nodeType===3&&n.textContent.trim().length>1){hasText=true;break}}
    if(!hasText)continue;
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.1)continue;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    const fg=parse(cs.color);if(!fg)continue;
    const bg=effBg(el);const fgc=fg.a<1?blend(fg,bg):fg;
    const cr=ratio(fgc,bg);
    const fs=parseFloat(cs.fontSize);const fw=parseInt(cs.fontWeight)||400;
    const large=fs>=24||(fs>=18.66&&fw>=700);const need=large?3:4.5;
    if(cr<need-0.02)bad.push({tag:el.tagName.toLowerCase(),cls:String(el.className||'').slice(0,34),fs:Math.round(fs),cr:Math.round(cr*100)/100,need,txt:el.textContent.trim().slice(0,26)});
  }
  return JSON.stringify({n:bad.length,bad:bad.slice(0,20)});
})()`;

const TOUCH = `(()=>{
  const bad=[];
  const sel='#main button,#main a,#main input,#main select,#main textarea,#main [role=button],.sidebar button,.sidebar a,.topbar button,.topbar a,nav button,nav a,dialog button';
  for(const el of document.querySelectorAll(sel)){
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')continue;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    if(el.tagName==='A'&&el.closest('p,li,td,.address,.footer,.notice,.receipt-note,.helper-card,.empty,.form-note'))continue;
    const h=Math.round(r.height),w=Math.round(r.width);
    if(h<44||w<44)bad.push({tag:el.tagName.toLowerCase(),cls:String(el.className||'').slice(0,28),w,h,txt:(el.textContent||'').trim().slice(0,16)});
  }
  return JSON.stringify({n:bad.length,bad:bad.slice(0,40)});
})()`;

let wd, server;
try {
  server = await startStaticServer();
  wd = await WD();
  const R = (s) => wd.evalRaw('return ' + s);
  const sleep = (ms) => wd.sleep(ms);
  const goto = async (page) => { await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="${page}"]');if(b)b.click();return true})()`); await sleep(700); };

  await wd.goto(APP + '/');
  await sleep(2600);
  check('app boots', await R('!!document.querySelector("#main")'));

  // Start from a truly empty live workspace.
  await wd.evalAsync(`const done=arguments[arguments.length-1];(async()=>{try{const req=indexedDB.open('invoiceflow',1);req.onsuccess=()=>{const db=req.result;const t=db.transaction('workspaces','readwrite');t.objectStore('workspaces').delete('live');t.oncomplete=()=>done(true);t.onerror=()=>done(false)};req.onerror=()=>done(false)}catch(e){done(false)}})();`);
  await wd.goto(APP + '/');
  await sleep(2600);
  await wd.evalRaw(`(()=>{window.__errs=[];addEventListener('error',e=>window.__errs.push(String(e.message||e)));addEventListener('unhandledrejection',e=>window.__errs.push('rej:'+String(e.reason)));return true})()`);

  // ---------- EMPTY STATE ----------
  console.log('\n=== EMPTY (live) WORKSPACE ===');
  for (const p of PAGES) { await goto(p); const d = JSON.parse(await R(OVERFLOW)); check(`empty ${p}: no overflow`, d.sw <= d.vw + 1 && d.n === 0, JSON.stringify(d.bad)); }

  // ---------- LOAD DEMO ----------
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await sleep(2600);
  check('demo workspace loads', await R('document.body.innerText.length>200'));

  // ---------- CONTRAST (light) ----------
  console.log('\n=== CONTRAST (light) ===');
  for (const p of ['overview', 'invoices', 'collections', 'cashflow', 'compliance', 'settings']) {
    await goto(p);
    const c = JSON.parse(await R(CONTRAST));
    check(`light ${p}: contrast ok (${c.n})`, c.n === 0, JSON.stringify(c.bad.slice(0, 6)));
  }

  // ---------- TOUCH TARGETS ----------
  console.log('\n=== TOUCH TARGETS (<44px) ===');
  await goto('overview');
  const t = JSON.parse(await R(TOUCH));
  console.log(`  overview: ${t.n} controls under 44px`);
  if (t.n) console.log('   ', JSON.stringify(t.bad));

  // ---------- CONTRAST (dark) ----------
  console.log('\n=== CONTRAST (dark) ===');
  await wd.evalRaw(`(()=>{document.documentElement.setAttribute('data-theme','dark');return true})()`);
  await sleep(700);
  for (const p of ['overview', 'invoices', 'collections', 'cashflow', 'compliance', 'settings']) {
    await goto(p);
    const c = JSON.parse(await R(CONTRAST));
    check(`dark ${p}: contrast ok (${c.n})`, c.n === 0, JSON.stringify(c.bad.slice(0, 8)));
  }
  await wd.evalRaw(`(()=>{document.documentElement.removeAttribute('data-theme');return true})()`);
  await sleep(500);

  // ---------- EDITOR + DETAIL RESPONSIVE ----------
  console.log('\n=== EDITOR + DETAIL RESPONSIVE ===');
  const clearModal = async () => { await wd.evalRaw(`(()=>{const ok=document.querySelector('[data-confirm-ok]');if(ok)ok.click();return true})()`); await sleep(700); };
  for (const width of [320, 360, 390, 420, 768, 1024, 1280, 1440]) {
    await wd.rect(width, 900); await sleep(420);
    await clearModal();
    await goto('invoices');
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="new-invoice"]');if(b)b.click();return true})()`);
    await sleep(1100);
    const opened = await R('document.body.innerText.includes("make an invoice")');
    let d = JSON.parse(await R(OVERFLOW));
    check(`editor@${width}: opens + no overflow`, opened && d.sw <= d.vw + 1 && d.n === 0, `opened=${opened} ` + JSON.stringify(d.bad));
    await goto('invoices'); await sleep(600); await clearModal();
    await wd.evalRaw(`(()=>{const b=document.querySelector('[data-view]');if(b)b.click();return true})()`);
    await sleep(1000);
    d = JSON.parse(await R(OVERFLOW));
    check(`invoice-detail@${width}: no overflow`, d.sw <= d.vw + 1 && d.n === 0, JSON.stringify(d.bad));
    await goto('invoices'); await sleep(500);
  }
  await clearModal();
  await wd.rect(1440, 900); await sleep(400);

  // ---------- LONG CONTENT ----------
  console.log('\n=== LONG CONTENT ===');
  await goto('customers');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="new-customer"]');if(b)b.click();return true})()`);
  await sleep(900);
  await wd.type('#customer-name', 'Nkosinathi Holdings and Sons Trading Enterprises (Pty) Ltd');
  await wd.type('#customer-email', 'accounts.payable.department.for.very.long.organisation.name@subdomain.example.co.za');
  await wd.type('#customer-address', 'Unit 12, Very Long Building Name, 1234 Extremely Long Street Name, Johannesburg, Gauteng, 2001');
  await wd.evalRaw(`(()=>{const b=document.querySelector('#dialog-form .btn.primary');if(b)b.click();return true})()`);
  await sleep(1600);
  check('long customer created', await R('document.body.innerText.includes("Nkosinathi")'), 'customer not present after submit');
  for (const width of [320, 375, 1440]) {
    await wd.rect(width, 900); await sleep(400);
    await goto('customers');
    const d = JSON.parse(await R(OVERFLOW));
    check(`long customer@${width}: no overflow`, d.sw <= d.vw + 1 && d.n === 0, JSON.stringify(d.bad));
  }

  const errs = JSON.parse(await R('JSON.stringify(window.__errs||[])'));
  check('no runtime errors during audit', errs.length === 0, JSON.stringify(errs.slice(0, 5)));

  console.log(`\nRESULT: ${checks} checks, ${fails} failures`);
} catch (e) {
  fails++; console.log('EXCEPTION:', e.message);
} finally {
  if (wd) await wd.close();
  if (server) await stopStaticServer(server);
}
process.exitCode = fails ? 1 : 0;
