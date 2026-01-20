import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flare Nest | Batch Payouts on Flare",
  description: "Batch payouts on Flare with audit-grade payment records. Pay multiple recipients in one flow with verifiable results.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased selection:bg-brand/30`}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
