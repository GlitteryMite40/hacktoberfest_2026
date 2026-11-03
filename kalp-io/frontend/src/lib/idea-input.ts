import {
  IDEA_FILE_EXTENSIONS,
  IDEA_MAX_CHARS,
  IDEA_MIN_CHARS,
} from "@/lib/limits";

const numberFormat = new Intl.NumberFormat("en-US");

/** Formats a count with thousands separators ("10,000"). */
export function formatCount(value: number): string {
  return numberFormat.format(value);
}

/** Counts characters the way the backend does (code points, not UTF-16 units). */
export function countChars(text: string): number {
  return Array.from(text).length;
}

/** Returns a friendly error for the idea text, or null if it can be sent. */
export function validateIdea(
  text: string,
  max: number = IDEA_MAX_CHARS,
  min: number = IDEA_MIN_CHARS,
): string | null {
  const trimmed = text.trim();
  const length = countChars(trimmed);

  if (length === 0) {
    return "Add your idea first. A few sentences about what you want to build is enough.";
  }
  if (length < min) {
    return `Your idea is ${length} characters. Add a little more detail (at least ${min}).`;
  }
  if (length > max) {
    return `Your idea is ${formatCount(length)} characters. Kalp.io can read up to ${formatCount(max)}. Shorten it a little and try again.`;
  }
  return null;
}

export type ReadFileResult =
  { ok: true; text: string } | { ok: false; error: string };

/** Minimal file shape so this works with browser File objects and test doubles. */
export interface IdeaFile {
  name: string;
  size: number;
  text(): Promise<string>;
}

function hasAllowedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return IDEA_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Reads a .txt / .md file in the browser and enforces the idea limit. */
export async function readIdeaFile(
  file: IdeaFile,
  max: number = IDEA_MAX_CHARS,
): Promise<ReadFileResult> {
  if (!hasAllowedExtension(file.name)) {
    return {
      ok: false,
      error: `“${file.name}” isn't a text file. Upload a .txt or .md file instead.`,
    };
  }

  // A UTF-8 character is at most 4 bytes, so anything bigger is certainly over
  // the limit. Reject it without reading the whole file into memory.
  if (file.size > max * 4) {
    return {
      ok: false,
      error: `“${file.name}” is too big. Kalp.io can read up to ${formatCount(max)} characters. Trim it and try again.`,
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return {
      ok: false,
      error: `We couldn't read “${file.name}”. Try saving it again as plain text.`,
    };
  }

  const length = countChars(text.trim());
  if (length === 0) {
    return {
      ok: false,
      error: `“${file.name}” is empty. Add your idea to it, or type it in the box.`,
    };
  }
  if (length > max) {
    return {
      ok: false,
      error: `“${file.name}” has ${formatCount(length)} characters. Kalp.io can read up to ${formatCount(max)}. Trim it and try again.`,
    };
  }

  return { ok: true, text };
}

/** Builds a short project title from the first line of the idea. */
export function titleFromIdea(text: string, maxLength = 60): string {
  const firstLine =
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .find((line) => line.length > 0) ?? "Untitled idea";
  const chars = Array.from(firstLine);
  return chars.length > maxLength
    ? `${chars
        .slice(0, maxLength - 1)
        .join("")
        .trimEnd()}…`
    : firstLine;
}
