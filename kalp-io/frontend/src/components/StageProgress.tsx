import React from "react";
import { AlertCircle, Check, Loader2, RotateCcw } from "lucide-react";
import type { Progress } from "@/lib/run-flow";

interface StageProgressProps {
  progress: Progress;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function StageProgress({
  progress,
  onRetry,
  isRetrying = false,
}: StageProgressProps) {
  const { stages, phase, error } = progress;

  const completedCount = stages.filter((s) => s.status === "done").length;
  const totalCount = stages.length;
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="card-neo p-6 sm:p-8 space-y-6 bg-[var(--surface)]">
      {/* Folder Tab-like Header */}
      <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text)] tracking-tight">
            Building your plan
          </h2>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-1">
            Kalp.io is decomposing your idea into a dependency-aware build
            graph.
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border-2 border-[var(--ink)] bg-[#8267F5] text-black shadow-[2px_2px_0_var(--ink)]">
          {phase === "failed"
            ? "Paused"
            : phase === "done"
              ? "Ready"
              : "Running"}
        </span>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-[var(--text)]">
            <span>
              {completedCount} of {totalCount} stages complete
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
          <div className="w-full h-3.5 rounded-full border-2 border-[var(--ink)] bg-[var(--background)] overflow-hidden">
            <div
              className="h-full bg-[#3EC02F] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stage Items List */}
      <div className="space-y-3">
        {stages.map((stage) => {
          const isDone = stage.status === "done";
          const isRunning = stage.status === "running";
          const isFailed = stage.status === "failed";

          return (
            <div
              key={stage.key}
              className="flex items-center justify-between p-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] shadow-[2px_2px_0_var(--ink)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-[8px] border-2 border-[var(--ink)] flex items-center justify-center text-black shrink-0"
                  style={{
                    backgroundColor: isDone
                      ? "#3EC02F"
                      : isFailed
                        ? "#FC5082"
                        : isRunning
                          ? "#FFCF1E"
                          : "var(--background)",
                  }}
                >
                  {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                  {isRunning && (
                    <Loader2 className="w-4 h-4 stroke-[3] animate-spin" />
                  )}
                  {isFailed && <AlertCircle className="w-4 h-4 stroke-[3]" />}
                </div>
                <span className="font-bold text-sm text-[var(--text)]">
                  {stage.label}
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-[var(--text-muted)]">
                {isDone
                  ? "Done"
                  : isRunning
                    ? "In progress..."
                    : isFailed
                      ? "Failed"
                      : "Pending"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Callout & Retry Button */}
      {phase === "failed" && (
        <div className="p-4 rounded-xl border-2 border-[var(--ink)] bg-[#FC5082]/10 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-[8px] border-2 border-[var(--ink)] bg-[#FC5082] flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0_var(--ink)]">
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--text)]">
                Generation paused
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {error ||
                  "Generation stopped. Your work so far is saved. Tap Retry to continue."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto h-12 px-6 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-bold text-sm flex items-center justify-center gap-2 control-neo cursor-pointer"
          >
            {isRetrying ? (
              <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
            ) : (
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            )}
            Retry stage
          </button>
        </div>
      )}
    </div>
  );
}
