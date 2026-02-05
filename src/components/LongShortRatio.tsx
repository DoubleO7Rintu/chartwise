'use client';

import { useState, useEffect, useMemo } from 'react';

interface LSRData {
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  timestamp: number;
}

interface LongShortRatioProps {
  symbol: string;
  className?: string;
}

const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT',
  'XRP': 'XRPUSDT',
  'SUI': 'SUIUSDT',
  'DOGE': 'DOGEUSDT',
  'ADA': 'ADAUSDT',
  'AVAX': 'AVAXUSDT',
  'LINK': 'LINKUSDT',
  'DOT': 'DOTUSDT',
};

async function fetchLSR(symbol: string, limit: number = 30): Promise<LSRData[]> {
  const binanceSymbol = BINANCE_SYMBOLS[symbol.toUpperCase()];
  if (!binanceSymbol) return [];

  try {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${binanceSymbol}&period=1h&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d: { longShortRatio: string; longAccount: string; shortAccount: string; timestamp: number }) => ({
      longShortRatio: parseFloat(d.longShortRatio),
      longAccount: parseFloat(d.longAccount) * 100,
      shortAccount: parseFloat(d.shortAccount) * 100,
      timestamp: d.timestamp,
    }));
  } catch {
    return [];
  }
}

export default function LongShortRatio({ symbol, className = '' }: LongShortRatioProps) {
  const [data, setData] = useState<LSRData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const isSupported = BINANCE_SYMBOLS[symbol.toUpperCase()] !== undefined;

  useEffect(() => {
    if (!isSupported || !isOpen) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const result = await fetchLSR(symbol);
      setData(result);
      setLoading(false);
    };

    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [symbol, isSupported, isOpen]);

  const current = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const latest = data[data.length - 1].longShortRatio;
    const previous = data[data.length - 2].longShortRatio;
    if (latest > previous) return 'long-increasing';
    if (latest < previous) return 'short-increasing';
    return 'neutral';
  }, [data]);

  if (!isSupported) return null;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Long/Short Ratio</h3>
        </div>
        <div className="flex items-center gap-2">
          {current && !loading && (
            <span className={`text-xs font-medium ${current.longAccount > current.shortAccount ? 'text-green-400' : 'text-red-400'}`}>
              {current.longShortRatio.toFixed(2)}
            </span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="spinner" />
            </div>
          ) : current ? (
            <>
              {/* Current ratio bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">Longs: {current.longAccount.toFixed(1)}%</span>
                  <span className="text-red-400">Shorts: {current.shortAccount.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-red-500/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500/70 rounded-full transition-all"
                    style={{ width: `${current.longAccount}%` }}
                  />
                </div>
              </div>

              {/* Ratio details */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">L/S Ratio</div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {current.longShortRatio.toFixed(2)}
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">Trend</div>
                  <div className={`text-sm font-bold ${
                    trend === 'long-increasing' ? 'text-green-400' : 
                    trend === 'short-increasing' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {trend === 'long-increasing' ? '↑ Longs' : 
                     trend === 'short-increasing' ? '↑ Shorts' : '—'}
                  </div>
                </div>
                <div className="bg-[var(--bg-hover)] rounded-lg p-2 text-center">
                  <div className="text-xs text-[var(--text-secondary)]">Sentiment</div>
                  <div className={`text-sm font-bold ${
                    current.longShortRatio > 1.5 ? 'text-green-400' :
                    current.longShortRatio < 0.7 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {current.longShortRatio > 1.5 ? 'Bullish' :
                     current.longShortRatio < 0.7 ? 'Bearish' : 'Neutral'}
                  </div>
                </div>
              </div>

              {/* History Chart */}
              {data.length > 1 && (
                <div>
                  <div className="text-xs text-[var(--text-secondary)] mb-1">30h History</div>
                  <div className="flex items-center gap-[1px] h-10">
                    {data.map((d, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col"
                        style={{ height: '100%' }}
                        title={`L: ${d.longAccount.toFixed(1)}% | S: ${d.shortAccount.toFixed(1)}% at ${new Date(d.timestamp).toLocaleTimeString()}`}
                      >
                        <div
                          className="bg-red-500/50 rounded-t-sm"
                          style={{ height: `${d.shortAccount}%` }}
                        />
                        <div
                          className="bg-green-500/50 rounded-b-sm"
                          style={{ height: `${d.longAccount}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-2">
                <strong>Long/Short Ratio</strong> shows the proportion of accounts holding long vs short positions.
                Extreme readings often indicate potential reversals (contrarian indicator).
              </div>
            </>
          ) : (
            <div className="text-center text-[var(--text-secondary)] text-sm py-4">
              Unable to fetch Long/Short data
            </div>
          )}
        </div>
      )}
    </div>
  );
}
