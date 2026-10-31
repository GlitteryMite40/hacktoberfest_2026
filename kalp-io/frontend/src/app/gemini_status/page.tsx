"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Key,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  XCircle,
} from "lucide-react";
import { getLlmStatus, API_BASE_URL, ApiError } from "@/lib/api";
import type { LlmStatusResponse } from "@/types/api";

const RECHECK_COOLDOWN_SECONDS = 10;

export default function GeminiStatusPage() {
  const [statusData, setStatusData] = useState<LlmStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnreachable, setIsUnreachable] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Resolved backend URL for display (safe: never contains secrets)
  const configuredBackendUrl =
    API_BASE_URL ||
    (typeof window !== "undefined"
      ? `${window.location.origin} (same origin)`
      : "http://127.0.0.1:8000");

  const checkStatus = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsUnreachable(false);

    try {
      const data = await getLlmStatus();
      setStatusData(data);
      setCooldown(RECHECK_COOLDOWN_SECONDS);
    } catch (err) {
      setIsUnreachable(true);
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to communicate with the backend service.");
      }
      setCooldown(RECHECK_COOLDOWN_SECONDS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      void checkStatus();
    })();
  }, [checkStatus]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6">
      {/* Navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          Back to ideas
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border-2 border-[var(--ink)] bg-[#FFCF1E] text-black shadow-[2px_2px_0_var(--ink)]">
              Diagnostics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
            Gemini & LLM Status
          </h1>
          <p className="text-sm font-medium text-[var(--text-muted)]">
            Live availability and health of the Gemini generative engine.
          </p>
        </div>

        <button
          type="button"
          onClick={checkStatus}
          disabled={isLoading || cooldown > 0}
          className="h-11 px-4 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-extrabold text-xs control-neo flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0_var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
              <span>Checking...</span>
            </>
          ) : cooldown > 0 ? (
            <>
              <Clock className="w-4 h-4 stroke-[2.5]" />
              <span>Wait {cooldown}s</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 stroke-[2.5]" />
              <span>Re-check now</span>
            </>
          )}
        </button>
      </div>

      {/* Backend Unreachable State */}
      {isUnreachable && (
        <div className="card-neo p-6 sm:p-8 space-y-5 bg-[var(--surface)] text-[var(--text)] shadow-[6px_6px_0_var(--ink)]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl border-2 border-[var(--ink)] bg-[#FC5082] flex items-center justify-center text-black shadow-[3px_3px_0_var(--ink)] shrink-0">
              <Server className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-xl font-extrabold text-[var(--text)]">
                Backend Unreachable
              </h2>
              <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">
                Could not connect to the Kalp.io backend API. Make sure the
                backend server is running and reachable at the configured
                address.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Configured Base URL
              </span>
              <span className="font-mono font-bold text-[var(--text)]">
                {configuredBackendUrl}
              </span>
            </div>
            {error && (
              <div className="flex items-start gap-2 pt-1 border-t border-[var(--ink)]/10 text-[#FC5082]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-bold">{error}</span>
              </div>
            )}
          </div>

          <div className="text-xs font-medium text-[var(--text-muted)] space-y-1">
            <p className="font-bold text-[var(--text)]">Troubleshooting tip:</p>
            <p>
              In local development, ensure your FastAPI backend is running on{" "}
              <code className="font-mono font-bold text-[var(--text)]">
                127.0.0.1:8000
              </code>{" "}
              and start the frontend using{" "}
              <code className="font-mono font-bold text-[var(--text)]">
                next dev -H 127.0.0.1
              </code>
              .
            </p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !statusData && !isUnreachable && (
        <div className="w-full min-h-[260px] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] flex items-center justify-center shadow-[4px_4px_0_var(--ink)]">
            <Loader2 className="w-6 h-6 animate-spin text-black stroke-[2.5]" />
          </div>
          <p className="text-sm font-bold text-[var(--text-muted)]">
            Testing Gemini connection...
          </p>
        </div>
      )}

      {/* Connected & Operational Status Card */}
      {!isUnreachable && statusData && (
        <div className="space-y-5">
          {/* Main Status Overview */}
          <div className="card-neo p-6 sm:p-8 bg-[var(--surface)] text-[var(--text)] space-y-6 shadow-[6px_6px_0_var(--ink)]">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl border-2 border-[var(--ink)] flex items-center justify-center text-black shadow-[3px_3px_0_var(--ink)] ${
                    statusData.key_present && statusData.test_call_success
                      ? "bg-[#3EC02F]"
                      : "bg-[#FC5082]"
                  }`}
                >
                  <Bot className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--text)]">
                    {statusData.key_present && statusData.test_call_success
                      ? "Gemini Ready"
                      : "Configuration Required"}
                  </h2>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    Model:{" "}
                    <span className="font-mono font-bold text-[var(--text)]">
                      {statusData.model_name || "gemini-2.5-flash"}
                    </span>
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] ${
                  statusData.key_present && statusData.test_call_success
                    ? "bg-[#B1DA19] text-black"
                    : "bg-[#FC5082] text-black"
                }`}
              >
                {statusData.key_present && statusData.test_call_success
                  ? "Operational"
                  : "Degraded"}
              </span>
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* 1. API Key Presence */}
              <div className="p-4 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] flex items-start gap-3">
                <div className="mt-0.5">
                  {statusData.key_present ? (
                    <CheckCircle2 className="w-5 h-5 text-[#3EC02F] stroke-[2.5]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#FC5082] stroke-[2.5]" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-[var(--text)]">
                    <Key className="w-3.5 h-3.5" />
                    <span>API Key Present</span>
                  </div>
                  <p className="text-[11px] font-medium text-[var(--text-muted)]">
                    {statusData.key_present
                      ? "GEMINI_API_KEY is configured on the backend."
                      : "GEMINI_API_KEY is missing on backend."}
                  </p>
                </div>
              </div>

              {/* 2. Test Generation Call */}
              <div className="p-4 rounded-xl border-2 border-[var(--ink)] bg-[var(--background)] flex items-start gap-3">
                <div className="mt-0.5">
                  {statusData.test_call_success ? (
                    <CheckCircle2 className="w-5 h-5 text-[#3EC02F] stroke-[2.5]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[#FC5082] stroke-[2.5]" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-[var(--text)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Test Call Succeeded</span>
                  </div>
                  <p className="text-[11px] font-medium text-[var(--text-muted)]">
                    {statusData.test_call_success
                      ? "A test prompt executed successfully."
                      : "Test prompt failed or timed out."}
                  </p>
                </div>
              </div>
            </div>

            {/* Configured Endpoint Info */}
            <div className="pt-2 border-t-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-muted)]">
                Backend Target:
              </span>
              <span className="font-mono text-[var(--text)] font-semibold">
                {configuredBackendUrl}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
