import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReceiptText, suggestCategory, normalizeReceiptDraft, receiptDraftContext} from '../dist/receipt.js';

test('suggestCategory matches merchant keywords',()=>{
  assert.equal(suggestCategory('Adobe Creative Cloud subscription'),'Software');
  assert.equal(suggestCategory('Uber ride to the airport'),'Travel');
  assert.equal(suggestCategory('Print supplies and toner'),'Supplies');
  assert.equal(suggestCategory('Bank fee and interest'),'Professional services');
  assert.equal(suggestCategory('Random thing'),'Other');
});

test('parseReceiptText reads JSON from a vision model',()=>{
  const d=parseReceiptText('{"description":"Print supplies","amount":250.5,"date":"2026-11-10","category":"Supplies"}');
  assert.equal(d.description,'Print supplies');
  assert.equal(d.amount,25050);
  assert.equal(d.date,'2026-11-10');
  assert.equal(d.category,'Supplies');
});

test('parseReceiptText reads a plain text receipt',()=>{
  const d=parseReceiptText('TAKE AWAY COFFEE\n2026-11-09\nTotal R 45,00\nVAT R 6,00\nCard');
  assert.equal(d.description,'TAKE AWAY COFFEE');
  assert.equal(d.amount,4500);
  assert.equal(d.date,'2026-11-09');
});

test('parseReceiptText reads a DD/MM/YYYY date',()=>{
  const d=parseReceiptText('Corner Bakery\n09/11/2026\nTotal R 120,00');
  assert.equal(d.date,'2026-11-09');
  assert.equal(d.amount,12000);
});

test('parseReceiptText leaves unreadable fields empty rather than guessing',()=>{
  const d=parseReceiptText('Mystery shop\nThanks for shopping');
  assert.equal(d.amount,0);
  assert.equal(d.date,null);
  assert.equal(d.category,'Other');
  assert.ok(d.description.length>0);
});

test('parseReceiptText throws on empty input',()=>{
  assert.throws(()=>parseReceiptText('   '),/No receipt text/);
});

test('normalizeReceiptDraft rejects bad categories and amounts',()=>{
  const d=normalizeReceiptDraft({description:'X',amount:'abc',category:'Nonsense'});
  assert.equal(d.category,'Other');
  assert.equal(d.amount,0);
  assert.equal(d.description,'X');
});

test('receiptDraftContext returns the most used category and recent expenses',()=>{
  const ctx=receiptDraftContext({expenses:[
    {description:'a',category:'Travel',amount:100,date:'2026-01-01'},
    {description:'b',category:'Travel',amount:100,date:'2026-01-02'},
    {description:'c',category:'Supplies',amount:100,date:'2026-01-03'},
  ]});
  assert.equal(ctx.usualCategory,'Travel');
  assert.equal(ctx.recent.length,3);
  assert.equal(ctx.recent[0].description,'c');
});
