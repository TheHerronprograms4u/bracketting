import type { Metadata } from "next";
import localFont from "next/font/local";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACCeSS ARENA — Dynamic Tournament Bracketing Platform",
  description:
    "Every Match Matters. ACCeSS ARENA — High-performance dynamic tournament bracketing engine with arbitrary participant counts, automatic bye progression, and cinematic elimination effects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} font-sans antialiased text-arena-text min-h-screen flex flex-col`}
      >
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
