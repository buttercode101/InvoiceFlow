/* Packaged Android only. No filesystem or native capability is exposed to web browsers. */
(()=>{
 if(!window.AppHost)return;
 let sequence=0;const pending=new Map();
 AppHost.onmessage=e=>{let response;try{response=JSON.parse(e.data)}catch{return}const p=pending.get(response.id);if(!p)return;clearTimeout(p.timeout);pending.delete(response.id);response.ok?p.resolve(response.data):p.reject(Error(response.error||'Native file transfer failed.'))};
 function call(op,body={}){return new Promise((resolve,reject)=>{const id=String(++sequence),timeout=setTimeout(()=>{pending.delete(id);reject(Error('The Android file transfer timed out.'))},30000);pending.set(id,{resolve,reject,timeout});AppHost.postMessage(JSON.stringify({id,op,...body}))})}
 async function exportUrl(url,name,mime){let token;try{const response=await fetch(url);if(!response.ok)throw Error('Could not read the exported file.');const blob=await response.blob();({token}=await call('exportBegin',{name:name||'export',mime:blob.type||mime||'application/octet-stream',size:blob.size}));let index=0;for(let offset=0;offset<blob.size;offset+=65536){const bytes=new Uint8Array(await blob.slice(offset,offset+65536).arrayBuffer());let binary='';for(let n=0;n<bytes.length;n+=4096)binary+=String.fromCharCode(...bytes.subarray(n,n+4096));await call('exportChunk',{token,sequence:index++,bytes:btoa(binary)})}await call('exportFinish',{token})}catch(e){if(token)call('exportAbort').catch(()=>{});alert(e.message)}}
 window.AndroidFiles={exportUrl};window.print=()=>call('print').catch(e=>alert(e.message));const handled=new WeakSet();
 function handle(anchor){if(!anchor||!anchor.hasAttribute('download')||! /^(blob:|data:)/.test(anchor.href))return false;if(!handled.has(anchor)){handled.add(anchor);exportUrl(anchor.href,anchor.download,'application/octet-stream').finally(()=>handled.delete(anchor))}return true}
 const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!handle(this))return original.call(this)};
 const dispatch=HTMLAnchorElement.prototype.dispatchEvent;HTMLAnchorElement.prototype.dispatchEvent=function(event){if(event.type==='click'&&handle(this))return false;return dispatch.call(this,event)};
 document.addEventListener('click',e=>{const anchor=e.target.closest?.('a[download]');if(handle(anchor)){e.preventDefault();e.stopImmediatePropagation()}},true);
 const nativeCall=call;
window.AndroidNative={isNative:true,
 speak:(text,rate)=>nativeCall('speak',{text:String(text||'').slice(0,3000),rate:Number(rate)||1}).catch(()=>{}),
 stop:()=>nativeCall('stopSpeech',{}).catch(()=>{})};
window.__ANDROID_APP__=true;
 // Keep Android controls within the product interface; never add a second navigation bar.
 let scheduled=false,lastChrome='';
 const dots='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>';
 function updateChrome(){
  scheduled=false;
  const root=document.documentElement;
  let dark=root.dataset.theme==='dark';
  const rgb=getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g);
  const background=rgb&&rgb.length>=3&&Number(rgb[3]??1)>0?'#'+rgb.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join(''):(dark?'#141d18':'#f7f6f2');
  const parts=[1,3,5].map(i=>parseInt(background.slice(i,i+2),16));dark=(parts[0]*0.2126+parts[1]*0.7152+parts[2]*0.0722)<128;
  const theme=JSON.stringify({dark,background});
  if(lastChrome!==theme){lastChrome=theme;call('chrome',{dark,background}).catch(()=>{lastChrome=''})}
  const header=document.querySelector('.top-actions,.top-right,.header-actions,.app-header .topbar');
  if(header&&!header.querySelector('[data-android-menu]')){
   const button=document.createElement('button');button.type='button';button.dataset.androidMenu='';button.className='icon-button icon-btn theme-toggle';button.setAttribute('aria-label','App controls');button.setAttribute('aria-haspopup','dialog');button.title='App controls';button.innerHTML=dots;
   Object.assign(button.style,{width:'44px',height:'44px',minWidth:'44px',minHeight:'44px',padding:'10px',display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'0 0 44px',color:'inherit',borderRadius:'12px',background:'transparent',border:'1px solid currentColor',opacity:'0.8',boxSizing:'border-box'});
   button.onclick=()=>call('appMenu').catch(e=>alert(e.message));header.append(button);
  }
  const panel=document.querySelector('.record-options.import-only');
  if(panel&&!panel.querySelector('[data-android-capture]')){
   const original=panel.querySelector('[data-action="record"]');
   if(original){
    const row=document.createElement('div');row.dataset.androidCapture='';row.className='actions';Object.assign(row.style,{display:'flex',flexWrap:'wrap',gap:'12px',marginBlock:'20px'});
    for(const [label,op,primary]of [['Record screen','recordScreen',true],['Recordings','openRecordings',false]]){
     const button=document.createElement('button');button.type='button';button.className=primary?'btn primary':'btn';button.textContent=label;button.dataset.androidAction=op;Object.assign(button.style,{flex:'1 1 160px',minHeight:'48px',whiteSpace:'normal',overflowWrap:'anywhere'});button.onclick=()=>call(op).catch(e=>alert(e.message));row.append(button);
    }
    original.replaceWith(row);
    const heading=panel.querySelector('h2');if(heading)heading.textContent='Record your screen.';
    const description=panel.querySelector('h2 + p');if(description)description.textContent='Capture your screen with optional microphone audio. Review before you share.';
    for(const p of panel.querySelectorAll('p.small'))if(p.textContent.includes('Use Record screen below'))p.textContent='Recordings stay on this device until you choose to publish. Open Recordings to review a saved capture.';
   }
  }
 }
 function scheduleChrome(){if(!scheduled){scheduled=true;requestAnimationFrame(updateChrome)}}
 document.addEventListener('transitionend',scheduleChrome,true);
 function startChrome(){new MutationObserver(scheduleChrome).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-theme','class','style']});scheduleChrome()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startChrome,{once:true});else startChrome();
})();
