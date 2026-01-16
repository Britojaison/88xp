export default function ProjectsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-[14px] bg-gray-700/50 rounded w-48 animate-pulse"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <div className="h-[32px] sm:h-[36px] bg-gray-600/50 rounded w-24 animate-pulse"></div>
            <div className="h-1 w-full bg-gradient-to-r from-blue-400/30 via-purple-500/30 to-pink-500/30 rounded-full mt-2"></div>
          </div>
          <div className="h-[40px] sm:h-[50px] w-[140px] sm:w-[160px] rounded-[20px] sm:rounded-[25px] bg-gray-700/50 animate-pulse"></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left side - Employee Filter */}
        <div className="flex items-center gap-2">
          <div className="h-[14px] bg-gray-700/50 rounded w-16 animate-pulse"></div>
          <div className="h-[40px] sm:h-[50px] w-[100px] sm:w-[122px] rounded-[12px] sm:rounded-[15px] bg-gray-700/50 animate-pulse"></div>
        </div>

        {/* Right side - Status and Year Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="h-[14px] bg-gray-700/50 rounded w-12 animate-pulse"></div>
            <div className="h-[40px] sm:h-[50px] w-[240px] sm:w-[300px] lg:w-[370px] rounded-[12px] sm:rounded-[15px] bg-gray-700/50 animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-[14px] bg-gray-700/50 rounded w-10 animate-pulse"></div>
            <div className="h-[40px] sm:h-[50px] w-[100px] sm:w-[122px] rounded-[12px] sm:rounded-[15px] bg-gray-700/50 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Ongoing Tasks Table */}
      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] overflow-hidden" style={{ backgroundColor: '#141415' }}>
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="h-[20px] bg-gray-600/50 rounded w-32 animate-pulse"></div>
        </div>
        <div className="px-4 sm:px-6 pb-4">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[60px] bg-gray-800/30 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Completed Tasks Table */}
      <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] overflow-hidden" style={{ backgroundColor: '#141415' }}>
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="h-[20px] bg-gray-600/50 rounded w-28 animate-pulse"></div>
        </div>
        <div className="px-4 sm:px-6 pb-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[60px] bg-gray-800/30 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
