interface AnimeProgressBarProps {
  visited: number;
  total: number;
  isLoggedIn?: boolean;
  className?: string;
}

export function AnimeProgressBar({
  visited,
  total,
  isLoggedIn = true,
  className,
}: AnimeProgressBarProps) {
  const percentage = total > 0 ? Math.round((visited / total) * 100) : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80" aria-hidden>
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/10"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="text-primary transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-foreground">
            {percentage}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">巡禮進度</p>
          <p className="text-sm text-muted-foreground">
            已造訪 {visited} / {total} 處
          </p>
          {!isLoggedIn && (
            <p className="mt-1 text-xs text-muted-foreground">登入後可追蹤你的巡禮進度</p>
          )}
        </div>
      </div>
    </div>
  );
}
