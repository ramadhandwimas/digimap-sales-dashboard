import type { Metadata, Viewport } from "next";
import "./globals.css";
import IdleLogout from "@/components/idle-logout";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
  const themeInit = `
    try {
      var saved = localStorage.getItem("m238-theme");
      var dark = saved === "dark";
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      var style = localStorage.getItem("m238-style") || "worklife";
      if (!["classic","natural","worklife","happiness","premium"].includes(style)) style = "worklife";
      document.documentElement.dataset.m238DashboardTheme = style;
    } catch (_) {}
  `;

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="m238-apple-ui antialiased"><IdleLogout/>{children}</body>
    </html>
  );
}
