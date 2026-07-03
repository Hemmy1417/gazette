import type { Metadata } from "next";
import { Playfair_Display, Lora, Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/genlayer/wallet";
import Nav from "@/components/Nav";
import { Wordmark } from "@/components/Stamp";

const playfair = Playfair_Display({
  weight: ["400", "700", "900"],
  variable: "--font-playfair",
  subsets: ["latin"],
});

const lora = Lora({
  weight: ["400", "500", "700"],
  variable: "--font-lora",
  subsets: ["latin"],
});

const inter = Inter({
  weight: ["400", "700"],
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gazette-alpha.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GAZETTE — The official record of the living web",
  description:
    "Witness any web page. GenLayer validators independently fetch it, AI attests what it said, and the record is permanent. Catch stealth edits, prove vanished sources.",
  openGraph: {
    title: "GAZETTE — The official record of the living web",
    description:
      "A permanent, verifiable record of what the web said — witnessed by validators, attested by AI, on GenLayer.",
    url: SITE_URL,
    siteName: "Gazette",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GAZETTE — The official record of the living web",
    description: "Witness any web page. Catch stealth edits. Prove vanished sources.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${lora.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        <WalletProvider>
          <Nav />
          <main style={{ flex: 1 }}>{children}</main>
          <footer style={{ background: "var(--ink)", color: "var(--canvas)", marginTop: 64 }}>
            <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between" }}>
              <div style={{ maxWidth: 320 }}>
                <span style={{ color: "var(--canvas)" }}><Wordmark size={26} /></span>
                <p className="sans-sm" style={{ color: "#b0b0b0", marginTop: 12 }}>
                  A permanent, verifiable record of what the web said — witnessed by
                  validators, attested by AI, on GenLayer.
                </p>
              </div>
              <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
                <div>
                  <div className="sans-sm-strong" style={{ color: "var(--canvas)", marginBottom: 10, textTransform: "uppercase" }}>The paper</div>
                  <a href="/witness" className="sans-sm" style={{ display: "block", color: "#b0b0b0", textDecoration: "none", marginBottom: 6 }}>Witness</a>
                  <a href="/records" className="sans-sm" style={{ display: "block", color: "#b0b0b0", textDecoration: "none", marginBottom: 6 }}>The Record</a>
                  <a href="/memory-hole" className="sans-sm" style={{ display: "block", color: "#b0b0b0", textDecoration: "none" }}>Memory Hole</a>
                </div>
                <div>
                  <div className="sans-sm-strong" style={{ color: "var(--canvas)", marginBottom: 10, textTransform: "uppercase" }}>Chain</div>
                  <span className="sans-sm" style={{ display: "block", color: "#b0b0b0" }}>GenLayer Studionet</span>
                  <span className="sans-sm" style={{ display: "block", color: "#b0b0b0" }}>Intelligent Oracle · Reader pattern</span>
                </div>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
