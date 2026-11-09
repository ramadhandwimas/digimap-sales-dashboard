export const PRESENCE_TTL_MS=150_000;
export function presenceDevice(ua:string){
 const device=/iPad|Macintosh.*Mobile/i.test(ua)?"iPad":/iPhone/i.test(ua)?"iPhone":/Android/i.test(ua)?"Android":/Windows/i.test(ua)?"Windows":/Macintosh|Mac OS X/i.test(ua)?"Mac":/Linux/i.test(ua)?"Linux":"Perangkat lain";
 const browser=/SamsungBrowser/i.test(ua)?"Samsung Internet":/Edg(?:e|A|iOS)?\//i.test(ua)?"Edge":/Firefox|FxiOS/i.test(ua)?"Firefox":/Chrome|CriOS/i.test(ua)?"Chrome":/Safari/i.test(ua)?"Safari":"Browser lain";
 return{device,browser};
}
export function summarizePresence(rows:unknown[][],now=Date.now()){
 const text=(v:unknown)=>String(v??"").trim();
 const people=new Map<string,{nik:string;name:string;lastSeen:string;online:boolean;device:string;browser:string;page:string}>();
 for(const row of rows){const nik=text(row[1]),lastSeen=text(row[3]),timestamp=Date.parse(lastSeen);if(!nik||Number.isNaN(timestamp))continue;
  const online=/^(true|1)$/i.test(text(row[4]))&&now-timestamp>=0&&now-timestamp<=PRESENCE_TTL_MS,previous=people.get(nik),person={nik,name:text(row[2])||nik,lastSeen,online,device:text(row[5]),browser:text(row[6]),page:text(row[7])};
  if(!previous||(online&&!previous.online)||(online===previous.online&&timestamp>Date.parse(previous.lastSeen)))people.set(nik,person);
 }
 const staff=[...people.values()].sort((a,b)=>Number(b.online)-Number(a.online)||Date.parse(b.lastSeen)-Date.parse(a.lastSeen));
 return{staff,totalOnline:staff.filter(p=>p.online).length,generatedAt:new Date(now).toISOString(),onlineWindowSeconds:PRESENCE_TTL_MS/1000};
}
