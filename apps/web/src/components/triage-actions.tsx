"use client";

import { useTriage } from "@/lib/triage-context";

interface Props {
  username: string;
}

export function TriageActions({ username }: Props) {
  const { statuses, setStatus } = useTriage();
  const current = statuses[username];
  const isTriaged = current === "handled" || current === "dismissed";

  if (isTriaged) {
    return (
      <div className="triage-actions">
        <button className="triage-btn undo" onClick={() => setStatus(username, "unhandled")}>
          Undo {current}
        </button>
      </div>
    );
  }

  return (
    <div className="triage-actions">
      <button className="triage-btn handle" onClick={() => setStatus(username, "handled")}>
        Mark Handled
      </button>
      <button className="triage-btn dismiss" onClick={() => setStatus(username, "dismissed")}>
        Dismiss
      </button>
    </div>
  );
}
