/**
 * Input limits for the project idea.
 *
 * These MUST match the backend limits (task 04.6). The backend is the source
 * of truth; override here via NEXT_PUBLIC_IDEA_MAX_CHARS if it changes.
 */
function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Maximum idea length in characters (Unicode code points, like Python len()). */
export const IDEA_MAX_CHARS = readPositiveInt(
  process.env.NEXT_PUBLIC_IDEA_MAX_CHARS,
  10_000,
);

/** Minimum idea length in characters. */
export const IDEA_MIN_CHARS = 10;

/** File extensions accepted by the upload control. */
export const IDEA_FILE_EXTENSIONS = [".txt", ".md", ".markdown"] as const;
