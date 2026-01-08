export default function TargetsLoading() {
  return (
    <div className="max-w-4xl space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 sm:h-10 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-56 mt-2 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded-xl w-36 animate-pulse"></div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex gap-4">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-20 h-5 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Note skeleton */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
        <div className="h-4 bg-amber-200 rounded w-3/4 animate-pulse"></div>
      </div>
    </div>
  );
}
