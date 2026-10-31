"use client";

import React, { Suspense, use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCode,
  FileText,
  GitBranch,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getProject, getProjectGraph } from "@/lib/api";
import type { BuildGraph, Project } from "@/types";
import { toFlow, type StepNode } from "@/lib/plan-map";
import { Graph } from "@/components/Graph";
import { NodePanel } from "@/components/NodePanel";
import { RepoConnect } from "@/components/RepoConnect";
import { downloadPlanAsJson, downloadPlanAsMarkdown } from "@/lib/export";

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
  const [showRepoModal, setShowRepoModal] = useState(false);
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

  // Initial load
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
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  // 10-second polling while repo is connected, paused when tab is hidden
  useEffect(() => {
    if (!project?.repo) return;

    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return; // Pause polling when tab is hidden
      }

      void getProjectGraph(projectId)
        .then((freshGraph) => {
          setGraph(freshGraph);
        })
        .catch(() => {
          // Silent catch during periodic background poll
        });
    }, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [projectId, project?.repo]);

  const flowNodes = useMemo(() => {
    if (!graph || !graph.nodes) return [];
    return toFlow(graph).nodes;
  }, [graph]);

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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <div className="card-neo px-3 py-2 flex items-center gap-2 bg-[var(--surface)] text-xs font-bold text-[var(--text)]">
              <CheckCircle2 className="w-4 h-4 text-[#3EC02F]" />
              <span>
                {completedNodes} / {nodes.length} done
              </span>
            </div>

            {graph && graph.nodes.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => downloadPlanAsMarkdown(graph, project)}
                  className="h-10 px-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-xs control-neo flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--ink)]"
                  title="Download Markdown checklist"
                >
                  <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>MD</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadPlanAsJson(graph, project)}
                  className="h-10 px-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-xs control-neo flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--ink)]"
                  title="Download plan as JSON"
                >
                  <FileCode className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>JSON</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowRepoModal(true)}
              className="h-10 px-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-xs control-neo flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--ink)]"
              title="Connect GitHub repository"
            >
              <GitBranch className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">
                {project?.repo ? "Repo Settings" : "Connect Repo"}
              </span>
              {project?.repo && (
                <span className="w-2 h-2 rounded-full bg-[#3EC02F]" />
              )}
            </button>

            <button
              type="button"
              onClick={fetchProjectAndGraph}
              className="h-10 px-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-xs control-neo flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--ink)]"
              title="Refresh graph"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout: Graph + Side Panel (NodePanel) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full min-w-0">
          <Graph
            graph={graph}
            className="h-[680px]"
            onNodeSelect={(node) => setSelectedNode(node)}
          />
        </div>

        {selectedNode && (
          <NodePanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            allNodes={flowNodes}
            onSelectNode={(depId) => {
              const target = flowNodes.find(
                (n) => n.id === depId || n.data.stepKey === depId,
              );
              if (target) {
                setSelectedNode(target);
              }
            }}
            onStatusChange={(nodeId, newStatus) => {
              setGraph((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  nodes: prev.nodes.map((n) =>
                    n.id === nodeId ? { ...n, status: newStatus } : n,
                  ),
                };
              });
              setSelectedNode((prev) =>
                prev && prev.id === nodeId
                  ? {
                      ...prev,
                      data: {
                        ...prev.data,
                        status: newStatus,
                      },
                    }
                  : prev,
              );
            }}
          />
        )}
      </div>

      {/* Repo Connect Modal */}
      {showRepoModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="repo-modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <RepoConnect
              projectId={projectId}
              repo={project?.repo ?? null}
              onRepoUpdated={(updatedRepo) => {
                setProject((prev) =>
                  prev ? { ...prev, repo: updatedRepo } : prev,
                );
              }}
            />
            <button
              type="button"
              onClick={() => setShowRepoModal(false)}
              aria-label="Close repo settings"
              className="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded border border-[var(--ink)] bg-[var(--surface)] control-neo cursor-pointer"
            >
              Close
            </button>
          </div>
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
