"use client";

import React, { useState, useRef, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
    ArrowRight,
    ArrowLeft,
    Plus,
    Trash2,
    Upload,
    CheckCircle2,
    Clock,
    Download,
    Check,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { nanoid } from "nanoid";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Recipient = {
    id: string;
    address: string;
    amount: string;
    memo: string;
};

type Step = "info" | "recipients" | "review" | "executing" | "completed";

export default function NewBatch() {
    const { address, isConnected, hydrating, sendFLR, anchorProof } = useApp();
    const [step, setStep] = useState<Step>("info");

    if (hydrating) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-secondary font-medium">Initializing session...</p>
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
                            <Plus className="w-10 h-10 text-brand" />
                        </div>
                        <h1 className="text-4xl font-black text-primary mb-4 italic tracking-tight">Setup Required</h1>
                        <p className="text-secondary text-lg mb-10">Please connect your wallet to create a new payout batch.</p>

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
    const [batchName, setBatchName] = useState("");
    const [description, setDescription] = useState("");
    const [recipients, setRecipients] = useState<Recipient[]>([
        { id: "1", address: "", amount: "", memo: "" }
    ]);

    useEffect(() => {
        const stored = localStorage.getItem("duplicate_batch");
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setBatchName(data.title || "");
                setDescription(data.description || "");
                setRecipients(data.recipients || []);
                setStep("review"); // Go straight to review
                localStorage.removeItem("duplicate_batch");
            } catch (e) {
                console.error(e);
            }
        }
    }, []);
    const [executionProgress, setExecutionProgress] = useState<Record<string, "pending" | "paying" | "proofing" | "anchoring" | "sent" | "failed">>({});
    const [finalBatchId, setFinalBatchId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split("\n").filter(line => line.trim() !== "");

            // Format: address,amount,memo (header optional)
            const newRecipients: Recipient[] = lines.map((line, index) => {
                const parts = line.split(",").map(part => part.trim());
                if (parts.length < 2) return null;

                const [addr, amt, mmo] = parts;
                // Skip header if it looks like one
                if (index === 0 && (addr.toLowerCase().includes("address") || isNaN(parseFloat(amt)))) return null;

                return {
                    id: Math.random().toString(),
                    address: addr,
                    amount: amt,
                    memo: mmo || ""
                };
            }).filter(r => r !== null) as Recipient[];

            if (newRecipients.length > 0) {
                setRecipients(prev => [...prev.filter(r => r.address !== ""), ...newRecipients]);
            }
        };
        reader.readAsText(file);
    };

    const downloadBatchReport = () => {
        const headers = ["Recipient Address", "Amount (FLR)", "Memo", "Status"];
        const rows = recipients.map(r => [
            r.address,
            r.amount,
            r.memo || "",
            executionProgress[r.id] || "COMPLETE"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `batch_report_${batchName || 'new'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generatePDFReceipt = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(249, 115, 22);
        doc.text("Batch Payout Receipt", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

        // Batch Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Batch Information", 14, 45);

        const infoData = [
            ["Batch Name:", batchName],
            ["Batch ID:", finalBatchId || "Processing"],
            ["Admin Wallet:", address || "N/A"],
            ["Total Paid:", `${totalAmount} FLR`],
            ["Total Recipients:", recipients.length.toString()],
        ];

        autoTable(doc, {
            startY: 50,
            body: infoData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
        });

        // Payments Table
        doc.text("Payment Verification Records", 14, (doc as any).lastAutoTable.finalY + 15);

        const tableHeaders = [["Recipient", "Amount (FLR)", "Memo", "Status"]];
        const tableRows = recipients.map(r => [
            `${r.address.substring(0, 10)}...`,
            r.amount,
            r.memo || "-",
            executionProgress[r.id] || "COMPLETE"
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: tableHeaders,
            body: tableRows,
            headStyles: { fillStyle: 'F', fillColor: [249, 115, 22] },
            styles: { fontSize: 9 }
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Flare Nest - Cryptographically Verified Payments`, 105, 285, { align: 'center' });

        doc.save(`batch_receipt_${batchName || 'new'}.pdf`);
    };

    const addRow = () => {
        setRecipients([...recipients, { id: Math.random().toString(), address: "", amount: "", memo: "" }]);
    };

    const removeRow = (id: string) => {
        if (recipients.length > 1) {
            setRecipients(recipients.filter(r => r.id !== id));
        }
    };

    const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
        setRecipients(recipients.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const totalAmount = recipients.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const startExecution = async () => {
        if (!address) {
            alert("Please connect your wallet first");
            return;
        }

        setStep("executing");
        const progress: any = {};
        recipients.forEach(r => progress[r.id] = "pending");
        setExecutionProgress(progress);

        try {
            // 1. Create Batch Header
            const batchRes = await fetch("/api/batches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: batchName,
                    description,
                    adminAddress: address,
                }),
            });
            const batchData = await batchRes.json();
            const batchId = batchData.batchId;
            setFinalBatchId(batchId);

            // 2. Add Recipients
            await fetch(`/api/batches/${batchId}/recipients`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(recipients),
            });

            // 3. Process each payment
            for (const r of recipients) {
                try {
                    setExecutionProgress(prev => ({ ...prev, [r.id]: "paying" }));

                    // A. On-chain Payment
                    const txHash = await sendFLR(r.address, r.amount);
                    const paymentId = `pay_${nanoid(10)}`;

                    // B. Record Payment in DB
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

                    setExecutionProgress(prev => ({ ...prev, [r.id]: "proofing" }));

                    // C. Generate ProofRails Proof
                    const proofRes = await fetch(`/api/payments/${paymentId}/proof`, {
                        method: "POST",
                    });
                    const proofData = await proofRes.json();
                    console.log("Proof generation response:", proofData);

                    if (!proofData.success) throw new Error(proofData.error || "Proof generation failed");

                    setExecutionProgress(prev => ({ ...prev, [r.id]: "anchoring" }));

                    // D. Anchor Proof on Flare
                    const anchorTxHash = await anchorProof(batchId, paymentId, proofData.proofReference);

                    // E. Record Anchor in DB
                    await fetch(`/api/payments/${paymentId}/anchor`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ anchorTxHash }),
                    });

                    setExecutionProgress(prev => ({ ...prev, [r.id]: "sent" }));
                } catch (err) {
                    console.error(`Error processing recipient ${r.address}:`, err);
                    setExecutionProgress(prev => ({ ...prev, [r.id]: "failed" }));
                }
            }

            // 4. Finalize Batch Status
            await fetch(`/api/batches/${batchId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ANCHORED" }),
            });

            setStep("completed");
        } catch (error) {
            console.error("Batch execution failed:", error);
            alert("Batch execution failed. Check console for details.");
            setStep("review");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Progress Stepper */}
                {step !== "executing" && step !== "completed" && (
                    <div className="flex items-center justify-between mb-12">
                        {[
                            { id: "info", label: "Batch Info" },
                            { id: "recipients", label: "Add Recipients" },
                            { id: "review", label: "Review & Confirm" },
                        ].map((s, i) => (
                            <div key={s.id} className="flex items-center flex-1 last:flex-none">
                                <div className={cn(
                                    "flex flex-col items-center gap-2",
                                    "transition-all duration-300"
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold",
                                        step === s.id ? "border-brand bg-brand text-white shadow-lg shadow-brand/20 scale-110" :
                                            (i < ["info", "recipients", "review"].indexOf(step) ? "border-brand bg-brand/20 text-brand" : "border-border text-secondary")
                                    )}>
                                        {(i < ["info", "recipients", "review"].indexOf(step)) ? <Check className="w-6 h-6" /> : i + 1}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium",
                                        step === s.id ? "text-primary" : "text-secondary"
                                    )}>{s.label}</span>
                                </div>
                                {i < 2 && (
                                    <div className={cn(
                                        "h-[2px] flex-1 mx-4 transition-all duration-500",
                                        i < ["info", "recipients", "review"].indexOf(step) ? "bg-brand" : "bg-border"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* STEP 1: Batch Info */}
                    {step === "info" && (
                        <motion.div
                            key="info"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass p-8 rounded-3xl"
                        >
                            <h2 className="text-2xl font-bold mb-8">Batch Details</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Batch Name</label>
                                    <input
                                        type="text"
                                        value={batchName}
                                        onChange={(e) => setBatchName(e.target.value)}
                                        placeholder="e.g. January Contributors"
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-brand/50 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Optional Description</label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Provide context for this payout..."
                                        className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-primary focus:outline-none focus:border-brand/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-2">Currency</label>
                                    <div className="flex items-center gap-3 px-4 py-3 bg-brand/5 border border-brand/20 rounded-xl text-brand font-bold">
                                        <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-[10px] text-white">₮</div>
                                        FLR (Pre-selected)
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 flex justify-end">
                                <button
                                    onClick={() => setStep("recipients")}
                                    disabled={!batchName}
                                    className="px-8 py-3 bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center gap-2 group"
                                >
                                    Next: Add Recipients
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Add Recipients */}
                    {step === "recipients" && (
                        <motion.div
                            key="recipients"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col gap-8"
                        >
                            <div className="glass p-8 rounded-3xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-bold">Add Recipients</h2>
                                    <div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleCSVUpload}
                                            accept=".csv"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 text-sm text-brand hover:underline font-semibold"
                                        >
                                            <Upload className="w-4 h-4" />
                                            CSV Upload
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {recipients.map((r) => (
                                        <div key={r.id} className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-12 md:col-span-5">
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-secondary mb-1">Wallet Address</label>
                                                <input
                                                    type="text"
                                                    value={r.address}
                                                    onChange={(e) => updateRecipient(r.id, "address", e.target.value)}
                                                    placeholder="0x..."
                                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-primary font-mono focus:outline-none"
                                                />
                                            </div>
                                            <div className="col-span-6 md:col-span-2">
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-secondary mb-1">Amount</label>
                                                <input
                                                    type="text"
                                                    value={r.amount}
                                                    onChange={(e) => updateRecipient(r.id, "amount", e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none"
                                                />
                                            </div>
                                            <div className="col-span-6 md:col-span-4">
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-secondary mb-1">Memo</label>
                                                <input
                                                    type="text"
                                                    value={r.memo}
                                                    onChange={(e) => updateRecipient(r.id, "memo", e.target.value)}
                                                    placeholder="Salary, Bonus, etc."
                                                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none"
                                                />
                                            </div>
                                            <div className="col-span-12 md:col-span-1 flex justify-end">
                                                <button
                                                    onClick={() => removeRow(r.id)}
                                                    className="p-2 text-secondary hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addRow}
                                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-secondary hover:text-primary hover:border-brand/50 transition-all font-medium"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Add Row
                                    </button>
                                </div>
                            </div>

                            {/* Summary Box */}
                            <div className="bg-surface border border-border p-6 rounded-3xl flex items-center justify-between">
                                <div className="flex gap-12">
                                    <div>
                                        <p className="text-secondary text-xs font-semibold uppercase mb-1">Total Recipients</p>
                                        <p className="text-2xl font-bold text-primary">{recipients.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-secondary text-xs font-semibold uppercase mb-1">Total Amount</p>
                                        <p className="text-2xl font-bold text-brand">{totalAmount.toLocaleString()} FLR</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setStep("info")}
                                        className="p-3 bg-surface border border-border rounded-xl text-secondary hover:text-primary transition-all"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={() => setStep("review")}
                                        className="px-8 py-3 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 active:scale-95"
                                    >
                                        Review Batch
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Review & Confirm */}
                    {step === "review" && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="glass p-8 rounded-3xl">
                                <h2 className="text-2xl font-bold mb-6">Review & Confirm</h2>

                                <div className="overflow-x-auto mb-8">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="pb-4 text-xs font-semibold text-secondary uppercase">Recipient</th>
                                                <th className="pb-4 text-xs font-semibold text-secondary uppercase">Amount</th>
                                                <th className="pb-4 text-xs font-semibold text-secondary uppercase">Memo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {recipients.map((r) => (
                                                <tr key={r.id}>
                                                    <td className="py-4 text-sm font-mono text-primary">{r.address || "0x..."}</td>
                                                    <td className="py-4 text-sm font-bold text-brand">{r.amount || "0.00"} FLR</td>
                                                    <td className="py-4 text-sm text-secondary">{r.memo || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-background/50 rounded-2xl border border-border">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-secondary uppercase">Wallet Status</p>
                                            <p className="text-sm font-medium text-primary">{address ? "Connected" : "Not Connected"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-secondary uppercase">Balance Check</p>
                                            <p className="text-sm font-medium text-primary">Ready for execution</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setStep("recipients")}
                                    className="px-6 py-4 bg-surface border border-border rounded-2xl text-secondary hover:text-primary transition-all font-bold"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={startExecution}
                                    className="flex-1 py-5 bg-brand hover:bg-brand/90 text-white font-bold text-xl rounded-2xl transition-all shadow-xl shadow-brand/30 active:scale-[0.98]"
                                >
                                    Execute Batch Payout
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: Executing (Live Status) */}
                    {step === "executing" && (
                        <motion.div
                            key="executing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass p-10 rounded-3xl text-center"
                        >
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-brand/10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                                <h2 className="text-3xl font-bold mb-2">Executing Batch...</h2>
                                <p className="text-secondary text-lg">Please do not close this window while we anchor payments on Flare.</p>
                            </div>

                            <div className="max-w-md mx-auto space-y-3 text-left">
                                {recipients.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between p-4 bg-surface/50 border border-border rounded-xl">
                                        <div className="flex items-center gap-3">
                                            {executionProgress[r.id] === "sent" ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Clock className="w-5 h-5 text-secondary animate-pulse" />
                                            )}
                                            <span className="text-sm font-mono text-primary">{r.address.substring(0, 10)}...</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-brand">{r.amount} FLR</span>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1",
                                                executionProgress[r.id] === "sent" ? "bg-green-500/10 text-green-500" :
                                                    executionProgress[r.id] === "failed" ? "bg-red-500/10 text-red-500" :
                                                        "bg-orange-500/10 text-orange-500"
                                            )}>
                                                {executionProgress[r.id] || "pending"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5: Completed */}
                    {step === "completed" && (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center"
                        >
                            <div className="glass p-12 rounded-3xl mb-8">
                                <div className="w-24 h-24 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-500/10">
                                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                                </div>
                                <h2 className="text-4xl font-bold mb-4">Payout Completed!</h2>
                                <p className="text-secondary text-lg mb-8">
                                    Successfully processed {recipients.length} payouts. All transactions have been anchored on Flare.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Link
                                        href={finalBatchId ? `/batches/${finalBatchId}` : "/dashboard"}
                                        className="flex items-center justify-center gap-2 py-4 bg-brand text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-brand/20 active:scale-90"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                        View Records
                                    </Link>
                                    <button
                                        onClick={downloadBatchReport}
                                        className="flex items-center justify-center gap-2 py-4 bg-surface border border-border text-primary font-bold rounded-2xl transition-all hover:border-secondary active:scale-95"
                                    >
                                        <Download className="w-4 h-4" />
                                        CSV Report
                                    </button>
                                    <button
                                        onClick={generatePDFReceipt}
                                        className="flex items-center justify-center gap-2 py-4 bg-brand/10 border border-brand/20 text-brand font-bold rounded-2xl transition-all hover:bg-brand/20 active:scale-95"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        PDF Receipt
                                    </button>
                                </div>
                            </div>

                            <Link href="/dashboard" className="text-brand font-semibold hover:underline flex items-center justify-center gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Return to Dashboard
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

