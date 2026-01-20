import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import PaymentModel from "@/models/Payment.model";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        await connectToDB();
        const { paymentId } = await params;

        const { anchorTxHash } = await req.json();

        const payment = await PaymentModel.findOneAndUpdate(
            { paymentId: paymentId },
            {
                anchorTxHash,
                anchoredAt: new Date(),
                status: "ANCHORED",
            },
            { new: true }
        );

        return NextResponse.json({ success: true, payment });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to save anchor" },
            { status: 500 }
        );
    }
}