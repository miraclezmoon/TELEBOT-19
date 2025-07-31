import { cn } from "@/lib/utils";

interface CoinButtonSpinnerProps {
  className?: string;
}

export function CoinButtonSpinner({ className }: CoinButtonSpinnerProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 animate-spin">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              className="fill-yellow-400 stroke-yellow-600"
              strokeWidth="1"
            />
            <text
              x="12"
              y="12"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-yellow-700 font-bold text-xs"
            >
              $
            </text>
          </svg>
        </div>
      </div>
      <span>Processing...</span>
    </div>
  );
}