import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {emptyState,validateState,makeBackup,parseBackup,backupAgeDays} from '../dist/core.js';

const appSrc = fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const coreSrc = fs.readFileSync(new URL('../dist/core.js', import.meta.url), 'utf8');
const cssSrc = fs.readFileSync(new URL('../dist/style.css', import.meta.url), 'utf8');

function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('regression: no native confirm() calls in dist/app.js', () => {
  const matches = appSrc.match(/\bconfirm\s*\(/g) || [];
  assert.equal(matches.length, 0, `native confirm( sites remain: ${matches.length}`);
  assert.match(appSrc, /confirmUnsaved/);
});

test('focus ring meets WCAG non-text contrast >= 3:1 (light and dark)', () => {
  const light = cssSrc.match(/--focus:(#[0-9a-fA-F]{6})/)?.[1];
  assert.ok(light, 'light --focus token missing');
  assert.notEqual(light.toLowerCase(), '#64a893', 'old failing ring still in use');
  assert.ok(contrast(light, '#ffffff') >= 3, `light ring vs white is ${contrast(light, '#ffffff').toFixed(2)}`);
  assert.ok(contrast(light, '#f6f7f4') >= 3, `light ring vs bg is ${contrast(light, '#f6f7f4').toFixed(2)}`);
  const darkLine = cssSrc.split('\n').find(l => l.includes('[data-theme=dark]') && l.includes('--focus:'));
  const dark = darkLine?.match(/--focus:(#[0-9a-fA-F]{6})/)?.[1];
  assert.ok(dark, 'dark --focus token missing');
  assert.ok(contrast(dark, '#121b18') >= 3, `dark ring vs dark bg is ${contrast(dark, '#121b18').toFixed(2)}`);
});

test('lastBackupAt defaults null and validates when optional', () => {
  assert.equal(emptyState().lastBackupAt, null);
  const s = emptyState();
  validateState(s);
  delete s.lastBackupAt;
  validateState(s); // old backups without the field
  s.lastBackupAt = '2026-11-01T10:00:00.000Z';
  validateState(s);
  s.lastBackupAt = 'not-a-date';
  assert.throws(() => validateState(s));
  s.lastBackupAt = 123;
  assert.throws(() => validateState(s));
});

test('backupAgeDays thresholds (7d soft, 30d escalate)', () => {
  assert.equal(backupAgeDays(emptyState()), null);
  assert.equal(backupAgeDays({}), null);
  const now = new Date('2026-11-08T12:00:00Z');
  const at = days => ({lastBackupAt: new Date(now.getTime() - days * 86400000).toISOString()});
  assert.equal(backupAgeDays(at(0), now), 0);
  assert.equal(backupAgeDays(at(7), now), 7);
  assert.equal(backupAgeDays(at(30), now), 30);
  assert.equal(backupAgeDays({lastBackupAt: 'invalid'}, now), null);
});

test('lastBackupAt survives backup round-trip', () => {
  const s = emptyState();
  s.lastBackupAt = '2026-11-01T10:00:00.000Z';
  assert.equal(parseBackup(makeBackup(s)).state.lastBackupAt, '2026-11-01T10:00:00.000Z');
});

test('draft autosave keys + debounce + restore toast present in app', () => {
  assert.match(appSrc, /invoiceflow-draft:\$\{workspace\}:\$\{isQuote/);
  assert.match(appSrc, /setTimeout\(writeDraft,400\)/);
  assert.match(appSrc, /Draft restored — Unsaved changes from before\./);
  assert.match(appSrc, /draftKeyFor\(mode/);
});

test('backup timestamps displayed in Settings and Overview with 7d/30d policy', () => {
  assert.match(appSrc, /id="last-backup"/);
  assert.match(appSrc, /backupLabel\(\)/);
  assert.match(appSrc, /backupCardHTML\(\)/);
  assert.match(appSrc, /days<7/);
  assert.match(appSrc, /days>=30/);
  assert.match(appSrc, /invoiceflow-backup-nudge-at/);
  assert.match(appSrc, /s\.lastBackupAt=new Date\(\)\.toISOString\(\)/);
});

test('confirmUnsaved uses existing dialog, focuses cancel, restores focus', () => {
  assert.match(appSrc, /function confirmUnsaved\(/);
  assert.match(appSrc, /data-confirm-cancel/);
  assert.match(appSrc, /querySelector\('\[data-confirm-cancel\]'\)\.focus\(\)/);
  assert.match(appSrc, /aria-describedby/);
});
