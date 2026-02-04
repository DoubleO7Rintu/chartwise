'use client';

import { useMemo } from 'react';
import { OHLCV } from '@/utils/indicators';

interface VolumeProfileProps {
  data: OHLCV[];
  currentPrice: number;
  bins?: number;
  className?: string;
}

interface PriceLevel {
  price: number;
  volume: number;
  percentage: number;
  isBuy: boolean;
}

export default function VolumeProfile({ 
  data, 
  currentPrice, 
  bins = 20,
  className = '' 
}: VolumeProfileProps) {
  const profile = useMemo(() => {
    if (data.length === 0) return [];

    // Find price range
    const prices = data.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    const binSize = range / bins;

    // Initialize bins
    const volumeBins: { price: number; buyVolume: number; sellVolume: number }[] = [];
    for (let i = 0; i < bins; i++) {
      volumeBins.push({
        price: minPrice + (i + 0.5) * binSize,
        buyVolume: 0,
        sellVolume: 0
      });
    }

    // Distribute volume across bins
    data.forEach(candle => {
      const volume = candle.volume || 1;
      const candleRange = candle.high - candle.low;
      const isBullish = candle.close >= candle.open;
      
      // Distribute volume across the candle's price range
      for (let i = 0; i < bins; i++) {
        const binLow = minPrice + i * binSize;
        const binHigh = binLow + binSize;
        
        // Check overlap
        const overlapLow = Math.max(candle.low, binLow);
        const overlapHigh = Math.min(candle.high, binHigh);
        
        if (overlapLow < overlapHigh) {
          const overlapRatio = (overlapHigh - overlapLow) / Math.max(candleRange, 0.001);
          const distributedVolume = volume * overlapRatio;
          
          if (isBullish) {
            volumeBins[i].buyVolume += distributedVolume;
          } else {
            volumeBins[i].sellVolume += distributedVolume;
          }
        }
      }
    });

    // Calculate max volume for scaling
    const maxVolume = Math.max(...volumeBins.map(b => b.buyVolume + b.sellVolume));

    // Convert to output format
    return volumeBins.map(bin => ({
      price: bin.price,
      volume: bin.buyVolume + bin.sellVolume,
      percentage: ((bin.buyVolume + bin.sellVolume) / maxVolume) * 100,
      isBuy: bin.buyVolume > bin.sellVolume
    }));
  }, [data, bins]);

  // Find Point of Control (POC) - highest volume level
  const poc = useMemo(() => {
    if (profile.length === 0) return null;
    return profile.reduce((max, level) => level.volume > max.volume ? level : max, profile[0]);
  }, [profile]);

  // Find Value Area (70% of volume)
  const valueArea = useMemo(() => {
    if (profile.length === 0 || !poc) return { high: 0, low: 0 };
    
    const totalVolume = profile.reduce((sum, p) => sum + p.volume, 0);
    const targetVolume = totalVolume * 0.7;
    
    const sortedByVolume = [...profile].sort((a, b) => b.volume - a.volume);
    let accumulatedVolume = 0;
    const valueLevels: number[] = [];
    
    for (const level of sortedByVolume) {
      if (accumulatedVolume >= targetVolume) break;
      valueLevels.push(level.price);
      accumulatedVolume += level.volume;
    }
    
    return {
      high: Math.max(...valueLevels),
      low: Math.min(...valueLevels)
    };
  }, [profile, poc]);

  if (data.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return price >= 1 ? price.toFixed(2) : price.toFixed(4);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📊 Volume Profile
        </h3>
        {poc && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            POC: ${formatPrice(poc.price)} | VA: ${formatPrice(valueArea.low)} - ${formatPrice(valueArea.high)}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="space-y-1">
          {profile.slice().reverse().map((level, idx) => {
            const isPOC = poc && Math.abs(level.price - poc.price) < 0.001;
            const inValueArea = level.price >= valueArea.low && level.price <= valueArea.high;
            const isCurrentPrice = Math.abs(level.price - currentPrice) / currentPrice < 0.02;

            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className={`w-16 text-right font-mono ${
                  isPOC ? 'text-yellow-500 font-bold' :
                  isCurrentPrice ? 'text-blue-500 font-bold' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {formatPrice(level.price)}
                </div>
                <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden relative">
                  <div
                    className={`h-full transition-all ${
                      isPOC ? 'bg-yellow-500' :
                      inValueArea ? (level.isBuy ? 'bg-green-400' : 'bg-red-400') :
                      (level.isBuy ? 'bg-green-500/50' : 'bg-red-500/50')
                    }`}
                    style={{ width: `${level.percentage}%` }}
                  />
                  {isPOC && (
                    <span className="absolute right-1 top-0 text-[10px] text-yellow-700 dark:text-yellow-300 font-bold">
                      POC
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-500 rounded"></span>
            POC
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-400 rounded"></span>
            Buy Volume
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-400 rounded"></span>
            Sell Volume
          </span>
        </div>
      </div>
    </div>
  );
}
