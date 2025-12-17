import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Employee Dashboard",
  description: "Employee project management and scoreboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
