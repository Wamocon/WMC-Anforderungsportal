import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WMC Anforderungsportal",
  description: "Professional requirement collection platform by WAMOCON",
};

// This root layout only provides the html/body shell.
// The actual layout with i18n is in [locale]/layout.tsx.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
