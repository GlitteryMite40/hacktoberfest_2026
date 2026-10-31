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
  RunStageResponse,
  ServiceInfo,
  SimpleActionResponse,
  ValidationErrorDetail,
  WebhookResponse,
} from "@/types/api";

/**
 * Kalp.io Shared API Client
 * Reads backend API base URL ONLY from process.env.NEXT_PUBLIC_API_BASE_URL.
 * If unset or empty string, defaults to same origin ("").
 * Strips trailing slash to ensure clean path joining without double slashes.
 */
export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/+$/, "");

/**
 * Returns full URL for a given API path with NO trailing slashes,
 * preventing 307 redirects from FastAPI that can drop CORS and cookie headers.
 */
export function getApiUrl(path: string): string {
  const normalizedPath = (path.startsWith("/") ? path : `/${path}`).replace(
    /\/+$/,
    "",
  );
  // If the path was simply "/" or empty, preserve "/"
  const cleanPath = normalizedPath.length === 0 ? "/" : normalizedPath;
  return `${API_BASE_URL}${cleanPath}`;
}

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Normalises errors from FastAPI ({ detail: ... } or { error: ... }) into one readable message plus status.
 * Accepts:
 * - 422 validation error detail arrays: [{ loc: ['body', 'field'], msg: 'field required' }]
 * - string detail: { detail: 'Project not found' }
 * - custom backend error: { error: 'Invalid repository URL' }
 * - raw non-JSON text or HTTP status text
 */
export function normalizeErrorMessage(body: string, status: number): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;

      // 1. FastAPI 422 detail array
      if (Array.isArray(obj.detail)) {
        const messages = (obj.detail as ValidationErrorDetail[])
          .map((item) => {
            if (!item || typeof item !== "object") return "";
            const loc = Array.isArray(item.loc)
              ? item.loc.filter((p) => p !== "body").join(".")
              : "";
            return loc ? `${loc}: ${item.msg}` : item.msg;
          })
          .filter(Boolean);

        if (messages.length > 0) {
          return messages.join("; ");
        }
      }

      // 2. detail string
      if (typeof obj.detail === "string" && obj.detail.trim()) {
        return obj.detail.trim();
      }

      // 3. custom backend error property
      if (typeof obj.error === "string" && obj.error.trim()) {
        return obj.error.trim();
      }

      // 4. message property
      if (typeof obj.message === "string" && obj.message.trim()) {
        return obj.message.trim();
      }
    }
  } catch {
    // Non-JSON body
  }

  const trimmed = body.trim();
  if (trimmed.length > 0 && trimmed.length <= 300) {
    return trimmed;
  }

  if (status === 404) return "Resource not found";
  if (status === 429)
    return "Too many requests. Please slow down and try again";
  if (status >= 500) return "Server error occurred. Please try again later";
  return `Request failed with status ${status}`;
}

/**
 * Error thrown for non-2xx responses.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, rawBody: string) {
    const readableMessage = normalizeErrorMessage(rawBody, status);
    super(readableMessage);
    this.name = "ApiError";
    this.status = status;
    this.detail = readableMessage;
  }
}

/**
 * Shared API fetch wrapper for communicating with the FastAPI backend.
 * Uses credentials: 'include' by default so httpOnly owner cookies stay attached.
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

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "include",
      ...fetchOptions,
      headers,
    });
  } catch (networkErr) {
    throw new ApiError(
      0,
      networkErr instanceof Error
        ? networkErr.message
        : "Network error: unable to connect to the backend.",
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new ApiError(response.status, errorText || response.statusText);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json().catch(() => ({}) as T);
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

/** POST /api/projects/{id}/run -> run the next generation stage */
export async function runProject(projectId: string): Promise<RunStageResponse> {
  return apiFetch<RunStageResponse>(
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
