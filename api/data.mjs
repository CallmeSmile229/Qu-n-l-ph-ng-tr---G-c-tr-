import {blank,viewState,applyChange,existing,canEdit} from '../public/model.mjs'
import {load,update,storageReady} from '../server/store.mjs'
import {origin,ownerEmail,googleReady,seal,unseal,cookie,readCookie,beginOAuth,exchange,connectDrive,driveInfo,uploadFile,fetchFile,trashFile} from '../server/google.mjs'

const ready = storageReady && googleReady
const {OCR_URL,OCR_TOKEN} = process.env
const ocr = Boolean(OCR_URL?.startsWith('https://') && OCR_TOKEN)
function reject(message,status) { throw Object.assign(new Error(message),{status}) }
const session = req => unseal(readCookie(req,'nt_session'))
const assignedActor = (profile,state) => {
  if (!profile?.email) return null
  if (profile.email===ownerEmail) return {...profile,role:'owner',propertyIds:[]}
  const member=state.members.find(row=>row.email===profile.email && row.access!=='Đã thu hồi')
  return member ? {...profile,name:member.name,role:member.role,propertyIds:member.propertyIds}:null
}
const actorOf = (req,state) => {
  const profile=session(req)
  return profile?.exp>Date.now()?assignedActor(profile.user,state):null
}
const send = (res,payload,code=200) => {
  res.statusCode=code
  res.setHeader('Content-Type','application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
const redirect = (res,to,cookies=[]) => {
  res.statusCode=302
  res.setHeader('Location',to)
  if (cookies.length) res.setHeader('Set-Cookie',cookies)
  res.end()
}
async function read(req) {
  if (req.body && typeof req.body==='object' && !Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body==='string' || Buffer.isBuffer(req.body)) return JSON.parse(req.body)
  let size=0
  const chunks=[]
  for await (const chunk of req) {
    size+=chunk.length
    if (size>4_100_000) reject('Tệp quá lớn.',413)
    chunks.push(chunk)
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'))} catch {reject('Dữ liệu không hợp lệ.',400)}
}
const images = ['image/jpeg','image/png','image/webp']
const mimeByExtension = {
  pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
  doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
function fileInput(upload,onlyImages=false) {
  const {name,base64} = upload||{}
  if (typeof name!=='string' || !name.length || name.length>180 || /[\x00-\x1f\x7f/\\]/.test(name)) reject('Tên tệp không hợp lệ.',400)
  const mime=mimeByExtension[name.split('.').pop().toLowerCase()]
  if (!mime || (onlyImages && !images.includes(mime))) reject('Định dạng tệp chưa được hỗ trợ.',415)
  if (typeof base64!=='string' || base64.length>4_000_000 || /[^A-Za-z0-9+/=]/.test(base64)) reject('Tệp không hợp lệ hoặc vượt 3 MB.',400)
  const bytes=Buffer.from(base64,'base64')
  if (!bytes.length || bytes.length>3_000_000 || bytes.toString('base64')!==base64) reject('Tệp không hợp lệ hoặc vượt 3 MB.',400)
  return {name,mime,bytes}
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store')
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','no-referrer')
  const url=new URL(req.url,'http://localhost')
  const action=url.pathname==='/api/callback' ? 'callback' : url.searchParams.get('action')
  try {
    if (action==='session' && req.method==='GET') {
      const profile=ready?session(req):null
      if (!profile || !(profile.exp>Date.now())) return send(res,{ready,actor:null})
      const {state}=await load()
      const actor=actorOf(req,state)
      const drive=actor && await driveInfo()
      return send(res,{ready,actor,drive:Boolean(drive),driveLabel:actor?.role==='owner'?drive?.name:undefined,ocr})
    }
    if (!ready) reject('Hệ thống chưa được cấu hình cho dữ liệu thực.',503)
    if (action==='login' && req.method==='GET') {
      const config=beginOAuth('login')
      return redirect(res,config.url,[config.cookie])
    }
    if (action==='drive-login' && req.method==='GET') {
      if (actorOf(req,blank())?.role!=='owner') reject('Chỉ chủ hệ thống có thể kết nối Google Drive.',403)
      const config=beginOAuth('drive')
      return redirect(res,config.url,[config.cookie])
    }
    if (action==='callback' && req.method==='GET') {
      const tx=unseal(readCookie(req,'nt_oauth'))
      const clear=cookie('nt_oauth','',0)
      if (!tx || !(tx.exp>Date.now()) || tx.state!==url.searchParams.get('state')) return redirect(res,'/?notice=failed',[clear])
      const code=url.searchParams.get('code')
      if (!code) return redirect(res,'/?notice=denied',[clear])
      try {
        const {tokens,user}=await exchange(code,tx.verifier)
        const {state}=await load()
        const actor=assignedActor(user,state)
        if (!actor || (tx.mode==='drive' && (actor.role!=='owner' || actorOf(req,blank())?.sub!==user.sub))) return redirect(res,'/?notice=denied',[clear])
        if (tx.mode==='drive') await connectDrive(tokens)
        const age=28800
        return redirect(res,tx.mode==='drive'?'/?notice=drive':'/',[clear,cookie('nt_session',seal({user,exp:Date.now()+age*1000}),age)])
      } catch {return redirect(res,'/?notice=failed',[clear])}
    }
    if (req.method==='POST' && req.headers.origin!==origin) reject('Nguồn yêu cầu không hợp lệ.',403)
    if (action==='logout' && req.method==='POST') {
      res.setHeader('Set-Cookie',cookie('nt_session','',0))
      return send(res,{ok:true})
    }
    const {state}=await load()
    const actor=actorOf(req,state)
    if (!actor) reject('Vui lòng đăng nhập bằng tài khoản được cấp quyền.',401)
    if (action==='state' && req.method==='GET') return send(res,{data:viewState(state,actor)})
    if (action==='save' && req.method==='POST') {
      const input=await read(req)
      const previous=existing(state,input.kind,input.id)?.attachment
      applyChange(structuredClone(state),actor,input)
      let attachment,drive
      if (input.upload) {
        if (!['documents','meters'].includes(input.kind)) reject('Mục này không nhận tệp đính kèm.',400)
        const file=fileInput(input.upload,input.kind==='meters')
        drive=await driveInfo()
        if (!drive) reject('Chủ hệ thống cần kết nối Google Drive trước khi tải tệp.',409)
        attachment=await uploadFile(drive,file)
      }
      let revised
      try {
        revised=await update(current=>{
          const currentActor=assignedActor(actor,current)
          if (!currentActor) reject('Quyền truy cập đã thay đổi.',403)
          applyChange(current,currentActor,input,{attachment})
        })
      } catch(error) {
        // Check whether a timed-out update actually committed before touching its file.
        if (attachment) {
          try {
            const snapshot=await load()
            const saved=existing(snapshot.state,input.kind,input.id)
            if (saved?.attachment?.id!==attachment.id) await trashFile(drive,attachment)
            else revised=snapshot.state
          } catch {}
        }
        if (!revised) throw error
      }
      if (previous && attachment && previous.id!==attachment.id) {
        try {await trashFile(drive,previous)} catch {}
      }
      const currentActor=assignedActor(actor,revised)
      return send(res,{data:viewState(revised,currentActor)})
    }
    if (action==='file' && req.method==='GET') {
      const kind=url.searchParams.get('kind')
      if (!['documents','meters'].includes(kind)) reject('Không tìm thấy tệp.',404)
      const row=existing(viewState(state,actor),kind,url.searchParams.get('id'))
      if (!row?.attachment) reject('Không tìm thấy tệp.',404)
      const drive=await driveInfo()
      if (!drive) reject('Google Drive chưa được kết nối.',409)
      const response=await fetchFile(drive,row.attachment)
      res.setHeader('Content-Type','application/octet-stream')
      res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(row.attachment.name).replace(/['()]/g,char=>'%'+char.charCodeAt(0).toString(16)))
      return res.end(Buffer.from(await response.arrayBuffer()))
    }
    if (action==='ocr' && req.method==='POST') {
      if (!canEdit(actor,'meters')) reject('Bạn không có quyền ghi chỉ số.',403)
      if (!ocr) reject('Dịch vụ nhận dạng chưa được cấu hình.',503)
      const {upload}=await read(req)
      const file=fileInput(upload,true)
      const response=await fetch(OCR_URL,{method:'POST',headers:{Authorization:'Bearer '+OCR_TOKEN,'Content-Type':file.mime},body:file.bytes,signal:AbortSignal.timeout(24000)})
      if (!response.ok) reject(response.status===422?'Không đọc được chỉ số. Hãy chụp lại hoặc nhập số trực tiếp.':'Dịch vụ nhận dạng đang bận. Hãy thử lại hoặc nhập số trực tiếp.',422)
      const {reading}=await response.json()
      if (!/^\d{1,9}(\.\d{1,3})?$/.test(String(reading))) reject('Không đọc được chỉ số. Hãy kiểm tra ảnh hoặc nhập số trực tiếp.',422)
      return send(res,{reading})
    }
    reject('Không tìm thấy yêu cầu.',404)
  } catch (error) {
    send(res,{error:error.status ? error.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.'},error.status||500)
  }
}
