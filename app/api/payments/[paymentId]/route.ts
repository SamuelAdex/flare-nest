import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import PaymentModel from "@/models/Payment.model";
import BatchModel from "@/models/Batch.model";
import { createProofRailsRecord } from "@/lib/proofrails";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        await connectToDB();
        const { paymentId } = await params;

        let payment = await PaymentModel.findOne({ paymentId });

        if (!payment) {
            return NextResponse.json(
                { success: false, error: "Payment not found" },
                { status: 404 }
            );
        }

        // 🔄 LAZY GENERATION: If proof is missing or was placeholder, try to fetch it now
        if (!payment.proofReference || payment.proofReference === "N/A") {
            try {
                const proof = await createProofRailsRecord({
                    paymentId: payment.paymentId,
                    network: "coston2",
                    txHash: payment.txHash,
                    asset: payment.asset,
                    amount: payment.amount,
                    sender: { address: payment.adminAddress },
                    recipient: { address: payment.recipientAddress },
                    timestamp: payment.createdAt.toISOString(),
                });

                if (proof) {
                    const proofRef = proof.receipt_id || proof.id || proof.proofReference || "N/A";
                    const bundleUrl = proof.bundle_url || "";

                    payment.proofReference = proofRef;
                    payment.proofBundleUrl = bundleUrl;
                    if (payment.status === "SENT") payment.status = "PROOF_GENERATED";
                    await payment.save();
                }
            } catch (e) {
                console.warn("Lazy proof generation failed in GET:", e);
            }
        }

        const batch = await BatchModel.findOne({ batchId: payment.batchId });

        return NextResponse.json({
            success: true,
            payment,
            batch: batch ? { title: batch.title, batchId: batch.batchId } : null
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
