/**
 * Kalp.io Core Types
 */

export interface ServiceInfo {
  name?: string;
  version?: string;
  description?: string;
  [key: string]: unknown;
}

export interface HealthResponse {
  status: "ok" | string;
  [key: string]: unknown;
}

export interface PingResponse {
  ping: "pong" | string;
  [key: string]: unknown;
}

export interface LlmStatusResponse {
  key_present: boolean;
  test_call_success: boolean;
  model_name: string;
  [key: string]: unknown;
}

export type NodeStatus =
  "pending" | "in_progress" | "completed" | "failed" | string;

export interface NodePosition {
  x: number;
  y: number;
}

export interface BuildNode {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  status?: NodeStatus;
  position?: NodePosition;
  notes?: string;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NodeUpdatePayload {
  title?: string;
  name?: string;
  description?: string;
  status?: NodeStatus;
  position?: NodePosition;
  notes?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BuildEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  [key: string]: unknown;
}

export interface BuildGraph {
  nodes: BuildNode[];
  edges?: BuildEdge[];
}

export interface ProjectIdea {
  title: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  /** The raw idea text the plan is generated from. */
  idea?: string;
  /** Overall generation status, e.g. "pending" | "running" | "completed" | "failed". */
  status?: string;
  /** Key of the stage currently being generated. */
  current_stage?: string;
  /** Generation stages, as a list or a key -> status map. */
  stages?: ProjectStage[] | Record<string, ProjectStage | string>;
  /** Last error message from a failed stage. */
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  repo?: ConnectedRepoInfo | null;
  [key: string]: unknown;
}

export interface ProjectStage {
  key?: string;
  name?: string;
  label?: string;
  status?: string;
  error?: string | null;
  [key: string]: unknown;
}

/** Response of POST /api/projects/{id}/run (advances one stage). */
export interface RunStageResponse {
  stage?: string;
  status?: string;
  done?: boolean;
  [key: string]: unknown;
}

export interface CreateProjectPayload {
  title: string;
  description?: string;
  idea?: string;
  [key: string]: unknown;
}

export interface ConnectedRepoInfo {
  url: string;
  owner: string;
  name: string;
  webhook_url?: string;
  webhook_secret?: string;
  [key: string]: unknown;
}

export interface ConnectRepoPayload {
  url: string;
  [key: string]: unknown;
}

export interface ConnectRepoResponse {
  url: string;
  owner: string;
  name: string;
  webhook_url: string;
  webhook_secret: string;
  [key: string]: unknown;
}

export interface GitHubWebhookPayload {
  [key: string]: unknown;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface SimpleActionResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}
