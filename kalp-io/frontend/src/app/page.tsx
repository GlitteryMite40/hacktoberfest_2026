"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  FileText,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import {
  createProject,
  getProject,
  getProjectGraph,
  runProject,
} from "@/lib/api";
import {
  countChars,
  formatCount,
  readIdeaFile,
  titleFromIdea,
  validateIdea,
} from "@/lib/idea-input";
import { IDEA_MAX_CHARS, IDEA_MIN_CHARS } from "@/lib/limits";
import { toFlow } from "@/lib/plan-map";
import {
  readProgress,
  runStages,
  type Progress,
  type RunOutcome,
} from "@/lib/run-flow";
import type { BuildGraph } from "@/types";
import { GraphView } from "@/components/GraphView";
import { StageProgress } from "@/components/StageProgress";

export default function HomePage() {
  const [idea, setIdea] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [graph, setGraph] = useState<BuildGraph | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const charCount = useMemo(() => countChars(idea), [idea]);
  const isOverLimit = charCount > IDEA_MAX_CHARS;

  // Convert graph into React Flow nodes and edges
  const flowData = useMemo(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) return null;
    return toFlow(graph);
  }, [graph]);

  // Load the graph for a project once generation is finished
  const loadGraph = useCallback(async (id: string) => {
    try {
      const g = await getProjectGraph(id);
      setGraph(g);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not load the generated graph.",
      );
    }
  }, []);

  // Run the multi-stage generation loop for a project
  const executeRunFlow = useCallback(
    async (id: string, initialProgress: Progress) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const outcome: RunOutcome = await runStages(
        id,
        initialProgress,
        {
          run: (pId) => runProject(pId),
          get: (pId) => getProject(pId),
        },
        (p) => setProgress(p),
        { signal: controller.signal },
      );

      if (outcome.kind === "done") {
        await loadGraph(id);
      } else if (outcome.kind === "failed") {
        setSubmitError(outcome.message);
      }
    },
    [loadGraph],
  );

  // Resume on page refresh using GET /api/projects/[id]
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const existingId =
      params.get("project") || localStorage.getItem("kalp_current_project");

    if (!existingId) return;

    let isMounted = true;

    void (async () => {
      await Promise.resolve();
      if (!isMounted) return;
      setIsResuming(true);
      setProjectId(existingId);

      try {
        const project = await getProject(existingId);
        if (!isMounted) return;
        const initialProgress = readProgress(project);
        setProgress(initialProgress);

        if (initialProgress.phase === "done") {
          await loadGraph(existingId);
        } else if (initialProgress.phase === "running") {
          executeRunFlow(existingId, initialProgress);
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem("kalp_current_project");
          setProjectId(null);
          setProgress(null);
        }
      } finally {
        if (isMounted) setIsResuming(false);
      }
    })();

    return () => {
      isMounted = false;
      abortControllerRef.current?.abort();
    };
  }, [executeRunFlow, loadGraph]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setValidationError(null);

    const result = await readIdeaFile(file, IDEA_MAX_CHARS);
    if (!result.ok) {
      setFileError(result.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIdea(result.text);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit idea
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setFileError(null);
    setSubmitError(null);

    const error = validateIdea(idea, IDEA_MAX_CHARS, IDEA_MIN_CHARS);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const project = await createProject({
        title: titleFromIdea(idea),
        description: idea,
        idea,
      });

      setProjectId(project.id);
      localStorage.setItem("kalp_current_project", project.id);
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `?project=${project.id}`);
      }

      const initialProgress = readProgress(project);
      setProgress(initialProgress);
      setIsSubmitting(false);

      await executeRunFlow(project.id, initialProgress);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create project plan.",
      );
    }
  };

  // Retry a failed stage
  const handleRetry = async () => {
    if (!projectId || !progress) return;
    setIsRetrying(true);
    setSubmitError(null);
    try {
      await executeRunFlow(projectId, progress);
    } finally {
      setIsRetrying(false);
    }
  };

  // Reset to create a new plan
  const handleStartNew = () => {
    abortControllerRef.current?.abort();
    setProjectId(null);
    setProgress(null);
    setGraph(null);
    setIdea("");
    setValidationError(null);
    setFileError(null);
    setSubmitError(null);
    localStorage.removeItem("kalp_current_project");
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", window.location.pathname);
    }
  };

  // Initial resume loading state
  if (isResuming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-[10px] border-2 border-[var(--ink)] bg-[#FFCF1E] flex items-center justify-center shadow-[4px_4px_0_var(--ink)]">
          <Loader2 className="w-6 h-6 animate-spin text-black stroke-[2.5]" />
        </div>
        <p className="font-bold text-sm text-[var(--text-muted)]">
          Resuming your saved plan...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* View 1: Finished Graph View */}
      {graph && flowData && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border-2 border-[var(--ink)] bg-[#3EC02F] text-black shadow-[2px_2px_0_var(--ink)]">
                Plan ready
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight mt-2">
                Dependency-aware build graph
              </h1>
              <p className="text-sm font-medium text-[var(--text-muted)] mt-1">
                Explore the steps and dependencies generated from your project
                idea.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartNew}
              className="h-12 px-5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] font-bold text-sm text-[var(--text)] control-neo flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Start new plan
            </button>
          </div>

          <GraphView nodes={flowData.nodes} edges={flowData.edges} />
        </div>
      )}

      {/* View 2: Progress & Run Stages View */}
      {!graph && progress && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <StageProgress
            progress={progress}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
          <div className="text-center">
            <button
              type="button"
              onClick={handleStartNew}
              className="text-xs font-bold text-[var(--text-muted)] underline hover:text-[var(--text)] transition-colors"
            >
              Cancel and start a new idea
            </button>
          </div>
        </div>
      )}

      {/* View 3: Input Form View */}
      {!graph && !progress && (
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Headline */}
          <div className="text-center sm:text-left space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text)] tracking-tight leading-tight">
              Plan it before you vibe code it.
            </h1>
            <p className="text-base font-medium text-[var(--text-muted)]">
              Drop your idea or upload a specification document. Kalp.io breaks
              it into a step-by-step dependency graph.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="card-neo p-6 sm:p-8 space-y-6"
          >
            {/* Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="idea-input"
                  className="font-bold text-sm text-[var(--text)]"
                >
                  Your project idea
                </label>
                <span
                  className={`font-mono text-xs font-semibold ${
                    isOverLimit ? "text-[#FC5082]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {formatCount(charCount)} / {formatCount(IDEA_MAX_CHARS)}
                </span>
              </div>
              <textarea
                id="idea-input"
                rows={6}
                value={idea}
                onChange={(e) => {
                  setIdea(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Describe what you want to build... e.g. A real-time collaborative canvas with live cursors, shape tools, and local-first SQLite persistence."
                className="w-full p-4 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] text-[var(--text)] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#8267F5] placeholder:text-[var(--text-muted)] resize-y"
              />
            </div>

            {/* File Upload Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t-2 border-[var(--ink)]/10">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="h-10 px-4 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--text)] font-bold text-xs flex items-center gap-2 control-neo cursor-pointer select-none"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                  Upload .txt or .md
                </label>
                <span className="text-xs text-[var(--text-muted)]">
                  Max {formatCount(IDEA_MAX_CHARS)} chars
                </span>
              </div>

              {idea.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ready to plan</span>
                </div>
              )}
            </div>

            {/* Validation & Error Alerts */}
            {(validationError || fileError || submitError) && (
              <div className="p-3.5 rounded-xl border-2 border-[var(--ink)] bg-[#FC5082]/10 flex items-start gap-3">
                <div className="w-6 h-6 rounded-[6px] border-2 border-[var(--ink)] bg-[#FC5082] flex items-center justify-center text-black shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="text-xs font-semibold text-[var(--text)] leading-snug">
                  {validationError || fileError || submitError}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-extrabold text-base control-neo flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-[4px_4px_0_var(--ink)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin stroke-[2.5]" />
                  Creating plan...
                </>
              ) : (
                <>
                  Generate build graph
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
