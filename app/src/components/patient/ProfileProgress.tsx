/**
 * Profile Progress Component
 *
 * Circular progress ring showing vault completion percentage.
 * Includes gamification prompt for next action.
 */

interface ProfileProgressProps {
  percentage: number;
  nextAction?: string | null;
}

export default function ProfileProgress({
  percentage,
  nextAction,
}: ProfileProgressProps) {
  // Calculate stroke color based on percentage
  const getColor = (pct: number) => {
    if (pct < 30) return "#ef4444"; // red-500
    if (pct < 60) return "#f59e0b"; // amber-500
    return "#0d9488"; // teal-600
  };

  const color = getColor(percentage);

  // SVG circle calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {/* Progress Ring */}
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Percentage text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">{percentage}%</span>
          <span className="text-xs text-gray-500">Complete</span>
        </div>
      </div>

      {/* Next action prompt */}
      {nextAction && percentage < 100 && (
        <div className="mt-4 rounded-full bg-amber-50 px-4 py-2 text-center">
          <p className="text-sm text-amber-700">{nextAction}</p>
        </div>
      )}

      {/* Completion celebration */}
      {percentage === 100 && (
        <div className="mt-4 rounded-full bg-green-50 px-4 py-2 text-center">
          <p className="flex items-center gap-2 text-sm text-green-700">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Profile complete!
          </p>
        </div>
      )}
    </div>
  );
}
