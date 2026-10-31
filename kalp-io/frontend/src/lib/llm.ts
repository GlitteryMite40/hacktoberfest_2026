/**
 * Kalp.io LLM Client Wrapper with Mock Safeguards
 * Provides an LLM_MOCK=1 switch that throws if set in production,
 * ensuring Playwright and local test environments never call the real Gemini API.
 */

export interface LlmPromptRequest {
  prompt: string;
  model?: string;
  temperature?: number;
}

export interface LlmPromptResponse {
  text: string;
  model: string;
  mocked: boolean;
}

/**
 * Checks if mock mode is active and validates security boundaries.
 * Throws immediately if LLM_MOCK=1 is detected in production.
 */
export function isLlmMockActive(): boolean {
  const isMock =
    process.env.LLM_MOCK === "1" || process.env.NEXT_PUBLIC_LLM_MOCK === "1";
  const isProd = process.env.NODE_ENV === "production";

  if (isMock && isProd) {
    throw new Error(
      "SECURITY ERROR: LLM_MOCK=1 cannot be set in production mode! Real LLM credentials or live operations required.",
    );
  }

  return isMock;
}

/**
 * Executes or mocks an LLM prompt request.
 */
export async function generateLlmResponse(
  request: LlmPromptRequest,
): Promise<LlmPromptResponse> {
  if (isLlmMockActive()) {
    // Return predictable mock graph output referencing the prompt
    return {
      text: JSON.stringify({
        prompt: request.prompt.slice(0, 50),
        nodes: [
          {
            id: "mock-1",
            title: "Mock Step: Initialize project",
            phase: "Phase 1: Setup",
            status: "not_started",
            dependencies: [],
          },
        ],
        edges: [],
      }),
      model: request.model || "mock-gemini-2.5-flash",
      mocked: true,
    };
  }

  // In live production/dev without LLM_MOCK, generation is handled by the FastAPI backend
  throw new Error(
    "Direct frontend LLM invocation is disabled. Requests must flow through FastAPI backend.",
  );
}
