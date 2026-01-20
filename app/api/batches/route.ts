import { NextResponse } from "next/server";
import { connectToDB } from "@/utils/database";
import BatchModel from "@/models/Batch.model";
import { nanoid } from "nanoid";

/**
 * CREATE BATCH
 * POST /api/batches
 */
export async function POST(req: Request) {
  await connectToDB();

  const { title, description, adminAddress } = await req.json();

  if (!title || !adminAddress) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const batch = await BatchModel.create({
    batchId: `batch_${nanoid(10)}`,
    title,
    description,
    adminAddress,
    status: "DRAFT",
    recipientCount: 0,
    totalAmount: "0",
  });

  return NextResponse.json(batch);
}

/**
 * LIST ADMIN BATCHES
 * GET /api/batches?adminAddress=0x...
 */
export async function GET(req: Request) {
  await connectToDB();

  const { searchParams } = new URL(req.url);
  const adminAddress = searchParams.get("adminAddress");

  if (!adminAddress) {
    return NextResponse.json(
      { error: "adminAddress required" },
      { status: 400 }
    );
  }

  const batches = await BatchModel.find({ adminAddress }).sort({
    createdAt: -1,
  });

  return NextResponse.json(batches);
}
