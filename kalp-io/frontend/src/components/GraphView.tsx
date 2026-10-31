"use client";

import React, { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import type { StepNode } from "@/lib/plan-map";
import { StepNodeComponent } from "@/components/StepNode";

interface GraphViewProps {
  nodes: StepNode[];
  edges: Edge[];
}

export function GraphView({ nodes, edges }: GraphViewProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      step: StepNodeComponent,
    }),
    [],
  );

  return (
    <div className="w-full h-[600px] card-neo overflow-hidden relative bg-[var(--background)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background gap={20} size={1.5} color="var(--ink)" />
        <Controls
          className="!border-2 !border-[var(--ink)] !rounded-xl !overflow-hidden !shadow-[4px_4px_0_var(--ink)] !bg-[var(--surface)]"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
