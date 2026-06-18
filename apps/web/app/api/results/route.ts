import { NextResponse } from "next/server";
import { loadLeadViews } from "@/lib/data";

export async function GET(): Promise<NextResponse> {
  try {
    const leads = loadLeadViews();
    return NextResponse.json(leads);
  } catch (error) {
    console.error("GET /api/results error:", error);
    return NextResponse.json(
      { error: "Failed to load results" },
      { status: 500 },
    );
  }
}
