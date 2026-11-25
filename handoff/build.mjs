import {mkdir, copyFile} from 'node:fs/promises';
const root = new URL('./', import.meta.url), out = new URL('./dist/', root);
await mkdir(out, {recursive:true});
for (const file of ['index.html','style.css','core.mjs','app.mjs']) await copyFile(new URL(file,root),new URL(file,out));
console.log('Static output: handoff/dist (no deployment performed)');
