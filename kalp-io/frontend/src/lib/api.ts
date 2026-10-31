import type {
  BuildGraph,
  BuildNode,
  ConnectedRepoInfo,
  ConnectRepoPayload,
  ConnectRepoResponse,
  CreateProjectPayload,
  GitHubWebhookPayload,
  HealthResponse,
  LlmStatusResponse,
  NodeUpdatePayload,
  PingResponse,
  Project,
  ServiceInfo,
  SimpleActionResponse,
  WebhookResponse,
} from "@/types";

/**
 * Kalp.io Shared API Client
 * Reads backend API base URL from process.env.NEXT_PUBLIC_API_BASE_URL.
 * If unset or empty string, defaults to same origin ("").
 */
export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/+$/, "");

/**
 * Returns full URL for a given API path
 */
export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Shared API fetch wrapper for communicating with the FastAPI backend
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { params, headers: customHeaders, ...fetchOptions } = options;

  let url = getApiUrl(endpoint);
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers = new Headers(customHeaders);
  if (
    !headers.has("Content-Type") &&
    !(fetchOptions.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `API request failed with status ${response.status}: ${errorText || response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Endpoint implementations
 */

/** GET / -> basic service info */
export async function getServiceInfo(): Promise<ServiceInfo> {
  return apiFetch<ServiceInfo>("/", { method: "GET" });
}

/** GET /api/health -> { status: "ok" } */
export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health", { method: "GET" });
}

/** GET /api/ping -> { ping: "pong" } */
export async function getPing(): Promise<PingResponse> {
  return apiFetch<PingResponse>("/api/ping", { method: "GET" });
}

/** GET /api/llm/status -> Gemini availability for status page (key present, test call succeeds, model name) */
export async function getLlmStatus(): Promise<LlmStatusResponse> {
  return apiFetch<LlmStatusResponse>("/api/llm/status", { method: "GET" });
}

/** GET /api/projects -> list projects */
export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/projects", { method: "GET" });
}

/** POST /api/projects -> create project */
export async function createProject(
  payload: CreateProjectPayload,
): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/projects/{id} -> get one project */
export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "GET",
  });
}

/** DELETE /api/projects/{id} -> delete project (cascade nodes/edges/repo) */
export async function deleteProject(
  projectId: string,
): Promise<SimpleActionResponse> {
  return apiFetch<SimpleActionResponse>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
    },
  );
}

/** POST /api/projects/{id}/run -> run the project through Gemini and generate/refresh the graph */
export async function runProject(projectId: string): Promise<BuildGraph> {
  return apiFetch<BuildGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/run`,
    {
      method: "POST",
    },
  );
}

/** GET /api/projects/{id}/graph -> return nodes and edges for the project */
export async function getProjectGraph(projectId: string): Promise<BuildGraph> {
  return apiFetch<BuildGraph>(
    `/api/projects/${encodeURIComponent(projectId)}/graph`,
    {
      method: "GET",
    },
  );
}

/** PATCH /api/nodes/{id} -> partially update a node (title, position, status, notes, etc.) */
export async function updateNode(
  nodeId: string,
  payload: NodeUpdatePayload,
): Promise<BuildNode> {
  return apiFetch<BuildNode>(`/api/nodes/${encodeURIComponent(nodeId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** GET /api/projects/{id}/repo -> read the connected repo and its webhook info */
export async function getProjectRepo(
  projectId: string,
): Promise<ConnectedRepoInfo> {
  return apiFetch<ConnectedRepoInfo>(
    `/api/projects/${encodeURIComponent(projectId)}/repo`,
    {
      method: "GET",
    },
  );
}

/** POST /api/projects/{id}/repo -> connect a PUBLIC GitHub repo */
export async function connectProjectRepo(
  projectId: string,
  payload: ConnectRepoPayload,
): Promise<ConnectRepoResponse> {
  return apiFetch<ConnectRepoResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/repo`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/** DELETE /api/projects/{id}/repo -> disconnect repo */
export async function disconnectProjectRepo(
  projectId: string,
): Promise<SimpleActionResponse> {
  return apiFetch<SimpleActionResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/repo`,
    {
      method: "DELETE",
    },
  );
}

/** POST /api/webhook/github -> receive GitHub push events, verify HMAC signature, match repo to project */
export async function postGitHubWebhook(
  payload: GitHubWebhookPayload,
  signature256?: string,
): Promise<WebhookResponse> {
  const headers: Record<string, string> = {};
  if (signature256) {
    headers["X-Hub-Signature-256"] = signature256;
  }

  return apiFetch<WebhookResponse>("/api/webhook/github", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Grouped API object for convenience
 */
export const api = {
  getServiceInfo,
  getHealth,
  getPing,
  getLlmStatus,
  getProjects,
  createProject,
  getProject,
  deleteProject,
  runProject,
  getProjectGraph,
  updateNode,
  getProjectRepo,
  connectProjectRepo,
  disconnectProjectRepo,
  postGitHubWebhook,
};
