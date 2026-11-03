import { describe, expect, it } from "vitest";
import { generatePrompt, type StepNode } from "@/lib/plan-map";

describe("05.3 NodePanel (Data display & node switching)", () => {
  const mockNodes: StepNode[] = [
    {
      id: "node-1",
      type: "step",
      position: { x: 0, y: 0 },
      data: {
        id: "node-1",
        stepKey: "01.1",
        title: "Init repo",
        status: "done",
        phase: "Phase 01",
        purpose: "Initialize repository structure and base configs.",
        dependencies: [],
        files: ["README.md", ".gitignore"],
        criteria: ["Repository initialized", "Git tracking enabled"],
        tests: ["git status is clean"],
        prompt: "TASK: [01.1] Init repo\nInitialize repo",
      },
    },
    {
      id: "node-2",
      type: "step",
      position: { x: 300, y: 0 },
      data: {
        id: "node-2",
        stepKey: "01.2",
        title: "Scaffold frontend",
        status: "in_progress",
        phase: "Phase 01",
        purpose: "Scaffold Next.js App Router with TypeScript and Tailwind.",
        dependencies: ["node-1"],
        files: ["kalp-io/frontend/package.json", "kalp-io/frontend/src/app"],
        criteria: ["npm run dev boots without errors"],
        tests: ["dev server starts; home page loads"],
        prompt: "TASK: [01.2] Scaffold frontend\nScaffold app",
      },
    },
  ];

  it("extracts and displays correct data for a selected node", () => {
    const selected = mockNodes[1]!;
    expect(selected.data.title).toBe("Scaffold frontend");
    expect(selected.data.stepKey).toBe("01.2");
    expect(selected.data.purpose).toContain("Scaffold Next.js App Router");
    expect(selected.data.dependencies).toEqual(["node-1"]);
    expect(selected.data.files).toContain("kalp-io/frontend/package.json");
    expect(selected.data.criteria).toContain(
      "npm run dev boots without errors",
    );
    expect(selected.data.tests).toContain("dev server starts; home page loads");
    expect(selected.data.status).toBe("in_progress");
  });

  it("switches correctly between nodes by resolving prerequisite IDs", () => {
    let activeNode = mockNodes[1]!;
    expect(activeNode.id).toBe("node-2");

    // Prerequisite clicked in NodePanel
    const depId = activeNode.data.dependencies?.[0];
    expect(depId).toBe("node-1");

    const targetNode = mockNodes.find((n) => n.id === depId);
    expect(targetNode).toBeDefined();

    // Switch active node
    activeNode = targetNode!;
    expect(activeNode.id).toBe("node-1");
    expect(activeNode.data.title).toBe("Init repo");
    expect(activeNode.data.status).toBe("done");
  });

  it("generates a structured LLM prompt when none is provided", () => {
    const prompt = generatePrompt({
      title: "Custom Step",
      stepKey: "02.1",
      phase: "Phase 02",
      purpose: "Implement authentication provider.",
      dependencies: ["01.2"],
      files: ["src/lib/auth.ts"],
      criteria: ["Tokens are validated"],
      tests: ["Test token expiry"],
    });

    expect(prompt).toContain("FEATURE / TASK: [02.1] Custom Step");
    expect(prompt).toContain("PHASE: Phase 02");
    expect(prompt).toContain("PURPOSE:\nImplement authentication provider.");
    expect(prompt).toContain("PREREQUISITES (NEEDS FIRST):\n- 01.2");
    expect(prompt).toContain("FILES / MODULES:\n- src/lib/auth.ts");
    expect(prompt).toContain("ACCEPTANCE CRITERIA:\n- Tokens are validated");
    expect(prompt).toContain("TEST CASES:\n- Test token expiry");
  });
});
