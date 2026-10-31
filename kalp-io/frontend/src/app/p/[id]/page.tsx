"use client";

import React, { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getProject, getProjectGraph } from "@/lib/api";
import type { BuildGraph, Project } from "@/types";
import type { StepNode } from "@/lib/plan-map";
import { Graph } from "@/components/Graph";

interface PageProps {
  params: Promise<{ id: string }>;
}

function LoadingFallback() {
  return (
    <div className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-12 flex flex-col items-center justify-center space-y-4">
      <div className="w-14 h-14 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] flex items-center justify-center shadow-[4px_4px_0_var(--ink)]">
        <Loader2 className="w-7 h-7 animate-spin text-black stroke-[2.5]" />
      </div>
      <p className="font-bold text-sm text-[var(--text-muted)]">
        Loading build graph...
      </p>
    </div>
  );
}

function ProjectGraphContent({ params }: PageProps) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [graph, setGraph] = useState<BuildGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<StepNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectAndGraph = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projData, graphData] = await Promise.all([
        getProject(projectId).catch(() => null),
        getProjectGraph(projectId),
      ]);

      if (projData) setProject(projData);
      setGraph(graphData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load project build graph.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      await Promise.resolve();
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      try {
        const [projData, graphData] = await Promise.all([
          getProject(projectId).catch(() => null),
          getProjectGraph(projectId),
        ]);
        if (!isMounted) return;
        if (projData) setProject(projData);
        setGraph(graphData);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load project build graph.",
        );
      } finally {
        if (!isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (error || !graph) {
    return (
      <div className="flex-1 max-w-2xl w-full mx-auto p-6 sm:p-12 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          Back to ideas
        </Link>
        <div className="card-neo p-6 space-y-4 bg-[var(--surface)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] border-2 border-[var(--ink)] bg-[#FC5082] flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0_var(--ink)]">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-[var(--text)]">
                Could not load graph
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {error || "The project graph could not be found."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchProjectAndGraph}
            className="h-11 px-5 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-bold text-sm control-neo flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 stroke-[2.5]" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const nodes = graph.nodes ?? [];
  const completedNodes = nodes.filter(
    (n) => n.status === "completed" || n.status === "done",
  ).length;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
      {/* Top Navigation & Project Header */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          Back to ideas
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2 border-[var(--ink)] bg-[#FFCF1E] text-black shadow-[2px_2px_0_var(--ink)]">
                Build Graph
              </span>
              {project?.status && (
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--text)] shadow-[2px_2px_0_var(--ink)]">
                  {project.status}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
              {project?.title || "Project Build Graph"}
            </h1>
            {project?.description && (
              <p className="text-sm font-medium text-[var(--text-muted)] max-w-3xl line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="card-neo px-3.5 py-2 flex items-center gap-2 bg-[var(--surface)] text-xs font-bold text-[var(--text)]">
              <CheckCircle2 className="w-4 h-4 text-[#3EC02F]" />
              <span>
                {completedNodes} / {nodes.length} done
              </span>
            </div>
            <button
              type="button"
              onClick={fetchProjectAndGraph}
              className="h-10 px-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-xs control-neo flex items-center gap-1.5 cursor-pointer"
              title="Refresh graph"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Component */}
      <Graph
        graph={graph}
        className="h-[680px]"
        onNodeSelect={(node) => setSelectedNode(node)}
      />

      {/* Selected Node Details Drawer / Card */}
      {selectedNode && (
        <div className="card-neo p-5 sm:p-6 space-y-3 bg-[var(--surface)] animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8267F5]" />
              <h3 className="font-bold text-base text-[var(--text)]">
                {selectedNode.data.title}
              </h3>
              {selectedNode.data.stepKey && (
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  ({selectedNode.data.stepKey})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-xs font-bold px-2 py-1 rounded border border-[var(--ink)] bg-[var(--background)] hover:bg-[var(--surface)]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-bold text-[var(--text-muted)] block mb-0.5">
                Status
              </span>
              <span className="font-extrabold capitalize text-[var(--text)]">
                {selectedNode.data.status.replace("_", " ")}
              </span>
            </div>
            {selectedNode.data.phase && (
              <div>
                <span className="font-bold text-[var(--text-muted)] block mb-0.5">
                  Phase
                </span>
                <span className="font-bold text-[var(--text)]">
                  {selectedNode.data.phase}
                </span>
              </div>
            )}
            <div>
              <span className="font-bold text-[var(--text-muted)] block mb-0.5">
                Prerequisites
              </span>
              <span className="font-mono text-[var(--text)]">
                {selectedNode.data.dependencies?.length
                  ? selectedNode.data.dependencies.join(", ")
                  : "None"}
              </span>
            </div>
          </div>

          {selectedNode.data.description && (
            <p className="text-xs text-[var(--text-muted)] font-medium pt-1">
              {selectedNode.data.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectGraphPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProjectGraphContent params={props.params} />
    </Suspense>
  );
}
