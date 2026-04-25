import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    const queries = await prisma.agentQuery.findMany({
      where: { userAddress: { equals: address, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ queries });
  } catch (error) {
    console.error("[Agent History Error]:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
