import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import BatchModel from "@/models/Batch.model";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    await connectToDB();
    const { batchId } = await params;

    const batch = await BatchModel.findOne({ batchId });

    if (!batch) {
        return NextResponse.json(
            { error: "Batch not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(batch);
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        await connectToDB();
        const { batchId } = await params;

        // 1. Delete associated recipients
        const RecipientModel = (await import("@/models/Recipient.model")).default;
        await RecipientModel.deleteMany({ batchId });

        // 2. Delete associated payments
        const PaymentModel = (await import("@/models/Payment.model")).default;
        await PaymentModel.deleteMany({ batchId });

        // 3. Delete the batch itself
        const result = await BatchModel.findOneAndDelete({ batchId });

        if (!result) {
            return NextResponse.json(
                { success: false, error: "Batch not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "Batch and associated data deleted successfully" });
    } catch (error) {
        console.error("Delete batch error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete batch" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        await connectToDB();
        const { batchId } = await params;
        const { status } = await req.json();

        const batch = await BatchModel.findOneAndUpdate(
            { batchId },
            { status },
            { new: true }
        );

        if (!batch) {
            return NextResponse.json(
                { success: false, error: "Batch not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, batch });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to update batch" },
            { status: 500 }
        );
    }
}