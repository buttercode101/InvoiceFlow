import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,today,addDays,createInvoice,issueInvoice,validateState,expenseCSV,vat201Report,cipcNextReturn,parseCommand} from '../dist/core.js';

function workspace(){
  const s=emptyState();
  s.business={...s.business,name:'Test Studio',address:'1 Test Road'};
  s.customers=[{id:'client-1',name:'Northline Studio',email:'accounts@example.com',address:'2 Test Road'}];
  return s;
}

function issuedInvoice(s){
  const id=createInvoice(s,{customerId:'client-1',date:today(),due:addDays(today(),14),lines:[{description:'Work',quantity:100,price:10000}],notes:''});
  issueInvoice(s,id);
  return s.invoices.find(i=>i.id===id);
}

test('cipcNextReturn reports 31 December, not shifted back a day by timezone conversion',()=>{
  const s=workspace();s.business.cipcRegistration='2026/123456/07';
  const r=cipcNextReturn(s,new Date(2026,5,15));
  assert.equal(r.due,'2026-12-31');
  assert.ok(r.days>0,'days remaining should be positive');
});

test('cipcNextReturn rolls to the next year once 31 December has passed',()=>{
  const s=workspace();s.business.cipcRegistration='2026/123456/07';
  // Pass a UTC date clearly after Dec 31: Jan 1 next year
  const r=cipcNextReturn(s,new Date(Date.UTC(2027,0,1)));
  assert.equal(r.due,'2027-12-31');
  assert.ok(r.days>0);
});

test('cipcNextReturn returns null when no registration is recorded',()=>{
  const s=workspace();
  assert.equal(cipcNextReturn(s,new Date(2026,5,15)),null);
});

test('validateState rejects malformed follow-up history',()=>{
  const s=workspace();const i=issuedInvoice(s);
  i.followUps=[{date:today(),outcome:'bogus'}];
  assert.throws(()=>validateState(s),/follow-up/i);
});

test('validateState rejects follow-ups that are not a list',()=>{
  const s=workspace();const i=issuedInvoice(s);
  i.followUps={date:today(),outcome:'pending'};
  assert.throws(()=>validateState(s),/follow-up/i);
});

test('validateState accepts valid pending and paid follow-ups',()=>{
  const s=workspace();const i=issuedInvoice(s);
  i.followUps=[{date:today(),outcome:'pending'},{date:today(),outcome:'paid',paidAt:today()}];
  assert.doesNotThrow(()=>validateState(s));
});

test('vat201Report counts only expenses that actually record VAT',()=>{
  const s=workspace();
  s.expenses=[
    {id:'e1',date:today(),description:'VAT purchase',amount:11500,category:'Other',vatAmount:1500},
    {id:'e2',date:today(),description:'No VAT purchase',amount:5000,category:'Other'}
  ];
  const r=vat201Report(s,today(),today());
  assert.equal(r.expenses,1);
  assert.equal(r.input,1500);
});

test('expenseCSV imports an optional vat column',()=>{
  const rows=expenseCSV('date,description,amount,category,vat\n'+today()+',Software,115.00,Software,15.00\n'+today()+',Transport,85.50,Travel,\n');
  assert.equal(rows.length,2);
  assert.equal(rows[0].vatAmount,1500);
  assert.equal(rows[1].vatAmount,undefined);
});

test('expenseCSV still imports the original four-column format',()=>{
  const rows=expenseCSV('date,description,amount,category\n'+today()+',Software,115.00,Software\n');
  assert.equal(rows.length,1);
  assert.equal(rows[0].vatAmount,undefined);
});

test('expenseCSV rejects a five-column header that is not a vat column',()=>{
  assert.throws(()=>expenseCSV('date,description,amount,category,note\n'+today()+',Software,115.00,Software,hello\n'),/headers/i);
});

test('validateState rejects a non-string CIPC registration',()=>{
  const s=workspace();s.business.cipcRegistration=12345;
  assert.throws(()=>validateState(s),/CIPC/i);
});

test('validateState accepts a valid CIPC registration',()=>{
  const s=workspace();s.business.cipcRegistration='2026/123456/07';
  assert.doesNotThrow(()=>validateState(s));
});

test('parseCommand emits quantity, matching the invoice line shape',()=>{
  const s=workspace();
  const parsed=parseCommand('Invoice Northline Studio for logo design R4,500',s);
  assert.deepEqual(parsed.lines,[{description:'logo design',quantity:100,price:450000}]);
});
