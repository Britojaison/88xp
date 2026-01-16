export default function ProfileLoading() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Row with Monthly Target */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="h-[13px] bg-gray-700/50 rounded w-48 mb-1 animate-pulse"></div>
          <div className="h-[36px] sm:h-[40px] bg-gray-600/50 rounded w-32 animate-pulse"></div>
          <div className="h-1 w-[100px] sm:w-[120px] bg-gradient-to-r from-blue-400/30 via-purple-500/30 to-pink-500/30 rounded-full mt-1"></div>
        </div>

        {/* Monthly Target Widget Skeleton */}
        <div className="w-full sm:w-[220px]">
          <div className="h-[16px] bg-gray-600/50 rounded w-32 mb-2 sm:mb-3 mx-auto animate-pulse"></div>
          <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4">
            <div className="w-[70px] h-[70px] sm:w-[90px] sm:h-[90px] rounded-full bg-gray-700/50 animate-pulse"></div>
            <div className="flex flex-col gap-1 sm:gap-2">
              <div>
                <div className="h-[20px] bg-gray-600/50 rounded w-16 mb-1 animate-pulse"></div>
                <div className="h-[10px] bg-gray-700/50 rounded w-20 animate-pulse"></div>
              </div>
              <div>
                <div className="h-[20px] bg-gray-600/50 rounded w-12 mb-1 animate-pulse"></div>
                <div className="h-[10px] bg-gray-700/50 rounded w-24 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left - Profile Card */}
        <div className="w-full lg:w-[280px] flex-shrink-0">
          <div 
            className="rounded-[20px] p-4 sm:p-5 flex flex-col"
            style={{
              backgroundColor: '#1a1a2e'
            }}
          >
            {/* Avatar */}
            <div className="flex justify-center mb-3">
              <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-full bg-gray-600/50 animate-pulse"></div>
            </div>

            {/* Name & Info */}
            <div className="text-center mb-3 sm:mb-4 space-y-2">
              <div className="h-[18px] bg-gray-600/50 rounded w-32 mx-auto animate-pulse"></div>
              <div className="h-[11px] bg-gray-700/50 rounded w-40 mx-auto animate-pulse"></div>
              <div className="h-[10px] bg-gray-700/50 rounded w-36 mx-auto animate-pulse"></div>
            </div>

            {/* Stats */}
            <div className="space-y-0">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 sm:py-2.5">
                  <div className="h-[13px] bg-gray-600/50 rounded w-20 animate-pulse"></div>
                  <div className="h-[13px] bg-gray-600/50 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - Activity Timeline + Badges */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Activity Timeline */}
          <div className="bg-[#2A2A2A] rounded-xl p-3 sm:p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="h-[14px] bg-gray-600/50 rounded w-32 animate-pulse"></div>
              <div className="h-[12px] bg-gray-700/50 rounded w-24 animate-pulse"></div>
            </div>
            <div className="h-[120px] sm:h-[140px] bg-gray-800/50 rounded-lg animate-pulse"></div>
          </div>
          
          {/* Badges Section */}
          <div>
            <div className="h-[14px] bg-gray-600/50 rounded w-20 mb-2 animate-pulse"></div>
            <div className="rounded-[20px] border border-white/10 p-2">
              <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-700/50 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Points History */}
      <div className="bg-[#2A2A2A] rounded-xl p-3 sm:p-5 border border-gray-700">
        <div className="h-[16px] bg-gray-600/50 rounded w-32 mb-3 animate-pulse"></div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[60px] bg-gray-800/50 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
