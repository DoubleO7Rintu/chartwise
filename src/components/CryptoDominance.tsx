'use client';

import { useState, useEffect, useMemo } from 'react';

interface DominanceData {
  name: string;
  symbol: string;
  dominance: number;
  color: string;
}

interface CryptoDominanceProps {
  className?: string;
}

const COLORS: Record<string, string> = {
  'bitcoin': '#f7931a',
  'ethereum': '#627eea',
  'tether': '#26a17b',
  'ripple': '#00aae4',
  'solana': '#9945ff',
  'others': '#6b7280',
};

const SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'tether': 'USDT',
  'ripple': 'XRP',
  'solana': 'SOL',
};

export default function CryptoDominance({ className = '' }: CryptoDominanceProps) {
  const [data, setData] = useState<DominanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchDominance() {
      setLoading(true);
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/global'
        );
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        const marketCapPct = json.data.market_cap_percentage;

        const topCoins = Object.entries(marketCapPct)
          .slice(0, 5)
          .map(([id, pct]) => ({
            name: id.charAt(0).toUpperCase() + id.slice(1),
            symbol: SYMBOL_MAP[id] || id.toUpperCase(),
            dominance: pct as number,
            color: COLORS[id] || COLORS['others'],
          }));

        // Calculate others
        const topTotal = topCoins.reduce((s, c) => s + c.dominance, 0);
        topCoins.push({
          name: 'Others',
          symbol: 'OTHER',
          dominance: Math.max(0, 100 - topTotal),
          color: COLORS['others'],
        });

        setData(topCoins);
      } catch (error) {
        console.error('Dominance fetch error:', error);
      }
      setLoading(false);
    }

    fetchDominance();
    const interval = setInterval(fetchDominance, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const btcDominance = useMemo(() => {
    const btc = data.find(d => d.symbol === 'BTC');
    return btc?.dominance || 0;
  }, [data]);

  if (loading && data.length === 0) return null;

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Market Dominance</h3>
        </div>
        <div className="flex items-center gap-2">
          {btcDominance > 0 && (
            <span className="text-xs text-[var(--text-secondary)]">
              BTC: <span style={{ color: COLORS['bitcoin'] }}>{btcDominance.toFixed(1)}%</span>
            </span>
          )}
          <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && data.length > 0 && (
        <div className="px-3 pb-3 space-y-3">
          {/* Stacked bar */}
          <div className="h-6 flex rounded-full overflow-hidden">
            {data.map(coin => (
              <div
                key={coin.symbol}
                style={{
                  width: `${coin.dominance}%`,
                  backgroundColor: coin.color,
                }}
                className="transition-all hover:opacity-80"
                title={`${coin.name}: ${coin.dominance.toFixed(2)}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.map(coin => (
              <div key={coin.symbol} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: coin.color }}
                />
                <span className="text-[var(--text-secondary)]">{coin.symbol}</span>
                <span className="font-medium text-[var(--text-primary)] ml-auto">
                  {coin.dominance.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
