const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let p=new URL(req.url,'http://x').pathname;
  if(p==='/')p='/quiz.html';
  const f=path.join(__dirname,p);
  if(!fs.existsSync(f)){res.writeHead(404).end('not found: '+p);return;}
  res.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
}).listen(8090,()=>console.log('funnel preview on http://localhost:8090'));
