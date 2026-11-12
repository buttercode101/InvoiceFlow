export const VERSION=1;
export const MAX_BACKUP_BYTES=10000000;
export function makeBackup(state,workspace='live'){const text=JSON.stringify({app:'InvoiceFlow',exportedAt:new Date().toISOString(),workspace,state},null,2);if(new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES)throw Error('Workspace has reached the 10 MB backup limit. No new changes were saved.');return text}
export const CATEGORIES=['Software','Travel','Office','Marketing','Supplies','Professional services','Other'];
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export function dateOK(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s&&s>='1900-01-01'&&s<='2199-12-31'}
export function addDays(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function cents(value){const s=String(value).trim();if(!/^\d{1,9}(\.\d{1,2})?$/.test(s))throw Error('Enter a positive amount with at most two decimal places.');const [a,b='']=s.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>10000000000)throw Error('Amount exceeds R100,000,000.00.');return n}
export function qty(value){const n=cents(value);if(n<1||n>100000000)throw Error('Quantity must be between 0.01 and 1,000,000.');return n}
export function lineTotal(l){const n=Number((BigInt(l.quantity)*BigInt(l.price)+50n)/100n);if(!Number.isSafeInteger(n)||n>10000000000)throw Error('Line total exceeds R100,000,000.00.');return n}
export function subtotal(i){const n=i.lines.reduce((s,l)=>s+lineTotal(l),0);if(n>10000000000)throw Error('Invoice total exceeds R100,000,000.00.');return n}
export function total(i){return breakdown(i).total}
export function paid(i){return i.payments.filter(p=>!p.reversed).reduce((s,p)=>s+p.amount,0)}
export function balance(i){return total(i)-credited(i)-paid(i)}
export function status(i,day=today()){if(i.state==='void')return 'void';if(i.state==='issued'&&credited(i)===total(i))return 'credited';if(i.state==='draft')return 'draft';if(balance(i)===0)return 'paid';if(i.due<day)return 'overdue';return paid(i)>0?'partial':'sent'}
export function cashSummary(s,start='1900-01-01',end='2199-12-31'){const invoices=s.invoices.filter(i=>i.state==='issued');const income=invoices.reduce((sum,i)=>sum+i.payments.filter(p=>!p.reversed&&p.date>=start&&p.date<=end).reduce((a,p)=>a+p.amount,0),0);const expenses=s.expenses.filter(e=>e.date>=start&&e.date<=end).reduce((sum,e)=>sum+e.amount,0);return {income,expenses,net:income-expenses,outstanding:invoices.reduce((sum,i)=>sum+balance(i),0),overdue:invoices.filter(i=>status(i)==='overdue').reduce((sum,i)=>sum+balance(i),0)}}
export const id=()=>{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();if(!globalThis.crypto?.getRandomValues)throw Error('Secure record IDs are unavailable. Open this app in a current browser.');const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`};
export function emptyState(){return {version:VERSION,revision:0,business:{name:'',email:'',address:'',phone:'',bank:'',notes:'Thank you for your business.',nonVat:true},customers:[],items:[],invoices:[],expenses:[],nextNumber:1,lastBackupAt:null}}
export function backupAgeDays(s,now=new Date()){if(!s?.lastBackupAt)return null;const t=Date.parse(s.lastBackupAt);if(!Number.isFinite(t))return null;return Math.max(0,Math.floor((now.getTime()-t)/86400000))}
export function createInvoice(s,data){if(!s.business.name.trim())throw Error('Save your business details in Settings first.');const customer=s.customers.find(c=>c.id===data.customerId);if(!customer)throw Error('Choose a customer.');if(!dateOK(data.date)||!dateOK(data.due)||data.due<data.date)throw Error('Due date must be on or after the invoice date.');if(!data.lines.length||data.lines.length>100)throw Error('An invoice needs between 1 and 100 line items.');data.lines.forEach(checkLine);const existing=data.id?s.invoices.find(i=>i.id===data.id):null;if(data.id&&!existing)throw Error('Invoice no longer exists.');if(existing&&existing.state!=='draft')throw Error('Issued invoices are locked.');const invoice={id:existing?.id||id(),number:existing?.number||`INV-${String(s.nextNumber).padStart(4,'0')}`,customerId:customer.id,customer:structuredClone(customer),business:structuredClone(s.business),date:data.date,due:data.due,lines:structuredClone(data.lines),notes:clean(data.notes,3000),discount:data.discount??0,vatRate:s.business.nonVat?0:(data.vatRate??1500),taxMode:s.business.nonVat?'none':(data.taxMode||'exclusive'),template:data.template||'classic',deposit:data.deposit??0,state:'draft',payments:[],followUps:[],createdAt:existing?.createdAt||new Date().toISOString()};if(total(invoice)<=0)throw Error('Invoice total must be greater than zero.');if(existing)s.invoices[s.invoices.indexOf(existing)]=invoice;else{s.invoices.push(invoice);s.nextNumber++}return invoice.id}
export function issueInvoice(s,invoiceId){const i=s.invoices.find(i=>i.id===invoiceId);if(!i||i.state!=='draft')throw Error('Only drafts can be marked sent.');if(i.date>today())throw Error('A future-dated invoice cannot be marked sent yet.');if(!i.business.name.trim()||!i.business.address.trim())throw Error('Add your business name and address in Settings, then edit and save this draft before marking sent.');if(!i.customer.address.trim())throw Error('Add a customer address before marking sent. Edit this draft after updating the customer.');i.state='issued';i.issuedAt=new Date().toISOString()}
export function recordPayment(s,invoiceId,data){const i=s.invoices.find(i=>i.id===invoiceId);if(!i||i.state!=='issued')throw Error('Mark this invoice sent before recording a payment.');if(!dateOK(data.date)||data.date<i.date||data.date>today())throw Error('Payment date must be between the invoice date and today.');if(!Number.isSafeInteger(data.amount)||data.amount<=0||data.amount>balance(i))throw Error('Payment must be greater than zero and no more than the balance.');i.payments.push({id:id(),amount:data.amount,date:data.date,reference:clean(data.reference,150)});if(Array.isArray(i.followUps))for(const f of i.followUps)if(f.outcome==='pending'){f.outcome='paid';f.paidAt=data.date;}}
export function reversePayment(s,invoiceId,paymentId,reason){const i=s.invoices.find(i=>i.id===invoiceId);const p=i?.payments.find(p=>p.id===paymentId);if(!i||i.state!=='issued'||!p||p.reversed)throw Error('Only active payments on issued invoices can be reversed.');reason=clean(reason,300);if(!reason)throw Error('Add a reason for correcting this entry.');p.reversed=true;p.reversalReason=reason;p.reversedAt=new Date().toISOString()}
export function replaceWorkspaceContents(target,incoming){validateState(incoming);const revision=target.revision,nextNumber=Math.max(target.nextNumber,incoming.nextNumber),nextQuote=Math.max(target.nextQuote||1,incoming.nextQuote||1),nextCredit=Math.max(target.nextCredit||1,incoming.nextCredit||1),copy=structuredClone(incoming);Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,copy,{revision,nextNumber,nextQuote,nextCredit});return target}
export function parseBackup(text){if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES)throw Error('Choose a backup smaller than 10 MB.');let data;try{data=JSON.parse(text)}catch{throw Error('This is not valid JSON. Choose an InvoiceFlow backup.')}if(data?.app!=='InvoiceFlow')throw Error('Choose an InvoiceFlow JSON backup.');validateState(data.state);return data}
export function voidInvoice(s,invoiceId){const i=s.invoices.find(i=>i.id===invoiceId);if(!i||i.state!=='issued'||paid(i)>0||credited(i)>0)throw Error('Only unpaid issued invoices without credit notes can be voided.');i.state='void'}
export function clean(v,max=300){if(typeof v!=='string'||v.length>max)throw Error(`Text must contain at most ${max} characters.`);return v.trim()}
function checkLine(l){if(!l||!clean(l.description,300)||!Number.isSafeInteger(l.quantity)||l.quantity<1||l.quantity>100000000||!Number.isSafeInteger(l.price)||l.price<0||l.price>10000000000)throw Error('Invalid invoice line. Check description, quantity and price.');lineTotal(l)}
export function checkExpense(e){if(!e||typeof e.id!=='string'||!clean(e.description,300)||!dateOK(e.date)||e.date>today()||!Number.isSafeInteger(e.amount)||e.amount<=0||e.amount>10000000000||!CATEGORIES.includes(e.category))throw Error('Invalid expense. Use a date up to today, a positive amount and a listed category.');if(e.vatAmount!==undefined&&e.vatAmount!==null&&(!Number.isSafeInteger(e.vatAmount)||e.vatAmount<0||e.vatAmount>e.amount))throw Error('VAT amount must be a whole number of cents between zero and the expense amount.');if(e.receipt!==undefined)validateReceipt(e.receipt);return e}
function checkParty(c,business=false){if(!c||!clean(c.name,200)||typeof c.email!=='string'||c.email.length>254||(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)))throw Error('Invalid name or email.');clean(c.address,1500);if(c.vatNumber!==undefined&&c.vatNumber!==''&&!/^4\d{9}$/.test(c.vatNumber))throw Error('VAT number must be 10 digits starting with 4.');if(business){clean(c.phone,100);clean(c.bank,1500);clean(c.notes,3000);if(typeof c.nonVat!=='boolean')throw Error('Choose your VAT registration status.');if(!c.nonVat&&!/^4\d{9}$/.test(c.vatNumber||''))throw Error('A VAT-registered business needs a valid VAT number.')}}
export function validateState(s){if(s?.lastBackupAt!==undefined&&s.lastBackupAt!==null&&(typeof s.lastBackupAt!=='string'||!Number.isFinite(Date.parse(s.lastBackupAt))))throw Error('Invalid backup timestamp.');if(!s||s.version!==VERSION||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isSafeInteger(s.nextNumber)||s.nextNumber<1||s.nextNumber>100000000)throw Error('Unsupported or invalid backup format.');if(!s.business||typeof s.business!=='object'||Array.isArray(s.business)||typeof s.business.name!=='string')throw Error('Invalid business details in backup.');if(s.business.name)checkParty(s.business,true);else{if(JSON.stringify(s.business)!==JSON.stringify(emptyState().business))throw Error('Invalid business details.');}for(const k of ['customers','items','invoices','expenses']){if(!Array.isArray(s[k])||s[k].length>10000)throw Error('Backup is too large or incomplete.');const ids=new Set();for(const e of s[k]){if(!e||typeof e.id!=='string'||!/^[-_a-zA-Z0-9]{1,100}$/.test(e.id)||ids.has(e.id))throw Error('Invalid or duplicate record ID.');ids.add(e.id)}}s.customers.forEach(c=>checkParty(c));s.items.forEach(i=>{if(!clean(i.name,300)||!Number.isSafeInteger(i.price)||i.price<0||i.price>10000000000)throw Error('Invalid saved item.')});const numbers=new Set();for(const i of s.invoices){if(i.kind!==undefined||i.creditBreakdown!==undefined)throw Error('Invalid stored invoice document metadata.');if(typeof i.number!=='string'||!/^INV-\d{4,9}$/.test(i.number)||numbers.has(i.number)||Number(i.number.slice(4))<1||i.number!==`INV-${String(Number(i.number.slice(4))).padStart(4,'0')}`||Number(i.number.slice(4))>=s.nextNumber||typeof i.customerId!=='string'||!/^[-_a-zA-Z0-9]{1,100}$/.test(i.customerId)||!['draft','issued','void'].includes(i.state)||!dateOK(i.date)||!dateOK(i.due)||i.due<i.date||!Array.isArray(i.lines)||!i.lines.length||i.lines.length>100||!Array.isArray(i.payments)||i.payments.length>10000)throw Error('Invalid invoice in backup.');numbers.add(i.number);checkParty(i.customer);checkParty(i.business,true);if(i.state!=='draft'&&(i.date>today()||!i.business.address.trim()||!i.customer.address.trim()))throw Error('Issued invoices need valid dates and complete business and customer addresses.');if(i.state==='draft'&&i.payments.length)throw Error('Draft invoices cannot contain payment history.');clean(i.notes,3000);i.lines.forEach(checkLine);if(total(i)<=0)throw Error('Invoice total must be positive.');const pids=new Set();for(const p of i.payments){if(typeof p.id!=='string'||!/^[-_a-zA-Z0-9]{1,100}$/.test(p.id)||pids.has(p.id)||!dateOK(p.date)||p.date<i.date||p.date>today()||!Number.isSafeInteger(p.amount)||p.amount<=0||p.amount>10000000000)throw Error('Invalid payment in backup.');pids.add(p.id);clean(p.reference,150);if(p.reversed!==undefined&&typeof p.reversed!=='boolean')throw Error('Invalid reversal flag.');if(p.reversed){if(!clean(p.reversalReason,300)||typeof p.reversedAt!=='string'||!Number.isFinite(Date.parse(p.reversedAt)))throw Error('Invalid payment reversal in backup.')}}validateInvoiceOptions(i);if(paid(i)+credited(i)>total(i)||((i.state==='draft'||i.state==='void')&&paid(i)>0))throw Error('Invalid payment balance in backup.')}s.expenses.forEach(checkExpense);validateExtensions(s);return s}
export function parseCSV(text){if(typeof text!=='string'||text.length>2000000)throw Error('CSV must be smaller than 2 MB.');text=text.replace(/^\uFEFF/,'');let rows=[],row=[],field='',quoted=false,closed=false;for(let n=0;n<text.length;n++){let c=text[n];if(quoted){if(c==='"'&&text[n+1]==='"'){field+='"';n++}else if(c==='"'){quoted=false;closed=true}else field+=c;}else if(c==='"'){if(field||closed)throw Error('Malformed quote in CSV.');quoted=true;}else if(c===','){row.push(field);field='';closed=false;}else if(c==='\r'||c==='\n'){if(c==='\r'&&text[n+1]==='\n')n++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';closed=false;}else{if(closed&&c.trim())throw Error('Unexpected text after a quoted CSV value.');if(!closed)field+=c;}}if(quoted)throw Error('Unclosed quote in CSV.');row.push(field);if(row.some(v=>v.trim()))rows.push(row);if(!rows.length)throw Error('CSV is empty.');return rows}
export function expenseCSV(text){const rows=parseCSV(text);const header=rows.shift().map(h=>h.trim().toLowerCase());if(header.length!==4||!['date','description','amount','category'].every(h=>header.includes(h)))throw Error('Use exactly these headers: date,description,amount,category.');if(!rows.length||rows.length>5000)throw Error('Import between 1 and 5,000 expenses.');return rows.map((r,index)=>{try{if(r.length!==4)throw Error('Wrong number of columns.');const v=Object.fromEntries(header.map((h,n)=>[h,r[n].trim()]));return checkExpense({id:id(),date:v.date,description:v.description,amount:cents(v.amount),category:v.category})}catch(e){throw Error(`Row ${index+2}: ${e.message}`)}})}
export const fingerprint=e=>JSON.stringify([e.date,e.description.trim().toLowerCase(),e.amount,e.category]);
export function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export const makeCSV=rows=>'\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
export function demoState(){const s=emptyState(),d=today();s.business={name:'Studio Mokoena',email:'hello@example.com',address:'18 Loop Street\nCape Town, 8001',phone:'',bank:'Example bank details · demonstration only',notes:'Thank you for supporting a small business.',nonVat:true};s.customers=[{id:id(),name:'Salt & Stone Café',email:'accounts@example.com',address:'32 Main Road\nCape Town, 8001'},{id:id(),name:'Northline Studio',email:'studio@example.com',address:'8 Jan Smuts Avenue\nJohannesburg, 2196'},{id:id(),name:'Good Company',email:'hello@example.com',address:'12 Florida Road\nDurban, 4001'}];s.items=[{id:id(),name:'Brand identity design',price:850000},{id:id(),name:'Design consultation / hour',price:65000},{id:id(),name:'Social content package',price:320000}];function inv(c,name,price,days,issue=true){const invId=createInvoice(s,{customerId:s.customers[c].id,date:addDays(d,-Math.max(35,days+20)),due:addDays(d,days),lines:[{description:name,quantity:100,price}],notes:s.business.notes});if(issue)issueInvoice(s,invId);return s.invoices.find(i=>i.id===invId)}inv(0,'Brand identity design',850000,-5);inv(1,'Website design · phase one',1240000,7);const i=inv(2,'Social content package',320000,-10);recordPayment(s,i.id,{amount:320000,date:addDays(d,-2),reference:'EFT received'});const p=inv(0,'Menu & packaging design',480000,12);recordPayment(s,p.id,{amount:150000,date:addDays(d,-1),reference:'Deposit received'});inv(1,'Design consultation',195000,14,false);s.expenses=[{id:id(),date:addDays(d,-3),description:'Creative software subscription',amount:69900,category:'Software'},{id:id(),date:addDays(d,-4),description:'Print samples',amount:85000,category:'Supplies'},{id:id(),date:addDays(d,-6),description:'Client meeting transport',amount:18000,category:'Travel'}];return s}

// Optional fields preserve all version-1 workspaces and historical non-VAT invoices.
export function breakdown(i){
 if(i.kind==='credit'&&i.creditBreakdown)return {...i.creditBreakdown};
 const sub=subtotal(i),discount=i.discount??0,rate=i.vatRate??0,mode=i.taxMode||'none';
 if(!Number.isSafeInteger(discount)||discount<0||discount>=sub&&discount!==0)throw Error('Discount must be less than the subtotal.');
 if(![0,1500].includes(rate)||!['none','exclusive','inclusive'].includes(mode)||mode==='none'&&rate!==0)throw Error('Choose a supported VAT treatment.');
 if(i.business?.nonVat!==false&&(rate!==0||mode!=='none'))throw Error('Non-VAT businesses cannot charge VAT.');
 const base=sub-discount,vat=mode==='inclusive'?Math.round(base*rate/(10000+rate)):Math.round(base*rate/10000),net=mode==='inclusive'?base-vat:base,result=net+vat;
 if(!Number.isSafeInteger(result)||result>10000000000)throw Error('Invoice total exceeds R100,000,000.00.');
 return {subtotal:sub,discount,net,vat,total:result};
}
export function credited(i){return (i.credits||[]).reduce((a,c)=>a+c.amount,0)}
function validateInvoiceOptions(i){
 const b=breakdown(i);if(i.template!==undefined&&!['classic','minimal','bold'].includes(i.template))throw Error('Invalid invoice template.');
 if(i.deposit!==undefined&&(!Number.isSafeInteger(i.deposit)||i.deposit<0||i.deposit>b.total))throw Error('Deposit cannot exceed the invoice total.');
 if(i.paymentLink!==undefined){let u;try{u=new URL(i.paymentLink)}catch{throw Error('Invalid payment link.')}if(u.protocol!=='https:'||u.username||u.password||!['pay.yoco.com','payfast.co.za','www.payfast.co.za','payment.payfast.io'].includes(u.hostname))throw Error('Invalid payment link.');}if(i.credits!==undefined){if(!Array.isArray(i.credits)||i.credits.length>1000)throw Error('Invalid credit notes.');for(const c of i.credits){if(i.state!=='issued'||!safeId(c.id)||!/^CRN-\d{4,9}$/.test(c.number)||!dateOK(c.date)||c.date<i.date||c.date>today()||!Number.isSafeInteger(c.amount)||c.amount<=0||!clean(c.reason,500))throw Error('Invalid credit note.');}}
}
const safeId=v=>typeof v==='string'&&/^[-_a-zA-Z0-9]{1,100}$/.test(v);
export function creditInvoice(s,invoiceId,amount,reason){const i=s.invoices.find(i=>i.id===invoiceId);if(!i||i.state!=='issued'||!Number.isSafeInteger(amount)||amount<=0||amount>balance(i))throw Error('Credit must be within the unpaid balance of an issued invoice.');reason=clean(reason,500);if(!reason)throw Error('Add a reason for the credit.');const n=s.nextCredit||1,c={id:id(),number:`CRN-${String(n).padStart(4,'0')}`,date:today(),amount,reason,vat:ratioRound(credited(i)+amount,breakdown(i).vat,total(i))-ratioRound(credited(i),breakdown(i).vat,total(i))};c.net=amount-c.vat;(i.credits??=[]).push(c);s.nextCredit=n+1;return c}
export function saveQuote(s,data){const quotes=s.quotes||[],old=data.id?quotes.find(q=>q.id===data.id):null;if(data.id&&!old)throw Error('Quote not found.');if(old&&old.state!=='draft')throw Error('Only draft quotes can be edited.');const tmp={...s,invoices:[],nextNumber:1};const invoiceId=createInvoice(tmp,{...data,id:undefined});const q={...tmp.invoices[0],id:old?.id||invoiceId,number:old?.number||`QTE-${String(s.nextQuote||1).padStart(4,'0')}`,state:'draft',createdAt:old?.createdAt||tmp.invoices[0].createdAt};s.quotes??=[];if(old)s.quotes[s.quotes.indexOf(old)]=q;else{s.quotes.push(q);s.nextQuote=(s.nextQuote||1)+1}return q.id}
export function setQuoteState(s,quoteId,next){const q=s.quotes?.find(q=>q.id===quoteId);const allowed={draft:['sent'],sent:['accepted','declined'],accepted:[],declined:[]};if(!q||!allowed[q.state]?.includes(next))throw Error('Invalid quote transition.');if(q.date>today())throw Error('Cannot send a future-dated quote.');if(!q.customer.address||!q.business.address)throw Error('Complete business and customer addresses first.');q.state=next;q.updatedAt=new Date().toISOString()}
export function convertQuote(s,quoteId){const q=s.quotes?.find(q=>q.id===quoteId);if(!q||q.state!=='accepted')throw Error('Record customer acceptance before converting.');if(q.invoiceId)return q.invoiceId;const i={...structuredClone(q),id:id(),number:`INV-${String(s.nextNumber).padStart(4,'0')}`,date:today(),due:addDays(today(),14),state:'draft',payments:[],quoteId:q.id,createdAt:new Date().toISOString()};delete i.invoiceId;s.invoices.push(i);s.nextNumber++;q.invoiceId=i.id;return i.id}
export function addMonth(day,anchor=Number(day.slice(8))){const d=new Date(day+'T12:00:00Z'),last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+2,0)).getUTCDate();return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,Math.min(anchor,last),12)).toISOString().slice(0,10)}
export function addRecurring(s,invoiceId,nextDate){const i=s.invoices.find(i=>i.id===invoiceId);if(!i||i.state==='void'||!dateOK(nextDate)||nextDate<=i.date)throw Error('Choose a next billing date after the source invoice date.');s.recurring??=[];if(s.recurring.some(r=>r.sourceId===invoiceId&&r.active))throw Error('This invoice already has an active schedule.');const r={id:id(),sourceId:invoiceId,nextDate,anchor:Number(nextDate.slice(8)),active:true};s.recurring.push(r);return r.id}
export function generateRecurring(s,recurringId,day=today()){const r=s.recurring?.find(r=>r.id===recurringId),source=s.invoices.find(i=>i.id===r?.sourceId);if(!r?.active||!source||r.nextDate>day)throw Error('No billing occurrence is due.');const date=r.nextDate,key=`${r.id}:${date}`;if(s.invoices.some(i=>i.occurrence===key))throw Error('This occurrence has already been generated.');const newId=createInvoice(s,{customerId:source.customerId,date,due:addDays(date,14),lines:source.lines,notes:source.notes,discount:source.discount||0,vatRate:source.vatRate||0,taxMode:source.taxMode||'none',template:source.template||'classic',deposit:source.deposit||0});s.invoices.find(i=>i.id===newId).occurrence=key;r.nextDate=addMonth(date,r.anchor);return newId}
export function ageing(s,day=today()){const buckets=[{label:'Not due',amount:0},{label:'1–30 days',amount:0},{label:'31–60 days',amount:0},{label:'61–90 days',amount:0},{label:'90+ days',amount:0}];for(const i of s.invoices.filter(i=>i.state==='issued')){const days=Math.floor((Date.parse(day)-Date.parse(i.due))/86400000);buckets[days<=0?0:days<=30?1:days<=60?2:days<=90?3:4].amount+=balance(i)}return buckets}
export function customerStatement(s,customerId){return s.invoices.filter(i=>i.customerId===customerId&&i.state==='issued').sort((a,b)=>a.date.localeCompare(b.date)).map(i=>({number:i.number,date:i.date,due:i.due,total:total(i),paid:paid(i),credit:credited(i),balance:balance(i)}))}
export function reminderText(i,tone='friendly'){if(i.state!=='issued'||balance(i)<=0)throw Error('Only unpaid issued invoices need reminders.');return `${tone==='firm'?'Payment follow-up':'Friendly reminder'}: ${i.number} from ${i.business.name} for ${i.customer.name}. Balance ${new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(balance(i)/100)}, due ${i.due}. Please use reference ${i.number}.${i.business.bank?'\n'+i.business.bank:''}\nIf already paid, please send your proof of payment. Thank you.`}
function validateExtensions(s){
 const quoteNumbers=new Set(),creditNumbers=new Set(),creditIds=new Set();
 for(const key of ['quotes','recurring'])if(s[key]!==undefined&&(!Array.isArray(s[key])||s[key].length>10000))throw Error('Invalid '+key+' records.');
 if(s.quotes?.length){if(!Number.isSafeInteger(s.nextQuote)||s.nextQuote<1)throw Error('Invalid quote sequence.');const ids=new Set();for(const q of s.quotes){const n=Number(q.number?.slice(4));if(!Number.isSafeInteger(n)||n<1||!safeId(q.id)||ids.has(q.id)||quoteNumbers.has(q.number)||q.number!==`QTE-${String(n).padStart(4,'0')}`||n<1||n>=s.nextQuote||!['draft','sent','accepted','declined'].includes(q.state)||q.payments?.length||q.credits?.length)throw Error('Invalid quote.');if(q.state!=='draft'&&(q.date>today()||!q.business.address||!q.customer.address))throw Error('Invalid issued quote.');ids.add(q.id);quoteNumbers.add(q.number);validateState({...emptyState(),business:s.business,invoices:[{...q,number:'INV-0001',state:'draft'}],nextNumber:2});if(q.invoiceId&&!s.invoices.some(i=>i.id===q.invoiceId&&i.quoteId===q.id))throw Error('Invalid converted quote.');}}
 for(const i of s.invoices)for(const c of i.credits||[]){const n=Number(c.number.slice(4));if(creditNumbers.has(c.number)||creditIds.has(c.id)||c.number!==`CRN-${String(n).padStart(4,'0')}`||n<1||!Number.isSafeInteger(s.nextCredit)||n>=s.nextCredit)throw Error('Invalid credit sequence.');creditNumbers.add(c.number);creditIds.add(c.id)}
 for(const i of s.invoices){let gross=0,vat=0;for(const c of i.credits||[]){gross+=c.amount;const expected=ratioRound(gross,breakdown(i).vat,total(i))-vat;if((c.vat!==undefined||c.net!==undefined)&&(c.vat!==expected||c.net!==c.amount-c.vat))throw Error('Invalid credit tax allocation.');vat+=expected}}
 const fingerprints=new Set();for(const i of s.invoices)for(const p of i.payments)if(p.bankFingerprint!==undefined){if(!/^[a-f0-9]{64}$/.test(p.bankFingerprint)||fingerprints.has(p.bankFingerprint))throw Error('Invalid or duplicate bank transaction.');fingerprints.add(p.bankFingerprint)}
 for(const key of ['nextQuote','nextCredit'])if(s[key]!==undefined&&(!Number.isSafeInteger(s[key])||s[key]<1||s[key]>100000000))throw Error('Invalid document sequence.');
 const recurringIds=new Set();for(const r of s.recurring||[]){if(!safeId(r.id)||recurringIds.has(r.id)||!s.invoices.some(i=>i.id===r.sourceId)||!dateOK(r.nextDate)||!Number.isInteger(r.anchor)||r.anchor<1||r.anchor>31||typeof r.active!=='boolean')throw Error('Invalid recurring schedule.');recurringIds.add(r.id)}
 const occurrences=new Set();for(const i of s.invoices)if(i.occurrence){if(typeof i.occurrence!=='string'||!/^[-_a-zA-Z0-9]+:\d{4}-\d{2}-\d{2}$/.test(i.occurrence)||occurrences.has(i.occurrence))throw Error('Duplicate billing occurrence.');occurrences.add(i.occurrence)}
}
export async function encryptBackup(text,password){if(!globalThis.crypto?.subtle)throw Error('Encrypted backups need HTTPS. Open the secure production app.');if(typeof password!=='string'||password.length<12)throw Error('Use a backup password with at least 12 characters.');parseBackup(text);const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await backupKey(password,salt);const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text)));const encode=b=>{let s='';for(let n=0;n<b.length;n+=8192)s+=String.fromCharCode(...b.subarray(n,n+8192));return btoa(s)};return JSON.stringify({app:'InvoiceFlow encrypted backup',version:1,salt:encode(salt),iv:encode(iv),data:encode(cipher)})}
async function backupKey(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
export async function decryptBackup(text,password){try{if(typeof text!=='string'||text.length>14000000)throw Error();const obj=JSON.parse(text);if(obj.app!=='InvoiceFlow encrypted backup'||obj.version!==1)throw Error();const decode=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0)),salt=decode(obj.salt),iv=decode(obj.iv),data=decode(obj.data);if(salt.length!==16||iv.length!==12||data.length>10000016)throw Error();const key=await backupKey(password,salt);const plain=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data));parseBackup(plain);return plain}catch{throw Error('Could not unlock this backup. Check the password and file. No records were changed.')}}
export function bankRows(text){const rows=parseCSV(text),header=rows.shift().map(x=>x.trim().toLowerCase());if(header.length!==3||!['date','reference','amount'].every(h=>header.includes(h))||!rows.length||rows.length>1000)throw Error('Use date,reference,amount headers and 1–1,000 incoming payment rows.');return rows.map((r,n)=>{if(r.length!==3)throw Error(`Invalid bank row ${n+2}.`);const v=Object.fromEntries(header.map((h,k)=>[h,r[k].trim()])),amount=cents(v.amount);if(!dateOK(v.date)||v.date>today()||!amount||!clean(v.reference,150))throw Error(`Invalid bank row ${n+2}. Use positive receipts dated up to today.`);return {...v,amount}})}
export function recordBankPayment(s,invoiceId,row,fingerprint){if(!/^[a-f0-9]{64}$/.test(fingerprint))throw Error('Invalid bank import fingerprint.');if(s.invoices.some(i=>i.payments.some(p=>p.bankFingerprint===fingerprint)))throw Error('This bank row is already recorded (including reversed entries). Record any correction manually.');recordPayment(s,invoiceId,row);s.invoices.find(i=>i.id===invoiceId).payments.at(-1).bankFingerprint=fingerprint}

function ratioRound(a,b,d){return Number((BigInt(a)*BigInt(b)*2n+BigInt(d))/(BigInt(d)*2n))}

export function creditTax(i,creditId){let previous=0;for(const c of i.credits||[]){const vat=ratioRound(previous+c.amount,breakdown(i).vat,total(i))-ratioRound(previous,breakdown(i).vat,total(i));if(c.id===creditId)return {subtotal:c.amount,discount:0,net:c.amount-vat,vat,total:c.amount};previous+=c.amount}throw Error('Credit note not found.')}

export function validateReceipt(r){if(!r||typeof r.name!=='string'||!r.name.trim()||r.name.length>150||!['image/png','image/jpeg','application/pdf'].includes(r.type)||typeof r.data!=='string'||r.data.length>666668||!/^[A-Za-z0-9+/]*={0,2}$/.test(r.data))throw Error('Invalid receipt attachment. Use a PNG, JPEG or PDF up to 500 KB.');let bytes;try{bytes=Uint8Array.from(atob(r.data),x=>x.charCodeAt(0))}catch{throw Error('Invalid receipt attachment.')}if(!bytes.length||bytes.length>500000)throw Error('Receipt exceeds 500 KB.');const valid=r.type==='image/png'?[137,80,78,71,13,10,26,10].every((v,n)=>bytes[n]===v):r.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:[37,80,68,70,45].every((v,n)=>bytes[n]===v);if(!valid)throw Error('Receipt content does not match its file type.');return r}

// Predictive cash flow (13-week rolling)
const RUN_RATE_WEEKS = 13;
function localISO(d){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}

export function cashFlowForecast(state, weeks = 13, scenarios = {}) {
  const todayStr = today();
  const start = new Date(todayStr + 'T00:00:00');
  const buckets = Array.from({length: weeks}, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i * 7);
    return { week: i + 1, start: localISO(d), inflows: 0, outflows: 0, net: 0, balance: 0 };
  });
  const endStr = localISO(new Date(start.getTime() + weeks * 7 * 86400000));
  const weekOf = (dateStr) => {
    const t = Date.parse(dateStr + 'T00:00:00'), s = Date.parse(todayStr + 'T00:00:00');
    const idx = Math.floor((t - s) / 604800000);
    return idx >= 0 && idx < weeks ? idx : -1;
  };

  // Scenario knobs (all optional, additive, deterministic)
  const latePaymentDays = Math.max(0, Number(scenarios.latePaymentDays) || 0);
  const newJobAmount = Math.max(0, Number(scenarios.newJobAmount) || 0);
  const newJobWeek = Math.max(1, Math.min(weeks, Number(scenarios.newJobWeek) || 0));
  const extraExpenseAmount = Math.max(0, Number(scenarios.extraExpenseAmount) || 0);
  const extraExpenseWeek = Math.max(1, Math.min(weeks, Number(scenarios.extraExpenseWeek) || 0));

  // Open invoices: the remaining balance is the expected inflow, dated by due date
  for (const inv of (state.invoices || [])) {
    if (inv.state !== 'issued') continue;
    const bal = balance(inv);
    if (bal <= 0) continue;
    let due = inv.due || todayStr;
    if (due < todayStr) due = todayStr;
    if (latePaymentDays) due = addDays(due, latePaymentDays);
    const idx = weekOf(due);
    if (idx >= 0) buckets[idx].inflows += bal;
  }

  // Recurring schedules: project each occurrence over the horizon from nextDate
  for (const rec of (state.recurring || [])) {
    if (!rec.active || !rec.nextDate) continue;
    const source = (state.invoices || []).find(i => i.id === rec.sourceId);
    if (!source) continue;
    const amount = total(source);
    if (amount <= 0) continue;
    let d = rec.nextDate, guard = 0;
    while (d && d <= endStr && guard++ < 60) {
      const idx = weekOf(d);
      if (idx >= 0) buckets[idx].inflows += amount;
      d = addMonth(d, rec.anchor);
    }
  }

  // Expenses: run-rate from the last 90 days, spread over the horizon
  const recentExpenses = (state.expenses || []).filter(e => e.date >= addDays(todayStr, -90) && e.date <= todayStr);
  const weeklyRunRate = Math.round(recentExpenses.reduce((a, e) => a + (e.amount || 0), 0) / RUN_RATE_WEEKS);
  for (const b of buckets) b.outflows += weeklyRunRate;

  // Scenario: delayed / extra expense
  if (extraExpenseAmount) buckets[extraExpenseWeek - 1].outflows += extraExpenseAmount;
  // Scenario: new job income
  if (newJobAmount) buckets[newJobWeek - 1].inflows += newJobAmount;

  let running = 0;
  for (const b of buckets) { b.net = b.inflows - b.outflows; running += b.net; b.balance = running; }

  const minBalance = buckets.length ? buckets.reduce((m, b) => Math.min(m, b.balance), Infinity) : 0;
  let runway = null;
  for (let i = 0; i < buckets.length; i++) if (buckets[i].balance < 0) { runway = i; break; }

  return {
    weeks: buckets,
    totalIn: buckets.reduce((a,b) => a + b.inflows, 0),
    totalOut: buckets.reduce((a,b) => a + b.outflows, 0),
    endingBalance: running,
    minBalance,
    safeToSpend: Math.max(0, Math.round(minBalance * 0.8)),
    runway,
    runRate: weeklyRunRate
  };
}

// Ranked, deterministic actions derived from the same data as the forecast.
export function cashFlowActions(state, forecast) {
  const todayStr = today();
  const actions = [];
  const issued = (state.invoices || []).filter(i => i.state === 'issued' && balance(i) > 0);
  const overdue = issued.filter(i => i.due < todayStr);
  const overdueTotal = overdue.reduce((a, i) => a + balance(i), 0);
  if (overdueTotal > 0) actions.push({ rank: 1, label: `Chase ${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}`, amount: overdueTotal, action: 'overdue' });
  const dueSoon = issued.filter(i => i.due >= todayStr && i.due <= addDays(todayStr, 7));
  const dueSoonTotal = dueSoon.reduce((a, i) => a + balance(i), 0);
  if (dueSoonTotal > 0) actions.push({ rank: 2, label: `Send reminders for ${dueSoon.length} invoice${dueSoon.length > 1 ? 's' : ''} due this week`, amount: dueSoonTotal, action: 'due' });
  const recDue = (state.recurring || []).filter(r => r.active && r.nextDate && r.nextDate <= addDays(todayStr, 7));
  if (recDue.length) actions.push({ rank: 3, label: `Generate ${recDue.length} scheduled invoice${recDue.length > 1 ? 's' : ''}`, amount: 0, action: 'recurring' });
  const minBalance = forecast?.minBalance ?? 0;
  if (minBalance < 0) actions.push({ rank: 0, label: 'Projected shortfall — hold non-essential spending', amount: -minBalance, action: 'shortfall' });
  return actions.sort((a, b) => a.rank - b.rank);
}

// Simple local command parser for AI co-pilot (no external dependency)
export function parseCommand(text, state) {
  if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw Error('Describe the work in 2,000 characters or fewer.');
  const raw = text.trim();
  const result = { type: /\bquote\b/i.test(raw) ? 'quote' : 'invoice', client: '', lines: [], dueDays: 14, notes: '' };
  // Prefer the explicit document → client → work description pattern.
  const structured = raw.match(/\b(?:invoice|quote)\s+(?:(?:for|to)\s+)?(.+?)\s+for\s+(.+?)(?=\s+R\s*\d|\s+due\b|$)/i);
  if (structured) result.client = structured[1].trim().replace(/[.,;]+$/, '');
  else {
    const clientMatch = raw.match(/\b(?:for|to)\s+(.+?)(?=\s+at\b|\s+due\b|\s+R\s*\d|$)/i);
    if (clientMatch) result.client = clientMatch[1].trim().replace(/[.,;]+$/, '');
  }
  const amountMatch = raw.match(/\bR\s*(\d[\d,]*(?:\.\d{1,2})?)/i) || raw.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s*(?:ZAR|rand(?:s)?)\b/i);
  if (amountMatch) {
    const amount = Number(amountMatch[1].replaceAll(',', ''));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) throw Error('Enter a valid positive amount in rand.');
    const afterClient = structured ? '' : raw.slice((raw.match(/\b(?:for|to)\s+/i)?.index || 0));
    const descriptionMatch = structured ? [null, structured[2]] : afterClient.match(/\bfor\s+(.+?)(?=\s+R\s*\d|\s+due\b|$)/i);
    const description = descriptionMatch?.[1]?.trim().replace(/[.,;]+$/, '') || 'Services';
    result.lines.push({ description, qty: 100, price: Math.round(amount * 100) });
  }
  const dueMatch = raw.match(/\bdue(?:\s+in)?\s+(\d+)\s*days?\b/i);
  if (dueMatch) result.dueDays = Math.min(3650, Math.max(1, Number(dueMatch[1])));
  return result;
}

// Client payment behaviour
export function clientScore(state, customerId) {
  const invoices = (state.invoices || []).filter(i => i.customer?.id === customerId && i.state === 'issued');
  if (!invoices.length) return { avgDays: null, reliability: 'new', count: 0 };
  let totalDays = 0, paid = 0, followUpsPaid = 0;
  for (const inv of invoices) {
    // Reversed entries are audit history, not real receipts; use the earliest active receipt.
    const p = (inv.payments || []).filter(p => p.amount > 0 && !p.reversed).sort((a,b) => a.date.localeCompare(b.date))[0];
    if (p && inv.date && dateOK(p.date) && dateOK(inv.date)) {
      const days = Math.round((Date.parse(p.date + 'T12:00:00Z') - Date.parse(inv.date + 'T12:00:00Z')) / 86400000);
      totalDays += Math.max(0, days);
      paid++;
      if((inv.followUps||[]).some(f=>f.outcome==='paid'))followUpsPaid++;
    }
  }
  const avg = paid ? Math.round(totalDays / paid) : null;
  let reliability = 'new';
  if (paid >= 2) reliability = avg <= 14 ? 'excellent' : avg <= 30 ? 'good' : 'slow';
  else if (followUpsPaid >= 1) reliability = 'good';
  return { avgDays: avg, reliability, count: invoices.length, followUpsPaid };
}

// Full per-customer picture: payment behaviour plus a complete activity timeline.
export function clientIntelligence(state, customerId) {
  const customer = (state.customers || []).find(c => c.id === customerId) || null;
  const invoices = (state.invoices || []).filter(i => i.customerId === customerId && i.state === 'issued');
  const score = clientScore(state, customerId);
  const totalBilled = invoices.reduce((a, i) => a + total(i), 0);
  const totalPaid = invoices.reduce((a, i) => a + paid(i), 0);
  const totalCredited = invoices.reduce((a, i) => a + credited(i), 0);
  const outstanding = invoices.reduce((a, i) => a + balance(i), 0);
  const events = [];
  for (const i of invoices) {
    events.push({ date: i.date, kind: 'invoice', ref: i.number, amount: total(i), balance: balance(i), detail: 'Invoice issued' });
    for (const p of (i.payments || [])) {
      events.push({ date: p.date, kind: 'payment', ref: i.number, amount: p.amount, detail: p.reference || 'Payment received' });
      if (p.reversed) events.push({ date: (p.reversedAt || p.date).slice(0, 10), kind: 'reversal', ref: i.number, amount: -p.amount, detail: p.reversalReason || 'Payment reversed' });
    }
    for (const c of (i.credits || [])) events.push({ date: c.date, kind: 'credit', ref: c.number, amount: -c.amount, detail: c.reason || 'Credit note' });
    for (const f of (i.followUps || [])) events.push({ date: f.date, kind: 'followup', ref: i.number, amount: 0, detail: f.outcome==='paid'?(f.paidAt?'Follow-up resolved · paid':'Follow-up honoured'):'Follow-up sent' });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return { customer, score, totalBilled, totalPaid, totalCredited, outstanding, count: invoices.length, events };
}

// Tone adapts to the customer's payment history. Never sends anything: the
// caller always shows the draft for the user to review and share manually.
export function smartFollowUp(state, customerId) {
  const c = (state.customers || []).find(c => c.id === customerId);
  if (!c) throw Error('Customer not found.');
  const open = (state.invoices || []).filter(i => i.customerId === customerId && i.state === 'issued' && balance(i) > 0);
  if (!open.length) throw Error('This customer has no unpaid invoices to follow up on.');
  const score = clientScore(state, customerId);
  const overdue = open.filter(i => i.due < today());
  const tone = score.reliability === 'slow' ? 'firm' : 'friendly';
  const target = overdue.slice().sort((a, b) => a.due.localeCompare(b.due))[0] || open.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
  const totalOpen = open.reduce((a, i) => a + balance(i), 0);
  const message = reminderText(target, tone);
  return {
    tone, reliability: score.reliability, avgDays: score.avgDays, count: score.count,
    message, invoiceId: target.id, number: target.number, balance: balance(target),
    overdueCount: overdue.length, openCount: open.length, totalOpen
  };
}

// SARS VAT201 working summary. Output VAT from issued invoices in the period,
// input VAT from expenses that recorded a VAT amount. A working draft for
// manual eFiling — InvoiceFlow never submits to SARS and never sends this data
// anywhere. Period is the invoice/expense date, not the payment date.
export function vat201Report(state,start,end){
  let output=0,input=0,invoices=0,expenses=0;
  for(const i of (state.invoices||[])){
    if(i.state!=='issued'||i.date<start||i.date>end)continue;
    output+=breakdown(i).vat||0;invoices++;
  }
  for(const e of (state.expenses||[])){
    if(e.date<start||e.date>end)continue;
    input+=e.vatAmount||0;expenses++;
  }
  return {start,end,output,input,net:output-input,invoices,expenses};
}

// CIPC annual return reminder. The registration number encodes the
// incorporation year (e.g. 2023/123456/07); we estimate the next return as
// end of the current calendar year — confirm the exact anniversary date on
// the CIPC website.
export function cipcNextReturn(state,now=new Date()){
  const reg=state.business?.cipcRegistration;
  if(!reg)return null;
  const m=String(reg).match(/^(\d{4})/);
  if(!m)return null;
  const y=now.getFullYear();let next=new Date(y,11,31);if(next<now)next=new Date(y+1,11,31);
  const days=Math.round((next.getTime()-now.getTime())/86400000);
  return {registration:reg,due:next.toISOString().slice(0,10),days};
}
