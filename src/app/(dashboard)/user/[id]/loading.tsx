export default function UserProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back link skeleton */}
      <div className="h-5 bg-gray-200 rounded w-28 animate-pulse"></div>

      {/* Profile Header skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-start gap-6">
          {/* Avatar skeleton */}
          <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
          
          {/* Info skeleton */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-9 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Contribution Graph skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>

      {/* Recent Projects skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
