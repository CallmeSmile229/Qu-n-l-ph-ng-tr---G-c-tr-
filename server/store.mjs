import {blank} from '../public/model.mjs'

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN
const prefix = process.env.STORE_PREFIX || 'ntm:v1'
export const storageReady = Boolean(url && token)
async function command(...args) {
  const response = await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(7000)})
  if (!response.ok) throw new Error('Không thể truy cập dữ liệu vận hành.')
  const {result,error} = await response.json()
  if (error) throw new Error('Không thể truy cập dữ liệu vận hành.')
  return result
}
export async function load() {
  const raw = await command('GET',prefix+':state')
  return {raw,state:raw?JSON.parse(raw):blank()}
}
const compare = "local current = redis.call('GET',KEYS[1]); if (current or '') ~= ARGV[1] then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1"
export async function update(change) {
  for (let attempt=0;attempt<5;attempt++) {
    const {raw,state} = await load()
    change(state)
    if (await command('EVAL',compare,1,prefix+':state',raw||'',JSON.stringify(state))) return state
  }
  throw Object.assign(new Error('Đang có nhiều cập nhật. Hãy thử lại.'),{status:409})
}
export const getDrive = () => command('GET',prefix+':drive')
export const setDrive = value => command('SET',prefix+':drive',value)
