export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          Turn ideas into{" "}
          <span className="text-blue-600 dark:text-blue-400">
            dependency-aware
          </span>{" "}
          build graphs
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Kalp.io breaks down your project idea into an actionable,
          dependency-managed build graph for streamlined execution.
        </p>
        <div className="pt-4 flex items-center justify-center gap-4">
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 w-full bg-white dark:bg-zinc-900 shadow-sm">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Frontend scaffolded successfully. Ready for build graph visualizer & workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
