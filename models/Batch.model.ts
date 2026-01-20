import mongoose, { Schema, Document } from "mongoose";

export interface IBatch extends Document {
    batchId: string;
    adminAddress: string;
    title: string;
    description?: string;
    currency: string;
    totalAmount: string;
    recipientCount: number;
    status: "DRAFT" | "PROCESSING" | "COMPLETED" | "ANCHORED";
    createdAt: Date;
}

const BatchSchema = new Schema<IBatch>(
    {
        batchId: { type: String, required: true, unique: true },
        adminAddress: { type: String, required: true, index: true },
        title: { type: String, required: true },
        description: { type: String },
        currency: { type: String, default: "FLR" },
        totalAmount: { type: String },
        recipientCount: { type: Number },
        status: {
            type: String,
            enum: ["DRAFT", "PROCESSING", "COMPLETED", "ANCHORED"],
            default: "DRAFT",
        },
    },
    { timestamps: true }
);

const Batch =
    mongoose.models.Batch ||
    mongoose.model<IBatch>("Batch", BatchSchema);

export default Batch;
