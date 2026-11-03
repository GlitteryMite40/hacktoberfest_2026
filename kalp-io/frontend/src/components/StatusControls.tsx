"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  Lock,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { updateNode } from "@/lib/api";
import { toStepStatus, type StepNode, type StepStatus } from "@/lib/plan-map";
import type { BuildNode } from "@/types";

export interface StatusControlsProps {
  node: StepNode;
  allNodes?: StepNode[];
  onStatusChange?: (
    nodeId: string,
    newStatus: StepStatus,
    updatedNode?: BuildNode,
  ) => void;
  className?: string;
}

/**
 * Checks whether a node is blocked by incomplete prerequisites
 */
export function isNodeBlocked(
  node: StepNode,
  allNodes: StepNode[] = [],
): { blocked: boolean; uncompletedPrereqs: string[] } {
  const deps = node.data.dependencies ?? [];
  if (deps.length === 0) {
    return { blocked: false, uncompletedPrereqs: [] };
  }

  const uncompleted: string[] = [];

  for (const depId of deps) {
    const parent = allNodes.find(
      (n) => n.id === depId || n.data.stepKey === depId,
    );
    if (!parent) {
      continue;
    }
    const status = toStepStatus(parent.data.status);
    if (status !== "done") {
      uncompleted.push(parent.data.title || parent.data.stepKey || depId);
    }
  }

  return {
    blocked: uncompleted.length > 0,
    uncompletedPrereqs: uncompleted,
  };
}

/**
 * Checks if a node is ready to start (all prereqs complete, not started or in-progress)
 */
export function isNodeReady(
  node: StepNode,
  allNodes: StepNode[] = [],
): boolean {
  const { blocked } = isNodeBlocked(node, allNodes);
  const status = toStepStatus(node.data.status);
  return !blocked && status !== "done" && status !== "in_progress";
}

export function StatusControls({
  node,
  allNodes = [],
  onStatusChange,
  className = "",
}: StatusControlsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStatus = toStepStatus(node.data.status);
  const { blocked, uncompletedPrereqs } = isNodeBlocked(node, allNodes);
  const ready = isNodeReady(node, allNodes);

  const handleUpdate = async (
    newStatus: "in_progress" | "completed" | "failed",
  ) => {
    // Enforce acceptance criteria: blocked cannot start
    if (blocked && (newStatus === "in_progress" || newStatus === "completed")) {
      setErrorMessage("Cannot start this step. Complete prerequisites first.");
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const updated = await updateNode(node.id, { status: newStatus });
      const mappedStatus = toStepStatus(newStatus);
      onStatusChange?.(node.id, mappedStatus, updated);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update step status.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Ready Node Highlight Badge */}
      {ready && !blocked && (
        <div className="p-3 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black shadow-[2px_2px_0_var(--ink)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs font-extrabold uppercase tracking-wider">
              Ready to start!
            </span>
          </div>
          <span className="text-[11px] font-bold">
            All prerequisites complete
          </span>
        </div>
      )}

      {/* Blocked Node Warning Callout */}
      {blocked && (
        <div className="p-3 rounded-xl border-2 border-[var(--ink)] bg-[#999999]/15 text-[var(--text)] flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-[var(--text)]">
              Locked by prerequisites
            </p>
            <p className="text-[var(--text-muted)]">
              Needs first: {uncompletedPrereqs.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Error Callout */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl border-2 border-[var(--ink)] bg-[#FC5082]/15 text-xs font-semibold text-[var(--text)] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#FC5082] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons: In Progress, Completed, Failed */}
      <div className="grid grid-cols-3 gap-2">
        {/* 1. In Progress */}
        <button
          type="button"
          disabled={blocked || isUpdating || currentStatus === "in_progress"}
          onClick={() => handleUpdate("in_progress")}
          className={`h-11 px-2 rounded-xl border-2 border-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all select-none ${
            currentStatus === "in_progress"
              ? "bg-[#8267F5] text-white shadow-[2px_2px_0_var(--ink)]"
              : blocked
                ? "bg-[var(--surface)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                : "bg-[var(--surface)] text-[var(--text)] hover:bg-[#8267F5]/10 control-neo cursor-pointer"
          }`}
          title={
            blocked
              ? `Locked: complete prerequisites first (${uncompletedPrereqs.join(", ")})`
              : "Mark in progress"
          }
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>In Progress</span>
        </button>

        {/* 2. Completed */}
        <button
          type="button"
          disabled={blocked || isUpdating || currentStatus === "done"}
          onClick={() => handleUpdate("completed")}
          className={`h-11 px-2 rounded-xl border-2 border-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all select-none ${
            currentStatus === "done"
              ? "bg-[#3EC02F] text-black shadow-[2px_2px_0_var(--ink)]"
              : blocked
                ? "bg-[var(--surface)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                : "bg-[var(--surface)] text-[var(--text)] hover:bg-[#3EC02F]/15 control-neo cursor-pointer"
          }`}
          title={
            blocked
              ? `Locked: complete prerequisites first (${uncompletedPrereqs.join(", ")})`
              : "Mark completed"
          }
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          )}
          <span>Completed</span>
        </button>

        {/* 3. Failed */}
        <button
          type="button"
          disabled={isUpdating || currentStatus === "failed"}
          onClick={() => handleUpdate("failed")}
          className={`h-11 px-2 rounded-xl border-2 border-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all select-none ${
            currentStatus === "failed"
              ? "bg-[#FC5082] text-black shadow-[2px_2px_0_var(--ink)]"
              : "bg-[var(--surface)] text-[var(--text)] hover:bg-[#FC5082]/15 control-neo cursor-pointer"
          }`}
          title="Mark failed"
        >
          {isUpdating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>Failed</span>
        </button>
      </div>
    </div>
  );
}
