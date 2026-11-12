import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,today,addDays,createInvoice,issueInvoice,recordPayment,reversePayment,parseCommand,clientScore,cashFlowForecast,saveQuote,setQuoteState,convertQuote} from '../dist/core.js';

function workspace(){
  const s=emptyState();
  s.business={...s.business,name:'Test Studio',address:'1 Test Road'};
  s.customers=[{id:'client-1',name:'Northline Studio',email:'accounts@example.com',address:'2 Test Road'}];
  return s;
}

test('cash-flow expense run rate uses the full 13-week horizon, not record count',()=>{
  const s=workspace();
  s.expenses=Array.from({length:13},(_,n)=>({id:'expense-'+n,date:addDays(today(),-n),description:'Operating cost '+n,amount:1300,category:'Other'}));
  const forecast=cashFlowForecast(s,1);
  assert.equal(forecast.weeks[0].outflows,1300);
  assert.equal(forecast.totalOut,1300);
  assert.equal(forecast.weeks[0].net,-1300);
  assert.equal(forecast.endingBalance,-1300);
});

test('co-pilot parses a quote, client, service description, amount and due days',()=>{
  const parsed=parseCommand('Quote Northline Studio for monthly design retainer R8,000 due in 21 days',workspace());
  assert.equal(parsed.type,'quote');
  assert.equal(parsed.client,'Northline Studio');
  assert.deepEqual(parsed.lines,[{description:'monthly design retainer',quantity:100,price:800000}]);
  assert.equal(parsed.dueDays,21);
});

test('co-pilot parses invoice amount and defaults safely when due date is omitted',()=>{
  const parsed=parseCommand('Invoice for Northline Studio for logo design R4,500',workspace());
  assert.equal(parsed.type,'invoice');
  assert.equal(parsed.client,'Northline Studio');
  assert.deepEqual(parsed.lines,[{description:'logo design',quantity:100,price:450000}]);
  assert.equal(parsed.dueDays,14);
});

test('client scoring ignores reversed receipts when calculating payment behaviour',()=>{
  const s=workspace();
  const make=(date)=>createInvoice(s,{customerId:'client-1',date,due:addDays(date,14),lines:[{description:'Consulting',quantity:100,price:10000}],notes:''});
  const a=make(addDays(today(),-30));
  issueInvoice(s,a);
  recordPayment(s,a,{amount:10000,date:addDays(today(),-20),reference:'Paid'});
  const b=make(addDays(today(),-10));
  issueInvoice(s,b);
  recordPayment(s,b,{amount:10000,date:addDays(today(),-9),reference:'Mistaken'});
  reversePayment(s,b,s.invoices.find(i=>i.id===b).payments[0].id,'Duplicate receipt');
  const score=clientScore(s,'client-1');
  assert.equal(score.count,2);
  assert.equal(score.avgDays,10);
  assert.equal(score.reliability,'new');
});

test('client scoring classifies two active timely receipts as excellent',()=>{
  const s=workspace();
  for(const days of [8,12]){
    const date=addDays(today(),-days-1);
    const id=createInvoice(s,{customerId:'client-1',date,due:addDays(date,14),lines:[{description:'Work',quantity:100,price:10000}],notes:''});
    issueInvoice(s,id);
    recordPayment(s,id,{amount:10000,date:addDays(date,days),reference:'Paid'});
  }
  const score=clientScore(s,'client-1');
  assert.equal(score.count,2);
  assert.equal(score.avgDays,10);
  assert.equal(score.reliability,'excellent');
});

test('co-pilot invoice draft can be reviewed, issued and paid end to end',()=>{
  const s=workspace();
  const parsed=parseCommand('Invoice Northline Studio for logo design R4,500 due in 14 days',s);
  const invoiceId=createInvoice(s,{customerId:'client-1',date:today(),due:addDays(today(),parsed.dueDays),lines:parsed.lines.map(l=>({description:l.description,quantity:l.quantity,price:l.price})),notes:''});
  const draft=s.invoices.find(i=>i.id===invoiceId);
  assert.equal(draft.state,'draft');
  assert.equal(draft.lines[0].description,'logo design');
  assert.equal(draft.lines[0].price,450000);
  issueInvoice(s,invoiceId);
  recordPayment(s,invoiceId,{amount:450000,date:today(),reference:'EFT'});
  assert.equal(s.invoices[0].state,'issued');
  assert.equal(s.invoices[0].payments[0].amount,450000);
});

test('co-pilot quotation draft can be reviewed, accepted, converted, issued and paid',()=>{
  const s=workspace();
  const parsed=parseCommand('Quote Northline Studio for monthly retainer R8,000 due in 21 days',s);
  const quoteId=saveQuote(s,{customerId:'client-1',date:today(),due:addDays(today(),parsed.dueDays),lines:parsed.lines.map(l=>({description:l.description,quantity:l.quantity,price:l.price})),notes:''});
  assert.equal(s.quotes[0].state,'draft');
  setQuoteState(s,quoteId,'sent');
  setQuoteState(s,quoteId,'accepted');
  const invoiceId=convertQuote(s,quoteId);
  issueInvoice(s,invoiceId);
  recordPayment(s,invoiceId,{amount:800000,date:today(),reference:'EFT'});
  assert.equal(s.invoices[0].state,'issued');
  assert.equal(s.invoices[0].payments[0].amount,800000);
});
