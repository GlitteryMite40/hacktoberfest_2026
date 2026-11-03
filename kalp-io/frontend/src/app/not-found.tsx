import React from "react";
import Link from "next/link";
import { ArrowLeft, FolderX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 w-full max-w-lg mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
      <div className="card-neo w-full p-8 sm:p-10 space-y-6 bg-[var(--surface)] text-[var(--text)]">
        {/* Chunky Folder Illustration Tile */}
        <div className="mx-auto w-16 h-16 rounded-2xl border-2 border-[var(--ink)] bg-[#FDE199] flex items-center justify-center text-black shadow-[4px_4px_0_var(--ink)]">
          <FolderX className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Headline & One Sentence (DESIGN.md §6) */}
        <div className="space-y-2">
          <span className="font-mono text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase">
            404 Error
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)]">
            Page not found
          </h1>
          <p className="text-sm font-medium text-[var(--text-muted)]">
            We couldn&apos;t find the page or build plan you were looking for.
          </p>
        </div>

        {/* One Primary Yellow Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full h-13 px-6 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] text-black font-extrabold text-base control-neo inline-flex items-center justify-center gap-2 shadow-[4px_4px_0_var(--ink)]"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
