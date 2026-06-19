import { describe, it, expect, vi, afterEach } from "vitest";
import { inMemoryTriageStore } from "@hotbox/schema";

// Create a shared mutable store that the route handler will use
const sharedStore = inMemoryTriageStore();

// Mock @hotbox/db before the route module is imported
vi.mock("@hotbox/db", () => ({
  prisma: {},
  prismaTriageStore: () => sharedStore,
}));

// Import route handlers AFTER mock is hoisted
const { GET, POST } = await import("./route");

describe("GET /api/triage", () => {
  it("returns empty object when no triage state exists", async () => {
    const response = await GET();
    const data = await response.json();
    expect(data).toEqual({});
  });
});

describe("POST /api/triage", () => {
  it("sets a status and returns success", async () => {
    const request = new Request("http://localhost/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "carol", status: "handled" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ success: true });

    // Verify the status was persisted via GET
    const getResponse = await GET();
    const all = await getResponse.json();
    expect(all).toEqual({ carol: "handled" });
  });

  it("returns 400 when username is missing", async () => {
    const request = new Request("http://localhost/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "handled" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("returns 400 when status is invalid", async () => {
    const request = new Request("http://localhost/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "dave", status: "invalid_status" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  it("returns 400 when status is missing", async () => {
    const request = new Request("http://localhost/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "eve" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe("POST /api/triage — auth", () => {
  afterEach(() => {
    delete process.env.TRIAGE_API_SECRET;
  });

  it("returns 401 when TRIAGE_API_SECRET is set and header is missing", async () => {
    process.env.TRIAGE_API_SECRET = "test-secret";
    const req = new Request("http://localhost/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", status: "handled" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("accepts POST when TRIAGE_API_SECRET is set and header matches", async () => {
    process.env.TRIAGE_API_SECRET = "test-secret";
    const req = new Request("http://localhost/api/triage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-secret",
      },
      body: JSON.stringify({ username: "alice", status: "handled" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("accepts POST without header when TRIAGE_API_SECRET is not set", async () => {
    const req = new Request("http://localhost/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob", status: "handled" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
