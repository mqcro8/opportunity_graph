import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Opportunity graph",
  description: "Find educational opportunities that actually match you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={newsreader.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
