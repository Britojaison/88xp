'use client';

interface Props {
  obtainedPoints: number;
  targetPoints: number;
  month: number;
  year: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TargetProgressCard({ obtainedPoints, targetPoints, month, year }: Props) {
  const percentage = targetPoints > 0 ? Math.min(100, Math.round((obtainedPoints / targetPoints) * 100)) : 0;
  const isAchieved = obtainedPoints >= targetPoints;
  const remaining = Math.max(0, targetPoints - obtainedPoints);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Monthly Target</h3>
        <span className="text-sm text-gray-500">{MONTH_NAMES[month - 1]} {year}</span>
      </div>

      {/* Main Progress Display */}
      <div className="text-center py-4">
        <div className="inline-flex items-baseline gap-1">
          <span className={`text-4xl font-bold ${isAchieved ? 'text-emerald-600' : 'text-indigo-600'}`}>
            {obtainedPoints}
          </span>
          <span className="text-2xl text-gray-400 font-medium">/</span>
          <span className="text-2xl text-gray-600 font-semibold">{targetPoints}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">points</p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAchieved
                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{percentage}% complete</span>
          {!isAchieved && <span>{remaining} pts remaining</span>}
        </div>
      </div>

      {/* Status Badge */}
      <div className="pt-2 border-t border-gray-100">
        {isAchieved ? (
          <div className="flex items-center gap-2 justify-center text-emerald-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Target Achieved!</span>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">
            Keep going! You&apos;re doing great.
          </p>
        )}
      </div>
    </div>
  );
}

