'use client';

import { useState, useEffect, useMemo } from 'react';

interface AssetPerformance {
  symbol: string;
  name: string;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  change30d: number;
  sparkline: number[];
}

interface PricePerformanceProps {
  selectedAsset: string;
  onSelectAsset?: (symbol: string) => void;
  className?: string;
}

export default function PricePerformance({ selectedAsset, onSelectAsset, className = '' }: PricePerformanceProps) {
  const [assets, setAssets] = useState<AssetPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    async function fetchPerformance() {
      setLoading(true);
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?' +
          'vs_currency=usd&ids=bitcoin,ethereum,solana,ripple,sui,dogecoin,cardano,avalanche-2,chainlink,polkadot' +
          '&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d,30d'
        );
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();

        const mapped: AssetPerformance[] = data.map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change1h: coin.price_change_percentage_1h_in_currency || 0,
          change24h: coin.price_change_percentage_24h_in_currency || 0,
          change7d: coin.price_change_percentage_7d_in_currency || 0,
          change30d: coin.price_change_percentage_30d_in_currency || 0,
          sparkline: coin.sparkline_in_7d?.price?.slice(-24) || [],
        }));

        setAssets(mapped);
      } catch (error) {
        console.error('Performance fetch error:', error);
      }
      setLoading(false);
    }

    if (isOpen) {
      fetchPerformance();
    }
  }, [isOpen]);

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const key = sortBy === '24h' ? 'change24h' : sortBy === '7d' ? 'change7d' : 'change30d';
      return b[key] - a[key];
    });
  }, [assets, sortBy]);

  const renderChange = (value: number) => {
    const color = value >= 0 ? 'text-green-400' : 'text-red-400';
    return (
      <span className={`${color} font-medium`}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </span>
    );
  };

  const renderMiniSparkline = (data: number[]) => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const isUp = data[data.length - 1] >= data[0];
    const height = 20;
    const width = 60;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="shrink-0">
        <polyline
          fill="none"
          stroke={isUp ? '#22c55e' : '#ef4444'}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Price Performance</h3>
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3">
          {/* Sort tabs */}
          <div className="flex gap-1 mb-3">
            {(['24h', '7d', '30d'] as const).map(period => (
              <button
                key={period}
                onClick={() => setSortBy(period)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  sortBy === period
                    ? 'bg-blue-500 text-white'
                    : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-gray-600'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-2">
                  <div className="h-4 w-12 bg-gray-700 rounded" />
                  <div className="flex-1 h-4 bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {sortedAssets.map((asset, idx) => (
                <button
                  key={asset.symbol}
                  onClick={() => onSelectAsset?.(asset.symbol)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-xs hover:bg-[var(--bg-hover)] transition-colors ${
                    asset.symbol === selectedAsset ? 'bg-blue-500/10 border border-blue-500/30' : ''
                  }`}
                >
                  <span className="text-[var(--text-secondary)] w-4">{idx + 1}</span>
                  <span className="font-medium text-[var(--text-primary)] w-12">{asset.symbol}</span>
                  <span className="text-[var(--text-secondary)] w-20 text-right">
                    ${asset.price >= 1 ? asset.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : asset.price.toFixed(4)}
                  </span>
                  <span className="w-14 text-right">{renderChange(asset.change24h)}</span>
                  <span className="w-14 text-right">{renderChange(asset.change7d)}</span>
                  <span className="w-14 text-right hidden sm:block">{renderChange(asset.change30d)}</span>
                  <span className="hidden sm:block">{renderMiniSparkline(asset.sparkline)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
