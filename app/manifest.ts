import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"M238 Sales Dashboard",
    short_name:"M238 Dashboard",
    description:"Dashboard penjualan dan performa Digimap Pondok Indah Mall 2 (M238).",
    start_url:"/",
    scope:"/",
    display:"standalone",
    background_color:"#f8fafc",
    theme_color:"#0f3b66",
    orientation:"any",
    lang:"id-ID",
    categories:["business","productivity"],
    icons:[
      {src:"/pwa-icon/192",sizes:"192x192",type:"image/png",purpose:"any"},
      {src:"/pwa-icon/512",sizes:"512x512",type:"image/png",purpose:"any"},
      {src:"/pwa-icon/512",sizes:"512x512",type:"image/png",purpose:"maskable"},
    ],
  };
}
