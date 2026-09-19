import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"M238 Dashboard PIM 2",
    short_name:"M238",
    description:"Retail performance dashboard M238 Digimap PIM 2",
    start_url:"/",
    display:"standalone",
    background_color:"#030712",
    theme_color:"#030712",
    orientation:"portrait",
    icons:[
      {src:"/favicon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"}
    ]
  };
}
