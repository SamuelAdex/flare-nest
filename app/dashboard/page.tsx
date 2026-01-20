"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Plus, Eye, Download, Search, Filter, Loader2, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

type Batch = {
    batchId: string;
    title: string;
    description: string;
    status: string;
    recipientCount: number;
    totalAmount: string;
    createdAt: string;
};

export default function Dashboard() {
    const { address, isConnected, hydrating } = useApp();
    const router = useRouter();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const duplicateBatch = async (batch: Batch) => {
        try {
            const res = await fetch(`/api/batches/${batch.batchId}/recipients`);
            const recipients = await res.json();

            localStorage.setItem("duplicate_batch", JSON.stringify({
                title: `${batch.title} (Copy)`,
                description: batch.description,
                recipients: recipients.map((r: any) => ({
                    id: Math.random().toString(),
                    address: r.address,
                    amount: r.amount,
                    memo: r.memo
                }))
            }));

            router.push("/batches/new");
        } catch (err) {
            console.error(err);
            alert("Failed to duplicate batch");
        }
    };

    useEffect(() => {
        const fetchBatches = async () => {
            if (!address) return;
            try {
                setLoading(true);
                const res = await fetch(`/api/batches?adminAddress=${address}`);
                const data = await res.json();
                setBatches(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch batches:", error);
            } finally {
                setLoading(false);
            }
        };

        if (isConnected && address) {
            fetchBatches();
        } else {
            setLoading(false);
        }
    }, [address, isConnected]);

    const filteredBatches = batches.filter(b =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.batchId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPaid = batches.reduce((acc, b) => acc + (parseFloat(b.totalAmount) || 0), 0);

    if (hydrating) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                <p className="text-secondary font-medium">Restoring session...</p>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="max-w-4xl mx-auto px-6 py-32 text-center">
                    <div className="glass p-12 rounded-[40px] border border-border">
                        <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand/10">
                            <svg className="w-10 h-10 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-black text-primary mb-4 italic tracking-tight">Access Restricted</h1>
                        <p className="text-secondary text-lg mb-10">You must connect your admin wallet to access the Flare Nest dashboard.</p>

                        <button
                            onClick={useApp().connectWallet}
                            className="px-12 py-5 bg-brand text-white font-bold rounded-2xl shadow-xl shadow-brand/20 hover:scale-105 transition-all text-xl"
                        >
                            Connect Wallet
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
                        <p className="text-secondary">Manage your payout batches and view historical records.</p>
                    </div>

                    <Link
                        href="/batches/new"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        New Payout Batch
                    </Link>
                </div>

                {/* Stats Summary (Extra Slickness) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                        { label: "Total Paid", value: `${totalPaid.toLocaleString()} FLR`, sub: "Across all anchored batches" },
                        { label: "Active Batches", value: batches.filter(b => b.status === 'DRAFT' || b.status === 'PROCESSING').length.toString(), sub: "In draft or execution" },
                        { label: "Saved Batches", value: batches.length.toString(), sub: "Total historical records" },
                    ].map((stat, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-surface border border-border">
                            <p className="text-secondary text-sm mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-primary mb-2">{stat.value}</h3>
                            <p className="text-brand text-xs">{stat.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Section B - Previous Batches */}
                <section className="rounded-2xl bg-surface border border-border overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <h2 className="text-xl font-bold text-primary">Previous Batches</h2>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                                <input
                                    type="text"
                                    placeholder="Search batches..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand/50 transition-all"
                                />
                            </div>
                            <button className="p-2 rounded-lg bg-background border border-border hover:bg-surface-hover transition-all text-secondary">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px] relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-surface/50">
                                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                            </div>
                        ) : !isConnected ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                <p className="text-secondary mb-4">Please connect your wallet to view your batches.</p>
                            </div>
                        ) : filteredBatches.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                <p className="text-secondary mb-4">No batches found.</p>
                                <Link href="/batches/new" className="text-brand font-bold hover:underline">Create your first batch</Link>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-background/50">
                                        <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Batch Name</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Recipients</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredBatches.map((batch, i) => (
                                        <motion.tr
                                            key={batch.batchId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="hover:bg-brand/5 transition-colors group"
                                        >
                                            <td className="px-6 py-4 font-medium text-primary">
                                                <div className="flex flex-col">
                                                    <span>{batch.title}</span>
                                                    <span className="text-[10px] text-secondary font-mono">{batch.batchId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-secondary text-sm">
                                                {new Date(batch.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-primary text-sm">{batch.recipientCount}</td>
                                            <td className="px-6 py-4 text-primary text-sm font-mono">{parseFloat(batch.totalAmount).toLocaleString()} FLR</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-medium border uppercase tracking-wider",
                                                    batch.status === "COMPLETED" || batch.status === "ANCHORED"
                                                        ? "bg-green-500/10 border-green-500/20 text-green-500"
                                                        : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                                )}>
                                                    {batch.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/batches/${batch.batchId}`}
                                                        className="p-2 rounded-lg hover:bg-surface border border-border text-secondary hover:text-primary transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => duplicateBatch(batch)}
                                                        className="p-2 rounded-lg hover:bg-brand/10 border border-border text-secondary hover:text-brand transition-all"
                                                        title="Duplicate Batch"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            if (confirm("Are you sure you want to delete this batch and all its data?")) {
                                                                try {
                                                                    const res = await fetch(`/api/batches/${batch.batchId}`, { method: 'DELETE' });
                                                                    if (res.ok) {
                                                                        setBatches(batches.filter(b => b.batchId !== batch.batchId));
                                                                    } else {
                                                                        alert("Failed to delete batch");
                                                                    }
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert("An error occurred while deleting");
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 border border-border hover:border-red-500/50 text-secondary hover:text-red-500 transition-all"
                                                        title="Delete Batch"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

