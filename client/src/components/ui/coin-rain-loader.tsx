import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface CoinRainLoaderProps {
  className?: string;
  message?: string;
}

interface FallingCoin {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function CoinRainLoader({ className, message = "Loading..." }: CoinRainLoaderProps) {
  const [coins, setCoins] = useState<FallingCoin[]>([]);

  useEffect(() => {
    // Generate random falling coins
    const newCoins = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 1,
      size: 16 + Math.random() * 16,
    }));
    setCoins(newCoins);
  }, []);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="relative h-48 w-full">
        {/* Falling coins */}
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="absolute animate-coin-fall opacity-80"
            style={{
              left: `${coin.left}%`,
              animationDelay: `${coin.delay}s`,
              animationDuration: `${coin.duration}s`,
            }}
          >
            <svg
              width={coin.size}
              height={coin.size}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-spin-slow"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                className="fill-yellow-400 dark:fill-yellow-500 stroke-yellow-600 dark:stroke-yellow-600"
                strokeWidth="1"
              />
              <text
                x="12"
                y="12"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-yellow-700 dark:fill-yellow-800 font-bold text-xs"
              >
                $
              </text>
            </svg>
          </div>
        ))}
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-bounce mx-auto"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  className="fill-yellow-400 dark:fill-yellow-500 stroke-yellow-600 dark:stroke-yellow-600"
                  strokeWidth="1.5"
                />
                <text
                  x="12"
                  y="12"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-yellow-700 dark:fill-yellow-800 font-bold"
                >
                  $
                </text>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}