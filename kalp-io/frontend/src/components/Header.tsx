export function Header() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight text-foreground">
            Kalp<span className="text-blue-500">.io</span>
          </span>
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium px-2 py-0.5 rounded-full">
            Build Graph
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="text-xs text-zinc-500">v0.1.0</span>
        </nav>
      </div>
    </header>
  );
}
