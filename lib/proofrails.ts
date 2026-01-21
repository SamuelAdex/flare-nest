type ProofRailsPaymentPayload = {
    paymentId: string;
    network: string;
    txHash: string;
    asset: string;
    amount: string;
    sender: { address: string };
    recipient: { address: string };
    timestamp: string;
    memo?: string;
};

import ProofRails from '@proofrails/sdk';

const proofrails = new ProofRails({
    apiKey: process.env.PROOFRAILS_API_KEY || "",
    network: "coston2"
});

export async function createProofRailsRecord(
    payload: ProofRailsPaymentPayload
) {
    try {
        console.log("Generating proof via SDK for:", payload.paymentId);

        const receipt = await proofrails.templates.payment({
            amount: Number(payload.amount),
            from: payload.sender.address,
            to: payload.recipient.address,
            purpose: payload.memo || `Batch Payment ${payload.paymentId}`,
            transactionHash: payload.txHash,
            currency: payload.asset || "FLR"
        });

        console.log("ProofRails SDK Response:", receipt);

        // Normalize SDK response to match our app's expectations
        return {
            receipt_id: receipt.id,
            proofReference: receipt.id,
            bundle_url: receipt.bundleUrl || "",
            status: receipt.status,
            // Include other receipt properties as needed individually instead of spreading
            id: receipt.id,
            anchorTx: receipt.anchorTx,
            bundleHash: receipt.bundleHash
        };

    } catch (error: any) {
        console.error("ProofRails SDK Error:", error);
        throw new Error(`SDK Error: ${error.message}`);
    }
}

