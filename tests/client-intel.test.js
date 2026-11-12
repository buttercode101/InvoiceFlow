import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,today,addDays,createInvoice,issueInvoice,recordPayment,reversePayment,creditInvoice,clientIntelligence,smartFollowUp} from '../dist/core.js';

function workspace(){
  const s=emptyState();
  s.business={...s.business,name:'Test Studio',address:'1 Test Road'};
  s.customers=[{id:'client-1',name:'Northline Studio',email:'accounts@example.com',address:'2 Test Road'}];
  return s;
}
function make(s,days,price=100000){
  const date=addDays(today(),-30);
  const id=createInvoice(s,{customerId:'client-1',date,due:addDays(today(),days),lines:[{description:'Work',quantity:100,price}],notes:''});
  issueInvoice(s,id);
  return id;
}

test('clientIntelligence returns totals and a chronological timeline',()=>{
  const s=workspace();
  const id=make(s,7,100000);
  recordPayment(s,id,{amount:40000,date:addDays(today(),-1),reference:'Deposit'});
  const info=clientIntelligence(s,'client-1');
  assert.equal(info.count,1);
  assert.equal(info.totalBilled,100000);
  assert.equal(info.totalPaid,40000);
  assert.equal(info.outstanding,60000);
  assert.deepEqual(info.events.map(e=>e.kind),['invoice','payment']);
  assert.equal(info.customer.name,'Northline Studio');
});

test('clientIntelligence records credit notes and reversals in the timeline',()=>{
  const s=workspace();
  const id=make(s,7,100000);
  recordPayment(s,id,{amount:10000,date:addDays(today(),-1),reference:'Mistake'});
  const paymentId=s.invoices[0].payments[0].id;
  reversePayment(s,id,paymentId,'Duplicate receipt');
  creditInvoice(s,id,20000,'Discount agreed');
  const info=clientIntelligence(s,'client-1');
  assert.deepEqual(info.events.map(e=>e.kind),['invoice','payment','reversal','credit']);
  assert.equal(info.totalPaid,0);
  assert.equal(info.totalCredited,20000);
  assert.equal(info.outstanding,80000);
});

test('smartFollowUp uses a firm tone for slow payers',()=>{
  const s=workspace();
  for(const [d,late] of [[60,50],[40,30]]){
    const date=addDays(today(),-d);
    const id=createInvoice(s,{customerId:'client-1',date,due:addDays(date,14),lines:[{description:'Work',quantity:100,price:10000}],notes:''});
    issueInvoice(s,id);
    recordPayment(s,id,{amount:10000,date:addDays(date,late),reference:'Late'});
  }
  const id3=createInvoice(s,{customerId:'client-1',date:addDays(today(),-5),due:addDays(today(),9),lines:[{description:'Work',quantity:100,price:10000}],notes:''});
  issueInvoice(s,id3);
  const follow=smartFollowUp(s,'client-1');
  assert.equal(follow.reliability,'slow');
  assert.equal(follow.tone,'firm');
  assert.match(follow.message,/Payment follow-up/);
  assert.equal(follow.openCount,1);
});

test('smartFollowUp uses a friendly tone when there is no slow history',()=>{
  const s=workspace();
  const date=addDays(today(),-20);
  const id=createInvoice(s,{customerId:'client-1',date,due:addDays(date,14),lines:[{description:'Work',quantity:100,price:10000}],notes:''});
  issueInvoice(s,id);
  recordPayment(s,id,{amount:10000,date:addDays(date,5),reference:'On time'});
  const id2=createInvoice(s,{customerId:'client-1',date:today(),due:addDays(today(),14),lines:[{description:'Work',quantity:100,price:10000}],notes:''});
  issueInvoice(s,id2);
  const follow=smartFollowUp(s,'client-1');
  assert.equal(follow.tone,'friendly');
  assert.match(follow.message,/Friendly reminder/);
});

test('smartFollowUp targets the oldest overdue invoice first',()=>{
  const s=workspace();
  make(s,-10,50000);
  make(s,-3,70000);
  const follow=smartFollowUp(s,'client-1');
  assert.equal(follow.overdueCount,2);
  assert.equal(follow.balance,50000);
  assert.equal(follow.totalOpen,120000);
});

test('smartFollowUp throws when there is nothing to chase',()=>{
  const s=workspace();
  const id=make(s,7,100000);
  recordPayment(s,id,{amount:100000,date:today(),reference:'Paid'});
  assert.throws(()=>smartFollowUp(s,'client-1'),/no unpaid invoices/i);
});
