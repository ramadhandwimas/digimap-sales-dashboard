const normalize=(value:unknown)=>String(value??"").toUpperCase().replace(/\s+/g," ").trim();

export const M238_FOCUS_PRODUCTS=[
  "iPhone 18 Pro Max","iPhone 18 Pro","iPhone Duo","iPhone 18","iPhone Air",
  "iPhone 17 Pro Max","iPhone 17 Pro","iPhone 17","iPhone 16","iPhone 15",
  "MacBook Neo","MacBook Air M5","MacBook Air M4","MacBook Pro M5","MacBook Pro M4",
  "iPad 11","iPad Air 11 M4","iPad Air 13 M4","iPad Pro 11","iPad Pro 13","iPad mini",
  "Apple Watch Series 11","Apple Watch SE 3","Apple Watch Ultra 3",
  "AirPods Pro 3","AirPods 4 ANC","AirPods 4",
] as const;

export type M238FocusProduct=(typeof M238_FOCUS_PRODUCTS)[number];

export function m238FocusProductName(type:string,description:string,category:string):M238FocusProduct|""{
  const text=normalize(`${type} ${description} ${category}`);

  if(/IPHONE\s*DUO|\bDUO\b/.test(text))return"iPhone Duo";
  if(/IPHONE\s*18\s*PRO\s*MAX/.test(text))return"iPhone 18 Pro Max";
  if(/IPHONE\s*18\s*PRO/.test(text))return"iPhone 18 Pro";
  if(/IPHONE\s*18(?!\s*PRO)/.test(text))return"iPhone 18";
  if(/IPHONE\s*AIR/.test(text))return"iPhone Air";
  if(/IPHONE\s*17\s*PRO\s*MAX/.test(text))return"iPhone 17 Pro Max";
  if(/IPHONE\s*17\s*PRO/.test(text))return"iPhone 17 Pro";
  if(/IPHONE\s*17(?!\s*PRO)/.test(text))return"iPhone 17";
  if(/IPHONE\s*16/.test(text))return"iPhone 16";
  if(/IPHONE\s*15/.test(text))return"iPhone 15";

  if(/MACBOOK.*NEO|\bMBN\b/.test(text))return"MacBook Neo";
  if(/MACBOOK\s*AIR.*M5|MBA.*M5/.test(text))return"MacBook Air M5";
  if(/MACBOOK\s*AIR.*M4|MBA.*M4/.test(text))return"MacBook Air M4";
  if(/MACBOOK\s*PRO.*M5|MBP.*M5/.test(text))return"MacBook Pro M5";
  if(/MACBOOK\s*PRO.*M4|MBP.*M4/.test(text))return"MacBook Pro M4";

  if(/IPAD\s*AIR.*13.*M4/.test(text))return"iPad Air 13 M4";
  if(/IPAD\s*AIR.*11.*M4/.test(text))return"iPad Air 11 M4";
  if(/IPAD\s*PRO.*13/.test(text))return"iPad Pro 13";
  if(/IPAD\s*PRO.*11/.test(text))return"iPad Pro 11";
  if(/IPAD\s*MINI/.test(text))return"iPad mini";
  if(/\bIPAD\s*(?:11|11TH)\b/.test(text))return"iPad 11";

  if(/WATCH.*ULTRA.*3|AW.*ULTRA.*3/.test(text))return"Apple Watch Ultra 3";
  if(/WATCH.*SE.*3|AW.*SE.*3/.test(text))return"Apple Watch SE 3";
  if(/WATCH.*SERIES.*11|WATCH.*S11|AW.*S11/.test(text))return"Apple Watch Series 11";

  if(/AIRPODS.*PRO.*3|APP.*PRO.*3/.test(text))return"AirPods Pro 3";
  if(/AIRPODS.*4.*ANC|AIRPODS.*ANC.*4/.test(text))return"AirPods 4 ANC";
  if(/AIRPODS.*4/.test(text))return"AirPods 4";
  return"";
}
