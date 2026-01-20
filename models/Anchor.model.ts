import mongoose, { Schema, Document } from "mongoose";

export interface IAnchor extends Document {
    paymentId: string;
    batchId: string;
    proofReference: string;
    anchorTxHash: string;
    anchoredBy: string;
}

const AnchorSchema = new Schema<IAnchor>(
    {
        paymentId: { type: String, required: true, index: true },
        batchId: { type: String, required: true, index: true },
        proofReference: { type: String, required: true },
        anchorTxHash: { type: String, required: true, unique: true },
        anchoredBy: { type: String, required: true },
    },
    { timestamps: true }
);

const Anchor =
    mongoose.models.Anchor ||
    mongoose.model<IAnchor>("Anchor", AnchorSchema);

export default Anchor;
