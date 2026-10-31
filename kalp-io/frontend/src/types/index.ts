/**
 * Kalp.io Core Types
 */

export interface BuildNode {
  id: string;
  name: string;
  description?: string;
  dependencies: string[];
  status?: "pending" | "in_progress" | "completed" | "failed";
}

export interface BuildGraph {
  nodes: BuildNode[];
  edges?: { source: string; target: string }[];
}

export interface ProjectIdea {
  title: string;
  description: string;
}
