import {readFile} from 'node:fs/promises';
const gates=JSON.parse(await readFile(new URL('./release-gates.json',import.meta.url))),listing=JSON.parse(await readFile(new URL('./play-store/listing-draft.json',import.meta.url)));
if(listing.title.length>30||listing.shortDescription.length>80||listing.fullDescription.length>4000)throw Error('Store listing exceeds Google Play text bounds.');
const pending=Object.entries(gates).filter(([k,v])=>v===false).map(([k])=>k);for(const key of ['supportEmail','privacyPolicyUrl','publisherIdentity'])if(!listing[key])pending.push(key);
console.log(JSON.stringify({app:gates.app,targetSdk:gates.targetSdk,submissionReady:pending.length===0,pending},null,2));if(process.argv.includes('--submission')&&pending.length)process.exitCode=1;
