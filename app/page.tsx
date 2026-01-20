"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Box, CheckCircle2, ShieldCheck, Wallet, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { serializeAddress } from "@/lib/utils";

export default function LandingPage() {

  const { connectWallet, address, isConnected, connecting } = useApp();
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 bg-brand flex items-center justify-center rounded-xl shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform">
            <Box className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">FlareNest</span>
        </div>

        {isConnected ? (
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-full bg-surface border border-border text-primary font-medium hover:border-brand/50 transition-all active:scale-95"
          >
            Go to Dashboard
          </Link>

        ) : (
          <button
            onClick={connectWallet}
            className="px-5 py-2.5 rounded-full bg-surface border border-border text-primary font-medium hover:border-brand/50 transition-all active:scale-95"
          >
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 px-6 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-semibold mb-6">
            The Standard for Flare Payouts
          </span>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Batch payouts on Flare with 
            <span className="text-brand"> audit-grade</span> records.
          </h1>
          <p className="text-secondary text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Simple, secure, and verifiable. The easiest way to manage multi-address payouts
            without the blockchain noise.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            {isConnected ? (
              <Link href={"/dashboard"} className="px-8 py-5 rounded-full bg-brand hover:bg-brand/90 text-white font-bold text-lg flex items-center gap-2 transition-all shadow-lg shadow-brand/20 hover:translate-y-[-2px] active:scale-95 group">
                <Wallet className="w-4 h-4 text-secondary" />
                <span className="text-sm font-mono text-primary">{serializeAddress(address!)}</span>
              </Link>
            ) : (
              <button
                onClick={connectWallet}
                className="px-8 py-4 rounded-full bg-brand hover:bg-brand/90 text-white font-bold text-lg flex items-center gap-2 transition-all shadow-lg shadow-brand/20 hover:translate-y-[-2px] active:scale-95 group"
              >
                {connecting ? "Connecting..." : "Connect Wallet"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            <Link
              href="/recipient"
              className="px-8 py-4 rounded-full bg-surface border border-border hover:border-secondary text-primary font-semibold text-lg transition-all active:scale-95"
            >
              Recipient Portal
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              {
                icon: <Zap className="w-6 h-6 text-brand" />,
                title: "One-Flow Payouts",
                description: "Pay hundreds of recipients in a single, streamlined transaction flow."
              },
              {
                icon: <ShieldCheck className="w-6 h-6 text-brand" />,
                title: "ISO-Aligned Records",
                description: "Automatic generation of payment receipts compatible with standard audits."
              },
              {
                icon: <CheckCircle2 className="w-6 h-6 text-brand" />,
                title: "Flare Verifiable",
                description: "Every payment is anchored and verifiable on the Flare network forever."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                className="p-6 rounded-2xl bg-surface border border-border group hover:border-brand/30 transition-all hover:bg-surface-hover"
              >
                <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center mb-4 border border-border group-hover:border-brand/20 transition-all">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-secondary leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 flex flex-col items-center border-t border-white/5 mt-20">
        <p className="text-secondary text-sm">
          Built for the Flare Network Ecosystem. © 2026 FlareNest.
        </p>
      </footer>
    </div>
  );
}
