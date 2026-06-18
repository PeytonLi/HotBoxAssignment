"use client";

import { useState } from "react";
import type { LeadView } from "@/lib/view-model";
import { ScoreBadge } from "./score-badge";
import { TriageActions } from "./triage-actions";

interface Props {
  lead: LeadView | null;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="detail-field">
      <span className="detail-field-label">{label}</span>
      <span className="detail-field-value">{String(value)}</span>
    </div>
  );
}

export function DetailPanel({ lead }: Props) {
  const [showPosts, setShowPosts] = useState(false);

  if (!lead) {
    return (
      <div className="detail-panel">
        <div className="detail-empty">Select a lead to view details</div>
      </div>
    );
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API not available; ignore
    }
  };

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <ScoreBadge score={lead.qualityScore} tier={lead.tier} />
        <div>
          <div className="detail-name">{lead.fullName}</div>
          <div className="detail-username">
            @{lead.username}
            {lead.isVerified && " ✓"}
            {lead.followerCount > 0 && <> &middot; {lead.followerCount.toLocaleString()} followers</>}
          </div>
        </div>
      </div>

      {lead.bio && <div className="detail-bio">{lead.bio}</div>}

      {/* DM front and center */}
      {lead.dm && (
        <div className="detail-section">
          <div className="detail-section-title">Direct Message</div>
          <div className="detail-dm">{lead.dm}</div>
        </div>
      )}

      {/* Recent posts collapsible */}
      {lead.recentPosts.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            Recent Posts{" "}
            <button className="posts-toggle" onClick={() => setShowPosts(!showPosts)}>
              {showPosts ? "Hide" : `Show (${lead.recentPosts.length})`}
            </button>
          </div>
          {showPosts &&
            lead.recentPosts.map((post, i) => (
              <div key={i} className="post-item">
                <div>{post.caption || post.imageDescription || "No caption"}</div>
                <div className="post-meta">
                  {post.likeCount != null && <>{post.likeCount} likes</>}
                  {post.commentCount != null && <> &middot; {post.commentCount} comments</>}
                  {post.postedAt && <> &middot; {post.postedAt}</>}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Enrichment fields */}
      <div className="detail-section">
        <div className="detail-section-title">Enrichment</div>
        <Field label="Tier" value={lead.tier} />
        <Field label="Intent" value={lead.intentCategory.replace(/_/g, " ")} />
        <Field label="Primary Ask" value={lead.primaryAsk} />
        <Field label="Vertical" value={lead.vertical} />
        <Field label="Language" value={lead.language} />
        <Field label="Confidence" value={lead.confidence != null ? Math.round(lead.confidence * 100) + "%" : null} />
        <Field label="Audience Fit" value={lead.audienceFit.level + " — " + lead.audienceFit.reason} />
        {lead.buyingSignals.signals.length > 0 && (
          <Field label="Buying Signals" value={lead.buyingSignals.signals.join(", ")} />
        )}
        <Field label="Urgency" value={lead.buyingSignals.urgency} />
        {lead.spamSignals.isSpam && (
          <Field label="Spam Reasons" value={lead.spamSignals.reasons.join(", ")} />
        )}
      </div>

      {/* Score rationale & recommended action */}
      <div className="detail-section">
        <div className="detail-section-title">Analysis</div>
        <Field label="Score Rationale" value={lead.scoreRationale} />
        <Field label="Recommended" value={lead.recommendedAction} />
      </div>

      {/* Draft reply with copy button */}
      {lead.draftReply && (
        <div className="detail-section">
          <div className="detail-section-title">Draft Reply</div>
          <div className="draft-reply-box">
            {lead.draftReply}
            <button className="copy-button" onClick={() => handleCopy(lead.draftReply!)}>
              Copy
            </button>
          </div>
        </div>
      )}

      <TriageActions username={lead.username} />
    </div>
  );
}
