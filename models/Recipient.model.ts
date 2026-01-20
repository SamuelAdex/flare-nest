import mongoose, { Schema, Document } from "mongoose";

export interface IRecipient extends Document {
    batchId: string;
    address: string;
    amount: string;
    memo?: string;
}

const RecipientSchema = new Schema<IRecipient>(
    {
        batchId: { type: String, required: true, index: true },
        address: { type: String, required: true, index: true },
        amount: { type: String, required: true },
        memo: { type: String },
    },
    { timestamps: true }
);

const Recipient =
    mongoose.models.Recipient ||
    mongoose.model<IRecipient>("Recipient", RecipientSchema);

export default Recipient;