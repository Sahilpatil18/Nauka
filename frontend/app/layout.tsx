import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nauka",
  description: "Phase 1 web portal — vendors, buyers, cooperatives, and ocean intelligence for Maharashtra's marine sector",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <SessionProvider>
          <Nav />
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
          <footer className="border-t border-slate-200 py-6">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 text-xs text-slate-400">
              Nauka — Phase 1 · Maharashtra marine sector platform
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
