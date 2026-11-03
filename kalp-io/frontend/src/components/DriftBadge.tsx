import React from "react";
import { AlertTriangle, Check, GitCommit } from "lucide-react";

export interface DriftBadgeProps {
  status?: string;
  drift?: boolean | string | Record<string, unknown>;
  driftReason?: string;
  suggestedMatch?: string;
  className?: string;
}

export function DriftBadge({
  status,
  drift,
  driftReason,
  suggestedMatch,
  className = "",
}: DriftBadgeProps) {
  const isCommitted = status === "committed";
  const hasDrift =
    Boolean(drift) || (typeof drift === "object" && drift !== null);

  if (!isCommitted && !hasDrift && !suggestedMatch) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Committed Badge */}
      {isCommitted && (
        <span
          data-testid="committed-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-[var(--ink)] bg-[#B1DA19] text-black font-extrabold text-xs shadow-[2px_2px_0_var(--ink)]"
        >
          <GitCommit className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Committed</span>
        </span>
      )}

      {/* Drift Warning Badge */}
      {hasDrift && (
        <span
          data-testid="drift-badge"
          title={
            driftReason ||
            (typeof drift === "string" ? drift : "Code drifted from task spec")
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 border-[var(--ink)] bg-[#FC5082] text-black font-extrabold text-xs shadow-[2px_2px_0_var(--ink)]"
        >
          <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Drift detected</span>
        </span>
      )}

      {/* Suggested Match Badge */}
      {suggestedMatch && (
        <span
          data-testid="suggested-match-badge"
          title={`Matched commit: ${suggestedMatch}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[var(--ink)] bg-[var(--background)] text-[var(--text-muted)] font-mono text-[11px]"
        >
          <Check className="w-3 h-3 text-[#3EC02F]" />
          <span className="truncate max-w-[140px]">{suggestedMatch}</span>
        </span>
      )}
    </div>
  );
}
