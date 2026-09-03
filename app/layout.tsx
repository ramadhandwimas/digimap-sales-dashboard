import type { Metadata } from "next";
import ThemePicker from "@/components/theme-picker";
import "./globals.css";

export const metadata: Metadata = {
  title: "M238 Digimap Pondok Indah Mall 2",
  description: "Dashboard Daily Sales, Daily Summary, dan Staff Performance M238 Digimap PIM 2.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">{children}<ThemePicker/></body>
    </html>
  );
}
