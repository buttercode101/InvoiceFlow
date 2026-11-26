// Tall (full-height) screenshots to inspect below-the-fold content like the cash chart.
import fs from 'node:fs';
import { WD, startStaticServer, stopStaticServer } from './browser-harness.mjs';

const APP = 'http://127.0.0.1:38080';
const OUT = '/data/data/com.termux/files/home/.hermes/cache/scratch/if/shots';
fs.mkdirSync(OUT, { recursive: true });
const server = await startStaticServer();
const wd = await WD();
const sleep = (ms) => wd.sleep(ms);
const goto = async (p) => { await wd.evalRaw(`(()=>{const b=document.querySelector('[data-page="${p}"]');if(b)b.click();return true})()`); await sleep(650); };
const shot = async (name) => { const v = await wd.cmd('GET', '/screenshot'); fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(v, 'base64')); console.log('shot', name); };

try {
  await wd.goto(APP + '/');
  await sleep(2600);
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-action="demo"]');if(b)b.click();return true})()`);
  await sleep(2600);
  await wd.rect(1440, 2400); await sleep(600);
  await goto('overview'); await shot('tall-overview-light');
  await goto('cashflow'); await shot('tall-cashflow-light');
  await wd.evalRaw(`(()=>{document.documentElement.setAttribute('data-theme','dark');return true})()`); await sleep(700);
  await goto('cashflow'); await shot('tall-cashflow-dark');
  await goto('overview'); await shot('tall-overview-dark');
  await wd.evalRaw(`(()=>{document.documentElement.removeAttribute('data-theme');return true})()`); await sleep(500);
  await goto('invoices');
  await wd.evalRaw(`(()=>{const b=document.querySelector('[data-view]');if(b)b.click();return true})()`);
  await sleep(1200); await shot('tall-invoice-detail-light');
  await wd.evalRaw(`(()=>{document.documentElement.setAttribute('data-theme','dark');return true})()`); await sleep(700);
  await shot('tall-invoice-detail-dark');
} catch (e) { console.log('EXCEPTION', e.message); }
finally { await wd.close(); await stopStaticServer(server); }
