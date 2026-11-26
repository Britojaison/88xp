export default function ProjectsSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading projects">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><div className="h-4 w-48 animate-pulse rounded bg-gray-700/60" /><div className="h-9 w-36 animate-pulse rounded bg-gray-600/60" /></div>
        <div className="h-11 w-36 animate-pulse rounded-xl bg-gray-700/60" />
      </div>
      <div className="space-y-3 rounded-2xl border border-[#424242] bg-[#141415] p-4">
        <div className="flex flex-wrap gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-10 w-36 animate-pulse rounded-lg bg-gray-700/50" />)}</div>
        <div className="h-10 w-full animate-pulse rounded-lg bg-gray-700/50" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((column) => <div key={column} className="flex max-h-[70vh] min-h-[300px] flex-col rounded-2xl border border-[#424242] bg-[#141415] p-4">
          <div className="mb-4 flex items-center justify-between border-b border-[#424242] pb-3"><div className="h-5 w-36 animate-pulse rounded bg-gray-600/60" /><div className="h-6 w-8 animate-pulse rounded-full bg-gray-700/60" /></div>
          <div className="space-y-3">{[1, 2, 3].map((card) => <div key={card} className="space-y-3 rounded-xl border border-[#424242] bg-[#1b1b1d] p-3"><div className="h-4 w-3/4 animate-pulse rounded bg-gray-600/50" /><div className="h-3 w-1/2 animate-pulse rounded bg-gray-700/50" /><div className="h-8 w-full animate-pulse rounded bg-gray-800/70" /></div>)}</div>
        </div>)}
      </div>
    </div>
  );
}
