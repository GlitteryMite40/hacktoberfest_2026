import dagre from "dagre";
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
  id: string;
  title: string;
  stepKey?: string;
  status: StepStatus;
  phase?: string;
  purpose?: string;
  description?: string;
  notes?: string;
  dependencies?: string[];
  files?: string[];
  criteria?: string[];
  tests?: string[];
  prompt?: string;
}

export type StepNode = Node<StepData, "step">;

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 84;

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

export function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((v) => v.trim().replace(/^[-*•]\s*/, ""))
      .filter((v) => v.length > 0);
  }
  return [];
}

/**
 * Generates an LLM execution prompt for a step if not pre-populated.
 */
export function generatePrompt(data: Partial<StepData>): string {
  if (data.prompt && data.prompt.trim()) {
    return data.prompt.trim();
  }

  const parts: string[] = [];
  const title = data.title || "Step Task";
  const stepKey = data.stepKey ? `[${data.stepKey}] ` : "";

  parts.push(`FEATURE / TASK: ${stepKey}${title}`);
  if (data.phase) {
    parts.push(`PHASE: ${data.phase}`);
  }
  if (data.purpose || data.description) {
    parts.push(`\nPURPOSE:\n${data.purpose || data.description}`);
  }
  if (data.dependencies && data.dependencies.length > 0) {
    parts.push(
      `\nPREREQUISITES (NEEDS FIRST):\n${data.dependencies.map((d) => `- ${d}`).join("\n")}`,
    );
  }
  if (data.files && data.files.length > 0) {
    parts.push(
      `\nFILES / MODULES:\n${data.files.map((f) => `- ${f}`).join("\n")}`,
    );
  }
  if (data.criteria && data.criteria.length > 0) {
    parts.push(
      `\nACCEPTANCE CRITERIA:\n${data.criteria.map((c) => `- ${c}`).join("\n")}`,
    );
  }
  if (data.tests && data.tests.length > 0) {
    parts.push(`\nTEST CASES:\n${data.tests.map((t) => `- ${t}`).join("\n")}`);
  }

  return parts.join("\n");
}

/** Extracts or derives phase name for a node */
export function extractPhase(node: BuildNode): string | undefined {
  if (text(node.phase)) return text(node.phase);
  if (text(node.stage)) return text(node.stage);
  if (node.metadata && typeof node.metadata === "object") {
    const metaPhase = text((node.metadata as Record<string, unknown>).phase);
    if (metaPhase) return metaPhase;
  }
  const key = text(node.key) ?? text(node.step_key);
  if (key) {
    const match = key.match(/^(\d+)/);
    if (match?.[1]) {
      return `Phase ${match[1]}`;
    }
  }
  return undefined;
}

export interface LayoutOptions {
  direction?: "LR" | "TB";
  nodeWidth?: number;
  nodeHeight?: number;
  nodesep?: number;
  ranksep?: number;
}

/**
 * Layout nodes and edges using Dagre by phase / dependency rank.
 */
