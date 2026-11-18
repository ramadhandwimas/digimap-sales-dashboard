import type {PriceTicketTemplate,TicketSlotResult,TicketSyncResult} from "@/lib/price-ticket";

export type ManualPriceOverrides=Record<string,number>;

export function parsePriceOverrides(value:string|null):ManualPriceOverrides{
  if(!value)return{};
  const result:ManualPriceOverrides={};
  for(const pair of value.split(",")){
    const divider=pair.indexOf(":");
    if(divider<1)continue;
    const id=pair.slice(0,divider),price=Number(pair.slice(divider+1));
    if(id&&Number.isSafeInteger(price)&&price>0)result[id]=price;
  }
  return result;
}

export function applyPriceOverrides(ticket:PriceTicketTemplate,resolved:TicketSyncResult,overrides:ManualPriceOverrides):TicketSyncResult{
  const allowed=new Set(ticket.slots.map(slot=>slot.id));
  for(const id of Object.keys(overrides))if(!allowed.has(id))throw new Error(`Konfigurasi harga manual ${id} tidak dikenal.`);
  const sourceSlots=resolved.slots as TicketSlotResult[];
  const slots:TicketSlotResult[]=sourceSlots.map(slot=>{
    const manual=overrides[slot.id];
    if(!manual)return slot;
    return{...slot,currentFullPrice:manual,status:manual===slot.oldFullPrice?"CURRENT":"CHANGED",articles:slot.articles.length?slot.articles:["MANUAL"]};
  });
  const warningCount=slots.filter(slot=>slot.status==="MISSING"||slot.status==="CONFLICT").length;
  const changedCount=slots.filter(slot=>slot.status==="CHANGED").length;
  return{...resolved,slots,warningCount,changedCount,status:warningCount?"BLOCKED":changedCount?"CHANGED":"CURRENT"};
}
