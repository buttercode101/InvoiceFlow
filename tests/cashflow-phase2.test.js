import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,today,addDays,addMonth,createInvoice,issueInvoice,recordPayment,addRecurring,cashFlowForecast,cashFlowActions} from '../dist/core.js';

function workspace(){
  const s=emptyState();
  s.business={...s.business,name:'Test Studio',address:'1 Test Road'};
  s.customers=[{id:'client-1',name:'Northline Studio',email:'accounts@example.com',address:'2 Test Road'}];
  return s;
}
function makeInvoice(s,days,price=100000){
  const date=addDays(today(),-30);
  const id=createInvoice(s,{customerId:'client-1',date,due:addDays(today(),days),lines:[{description:'Work',quantity:100,price}],notes:''});
  issueInvoice(s,id);
  return id;
}

test('week 1 starts on today and later weeks step by 7 days (local date, no UTC drift)',()=>{
  const s=workspace();
  const f=cashFlowForecast(s,13);
  assert.equal(f.weeks[0].start, today());
  assert.equal(f.weeks[1].start, addDays(today(),7));
  assert.equal(f.weeks[12].start, addDays(today(),84));
});

test('an overdue invoice is treated as arriving in week 1',()=>{
  const s=workspace();
  makeInvoice(s,-5,800000);
  const f=cashFlowForecast(s,13);
  assert.equal(f.weeks[0].inflows,800000);
  assert.equal(f.totalIn,800000);
});

test('a recurring schedule projects its source invoice total across the horizon',()=>{
  const s=workspace();
  const id=makeInvoice(s,7,500000);
  recordPayment(s,id,{amount:500000,date:today(),reference:'Paid'}); // paid source contributes nothing
  addRecurring(s,id,addDays(today(),3));
  const f=cashFlowForecast(s,13);
  let expected=0, d=addDays(today(),3), guard=0;
  const horizonEnd=addDays(today(),91);
  while(d && guard++<12){ if(d<=horizonEnd) expected+=500000; d=addMonth(d,Number(d.slice(8))); }
  assert.ok(expected>=500000, 'at least one occurrence expected');
  assert.equal(f.totalIn,expected);
  assert.equal(f.weeks[0].inflows,500000,'first occurrence lands in week 1');
});

test('a paused recurring schedule is excluded from the forecast',()=>{
  const s=workspace();
  const id=makeInvoice(s,7,500000);
  recordPayment(s,id,{amount:500000,date:today(),reference:'Paid'});
  addRecurring(s,id,addDays(today(),3));
  s.recurring[0].active=false;
  const f=cashFlowForecast(s,13);
  assert.equal(f.totalIn,0);
});

test('late payment scenario shifts inflows later without changing the 13-week total',()=>{
  const s=workspace();
  makeInvoice(s,0,100000);
  const base=cashFlowForecast(s,13);
  const late=cashFlowForecast(s,13,{latePaymentDays:14});
  assert.equal(base.weeks[0].inflows,100000);
  assert.equal(late.weeks[0].inflows,0);
  assert.equal(late.weeks[2].inflows,100000,'today + 14 days falls in week 3');
  assert.equal(late.totalIn,base.totalIn);
});

test('new job scenario adds income to the chosen week',()=>{
  const s=workspace();
  const base=cashFlowForecast(s,13);
  const f=cashFlowForecast(s,13,{newJobAmount:250000,newJobWeek:5});
  assert.equal(f.totalIn,base.totalIn+250000);
  assert.equal(f.weeks[4].inflows,base.weeks[4].inflows+250000);
});

test('extra expense scenario adds an outflow to the chosen week',()=>{
  const s=workspace();
  const base=cashFlowForecast(s,13);
  const f=cashFlowForecast(s,13,{extraExpenseAmount:90000,extraExpenseWeek:3});
  assert.equal(f.totalOut,base.totalOut+90000);
  assert.equal(f.weeks[2].outflows,base.weeks[2].outflows+90000);
});

test('runway reports the first week the projected balance goes negative',()=>{
  const s=workspace();
  s.expenses=[{id:'e1',date:today(),description:'Big cost',amount:500000,category:'Other'}];
  const f=cashFlowForecast(s,13);
  assert.equal(f.runway,0);
  assert.equal(f.minBalance,f.endingBalance);
  assert.equal(f.safeToSpend,0);
});

test('a healthy surplus yields a positive safe-to-spend figure and no runway',()=>{
  const s=workspace();
  makeInvoice(s,0,1000000); // arrives in week 1
  const f=cashFlowForecast(s,13);
  assert.equal(f.minBalance,1000000);
  assert.equal(f.safeToSpend,800000);
  assert.equal(f.runway,null);
});

test('cashFlowActions ranks an overdue invoice first with its amount',()=>{
  const s=workspace();
  makeInvoice(s,-3,800000);
  const f=cashFlowForecast(s,13);
  const actions=cashFlowActions(s,f);
  assert.equal(actions[0].action,'overdue');
  assert.equal(actions[0].amount,800000);
});

test('cashFlowActions ranks a projected shortfall ahead of routine reminders',()=>{
  const s=workspace();
  s.expenses=[{id:'e1',date:today(),description:'Big cost',amount:9000000,category:'Other'}];
  const f=cashFlowForecast(s,13);
  const actions=cashFlowActions(s,f);
  assert.equal(actions[0].action,'shortfall');
  assert.ok(actions[0].amount>0);
});
