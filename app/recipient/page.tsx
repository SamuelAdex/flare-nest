"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Search, Wallet, Download, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function RecipientPortal() {
    const [address, setAddress] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<any[] | null>(null);

    const handleSearch = async () => {
        if (!address) return;
        setIsSearching(true);
        setResults(null);
        try {
            const res = await fetch(`/api/payments?recipientAddress=${address}`);
            const data = await res.json();

            if (data.success && data.payments.length > 0) {
                // Fetch batch titles for these payments
                const paymentsWithBatches = await Promise.all(
                    data.payments.map(async (p: any) => {
                        try {
                            const bRes = await fetch(`/api/batches/${p.batchId}`);
                            if (!bRes.ok) throw new Error("Batch not found");
                            const bData = await bRes.json();
                            return {
                                ...p,
                                batchTitle: bData.batch?.title || "Unnamed Batch"
                            };
                        } catch (e) {
                            return { ...p, batchTitle: "Archived Batch" };
                        }
                    })
                );
                setResults(paymentsWithBatches);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error("Search error:", err);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-20 text-center">
                {!results ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass p-12 rounded-[40px] max-w-2xl mx-auto"
                    >
                        <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand/10">
                            <Wallet className="w-10 h-10 text-brand" />
                        </div>
                        <h1 className="text-4xl font-black text-primary mb-4 italic tracking-tight">Recipient Portal</h1>
                        <p className="text-secondary text-lg mb-10">Enter your wallet address to view and download your payment records anchored on Flare.</p>

                        <div className="relative mb-6">
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter your wallet address (0x...)"
                                className="w-full bg-surface border border-border rounded-2xl px-6 py-5 text-lg text-primary focus:outline-none focus:border-brand/50 transition-all font-mono"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={!address || isSearching}
                                className="absolute right-3 top-3 bottom-3 px-6 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2 group"
                            >
                                {isSearching ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        View My Payments
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-secondary text-sm">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Connected to Flare Network
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-left"
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h1 className="text-3xl font-bold text-primary mb-2">My Payments</h1>
                                <p className="text-secondary font-mono text-sm">{address || "0x8a23...3f1e"}</p>
                            </div>
                            <button
                                onClick={() => setResults(null)}
                                className="text-sm font-bold text-brand hover:underline"
                            >
                                Change Address
                            </button>
                        </div>

                        <div className="rounded-3xl bg-surface border border-border overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-background/20">
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Date</th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Batch</th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Amount</th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Proof</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {results.length > 0 ? (
                                        results.map((result, i) => (
                                            <motion.tr
                                                key={result.paymentId}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="hover:bg-brand/[0.02] transition-colors"
                                            >
                                                <td className="px-8 py-6 text-sm text-secondary font-medium">
                                                    {new Date(result.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-8 py-6 font-bold text-primary">{result.batchTitle}</td>
                                                <td className="px-8 py-6 font-black text-brand">{result.amount} FLR</td>
                                                <td className="px-8 py-6">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                                        result.status === "ANCHORED"
                                                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                                            : "bg-brand/10 text-brand border border-brand/20"
                                                    )}>
                                                        {result.status === "ANCHORED" ? "Anchored" : "Processing"}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Link
                                                        href={`/proof/${result.paymentId}`}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-lg transition-all"
                                                    >
                                                        <Search className="w-3.5 h-3.5" />
                                                        View Receipt
                                                    </Link>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-secondary font-medium">
                                                No payment records found for this address on Flare Network.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {results.length > 0 && (
                            <div className="mt-12 p-8 glass rounded-3xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center border",
                                        results.every(r => r.status === "ANCHORED")
                                            ? "bg-green-500/10 border-green-500/20"
                                            : "bg-brand/10 border-brand/20"
                                    )}>
                                        <CheckCircle2 className={cn(
                                            "w-6 h-6",
                                            results.every(r => r.status === "ANCHORED") ? "text-green-500" : "text-brand"
                                        )} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-primary">
                                            {results.every(r => r.status === "ANCHORED")
                                                ? "All records are anchored"
                                                : "Some records are being anchored"
                                            }
                                        </h3>
                                        <p className="text-secondary text-sm font-medium">
                                            {results.every(r => r.status === "ANCHORED")
                                                ? "Your data is secured on the Flare blockchain forever."
                                                : "Payments are sent. Flare anchoring is in progress."
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-green-500 bg-green-500/5 px-3 py-1.5 rounded-full border border-green-500/10">
                                    Verified on Coston2
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}
