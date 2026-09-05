import { NextRequest, NextResponse } from "next/server";
import { getSheetRanges } from "@/lib/google-sheets";

const ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => String(v ?? "").trim();
type Agg = { qty: number; amount: number };
type Side = {scheme: Record<string, Agg>;vas: Record<string, Agg>;lob: Record<string, Record<string, Agg>>};
const total=(values:Record<string,Agg>={})=>Object.values(values).reduce((sum,value)=>({qty:sum.qty+value.qty,amount:sum.amount+value.amount}),{qty:0,amount:0});
const lobNames:Record<string,string>={AIRPODS:"AirPods",IPHONE:"iPhone",MAC:"MacBook",IPAD:"iPad","APPLE WATCH":"Watch"};
function reason(lob:string,previous:Record<string,Agg>={},current:Record<string,Agg>={},labelA:string,labelB:string){const a=total(previous),b=total(current),qtyDiff=b.qty-a.qty,qtyGrowth=a.qty?qtyDiff/a.qty*100:0,amountDiff=b.amount-a.amount,amountGrowth=a.amount?amountDiff/a.amount*100:0,name=lobNames[lob]??lob;if(!a.qty&&!b.qty)return`Belum ada penjualan ${name} pada ${labelA} dan ${labelB}.`;const movement=!a.qty?`mulai mencatat penjualan ${b.qty} unit, sementara pada ${labelA} belum ada penjualan`:qtyDiff>0?`mengalami kenaikan ${Math.abs(qtyGrowth).toFixed(0)}% menjadi ${b.qty} unit`:qtyDiff<0?`mengalami penurunan ${Math.abs(qtyGrowth).toFixed(0)}% menjadi ${b.qty} unit`:`stabil di ${b.qty} unit`;const types=[...new Set([...Object.keys(previous),...Object.keys(current)])].map(type=>({type,diff:(current[type]?.qty??0)-(previous[type]?.qty??0)})).filter(item=>item.diff!==0),up=types.filter(item=>item.diff>0).sort((x,y)=>y.diff-x.diff)[0],down=types.filter(item=>item.diff<0).sort((x,y)=>x.diff-y.diff)[0],details=[up?`${up.type} yang naik ${up.diff} unit`:"",down?`${down.type} yang turun ${Math.abs(down.diff)} unit`:""].filter(Boolean),detailSentence=details.length?` Perubahan terbesar terjadi pada ${details.join(", sedangkan ")}.`:"";const unitSummary=qtyDiff>0?`Secara total plus ${qtyDiff} unit`:qtyDiff<0?`Secara total minus ${Math.abs(qtyDiff)} unit`:"Secara total tidak ada perubahan qty",amountSummary=a.amount?`dengan pertumbuhan amount ${amountDiff>=0?"+":""}${amountGrowth.toFixed(0)}%`:b.amount?"dan mulai memberikan kontribusi amount pada week ini":"";return`Penjualan ${name} pada ${labelB} ${movement} dibanding ${labelA}.${detailSentence} ${unitSummary} ${amountSummary}.`.replace(/\s+/g," ").trim()}

export async function GET(req: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return NextResponse.json({ error: "Google Sheets belum dikonfigurasi" }, { status: 503 });

  const [rows] = await getSheetRanges(ID, ["'Data Copas'!A2:S50000"], email, key);
  const available=[...new Set(rows.filter(row=>s(row[15])==="M238"&&s(row[18])==="2026"&&/^Week \d+ Q\d+$/i.test(s(row[14]))).map(row=>s(row[14])))],latest=available.slice(-2),labelA=latest[0]??"Week 1 Q4",labelB=latest[1]??latest[0]??"Week 2 Q4",parseLabel=(label:string)=>{const match=label.match(/Week (\d+) Q(\d+)/i);return{week:Number(match?.[1]??0),quarter:Number(match?.[2]??0)}},parsedA=parseLabel(labelA),parsedB=parseLabel(labelB),weekA=parsedA.week,weekB=parsedB.week;
  const emptySide = (): Side => ({ scheme: {}, vas: {}, lob: {} });
  const out: { a: Side; b: Side } = { a: emptySide(), b: emptySide() };
  const add=(target:Record<string,Agg>,name:string,qty:number,amount:number)=>{target[name]??={qty:0,amount:0};target[name].qty+=qty;target[name].amount+=amount};

  for (const row of rows) {
    if (s(row[15]) !== "M238" || s(row[18]) !== "2026") continue;
    const weekLabel=s(row[14]);
    const side=weekLabel===labelA?out.a:weekLabel===labelB?out.b:null;
    if(!side)continue;

    const qty=n(row[7]),amount=n(row[8]),type=s(row[6]),description=s(row[5]),category=s(row[9]).toUpperCase(),brand=s(row[10]).toUpperCase(),scheme=s(row[12]).toUpperCase();
    if (scheme === "DEVICES") add(side.scheme, "DEVICE", qty, amount);
    else if (scheme === "VAS") add(side.scheme, "VAS", qty, amount);
    else if (scheme === "ACCESSORIES") add(side.scheme, "ACC", qty, amount);

    const vasText=`${brand} ${description}`.toUpperCase();
    if(scheme==="VAS"&&/QOALA|TELKOMSEL|INDOSAT|XL|XXL/.test(vasText)){
      const vas=/QOALA/.test(vasText)?"QOALA":/TELKOMSEL/.test(vasText)?"TELKOMSEL":/INDOSAT/.test(vasText)?"INDOSAT":"XL";
      add(side.vas,vas,qty,amount)
    }

    const lob=/AIRPOD/.test(category)?"AIRPODS":category==="IPHONE"?"IPHONE":category==="IPAD"?"IPAD":category==="MAC"?"MAC":/WATCH/.test(category)?"APPLE WATCH":"";
    if(lob){side.lob[lob]??={};add(side.lob[lob],type||description||category,qty,amount)}
  }

  const reasons=Object.fromEntries(Object.keys(lobNames).map(lob=>[lob,reason(lob,out.a.lob[lob],out.b.lob[lob],labelA,labelB)]));
  return NextResponse.json({weekA,weekB,quarterA:parsedA.quarter,quarterB:parsedB.quarter,labelA,labelB,availableWeeks:available,...out,reasons},{headers:{"Cache-Control":"no-store"}});
}
