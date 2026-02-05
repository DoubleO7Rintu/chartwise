'use client';

import { useMemo } from 'react';
import { OHLCV, RSI, MACD } from '@/utils/indicators';

interface Divergence {
  type: 'bullish' | 'bearish';
  indicator: 'RSI' | 'MACD';
  startIndex: number;
  endIndex: number;
  priceStart: number;
  priceEnd: number;
  indicatorStart: number;
  indicatorEnd: number;
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
}

interface DivergenceDetectorProps {
  data: OHLCV[];
  symbol: string;
  className?: string;
}

// Find local minima and maxima in a data series
function findPeaks(data: number[], lookback: number = 5): { index: number; value: number; type: 'high' | 'low' }[] {
  const peaks: { index: number; value: number; type: 'high' | 'low' }[] = [];
  
  for (let i = lookback; i < data.length - lookback; i++) {
    if (isNaN(data[i])) continue;
    
    let isHigh = true;
    let isLow = true;
    
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i || isNaN(data[j])) continue;
      if (data[j] >= data[i]) isHigh = false;
      if (data[j] <= data[i]) isLow = false;
    }
    
    if (isHigh) peaks.push({ index: i, value: data[i], type: 'high' });
    if (isLow) peaks.push({ index: i, value: data[i], type: 'low' });
  }
  
  return peaks;
}

function detectDivergences(
  prices: number[],
  indicatorValues: number[],
  indicatorName: 'RSI' | 'MACD',
  lookback: number = 5,
  maxDistance: number = 30
): Divergence[] {
  const divergences: Divergence[] = [];
  
  const pricePeaks = findPeaks(prices, lookback);
  const indicatorPeaks = findPeaks(indicatorValues, lookback);
  
  const priceHighs = pricePeaks.filter(p => p.type === 'high');
  const priceLows = pricePeaks.filter(p => p.type === 'low');
  const indHighs = indicatorPeaks.filter(p => p.type === 'high');
  const indLows = indicatorPeaks.filter(p => p.type === 'low');
  
  // Bearish divergence: price makes higher high, indicator makes lower high
  for (let i = 0; i < priceHighs.length - 1; i++) {
    const ph1 = priceHighs[i];
    const ph2 = priceHighs[i + 1];
    
    if (ph2.index - ph1.index > maxDistance) continue;
    if (ph2.value <= ph1.value) continue; // Need higher high in price
    
    // Find corresponding indicator highs near these price highs
    const ih1 = indHighs.find(ih => Math.abs(ih.index - ph1.index) <= lookback + 2);
    const ih2 = indHighs.find(ih => Math.abs(ih.index - ph2.index) <= lookback + 2);
    
    if (!ih1 || !ih2) continue;
    if (ih2.value >= ih1.value) continue; // Need lower high in indicator
    
    const priceDiff = (ph2.value - ph1.value) / ph1.value;
    const indDiff = (ih1.value - ih2.value) / Math.abs(ih1.value || 1);
    const combinedStrength = priceDiff + indDiff;
    
    const strength: Divergence['strength'] = 
      combinedStrength > 0.15 ? 'strong' :
      combinedStrength > 0.08 ? 'moderate' : 'weak';
    
    divergences.push({
      type: 'bearish',
      indicator: indicatorName,
      startIndex: ph1.index,
      endIndex: ph2.index,
      priceStart: ph1.value,
      priceEnd: ph2.value,
      indicatorStart: ih1.value,
      indicatorEnd: ih2.value,
      strength,
      description: `Price made a higher high ($${ph2.value.toFixed(2)} vs $${ph1.value.toFixed(2)}) while ${indicatorName} made a lower high (${ih2.value.toFixed(2)} vs ${ih1.value.toFixed(2)}). This suggests weakening momentum.`,
    });
  }
  
  // Bullish divergence: price makes lower low, indicator makes higher low
  for (let i = 0; i < priceLows.length - 1; i++) {
    const pl1 = priceLows[i];
    const pl2 = priceLows[i + 1];
    
    if (pl2.index - pl1.index > maxDistance) continue;
    if (pl2.value >= pl1.value) continue; // Need lower low in price
    
    // Find corresponding indicator lows near these price lows
    const il1 = indLows.find(il => Math.abs(il.index - pl1.index) <= lookback + 2);
    const il2 = indLows.find(il => Math.abs(il.index - pl2.index) <= lookback + 2);
    
    if (!il1 || !il2) continue;
    if (il2.value <= il1.value) continue; // Need higher low in indicator
    
    const priceDiff = (pl1.value - pl2.value) / pl1.value;
    const indDiff = (il2.value - il1.value) / Math.abs(il1.value || 1);
    const combinedStrength = priceDiff + indDiff;
    
    const strength: Divergence['strength'] = 
      combinedStrength > 0.15 ? 'strong' :
      combinedStrength > 0.08 ? 'moderate' : 'weak';
    
    divergences.push({
      type: 'bullish',
      indicator: indicatorName,
      startIndex: pl1.index,
      endIndex: pl2.index,
      priceStart: pl1.value,
      priceEnd: pl2.value,
      indicatorStart: il1.value,
      indicatorEnd: il2.value,
      strength,
      description: `Price made a lower low ($${pl2.value.toFixed(2)} vs $${pl1.value.toFixed(2)}) while ${indicatorName} made a higher low (${il2.value.toFixed(2)} vs ${il1.value.toFixed(2)}). This suggests building momentum.`,
    });
  }
  
  return divergences;
}

