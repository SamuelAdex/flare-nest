"use client";

import Navbar from "@/components/Navbar";
import {
    ArrowLeft,
    Download,
    FileText,
    Code,
    CheckCircle2,
    ShieldCheck,
    Share2,
    Printer
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ProofPage() {
    const params = useParams();
    const id = params.id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProof = async () => {
            try {
                const res = await fetch(`/api/payments/${id}`);
                const json = await res.json();
                if (json.success) {
                    setData(json);
                }
            } catch (err) {
                console.error("Proof fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchProof();
    }, [id]);

    const generatePDF = () => {
        if (!data || !data.payment) return;
        const { payment, batch } = data;

        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const brandRed = [239, 68, 68]; // #EF4444
        const brandGrey = [148, 163, 184]; // #94A3B8
        const brandDark = [15, 23, 42]; // #0F172A
        const isAnchored = payment.status === "ANCHORED";

        // --- HEADER ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
        doc.text("FLARE NEST", 20, 30);

        doc.setFontSize(10);
        doc.setTextColor(brandGrey[0], brandGrey[1], brandGrey[2]);
        doc.setFont("helvetica", "bold");
        doc.text("OFFICIAL PAYMENT RECORD", 20, 38);

        // Status Badge (Top Right)
        const statusText = isAnchored ? "VERIFIED" : "PROCESSING";
        const badgeColor = isAnchored ? [34, 197, 94] : brandRed;
        doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        doc.roundedRect(150, 22, 40, 8, 4, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(statusText, 170, 27, { align: "center" });

        doc.setTextColor(brandGrey[0], brandGrey[1], brandGrey[2]);
        doc.setFontSize(7);
        doc.setFont("courier", "normal");
        doc.text(`RID: ${payment.proofReference || payment.paymentId}`, 190, 35, { align: "right" });

        // --- RECIPIENT & DATE ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("RECIPIENT ADDRESS", 20, 60);
        doc.text("PAYMENT DATE", 190, 60, { align: "right" });

        doc.setFontSize(11);
        doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
        doc.setFont("courier", "bold");
        const addrLines = doc.splitTextToSize(payment.recipientAddress, 80);
        doc.text(addrLines, 20, 68);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        const dateStr = new Date(payment.createdAt).toLocaleDateString("en-GB", {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        doc.text(dateStr, 190, 68, { align: "right" });

        doc.setDrawColor(241, 245, 249);
        doc.line(20, 85, 190, 85);

        // --- DESCRIPTION & AMOUNT ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(brandGrey[0], brandGrey[1], brandGrey[2]);
        doc.text("DESCRIPTION", 20, 105);
        doc.text("TOTAL AMOUNT", 190, 105, { align: "right" });

        doc.setFontSize(22);
        doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
        doc.text(payment.memo || "Batch Payout", 20, 118);

        doc.setFontSize(10);
        doc.setFont("helvetica", "oblique");
        doc.setTextColor(brandGrey[0], brandGrey[1], brandGrey[2]);
        doc.text(`Batch: ${batch?.title || 'Unknown'}`, 20, 126);
        doc.text(`(${payment.batchId})`, 20, 131);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(40);
        doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
        doc.text(payment.amount.toString(), 190, 125, { align: "right" });

        doc.setFontSize(12);
        doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
        doc.text(payment.asset || "FLR", 190, 135, { align: "right" });

        doc.line(20, 150, 190, 150);

        // --- VERIFICATION PROOF ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(brandGrey[0], brandGrey[1], brandGrey[2]);
        doc.text("FLARE VERIFICATION PROOF", 20, 170);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(20, 178, 170, 45, 5, 5, "F");

        doc.setFontSize(8);
        doc.setFont("courier", "bold");
        doc.setTextColor(brandGrey[0], brandGrey[1], brandGrey[2]);
        doc.text("TX HASH:", 30, 190);
        doc.text("PROOF ID:", 30, 200);
        doc.text("NETWORK:", 30, 210);

        doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
        const txLines = doc.splitTextToSize(payment.txHash, 110);
        doc.text(txLines, 55, 190);
        doc.text(payment.proofReference || "Pending", 55, 200);
        doc.text("Flare Coston2 Testnet", 55, 210);

        // --- FOOTER ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(brandGrey[0], brandGrey[1], brandGrey[2]);
        doc.text("AUDIT-GRADE RECORD", 30, 260);

        // Checkmark Icon
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(1);
        doc.circle(24, 259, 3, "S");
        doc.line(22.5, 259, 23.5, 260);
        doc.line(23.5, 260, 25.5, 258);

        // QR Code Placeholder Image (Fetch current QR)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.href}`;
        doc.addImage(qrUrl, "PNG", 170, 250, 20, 20);

        doc.save(`receipt_${payment.paymentId}.pdf`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
            </div>
        );
    }

    if (!data || !data.payment) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Payment Record Not Found</h1>
                <p className="text-secondary mb-8">The proof link you followed might be invalid or the payment hasn't been finalized.</p>
                <Link href="/recipient" className="bg-brand text-white px-6 py-3 rounded-xl font-bold">Back to Recipient Portal</Link>
            </div>
        );
    }

    const { payment, batch } = data;

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-12">
                <Link
                    href="/recipient"
                    className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-all mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Portal
                </Link>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Receipt Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-grow bg-white text-black p-10 md:p-16 rounded-[2rem] shadow-2xl relative overflow-hidden"
                    >
                        {/* Watermark/Pattern */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rotate-45 translate-x-32 -translate-y-32 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-16">
                                <div>
                                    <h2 className="text-3xl font-black italic tracking-tighter mb-2">FLARE NEST</h2>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Official Payment Record</p>
                                </div>
                                <div className="text-right">
                                    <div className={cn(
                                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter mb-4 shadow-lg",
                                        payment.status === "ANCHORED" ? "bg-green-500 text-white shadow-green-200" : "bg-brand text-white shadow-brand/20"
                                    )}>
                                        <ShieldCheck className="w-3 h-3" />
                                        {payment.status === "ANCHORED" ? "Verified on Flare" : "Processing"}
                                    </div>
                                    <p className="text-slate-400 font-mono text-[10px]">RID: {payment.proofReference || payment.paymentId}</p>
                                </div>
                            </div>

                            <div className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recipient Address</p>
                                        <p className="font-mono text-sm break-all font-bold">{payment.recipientAddress}</p>
                                    </div>
                                    <div className="md:text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Date</p>
                                        <p className="font-bold">{new Date(payment.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                </div>

                                <div className="py-12 border-y-2 border-slate-100">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                                            <h3 className="text-2xl font-bold">{payment.memo || "Batch Payout"}</h3>
                                            <p className="text-slate-500 mt-1 font-medium italic">Batch: {batch?.title || "Unknown"} ({batch?.batchId || payment.batchId})</p>
                                        </div>
                                        <div className="md:text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                                            <p className="text-5xl font-black">{payment.amount}</p>
                                            <p className="text-sm font-bold text-brand uppercase tracking-widest mt-1">{payment.asset || "FLR"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Flare Verification Proof</h4>
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[11px] leading-relaxed text-slate-600 break-all space-y-2">
                                        <div><span className="font-black text-slate-400 uppercase mr-2">TX Hash:</span> {payment.txHash}</div>
                                        {payment.anchorTxHash && (
                                            <div><span className="font-black text-slate-400 uppercase mr-2">Anchor:</span> {payment.anchorTxHash}</div>
                                        )}
                                        <div><span className="font-black text-slate-400 uppercase mr-2">Proof ID:</span> {payment.proofReference || "Pending Generation"}</div>
                                        <div><span className="font-black text-slate-400 uppercase mr-2">Network:</span> Flare Coston2 Testnet</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-20 flex justify-between items-center text-slate-400">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Audit-Grade Record</span>
                                </div>
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=https://flarenest.io/proof/${payment.paymentId}`}
                                        alt="Verification QR"
                                        className="w-8 h-8 opacity-50 contrast-125 saturate-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Sidebar Actions */}
                    <div className="w-full md:w-72 space-y-4">
                        <div className="glass p-6 rounded-3xl sticky top-24">
                            <h3 className="text-lg font-bold mb-6">Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={generatePDF}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-brand text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 active:scale-95"
                                >
                                    <FileText className="w-5 h-5" />
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-border text-primary font-bold rounded-xl transition-all hover:border-secondary active:scale-95"
                                >
                                    <Printer className="w-5 h-5" />
                                    Print Receipt
                                </button>
                                <Link
                                    href={payment.proofBundleUrl || "#"}
                                    target="_blank"
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 bg-surface border border-border text-primary font-bold rounded-xl transition-all hover:border-secondary active:scale-95",
                                        !payment.proofBundleUrl && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Download className="w-5 h-5" />
                                    Download Proof
                                </Link>
                                <button
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = `iso_proof_${payment.paymentId}.json`;
                                        link.click();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-border text-primary font-bold rounded-xl transition-all hover:border-secondary active:scale-95"
                                >
                                    <Code className="w-5 h-5" />
                                    Export JSON
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(window.location.href);
                                        alert("Link copied to clipboard!");
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-border text-primary font-bold rounded-xl transition-all hover:border-secondary active:scale-95"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Share Proof
                                </button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-border">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Proof Reference</p>
                                    <p className="font-mono text-[10px] break-all text-slate-600 font-bold">{payment.proofReference || "NOT_GENERATED"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-brand/10 border border-brand/20">
                            <p className="text-brand text-xs font-bold uppercase tracking-widest mb-2">Blockchain Status</p>
                            <p className="text-sm font-medium text-primary leading-snug">
                                This payout has been cryptographically signed and anchored on Flare.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

import { Loader2 } from "lucide-react";
