import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { DetailPanel } from "./detail-panel";
import { TriageProvider } from "@/lib/triage-context";
import { inMemoryTriageStore } from "@hotbox/schema";
import type { LeadView } from "@/lib/view-model";

const leadWithDraft: LeadView = {
  username: "test.user",
  fullName: "Test User",
  qualityScore: 88,
  summary: "Great coaching lead",
  tier: "hot",
  intentCategory: "coaching_inquiry",
  primaryAsk: "coaching info",
  vertical: "fitness",
  bio: "lifter",
  followerCount: 500,
  dm: "I want coaching",
  recentPosts: [],
  isVerified: false,
  audienceFit: { level: "high", reason: "active lifter" },
  spamSignals: { isSpam: false, reasons: [] },
  buyingSignals: { urgency: "high", signals: [] },
  language: "en",
  confidence: 0.9,
  scoreRationale: "Direct coaching request",
  recommendedAction: "Reply with overview",
  draftReply: "hey! let me tell you about coaching options...",
};

function renderPanel(lead: LeadView | null = leadWithDraft) {
  return render(
    <TriageProvider store={inMemoryTriageStore()}>
      <DetailPanel lead={lead} />
    </TriageProvider>,
  );
}

describe("DetailPanel — S5 copy button feedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 'Copy' as the initial button label", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("shows 'Copied!' immediately after clicking the copy button", async () => {
    renderPanel();
    // fireEvent avoids userEvent's internal timer interactions with fake timers
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("reverts to 'Copy' after 2 seconds", async () => {
    renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("still shows 'Copied!' at 1999ms (has not reverted yet)", async () => {
    renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("calls clipboard.writeText with the draft reply text", async () => {
    renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(leadWithDraft.draftReply);
  });
});
