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
 window.__ANDROID_APP__=true;
})();
