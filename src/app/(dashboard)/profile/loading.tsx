export default function ProfileLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
      {/* Main Profile Content */}
      <div className="flex-1 max-w-4xl space-y-4 sm:space-y-6">
        <div className="h-8 sm:h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-56 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl p-3 sm:p-4 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-7 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Contribution Graph skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
          <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>

        {/* Points breakdown skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar skeleton */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
          <div className="h-40 bg-gray-100 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
