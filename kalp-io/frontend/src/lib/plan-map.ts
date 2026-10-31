import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { BuildGraph, BuildNode } from "@/types";

/** Step statuses from DESIGN.md §3. Every status has a colour, an icon and a word. */
export type StepStatus =
  | "not_started"
  | "next"
  | "in_progress"
  | "committed"
  | "done"
  | "locked"
  | "failed"
  | "review";

const STATUS_ALIASES: Record<string, StepStatus> = {
  not_started: "not_started",
  pending: "not_started",
  todo: "not_started",
  ready: "next",
  next: "next",
  next_up: "next",
  in_progress: "in_progress",
  started: "in_progress",
  committed: "committed",
  completed: "done",
  complete: "done",
  done: "done",
  blocked: "locked",
  locked: "locked",
  failed: "failed",
  needs_review: "review",
  review: "review",
};

export function toStepStatus(raw: unknown): StepStatus {
  if (typeof raw !== "string") return "not_started";
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return STATUS_ALIASES[key] ?? "not_started";
}

export interface StepData extends Record<string, unknown> {
  title: string;
  stepKey?: string;
  status: StepStatus;
}

export type StepNode = Node<StepData, "step">;

const COLUMN_GAP = 320;
const ROW_GAP = 116;

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function edgeEnds(edge: Record<string, unknown>): [string, string] | null {
  const source =
    text(edge.source) ?? text(edge.from) ?? text(edge.source_id) ?? null;
  const target = text(edge.target) ?? text(edge.to) ?? text(edge.target_id);
  return source && target ? [source, target] : null;
}

function validPosition(node: BuildNode): { x: number; y: number } | null {
  const pos = node.position;
  return pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)
    ? { x: pos.x, y: pos.y }
    : null;
}

/**
 * Converts the backend graph into React Flow nodes and edges. Nodes without a
 * saved position are laid out left-to-right by how many steps must come first.
 */
export function toFlow(graph: BuildGraph): {
  nodes: StepNode[];
  edges: Edge[];
} {
  const ids = new Set(graph.nodes.map((node) => String(node.id)));

  const pairs: [string, string][] = [];
  for (const edge of graph.edges ?? []) {
    const ends = edgeEnds(edge);
    if (ends && ids.has(ends[0]) && ids.has(ends[1])) pairs.push(ends);
  }
  if (pairs.length === 0) {
    for (const node of graph.nodes) {
      for (const dep of node.dependencies ?? []) {
        if (ids.has(String(dep))) pairs.push([String(dep), String(node.id)]);
      }
    }
  }

  // Depth = longest chain of prerequisites. Bounded relaxation tolerates cycles.
  const depth = new Map<string, number>();
  ids.forEach((id) => depth.set(id, 0));
  for (let pass = 0; pass < ids.size; pass += 1) {
    let changed = false;
    for (const [source, target] of pairs) {
      const next = (depth.get(source) ?? 0) + 1;
      if (next > (depth.get(target) ?? 0) && next < ids.size) {
        depth.set(target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const rowInColumn = new Map<number, number>();
  const nodes: StepNode[] = graph.nodes.map((node) => {
    const id = String(node.id);
    const column = depth.get(id) ?? 0;
    const row = rowInColumn.get(column) ?? 0;
    rowInColumn.set(column, row + 1);

    return {
      id,
      type: "step",
      position: validPosition(node) ?? {
        x: column * COLUMN_GAP,
        y: row * ROW_GAP,
      },
      data: {
        title:
          text(node.title) ?? text(node.name) ?? text(node.label) ?? "Step",
        stepKey: text(node.key) ?? text(node.step_key),
        status: toStepStatus(node.status),
      },
    };
  });

  const edges: Edge[] = pairs.map(([source, target]) => ({
    id: `${source}->${target}`,
    source,
    target,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
  }));

  return { nodes, edges };
}
