"use client";

import React, { useEffect } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Code2,
  Eye,
  FileCode,
  GitCommit,
  Layers,
  Lock,
  Pencil,
  Sparkles,
  TestTube,
  X,
} from "lucide-react";
import type { StepNode, StepStatus } from "@/lib/plan-map";
import { CopyPrompt } from "@/components/CopyPrompt";
import { StatusControls } from "@/components/StatusControls";

export interface NodePanelProps {
  node: StepNode | null;
  onClose: () => void;
  allNodes?: StepNode[];
  onSelectNode?: (nodeId: string) => void;
  onStatusChange?: (nodeId: string, newStatus: StepStatus) => void;
  className?: string;
}

interface StatusConfig {
  bg: string;
  word: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_MAP: Record<StepStatus, StatusConfig> = {
  not_started: {
    bg: "var(--surface)",
    word: "Not started",
    icon: Circle,
  },
  next: {
    bg: "#FFCF1E",
    word: "Next up",
    icon: ArrowRight,
  },
  in_progress: {
    bg: "#8267F5",
    word: "In progress",
    icon: Pencil,
  },
  committed: {
    bg: "#B1DA19",
    word: "Committed",
    icon: GitCommit,
  },
  done: {
    bg: "#3EC02F",
    word: "Done",
    icon: Check,
  },
  locked: {
    bg: "#999999",
    word: "Locked",
    icon: Lock,
  },
  failed: {
    bg: "#FC5082",
    word: "Didn't work",
    icon: X,
  },
  review: {
    bg: "#FDE199",
    word: "Check this",
    icon: Eye,
  },
};

export function NodePanel({
  node,
  onClose,
  allNodes = [],
  onSelectNode,
  onStatusChange,
  className = "",
}: NodePanelProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const { data } = node;
  const statusConfig = STATUS_MAP[data.status] ?? STATUS_MAP.not_started;

  // Resolve dependency names and stepKeys
  const dependencies = (data.dependencies ?? []).map((depId) => {
    const matched = allNodes.find(
      (n) => n.id === depId || n.data.stepKey === depId,
    );
    return {
      id: depId,
      title: matched ? matched.data.title : depId,
      stepKey: matched ? matched.data.stepKey : undefined,
      status: matched ? matched.data.status : "not_started",
    };
  });

  const promptText = (data.prompt as string) || "";
  const files = (data.files as string[]) ?? [];
  const criteria = (data.criteria as string[]) ?? [];
  const tests = (data.tests as string[]) ?? [];

  return (
    <aside
      role="dialog"
      aria-labelledby="node-panel-title"
      className={`card-neo w-full md:w-[440px] max-h-[85vh] md:max-h-full overflow-y-auto p-6 space-y-6 bg-[var(--surface)] text-[var(--text)] shrink-0 ${className}`}
    >
      {/* Header with Title, Step Key, and Close Button */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {data.stepKey && (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border border-[var(--ink)] bg-[var(--background)] text-[var(--text-muted)]">
                {data.stepKey}
              </span>
            )}
            {data.phase && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--ink)] bg-[#8267F5] text-black">
                {data.phase}
              </span>
            )}
          </div>
          <h2
            id="node-panel-title"
            className="text-xl font-extrabold text-[var(--text)] leading-tight"
          >
            {data.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="w-11 h-11 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--text)] flex items-center justify-center control-neo cursor-pointer shrink-0"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* 1. Status Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Status
          </span>
          <span className="text-xs font-bold font-mono text-[var(--text-muted)]">
            {statusConfig.word}
          </span>
        </div>

        <StatusControls
          node={node}
          allNodes={allNodes}
          onStatusChange={onStatusChange}
        />
      </div>

      {/* 2. Purpose Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          <span>Purpose</span>
        </div>
        <p className="text-sm font-medium leading-relaxed text-[var(--text)] p-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)]">
          {data.purpose ||
            data.description ||
            "No specific purpose provided for this step."}
        </p>
      </div>

      {/* 3. Dependencies Section ("Needs first") */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <ArrowRight className="w-3.5 h-3.5" />
          <span>Needs first (Dependencies)</span>
        </div>
        {dependencies.length === 0 ? (
          <p className="text-xs font-medium text-[var(--text-muted)] p-3 rounded-xl border-2 border-dashed border-[var(--ink)]/30">
            None. This step can be started immediately.
          </p>
        ) : (
          <div className="space-y-2">
            {dependencies.map((dep) => (
              <button
                key={dep.id}
                type="button"
                onClick={() => onSelectNode?.(dep.id)}
                className="w-full text-left p-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] hover:bg-[var(--surface)] transition-colors flex items-center justify-between gap-2 control-neo cursor-pointer"
              >
                <div className="min-w-0">
                  {dep.stepKey && (
                    <span className="font-mono text-[10px] text-[var(--text-muted)] block font-semibold">
                      {dep.stepKey}
                    </span>
                  )}
                  <span className="font-bold text-xs text-[var(--text)] truncate block">
                    {dep.title}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Files Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <FileCode className="w-3.5 h-3.5" />
          <span>Files / Modules</span>
        </div>
        {files.length === 0 ? (
          <p className="text-xs font-medium text-[var(--text-muted)] p-3 rounded-xl border-2 border-dashed border-[var(--ink)]/30">
            No specific files attached to this step.
          </p>
        ) : (
          <div className="space-y-1.5 p-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)]">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="font-mono text-xs text-[var(--text)] py-0.5 flex items-center gap-1.5 break-all"
              >
                <Code2 className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                <span>{file}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Acceptance Criteria Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>How you&apos;ll know it works (Criteria)</span>
        </div>
        {criteria.length === 0 ? (
          <p className="text-xs font-medium text-[var(--text-muted)] p-3 rounded-xl border-2 border-dashed border-[var(--ink)]/30">
            No explicit acceptance criteria specified.
          </p>
        ) : (
          <ul className="space-y-2 p-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] text-xs font-medium text-[var(--text)]">
            {criteria.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3EC02F] mt-1.5 shrink-0" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 6. Test Cases Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <TestTube className="w-3.5 h-3.5" />
          <span>Test cases</span>
        </div>
        {tests.length === 0 ? (
          <p className="text-xs font-medium text-[var(--text-muted)] p-3 rounded-xl border-2 border-dashed border-[var(--ink)]/30">
            No specific test cases outlined.
          </p>
        ) : (
          <ul className="space-y-2 p-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] text-xs font-medium text-[var(--text)]">
            {tests.map((testItem, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8267F5] mt-1.5 shrink-0" />
                <span className="leading-snug">{testItem}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 7. Agent / LLM Prompt Section with Copy Button */}
      {promptText && (
        <div className="space-y-2 pt-2 border-t-2 border-[var(--ink)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#FFCF1E]" />
            <span>Agent Prompt</span>
          </div>
          <CopyPrompt prompt={promptText} buttonText="Copy prompt" />
        </div>
      )}
    </aside>
  );
}
