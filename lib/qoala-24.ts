// Qoala Qomplete regular premiums, 24 months only (not promotional 12-get-24).
// Provider tier table: https://docs.google.com/presentation/d/1CvVp3MjeNZ4xG-FQda3EIuECGZwRlNXYi0_x2P0IQ7U/edit
// Silver through Titanium premiums also cross-checked against Data Copas, 2026-11-04.
export const QOALA_24_TIERS=[
 {name:"Bronze",min:800000,max:3000000,premium:280000},
 {name:"Silver",min:3000001,max:5000000,premium:490000},
 {name:"Gold",min:5000001,max:10000000,premium:700000},
 {name:"Emerald",min:10000001,max:20000000,premium:1315000},
 {name:"Diamond",min:20000001,max:25000000,premium:1970000},
 {name:"Platinum",min:25000001,max:35000000,premium:2645000},
 {name:"Titanium",min:35000001,max:50000000,premium:3735000},
 {name:"VVIP",min:50000001,max:65000000,premium:5065000},
] as const;
export function qoala24Quote(devicePrice:number){
 if(!Number.isFinite(devicePrice)||devicePrice<=0)return null;
 const tier=QOALA_24_TIERS.find(t=>devicePrice>=t.min&&devicePrice<=t.max);
 if(!tier)return null;
 const total=devicePrice+tier.premium;
 return {...tier,devicePrice,total,monthly12:Math.round(total/12),monthly24:Math.round(total/24)};
}
