import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState, validateState, today} from '../dist/core.js';

function workspace(){
  const s=emptyState();
  s.business={...s.business,name:'Test Studio',address:'1 Test Road'};
  return s;
}

// Branding lives on the business record: a data-URL logo and an accent colour.

test('a valid logo data URL and accent colour are accepted', () => {
  const s=workspace();
  s.business.logo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
  s.business.accent='#1f6feb';
  assert.equal(validateState(s), s);
});

test('logo must be a data URL for a supported image type', () => {
  const s=workspace();
  s.business.logo='https://example.com/logo.png';
  assert.throws(()=>validateState(s), /logo/i);
});

test('a malformed data URL is rejected', () => {
  const s=workspace();
  s.business.logo='data:image/png;base64,!!!!not-base64!!!!';
  assert.throws(()=>validateState(s), /logo/i);
});

test('an oversized logo is rejected rather than silently stored', () => {
  const s=workspace();
  s.business.logo='data:image/png;base64,'+'A'.repeat(2_500_000);
  assert.throws(()=>validateState(s), /logo/i);
});

test('accent colour must be a hex colour', () => {
  const s=workspace();
  s.business.accent='rgb(1,2,3)';
  assert.throws(()=>validateState(s), /accent|colour|color/i);
});

test('a missing logo and accent fall back to defaults', () => {
  const s=workspace();
  s.business.logo=null;
  s.business.accent=null;
  assert.equal(validateState(s), s);
  assert.equal(s.business.logo, null);
  assert.equal(s.business.accent, null);
});

test('logo and accent survive a backup roundtrip', () => {
  const s=workspace();
  s.business.logo='data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
  s.business.accent='#0f766e';
  const clone=structuredClone(s);
  assert.equal(clone.business.logo, s.business.logo);
  assert.equal(clone.business.accent, s.business.accent);
  assert.equal(validateState(clone), clone);
});

test('today() returns an ISO date string for reminder scheduling', () => {
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});
