import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  ArrowRight,
  Check,
  Circle,
  Eye,
  GitCommit,
  Lock,
  Pencil,
  X,
} from "lucide-react";
import type { StepNode, StepStatus } from "@/lib/plan-map";

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

export function StepNodeComponent({ data }: NodeProps<StepNode>) {
  const statusConfig = STATUS_MAP[data.status] ?? STATUS_MAP.not_started;
  const IconComponent = statusConfig.icon;

  return (
    <div className="card-neo w-64 p-3 relative cursor-pointer select-none bg-[var(--surface)] text-[var(--text)] transition-transform hover:-translate-y-0.5">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[var(--ink)] !border-2 !border-[var(--surface)]"
      />
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[10px] border-2 border-[var(--ink)] flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0_var(--ink)]"
          style={{ backgroundColor: statusConfig.bg }}
        >
          <IconComponent className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="min-w-0 flex-1">
          {data.stepKey && (
            <span className="block font-mono text-[11px] text-[var(--text-muted)] font-semibold tracking-wider">
              {data.stepKey}
            </span>
          )}
          <h4 className="font-bold text-sm leading-tight truncate text-[var(--text)]">
            {data.title}
          </h4>
          <span className="inline-block text-[11px] font-semibold text-[var(--text-muted)] mt-0.5">
            {statusConfig.word}
          </span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[var(--ink)] !border-2 !border-[var(--surface)]"
      />
    </div>
  );
}
