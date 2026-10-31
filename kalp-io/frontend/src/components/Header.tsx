import Link from "next/link";

export function Header() {
  return (
    <header className="h-16 w-full px-4 sm:px-8 border-b-2 border-[var(--ink)] bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-[10px] border-2 border-[var(--ink)] bg-[#FFCF1E] flex items-center justify-center font-extrabold text-black text-xl shadow-[2px_2px_0_var(--ink)]">
            K
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-[var(--text)]">
            Kalp<span className="text-[#8267F5]">.io</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border-2 border-[var(--ink)] bg-[#B1DA19] text-black shadow-[2px_2px_0_var(--ink)]">
            Build Graph
          </span>
        </div>
      </div>
    </header>
  );
}
