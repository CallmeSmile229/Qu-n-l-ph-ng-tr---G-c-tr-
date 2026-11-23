import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {extname} from 'node:path'
import handler from '../api/data.mjs'

const assets=new Set(['/index.html','/app.mjs','/model.mjs','/demo.mjs','/mark.svg','/style.css'])
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.css':'text/css; charset=utf-8'}
const port=Number(process.env.PORT||3000)
createServer(async (req,res)=>{
  const {pathname}=new URL(req.url,'http://localhost')
  if (pathname==='/api/data' || pathname==='/api/callback') return handler(req,res)
  const asset=pathname==='/'?'/index.html':pathname
  if (!assets.has(asset)) {res.writeHead(404).end();return}
  try {
    const bytes=await readFile(new URL('../public'+asset,import.meta.url))
    res.writeHead(200,{'Content-Type':mime[extname(asset)]}).end(bytes)
  } catch {res.writeHead(404).end()}
}).listen(port,()=>process.stdout.write('Nhà Trọ Manager · http://localhost:'+port+'\n'))
