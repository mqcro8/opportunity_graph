import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";
import { GraphMark } from "@/components/graph-mark";
import "./globals.css";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Opportunity graph",
  description: "Find educational opportunities that actually match you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={newsreader.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Nav />
          <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">{children}</main>
          <footer className="border-t border-border">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
              <div className="flex items-center gap-2">
                <GraphMark />
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} Opportunity graph
                </p>
              </div>
              <nav className="flex items-center gap-6">
                <Link
                  href="/terms"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </nav>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
