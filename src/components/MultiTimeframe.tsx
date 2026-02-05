'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchCryptoOHLCV, fetchStockOHLCV, getSupportedAssets } from '@/lib/api';
import { OHLCV, RSI, SMA, MACD } from '@/utils/indicators';

interface TimeframeData {
  days: number;
  label: string;
  data: OHLCV[];
  loading: boolean;
  error: string | null;
}

interface TimeframeAnalysis {
  label: string;
  days: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  rsi: number;
  smaSignal: 'above' | 'below';
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  priceChange: number;
  volatility: number;
  data: OHLCV[];
}

interface MultiTimeframeProps {
  symbol: string;
  className?: string;
}

const TIMEFRAMES = [
  { days: 7, label: '1W' },
  { days: 30, label: '1M' },
  { days: 90, label: '3M' },
];

const assets = getSupportedAssets();

function calculateVolatility(data: OHLCV[]): number {
  if (data.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * 100; // As percentage
}

export default function MultiTimeframe({ symbol, className = '' }: MultiTimeframeProps) {
  const [timeframeData, setTimeframeData] = useState<Record<number, TimeframeData>>({});
  const [isOpen, setIsOpen] = useState(false);
  const fetchedRef = useRef<string>('');

  useEffect(() => {
    if (!isOpen) return;
    // Don't re-fetch if already fetched for this symbol
    if (fetchedRef.current === symbol && Object.keys(timeframeData).length > 0) return;

    let cancelled = false;
    fetchedRef.current = symbol;

    async function fetchAll() {
      const asset = assets.find(a => a.symbol === symbol);
      const isStock = asset?.type === 'stock';

      // Initialize loading state
      const initialState: Record<number, TimeframeData> = {};
      TIMEFRAMES.forEach(tf => {
        initialState[tf.days] = { days: tf.days, label: tf.label, data: [], loading: true, error: null };
      });
      setTimeframeData(initialState);

      // Fetch all timeframes in parallel
      const results = await Promise.allSettled(
        TIMEFRAMES.map(async (tf) => {
          const data = isStock
            ? await fetchStockOHLCV(symbol, tf.days)
            : await fetchCryptoOHLCV(symbol, '1d', tf.days);
          return { days: tf.days, data };
        })
      );

      if (cancelled) return;

      const newState: Record<number, TimeframeData> = {};
      results.forEach((result, i) => {
        const tf = TIMEFRAMES[i];
        if (result.status === 'fulfilled') {
          newState[tf.days] = {
            days: tf.days,
            label: tf.label,
            data: result.value.data,
            loading: false,
            error: result.value.data.length === 0 ? 'No data' : null,
          };
        } else {
          newState[tf.days] = {
            days: tf.days,
            label: tf.label,
            data: [],
            loading: false,
            error: 'Failed to load',
          };
        }
      });
      setTimeframeData(newState);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [isOpen, symbol]);

  // Reset when symbol changes
  useEffect(() => {
    if (fetchedRef.current !== symbol) {
      setTimeframeData({});
    }
  }, [symbol]);

  const analyses = useMemo((): TimeframeAnalysis[] => {
    return TIMEFRAMES.map(tf => {
      const tfData = timeframeData[tf.days];
      if (!tfData || tfData.loading || tfData.data.length < 14) {
        return {
          label: tf.label,
          days: tf.days,
          trend: 'neutral' as const,
          rsi: NaN,
          smaSignal: 'above' as const,
          macdSignal: 'neutral' as const,
          priceChange: 0,
          volatility: 0,
          data: tfData?.data || [],
        };
      }

      const data = tfData.data;
      const closes = data.map(d => d.close);
      
      // RSI
      const rsiValues = RSI(closes, 14);
      const currentRsi = rsiValues[rsiValues.length - 1];
      
      // SMA signal
      const sma20 = SMA(closes, Math.min(20, closes.length - 1));
      const lastSma = sma20[sma20.length - 1];
      const lastPrice = closes[closes.length - 1];
      const smaSignal = lastPrice > lastSma ? 'above' : 'below';
      
      // MACD signal
      const macdResult = MACD(closes);
      const lastHistogram = macdResult.histogram[macdResult.histogram.length - 1];
      const macdSignal = !isNaN(lastHistogram) && lastHistogram > 0 ? 'bullish' : 'bearish';
      
      // Price change
      const firstPrice = closes[0];
      const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
      
      // Trend
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      const signals = [
        smaSignal === 'above' ? 1 : -1,
        macdSignal === 'bullish' ? 1 : -1,
        currentRsi > 50 ? 1 : -1,
      ];
      const signalSum = signals.reduce((s, v) => s + v, 0);
      if (signalSum >= 2) trend = 'bullish';
      else if (signalSum <= -2) trend = 'bearish';
      
      // Volatility
      const volatility = calculateVolatility(data);

      return {
        label: tf.label,
        days: tf.days,
        trend,
        rsi: currentRsi,
        smaSignal: smaSignal as 'above' | 'below',
        macdSignal: macdSignal as 'bullish' | 'bearish',
        priceChange,
        volatility,
        data,
      };
    });
  }, [timeframeData]);

  const isLoading = Object.values(timeframeData).some(t => t.loading);

  // Overall alignment
  const alignment = useMemo(() => {
    const validAnalyses = analyses.filter(a => a.data.length >= 14);
    if (validAnalyses.length === 0) return 'neutral';
    const bullish = validAnalyses.filter(a => a.trend === 'bullish').length;
    const bearish = validAnalyses.filter(a => a.trend === 'bearish').length;
    if (bullish === validAnalyses.length) return 'aligned-bullish';
    if (bearish === validAnalyses.length) return 'aligned-bearish';
    return 'mixed';
  }, [analyses]);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Multi-Timeframe</h3>
          <span className="text-xs text-[var(--text-secondary)]">{symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && alignment !== 'neutral' && (
            <span className={`px-2 py-0.5 text-xs rounded ${
              alignment === 'aligned-bullish' ? 'bg-green-500/20 text-green-400' :
              alignment === 'aligned-bearish' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {alignment === 'aligned-bullish' ? '✅ All Bullish' :
               alignment === 'aligned-bearish' ? '🔴 All Bearish' :
               '⚠️ Mixed Signals'}
            </span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {/* Timeframe Comparison Grid */}
              <div className="grid grid-cols-3 gap-2">
                {analyses.map(analysis => (
                  <div
                    key={analysis.days}
                    className={`rounded-lg p-3 border ${
                      analysis.trend === 'bullish' ? 'bg-green-500/5 border-green-500/30' :
                      analysis.trend === 'bearish' ? 'bg-red-500/5 border-red-500/30' :
                      'bg-[var(--bg-hover)] border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-[var(--text-primary)]">{analysis.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        analysis.trend === 'bullish' ? 'bg-green-500/20 text-green-400' :
                        analysis.trend === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {analysis.trend === 'bullish' ? '↗ Bull' :
                         analysis.trend === 'bearish' ? '↘ Bear' : '→ Neutral'}
                      </span>
                    </div>

                    {/* Mini sparkline */}
                    {analysis.data.length > 1 && (
                      <div className="mb-2">
                        <svg width="100%" height="30" viewBox="0 0 100 30" preserveAspectRatio="none">
                          {(() => {
                            const prices = analysis.data.map(d => d.close);
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            const range = max - min || 1;
                            const isUp = prices[prices.length - 1] >= prices[0];
                            const points = prices.map((p, i) => {
                              const x = (i / (prices.length - 1)) * 100;
                              const y = 30 - ((p - min) / range) * 28;
                              return `${x},${y}`;
                            }).join(' ');
                            return (
                              <polyline
                                fill="none"
                                stroke={isUp ? '#22c55e' : '#ef4444'}
                                strokeWidth="1.5"
                                points={points}
                              />
                            );
                          })()}
                        </svg>
                      </div>
                    )}

                    {/* Indicators */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Change</span>
                        <span className={analysis.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {analysis.priceChange >= 0 ? '+' : ''}{analysis.priceChange.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">RSI</span>
                        <span className={
                          isNaN(analysis.rsi) ? 'text-gray-500' :
                          analysis.rsi > 70 ? 'text-red-400' :
                          analysis.rsi < 30 ? 'text-green-400' :
                          'text-[var(--text-primary)]'
                        }>
                          {isNaN(analysis.rsi) ? '—' : analysis.rsi.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Price/SMA</span>
                        <span className={analysis.smaSignal === 'above' ? 'text-green-400' : 'text-red-400'}>
                          {analysis.smaSignal === 'above' ? '↑ Above' : '↓ Below'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">MACD</span>
                        <span className={analysis.macdSignal === 'bullish' ? 'text-green-400' : 'text-red-400'}>
                          {analysis.macdSignal === 'bullish' ? '↑ Bull' : '↓ Bear'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Volatility</span>
                        <span className="text-[var(--text-primary)]">{analysis.volatility.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Alignment Summary */}
              <div className={`text-xs p-2 rounded-lg ${
                alignment === 'aligned-bullish' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                alignment === 'aligned-bearish' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              }`}>
                {alignment === 'aligned-bullish' && (
                  <p><strong>✅ All timeframes aligned bullish.</strong> Strong confluence — trend is likely to continue upward.</p>
                )}
                {alignment === 'aligned-bearish' && (
                  <p><strong>🔴 All timeframes aligned bearish.</strong> Strong confluence — trend is likely to continue downward.</p>
                )}
                {alignment === 'mixed' && (
                  <p><strong>⚠️ Mixed signals across timeframes.</strong> No clear directional consensus — consider waiting for alignment or trading with the longer timeframe trend.</p>
                )}
                {alignment === 'neutral' && (
                  <p>Analyzing multi-timeframe data...</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
