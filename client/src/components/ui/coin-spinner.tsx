import { cn } from "@/lib/utils";

interface CoinSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function CoinSpinner({ className, size = "md" }: CoinSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Coin spinning animation */}
      <div className="absolute inset-0 animate-spin-slow">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Coin outer circle */}
          <circle
            cx="24"
            cy="24"
            r="22"
            className="fill-yellow-400 dark:fill-yellow-500 stroke-yellow-600 dark:stroke-yellow-600"
            strokeWidth="2"
          />
          {/* Coin inner circle */}
          <circle
            cx="24"
            cy="24"
            r="18"
            className="fill-yellow-300 dark:fill-yellow-400"
          />
          {/* Dollar sign */}
          <text
            x="24"
            y="24"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-yellow-700 dark:fill-yellow-800 font-bold text-xl"
          >
            $
          </text>
        </svg>
      </div>
      
      {/* Sparkle effects */}
      <div className="absolute -top-1 -right-1 animate-pulse">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path
            d="M4 0L5 3L8 4L5 5L4 8L3 5L0 4L3 3L4 0Z"
            className="fill-yellow-300 dark:fill-yellow-400"
          />
        </svg>
      </div>
      <div className="absolute -bottom-1 -left-1 animate-pulse animation-delay-200">
        <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
          <path
            d="M4 0L5 3L8 4L5 5L4 8L3 5L0 4L3 3L4 0Z"
            className="fill-yellow-300 dark:fill-yellow-400"
          />
        </svg>
      </div>
    </div>
  );
}

export function CoinLoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <CoinSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
}

export function CoinLoadingCard({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <CoinSpinner size="md" className="mb-4" />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}