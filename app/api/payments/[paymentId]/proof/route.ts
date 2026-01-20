import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import PaymentModel from "@/models/Payment.model";
import { createProofRailsRecord } from "@/lib/proofrails";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await connectToDB();
    const { paymentId } = await params;

    const payment = await PaymentModel.findOne({
      paymentId: paymentId,
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // 🛑 Guard: don’t regenerate proofs UNLESS they are failed/placeholder
    if (payment.status !== "SENT" && payment.proofReference && payment.proofReference !== "N/A") {
      return NextResponse.json({
        success: true,
        proofReference: payment.proofReference,
        proofBundleUrl: payment.proofBundleUrl,
      });
    }

    // 🔥 ACTUAL ProofRails call (with retry)
    let proof;
    let attempts = 0;
    while (attempts < 5) {
      try {
        proof = await createProofRailsRecord({
          paymentId: payment.paymentId,
          network: "coston2",
          txHash: payment.txHash,
          asset: payment.asset,
          amount: payment.amount,
          sender: { address: payment.adminAddress },
          recipient: { address: payment.recipientAddress },
          timestamp: payment.createdAt.toISOString(),
        });
        break;
      } catch (e: any) {
        attempts++;
        if (attempts >= 5) throw e;
        console.warn(`ProofRails attempt ${attempts} failed, retrying in 5s:`, e.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!proof) throw new Error("Could not generate proof after 5 attempts");

    console.log("ProofRails API Raw Response:", proof);

    // 💾 Flexibly find the reference (id, receipt_id, proofReference, or reference)
    // Adding receipt_id as it's common in ProofRails ISO responses
    const proofRef = proof.receipt_id || proof.id || proof.proofReference || proof.reference || "N/A";
    const bundleUrl = proof.bundle_url || proof.bundleDownloadUrl || proof.bundle_download_url || "";

    payment.proofReference = proofRef;
    payment.proofBundleUrl = bundleUrl;
    payment.status = "PROOF_GENERATED";
    await payment.save();

    return NextResponse.json({
      success: true,
      proofReference: proofRef,
      proofBundleUrl: bundleUrl,
    });
  } catch (error: any) {
    console.error("ProofRails integration error detail:", error);

    return NextResponse.json(
      { success: false, error: error.message || "ProofRails generation failed" },
      { status: 500 }
    );
  }
}
