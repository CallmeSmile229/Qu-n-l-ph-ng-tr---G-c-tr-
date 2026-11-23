import {blank, nowMonth, nowDay} from './model.mjs'
export const demoActor = role => ({name:({owner:'Hiệp',manager:'Quản lý mẫu',repair:'Bảo trì mẫu'})[role],role,propertyIds:['p1','p2'],email:'demo@example.com'})
export function example() {
  const state = blank()
  const month = nowMonth()
  const earlier = offset => {
    const [y,m] = month.split('-').map(Number)
    return new Date(Date.UTC(y,m-1-offset,1)).toISOString().slice(0,7)
  }
  const date = nowDay()
  const records = {
    properties: [
      {id:'p1',name:'Dãy trọ An Phú',address:'An Phú, Thuận An',manager:'Nguyễn Minh Anh',landlord:'Anh Nam',landlordPhone:'',deposit:20000000,renovation:12500000,contractor:'Đội sửa chữa An Phú',amenities:'Wi-Fi · Chỗ để xe · Camera'},
      {id:'p2',name:'Nhà trọ Bình An',address:'Bình An, Dĩ An',manager:'Trần Hoàng',landlord:'Chị Thủy',deposit:18000000,renovation:7000000,amenities:'Wi-Fi · Chỗ để xe'},
      {id:'p3',name:'Dãy trọ Linh Trung',address:'Linh Trung, Thủ Đức',manager:'Nguyễn Minh Anh',landlord:'Anh Tùng',deposit:22000000,renovation:8000000,amenities:'Wi-Fi · Camera'},
    ],
    tenants:[{id:'t1',propertyId:'p1',roomId:'p1-1',name:'Nguyễn Khánh Linh',status:'Đang ở',note:'Khách thuê mẫu'}],
    contracts:[
      {id:'c1',propertyId:'p1',roomId:'p1-1',title:'HĐ thuê phòng A01',party:'Nguyễn Khánh Linh',kind:'Hợp đồng khách thuê',start:earlier(5)+'-10',end:new Date(Date.now()+12*86400000).toISOString().slice(0,10),amount:2900000,deposit:2900000,electric:3800,water:19000,extra:100000,status:'Có hiệu lực'},
      {id:'c2',propertyId:'p2',title:'HĐ thuê dãy Bình An',party:'Chị Thủy',kind:'Hợp đồng chủ nhà',start:earlier(9)+'-15',amount:6500000,status:'Có hiệu lực'},
      {id:'c3',propertyId:'p1',title:'HĐ Internet An Phú',party:'Đơn vị Internet',kind:'Hợp đồng nhà cung cấp',start:earlier(7)+'-01',amount:780000,status:'Có hiệu lực'},
    ],
    finance:[
      {id:'f1',propertyId:'p1',month,direction:'Khoản thu',category:'Tiền phòng',title:'Tiền thuê phòng An Phú',amount:22100000,status:'Đã thanh toán',date},
      {id:'f2',propertyId:'p2',month,direction:'Khoản thu',category:'Tiền phòng',title:'Tiền thuê phòng Bình An',amount:15600000,status:'Đã thanh toán',date},
      {id:'f3',propertyId:'p3',month,direction:'Khoản thu',category:'Tiền phòng',title:'Tiền thuê phòng Linh Trung',amount:4880000,status:'Đã thanh toán',date},
      {id:'f4',propertyId:'p1',month,direction:'Khoản chi',category:'Tiền nhà',amount:11200000,status:'Đã thanh toán',date},
      {id:'f5',propertyId:'p2',month,direction:'Khoản chi',category:'Tiền nhà',amount:6500000,status:'Đã thanh toán',date},
      {id:'f6',propertyId:'p3',month,direction:'Khoản chi',category:'Tiền điện',reading:1881,amount:3860000,status:'Đã thanh toán',date},
      {id:'f7',propertyId:'p1',month,direction:'Khoản chi',category:'Internet',amount:780000,status:'Chờ thanh toán',date},
    ],
    meters:[{id:'m1',propertyId:'p1',roomId:'p1-1',month:earlier(1),electric:1129,water:25,note:''}],
    issues:[
      {id:'i1',propertyId:'p1',roomId:'p1-3',title:'Rò nước dưới bồn rửa',priority:'Khẩn cấp',status:'Mới báo',description:'Kiểm tra đường ống dưới bồn rửa ở phòng A03.'},
      {id:'i2',propertyId:'p2',roomId:'',title:'Đèn hành lang tầng 2 không sáng',priority:'Thông thường',status:'Đang xử lý',description:'Kiểm tra bóng đèn và công tắc hành lang.'},
      {id:'i3',propertyId:'p3',roomId:'p3-2',title:'Thay khóa cửa phòng C02',priority:'Ưu tiên',status:'Mới báo'},
    ],
    documents:[
      {id:'d1',propertyId:'p2',contractId:'c2',kind:'Hợp đồng chủ nhà',title:'Hợp đồng thuê dãy Bình An',note:'Hồ sơ mẫu'},
      {id:'d2',propertyId:'',kind:'Hợp đồng mẫu',title:'Mẫu hợp đồng cho thuê phòng',note:'Hồ sơ mẫu'},
    ],
    members:[
      {id:'s1',name:'Nguyễn Minh Anh',email:'quanly@example.com',role:'manager',propertyIds:['p1','p2']},
      {id:'s2',name:'Đội bảo trì',email:'baotri@example.com',role:'repair',propertyIds:['p1','p2']},
    ],
  }
  records.rooms = [12,8,8].flatMap((count, level) => Array.from({length:count},(_, index) => {
    const propertyId = 'p'+(level+1)
    return {id:propertyId+'-'+(index+1),propertyId,name:'ABC'[level]+String(index+1).padStart(2,'0'),status:index<count-([2,1,2][level])?'Đang thuê':'Đang trống'}
  }))
  for (const [index, offset] of [1,2,3,4,5].entries()) {
    records.finance.push({id:'hist'+offset,propertyId:'p1',month:earlier(offset),direction:'Khoản thu',category:'Tiền phòng',amount:[39200000,35700000,31000000,27900000,30500000][index],status:'Đã thanh toán'})
    records.finance.push({id:'exp'+offset,propertyId:'p1',month:earlier(offset),direction:'Khoản chi',category:'Tiền nhà',amount:[20400000,19000000,16200000,18000000,17000000][index],status:'Đã thanh toán'})
  }
  for (const [name, list] of Object.entries(records)) state[name] = list.map(row => ({...row,version:1,createdAt:date,updatedAt:date}))
  return state
}
