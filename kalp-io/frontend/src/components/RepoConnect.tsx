"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  API_BASE_URL,
  connectProjectRepo,
  disconnectProjectRepo,
  ApiError,
} from "@/lib/api";
import type { ConnectedRepoInfo } from "@/types/api";

export interface RepoConnectProps {
  projectId: string;
  repo: ConnectedRepoInfo | null;
  onRepoUpdated: (repo: ConnectedRepoInfo | null) => void;
  className?: string;
}

export function isLocalBackend(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `http://${url}`);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function RepoConnect({
  projectId,
  repo,
  onRepoUpdated,
  className = "",
}: RepoConnectProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Determine backend public webhook URL
  const backendBase =
    API_BASE_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://127.0.0.1:8000");
  const webhookUrl =
    repo?.webhook_url ||
    `${backendBase.replace(/\/+$/, "")}/api/webhook/github`;
  const isLocal = isLocalBackend(backendBase);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await connectProjectRepo(projectId, {
        url: repoUrl.trim(),
      });

      const newRepo: ConnectedRepoInfo = {
        url: response.url,
        owner: response.owner,
        name: response.name,
        webhook_url: response.webhook_url,
        webhook_secret: response.webhook_secret,
      };

      onRepoUpdated(newRepo);
      setRepoUrl("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not connect repository. Please check the URL.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await disconnectProjectRepo(projectId);
      onRepoUpdated(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to disconnect repository.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`card-neo p-5 bg-[var(--surface)] text-[var(--text)] space-y-5 shadow-[4px_4px_0_var(--ink)] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border-2 border-[var(--ink)] bg-[#B1DA19] flex items-center justify-center text-black shadow-[2px_2px_0_var(--ink)]">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[var(--text)] leading-tight">
              GitHub Repo Connection
            </h3>
            <p className="text-[11px] font-medium text-[var(--text-muted)]">
              Auto-sync commits and detect drift in your build plan
            </p>
          </div>
        </div>

        {repo && (
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--ink)] bg-[#3EC02F]/20 text-[#3EC02F]">
            Connected
          </span>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-lg border-2 border-[var(--ink)] bg-[#FC5082]/15 text-xs font-bold text-[#FC5082] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Not Connected Form */}
      {!repo && (
        <form onSubmit={handleConnect} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="repo-url-input"
              className="text-xs font-bold text-[var(--text)] uppercase tracking-wider block"
            >
              Public GitHub Repository URL
            </label>
            <input
              id="repo-url-input"
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8267F5] disabled:opacity-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !repoUrl.trim()}
            className="w-full h-11 px-4 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-extrabold text-xs control-neo flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0_var(--ink)] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                Connecting...
              </>
            ) : (
              <>
                <GitBranch className="w-4 h-4 stroke-[2.5]" />
                Connect Repository
              </>
            )}
          </button>
        </form>
      )}

      {/* Connected State & Webhook Settings */}
      {repo && (
        <div className="space-y-4">
          {/* Active Repo Details */}
          <div className="p-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block">
                Active Repository
              </span>
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-xs text-[var(--text)] hover:text-[#8267F5] truncate flex items-center gap-1 group"
              >
                <span>
                  {repo.owner}/{repo.name}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100" />
              </a>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isSubmitting}
              className="h-8 px-2.5 rounded-lg border border-[var(--ink)] bg-[var(--surface)] hover:bg-[#FC5082]/15 hover:text-[#FC5082] text-xs font-bold control-neo flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              title="Disconnect repository"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disconnect</span>
            </button>
          </div>

          {/* Localhost Warning if applicable */}
          {isLocal && (
            <div className="p-3 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E]/20 text-[var(--text)] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Local Backend Detected</span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-[var(--text-muted)]">
                The API URL (<span className="font-mono">{backendBase}</span>)
                is a local address. GitHub webhooks cannot reach 127.0.0.1
                directly. To receive push events, expose your backend with a
                tunnel (such as ngrok or Cloudflare Tunnel) or deploy it
                publicly.
              </p>
            </div>
          )}

          {/* Webhook Configuration Instructions */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
                GitHub Webhook Setup
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                Add under Repo Settings → Webhooks
              </span>
            </div>

            {/* 1. Payload URL */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[var(--text-muted)]">
                Payload URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 h-9 px-2.5 rounded-lg border-2 border-[var(--ink)] bg-[var(--background)] font-mono text-xs text-[var(--text)] select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(webhookUrl, "url")}
                  className="h-9 px-3 rounded-lg border-2 border-[var(--ink)] bg-[var(--surface)] text-xs font-bold control-neo flex items-center gap-1 cursor-pointer shrink-0 shadow-[2px_2px_0_var(--ink)]"
                  title="Copy webhook URL"
                >
                  {copiedField === "url" ? (
                    <Check className="w-3.5 h-3.5 text-[#3EC02F]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === "url" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* 2. Webhook Secret */}
            {repo.webhook_secret && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--text-muted)]">
                  Secret (shown once)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={repo.webhook_secret}
                    className="flex-1 h-9 px-2.5 rounded-lg border-2 border-[var(--ink)] bg-[var(--background)] font-mono text-xs text-[var(--text)] select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(repo.webhook_secret!, "secret")}
                    className="h-9 px-3 rounded-lg border-2 border-[var(--ink)] bg-[var(--surface)] text-xs font-bold control-neo flex items-center gap-1 cursor-pointer shrink-0 shadow-[2px_2px_0_var(--ink)]"
                    title="Copy secret"
                  >
                    {copiedField === "secret" ? (
                      <Check className="w-3.5 h-3.5 text-[#3EC02F]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === "secret" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. GitHub Instructions */}
            <div className="p-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] text-xs font-medium space-y-1 text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5 font-bold text-[var(--text)]">
                <Info className="w-3.5 h-3.5 text-[#8267F5]" />
                <span>Recommended GitHub Settings:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                <li>
                  Content type:{" "}
                  <span className="font-mono font-bold text-[var(--text)]">
                    application/json
                  </span>
                </li>
                <li>
                  Which events:{" "}
                  <span className="font-bold text-[var(--text)]">
                    Just the push event
                  </span>
                </li>
                <li>
                  SSL verification:{" "}
                  <span className="font-bold text-[var(--text)]">
                    Enable SSL verification
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
