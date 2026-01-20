import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import RecipientModel from "@/models/Recipient.model";
import BatchModel from "@/models/Batch.model";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ batchId: string; recipientId: string }> }
) {
    try {
        await connectToDB();
        const { batchId, recipientId } = await params;

        // 1. Find recipient to get amount
        const recipient = await RecipientModel.findOne({ _id: recipientId, batchId });

        if (!recipient) {
            return NextResponse.json(
                { success: false, error: "Recipient not found" },
                { status: 404 }
            );
        }

        const amountToSubtract = parseFloat(recipient.amount);

        // 2. Delete recipient
        await RecipientModel.deleteOne({ _id: recipientId });

        // 3. Update Batch totals
        await BatchModel.findOneAndUpdate(
            { batchId },
            {
                $inc: {
                    totalAmount: -amountToSubtract,
                    recipientCount: -1
                }
            }
        );

        return NextResponse.json({ success: true, message: "Recipient removed" });
    } catch (error) {
        console.error("Delete recipient error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to remove recipient" },
            { status: 500 }
        );
    }
}
