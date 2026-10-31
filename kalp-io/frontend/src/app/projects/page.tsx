"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { getProjects, deleteProject, ApiError } from "@/lib/api";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const [, startTransition] = useTransition();

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || `Error loading projects (${err.status})`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Could not load your projects. Make sure the API is reachable.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      void loadProjects();
    })();
  }, []);

  const handleConfirmDelete = async () => {
    if (!projectToDelete || isDeleting) return;

    const targetId = projectToDelete.id;

    // Guard against deleting already deleted project (delete twice test case)
    if (deletedIds.has(targetId)) {
      setDeleteError("This project has already been deleted.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteProject(targetId);

      // Track deleted ID
      setDeletedIds((prev) => new Set(prev).add(targetId));

      // Remove immediately from active state
      startTransition(() => {
        setProjects((prev) => prev.filter((p) => p.id !== targetId));
      });

      setProjectToDelete(null);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          // Already gone on backend: treat as deleted
          setDeletedIds((prev) => new Set(prev).add(targetId));
          setProjects((prev) => prev.filter((p) => p.id !== targetId));
          setProjectToDelete(null);
        } else if (err.status === 403) {
          setDeleteError(
            err.detail || "You do not have permission to delete this project.",
          );
        } else {
          setDeleteError(
            err.detail || `Failed to delete project (${err.status})`,
          );
        }
      } else if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("An unexpected error occurred while deleting.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2 border-[var(--ink)] bg-[#B1DA19] text-black shadow-[2px_2px_0_var(--ink)]">
              Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
            My Projects
          </h1>
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Dependency-aware build plans you have created.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadProjects}
            disabled={isLoading}
            className="h-11 px-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-xs control-neo flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0_var(--ink)] disabled:opacity-50"
            title="Refresh projects"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 stroke-[2.5] ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/"
            className="h-11 px-5 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-extrabold text-sm control-neo inline-flex items-center gap-2 shadow-[4px_4px_0_var(--ink)] hover:bg-[#F2C215] transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Idea
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="card-neo p-4 border-2 border-[var(--ink)] bg-[#FC5082]/15 text-[var(--text)] flex items-start justify-between gap-3 shadow-[4px_4px_0_var(--ink)]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#FC5082] shrink-0 mt-0.5 stroke-[2.5]" />
            <p className="text-sm font-bold">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton / Spinner */}
      {isLoading && (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] flex items-center justify-center shadow-[4px_4px_0_var(--ink)]">
            <Loader2 className="w-6 h-6 animate-spin text-black stroke-[2.5]" />
          </div>
          <p className="text-sm font-bold text-[var(--text-muted)]">
            Loading your projects...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="card-neo p-8 sm:p-12 text-center space-y-6 max-w-lg mx-auto bg-[var(--surface)] shadow-[6px_6px_0_var(--ink)]">
          <div className="mx-auto w-16 h-16 rounded-2xl border-2 border-[var(--ink)] bg-[#FDE199] flex items-center justify-center text-black shadow-[4px_4px_0_var(--ink)]">
            <FolderOpen className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-[var(--text)]">
              No projects yet
            </h2>
            <p className="text-sm font-medium text-[var(--text-muted)]">
              Describe your software idea and let Kalp.io break it down into an
              executable build graph.
            </p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-extrabold text-sm control-neo shadow-[4px_4px_0_var(--ink)] hover:bg-[#F2C215] transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Create your first plan
            </Link>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project) => {
            const status = project.status || "ready";
            const dateStr = project.created_at
              ? new Date(project.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : null;

            return (
              <div
                key={project.id}
                className="card-neo p-5 sm:p-6 bg-[var(--surface)] flex flex-col justify-between space-y-4 shadow-[4px_4px_0_var(--ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border-2 border-[var(--ink)] bg-[#FFDB7F] text-black shadow-[1px_1px_0_var(--ink)]">
                        {status}
                      </span>
                      {dateStr && (
                        <span className="text-xs font-semibold text-[var(--text-muted)]">
                          {dateStr}
                        </span>
                      )}
                    </div>

                    {/* Delete Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setProjectToDelete(project);
                      }}
                      className="p-1.5 rounded-lg border-2 border-transparent hover:border-[var(--ink)] hover:bg-[#FC5082]/15 text-[var(--text-muted)] hover:text-[#FC5082] transition-colors cursor-pointer"
                      title="Delete project"
                      aria-label={`Delete ${project.title}`}
                    >
                      <Trash2 className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  <Link
                    href={`/p/${encodeURIComponent(project.id)}`}
                    className="block group"
                  >
                    <h3 className="text-lg font-extrabold text-[var(--text)] group-hover:text-[#8267F5] transition-colors tracking-tight line-clamp-1">
                      {project.title || "Untitled Project"}
                    </h3>
                  </Link>

                  {project.description && (
                    <p className="text-xs font-medium text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    ID: {project.id.slice(0, 8)}...
                  </span>

                  <Link
                    href={`/p/${encodeURIComponent(project.id)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--text)] hover:text-[#8267F5] transition-colors"
                  >
                    Open Graph
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {projectToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="card-neo w-full max-w-md p-6 bg-[var(--surface)] text-[var(--text)] space-y-5 shadow-[8px_8px_0_var(--ink)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-xl border-2 border-[var(--ink)] bg-[#FC5082] flex items-center justify-center text-black shadow-[3px_3px_0_var(--ink)]">
                <Trash2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) setProjectToDelete(null);
                }}
                disabled={isDeleting}
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h2
                id="modal-title"
                className="text-xl font-extrabold tracking-tight"
              >
                Delete Project?
              </h2>
              <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">
                Are you sure you want to delete{" "}
                <span className="font-extrabold text-[var(--text)]">
                  &ldquo;{projectToDelete.title}&rdquo;
                </span>
                ? This will permanently remove the project along with all of its
                nodes, dependencies, and webhook connections.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg border-2 border-[var(--ink)] bg-[#FC5082]/15 text-xs font-bold text-[#FC5082] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-xs control-neo cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border-2 border-[var(--ink)] bg-[#FC5082] text-black font-extrabold text-xs control-neo flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0_var(--ink)] disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                    Yes, Delete Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
