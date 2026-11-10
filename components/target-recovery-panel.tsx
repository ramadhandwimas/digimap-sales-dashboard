"use client";
import type {TargetRecovery,RecoveryStaff} from "@/lib/target-recovery";
type Category="amount"|"device"|"accessories"|"vas";
const labels={amount:"Total Sales",device:"Device",accessories:"ACC",vas:"VAS"};
const money=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
const adjustment=(v:number)=>`${v>0?"+":v<0?"−":""}${money(Math.abs(v))}`;
export default function TargetRecoveryPanel({plan,category="amount",staff}:{plan?:TargetRecovery;category?:Category;staff?:RecoveryStaff[]}){
 if(!plan)return null;
 const day=plan.days[0];
 return <section className="m238m-card m238m-recovery">
  <div className="m238m-section-head"><h2>Target Pengejaran · {labels[category]}</h2></div>
  <p>Data cutoff: {plan.cutoff||"Belum tersedia"}. Target bulanan tetap {money(plan.goal[category])}.</p>
  {plan.status!=="READY"||!day?<p role="status">{plan.message}</p>:<>
   <strong className="m238m-recovery-date">Berlaku {day.date}</strong>
   <dl><div><dt>Target awal</dt><dd>{money(day.base[category])}</dd></div><div><dt>{day.adjustment[category]<0?"Pengurangan dari surplus":"Tambahan pengejaran"}</dt><dd>{adjustment(day.adjustment[category])}</dd></div><div className="m238m-recovery-final"><dt>Target baru</dt><dd>{money(day.target[category])}</dd></div></dl>
   <small>Gap dibagi ke {plan.days.length} hari tersisa mengikuti bobot hari. Kelebihan Device tidak menutup kekurangan ACC/VAS. Target periode lalu tetap memakai rencana awal.</small>
   <details><summary>Lihat rencana sisa bulan</summary><div className="m238m-achievement-table"><table><thead><tr><th>Tanggal</th><th>Awal</th><th>Tambahan / Pengurangan</th><th>Target baru</th></tr></thead><tbody>{plan.days.map(row=><tr key={row.date}><td>{row.date}</td><td>{money(row.base[category])}</td><td>{adjustment(row.adjustment[category])}</td><td>{money(row.target[category])}</td></tr>)}</tbody></table></div></details>
   {staff?<details><summary>Target staff · {day.date}</summary>{staff.length?<div className="m238m-achievement-table"><table><thead><tr><th>Staff</th><th>Awal</th><th>Tambahan / Pengurangan</th><th>Target baru</th></tr></thead><tbody>{staff.map(row=><tr key={row.id}><td>{row.name}</td><td>{money(row.base[category])}</td><td>{adjustment(row.target[category]-row.base[category])}</td><td>{money(row.target[category])}</td></tr>)}</tbody></table></div>:<p>Jadwal staff tanggal ini belum tersedia. Alokasi target staff menunggu jadwal.</p>}</details>:null}
  </>}
 </section>;
}
