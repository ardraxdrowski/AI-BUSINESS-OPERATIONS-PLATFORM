import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "DareXAI - AI Business Operations Platform",
  description: "Secure, multi-tenant AI operations system with intelligent automation and conversational CRM orchestration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
