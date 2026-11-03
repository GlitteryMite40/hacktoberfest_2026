/**
 * Kalp.io Core API Types mirroring FastAPI backend response models (snake_case)
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
  "pending" | "in_progress" | "committed" | "completed" | "failed" | string;

export interface NodePosition {
  x: number;
  y: number;
}

export interface DriftInfo {
  drifted?: boolean;
  reason?: string;
  diff?: string;
  modified_files?: string[];
  suggested_match?: string;
  [key: string]: unknown;
}

export interface BuildNode {
  id: string;
  title?: string;
  name?: string;
  key?: string;
  step_key?: string;
  phase?: string;
  stage?: string;
  purpose?: string;
  description?: string;
  status?: NodeStatus;
  position?: NodePosition;
  notes?: string;
  dependencies?: string[];
  files?: string[] | string;
  criteria?: string[] | string;
  acceptance_criteria?: string[] | string;
  tests?: string[] | string;
  test_cases?: string[] | string;
  prompt?: string;
  suggested_match?: string;
  drift?: DriftInfo | boolean | string;
  drift_reason?: string;
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

export interface ProjectStage {
  key?: string;
  name?: string;
  label?: string;
  status?: string;
  error?: string | null;
  [key: string]: unknown;
}

export interface ConnectedRepoInfo {
  url: string;
  owner: string;
  name: string;
  webhook_url?: string;
  webhook_secret?: string;
  created_at?: string;
  last_delivery?: string;
  [key: string]: unknown;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  idea?: string;
  status?: string;
  current_stage?: string;
  stages?: ProjectStage[] | Record<string, ProjectStage | string>;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  repo?: ConnectedRepoInfo | null;
  [key: string]: unknown;
}

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

/** FastAPI Validation Error structure for HTTP 422 */
export interface ValidationErrorDetail {
  loc?: (string | number)[];
  msg: string;
  type?: string;
  ctx?: Record<string, unknown>;
}
