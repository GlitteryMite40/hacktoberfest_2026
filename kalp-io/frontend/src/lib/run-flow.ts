import { ApiError } from "@/lib/api";
import type { Project, ProjectStage } from "@/types";

/**
 * Drives plan generation: POST /api/projects/{id}/run advances one stage, so we
 * call it repeatedly, re-reading GET /api/projects/{id} after each call. The
 * project record is the source of truth, which is what makes refresh-resume work.
 */

export type StageStatus = "pending" | "running" | "done" | "failed";

export interface StageView {
  key: string;
  label: string;
  status: StageStatus;
}

export type Phase = "running" | "done" | "failed";

export interface Progress {
  stages: StageView[];
  phase: Phase;
  /** Backend error text for the failed stage, if any. */
  error?: string;
}

const DONE_WORDS = new Set([
  "done",
  "complete",
  "completed",
  "finished",
  "success",
  "succeeded",
]);
const FAILED_WORDS = new Set(["failed", "failure", "error", "errored"]);
const RUNNING_WORDS = new Set([
  "running",
  "in_progress",
  "in-progress",
  "processing",
  "started",
  "active",
  "generating",
]);

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function toStageStatus(raw: unknown): StageStatus {
  const word = asText(raw)?.toLowerCase();
  if (!word) return "pending";
  if (DONE_WORDS.has(word)) return "done";
  if (FAILED_WORDS.has(word)) return "failed";
  if (RUNNING_WORDS.has(word)) return "running";
  return "pending";
}

/** "data_model" -> "Data model" */
export function prettyStageName(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.length === 0
    ? key
    : words.charAt(0).toUpperCase() + words.slice(1);
}

function stageFromObject(stage: ProjectStage, fallbackKey: string): StageView {
  const key =
    asText(stage.key) ?? asText(stage.name) ?? asText(stage.id) ?? fallbackKey;
  return {
    key,
    label: asText(stage.label) ?? asText(stage.title) ?? prettyStageName(key),
    status: toStageStatus(stage.status),
  };
}

function readStages(raw: Project["stages"]): StageView[] {
  if (Array.isArray(raw)) {
    return raw.map((stage, index) =>
      typeof stage === "string"
        ? { key: stage, label: prettyStageName(stage), status: "pending" }
        : stageFromObject(stage, `stage-${index + 1}`),
    );
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([key, value]) =>
      typeof value === "string"
        ? { key, label: prettyStageName(key), status: toStageStatus(value) }
        : stageFromObject(value, key),
    );
  }
  return [];
}

function stageError(raw: Project["stages"]): string | undefined {
  const list = Array.isArray(raw) ? raw : raw ? Object.values(raw) : [];
  for (const stage of list) {
    if (stage && typeof stage === "object" && asText(stage.error)) {
      return asText(stage.error);
    }
  }
  return undefined;
}

/** Turns a project record into the progress the UI shows. */
export function readProgress(project: Project): Progress {
  let stages = readStages(project.stages);
  const overall = asText(project.status)?.toLowerCase();
  const current = asText(project.current_stage);

  const anyFailed = stages.some((stage) => stage.status === "failed");
  const allDone =
    stages.length > 0 && stages.every((stage) => stage.status === "done");

  let phase: Phase = "running";
  if ((overall && FAILED_WORDS.has(overall)) || anyFailed) {
    phase = "failed";
  } else if ((overall && DONE_WORDS.has(overall)) || allDone) {
    phase = "done";
    stages = stages.map((stage) => ({ ...stage, status: "done" }));
  }

  // If the overall status failed but no stage says so, blame the current one.
  if (phase === "failed" && !anyFailed && current) {
    stages = stages.map((stage) =>
      stage.key === current ? { ...stage, status: "failed" } : stage,
    );
  }

  return {
    stages,
    phase,
    error:
      phase === "failed"
        ? (asText(project.error) ?? stageError(project.stages))
        : undefined,
  };
}

