// Zero-dependency W3C WebDriver harness for InvoiceFlow UI verification.
//
// Requires: geckodriver reachable at $WD_URL (default http://127.0.0.1:4444)
//           and Firefox installed.
// The harness starts its own static server for dist/ on $APP_PORT (default 38080),
// so no external server is needed.
//
// Usage:
//   import { WD, APP, startStaticServer, stopStaticServer } from './browser-harness.mjs';
//   const server = await startStaticServer(); const wd = await WD(); ... await wd.close(); stopStaticServer(server);

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WD_URL = process.env.WD_URL || `http://127.0.0.1:${process.env.WD_PORT || 4444}`;
export const APP = `http://127.0.0.1:${process.env.APP_PORT || 38080}`;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const SHOT_DIR = process.env.SHOT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../audit/visual');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

export function startStaticServer(port = Number(process.env.APP_PORT || 38080)) {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let file = path.join(DIST, pathname);
    if (file.endsWith('/')) file += 'index.html';
    // Prevent path traversal outside dist/.
    if (!path.resolve(file).startsWith(DIST)) { res.statusCode = 403; return res.end(); }
    let body;
    try { body = fs.readFileSync(file); } catch { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

export function stopStaticServer(server) {
  if (!server) return;
  return new Promise((resolve) => server.close(() => resolve()));
}

async function j(r) { const t = await r.text(); try { return JSON.parse(t); } catch { return { raw: t }; } }

export async function WD({ headless = true, width = 1440, height = 900 } = {}) {
  const caps = { capabilities: { alwaysMatch: {
    browserName: 'firefox',
    'moz:firefoxOptions': { args: headless ? ['-headless'] : [], prefs: { 'ui.systemDarkTheme': 0 } },
    'webSocketUrl': false
  } } };
  const s = await fetch(`${WD_URL}/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(caps) }).then(j);
  if (!s.value?.sessionId) throw new Error('No WebDriver session: ' + JSON.stringify(s));
  const sid = s.value.sessionId;
  let closed = false;

  const cmd = async (method, urlPath, body) => {
    if (closed) throw new Error('session closed');
    const r = await fetch(`${WD_URL}/session/${sid}${urlPath}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const out = await j(r);
    if (out.value && out.value.error) throw new Error(`${out.value.error}: ${JSON.stringify(out.value.message || '').slice(0, 300)}`);
    return out.value;
  };

  const api = {
    sid,
    cmd,
    async goto(url) { return cmd('POST', '/url', { url }); },
    async go(pathname) { return cmd('POST', '/url', { url: APP + pathname }); },
    async eval(script, ...args) {
      const body = args.length ? { script: `return (${script})(...arguments);`, args } : { script: `return (${script});`, args: [] };
      return cmd('POST', '/execute/sync', body);
    },
    async evalAsync(script) { return cmd('POST', '/execute/async', { script, args: [] }); },
    async evalRaw(expression) { return cmd('POST', '/execute/sync', { script: expression, args: [] }); },
    async rect(w, h) { return cmd('POST', '/window/rect', { width: w, height: h }); },
    async click(selector) {
      const el = await cmd('POST', '/element', { using: 'css selector', value: selector });
      const id = el['element-6066-11e4-a52e-4f735466cecf'] || el.ELEMENT;
      if (!id) throw new Error('element not found: ' + selector);
      return cmd('POST', `/element/${id}/click`, {});
    },
    async type(selector, text) {
      const el = await cmd('POST', '/element', { using: 'css selector', value: selector });
      const id = el['element-6066-11e4-a52e-4f735466cecf'] || el.ELEMENT;
      if (!id) throw new Error('element not found: ' + selector);
      await cmd('POST', `/element/${id}/click`, {});
      await cmd('POST', `/element/${id}/clear`, {});
      return cmd('POST', `/element/${id}/value`, { text });
    },
    async value(selector) {
      const el = await cmd('POST', '/element', { using: 'css selector', value: selector });
      const id = el['element-6066-11e4-a52e-4f735466cecf'] || el.ELEMENT;
      return cmd('GET', `/element/${id}/property/value`);
    },
    async exists(selector) {
      const el = await cmd('POST', '/element', { using: 'css selector', value: selector }).catch(() => null);
      return !!(el && (el['element-6066-11e4-a52e-4f735466cecf'] || el.ELEMENT));
    },
    async shot(name) {
      const v = await cmd('GET', '/screenshot');
      fs.mkdirSync(SHOT_DIR, { recursive: true });
      const p = path.join(SHOT_DIR, name);
      fs.writeFileSync(p, Buffer.from(v, 'base64'));
      return p;
    },
    async sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
    async close() { const p = cmd('DELETE', '').catch(() => {}); closed = true; return p; }
  };
  return api;
}

// Unregister service workers and clear caches so the app serves current dist/ assets.
export async function resetApp(wd) {
  await wd.evalAsync(`
    const done = arguments[arguments.length-1];
    (async()=>{
      try{
        const regs=await navigator.serviceWorker.getRegistrations();
        for(const r of regs) await r.unregister();
        const ks=await caches.keys();
        for(const k of ks) await caches.delete(k);
      }catch(e){}
      done(true);
    })();
  `);
  await wd.go('/');
  await wd.sleep(2200);
}
