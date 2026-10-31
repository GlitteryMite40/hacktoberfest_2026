import React from "react";
import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="flex-1 w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-xl border-2 border-[var(--ink)] bg-[#FFCF1E] flex items-center justify-center shadow-[4px_4px_0_var(--ink)]">
        <Loader2 className="w-7 h-7 animate-spin text-black stroke-[2.5]" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
          Loading Kalp.io
        </h2>
        <p className="text-sm font-medium text-[var(--text-muted)]">
          Preparing your workspace...
        </p>
      </div>
    </div>
  );
}
