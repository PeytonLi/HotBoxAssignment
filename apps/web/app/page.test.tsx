import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Page from "./page";
import { TriageProvider } from "@/lib/triage-context";
import { inMemoryTriageStore } from "@hotbox/schema";
import type { LeadView } from "@/lib/view-model";

// Three leads in a known order so keyboard nav is predictable
const testLeads: LeadView[] = [
  {
    username: "lead-a",
    fullName: "Lead Alpha",
    qualityScore: 90,
    summary: "First lead",
    tier: "hot",
    intentCategory: "coaching_inquiry",
    primaryAsk: "coaching",
    vertical: "fitness",
    bio: "",
    followerCount: 100,
    dm: "test",
    recentPosts: [],
    isVerified: false,
    audienceFit: { level: "high", reason: "good" },
    spamSignals: { isSpam: false, reasons: [] },
    buyingSignals: { urgency: "high", signals: [] },
    language: "en",
    confidence: 0.9,
    scoreRationale: "good",
    recommendedAction: "reply",
    draftReply: null,
  },
  {
    username: "lead-b",
    fullName: "Lead Beta",
    qualityScore: 85,
    summary: "Second lead",
    tier: "hot",
    intentCategory: "product_purchase",
    primaryAsk: "product info",
    vertical: "fitness",
    bio: "",
    followerCount: 200,
    dm: "test",
    recentPosts: [],
    isVerified: false,
    audienceFit: { level: "high", reason: "good" },
    spamSignals: { isSpam: false, reasons: [] },
    buyingSignals: { urgency: "medium", signals: [] },
    language: "en",
    confidence: 0.8,
    scoreRationale: "good",
    recommendedAction: "reply",
    draftReply: null,
  },
  {
    username: "lead-c",
    fullName: "Lead Gamma",
    qualityScore: 70,
    summary: "Third lead",
    tier: "strong",
    intentCategory: "product_question",
    primaryAsk: "product question",
    vertical: "fitness",
    bio: "",
    followerCount: 300,
    dm: "test",
    recentPosts: [],
    isVerified: false,
    audienceFit: { level: "medium", reason: "ok" },
    spamSignals: { isSpam: false, reasons: [] },
    buyingSignals: { urgency: "low", signals: [] },
    language: "es",
    confidence: 0.7,
    scoreRationale: "ok",
    recommendedAction: "respond",
    draftReply: null,
  },
];

// Make fetch return our controlled lead list
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(testLeads),
    }),
  );
});

function renderPage() {
  return render(
    <TriageProvider store={inMemoryTriageStore()}>
      <Page />
    </TriageProvider>,
  );
}

async function waitForLeads() {
  // Wait for fetch → setEntries → re-render
  await act(() => Promise.resolve());
  await waitFor(() => expect(screen.queryByText("Lead Alpha")).not.toBeNull());
}

describe("Page — S4 keyboard navigation", () => {
  it("pressing j selects the next lead in the list", async () => {
    renderPage();
    await waitForLeads();

    // Click lead-a to select it
    await userEvent.click(screen.getAllByText("Lead Alpha")[0]);
    expect(screen.getByText("First lead")).toBeInTheDocument();

    // Press j → should move to lead-b
    await userEvent.keyboard("j");
    await waitFor(() => expect(screen.getByText("Second lead")).toBeInTheDocument());
  });

  it("pressing ArrowDown also moves selection down", async () => {
    renderPage();
    await waitForLeads();

    await userEvent.click(screen.getAllByText("Lead Alpha")[0]);
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(screen.getByText("Second lead")).toBeInTheDocument());
  });

  it("pressing k moves selection up", async () => {
    renderPage();
    await waitForLeads();

    // Click lead-b to start there
    await userEvent.click(screen.getAllByText("Lead Beta")[0]);
    expect(screen.getByText("Second lead")).toBeInTheDocument();

    // Press k → should move to lead-a
    await userEvent.keyboard("k");
    await waitFor(() => expect(screen.getByText("First lead")).toBeInTheDocument());
  });

  it("pressing ArrowUp also moves selection up", async () => {
    renderPage();
    await waitForLeads();

    await userEvent.click(screen.getAllByText("Lead Beta")[0]);
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(screen.getByText("First lead")).toBeInTheDocument());
  });

  it("j does not move past the last lead", async () => {
    renderPage();
    await waitForLeads();

    // Select lead-b (2nd of 2 in hot tier — lead-c is in strong tier)
    // Select lead-c by clicking, it's the last
    await userEvent.click(screen.getAllByText("Lead Gamma")[0]);
    // Press j repeatedly — should stay on lead-c
    await userEvent.keyboard("j");
    await userEvent.keyboard("j");
    await waitFor(() => expect(screen.getByText("Third lead")).toBeInTheDocument());
  });

  it("k does not move before the first lead", async () => {
    renderPage();
    await waitForLeads();

    await userEvent.click(screen.getAllByText("Lead Alpha")[0]);
    await userEvent.keyboard("k");
    await userEvent.keyboard("k");
    // Should still show first lead's detail
    await waitFor(() => expect(screen.getByText("First lead")).toBeInTheDocument());
  });

  it("pressing h marks the selected lead as handled", async () => {
    renderPage();
    await waitForLeads();

    await userEvent.click(screen.getAllByText("Lead Alpha")[0]);
    await userEvent.keyboard("h");

    // After handling, the Undo button appears in triage actions (handled state)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument(),
    );
  });

  it("pressing d marks the selected lead as dismissed", async () => {
    renderPage();
    await waitForLeads();

    await userEvent.click(screen.getAllByText("Lead Alpha")[0]);
    await userEvent.keyboard("d");

    // After dismissing, the Undo button appears
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument(),
    );
  });

  it("keyboard shortcuts are ignored when typing in an input", async () => {
    renderPage();
    await waitForLeads();

    await userEvent.click(screen.getAllByText("Lead Alpha")[0]);
    expect(screen.getByText("First lead")).toBeInTheDocument();

    // fireEvent.keyDown on the input simulates e.target being HTMLInputElement
    // without triggering the input/change event that would alter the search filter
    const searchInput = screen.getByRole("textbox", { name: /search/i });
    fireEvent.keyDown(searchInput, { key: "j" });

    // Navigation should NOT have happened — detail panel still shows lead-a
    expect(screen.getByText("First lead")).toBeInTheDocument();
  });
});
