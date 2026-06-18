import { NextResponse } from "next/server";
import { prisma, prismaTriageStore } from "@hotbox/db";
import type { TriageStatus } from "@hotbox/schema";
import { TRIAGE_STATUSES } from "@hotbox/schema";

const store = prismaTriageStore(prisma);

export async function GET(): Promise<NextResponse> {
  try {
    const state = await store.getAll();
    return NextResponse.json(state);
  } catch (error) {
    console.error("GET /api/triage error:", error);
    return NextResponse.json(
      { error: "Failed to fetch triage state" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      username?: string;
      status?: TriageStatus;
    };

    if (!body.username || typeof body.username !== "string") {
      return NextResponse.json(
        { error: "username is required" },
        { status: 400 },
      );
    }

    if (
      !body.status ||
      !TRIAGE_STATUSES.includes(body.status as TriageStatus)
    ) {
      return NextResponse.json(
        { error: `status must be one of: ${TRIAGE_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    await store.setStatus(body.username, body.status as TriageStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/triage error:", error);
    return NextResponse.json(
      { error: "Failed to update triage status" },
      { status: 500 },
    );
  }
}
