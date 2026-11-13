import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState, createInvoice, reminderSchedule, reminderText, today, addDays} from '../dist/core.js';

function workspace(){
  const s=emptyState();
  s.business={...s.business,name:'Test Studio',address:'1 Test Road',bank:'EFT · Test Bank'};
  s.customers.push({id:'c1',name:'Acme Traders',email:'acme@example.com',address:'2 Loop Street'});
  return s;
}

function issued(overrides={}){
  const s=workspace();
  const id=createInvoice(s,{id:undefined,customerId:'c1',date:today(),due:addDays(today(),14),notes:'',lines:[{description:'Design work',quantity:100,price:350000}],...overrides});
  const i=s.invoices.find(x=>x.id===id);
  i.state='issued';
  return {s,i};
}

// reminderSchedule picks the four follow-up moments from SoloBid: 3 days before,
// on the due date, and 7 and 14 days after.

test('no reminder is scheduled for drafts, paid invoices or non-issued states', () => {
  const {s,i}=issued();
  assert.equal(reminderSchedule(i,today()), null);
  i.state='draft';
  assert.equal(reminderSchedule(i,addDays(i.due,-3)), null);
  i.state='paid';
  assert.equal(reminderSchedule(i,addDays(i.due,-3)), null);
});

test('the four reminder moments are recognised', () => {
  const {s,i}=issued();
  assert.equal(reminderSchedule(i,addDays(i.due,-3)), 'soon');
  assert.equal(reminderSchedule(i,i.due), 'today');
  assert.equal(reminderSchedule(i,addDays(i.due,7)), 'overdue7');
  assert.equal(reminderSchedule(i,addDays(i.due,14)), 'overdue14');
});

test('days outside the schedule return null', () => {
  const {s,i}=issued();
  assert.equal(reminderSchedule(i,addDays(i.due,-2)), null);
  assert.equal(reminderSchedule(i,addDays(i.due,1)), null);
  assert.equal(reminderSchedule(i,addDays(i.due,30)), null);
});

// reminderMessage produces a paste-ready note for each stage. It must never claim
// anything was sent — the user pastes it into their own channel.

test('each stage produces a message naming the invoice and the amount due', () => {
  const {s,i}=issued();
  for(const stage of ['soon','today','overdue7','overdue14']){
    const text=reminderText(i,stage);
    assert.equal(typeof text,'string');
    assert.ok(text.length>0, stage+' produced an empty message');
    assert.ok(text.includes(i.number), stage+' missing invoice number');
    assert.ok(/3\s*500/.test(text), stage+' missing amount');
  }
});

test('the overdue stages escalate in tone', () => {
  const {s,i}=issued();
  const gentle=reminderText(i,'today');
  const firm=reminderText(i,'overdue14');
  assert.notEqual(gentle,firm);
  assert.ok(/final|arrange|urgent|overdue/i.test(firm), 'overdue14 is not firmer');
});

test('messages never claim the reminder was sent automatically', () => {
  const {s,i}=issued();
  const text=reminderText(i,'today');
  assert.ok(!/sent|emailed|delivered/i.test(text), 'message claims it was sent');
});

test('an unknown stage falls back to a neutral reminder', () => {
  const {s,i}=issued();
  const text=reminderText(i,'not-a-stage');
  assert.ok(text.includes(i.number));
});

test('a message with no customer name still renders safely', () => {
  const {s,i}=issued({customerId:'c1'});
  i.customer={...i.customer,name:''};
  const text=reminderText(i,'today');
  assert.ok(text.includes(i.number));
});

test('business name and payment details appear in the message', () => {
  const {s,i}=issued();
  const text=reminderText(i,'today');
  assert.ok(text.includes('Test Studio'));
  assert.ok(text.includes('EFT'));
});
