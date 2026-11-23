export const roleNames = { owner: 'Chủ hệ thống', manager: 'Quản lý dãy', repair: 'Đội bảo trì' }
export const documentKinds = ['Hợp đồng chủ nhà', 'Hợp đồng khách thuê', 'Hợp đồng nhà cung cấp', 'Hợp đồng quản lý', 'Biên bản', 'Báo giá thi công', 'Hợp đồng mẫu', 'Hồ sơ khác']
export const expenseKinds = ['Tiền nhà', 'Tiền điện', 'Tiền nước', 'Internet', 'Tiền rác', 'Tiền lobby', 'Sửa chữa', 'Khác']
export const issueStates = ['Mới báo', 'Đang xử lý', 'Hoàn tất']
export const issuePriorities = ['Thông thường', 'Ưu tiên', 'Khẩn cấp']
export const roomStates = ['Đang trống', 'Đang thuê', 'Đang sửa']
export const nowMonth = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit'}).format(new Date())
export const nowDay = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Ho_Chi_Minh'}).format(new Date())
export const blank = () => ({ properties: [], rooms: [], tenants: [], contracts: [], finance: [], meters: [], issues: [], documents: [], members: [] })
const text = (label, required = false, type = 'text') => ({ label, required, type })
const num = (label, required = false, step = '1') => ({ label, required, type:'number', step })
const choice = (label, values, required = true) => ({label, values, required, type:'select'})
const property = text('Dãy trọ', true, 'property')
const room = text('Phòng', false, 'room')
export const fields = {
  properties: {
    name: text('Tên dãy trọ', true), address: text('Địa chỉ', true), manager: text('Người quản lý'),
    landlord: text('Họ tên chủ nhà'), landlordPhone: text('SĐT chủ nhà', false, 'tel'),
    deposit: num('Tiền cọc chủ nhà (₫)'), renovation: num('Tiền sửa chữa ban đầu (₫)'),
    contractor: text('Đơn vị sửa chữa'), contractorPhone: text('SĐT đơn vị sửa chữa', false, 'tel'),
    amenities: text('Tiện ích của dãy', false, 'textarea'),
  },
  rooms: {
    propertyId:property, name:text('Mã / tên phòng', true), status:choice('Trạng thái',roomStates),
    note:text('Ghi chú phòng',false,'textarea'),
  },
  tenants: {
    propertyId:property, roomId:text('Phòng',true,'room'), name:text('Họ tên khách ở',true),
    phone:text('Số điện thoại',false,'tel'), identity:text('Số CCCD'),
    status:choice('Tình trạng cư trú',['Đang ở','Đã chuyển đi']), note:text('Ghi chú',false,'textarea'),
  },
  contracts: {
    propertyId:property, roomId:room, kind:choice('Loại hợp đồng',documentKinds.slice(0,4)),
    title:text('Tên hoặc mã hợp đồng',true), party:text('Bên ký hợp đồng',true),
    phone:text('SĐT bên ký',false,'tel'), start:text('Ngày bắt đầu',true,'date'), end:text('Ngày hết hạn',false,'date'),
    status:choice('Trạng thái hợp đồng',['Có hiệu lực','Đã kết thúc','Bản nháp']),
    amount:num('Tiền theo hợp đồng / tháng (₫)'), deposit:num('Tiền cọc (₫)'),
    electric:num('Đơn giá điện (₫/kWh)'), water:num('Đơn giá nước (₫/m³)'), extra:num('Phí khác / tháng (₫)'),
    note:text('Điều khoản hoặc ghi chú',false,'textarea'),
  },
  finance: {
    propertyId:property, roomId:room, month:text('Tháng ghi nhận',true,'month'),
    direction:choice('Loại giao dịch',['Khoản chi','Khoản thu']), category:choice('Hạng mục',[...expenseKinds,'Tiền phòng','Tiền cọc','Dịch vụ']),
    title:text('Diễn giải / tên chi phí khác'), amount:num('Số tiền (₫)',true),
    reading:num('Chỉ số điện / nước của dãy',false,'0.001'), date:text('Ngày giao dịch',false,'date'),
    status:choice('Thanh toán',['Đã thanh toán','Chờ thanh toán']),
  },
  meters: {
    propertyId:property, roomId:text('Phòng',true,'room'), month:text('Tháng ghi nhận',true,'month'),
    electric:num('Chỉ số điện (kWh)',false,'0.001'), water:num('Chỉ số nước (m³)',false,'0.001'),
    note:text('Ghi chú',false,'textarea'),
  },
  issues: {
    propertyId:property, roomId:room, title:text('Tên sự cố',true), description:text('Mô tả sự cố',false,'textarea'),
    priority:choice('Mức độ',issuePriorities), status:choice('Tiến độ',issueStates),
    assignee:text('Email người phụ trách',false,'email'), deadline:text('Hạn xử lý',false,'date'),
    resolution:text('Ghi chú xử lý',false,'textarea'),
  },
  documents: {
    propertyId:text('Dãy trọ',false,'property'), roomId:room, title:text('Tên hồ sơ',true),
    kind:choice('Loại hồ sơ',documentKinds), contractId:text('Hợp đồng liên quan',false,'contract'),
    note:text('Ghi chú',false,'textarea'),
  },
  members: {
    name:text('Họ tên',true), email:text('Email Google đăng nhập',true,'email'),
    role:choice('Vai trò',['manager','repair']), propertyIds:text('Dãy trọ được phân công',true,'properties'),
    access:choice('Quyền đăng nhập',['Đang cấp quyền','Đã thu hồi']),
  },
}
export const titles = { properties:'dãy trọ', rooms:'phòng', tenants:'khách ở', contracts:'hợp đồng', finance:'giao dịch', meters:'chỉ số điện / nước', issues:'sự cố', documents:'hồ sơ', members:'thành viên' }
export function existing(state, kind, id) { return state[kind]?.find(row => row.id === id) }
export function canSeeProperty(actor, id) { return actor.role === 'owner' || actor.propertyIds.includes(id) }
export function canEdit(actor, kind) {
  if (actor.role === 'owner') return Boolean(fields[kind])
  if (actor.role === 'manager') return Boolean(fields[kind]) && !['members','properties'].includes(kind)
  return actor.role === 'repair' && kind === 'issues'
}
export function viewState(state, actor) {
  if (actor.role === 'owner') return structuredClone(state)
  const result = blank()
  result.properties = state.properties.filter(row => canSeeProperty(actor,row.id)).map(({id,name,address,manager,amenities}) => ({id,name,address,manager,amenities}))
  result.rooms = state.rooms.filter(row => canSeeProperty(actor,row.propertyId))
    .map(row => actor.role === 'repair' ? {id:row.id,propertyId:row.propertyId,name:row.name,status:row.status} : row)
  result.issues = state.issues.filter(row => canSeeProperty(actor,row.propertyId))
  if (actor.role === 'manager') {
    for (const kind of ['tenants','contracts','finance','meters','documents']) result[kind] = state[kind].filter(row => canSeeProperty(actor,row.propertyId))
  }
  return result
}
function fail(message, status=400) { throw Object.assign(new Error(message),{status}) }
const badDate = value => !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value

