import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import PaymentModel from "@/models/Payment.model";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const {
      paymentId,
      batchId,
      adminAddress,
      recipientAddress,
      amount,
      txHash,
      memo,
    } = await req.json();

    if (!paymentId || !batchId || !txHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payment = await PaymentModel.create({
      paymentId,
      batchId,
      adminAddress,
      recipientAddress,
      amount,
      txHash,
      memo,
      asset: "FLR",
      status: "SENT",
    });

    return NextResponse.json({ success: true, payment });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Failed to register payment" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const recipientAddress = searchParams.get("recipientAddress");

    if (!recipientAddress) {
      return NextResponse.json(
        { error: "recipientAddress required" },
        { status: 400 }
      );
    }

    console.log("Searching payments for recipient:", recipientAddress);

    const payments = await PaymentModel.find({
      recipientAddress: { $regex: new RegExp(`^${recipientAddress}$`, "i") },
    }).sort({ createdAt: -1 });

    console.log(`Found ${payments.length} payments.`);

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch recipient payments" },
      { status: 500 }
    );
  }
}