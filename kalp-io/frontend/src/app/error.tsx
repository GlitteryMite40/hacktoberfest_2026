"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RotateCcw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error cleanly for diagnostics
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex-1 w-full max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <div className="card-neo w-full p-6 sm:p-8 space-y-6 bg-[var(--surface)] text-[var(--text)]">
        {/* Pink Alert Icon Tile */}
        <div className="mx-auto w-14 h-14 rounded-xl border-2 border-[var(--ink)] bg-[#FC5082] flex items-center justify-center text-black shadow-[4px_4px_0_var(--ink)]">
          <AlertCircle className="w-7 h-7 stroke-[2.5]" />
        </div>

        {/* Friendly Error Copy (DESIGN.md §2) */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)]">
            Something stopped working
          </h1>
          <p className="text-sm font-medium text-[var(--text-muted)] max-w-md mx-auto">
            {error.message ||
              "Kalp.io hit an unexpected problem. Your work so far is safe. Tap try again or return home."}
          </p>
        </div>

        {/* Actions: Primary Yellow Retry, Secondary Return */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto h-12 px-6 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-extrabold text-sm control-neo flex items-center justify-center gap-2 cursor-pointer shadow-[4px_4px_0_var(--ink)]"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            Try again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto h-12 px-6 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--text)] font-bold text-sm control-neo flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
