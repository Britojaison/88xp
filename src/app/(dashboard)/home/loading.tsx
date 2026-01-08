export default function HomeLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome section skeleton */}
      <div className="rounded-2xl p-4 sm:p-6">
        <div className="h-8 sm:h-10 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
        <div className="h-4 sm:h-5 bg-gray-200 rounded w-48 mt-2 animate-pulse"></div>
      </div>
      
      {/* Toggle skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex gap-2 mb-4">
          <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