const STRENGTH_COLORS = {
  strong: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  moderate: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  weak: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400' },
};

export default function DivergenceDetector({ data, symbol, className = '' }: DivergenceDetectorProps) {
  const divergences = useMemo(() => {
    if (data.length < 30) return [];
    
    const closes = data.map(d => d.close);
    const rsiValues = RSI(closes, 14);
    const macdResult = MACD(closes);
    
    const rsiDivergences = detectDivergences(closes, rsiValues, 'RSI', 5, 25);
    const macdDivergences = detectDivergences(closes, macdResult.histogram, 'MACD', 5, 25);
    
    // Combine and sort by recency (most recent first)
    return [...rsiDivergences, ...macdDivergences]
      .sort((a, b) => b.endIndex - a.endIndex)
      .slice(0, 10); // Keep the 10 most recent
  }, [data]);
  
  // Count recent divergences (last 20 candles)
  const recentDivergences = useMemo(() => {
    const threshold = data.length - 20;
    return divergences.filter(d => d.endIndex >= threshold);
  }, [divergences, data.length]);
  
  const bullishCount = recentDivergences.filter(d => d.type === 'bullish').length;
  const bearishCount = recentDivergences.filter(d => d.type === 'bearish').length;
  
  if (data.length < 30) return null;
  
  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔀</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Divergence Detection</h3>
          <span className="text-xs text-[var(--text-secondary)]">{symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          {recentDivergences.length > 0 ? (
            <>
              {bullishCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
                  {bullishCount} Bullish
                </span>
              )}
              {bearishCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                  {bearishCount} Bearish
                </span>
              )}
            </>
          ) : (
            <span className="px-2 py-0.5 text-xs rounded bg-gray-500/20 text-gray-400">
              No Recent Signals
            </span>
          )}
        </div>
      </div>
      
      {/* Alert Banner for Strong Recent Divergences */}
      {recentDivergences.some(d => d.strength === 'strong') && (
        <div className={`mx-3 mb-2 p-2 rounded-lg border ${
          recentDivergences.find(d => d.strength === 'strong')?.type === 'bullish'
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2 text-xs">
            <span>⚠️</span>
            <span className={`font-medium ${
              recentDivergences.find(d => d.strength === 'strong')?.type === 'bullish'
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              Strong {recentDivergences.find(d => d.strength === 'strong')?.type} divergence detected!
            </span>
          </div>
        </div>
      )}
      
      {/* Divergence List */}
      {divergences.length > 0 ? (
        <div className="px-3 pb-3 space-y-2">
          {divergences.map((div, i) => {
            const isRecent = div.endIndex >= data.length - 20;
            const strengthStyle = STRENGTH_COLORS[div.strength];
            const candlesAgo = data.length - 1 - div.endIndex;
            
            return (
              <div
                key={i}
                className={`p-2 rounded-lg border transition-all ${
                  isRecent ? strengthStyle.bg + ' ' + strengthStyle.border : 'bg-[var(--bg-hover)] border-transparent'
                } ${!isRecent ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      div.type === 'bullish' ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                    }`}>
                      {div.type === 'bullish' ? '📈 BULLISH' : '📉 BEARISH'}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">{div.indicator}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${strengthStyle.bg} ${strengthStyle.text}`}>
                      {div.strength}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {candlesAgo === 0 ? 'Current candle' : `${candlesAgo} candles ago`}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {div.description}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-3 pb-3 text-center text-xs text-[var(--text-secondary)] py-4">
          No divergences detected in current data range.
          <br />
          <span className="text-gray-500">Try a longer timeframe for more signals.</span>
        </div>
      )}
      
      {/* Legend */}
      <div className="px-3 pb-3 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--text-secondary)] mt-2 bg-[var(--bg-hover)] rounded-lg p-2">
          <strong>Divergence</strong> occurs when price and an indicator (RSI/MACD) move in opposite directions.
          <strong> Bullish:</strong> price makes lower lows while indicator makes higher lows → potential reversal up.
          <strong> Bearish:</strong> price makes higher highs while indicator makes lower highs → potential reversal down.
        </div>
      </div>
    </div>
  );
}
