import { describe, it, expect } from "vitest";
import type { TriageStore } from "../triage";

/**
 * Reusable contract suite every TriageStore impl must satisfy. Import in a *.test.ts and call
 * with a factory that returns a fresh, empty store each invocation:
 *
 *   triageStoreContract("prisma", () => makePrismaStore(testDbUrl));
 */
export function triageStoreContract(
  name: string,
  makeStore: () => TriageStore | Promise<TriageStore>,
): void {
  describe(`TriageStore contract: ${name}`, () => {
    it("returns an object from getAll()", async () => {
      const store = await makeStore();
      expect(typeof (await store.getAll())).toBe("object");
    });

    it("persists a status that was set", async () => {
      const store = await makeStore();
      await store.setStatus("alice", "handled");
      expect((await store.getAll())["alice"]).toBe("handled");
    });

    it("overwrites an existing status", async () => {
      const store = await makeStore();
      await store.setStatus("bob", "handled");
      await store.setStatus("bob", "dismissed");
      expect((await store.getAll())["bob"]).toBe("dismissed");
    });

    it("tracks multiple users independently", async () => {
      const store = await makeStore();
      await store.setStatus("a", "handled");
      await store.setStatus("b", "dismissed");
      const all = await store.getAll();
      expect(all["a"]).toBe("handled");
      expect(all["b"]).toBe("dismissed");
    });
  });
}
