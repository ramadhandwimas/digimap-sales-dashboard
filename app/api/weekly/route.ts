import { NextRequest, NextResponse } from "next/server";
import { getSheetRanges } from "@/lib/google-sheets";

const ID = "160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0";
const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown) => String(v ?? "").trim();
type Agg = { qty: number; amount: number };
type Side = {scheme: Record<string, Agg>;vas: Record<string, Agg>;lob: Record<string, Record<string, Agg>>};

export async function GET(req: NextRequest) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return NextResponse.json({ error: "Google Sheets belum dikonfigurasi" }, { status: 503 });

  const weekA = Number(req.nextUrl.searchParams.get("a") || 8);
  const weekB = Number(req.nextUrl.searchParams.get("b") || 9);
  const labelA=`Week ${weekA} Q4`,labelB=`Week ${weekB} Q4`;
  const [rows] = await getSheetRanges(ID, ["'Data Copas'!A2:S50000"], email, key);
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

  return NextResponse.json({weekA,weekB,labelA,labelB,...out},{headers:{"Cache-Control":"no-store"}});
}
