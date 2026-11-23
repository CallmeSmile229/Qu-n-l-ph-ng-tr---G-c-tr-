import {blank, fields, titles, roleNames, roomStates, issueStates, canEdit, existing, viewState, applyChange, nowDay, nowMonth} from './model.mjs'
import {demoActor, example} from './demo.mjs'

const root = document.querySelector('#app')
const editor = document.querySelector('#editor')
const toast = document.querySelector('#toast')
const storeKey = 'nha-tro-manager-demo-v1'
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fmt = new Intl.NumberFormat('vi-VN')
const money = value => value === '' || value == null ? '—' : fmt.format(value)+' ₫'
const reading = (value,unit) => value === '' || value == null ? '—' : fmt.format(value)+' '+unit
const date = value => value ? value.slice(0,10).split('-').reverse().join('/') : '—'
const monthText = month => month ? month.split('-').reverse().join('/') : ''
const initials = name => name?.trim().split(/\s+/).slice(-2).map(word=>word[0]).join('').toUpperCase() || 'NT'
const daysLeft = end => end ? Math.round((Date.parse(end)-Date.parse(nowDay()))/86400000) : Infinity
const list = (rows, map) => rows.map(map).join('')
const icons = {
  home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  dash:'<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  tower:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-4 6v-3h2v3"/>',
  file:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"/><path d="M13 3v7h7M8 14h8m-8 3h5"/>',
  wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-6 6h2"/>',
  tool:'<path d="M14.8 6.6a5 5 0 0 0-6.4 6.3l-5 5a1.9 1.9 0 0 0 2.7 2.7l5-5a5 5 0 0 0 6.3-6.4l-3.2 3.2-2.6-2.6z"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m2-15a3 3 0 0 1 0 6m1 3a4 4 0 0 1 3 4v2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', chevron:'<path d="m9 18 6-6-6-6"/>', down:'<path d="m6 9 6 6 6-6"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  door:'<path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18m-7-9h1"/>',
  chart:'<path d="M4 19h16M7 15v-4m5 4V7m5 8V4"/>',
  alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>',
  camera:'<path d="M8 6l2-2h4l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="3"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', left:'<path d="M19 12H5m6-6-6 6 6 6"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>',
  drive:'<path d="m8 4-6 11 3 5h14l3-5-6-11zm0 0 8 16m0-16L7 20M2 15h20"/>',
  search:'<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  check:'<path d="m5 12 5 5L20 7"/>', edit:'<path d="m4 16 11-11 4 4-11 11H4zm9-9 4 4"/>',
  bolt:'<path d="m13 2-8 12h6l-1 8 9-12h-6z"/>',
}
const icon = (name, size=20) => '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.file)+'</svg>'
const navItems = {
  dashboard:['dash','Tổng quan'], properties:['tower','Dãy trọ'], contracts:['file','Hợp đồng'], finance:['wallet','Tài chính'],
  issues:['tool','Bảo trì'], documents:['folder','Hồ sơ'], meters:['bolt','Điện / nước'], members:['users','Phân quyền'],
}
const defaults = {finance:{direction:'Khoản chi',category:'Tiền nhà',status:'Đã thanh toán'},issues:{priority:'Thông thường',status:'Mới báo'},contracts:{status:'Có hiệu lực'},rooms:{status:'Đang trống'},tenants:{status:'Đang ở'},members:{role:'manager',access:'Đang cấp quyền'}}

let actor = null, data = blank(), demoData, demo = false, ready = false, drive = false, driveLabel = '', ocr = false
let page = 'dashboard', propertyId = '', roomId = '', period = nowMonth(), filter = '', query = '', formContext, menu = false, saving = false
const hash = new URLSearchParams(location.hash.slice(1))
const launchedFromFile = location.protocol === 'file:'

