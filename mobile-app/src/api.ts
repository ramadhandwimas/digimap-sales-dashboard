import type {M238Payload} from './types'

const BASE='https://m238-dashboard.vercel.app'

export async function fetchM238(period:string,refresh=false):Promise<M238Payload>{
  const url=`${BASE}/api/data?period=${period}${refresh?`&refresh=1&t=${Date.now()}`:''}`
  const r=await fetch(url,{headers:{Accept:'application/json'}})
  if(!r.ok) throw new Error(`Gagal memuat data (${r.status})`)
  return r.json() as Promise<M238Payload>
}

export const links={
  dashboard:BASE,
  checklistSpv:'https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUMUdNM1Q1VU4zTU9PTlpVTERHVUpZUk9BQS4u&route=shorturl',
  checklistStaff:'https://forms.cloud.microsoft/pages/responsepage.aspx?id=iAw5Rakbn0eYpYaKADRxVqklIyFb72JDrV7GtVMqEcNUQVpVV1hBVTdHTDVDWVlMRkE0V0lRVDQySS4u&route=shorturl'
}
