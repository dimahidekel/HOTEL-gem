import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const allowed = new Map([['/','index.html'],['/index.html','index.html'],['/app.mjs','app.mjs'],['/core.mjs','core.mjs'],['/style.css','style.css']]);
const server=http.createServer(async(req,res)=>{
  const file=allowed.get(new URL(req.url,'http://localhost').pathname);
  if(req.method!=='GET' || !file){res.writeHead(404);res.end();return;}
  try {const body=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}
  catch{res.writeHead(500);res.end('Unable to read site asset');}
});
server.listen(4178,'127.0.0.1',()=>console.log('HOTEL WORK handoff: http://127.0.0.1:4178'));
