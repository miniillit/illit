const http=require('http'),fs=require('fs');
const SONGS=['Magnetic','Lucky Girl Syndrome','Cherish (My Love)','Tick-Tack','Do the Dance','Jellyous','It’s Me','You’re Under Arrest'];
const FILE=process.env.DATA_FILE||'votes.json',PORT=process.env.PORT||3000;
let db={counts:{},devices:{}};try{db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(_){}
const save=()=>fs.writeFile(FILE,JSON.stringify(db),()=>{});
let PAGE=null;try{PAGE=fs.readFileSync(__dirname+'/index.html')}catch(_){}
const clients=new Set();
const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const send=(res,code,obj)=>{res.writeHead(code,{...H,'Content-Type':'application/json'});res.end(JSON.stringify(obj))};
const push=()=>{const m=`data: ${JSON.stringify(db.counts)}\n\n`;clients.forEach(c=>c.write(m))};
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(req.method==='OPTIONS'){res.writeHead(204,H);return res.end()}
  if(u.pathname==='/stream'){
    res.writeHead(200,{...H,'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
    res.write(`data: ${JSON.stringify(db.counts)}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return}
  if(u.pathname==='/votes'){const id=u.searchParams.get('id');return send(res,200,{c:db.counts,m:db.devices[id]??null})}
  if(u.pathname==='/vote'&&req.method==='POST'){
    let b='';req.on('data',d=>{b+=d;if(b.length>1000)req.destroy()});
    req.on('end',()=>{try{const{id,i}=JSON.parse(b),s=SONGS[i];
      if(!s||typeof id!=='string'||!id||id.length>64)return send(res,400,{error:'bad'});
      if(!db.devices[id]){db.devices[id]=s;db.counts[s]=(db.counts[s]||0)+1;save();push()}
      send(res,200,{c:db.counts,m:db.devices[id]})}catch(_){send(res,400,{error:'bad'})}});return}
  if(req.method==='GET'&&(u.pathname==='/'||u.pathname==='/index.html')&&PAGE){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(PAGE)}
  send(res,200,{ok:true});
}).listen(PORT,()=>console.log('votos en puerto',PORT));
setInterval(()=>clients.forEach(c=>c.write(': ping\n\n')),25000);
