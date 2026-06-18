import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TriageProvider, useTriage } from "./triage-context";
import { inMemoryTriageStore, type TriageStore } from "@hotbox/schema";
import { Suspense } from "react";

/** A test component that reads and writes triage state via the hook. */
function TriageConsumer({ onRender }: { onRender?: (ctx: ReturnType<typeof useTriage>) => void }) {
  const triage = useTriage();
  onRender?.(triage);
  return (
    <div>
      <span data-testid="alice-status">{triage.statuses["alice"] ?? "unhandled"}</span>
      <span data-testid="alice-handled">{String(triage.isHandled("alice"))}</span>
      <span data-testid="bob-status">{triage.statuses["bob"] ?? "unhandled"}</span>
      <button data-testid="handle-alice" onClick={() => triage.setStatus("alice", "handled")}>
        Handle Alice
      </button>
      <button data-testid="dismiss-bob" onClick={() => triage.setStatus("bob", "dismissed")}>
        Dismiss Bob
      </button>
    </div>
  );
}

function renderWithStore(store: TriageStore) {
  return render(
    <TriageProvider store={store}>
      <Suspense fallback="loading">
        <TriageConsumer />
      </Suspense>
    </TriageProvider>,
  );
}

describe("TriageContext", () => {
  let store: ReturnType<typeof inMemoryTriageStore>;

  beforeEach(() => {
    store = inMemoryTriageStore();
  });

  it("renders with empty initial state", async () => {
    renderWithStore(store);
    // Wait for the effect to load
    await act(() => Promise.resolve());
    expect(screen.getByTestId("alice-status").textContent).toBe("unhandled");
    expect(screen.getByTestId("alice-handled").textContent).toBe("false");
  });

  it("sets status and updates UI", async () => {
    renderWithStore(store);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByTestId("handle-alice"));
    expect(screen.getByTestId("alice-status").textContent).toBe("handled");
    expect(screen.getByTestId("alice-handled").textContent).toBe("true");
  });

  it("persists status to the store", async () => {
    renderWithStore(store);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByTestId("handle-alice"));
    const all = await store.getAll();
    expect(all["alice"]).toBe("handled");
  });

  it("handles multiple users independently", async () => {
    renderWithStore(store);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByTestId("handle-alice"));
    await userEvent.click(screen.getByTestId("dismiss-bob"));
    expect(screen.getByTestId("alice-status").textContent).toBe("handled");
    expect(screen.getByTestId("bob-status").textContent).toBe("dismissed");
    const all = await store.getAll();
    expect(all["alice"]).toBe("handled");
    expect(all["bob"]).toBe("dismissed");
  });

  it("loads pre-existing state from store", async () => {
    await store.setStatus("alice", "handled");
    renderWithStore(store);
    await act(() => Promise.resolve());
    expect(screen.getByTestId("alice-status").textContent).toBe("handled");
    expect(screen.getByTestId("alice-handled").textContent).toBe("true");
  });

  it("throws when useTriage is used outside provider", () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TriageConsumer />)).toThrow("useTriage must be used within a TriageProvider");
    spy.mockRestore();
  });
});
