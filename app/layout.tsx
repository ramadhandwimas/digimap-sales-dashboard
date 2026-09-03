import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={
 title:"Jakarta 1 Area Dashboard",
 description:"Dashboard performance Area Jakarta 1 untuk monitoring 9 store Digimap.",
 icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="id" suppressHydrationWarning><body className="antialiased">{children}</body></html>;
}
