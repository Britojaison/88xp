'use client';

interface Props {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  showAllOption?: boolean;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function MonthSelector({
  month,
  year,
  onMonthChange,
  onYearChange,
  showAllOption = false,
}: Props) {
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const goToPreviousMonth = () => {
    if (month === 1) {
      onMonthChange(12);
      onYearChange(year - 1);
    } else {
      onMonthChange(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      onMonthChange(1);
      onYearChange(year + 1);
    } else {
      onMonthChange(month + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    onMonthChange(now.getMonth() + 1);
    onYearChange(now.getFullYear());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return month === now.getMonth() + 1 && year === now.getFullYear();
  };

  return (
    <div className="flex items-center gap-2 bg-[#2A2A2A] rounded-lg border border-gray-700 p-2">
      <button
        onClick={goToPreviousMonth}
        className="p-1 hover:bg-[#333333] rounded transition-colors text-gray-400"
        title="Previous month"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="border-0 bg-transparent font-medium focus:ring-0 cursor-pointer text-white"
        >
          {showAllOption && <option value={0}>All Months</option>}
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="border-0 bg-transparent font-medium focus:ring-0 cursor-pointer text-white"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={goToNextMonth}
        className="p-1 hover:bg-[#333333] rounded transition-colors text-gray-400"
        title="Next month"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!isCurrentMonth() && (
        <button
          onClick={goToCurrentMonth}
          className="ml-2 text-xs text-blue-400 hover:text-blue-300 hover:underline"
        >
          Today
        </button>
      )}
    </div>
  );
}