async function api(action, options={}) {
  const {method='GET',body,id,kind} = options
  const search = new URLSearchParams({action,...(id?{id}:{}),...(kind?{kind}:{})})
  const result = await fetch('./api/data?'+search,{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
  const payload = await result.json()
  if (!result.ok) throw new Error(payload.error || 'Không thể kết nối.')
  return payload
}
function demoRefresh() { data = viewState(demoData, actor) }
function readDemo() {
  try { return JSON.parse(localStorage.getItem(storeKey)) || example() }
  catch { return example() }
}
function enterDemo(role='owner') {
  demo = true
  demoData ??= readDemo()
  actor = demoActor(role)
  drive = false
  ocr = false
  demoRefresh()
  go('dashboard')
}
function note(message, error=false) {
  toast.textContent = message
  toast.className = 'shown'+(error?' error':'')
  clearTimeout(note.timer)
  note.timer = setTimeout(()=>toast.className='',3800)
}
function labelClass(label) {
  if (['Đang trống','Hoàn tất','Đã thanh toán','Có hiệu lực'].includes(label)) return 'green'
  if (['Khẩn cấp','Đã hết hạn'].includes(label)) return 'red'
  if (['Chờ thanh toán','Ưu tiên','Mới báo','Sắp hết hạn','Đang sửa'].includes(label)) return 'amber'
  return 'purple'
}
const badge = (label, tone=labelClass(label)) => '<span class="badge '+tone+'"><i></i>'+escape(label)+'</span>'
const tile = (name, tone='purple') => '<span class="tile '+tone+'">'+icon(name)+'</span>'
const act = (label, action, appearance='primary', symbol='plus') => '<button type="button" class="btn '+appearance+'" data-action="'+escape(action)+'">'+(symbol?icon(symbol,17):'')+escape(label)+'</button>'
const edit = (kind,row,label='Chỉnh sửa') => canEdit(actor,kind) ? act(label,'edit:'+kind+':'+row.id,'secondary','edit') : ''
const add = (kind,label) => canEdit(actor,kind) && !(actor.role==='repair' && kind==='issues') ? act(label || 'Thêm '+titles[kind],'add:'+kind) : ''
const dotLink = (kind,row, label='Mở mục') => '<button class="icon-btn" type="button" data-action="detail:'+kind+':'+escape(row.id)+'" aria-label="'+escape(label)+'">'+icon('chevron',17)+'</button>'
const propOf = id => existing(data,'properties',id)?.name || 'Toàn hệ thống'
const roomOf = id => existing(data,'rooms',id)?.name || ''
const place = row => [propOf(row.propertyId),roomOf(row.roomId)].filter(Boolean).join(' · ')
const roomCount = id => data.rooms.filter(r=>r.propertyId===id)
const activeIssues = () => data.issues.filter(r=>r.status!=='Hoàn tất')
const nearContracts = () => data.contracts.filter(c=>c.status==='Có hiệu lực' && daysLeft(c.end)>=0 && daysLeft(c.end)<=30).sort((a,b)=>a.end.localeCompare(b.end))
const contractStatus = row => row.status==='Có hiệu lực' && daysLeft(row.end)<0 ? 'Đã hết hạn' : row.status==='Có hiệu lực' && daysLeft(row.end)<=30 ? 'Sắp hết hạn' : row.status
const byProperty = rows => propertyId ? rows.filter(row=>row.propertyId===propertyId) : rows
const queryMatch = (...values) => values.join(' ').toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))
const showMonth = () => '<label class="period">'+icon('calendar',17)+'<input type="month" data-filter="period" aria-label="Tháng báo cáo" value="'+escape(period)+'"></label>'
function counts(rows) { return [rows.length,rows.filter(r=>r.status==='Đang thuê').length,rows.filter(r=>r.status==='Đang trống').length] }
function sums(rows) {
  const paid = rows.filter(row=>row.status==='Đã thanh toán')
  const income = paid.filter(row=>row.direction==='Khoản thu').reduce((a,r)=>a+Number(r.amount),0)
  const expenses = paid.filter(row=>row.direction==='Khoản chi').reduce((a,r)=>a+Number(r.amount),0)
  return {income,expenses,balance:income-expenses}
}
function go(next, pid='', rid='') {
  page = next
  propertyId = pid
  roomId = rid
  filter = ''
  query = ''
  menu = false
  render()
  window.scrollTo({top:0,behavior:'instant'})
}
function logo() { return '<span class="brand-mark">'+icon('home',24)+'</span><span class="brand-name">Nhà Trọ<span>Manager</span></span>' }
function navButton(key, active=page===key) {
  const [symbol,name] = navItems[key]
  return '<button type="button" class="nav-item '+(active?'active':'')+'" data-action="go:'+key+'" '+(active?'aria-current="page"':'')+'>'+icon(symbol,19)+'<span>'+name+'</span></button>'
}
function navigation() {
  if (actor.role==='repair') return {primary:['dashboard','properties','issues'],more:[]}
  return {primary:['dashboard','properties','contracts','finance','issues'],more:['meters','documents',...(actor.role==='owner'?['members']:[])]}
}
function shell(content) {
  const {primary,more} = navigation()
  const roleSelect = demo ? '<label class="role-switch"><span>Vai trò demo</span><select data-filter="role" aria-label="Vai trò demo">'+list(Object.entries(roleNames),([key,label])=>'<option value="'+key+'" '+(actor.role===key?'selected':'')+'>'+label+'</option>')+'</select></label>' : ''
  const driveText = drive ? 'Drive đã kết nối' : 'Google Drive'
  const driveControl = '<button type="button" class="drive-btn '+(drive?'connected':'')+'" data-action="drive" aria-label="'+driveText+'">'+icon('drive',17)+'<span>'+driveText+'</span></button>'
  const logout = act(demo?'Thoát bản demo':'Đăng xuất','logout','secondary','')
  return '<div class="layout"><aside class="sidebar"><button class="brand" data-action="go:dashboard">'+logo()+'</button><nav aria-label="Điều hướng chính">'+list(primary,key=>navButton(key))+(more.length?'<div class="nav-divider"></div>'+list(more,key=>navButton(key)):'')+'</nav><div class="side-bottom">'+roleSelect+'<div class="profile"><span class="avatar">'+escape(initials(actor.name))+'</span><div><strong>'+escape(actor.name)+'</strong><small>'+roleNames[actor.role]+'</small></div><button class="icon-btn" type="button" aria-label="Tài khoản" data-action="menu">'+icon('more',18)+'</button></div>'+(menu?'<div class="desktop-menu">'+logout+'</div>':'')+'</div></aside>'
    +'<div class="workspace"><header class="topbar"><button class="brand mobile-brand" data-action="go:dashboard">'+logo()+'</button><div class="breadcrumb"><span>Không gian quản lý</span>'+icon('chevron',13)+'<strong>'+navItems[page]?.[1]+'</strong></div><div class="top-actions">'+(demo?'<span class="demo-pill">Dữ liệu mẫu</span>':'')+(actor.role==='owner'?driveControl:'')+'<button class="avatar mobile-avatar" data-action="menu" aria-label="Tài khoản">'+escape(initials(actor.name))+'</button></div></header><main id="main">'+content+'</main></div>'
    +'<nav class="mobile-nav" aria-label="Điều hướng điện thoại">'+list(primary.slice(0,4),key=>navButton(key))+'<button class="nav-item '+(menu||more.includes(page)||page==='issues'?'active':'')+'" type="button" data-action="menu" aria-expanded="'+menu+'">'+icon('more',20)+'<span>Thêm</span></button></nav>'
    +(menu?'<div class="mobile-menu"><div class="menu-heading"><strong>'+escape(actor.name)+'</strong><small>'+roleNames[actor.role]+'</small></div>'+roleSelect+list([...primary.slice(4),...more],key=>navButton(key))+logout+'</div>':'')+'</div>'
}
function welcome() {
  return '<main class="signin"><div class="signin-panel"><span class="brand">'+logo()+'</span><h1>Quản lý phòng trọ</h1><p>Quản lý dãy trọ, hợp đồng, thu chi và bảo trì từ điện thoại.</p><div class="signin-actions">'+(ready?'<a class="btn primary" href="./api/data?action=login">Đăng nhập bằng Google</a>':'<span class="signin-info">Chờ cấu hình đăng nhập Google cho hệ thống thực.</span>')+act('Xem bản demo','demo','secondary','arrow')+'</div></div></main>'
}
function heading(title, subtitle, action='') {
  return '<div class="page-heading"><div><h1>'+escape(title)+'</h1>'+(subtitle?'<p>'+escape(subtitle)+'</p>':'')+'</div>'+action+'</div>'
}
function panel(title, body, actions='', cls='') { return '<section class="panel '+cls+'"><div class="section-head"><h2>'+escape(title)+'</h2>'+actions+'</div>'+body+'</section>' }
function empty(message='Chưa có dữ liệu.') { return '<div class="empty">'+icon('folder',24)+'<span>'+escape(message)+'</span></div>' }
function stat(symbol,label,value,sub,tone='purple') { return '<div class="stat">'+tile(symbol,tone)+'<span>'+escape(label)+'</span><strong>'+escape(value)+'</strong><small>'+escape(sub)+'</small></div>' }
function link(label, action) { return '<button class="text-btn" type="button" data-action="'+escape(action)+'">'+escape(label)+icon('arrow',15)+'</button>' }
function propCard(row, index) {
  const [total,rented,free] = counts(roomCount(row.id))
  const percent = total ? Math.round(100*rented/total) : 0
  const open = activeIssues().filter(issue=>issue.propertyId===row.id).length
  return '<button class="property-card" type="button" data-action="property:'+escape(row.id)+'"><span class="property-top">'+tile('tower',['purple','blue','peach'][index%3])+'<span class="card-arrow">'+icon('chevron',17)+'</span></span><strong>'+escape(row.name)+'</strong><span class="location">'+icon('pin',14)+escape(row.address)+'</span><span class="progress-head"><span>Lấp đầy</span><b>'+percent+'%</b></span><span class="bar-track"><i style="width:'+percent+'%"></i></span><span class="property-foot"><span>'+rented+'/'+total+' phòng thuê</span><span>'+free+' trống'+(open?' · '+open+' sự cố':'')+'</span></span></button>'
}
function rowCard(symbol,title,sub,right,kind,row,tone='purple') {
  return '<article class="row-card">'+tile(symbol,tone)+'<div class="row-copy"><strong>'+escape(title)+'</strong>'+(sub?'<small>'+escape(sub)+'</small>':'')+'</div><div class="row-end">'+right+(kind?dotLink(kind,row):'')+'</div></article>'
}
function chart() {
  const [year,month] = period.split('-').map(Number)
  const months = Array.from({length:6},(_,i)=>new Date(Date.UTC(year,month-6+i,1)).toISOString().slice(0,7))
  const values = months.map(item=>sums(data.finance.filter(row=>row.month===item)))
  const peak = Math.max(1,...values.flatMap(v=>[v.income,v.expenses]))
  return '<div class="chart-legend"><span><i></i>Khoản thu</span><span><i></i>Khoản chi</span></div><div class="chart">'+list(months,(m,i)=>'<div class="chart-group"><div class="columns"><i class="income" style="height:'+Math.round(values[i].income/peak*100)+'%" title="Thu '+money(values[i].income)+'"></i><i class="expense" style="height:'+Math.round(values[i].expenses/peak*100)+'%" title="Chi '+money(values[i].expenses)+'"></i></div><small>T'+Number(m.slice(5))+'</small></div>')+'</div>'
}
function dashboard() {
  const repair = actor.role==='repair'
  const [total,rented,free] = counts(data.rooms)
  const {income,expenses} = sums(data.finance.filter(row=>row.month===period))
  const pending = activeIssues()
  const near = nearContracts()
  const agenda = list([...pending].sort((a,b)=>(b.priority==='Khẩn cấp')-(a.priority==='Khẩn cấp')).slice(0,2),r=>rowCard('tool',r.title,place(r),badge(r.priority),'issues',r,'peach'))
    +list(near.slice(0,2),r=>rowCard('file',r.title,'Hết hạn '+date(r.end),badge('Còn '+daysLeft(r.end)+' ngày','purple'),'contracts',r))
  return '<section class="hero"><div class="hero-rings"></div><div class="hero-copy"><span class="hero-label">'+icon('home',16)+' Không gian vận hành</span><h1>Xin chào, '+escape(actor.name)+'</h1><p>Theo dõi tình hình các dãy trọ và việc cần xử lý mỗi ngày.</p></div><div class="hero-actions">'+(repair?link('Xem sự cố','go:issues'):act('Ghi chỉ số','add:meters','hero-secondary','camera')+act('Tạo sự cố','add:issues','hero-primary'))+'</div></section>'
    +'<div class="overview-head"><h2>Tình hình vận hành</h2>'+showMonth()+'</div><div class="stat-grid">'
    +stat('tower','Dãy trọ',data.properties.length,total+' phòng trong hệ thống')
    +stat('door','Đang cho thuê',rented+'/'+total,free+' phòng đang trống','blue')
    +(repair?stat('tool','Đang xử lý',pending.filter(i=>i.status==='Đang xử lý').length,'Sự cố đang thực hiện','blue'):stat('wallet','Đã thu trong tháng',money(income),'Đã chi '+money(expenses),'green'))
    +stat('alert','Việc cần xử lý',pending.length+near.length,pending.length+' sự cố'+(repair?'':' · '+near.length+' HĐ sắp hết hạn'),'peach')+'</div>'
    +'<section class="property-section"><div class="section-head"><h2>Dãy trọ</h2>'+link('Xem tất cả','go:properties')+'</div><div class="property-grid">'+(list(data.properties.slice(0,3),(row,index)=>propCard(row,index))||empty('Chưa có dãy trọ.'))+'</div></section>'
    +'<div class="bottom-grid">'+panel('Cần xử lý',agenda||empty('Không có việc đang chờ.'),link('Bảo trì','go:issues'))+(repair?'':panel('Thu chi 6 tháng',chart(),link('Tài chính','go:finance')))+'</div>'
}
function toolbar(placeholder, options=[], useProperty=true, usePeriod=false) {
  return '<div class="toolbar"><label class="search">'+icon('search',17)+'<input data-filter="query" type="search" aria-label="'+escape(placeholder)+'" placeholder="'+escape(placeholder)+'" value="'+escape(query)+'"></label>'
    +(useProperty?'<select data-filter="property" aria-label="Lọc theo dãy"><option value="">Tất cả dãy</option>'+list(data.properties,p=>'<option value="'+escape(p.id)+'" '+(propertyId===p.id?'selected':'')+'>'+escape(p.name)+'</option>')+'</select>':'')
    +(options.length?'<select data-filter="status" aria-label="Lọc theo loại hoặc trạng thái"><option value="">Tất cả</option>'+list(options,x=>'<option '+(filter===x?'selected':'')+'>'+escape(x)+'</option>')+'</select>':'')
    +(usePeriod?showMonth():'')+'</div>'
}
function details(items) {
  return '<dl class="details">'+list(items.filter(([,v])=>v!==undefined && v!==null && v!==''),([key,value])=>'<div><dt>'+escape(key)+'</dt><dd>'+escape(value)+'</dd></div>')+'</dl>'
}
function propertyPage() {
  if (roomId) return roomPage()
  if (!propertyId) return heading('Dãy trọ',data.properties.length+' dãy trọ',add('properties'))+toolbar('Tìm tên hoặc địa chỉ',[],false)+'<div id="results" class="property-grid lookup">'+results('properties')+'</div>'
  const p = existing(data,'properties',propertyId)
  if (!p) return empty()
  const rooms = roomCount(p.id)
  const permitted = actor.role!=='repair'
  const landlordContracts = data.contracts.filter(r=>r.propertyId===p.id && r.kind==='Hợp đồng chủ nhà')
  const ongoing = activeIssues().filter(r=>r.propertyId===p.id)
  const roomLinks = list(rooms,r=>'<button class="room-chip" data-action="room:'+p.id+':'+r.id+'" type="button">'+tile('door')+'<strong>'+escape(r.name)+'</strong>'+badge(r.status)+'</button>')
  const opLinks = [link('Bảo trì theo dãy','scoped:issues:'+p.id),...(permitted?[link('Hợp đồng theo dãy','scoped:contracts:'+p.id),link('Thu chi theo dãy','scoped:finance:'+p.id),link('Hồ sơ theo dãy','scoped:documents:'+p.id)]:[])].join('')
  return link('Tất cả dãy trọ','go:properties')+heading(p.name,p.address,edit('properties',p))
    +'<div class="bottom-grid">'+panel('Thông tin dãy',details([['Người quản lý',p.manager],['Tiện ích',p.amenities],...(actor.role==='owner'?[['Chủ nhà',p.landlord],['SĐT chủ nhà',p.landlordPhone],['Cọc chủ nhà',money(p.deposit)],['Sửa chữa ban đầu',money(p.renovation)],['Đơn vị sửa chữa',p.contractor],['SĐT đơn vị',p.contractorPhone]]:[])])+ '<div class="scoped-links">'+opLinks+'</div>')+panel('Sự cố đang mở',list(ongoing,r=>rowCard('tool',r.title,roomOf(r.roomId),badge(r.status),'issues',r,'peach'))||empty(),add('issues','Báo sự cố'))+'</div>'
    +panel('Phòng trong dãy','<div class="room-grid">'+(roomLinks||empty('Chưa thêm phòng.'))+'</div>',add('rooms'))
    +(permitted?panel('Hợp đồng với chủ nhà',list(landlordContracts,r=>rowCard('file',r.title,r.party,badge(contractStatus(r)),'contracts',r))||empty()):'')
}
function roomPage() {
  const r = existing(data,'rooms',roomId)
  if (!r) return empty()
  const people = data.tenants.filter(x=>x.roomId===r.id)
  const agreements = data.contracts.filter(x=>x.roomId===r.id)
  const readings = data.meters.filter(x=>x.roomId===r.id).sort((a,b)=>b.month.localeCompare(a.month))
  const problems = data.issues.filter(x=>x.roomId===r.id)
  const tenant = actor.role==='repair'?'':panel('Khách ở',list(people,t=>rowCard('users',t.name,[t.phone,t.status].filter(Boolean).join(' · '),'','tenants',t))||empty(),add('tenants'))
  return link(propOf(r.propertyId),'property:'+r.propertyId)+heading(r.name,propOf(r.propertyId),edit('rooms',r))
    +panel('Thông tin phòng',badge(r.status)+details([['Ghi chú',r.note]]))
    +tenant+(actor.role==='repair'?'':panel('Hợp đồng phòng',list(agreements,c=>rowCard('file',c.title,date(c.start)+' – '+date(c.end),badge(contractStatus(c)),'contracts',c))||empty(),add('contracts'))
    +panel('Chỉ số điện / nước',list(readings,m=>rowCard('bolt','Tháng '+monthText(m.month),reading(m.electric,'kWh')+' · '+reading(m.water,'m³'),'','meters',m))||empty(),add('meters','Ghi chỉ số')))
    +panel('Bảo trì phòng',list(problems,i=>rowCard('tool',i.title,i.priority,badge(i.status),'issues',i,'peach'))||empty(),add('issues','Báo sự cố'))
}
const areaLists = {
  contracts: {hint:'Theo dõi thời hạn và chi phí theo hợp đồng.',search:'Tìm hợp đồng hoặc bên ký',options:['Có hiệu lực','Sắp hết hạn','Đã hết hạn','Đã kết thúc','Bản nháp'],button:'Thêm hợp đồng'},
  finance: {hint:'Theo dõi thu chi và chỉ số điện, nước từng dãy.',search:'Tìm giao dịch',options:['Khoản thu','Khoản chi','Chờ thanh toán'],button:'Ghi giao dịch'},
  issues: {hint:'Giao việc và theo dõi tiến độ sự cố theo dãy, theo phòng.',search:'Tìm sự cố',options:issueStates,button:'Báo sự cố'},
  documents: {hint:'Lưu hợp đồng, biên bản, báo giá và tài liệu mẫu.',search:'Tìm hồ sơ',options:fields.documents.kind.values,button:'Thêm hồ sơ'},
  meters: {hint:'Ghi chỉ số điện, nước theo phòng và theo tháng.',search:'Tìm phòng hoặc dãy trọ',options:[],button:'Ghi chỉ số'},
  members: {hint:'Phân công dãy trọ cho quản lý và đội bảo trì.',search:'Tìm tên hoặc email',options:[],button:'Thêm thành viên'},
}
function matching(kind) {
  const rows = byProperty(data[kind]||[])
  return rows.filter(row=>{
    if (['finance','meters'].includes(kind) && row.month!==period) return false
    const match = queryMatch(row.title,row.name,row.party,row.category,row.kind,row.email,place(row))
    if (!filter) return match
    if (kind==='contracts') return match && contractStatus(row)===filter
    return match && [row.status,row.kind,row.direction].includes(filter)
  })
}
function results(kind) {
  if (kind==='properties') return list(data.properties.filter(p=>queryMatch(p.name,p.address)),propCard)||empty('Không tìm thấy dãy trọ.')
  const rows = matching(kind)
  const renderers = {
    contracts:r=>rowCard('file',r.title,[r.kind,place(r),r.end?'Hết hạn '+date(r.end):''].filter(Boolean).join(' · '),badge(contractStatus(r)),kind,r),
    finance:r=>rowCard('wallet',r.title||r.category,place(r)+' · '+r.status,'<b class="'+(r.direction==='Khoản thu'?'amount-in':'')+'">'+(r.direction==='Khoản thu'?'+':'−')+money(r.amount)+'</b>',kind,r,r.direction==='Khoản thu'?'green':'purple'),
    issues:r=>rowCard('tool',r.title,[place(r),r.priority].join(' · '),badge(r.status),kind,r,'peach'),
    documents:r=>rowCard('folder',r.title,r.kind+' · '+place(r),r.attachment?badge('Có tệp','green'):'',kind,r),
    meters:r=>rowCard('bolt',roomOf(r.roomId),place(r)+' · '+monthText(r.month),'<b>'+escape(reading(r.electric,'kWh'))+'</b>',kind,r),
    members:r=>rowCard('users',r.name,r.email,badge(roleNames[r.role]),kind,r),
  }
  return list(rows,renderers[kind])||empty('Không có mục phù hợp.')
}
function listPage(kind) {
  const spec = areaLists[kind]
  const totals = kind==='finance' ? sums(byProperty(data.finance).filter(row=>row.month===period)):null
  return heading(navItems[kind][1],spec.hint,add(kind,spec.button))
    +(totals?'<div class="stat-grid finance-stats">'+stat('wallet','Đã thu',money(totals.income),'Tháng '+monthText(period),'green')+stat('wallet','Đã chi',money(totals.expenses),'Tháng '+monthText(period),'peach')+stat('chart','Chênh lệch',money(totals.balance),'Đã thu − đã chi')+'</div>':'')
    +toolbar(spec.search,spec.options,kind!=='members',['finance','meters'].includes(kind))+'<div class="panel list-panel" id="results">'+results(kind)+'</div>'
}
function render() {
  if (!actor) {root.innerHTML=welcome();return}
  root.innerHTML = shell(page==='dashboard'?dashboard():page==='properties'?propertyPage():listPage(page))
}
function fieldHTML(name,schema,row) {
  const value = row[name] ?? ''
  const pid = row.propertyId || ''
  let control
  if (schema.type==='properties') {
    control='<fieldset class="checkboxes"><legend>'+escape(schema.label)+'</legend>'+list(data.properties,p=>'<label><input type="checkbox" name="'+name+'" value="'+p.id+'" '+(value.includes(p.id)?'checked':'')+'> '+escape(p.name)+'</label>')+'</fieldset>'
    return control
  }
  if (schema.type==='textarea') control='<textarea name="'+name+'" rows="3" '+(schema.required?'required':'')+'>'+escape(value)+'</textarea>'
  else if (['select','property','room','contract'].includes(schema.type)) {
    let choices = (schema.values||[]).map(x=>[x,name==='role'?roleNames[x]:x])
    if (schema.type==='property') choices = data.properties.map(r=>[r.id,r.name])
    if (schema.type==='room') choices = roomCount(pid).map(r=>[r.id,r.name])
    if (schema.type==='contract') choices = data.contracts.filter(r=>r.propertyId===pid && (!row.roomId || r.roomId===row.roomId)).map(r=>[r.id,r.title])
    control='<select name="'+name+'" '+(schema.required?'required':'')+'><option value="">'+(schema.required?'Chọn '+escape(schema.label.toLowerCase()):'—')+'</option>'+list(choices,([id,label])=>'<option value="'+escape(id)+'" '+(value===id?'selected':'')+'>'+escape(label)+'</option>')+'</select>'
  } else control='<input type="'+schema.type+'" name="'+name+'" value="'+escape(value)+'" '+(schema.required?'required ':'')+(schema.step?'min="0" step="'+schema.step+'" ':'')+'maxlength="2500">'
  return '<label class="form-field '+(['textarea','property'].includes(schema.type)?'wide':'')+'"><span>'+escape(schema.label)+(schema.required?' <b>*</b>':'')+'</span>'+control+'</label>'
}
function drawForm(values,preserveFile=true) {
  const {kind,row} = formContext
  const narrowed = actor.role==='repair' && kind==='issues'
  const extras = kind==='meters' ? '<div class="attachment wide"><label>'+icon('camera',18)+' <strong>Ảnh đồng hồ điện</strong><input type="file" name="upload" accept="image/*" capture="environment"></label><span data-file-note>'+(row?.attachment?'Đã lưu: '+escape(row.attachment.name):'')+'</span><img data-meter-preview hidden alt="Ảnh đồng hồ điện đã chọn"><button type="button" class="btn secondary" data-action="recognize" '+(!ocr?'disabled':'')+'>'+icon('bolt',16)+'Đọc chỉ số từ ảnh</button><small>'+(!ocr?'OCR cần kết nối dịch vụ nhận dạng. Bạn có thể nhập số trực tiếp.':'Đối chiếu số gợi ý với ảnh trước khi lưu.')+'</small></div>'
    :kind==='documents' ? '<div class="attachment wide"><label>'+icon('drive',18)+' <strong>Tệp hồ sơ</strong><input type="file" name="upload" accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,.xls,.xlsx"></label><small>'+(row?.attachment?'Đã lưu: '+escape(row.attachment.name):'Tệp PDF, ảnh hoặc Office, tối đa 3 MB.')+'</small>'+(!drive?'<small>'+(demo?'Bản demo chỉ lưu tên tệp trên thiết bị.':'Chủ hệ thống cần kết nối Google Drive để tải tệp.')+'</small>':'')+'</div>':''
  editor.innerHTML = '<form id="record-form"><div class="dialog-head"><h2 id="editor-title">'+(row?'Cập nhật ':'Thêm ')+titles[kind]+'</h2><button type="button" class="icon-btn" data-action="close" aria-label="Đóng">'+icon('close')+'</button></div>'
    +'<div class="form-grid">'+list(Object.entries(fields[kind]).filter(([name])=>!narrowed||['status','resolution'].includes(name)),([name,schema])=>fieldHTML(name,schema,values))+extras+'</div>'
    +'<p class="form-error" role="alert"></p><div class="dialog-foot">'+act('Huỷ','close','secondary','')+'<button class="btn primary" type="submit">'+icon('check',17)+'Lưu '+titles[kind]+'</button></div></form>'
  if (preserveFile && formContext.file) displayFile()
}
function openForm(kind,row) {
  if (!canEdit(actor,kind) || (actor.role==='repair' && !row)) return
  if (kind!=='properties' && !data.properties.length && !['documents'].includes(kind)) {note('Hãy thêm dãy trọ trước.',true);return}
  const values = row ? {...defaults[kind],...row} : {
    ...defaults[kind],
    propertyId:propertyId || (kind!=='documents' && data.properties.length===1?data.properties[0].id:''),
    roomId:roomId || '', month:period,
    ...(kind==='finance'?{date:nowDay()}:{}),
    ...(kind==='contracts'&&roomId?{kind:'Hợp đồng khách thuê'}:{}),
  }
  releasePreview()
  formContext={kind,row,file:null,id:row?.id||makeId()}
  drawForm(values)
  if (!editor.open) editor.showModal()
}
function showDetails(kind,row) {
  if (!row) return
  const values = Object.entries(fields[kind]).map(([name,schema])=>{
    let value = row[name]
    if (name==='status' && kind==='contracts') value=contractStatus(row)
    if (name==='role') value=roleNames[value]
    if (schema.type==='properties') value=(value||[]).map(propOf).join(', ')
    if (schema.type==='property') value=propOf(value)
    if (schema.type==='room') value=roomOf(value)
    if (schema.type==='contract') value=existing(data,'contracts',value)?.title
    if (schema.type==='date') value=value?date(value):''
    if (schema.type==='month') value=monthText(value)
    if (schema.type==='number' && schema.label.includes('₫') && value!==undefined && value!=='') value=money(value)
    return [schema.label,value]
  })
  if (kind==='meters') {
    const past = data.meters.filter(item=>item.roomId===row.roomId && item.month<row.month).sort((a,b)=>b.month.localeCompare(a.month))
    for (const [key,label,unit] of [['electric','Điện tiêu thụ','kWh'],['water','Nước tiêu thụ','m³']]) {
      const prev = past.find(x=>x[key]!=='' && x[key]!=null)
      if (prev && row[key]!=='' && row[key]!=null && row[key]>=prev[key]) values.push([label,reading(Math.round((row[key]-prev[key])*1000)/1000,unit)+' (từ '+monthText(prev.month)+')'])
    }
  }
  const docs = kind==='contracts'?data.documents.filter(d=>d.contractId===row.id):[]
  editor.innerHTML='<div class="detail-sheet"><div class="dialog-head"><h2 id="editor-title">'+escape(row.title||row.name||titles[kind])+'</h2><button class="icon-btn" data-action="close" aria-label="Đóng">'+icon('close')+'</button></div><div class="detail-body">'+details(values)
    +(row.attachment?(demo?'<p>Tệp mẫu: '+escape(row.attachment.name)+'</p>':'<a class="btn secondary" href="./api/data?action=file&amp;kind='+kind+'&amp;id='+encodeURIComponent(row.id)+'">'+icon('drive',17)+'Tải '+escape(row.attachment.name)+'</a>'):'')
    +list(docs,d=>link(d.title,'detail:documents:'+d.id))
    +'</div><div class="dialog-foot">'+act('Đóng','close','secondary','')+(kind==='contracts'&&canEdit(actor,'documents')?act('Đính kèm hồ sơ','attach:'+row.id,'secondary','folder'):'')+edit(kind,row,actor.role==='repair'?'Cập nhật tiến độ':'Chỉnh sửa')+'</div></div>'
  if (!editor.open) editor.showModal()
}
function getValues() {
  const f = new FormData(editor.querySelector('form'))
  const values = {...formContext.row,...Object.fromEntries(f)}
  delete values.upload
  if (formContext.kind==='members') values.propertyIds=f.getAll('propertyIds')
  return values
}
function makeId() { return globalThis.crypto?.randomUUID?.() ?? 'r-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2) }
function releasePreview() {
  if (!formContext?.preview) return
  URL.revokeObjectURL(formContext.preview)
  formContext.preview=null
}
function displayFile() {
  const file=formContext.file
  const preview=editor.querySelector('[data-meter-preview]')
  editor.querySelector('[data-file-note]')?.replaceChildren(file?.name||'')
  if (!preview) return
  if (file) preview.src=formContext.preview ||= URL.createObjectURL(file)
  else preview.removeAttribute('src')
  preview.hidden=!file
}
async function resizedMeter(file) {
  if (file.size<=3_000_000 && ['image/jpeg','image/png','image/webp'].includes(file.type)) return file
  const image=await createImageBitmap(file)
  try {
    const ratio=Math.min(1,1900/Math.max(image.width,image.height))
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(image.width*ratio))
    canvas.height=Math.max(1,Math.round(image.height*ratio))
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88))
    if (!blob) throw new Error('Không thể nén ảnh.')
    return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'})
  } finally {image.close()}
}
function fileData(file) {
  return new Promise((resolve,reject)=>{
    const reader = new FileReader()
    reader.onload = ()=>resolve({name:file.name, mime:file.type, base64:String(reader.result).split(',')[1]})
    reader.onerror = ()=>reject(new Error('Không thể đọc tệp.'))
    reader.readAsDataURL(file)
  })
}
async function save(event) {
  event.preventDefault()
  if (saving) return
  const {kind,row,file,id} = formContext
  const values = getValues()
  const button = editor.querySelector('[type="submit"]')
  const hint = editor.querySelector('.form-error')
  saving = true
  button.disabled = true
  hint.textContent = ''
  try {
    const input = {kind,id,values,version:row?.version}
    if (file?.size>3_000_000) throw new Error('Tệp phải nhỏ hơn hoặc bằng 3 MB.')
    if (demo) {
      applyChange(demoData,actor,input,{attachment:file?{name:file.name}:undefined})
      try {localStorage.setItem(storeKey,JSON.stringify(demoData))} catch {}
      demoRefresh()
    } else {
      if (file) input.upload = await fileData(file)
      const output = await api('save',{method:'POST',body:input})
      data = output.data
    }
    editor.close()
    render()
    note('Đã lưu '+titles[kind]+'.')
  } catch(error) {
    hint.textContent=error.message
    if (!demo && /đã thay đổi/.test(error.message)) {
      try {data=(await api('state')).data;render()} catch {}
    }
  } finally { saving=false;button.disabled=false }
}
async function recognize(button) {
  const file = formContext?.file
  if (!file) {note('Chụp hoặc chọn ảnh đồng hồ trước.',true);return}
  if (file.size>3_000_000) {note('Ảnh phải nhỏ hơn hoặc bằng 3 MB.',true);return}
  button.disabled=true
  const hint = editor.querySelector('.form-error')
  hint.textContent='Đang đọc ảnh đồng hồ…'
  const input=editor.querySelector('[name="electric"]')
  const original=input.value
  try {
    const answer=await api('ocr',{method:'POST',body:{upload:await fileData(file)}})
    if (input.value===original) input.value=answer.reading
    hint.textContent='Số gợi ý: '+answer.reading+'. Hãy kiểm tra ảnh và xác nhận trước khi lưu.'
  } catch(error) {hint.textContent=error.message}
  finally {button.disabled=false}
}
function showDrive() {
  editor.innerHTML='<div class="detail-sheet"><div class="dialog-head"><h2 id="editor-title">Google Drive</h2><button class="icon-btn" data-action="close" aria-label="Đóng">'+icon('close')+'</button></div><div class="detail-body"><p>'+escape(demo?'Kết nối Google Drive chỉ có trong hệ thống thực.':drive?'Tệp được lưu trong thư mục '+driveLabel+' trên Google Drive của chủ hệ thống.':'Kết nối Drive của chủ hệ thống để lưu hợp đồng, hồ sơ và ảnh đồng hồ.')+'</p></div><div class="dialog-foot">'+act('Đóng','close','secondary','')+(!demo&&!drive?'<a class="btn primary" href="./api/data?action=drive-login">'+icon('drive',17)+'Kết nối Drive</a>':'')+'</div></div>'
  if (!editor.open) editor.showModal()
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]')
  if (!button) return
  const [action,first,second] = button.dataset.action.split(':')
  if (action==='demo') return enterDemo()
  if (action==='close') {if(!saving)editor.close();return}
  if (action==='menu') {menu=!menu;return render()}
  if (action==='go') return go(first)
  if (action==='scoped') return go(first,second)
  if (action==='property') return go('properties',first)
  if (action==='room') return go('properties',first,second)
  if (action==='add') return openForm(first)
  if (action==='edit') return openForm(first,existing(data,first,second))
  if (action==='detail') return showDetails(first,existing(data,first,second))
  if (action==='attach') {
    const contract=existing(data,'contracts',first)
    openForm('documents')
    if(contract&&formContext?.kind==='documents') drawForm({propertyId:contract.propertyId,roomId:contract.roomId,contractId:contract.id,kind:contract.kind,title:contract.title})
    return
  }
  if (action==='recognize') return recognize(button)
  if (action==='drive') return showDrive()
  if (action==='logout') {
    if (!demo) {
      try {await api('logout',{method:'POST'})}
      catch(error) {note(error.message,true);return}
      data=blank()
    }
    actor=null;demo=false;menu=false;render()
  }
})
document.addEventListener('submit',event=>{if(event.target.id==='record-form')save(event)})
editor.addEventListener('cancel',event=>{if(saving)event.preventDefault()})
editor.addEventListener('close',()=>{if(!editor.open)releasePreview()})
document.addEventListener('input',event=>{
  if (event.target.dataset.filter!=='query') return
  query=event.target.value
  document.querySelector('#results').innerHTML=results(page)
})
document.addEventListener('change',async event=>{
  const target=event.target
  if (target.name==='upload' && target.closest('#record-form')) {
    const context=formContext
    const original=target.files[0] || null
    releasePreview()
    context.file=null
    displayFile()
    if (!original) return
    const submit=editor.querySelector('[type="submit"]')
    submit.disabled=true
    try {
      const file=context.kind==='meters' ? await resizedMeter(original) : original
      if (formContext===context && editor.open && target.files[0]===original) {
        context.file=file
        displayFile()
      }
    } catch {note('Không mở được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP.',true)}
    finally {submit.disabled=false}
    return
  }
  if (['propertyId','roomId'].includes(target.name) && target.closest('#record-form')) {
    const values=getValues()
    if (target.name==='propertyId') values.roomId=''
    values.contractId=''
    return drawForm(values)
  }
  const key=target.dataset.filter
  if (key==='role') return enterDemo(target.value)
  if (key==='property') propertyId=target.value
  if (key==='status') filter=target.value
  if (key==='period') period=target.value||nowMonth()
  if (['property','status','period'].includes(key)) render()
})
async function boot() {
  if (launchedFromFile || hash.has('demo')) return enterDemo()
  try {
    const session=await api('session')
    ready=session.ready
    if (session.actor) {
      actor=session.actor
      drive=session.drive
      driveLabel=session.driveLabel
      ocr=session.ocr
      data=(await api('state')).data
    } else if (!ready) return enterDemo()
  } catch(error) {
    if (actor) note(error.message,true)
  }
  render()
  const msg=new URLSearchParams(location.search).get('notice')
  if(msg) {
    const messages={drive:'Đã kết nối Google Drive.',denied:'Tài khoản này chưa được cấp quyền hoặc bạn đã từ chối đăng nhập.',failed:'Không thể hoàn tất kết nối Google. Hãy kiểm tra cấu hình và thử lại.'}
    if (messages[msg]) note(messages[msg],msg!=='drive')
    history.replaceState({},'',location.pathname+location.hash)
  }
}
boot()
