"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  applyNodeChanges,
} from "@xyflow/react";
import type { BuildGraph } from "@/types";
import {
  toFlow,
  type LayoutOptions,
  type StepNode,
  type StepStatus,
} from "@/lib/plan-map";
import { StepNodeComponent } from "@/components/StepNode";

export interface GraphProps {
  graph: BuildGraph;
  className?: string;
  onNodeSelect?: (node: StepNode | null) => void;
  direction?: "LR" | "TB";
}

const STATUS_LEGEND: { status: StepStatus; label: string; color: string }[] = [
  { status: "not_started", label: "Not started", color: "var(--surface)" },
  { status: "next", label: "Next up", color: "#FFCF1E" },
  { status: "in_progress", label: "In progress", color: "#8267F5" },
  { status: "committed", label: "Committed", color: "#B1DA19" },
  { status: "done", label: "Done", color: "#3EC02F" },
  { status: "locked", label: "Locked", color: "#999999" },
  { status: "failed", label: "Didn't work", color: "#FC5082" },
  { status: "review", label: "Check this", color: "#FDE199" },
];

export function Graph({
  graph,
  className = "h-[650px]",
  onNodeSelect,
  direction = "LR",
}: GraphProps) {
  const [currentDirection, setCurrentDirection] = useState<"LR" | "TB">(
    direction,
  );

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      step: StepNodeComponent,
    }),
    [],
  );

  // Compute Dagre layout by phase
  const layoutOptions: LayoutOptions = useMemo(
    () => ({
      direction: currentDirection,
      nodeWidth: 260,
      nodeHeight: 84,
      nodesep: 40,
      ranksep: 80,
    }),
    [currentDirection],
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    const flow = toFlow(graph, layoutOptions);
    return {
      initialNodes: flow.nodes,
      initialEdges: flow.edges,
    };
  }, [graph, layoutOptions]);

  const [nodes, setNodes] = useState<StepNode[]>(initialNodes);
  const [edges] = useState<Edge[]>(initialEdges);

  // Update nodes when initialNodes changes
  React.useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setNodes(initialNodes);
    });
    return () => {
      active = false;
    };
  }, [initialNodes]);

  const onNodesChange: OnNodesChange<StepNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: StepNode) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect],
  );

  const nodeCount = graph.nodes?.length ?? 0;
  const edgeCount =
    (graph.edges?.length || 0) > 0 ? graph.edges!.length : edges.length;

  return (
    <div
      className={`w-full card-neo overflow-hidden relative bg-[var(--background)] ${className}`}
    >
      {/* Top action bar: stats + layout switch */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--text)] shadow-[2px_2px_0_var(--ink)]">
          {nodeCount} {nodeCount === 1 ? "step" : "steps"} · {edgeCount}{" "}
          {edgeCount === 1 ? "dependency" : "dependencies"}
        </span>
        <button
          type="button"
          onClick={() =>
            setCurrentDirection((dir) => (dir === "LR" ? "TB" : "LR"))
          }
          className="text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--text)] shadow-[2px_2px_0_var(--ink)] control-neo cursor-pointer"
          aria-label={`Toggle layout direction. Current: ${currentDirection === "LR" ? "Left to Right" : "Top to Bottom"}`}
        >
          Layout: {currentDirection === "LR" ? "Left → Right" : "Top ↓ Bottom"}
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={true}
        nodesConnectable={false}
        nodesFocusable={true}
        elementsSelectable={true}
      >
        <Background gap={24} size={1.5} color="var(--ink)" />
        <Controls
          className="!border-2 !border-[var(--ink)] !rounded-xl !overflow-hidden !shadow-[4px_4px_0_var(--ink)] !bg-[var(--surface)]"
          showInteractive={false}
        />
        {nodeCount >= 10 && (
          <MiniMap
            className="!border-2 !border-[var(--ink)] !rounded-xl !shadow-[4px_4px_0_var(--ink)] !bg-[var(--surface)] hidden sm:block"
            nodeColor={(node) => {
              const status = (node.data as { status?: StepStatus })?.status;
              const match = STATUS_LEGEND.find((l) => l.status === status);
              return match?.color ?? "#8267F5";
            }}
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            maskColor="rgba(0, 0, 0, 0.2)"
          />
        )}
      </ReactFlow>

      {/* Bottom Status Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden md:flex items-center gap-3 p-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)]/95 backdrop-blur shadow-[2px_2px_0_var(--ink)] text-[11px] font-bold text-[var(--text)]">
        <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
          Legend:
        </span>
        {STATUS_LEGEND.slice(0, 5).map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-[3px] border border-[var(--ink)]"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
