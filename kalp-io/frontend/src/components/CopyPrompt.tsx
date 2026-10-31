"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface CopyPromptProps {
  prompt: string;
  showBox?: boolean;
  buttonText?: string;
  className?: string;
  onCopySuccess?: () => void;
  onCopyFallback?: () => void;
}

/**
 * Fallback copy implementation when navigator.clipboard is unavailable or rejected
 */
export function copyToClipboardFallback(text: string): boolean {
  if (typeof document === "undefined") return false;
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.setAttribute("readonly", "");
  document.body.appendChild(textArea);
  textArea.select();

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  } finally {
    document.body.removeChild(textArea);
  }
  return success;
}

export function CopyPrompt({
  prompt,
  showBox = true,
  buttonText = "Copy prompt",
  className = "",
  onCopySuccess,
  onCopyFallback,
}: CopyPromptProps) {
  const [copied, setCopied] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);

  const handleCopy = async () => {
    let succeeded = false;

    // 1. Try Modern Clipboard API
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(prompt);
        succeeded = true;
      } catch {
        // Clipboard access was denied or failed, proceed to fallback
      }
    }

    // 2. Fallback to execCommand if modern clipboard failed or is unsupported
    if (!succeeded) {
      succeeded = copyToClipboardFallback(prompt);
      if (succeeded) {
        onCopyFallback?.();
      }
    }

    if (succeeded) {
      setCopied(true);
      setFallbackActive(false);
      onCopySuccess?.();
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      // 3. If even execCommand failed, activate manual copy mode
      setFallbackActive(true);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {showBox && (
        <div className="relative">
          <pre
            tabIndex={0}
            className="w-full max-h-48 overflow-y-auto p-3.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--text)] font-mono text-xs leading-relaxed whitespace-pre-wrap select-all focus:outline-none focus:ring-2 focus:ring-[#8267F5]"
          >
            {prompt}
          </pre>
          {fallbackActive && (
            <div className="mt-2 p-2.5 rounded-lg border-2 border-[var(--ink)] bg-[#FDE199] text-black text-xs font-semibold flex items-center justify-between gap-2">
              <span>
                Clipboard access denied. Please select and copy manually.
              </span>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleCopy}
        aria-live="polite"
        className={`w-full h-12 rounded-xl border-2 border-[var(--ink)] font-bold text-sm flex items-center justify-center gap-2 control-neo cursor-pointer transition-colors ${
          copied
            ? "bg-[#3EC02F] text-black"
            : "bg-[#FFCF1E] text-black hover:bg-[#FFCF1E]/90"
        }`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 stroke-[3]" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 stroke-[2.5]" />
            {buttonText}
          </>
        )}
      </button>
    </div>
  );
}
