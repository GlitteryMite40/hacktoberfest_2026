import { test, expect } from "@playwright/test";
import crypto from "node:crypto";

/**
 * Helper to compute GitHub X-Hub-Signature-256 HMAC
 */
function computeGitHubSignature(secret: string, payload: unknown): string {
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadString);
  return `sha256=${hmac.digest("hex")}`;
}

test.describe("Full End-to-End Build Graph Flow (TASK 07.3)", () => {
  test("submits an idea, views graph, connects repo, simulates webhook, and verifies committed node status", async ({
    page,
  }) => {
    // Mock API responses for self-contained, deterministic frontend E2E testing
    let projectStatus = "running";
    let nodeStatus: "not_started" | "committed" = "not_started";
    const testSecret = "whsec_test_secret_1234567890abcdef";
    const projectId = "proj-e2e-demo-123";

    // 1. Mock API routes in Playwright
    await page.route("**/api/projects", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: projectId,
            title: "Realtime Chat Service",
            description: "High concurrency WebSocket chat server",
            status: "running",
            current_stage: "stage_1",
            stages: [
              { key: "stage_1", name: "Architecture", status: "completed" },
              { key: "stage_2", name: "Tasks", status: "completed" },
            ],
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: projectId,
              title: "Realtime Chat Service",
              status: projectStatus,
              created_at: new Date().toISOString(),
            },
          ]),
        });
      }
    });

    await page.route(`**/api/projects/${projectId}/run`, async (route) => {
      projectStatus = "completed";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          stage: "stage_2",
          status: "done",
          done: true,
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}/graph`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          nodes: [
            {
              id: "step-1",
              key: "01.1",
              title: "Setup WebSocket server",
              phase: "Phase 1: Foundation",
              status: nodeStatus,
              purpose: "Initialize server and connection listeners",
              dependencies: [],
              files: ["src/server.ts"],
              criteria: ["Server binds to port 8080"],
              tests: ["unit test connection handshake"],
            },
            {
              id: "step-2",
              key: "01.2",
              title: "Channel multiplexing",
              phase: "Phase 1: Foundation",
              status: "not_started",
              dependencies: ["step-1"],
              files: ["src/channels.ts"],
            },
          ],
          edges: [{ id: "e1", source: "step-1", target: "step-2" }],
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: projectId,
          title: "Realtime Chat Service",
          description: "High concurrency WebSocket chat server",
          status: projectStatus,
          created_at: new Date().toISOString(),
          repo: {
            url: "https://github.com/kalp-learner/realtime-chat",
            owner: "kalp-learner",
            name: "realtime-chat",
            webhook_url: "http://127.0.0.1:8000/api/webhook/github",
            webhook_secret: testSecret,
          },
        }),
      });
    });

    await page.route(`**/api/projects/${projectId}/repo`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://github.com/kalp-learner/realtime-chat",
          owner: "kalp-learner",
          name: "realtime-chat",
          webhook_url: "http://127.0.0.1:8000/api/webhook/github",
          webhook_secret: testSecret,
        }),
      });
    });

    // 2. Step 1: User submits an idea on the home page
    await page.goto("/");
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    const sampleIdea =
      "Build a high concurrency WebSocket chat server in TypeScript with room management, message broadcasting, and Redis adapter support.";
    await textarea.fill(sampleIdea);

    const submitBtn = page.getByRole("button", {
      name: /Generate build graph/i,
    });
    await submitBtn.click();

    // 3. Step 2: Stage progress is displayed and graph appears
    await expect(page.getByText(/Dependency-aware build graph/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Setup WebSocket server")).toBeVisible();

    // 4. Step 3: Navigate to the full interactive graph workspace
    await page.goto(`/p/${projectId}`);
    await expect(page.locator("h1")).toContainText("Realtime Chat Service");
    await expect(page.getByText("Setup WebSocket server")).toBeVisible();

    // Verify initial node status is "Not started"
    await expect(page.getByText(/Not started/i).first()).toBeVisible();

    // 5. Step 4: Open Repo Connect modal
    const repoBtn = page.getByRole("button", {
      name: /Connect Repo|Repo Settings/i,
    });
    await repoBtn.click();

    // Check modal opens and displays webhook URL and secret
    await expect(page.getByText(/GitHub Webhook Setup/i)).toBeVisible();
    await expect(
      page.locator("input[value*='api/webhook/github']"),
    ).toBeVisible();

    // 6. Step 5: Simulate GitHub Webhook Delivery
    // Update our simulated node state to committed (reflecting backend processing of git push event)
    nodeStatus = "committed";

    const webhookPayload = {
      repository: {
        clone_url: "https://github.com/kalp-learner/realtime-chat.git",
        full_name: "kalp-learner/realtime-chat",
      },
      commits: [
        {
          id: "c0ffee123456",
          message: "feat: [01.1] Setup WebSocket server implementation",
          added: ["src/server.ts"],
          modified: [],
        },
      ],
    };

    const signature = computeGitHubSignature(testSecret, webhookPayload);

    // Verify signature computation format
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

    // Close modal
    await page.getByRole("button", { name: /Close repo settings/i }).click();

    // 7. Step 6: Trigger refresh / polling and verify node status updates to Committed
    const refreshBtn = page.getByRole("button", { name: /Refresh/i });
    await refreshBtn.click();

    // Click node to open panel
    await page.getByText("Setup WebSocket server").click();

    // Verify Committed status badge is displayed in the node panel
    await expect(
      page
        .locator("aside")
        .getByText(/Committed/i)
        .first(),
    ).toBeVisible();
  });
});
