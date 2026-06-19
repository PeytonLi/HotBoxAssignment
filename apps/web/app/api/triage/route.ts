import { NextResponse } from "next/server";
import { getWebEnv } from "@hotbox/config";
// Validate at module load time — throws on missing required vars
const _env = getWebEnv();
import { prisma, prismaTriageStore } from "@hotbox/db";
import type { TriageStatus, TriageStore } from "@hotbox/schema";
import { inMemoryTriageStore, TRIAGE_STATUSES } from "@hotbox/schema";

// Try Prisma-backed store, fall back to in-memory if DB tables don't exist yet.
let _store: TriageStore | null = null;
function getStore(): TriageStore {
  if (_store) return _store;
  const dbStore = prismaTriageStore(prisma);
  _store = {
    async getAll() {
      try {
        return await dbStore.getAll();
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2021") {
          console.warn("GET /api/triage: DB table missing, using in-memory fallback");
          _store = inMemoryTriageStore();
          return {};
        }
        throw err;
      }
    },
    async setStatus(username, status) {
      try {
        return await dbStore.setStatus(username, status);
      } catch (err: unknown) {
        const prismaErr = err as { code?: string };
        if (prismaErr.code === "P2021") {
          console.warn("POST /api/triage: DB table missing, using in-memory fallback");
          _store = inMemoryTriageStore();
          return _store.setStatus(username, status);
        }
        throw err;
      }
    },
  };
  return _store;
}

export async function GET(): Promise<NextResponse> {
  try {
    const state = await getStore().getAll();
    return NextResponse.json(state);
  } catch (error) {
    console.error("GET /api/triage error:", error);
    return NextResponse.json({ error: "Failed to fetch triage state" }, { status: 500 });
  }
}

/**
 * Checks the Authorization header against TRIAGE_API_SECRET env var.
 * Returns null if authorized (or if no secret is configured — allows unauthenticated
 * access in development when TRIAGE_API_SECRET is not set).
 * Returns a 401 NextResponse if the secret is set but the header is wrong/missing.
 */
function checkAuth(request: Request): NextResponse | null {
  const secret = process.env.TRIAGE_API_SECRET;
  if (!secret) return null; // No secret configured: skip auth (dev mode)

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as {
      username?: string;
      status?: TriageStatus;
    };

    if (!body.username || typeof body.username !== "string") {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    if (!body.status || !TRIAGE_STATUSES.includes(body.status as TriageStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${TRIAGE_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    await getStore().setStatus(body.username, body.status as TriageStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/triage error:", error);
    return NextResponse.json({ error: "Failed to update triage status" }, { status: 500 });
  }
}
