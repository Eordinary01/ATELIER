export function Header({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-[#E5E3DC] px-8 flex items-center justify-between bg-[#FAF9F6]">
      <div>
        <h1 className="font-serif-headline text-lg tracking-wide text-[#1B1C1A]">
          {title}
        </h1>
      </div>
      <div className="flex items-center space-x-6 text-xs text-[#767872]">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1B3B2B]" />
          <span className="uppercase tracking-wider font-mono text-[10px]">Active Node</span>
        </div>
        <div className="border-l border-[#E5E3DC] pl-6 text-[#1B1C1A] font-mono text-[11px]">
          admin@atelier.in
        </div>
      </div>
    </header>
  );
}