export function applyChange(state, actor, {kind,id,values,version}, {clock = new Date().toISOString(), attachment} = {}) {
  if (!Array.isArray(state[kind]) || !canEdit(actor,kind)) fail('Bạn không có quyền thực hiện thao tác này.',403)
  if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id) || !values || typeof values !== 'object') fail('Dữ liệu không hợp lệ.')
  const old = existing(state,kind,id)
  if (old && old.version !== version) fail('Dữ liệu đã thay đổi. Hãy đóng biểu mẫu và mở lại.',409)
  if (!old && version) fail('Mục này không còn tồn tại.',409)
  if (actor.role !== 'owner' && (!canSeeProperty(actor,old?.propertyId ?? values.propertyId) || !canSeeProperty(actor,values.propertyId))) fail('Bạn không được phân công dãy trọ này.',403)
  if (actor.role === 'repair' && !old) fail('Đội bảo trì chỉ cập nhật tiến độ sự cố có sẵn.',403)

  const row = {id, createdAt:old?.createdAt ?? clock, updatedAt:clock, version:(old?.version ?? 0)+1}
  for (const [name, schema] of Object.entries(fields[kind])) {
    let value = actor.role === 'repair' && !['status','resolution'].includes(name) ? old[name] : values[name]
    if (schema.type === 'properties') {
      if (!Array.isArray(value) || !value.length || !value.every(pid=>existing(state,'properties',pid))) fail('Chọn ít nhất một dãy trọ hợp lệ.')
      row[name] = [...new Set(value)]
      continue
    }
    if (value == null || value === '') {
      if (schema.required) fail('Vui lòng nhập ' + schema.label.toLowerCase() + '.')
      row[name] = ''
      continue
    }
    if (!['string','number'].includes(typeof value)) fail('Dữ liệu không hợp lệ.')
    value = String(value).trim()
    if ((!value && schema.required) || value.length > 2500) fail('Kiểm tra trường ' + schema.label + '.')
    if (schema.values && !schema.values.includes(value)) fail('Lựa chọn không hợp lệ.')
    if (schema.type === 'date' && badDate(value)) fail('Ngày không hợp lệ.')
    if (schema.type === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) fail('Tháng không hợp lệ.')
    if (schema.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail('Email không hợp lệ.')
    if (schema.type === 'number') {
      value = Number(value)
      if (!Number.isFinite(value) || value < 0 || value > 999999999999 || (schema.step === '1' && !Number.isInteger(value))) fail('Số nhập không hợp lệ.')
    }
    row[name] = schema.type === 'email' ? value.toLowerCase() : value
  }
  if (row.propertyId && !existing(state,'properties',row.propertyId)) fail('Dãy trọ không tồn tại.')
  if (row.roomId && existing(state,'rooms',row.roomId)?.propertyId !== row.propertyId) fail('Phòng không thuộc dãy trọ đã chọn.')
  if (row.contractId) {
    const contract = existing(state,'contracts',row.contractId)
    if (!contract || contract.propertyId !== row.propertyId || (row.roomId && row.roomId !== contract.roomId)) fail('Hợp đồng liên quan không phù hợp.')
  }
  if (kind === 'documents' && !row.propertyId && !['Hợp đồng mẫu','Hợp đồng quản lý','Hồ sơ khác'].includes(row.kind)) fail('Cần chọn dãy trọ cho hồ sơ này.')
  if (kind === 'contracts') {
    if (row.kind === 'Hợp đồng khách thuê' && !row.roomId) fail('Cần chọn phòng cho hợp đồng khách thuê.')
    if (row.end && row.end < row.start) fail('Ngày hết hạn phải từ ngày bắt đầu trở đi.')
  }
  if (kind === 'rooms' && old && old.propertyId !== row.propertyId) fail('Phòng đang thuộc dãy trọ đã tạo.')
  if (kind === 'contracts' && old && state.documents.some(doc => doc.contractId === id && (doc.propertyId !== row.propertyId || (doc.roomId && doc.roomId !== row.roomId)))) fail('Hãy cập nhật hồ sơ liên quan trước khi đổi dãy hoặc phòng.')
  const conflicts = {
    rooms: item => item.propertyId === row.propertyId && item.name.toLowerCase() === row.name.toLowerCase(),
    members: item => item.email === row.email,
    meters: item => item.roomId === row.roomId && item.month === row.month,
  }
  if (conflicts[kind] && state[kind].some(item => item.id !== id && conflicts[kind](item))) fail('Đã có mục trùng thông tin này.',409)
  if (kind === 'meters' && row.electric === '' && row.water === '') fail('Nhập ít nhất một chỉ số.')
  if (['documents','meters'].includes(kind) && (attachment || old?.attachment)) row.attachment = attachment ?? old.attachment
  const index = state[kind].findIndex(item => item.id === id)
  if (index < 0) state[kind].unshift(row)
  else state[kind][index] = row
  return row
}
