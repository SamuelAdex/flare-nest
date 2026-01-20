import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import PaymentModel from "@/models/Payment.model";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        await connectToDB();
        const { batchId } = await params;

        const payments = await PaymentModel.find({
            batchId: batchId,
        }).sort({ createdAt: 1 });

        return NextResponse.json({
            success: true,
            count: payments.length,
            payments,
        });
    } catch {
        return NextResponse.json(
            { success: false, error: "Failed to fetch payments" },
            { status: 500 }
        );
    }
}