import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anforderungsportal",
  description: "Professional requirement collection platform by WAMOCON GmbH",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Anforderungsportal",
    description: "AI-powered requirement collection with voice input, smart forms, and 25 languages.",
    siteName: "Anforderungsportal",
    type: "website",
  },
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
