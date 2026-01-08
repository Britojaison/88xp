export default function ProjectsLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <div className="h-8 sm:h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mt-2 animate-pulse"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded-xl w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-28 animate-pulse"></div>
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="bg-white rounded-xl shadow p-3 sm:p-4 flex flex-wrap gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg w-32 animate-pulse"></div>
        ))}
      </div>

      {/* Ongoing Tasks skeleton */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-blue-50 flex items-center justify-between">
          <div className="h-6 bg-blue-200 rounded w-32 animate-pulse"></div>
          <div className="h-6 bg-blue-200 rounded-full w-8 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>

      {/* Completed Tasks skeleton */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-emerald-50 flex items-center justify-between">
          <div className="h-6 bg-emerald-200 rounded w-40 animate-pulse"></div>
          <div className="h-6 bg-emerald-200 rounded-full w-8 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
