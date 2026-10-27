import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import * as c from '../dist/core.js';
import {invoicePDF} from '../dist/pdf.js';
function fixture(){const s=c.emptyState();s.business={...s.business,name:'Audit Studio',address:'1 Main',nonVat:false,vatNumber:'4123456789'};s.customers=[{id:'c',name:'Customer',email:'',address:'2 Main'}];return s}
const data={customerId:'c',date:'2026-01-01',due:'2026-01-15',notes:'',lines:[{description:'Work',quantity:100,price:4}],taxMode:'inclusive'};
test('restore rejects non-numeric quote numbers even when padded canonically',()=>{for(const number of ['QTE-0NaN','QTE-Infinity','QTE--001']){const s=fixture();c.saveQuote(s,data);s.quotes[0].number=number;assert.throws(()=>c.parseBackup(c.makeBackup(s)),/Invalid quote/);}});
let extractor=false;try{execFileSync('pdftotext',['-v'],{stdio:'ignore'});extractor=true}catch{}
test('credit PDF prints the original invoice cumulative tax allocation', {skip:!extractor&&'pdftotext is required to inspect rendered PDF text'},async()=>{const s=fixture(),id=c.createInvoice(s,data);c.issueInvoice(s,id);const credit=c.creditInvoice(s,id,2,'Partial credit'),source=s.invoices[0];assert.equal(credit.vat,1);const document={...source,kind:'credit',number:credit.number,creditBreakdown:c.creditTax(source,credit.id),lines:[{description:'Partial credit',quantity:100,price:2}],payments:[],credits:[]};assert.equal(c.breakdown({...document,creditBreakdown:undefined}).vat,0);assert.equal(c.breakdown(document).vat,1);const fontBytes=new Uint8Array(fs.readFileSync(new URL('../dist/vendor/DejaVuSans.ttf',import.meta.url))),dir=fs.mkdtempSync(path.join(os.tmpdir(),'invoiceflow-credit-'));try{const file=path.join(dir,'credit.pdf');fs.writeFileSync(file,await invoicePDF(document,{fontBytes}));const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});assert.match(text,/VAT 15%\s+R 0,01/);assert.match(text,/Value excluding VAT\s+R 0,01/);assert.match(text,/Credit value\s+R 0,02/)}finally{fs.rmSync(dir,{recursive:true,force:true})}});

test('restore cannot override invoice calculations through export-only credit metadata',()=>{for(const mutate of [i=>i.kind='credit',i=>i.creditBreakdown={subtotal:1,discount:0,net:1,vat:0,total:1},i=>{i.kind='credit';i.creditBreakdown={subtotal:1,discount:0,net:1,vat:0,total:1}}]){const s=c.demoState();mutate(s.invoices[0]);assert.throws(()=>c.parseBackup(c.makeBackup(s)),/document metadata/)}const s=fixture();c.saveQuote(s,data);s.quotes[0].kind='credit';s.quotes[0].creditBreakdown={subtotal:1,discount:0,net:1,vat:0,total:1};assert.throws(()=>c.parseBackup(c.makeBackup(s)),/document metadata/)});
