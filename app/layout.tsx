import type {Metadata,Viewport} from "next";
import PwaRegister from "@/components/pwa-register";
import "./globals.css";

export const metadata:Metadata={
  title:"M238 Sales Dashboard",
  description:"Dashboard Daily Sales, Daily Summary, Feedback, CX/Member, dan Staff Performance M238 Digimap PIM 2.",
  applicationName:"M238 Sales Dashboard",
  manifest:"/manifest.webmanifest",
  appleWebApp:{
    capable:true,
    statusBarStyle:"black-translucent",
    title:"M238 Dashboard",
  },
  icons:{
    icon:"/favicon.svg",
    shortcut:"/favicon.svg",
    apple:"/pwa-icon/192",
  },
};

export const viewport:Viewport={
  themeColor:"#0f3b66",
  width:"device-width",
  initialScale:1,
  viewportFit:"cover",
};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="id"><body className="antialiased"><PwaRegister/>{children}</body></html>;
}
