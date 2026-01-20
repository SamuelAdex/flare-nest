"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
    ArrowLeft,
    Download,
    ShieldCheck,
    Calendar,
    Users,
    Wallet,
    CheckCircle2,
    Loader2,
    Clock,
    Plus,
    X,
    Play,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { nanoid } from "nanoid";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Batch = {
    batchId: string;
    title: string;
    description: string;
    status: string;
    recipientCount: number;
    totalAmount: string;
    adminAddress: string;
    createdAt: string;
};

type Payment = {
    paymentId: string;
    recipientAddress: string;
    amount: string;
    memo?: string;
    status: string;
    txHash: string;
    anchorTxHash?: string;
    proofReference?: string;
};

type Recipient = {
    _id: string;
    address: string;
    amount: string;
    memo?: string;
};

export default function BatchDetails() {
    const params = useParams();
    const batchId = params.id as string;
    const { address, isConnected, hydrating, sendFLR, anchorProof } = useApp();

    if (hydrating) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                <p className="text-secondary font-medium">Verifying authorization...</p>
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
                            <ShieldCheck className="w-10 h-10 text-brand" />
                        </div>
                        <h1 className="text-4xl font-black text-primary mb-4 italic tracking-tight">Access Restricted</h1>
                        <p className="text-secondary text-lg mb-10">Please connect your authorized admin wallet to manage this batch.</p>

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

    const [batch, setBatch] = useState<Batch | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newRecipient, setNewRecipient] = useState({ address: "", amount: "", memo: "" });
    const [isAdding, setIsAdding] = useState(false);

    // Execution States
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionProgress, setExecutionProgress] = useState<Record<string, "pending" | "paying" | "proofing" | "anchoring" | "sent" | "failed">>({});
    const [overallStatus, setOverallStatus] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!batchId) return;
        try {
            // Fetch Batch Info
            const bRes = await fetch(`/api/batches/${batchId}`);
            const bData = await bRes.json();
            setBatch(bData);

            // Fetch Payments (if already executed)
            const pRes = await fetch(`/api/batches/${batchId}/payments`);
            const pData = await pRes.json();
            setPayments(pData.payments || []);

            // Fetch Recipients (for draft list)
            const rRes = await fetch(`/api/batches/${batchId}/recipients`);
            const rData = await rRes.json();
            setRecipients(rData || []);
        } catch (error) {
            console.error("Failed to fetch batch details:", error);
        } finally {
            setLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const removeRecipient = async (recipientId: string) => {
        if (!confirm("Remove this recipient?")) return;
        try {
            const res = await fetch(`/api/batches/${batchId}/recipients/${recipientId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                await fetchData();
            } else {
                alert("Failed to remove recipient");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddRecipient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecipient.address || !newRecipient.amount) return;

        setIsAdding(true);
        try {
            const res = await fetch(`/api/batches/${batchId}/recipients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([newRecipient]),
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setNewRecipient({ address: "", amount: "", memo: "" });
                await fetchData(); // Refresh data
            } else {
                alert("Failed to add recipient");
            }
        } catch (err) {
            console.error(err);
            alert("Error adding recipient");
        } finally {
            setIsAdding(false);
        }
    };

    const startExecution = async () => {
        if (!address) {
            alert("Please connect your wallet first");
            return;
        }

        if (!confirm("Are you sure you want to start the payout for this batch? This will trigger blockchain transactions.")) {
            return;
        }

        setIsExecuting(true);
        setOverallStatus("Processing Payouts...");

        // Update batch status to PROCESSING
        await fetch(`/api/batches/${batchId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "PROCESSING" }),
        });

        const progress: Record<string, "pending" | "paying" | "proofing" | "anchoring" | "sent" | "failed"> = {};
        recipients.forEach(r => progress[r._id] = "pending");
        setExecutionProgress(progress);

        for (const r of recipients) {
            try {
                setExecutionProgress(prev => ({ ...prev, [r._id]: "paying" }));

                // 1. FLR Transfer
                const txHash = await sendFLR(r.address, r.amount);
                const paymentId = `pay_${nanoid(10)}`;

                // 2. Record Payment
                await fetch("/api/payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        paymentId,
                        batchId,
                        adminAddress: address,
                        recipientAddress: r.address,
                        amount: r.amount,
                        txHash,
                        memo: r.memo,
                    }),
                });

                setExecutionProgress(prev => ({ ...prev, [r._id]: "proofing" }));

                // 3. Generate Proof
                const proofRes = await fetch(`/api/payments/${paymentId}/proof`, {
                    method: "POST",
                });
                const proofData = await proofRes.json();
                if (!proofData.success) throw new Error(proofData.error || "Proof generation failed");

                setExecutionProgress(prev => ({ ...prev, [r._id]: "anchoring" }));

                // 4. Anchor Proof
                const anchorTxHash = await anchorProof(batchId, paymentId, proofData.proofReference);

                // 5. Update Anchor in DB
                await fetch(`/api/payments/${paymentId}/anchor`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ anchorTxHash }),
                });

                setExecutionProgress(prev => ({ ...prev, [r._id]: "sent" }));
            } catch (err) {
                console.error(`Execution error for ${r.address}:`, err);
                setExecutionProgress(prev => ({ ...prev, [r._id]: "failed" }));
            }
        }

        // Finalize Batch Status
        await fetch(`/api/batches/${batchId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ANCHORED" }),
        });

        setOverallStatus("Payout Completed!");
        setIsExecuting(false);
        await fetchData(); // Final refresh
    };

    const downloadBatchReport = () => {
        if (!batch) return;

        const headers = ["Recipient Address", "Amount (FLR)", "Memo", "Status", "Transaction Hash", "Proof Reference"];
        const rows = batch.status === "ANCHORED"
            ? payments.map(p => [
                p.recipientAddress,
                p.amount,
                p.memo || "",
                p.status,
                p.txHash,
                p.proofReference || ""
            ])
            : recipients.map(r => [
                r.address,
                r.amount,
                r.memo || "",
                "DRAFT",
                "",
                ""
            ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `batch_report_${batch.batchId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generatePDFReceipt = () => {
        if (!batch) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(249, 115, 22); // Brand color (Orange)
        doc.text("Batch Payout Receipt", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

        // Batch Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Batch Information", 14, 45);

        const infoData = [
            ["Batch Name:", batch.title],
            ["Batch ID:", batch.batchId],
            ["Admin Wallet:", batch.adminAddress],
            ["Total Paid:", `${batch.totalAmount} FLR`],
            ["Total Recipients:", batch.recipientCount.toString()],
            ["Status:", batch.status],
        ];

        autoTable(doc, {
            startY: 50,
            body: infoData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
        });

        // Payments Table
        doc.text("Payment Verification Records", 14, (doc as any).lastAutoTable.finalY + 15);

        const tableHeaders = [["Recipient", "Amount (FLR)", "Memo", "Status", "Proof Ref"]];
        const tableRows = batch.status === "ANCHORED"
            ? payments.map(p => [
                `${p.recipientAddress.substring(0, 10)}...`,
                p.amount,
                p.memo || "-",
                p.status,
                p.proofReference || "Pending"
            ])
            : recipients.map(r => [
                `${r.address.substring(0, 10)}...`,
                r.amount,
                r.memo || "-",
                "DRAFT",
                "N/A"
            ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: tableHeaders,
            body: tableRows,
            headStyles: { fillColor: [249, 115, 22] },
            styles: { fontSize: 9 }
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Flare Nest - Cryptographically Verified Payments - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
        }

        doc.save(`batch_receipt_${batch.batchId}.pdf`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                <p className="text-secondary font-medium">Loading batch details...</p>
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="max-w-7xl mx-auto px-6 py-12 text-center">
                    <h1 className="text-2xl font-bold text-primary mb-4">Batch Not Found</h1>
                    <Link href="/dashboard" className="text-brand hover:underline">Return to Dashboard</Link>
                </main>
            </div>
        );
    }

    const isDraft = batch.status === "DRAFT";
    const isProcessing = batch.status === "PROCESSING" || isExecuting;

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-12">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-all mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>

                {/* Section A - Batch Overview */}
                <section className="glass p-8 rounded-3xl mb-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 flex flex-col items-end gap-4">
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 border rounded-full font-bold text-sm",
                            batch.status === "ANCHORED" || batch.status === "COMPLETED"
                                ? "bg-green-500/10 border-green-500/20 text-green-500"
                                : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                        )}>
                            {batch.status === "ANCHORED" ? (
                                <ShieldCheck className="w-4 h-4" />
                            ) : (
                                <Clock className="w-4 h-4" />
                            )}
                            {batch.status === "ANCHORED" ? "Anchored on Flare" : batch.status}
                        </div>

                        {isDraft && (
                            <button
                                onClick={startExecution}
                                disabled={isExecuting || recipients.length === 0}
                                className="flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExecuting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Play className="w-5 h-5 fill-current" />
                                )}
                                {isExecuting ? "Executing..." : "Execute Payout"}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-12">
                        <div>
                            <h1 className="text-4xl font-extrabold text-primary mb-2">{batch.title}</h1>
                            <p className="text-secondary mb-8 max-w-2xl">{batch.description || "No description provided."}</p>

                            <div className="flex flex-wrap gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-secondary uppercase">Date</p>
                                        <p className="text-sm font-semibold text-primary">
                                            {new Date(batch.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                                        <Users className="w-5 h-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-secondary uppercase">Recipients</p>
                                        <p className="text-sm font-semibold text-primary">{batch.recipientCount} Addresses</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-secondary uppercase">Admin Wallet</p>
                                        <p className="text-sm font-semibold text-primary">
                                            {batch.adminAddress?.substring(0, 6)}...{batch.adminAddress?.substring(38)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:ml-auto flex flex-col items-center justify-center p-8 bg-brand/5 border border-brand/20 rounded-2xl min-w-[200px]">
                            <p className="text-secondary text-sm font-bold uppercase mb-1">Total Amount</p>
                            <p className="text-4xl font-black text-brand">{parseFloat(batch.totalAmount).toLocaleString()}</p>
                            <p className="text-sm font-bold text-brand/70 uppercase tracking-widest mt-1">FLR</p>
                        </div>
                    </div>
                </section>

                {/* Section B - Payments/Recipients Table */}
                <div className="rounded-3xl bg-surface border border-border overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold">{batch.status === "ANCHORED" ? "Payment History" : "Execution List"}</h2>
                            {isDraft && !isExecuting && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 rounded-lg transition-all text-sm font-bold"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Recipient
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {isExecuting && (
                                <div className="flex items-center gap-3 px-4 py-2 bg-brand/5 rounded-xl border border-brand/10">
                                    <Loader2 className="w-4 h-4 text-brand animate-spin" />
                                    <span className="text-sm font-bold text-brand">{overallStatus}</span>
                                </div>
                            )}
                            <button
                                onClick={generatePDFReceipt}
                                className="flex items-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 rounded-xl transition-all font-bold"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                Admin PDF Receipt
                            </button>
                            <button
                                onClick={downloadBatchReport}
                                className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-xl transition-all font-semibold text-secondary hover:text-primary"
                            >
                                <Download className="w-5 h-5" />
                                Batch Report
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        {recipients.length === 0 && payments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                <AlertCircle className="w-12 h-12 text-secondary/30 mb-4" />
                                <p className="text-secondary italic">No recipients added to this batch yet.</p>
                                {isDraft && (
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="mt-4 text-brand font-bold hover:underline"
                                    >
                                        Add your first recipient
                                    </button>
                                )}
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-background/20">
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Recipient</th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Amount</th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Memo</th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">
                                            {batch.status === "ANCHORED" ? "Proof" : "Status"}
                                        </th>
                                        <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">
                                            {batch.status === "ANCHORED" ? "Anchor" : "Action"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {/* Mapped view changes based on status */}
                                    {batch.status === "ANCHORED" ? (
                                        payments.map((payment, i) => (
                                            <motion.tr
                                                key={payment.paymentId}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="hover:bg-brand/[0.02] transition-colors"
                                            >
                                                <td className="px-8 py-5 font-mono text-sm text-primary">
                                                    {payment.recipientAddress.substring(0, 10)}...{payment.recipientAddress.substring(38)}
                                                </td>
                                                <td className="px-8 py-5 font-bold text-brand">{parseFloat(payment.amount).toLocaleString()} FLR</td>
                                                <td className="px-8 py-5 text-secondary">{payment.memo || "-"}</td>
                                                <td className="px-8 py-5">
                                                    {payment.proofReference ? (
                                                        <Link
                                                            href={`/proof/${payment.paymentId}`}
                                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                            View Proof
                                                        </Link>
                                                    ) : (
                                                        <span className="text-secondary text-xs italic">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-500">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Verified
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        recipients.map((r, i) => (
                                            <tr key={r._id} className="hover:bg-brand/[0.02] transition-colors">
                                                <td className="px-8 py-5 font-mono text-sm text-primary">
                                                    {r.address.substring(0, 10)}...{r.address.substring(38)}
                                                </td>
                                                <td className="px-8 py-5 font-bold text-brand">{parseFloat(r.amount).toLocaleString()} FLR</td>
                                                <td className="px-8 py-5 text-secondary">{r.memo || "-"}</td>
                                                <td className="px-8 py-5">
                                                    {executionProgress[r._id] ? (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-brand">
                                                            {executionProgress[r._id] !== "sent" && executionProgress[r._id] !== "failed" && (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            )}
                                                            <span className="capitalize">{executionProgress[r._id]}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-secondary text-xs italic">Ready</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5">
                                                    {executionProgress[r._id] === "sent" ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    ) : isExecuting ? (
                                                        <Clock className="w-5 h-5 text-secondary animate-pulse" />
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => removeRecipient(r._id)}
                                                                className="p-2 hover:bg-red-500/10 text-secondary hover:text-red-500 rounded-lg transition-all"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Add Recipient Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-surface border border-border p-8 rounded-3xl shadow-2xl"
                        >
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-background text-secondary transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-2xl font-bold text-primary mb-6">Add Recipient</h3>

                            <form onSubmit={handleAddRecipient} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Recipient Address</label>
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        value={newRecipient.address}
                                        onChange={(e) => setNewRecipient({ ...newRecipient, address: e.target.value })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-brand/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Amount (FLR)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={newRecipient.amount}
                                        onChange={(e) => setNewRecipient({ ...newRecipient, amount: e.target.value })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-brand/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">Memo (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Design Work"
                                        value={newRecipient.memo}
                                        onChange={(e) => setNewRecipient({ ...newRecipient, memo: e.target.value })}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-brand/50"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="w-full py-4 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add to Batch"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

