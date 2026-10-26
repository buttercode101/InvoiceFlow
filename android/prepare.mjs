import {mkdir,cp,readFile,writeFile,readdir,rm} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.dirname(here),name=path.basename(repo);
process.chdir(repo);const out=path.join(here,'app/src/main/assets/web');await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
if(name==='ScreenNote'){execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});await cp('dist',out,{recursive:true})}
else if(name==='InvoiceFlow')await cp('dist',out,{recursive:true});
else if(name==='ContractCheq'){
 await cp('public',out,{recursive:true});await mkdir(path.join(out,'vendor'),{recursive:true});const assets=(await import(path.join(repo,'server/vendorAssets.js'))).default;for(const [name,source]of Object.entries(assets))await cp(source,path.join(out,'vendor',name));
 const file=path.join(out,'index.html');let html=await readFile(file,'utf8');html=html.replace('<script src="https://js.paystack.co/v1/inline.js" async></script>','');await writeFile(file,html);
}else if(name==='Greenlight-k53'){
 for(const file of ['index.html','privacy.html','corrections.html','study-guide.html','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest','assets'])await cp(file,path.join(out,file),{recursive:true});
}else throw Error('Unknown Android product root.');
await cp(path.join(here,'host-support.js'),path.join(out,'android-host.js'));
for(const file of await readdir(out)){if(!file.endsWith('.html'))continue;const full=path.join(out,file);let html=await readFile(full,'utf8');html=html.replace(/<head[^>]*>/i,match=>match+'<script src="/android-host.js"></script>');if(name==='Greenlight-k53')html=html.replace('<script src="/android-host.js"></script>','<script src="/android-host.js"></script><script>if(window.AppHost)window.__offlineReady=true;</script>');await writeFile(full,html)}
async function walk(root,prefix=''){let result=[];for(const entry of await readdir(root,{withFileTypes:true})){const rel=prefix+entry.name,full=path.join(root,entry.name);if(entry.isDirectory())result.push(...await walk(full,rel+'/'));else{const b=await readFile(full);result.push({path:rel,size:b.length,sha256:createHash('sha256').update(b).digest('hex')})}}return result}
const files=await walk(out);if(!files.some(f=>f.path==='index.html'))throw Error('Missing entry point');
await writeFile(path.join(here,'asset-manifest.json'),JSON.stringify({product:name,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files},null,2)+'\n');console.log('Packaged '+files.length+' local assets for '+name);
