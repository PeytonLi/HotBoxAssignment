import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QueueRow } from "./queue-row";
import type { LeadView } from "@/lib/view-model";

const baseLead: LeadView = {
  username: "test.user",
  fullName: "Test User",
  qualityScore: 75,
  summary: "A test lead",
  tier: "strong",
  intentCategory: "coaching_inquiry",
  primaryAsk: "coaching info",
  vertical: "fitness",
  bio: "",
  followerCount: 500,
  dm: "test dm",
  recentPosts: [],
  isVerified: false,
  audienceFit: { level: "high", reason: "good fit" },
  spamSignals: { isSpam: false, reasons: [] },
  buyingSignals: { urgency: "high", signals: [] },
  language: "en",
  confidence: 0.9,
  scoreRationale: "high intent",
  recommendedAction: "reply",
  draftReply: null,
};

describe("QueueRow — S3 language badge", () => {
  it("does not render a lang badge for English leads", () => {
    const { container } = render(
      <QueueRow lead={baseLead} isSelected={false} isHandled={false} onClick={() => {}} />,
    );
    expect(container.querySelector(".lang-badge")).toBeNull();
  });

  it("renders a lang badge for non-English leads", () => {
    const esLead = { ...baseLead, language: "es" };
    const { container } = render(
      <QueueRow lead={esLead} isSelected={false} isHandled={false} onClick={() => {}} />,
    );
    expect(container.querySelector(".lang-badge")).not.toBeNull();
  });

  it("displays the language code in uppercase", () => {
    const ptLead = { ...baseLead, language: "pt" };
    const { container } = render(
      <QueueRow lead={ptLead} isSelected={false} isHandled={false} onClick={() => {}} />,
    );
    expect(container.querySelector(".lang-badge")?.textContent).toBe("PT");
  });

  it("includes a tooltip identifying the language", () => {
    const frLead = { ...baseLead, language: "fr" };
    const { container } = render(
      <QueueRow lead={frLead} isSelected={false} isHandled={false} onClick={() => {}} />,
    );
    const badge = container.querySelector(".lang-badge");
    expect(badge?.getAttribute("title")).toContain("fr");
  });

  it("does not render a lang badge when language is exactly 'en'", () => {
    const enLead = { ...baseLead, language: "en" };
    const { container } = render(
      <QueueRow lead={enLead} isSelected={false} isHandled={false} onClick={() => {}} />,
    );
    expect(container.querySelector(".lang-badge")).toBeNull();
  });
});
