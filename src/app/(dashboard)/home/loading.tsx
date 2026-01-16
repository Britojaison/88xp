export default function HomeLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section and Scoreboard */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Welcome Section Skeleton */}
        <div className="space-y-1">
          <div className="h-[14px] sm:h-[16px] bg-gray-700/50 rounded w-48 animate-pulse"></div>
          <div className="h-[28px] sm:h-[32px] lg:h-[36px] bg-gray-600/50 rounded w-64 sm:w-80 animate-pulse"></div>
          <div className="h-[2px] w-full bg-gradient-to-r from-blue-400/30 via-purple-500/30 to-pink-500/30 rounded-full mt-1"></div>
        </div>

        {/* Last Month Scoreboard Skeleton */}
        <div className="w-full lg:w-[320px]">
          <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] p-3 sm:p-4" style={{ backgroundColor: '#141415' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="h-[16px] sm:h-[18px] bg-gray-600/50 rounded w-40 mb-1 animate-pulse"></div>
                <div className="h-[12px] sm:h-[14px] bg-gray-700/50 rounded w-24 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-1 mt-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-600/50 animate-pulse"></div>
                    <div className="space-y-1">
                      <div className="h-[14px] sm:h-[16px] bg-gray-600/50 rounded w-24 animate-pulse"></div>
                      <div className="h-[11px] sm:h-[13px] bg-gray-700/50 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-[14px] sm:h-[16px] bg-gray-600/50 rounded w-12 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Toggle and Content Skeleton */}
      <div className="space-y-3">
        {/* Toggle Buttons */}
        <div className="flex items-center gap-2">
          <div className="h-[40px] sm:h-[50px] w-[140px] sm:w-[180px] rounded-[12px] sm:rounded-[15px] bg-gray-700/50 animate-pulse"></div>
          <div className="h-[40px] sm:h-[50px] w-[140px] sm:w-[180px] rounded-[12px] sm:rounded-[15px] bg-gray-700/50 animate-pulse"></div>
        </div>

        {/* Content Area */}
        <div className="rounded-[20px] sm:rounded-[25px] border border-[#424242] p-3 sm:p-5" style={{ backgroundColor: '#141415' }}>
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-gray-800/30 animate-pulse">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-600/50"></div>
                  <div className="space-y-1">
                    <div className="h-[14px] sm:h-[16px] bg-gray-600/50 rounded w-32"></div>
                    <div className="h-[11px] sm:h-[13px] bg-gray-700/50 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-[14px] sm:h-[16px] bg-gray-600/50 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