/** Marks the first unfinished stage as running, for instant feedback. */
export function markNextRunning(progress: Progress): Progress {
  const index = progress.stages.findIndex(
    (stage) => stage.status === "pending" || stage.status === "failed",
  );
  if (index === -1) return { ...progress, phase: "running", error: undefined };
  return {
    phase: "running",
    error: undefined,
    stages: progress.stages.map((stage, i) =>
      i === index ? { ...stage, status: "running" } : stage,
    ),
  };
}

/** The stage that failed, or the first unfinished one. */
export function failedStage(progress: Progress): StageView | undefined {
  return (
    progress.stages.find((stage) => stage.status === "failed") ??
    progress.stages.find((stage) => stage.status !== "done")
  );
}

/** Plain-language explanation for a thrown error. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "We couldn't find this plan. It may have been deleted.";
    }
    if (error.status === 429) {
      return "The AI is busy right now. Wait a minute, then tap Retry.";
    }
    if (error.status >= 500) {
      return error.detail
        ? `The server hit a problem: ${error.detail}`
        : "The server hit a problem.";
    }
    return error.detail ?? `The request failed (error ${error.status}).`;
  }
  if (error instanceof TypeError) {
    return "Kalp.io's server isn't answering. Check your connection, or that the server is running.";
  }
  return "Something unexpected went wrong.";
}

export interface RunDeps {
  run(projectId: string): Promise<unknown>;
  get(projectId: string): Promise<Project>;
}

export type RunOutcome =
  | { kind: "done"; progress: Progress }
  | { kind: "failed"; progress: Progress; message: string }
  | { kind: "cancelled" };

export interface RunOptions {
  signal?: AbortSignal;
  /** Safety cap on run calls so a misbehaving backend can't loop forever. */
  maxSteps?: number;
}

/**
 * Calls the run route until every stage is done or one fails.
 * `onProgress` receives each intermediate state.
 */
export async function runStages(
  projectId: string,
  initial: Progress,
  deps: RunDeps,
  onProgress: (progress: Progress) => void,
  { signal, maxSteps = 25 }: RunOptions = {},
): Promise<RunOutcome> {
  let current = initial;
  if (current.phase === "done") return { kind: "done", progress: current };

  for (let step = 0; step < maxSteps; step += 1) {
    if (signal?.aborted) return { kind: "cancelled" };

    const optimistic = markNextRunning(current);
    onProgress(optimistic);

    try {
      await deps.run(projectId);
    } catch (error) {
      if (signal?.aborted) return { kind: "cancelled" };
      // The run call failed; read back what the server saved, if we can.
      let saved = optimistic;
      try {
        saved = readProgress(await deps.get(projectId));
      } catch {
        // Keep the optimistic view.
      }
      const progress = withFailure(saved);
      onProgress(progress);
      return { kind: "failed", progress, message: describeError(error) };
    }

    if (signal?.aborted) return { kind: "cancelled" };

    try {
      current = readProgress(await deps.get(projectId));
    } catch (error) {
      if (signal?.aborted) return { kind: "cancelled" };
      const progress = withFailure(optimistic);
      onProgress(progress);
      return { kind: "failed", progress, message: describeError(error) };
    }

    onProgress(current);
    if (current.phase === "done") return { kind: "done", progress: current };
    if (current.phase === "failed") {
      return {
        kind: "failed",
        progress: current,
        message: current.error ?? "This step didn't finish.",
      };
    }
  }

  const progress = withFailure(current);
  onProgress(progress);
  return {
    kind: "failed",
    progress,
    message: "This is taking longer than expected.",
  };
}

/** Converts any running stage to failed so the UI can point at it. */
function withFailure(progress: Progress): Progress {
  return {
    ...progress,
    phase: "failed",
    stages: progress.stages.map((stage) =>
      stage.status === "running" ? { ...stage, status: "failed" } : stage,
    ),
  };
}
