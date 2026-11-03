import { describe, expect, it, vi } from "vitest";
import { copyToClipboardFallback } from "@/components/CopyPrompt";

describe("05.4 CopyPrompt (Clipboard copy & denied fallback)", () => {
  it("uses execCommand fallback when navigator.clipboard is unavailable", () => {
    const execCommandSpy = vi.fn().mockReturnValue(true);
    const appendChildSpy = vi.fn();
    const removeChildSpy = vi.fn();

    const mockDoc = {
      createElement: vi.fn().mockReturnValue({
        style: {},
        setAttribute: vi.fn(),
        select: vi.fn(),
      }),
      body: {
        appendChild: appendChildSpy,
        removeChild: removeChildSpy,
      },
      execCommand: execCommandSpy,
    };

    (globalThis as unknown as { document: unknown }).document = mockDoc;

    const samplePrompt = "Full generated build prompt content for testing";
    const success = copyToClipboardFallback(samplePrompt);

    expect(success).toBe(true);
    expect(execCommandSpy).toHaveBeenCalledWith("copy");
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    delete (globalThis as unknown as { document?: unknown }).document;
  });

  it("handles clipboard denied error gracefully", async () => {
    const mockDoc = {
      createElement: vi.fn().mockReturnValue({
        style: {},
        setAttribute: vi.fn(),
        select: vi.fn(),
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      execCommand: vi.fn().mockReturnValue(false),
    };
    (globalThis as unknown as { document: unknown }).document = mockDoc;

    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
    };

    const originalNavigatorDesc = Object.getOwnPropertyDescriptor(
      globalThis,
      "navigator",
    );
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: mockClipboard },
      configurable: true,
      writable: true,
    });

    let copySucceeded = false;
    try {
      await navigator.clipboard.writeText("Test prompt");
      copySucceeded = true;
    } catch {
      copySucceeded = copyToClipboardFallback("Test prompt");
    }

    expect(copySucceeded).toBe(false);

    delete (globalThis as unknown as { document?: unknown }).document;
    if (originalNavigatorDesc) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
    }
  });
});
