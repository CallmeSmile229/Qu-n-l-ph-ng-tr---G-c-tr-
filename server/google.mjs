import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto'
import {getDrive,setDrive} from './store.mjs'

const {APP_URL,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,SESSION_SECRET,OWNER_EMAIL} = process.env
const consent = 'https://accounts.google.com/o/oauth2/v2/auth'
const tokenURL = 'https://oauth2.googleapis.com/token'
const scopeDrive = 'https://www.googleapis.com/auth/drive.file'
const googleDrive = 'https://www.googleapis.com/drive/v3/files'
const apiUpload = 'https://www.googleapis.com/upload/drive/v3/files'
export const ownerEmail = OWNER_EMAIL?.trim().toLowerCase()
export const origin = APP_URL?.replace(/\/+$/,'')
export const googleReady = Boolean(origin?.startsWith('https://') && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && SESSION_SECRET?.length>=32 && ownerEmail)
const key = () => createHash('sha256').update(SESSION_SECRET).digest()
// Google redirect URIs are registered without query parameters.
const redirectURI = () => origin+'/api/callback'
const timeout = () => AbortSignal.timeout(9500)
const request = async (url,options={}) => {
  const response=await fetch(url,{...options,signal:timeout()})
  if (!response.ok) throw new Error('Google không chấp nhận yêu cầu. Kiểm tra kết nối và quyền truy cập.')
  return response
}
export function seal(value) {
  const nonce=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',key(),nonce)
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()])
  return Buffer.concat([nonce,cipher.getAuthTag(),encrypted]).toString('base64url')
}
export function unseal(value) {
  try {
    if (!value || !googleReady) return null
    const bytes=Buffer.from(value,'base64url')
    const cipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12))
    cipher.setAuthTag(bytes.subarray(12,28))
    return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]))
  } catch {return null}
}
export const cookie = (name,value,age) => name+'='+value+'; Path=/; Max-Age='+age+'; HttpOnly; Secure; SameSite=Lax'
export function readCookie(req,name) {
  const prefix=name+'='
  return req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length)
}
export function beginOAuth(mode) {
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(32).toString('base64url')
  const scope = 'openid email profile'+(mode==='drive'?' '+scopeDrive:'')
  const params = new URLSearchParams({client_id:GOOGLE_CLIENT_ID,redirect_uri:redirectURI(),response_type:'code',scope,state,
    code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'})
  if (mode==='drive') {
    params.set('access_type','offline')
    params.set('prompt','consent')
    params.set('login_hint',ownerEmail)
  }
  return {url:consent+'?'+params,cookie:cookie('nt_oauth',seal({state,verifier,mode,exp:Date.now()+600000}),600)}
}
async function tokenExchange(params) {
  const response = await request(tokenURL,{method:'POST',body:new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,...params})})
  return response.json()
}
export async function exchange(code,verifier) {
  const tokens=await tokenExchange({grant_type:'authorization_code',code,code_verifier:verifier,redirect_uri:redirectURI()})
  const response=await request('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+tokens.access_token}})
  const user=await response.json()
  if (!user.email_verified || !user.email) throw new Error('Email Google chưa được xác thực.')
  return {tokens,user:{email:user.email.toLowerCase(),name:user.name || user.email,sub:user.sub}}
}
const folderName = 'Nhà Trọ Manager'
export async function connectDrive(tokens) {
  if (!tokens.scope?.split(' ').includes(scopeDrive)) throw new Error('Chưa cấp quyền lưu tệp trên Google Drive.')
  const existing = unseal(await getDrive())
  const refresh = tokens.refresh_token || existing?.refresh
  if (!refresh) throw new Error('Google chưa cấp quyền truy cập ngoại tuyến.')
  let folder = existing?.folder
  const headers={Authorization:'Bearer '+tokens.access_token,'Content-Type':'application/json'}
  if (folder) {
    const current=await fetch(googleDrive+'/'+encodeURIComponent(folder)+'?fields=id,trashed',{headers,signal:timeout()})
    if (current.status===404 || (current.ok && (await current.json()).trashed)) folder=null
    else if (!current.ok) throw new Error('Không thể kiểm tra thư mục Drive.')
  }
  if (!folder) {
    const response=await request(googleDrive+'?fields=id',{method:'POST',headers,body:JSON.stringify({mimeType:'application/vnd.google-apps.folder',name:folderName})})
    folder=(await response.json()).id
  }
  await setDrive(seal({refresh,folder,name:folderName}))
}
export async function driveInfo() { return unseal(await getDrive()) }
async function driveHeaders(config) {
  const {access_token}=await tokenExchange({grant_type:'refresh_token',refresh_token:config.refresh})
  return {Authorization:'Bearer '+access_token}
}
export async function uploadFile(config,{name,mime,bytes}) {
  const boundary='nt-'+randomBytes(18).toString('hex')
  const metadata={name,mimeType:mime,parents:[config.folder]}
  const body=Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: '+mime+'\r\n\r\n'),bytes,Buffer.from('\r\n--'+boundary+'--\r\n')])
  const response=await request(apiUpload+'?uploadType=multipart&fields=id',{method:'POST',headers:{...await driveHeaders(config),'Content-Type':'multipart/related; boundary='+boundary},body})
  return {id:(await response.json()).id,name,mime}
}
export async function fetchFile(config,file) {
  return request(googleDrive+'/'+encodeURIComponent(file.id)+'?alt=media',{headers:await driveHeaders(config)})
}
export async function trashFile(config,file) {
  await request(googleDrive+'/'+encodeURIComponent(file.id),{method:'PATCH',headers:{...await driveHeaders(config),'Content-Type':'application/json'},body:JSON.stringify({trashed:true})})
}
