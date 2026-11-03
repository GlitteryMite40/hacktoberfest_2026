import { describe, it, expect, vi } from "vitest";
import React from "react";

// Mock next/font/google for vitest environment
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

import RootLoading from "@/app/loading";
import RootError from "@/app/error";
import NotFound from "@/app/not-found";
import { metadata, viewport } from "@/app/layout";

describe("App shell components and layout configuration", () => {
  it("exports valid metadata and viewport configurations", () => {
    expect(metadata.title).toEqual({
      default: "Kalp.io · Dependency-aware build graph",
      template: "%s · Kalp.io",
    });
    expect(metadata.description).toBeDefined();
    expect(viewport.width).toBe("device-width");
  });

  it("renders RootLoading without crashing", () => {
    const element = React.createElement(RootLoading);
    expect(element).toBeDefined();
    expect(element.type).toBe(RootLoading);
  });

  it("renders RootError with retry trigger and error message", () => {
    const mockReset = vi.fn();
    const testError = Object.assign(new Error("Database connection lost"), {
      digest: "err-123",
    });

    const element = React.createElement(RootError, {
      error: testError,
      reset: mockReset,
    });
    expect(element).toBeDefined();
    expect(element.props.error.message).toBe("Database connection lost");
    expect(element.props.reset).toBe(mockReset);
  });

  it("renders NotFound without crashing", () => {
    const element = React.createElement(NotFound);
    expect(element).toBeDefined();
    expect(element.type).toBe(NotFound);
  });
});