export function layoutWithDagre(
  nodes: StepNode[],
  edges: Edge[],
  options: LayoutOptions = {},
): { nodes: StepNode[]; edges: Edge[] } {
  const {
    direction = "LR",
    nodeWidth = NODE_WIDTH,
    nodeHeight = NODE_HEIGHT,
    nodesep = 50,
    ranksep = 80,
  } = options;

  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep,
    ranksep,
    marginx: 40,
    marginy: 40,
  });

  // Track distinct phases to support phase grouping
  const phases = new Set<string>();
  for (const node of nodes) {
    if (node.data.phase) {
      phases.add(node.data.phase);
    }
  }

  // Register nodes
  for (const node of nodes) {
    g.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
      label: node.data.title,
    });
  }

  // Register edges
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, {}, edge.id);
  }

  // If multiple phases exist, add ordering hints between phases if no cycle is created
  if (phases.size > 1) {
    const sortedPhases = Array.from(phases).sort();
    const phaseNodesMap = new Map<string, string[]>();
    for (const node of nodes) {
      if (node.data.phase) {
        const list = phaseNodesMap.get(node.data.phase) ?? [];
        list.push(node.id);
        phaseNodesMap.set(node.data.phase, list);
      }
    }

    // Connect last node of previous phase to first node of next phase if not already connected
    for (let i = 0; i < sortedPhases.length - 1; i++) {
      const prevPhaseName = sortedPhases[i]!;
      const nextPhaseName = sortedPhases[i + 1]!;
      const prevNodes = phaseNodesMap.get(prevPhaseName);
      const nextNodes = phaseNodesMap.get(nextPhaseName);

      if (prevNodes?.[0] && nextNodes?.[0]) {
        // Only set if not already introducing an edge
        if (!g.hasEdge(prevNodes[0], nextNodes[0])) {
          // Weight 0 / minlen 1 as soft alignment hint
          g.setEdge(
            prevNodes[0],
            nextNodes[0],
            { minlen: 1, weight: 0 },
            `hint_${prevPhaseName}_${nextPhaseName}`,
          );
        }
      }
    }
  }

  // Execute Dagre layout calculation
  dagre.layout(g);

  // Position nodes based on Dagre layout (convert from center anchor to top-left anchor)
  const layoutedNodes: StepNode[] = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const x = dagreNode ? dagreNode.x - nodeWidth / 2 : 0;
    const y = dagreNode ? dagreNode.y - nodeHeight / 2 : 0;

    return {
      ...node,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Converts backend BuildGraph into React Flow nodes and edges,
 * laid out with Dagre.
 */
export function toFlow(
  graph: BuildGraph,
  options: LayoutOptions = {},
): {
  nodes: StepNode[];
  edges: Edge[];
} {
  const ids = new Set(graph.nodes.map((node) => String(node.id)));

  // Extract explicit edges or dependency pairs
  const pairs: [string, string][] = [];
  for (const edge of graph.edges ?? []) {
    const ends = edgeEnds(edge);
    if (ends && ids.has(ends[0]) && ids.has(ends[1])) {
      pairs.push(ends);
    }
  }
  if (pairs.length === 0) {
    for (const node of graph.nodes) {
      for (const dep of node.dependencies ?? []) {
        if (ids.has(String(dep))) {
          pairs.push([String(dep), String(node.id)]);
        }
      }
    }
  }

  const rawNodes: StepNode[] = graph.nodes.map((node) => {
    const id = String(node.id);
    const stepKey = text(node.key) ?? text(node.step_key);
    const phase = extractPhase(node);
    const purpose = text(node.purpose) ?? text(node.description);
    const files = toList(node.files);
    const criteria = toList(node.criteria ?? node.acceptance_criteria);
    const tests = toList(node.tests ?? node.test_cases);
    const dependencies = node.dependencies?.map(String);

    const stepData: StepData = {
      id,
      title: text(node.title) ?? text(node.name) ?? text(node.label) ?? "Step",
      stepKey,
      status: toStepStatus(node.status),
      phase,
      purpose,
      description: text(node.description),
      notes: text(node.notes),
      dependencies,
      files: files.length > 0 ? files : undefined,
      criteria: criteria.length > 0 ? criteria : undefined,
      tests: tests.length > 0 ? tests : undefined,
      prompt: text(node.prompt),
    };

    if (!stepData.prompt) {
      stepData.prompt = generatePrompt(stepData);
    }

    return {
      id,
      type: "step",
      position: { x: 0, y: 0 },
      data: stepData,
    };
  });

  const rawEdges: Edge[] = pairs.map(([source, target]) => ({
    id: `${source}->${target}`,
    source,
    target,
    type: "smoothstep",
    style: { stroke: "var(--ink)", strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: "var(--ink)",
    },
  }));

  return layoutWithDagre(rawNodes, rawEdges, options);
}
