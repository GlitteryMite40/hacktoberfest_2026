import type { BuildGraph, BuildNode, Project } from "@/types";
import { toStepStatus } from "@/lib/plan-map";

/**
 * Cleanly formats a string for markdown checklist output
 */
function sanitizeMarkdown(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Export plan as a formatted JSON string
 */
export function exportPlanAsJson(
  graph: BuildGraph,
  project?: Project | null,
): string {
  const exportData = {
    project: project
      ? {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          created_at: project.created_at,
          updated_at: project.updated_at,
        }
      : undefined,
    exported_at: new Date().toISOString(),
    nodes_count: graph.nodes.length,
    edges_count: graph.edges?.length ?? 0,
    nodes: graph.nodes.map((node) => ({
      id: String(node.id),
      key: node.key ?? node.step_key,
      title: node.title ?? node.name ?? "Step",
      phase: node.phase ?? node.stage,
      status: node.status,
      purpose: node.purpose ?? node.description,
      dependencies: (node.dependencies ?? []).map(String),
      files: node.files,
      criteria: node.criteria ?? node.acceptance_criteria,
      tests: node.tests ?? node.test_cases,
      prompt: node.prompt,
      position: node.position,
    })),
    edges: (graph.edges ?? []).map((edge) => ({
      id: edge.id,
      source: String(edge.source),
      target: String(edge.target),
      label: edge.label,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export plan as a Markdown checklist document containing every node and its dependencies
 */
export function exportPlanAsMarkdown(
  graph: BuildGraph,
  project?: Project | null,
): string {
  const lines: string[] = [];

  const title = project?.title || "Project Build Plan";
  lines.push(`# ${title}`);
  lines.push("");

  if (project?.description) {
    lines.push(`> ${sanitizeMarkdown(project.description)}`);
    lines.push("");
  }

  // Summary stats
  const totalNodes = graph.nodes.length;
  const completedNodes = graph.nodes.filter(
    (n) => toStepStatus(n.status) === "done",
  ).length;

  lines.push(`- **Status:** ${project?.status || "Active"}`);
  lines.push(
    `- **Progress:** ${completedNodes} / ${totalNodes} steps completed`,
  );
  lines.push(`- **Exported:** ${new Date().toLocaleDateString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group nodes by phase
  const phaseMap = new Map<string, BuildNode[]>();
  for (const node of graph.nodes) {
    const phase =
      (typeof node.phase === "string" && node.phase.trim()) ||
      (typeof node.stage === "string" && node.stage.trim()) ||
      "Build Steps";
    const list = phaseMap.get(phase) ?? [];
    list.push(node);
    phaseMap.set(phase, list);
  }

  // Render nodes by phase
  for (const [phase, phaseNodes] of phaseMap.entries()) {
    lines.push(`## ${phase}`);
    lines.push("");

    for (const node of phaseNodes) {
      const isCompleted = toStepStatus(node.status) === "done";
      const checkbox = isCompleted ? "[x]" : "[ ]";
      const keyPrefix =
        node.key || node.step_key ? `\`${node.key || node.step_key}\` ` : "";
      const nodeTitle = node.title || node.name || "Task";
      const statusLabel = node.status ? ` *(${node.status})*` : "";

      lines.push(`### ${checkbox} ${keyPrefix}${nodeTitle}${statusLabel}`);

      const purpose = node.purpose || node.description;
      if (purpose) {
        lines.push("");
        lines.push(`**Purpose:** ${purpose.trim()}`);
      }

      const deps = (node.dependencies ?? []).map(String);
      if (deps.length > 0) {
        lines.push("");
        lines.push(`**Dependencies:**`);
        for (const dep of deps) {
          lines.push(`  - \`${dep}\``);
        }
      }

      const files = Array.isArray(node.files)
        ? node.files
        : typeof node.files === "string" && node.files.trim()
          ? [node.files]
          : [];
      if (files.length > 0) {
        lines.push("");
        lines.push(`**Files / Modules:**`);
        for (const file of files) {
          lines.push(`  - \`${file}\``);
        }
      }

      const criteria = Array.isArray(node.criteria ?? node.acceptance_criteria)
        ? (node.criteria ?? node.acceptance_criteria)
        : [];
      if (criteria && criteria.length > 0) {
        lines.push("");
        lines.push(`**Acceptance Criteria:**`);
        for (const c of criteria) {
          lines.push(`  - ${c}`);
        }
      }

      const tests = Array.isArray(node.tests ?? node.test_cases)
        ? (node.tests ?? node.test_cases)
        : [];
      if (tests && tests.length > 0) {
        lines.push("");
        lines.push(`**Test Cases:**`);
        for (const t of tests) {
          lines.push(`  - ${t}`);
        }
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Triggers a file download in the browser with given filename and text content
 */
export function downloadFile(
  filename: string,
  content: string,
  contentType: string,
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Helper to export and download plan as JSON
 */
export function downloadPlanAsJson(
  graph: BuildGraph,
  project?: Project | null,
): void {
  const json = exportPlanAsJson(graph, project);
  const slug = (project?.title || "kalp-plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  downloadFile(`${slug || "kalp-plan"}.json`, json, "application/json");
}

/**
 * Helper to export and download plan as Markdown
 */
export function downloadPlanAsMarkdown(
  graph: BuildGraph,
  project?: Project | null,
): void {
  const md = exportPlanAsMarkdown(graph, project);
  const slug = (project?.title || "kalp-plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  downloadFile(`${slug || "kalp-plan"}.md`, md, "text/markdown;charset=utf-8");
}
