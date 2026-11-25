import {newDeal, validateFile, digest, prepareRun, requestBundle, transferIndex, transferPart, MAX_TOTAL_BYTES, attachReturnedPdf, nextRevision, MAX_BYTES, MAX_FILES} from './core.mjs';
const $ = id => document.getElementById(id);
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('hotel-work-handoff', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('deals', {keyPath:'id'});
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
}).catch(error => { $('message').textContent = `Browser storage is unavailable: ${error.message}`; throw error; });
const records = async (mode, operation) => new Promise((resolve, reject) => {
  const tx = db.transaction('deals', mode), request = operation(tx.objectStore('deals'));
  tx.oncomplete = () => resolve(request.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
});
let deals = await records('readonly', store => store.getAll()), active = deals[0], selectedRun, previewUrl;
const drafts = new Map();
$('text').oninput = () => { if (active) drafts.set(active.id, $('text').value); };
function message(text) { $('message').textContent = text; }
async function save() {
  // Read/check/write in one serialized transaction; stale tabs cannot overwrite a deal.
  const pending = structuredClone(active);
  const revision = await new Promise((resolve,reject) => {
    const tx=db.transaction('deals','readwrite'), store=tx.objectStore('deals');
    let error, revision; const read=store.get(pending.id);
    read.onsuccess=()=>{
      try { revision=nextRevision(read.result,pending); store.put({...pending,revision}); }
      catch(err) { error=err; tx.abort(); }
    };
    tx.oncomplete=()=>resolve(revision); tx.onerror=()=>reject(error??tx.error); tx.onabort=()=>reject(error??tx.error);
  });
  active.revision=revision;
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function displayRun(run) {
  $('packages').replaceChildren();
  selectedRun = run; $('handoff').hidden = !run;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined; $('preview').removeAttribute('src'); $('download').removeAttribute('href'); $('result').hidden = true;
  if (!run) return;
  $('prompt').value = run.prompt;
  $('progress').textContent = run.pdf ? 'PDF attached · QA not verified' : 'Request prepared · Awaiting your submission in ChatGPT';
  if (run.pdf) {
    previewUrl = URL.createObjectURL(new Blob([run.pdf], {type:'application/pdf'})); $('preview').src = previewUrl;
    $('download').href = previewUrl; $('download').download = `${run.type}-${run.id}.pdf`; $('result').hidden = false;
  }
}
function render() {
  $('deals').replaceChildren(...deals.map(d => new Option(d.name, d.id)));
  $('workspace').hidden = !active; if (!active) return;
  $('deals').value = active.id; $('title').textContent = active.name; $('text').value = drafts.get(active.id) ?? active.text;
  $('sources').replaceChildren(...active.files.map(file => {
    const li = document.createElement('li'); li.textContent = `${file.name} · ${(file.size/1024).toFixed(1)} KiB · Preserved, not extracted`;
    return li;
  }));
  $('history').replaceChildren(...active.runs.slice().reverse().map(run => {
    const li = document.createElement('li'), button = document.createElement('button');
    button.className='secondary'; button.textContent=`${run.type} · ${new Date(run.createdAt).toLocaleString()}`;
    button.onclick=()=>displayRun(run); li.append(button); return li;
  }));
  displayRun(active.runs.at(-1));
}
let busy = false;
async function act(fn) {
  if (busy) return;
  busy = true;
  const controls = [...document.querySelectorAll('button,input,select,textarea')]; controls.forEach(c=>c.disabled=true);
  const before = structuredClone(deals), activeId = active?.id, selectedRunId = selectedRun?.id;
  try { await fn(); } catch(error) {
    deals=before;
    if (error.message.includes('another tab')) deals=await records('readonly',store=>store.getAll());
    active=deals.find(d=>d.id===activeId); render();
    if(selectedRunId) displayRun(active?.runs.find(r=>r.id===selectedRunId));
    message(error.message);
  } finally { busy=false; controls.forEach(c=>c.disabled=false); }
}
$('new-deal').onsubmit = event => {event.preventDefault(); act(async()=>{
  active = newDeal($('name').value, $('new-folder').value); await save(); deals.push(active);
  $('new-deal').reset(); render(); message('Deal saved in this browser.');
});};
$('deals').onchange = ()=>act(async()=>{
  const id=$('deals').value; deals=await records('readonly',store=>store.getAll()); active=deals.find(d=>d.id===id); render(); message('');
});
$('save-text').onclick=()=>act(async()=>{active.text=$('text').value; await save(); drafts.delete(active.id); message('Original text saved.');});
$('files').onchange=()=>act(async()=>{
  const pending=[...$('files').files]; pending.forEach(validateFile);
  if (active.files.length+pending.length>MAX_FILES || active.files.reduce((sum,f)=>sum+f.size,0)+pending.reduce((sum,f)=>sum+f.size,0)>MAX_TOTAL_BYTES) throw new Error('Limit: 500 files and 2 GiB total per deal. No files were transferred; reduce this batch before retrying.');
  for (const file of pending) {
    const sha256=await digest(await file.arrayBuffer());
    if (active.files.some(f=>f.sha256===sha256 && f.name===file.name)) continue;
    active.files.push({id:crypto.randomUUID(),name:file.name,size:file.size,sha256,blob:file});
  }
  await save(); $('files').value=''; render(); message('Files preserved locally. No extraction or Drive upload has run.');
});
for (const [id,type] of [['es','ES'],['ic','FULL_IC']]) $(id).onclick=()=>act(async()=>{
  active.text=$('text').value; const run=await prepareRun(active,type); active.runs.push(run); await save(); drafts.delete(active.id); render();
  message('Request prepared. Download the bundle and send it in your HOTEL WORK chat.');
});
$('bundle').onclick=()=>act(async()=>{
  const index=await transferIndex(selectedRun), sourceFiles=active.files.slice(), list=$('packages'); list.replaceChildren();
  for(const part of index.parts) {
    const button=document.createElement('button'); button.textContent=`Download package ${part.number} of ${index.parts.length}`;
    button.onclick=()=>act(async()=>{download(await transferPart(index,part.number,sourceFiles),part.filename); message(`Package ${part.number} downloaded. Keep all ${index.parts.length} packages together.`);}); list.append(button);
  }
  message('Download every listed package. Each includes the complete transfer inventory.');
});
$('copy').onclick=()=>act(async()=>{await navigator.clipboard.writeText(selectedRun.prompt); message('Request copied. Attach the bundle before sending it in ChatGPT.');});
$('returned').onchange=()=>act(async()=>{
  const file=$('returned').files[0]; if (!file) return;
  if (new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-') throw new Error('The selected file does not have a PDF header.');
  const updated=attachReturnedPdf(selectedRun,file); active.runs[active.runs.findIndex(r=>r.id===updated.id)]=updated;
  await save(); render(); displayRun(updated); $('returned').value=''; message('PDF attached for preview. Its QA and source binding have not been verified.');
});
render();
