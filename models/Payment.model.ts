import mongoose, { Schema, Document } from "mongoose";

/**
 * One Payment = One on-chain tx = One ProofRails record = One Flare anchor
 */
export interface IPayment extends Document {
    paymentId: string;
    batchId: string;

    // Parties
    adminAddress: string;
    recipientAddress: string;

    // Value
    amount: string;
    asset: string;

    // Blockchain
    txHash: string;

    // ProofRails
    proofReference?: string;
    proofBundleUrl?: string;

    // Flare anchoring
    anchorTxHash?: string;
    anchoredAt?: Date;

    // Status
    status: "SENT" | "PROOF_GENERATED" | "ANCHORED";

    memo?: string;

    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
    {
        paymentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        batchId: {
            type: String,
            required: true,
            index: true,
        },

        adminAddress: {
            type: String,
            required: true,
            index: true,
        },

        recipientAddress: {
            type: String,
            required: true,
            index: true,
        },

        amount: {
            type: String,
            required: true,
        },

        asset: {
            type: String,
            default: "FLR",
        },

        memo: {
            type: String,
        },

        txHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // ProofRails
        proofReference: {
            type: String,
            index: true,
        },

        proofBundleUrl: {
            type: String,
        },

        // Flare anchor
        anchorTxHash: {
            type: String,
            index: true,
        },

        anchoredAt: {
            type: Date,
        },

        status: {
            type: String,
            enum: ["SENT", "PROOF_GENERATED", "ANCHORED"],
            default: "SENT",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const Payment =
    mongoose.models.Payment ||
    mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
