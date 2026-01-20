import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import RecipientModel from "@/models/Recipient.model";
import BatchModel from "@/models/Batch.model";

/**
 * ADD RECIPIENTS
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        await connectToDB();
        const { batchId } = await params;

        const recipients = await req.json();

        if (!Array.isArray(recipients)) {
            return NextResponse.json(
                { error: "Recipients must be an array" },
                { status: 400 }
            );
        }

        // Check if batch is still in DRAFT
        const batch = await BatchModel.findOne({ batchId });
        if (!batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        if (batch.status === "COMPLETED") {
            return NextResponse.json({ error: "Cannot add recipients to a completed batch" }, { status: 400 });
        }

        let newTotalAmount = Number(batch.totalAmount || 0);

        const docs = recipients.map((r) => {
            newTotalAmount += Number(r.amount);
            return {
                batchId: batchId,
                address: r.address,
                amount: r.amount,
                memo: r.memo,
            };
        });

        await RecipientModel.insertMany(docs);

        await BatchModel.findOneAndUpdate(
            { batchId: batchId },
            {
                $inc: {
                    recipientCount: docs.length,
                },
                $set: {
                    totalAmount: newTotalAmount.toString(),
                },
            }
        );

        return NextResponse.json({ success: true, count: docs.length });
    } catch (error) {
        console.error("Add recipients error:", error);
        return NextResponse.json({ success: false, error: "Failed to add recipients" }, { status: 500 });
    }
}

/**
 * LIST RECIPIENTS
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    await connectToDB();
    const { batchId } = await params;

    const recipients = await RecipientModel.find({
        batchId: batchId,
    });

    return NextResponse.json(recipients);
}