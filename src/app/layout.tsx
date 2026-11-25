import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaInstaller from "@/components/PwaInstaller";
import FallingLeavesEffect from "@/components/FallingLeavesEffect";

export const viewport: Viewport = {
  themeColor: "#000509",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "88XP",
  description: "88XP Employee Performance, Projects & Scoreboard Dashboard",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    shortcut: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "88XP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-manrope antialiased" suppressHydrationWarning>
        <PwaInstaller />
        <FallingLeavesEffect />
        {children}
      </body>
    </html>
  );
}

