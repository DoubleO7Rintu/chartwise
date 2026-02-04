'use client';

import { useState, useEffect } from 'react';
import { OHLCV } from '@/utils/indicators';
import { detectCandlePatterns, CandlePattern, getPatternEmoji } from '@/utils/candlePatterns';

interface PatternDetectorProps {
  data: OHLCV[];
  symbol: string;
  className?: string;
}

export default function PatternDetector({ data, symbol, className = '' }: PatternDetectorProps) {
  const [patterns, setPatterns] = useState<CandlePattern[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (data.length > 3) {
      const detected = detectCandlePatterns(data, 30);
      setPatterns(detected);
    }
  }, [data]);

  const recentPatterns = patterns.slice(-5);
  const bullishCount = patterns.filter(p => p.type === 'bullish').length;
  const bearishCount = patterns.filter(p => p.type === 'bearish').length;

  const getReliabilityBadge = (reliability: string) => {
    switch (reliability) {
      case 'high': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const formatDate = (index: number) => {
    if (index >= 0 && index < data.length) {
      return new Date(data[index].time * 1000).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    return '';
  };

  if (patterns.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          🕯️ Pattern Detection
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No significant patterns detected in recent candles
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🕯️ Pattern Detection
          <span className="text-xs font-normal text-gray-500">
            ({patterns.length} found)
          </span>
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-500">🟢 {bullishCount}</span>
          <span className="text-red-500">🔴 {bearishCount}</span>
        </div>
      </div>

      {/* Signal Summary */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Overall Signal:</span>
          <span className={`font-semibold ${
            bullishCount > bearishCount ? 'text-green-500' : 
            bearishCount > bullishCount ? 'text-red-500' : 
            'text-gray-500'
          }`}>
            {bullishCount > bearishCount ? '📈 Bullish Bias' : 
             bearishCount > bullishCount ? '📉 Bearish Bias' : 
             '➖ Neutral'}
          </span>
        </div>
      </div>

      {/* Pattern List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[250px] overflow-y-auto">
        {(expanded ? patterns : recentPatterns).reverse().map((pattern, idx) => (
          <div key={`${pattern.name}-${pattern.index}-${idx}`} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getPatternEmoji(pattern.type)}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {pattern.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(pattern.index)}
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getReliabilityBadge(pattern.reliability)}`}>
                {pattern.reliability}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 ml-7">
              {pattern.description}
            </p>
          </div>
        ))}
      </div>

      {/* Show more button */}
      {patterns.length > 5 && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-sm text-blue-500 hover:text-blue-600"
          >
            {expanded ? 'Show less' : `Show all ${patterns.length} patterns`}
          </button>
        </div>
      )}
    </div>
  );
}
