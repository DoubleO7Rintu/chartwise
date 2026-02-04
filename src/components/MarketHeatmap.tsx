'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  image: string;
}

interface MarketHeatmapProps {
  onSelectAsset?: (symbol: string) => void;
  category?: 'crypto' | 'all';
}

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

function getHeatColor(change: number): string {
  if (change >= 10) return 'bg-green-600';
  if (change >= 5) return 'bg-green-500';
  if (change >= 2) return 'bg-green-500/80';
  if (change >= 0.5) return 'bg-green-500/60';
  if (change >= 0) return 'bg-green-500/30';
  if (change >= -0.5) return 'bg-red-500/30';
  if (change >= -2) return 'bg-red-500/60';
  if (change >= -5) return 'bg-red-500/80';
  if (change >= -10) return 'bg-red-500';
  return 'bg-red-600';
}

function getTextColor(change: number): string {
  if (Math.abs(change) >= 2) return 'text-white';
  return 'text-gray-200';
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

// Squarified treemap layout algorithm
function squarify(
  items: { symbol: string; weight: number; change: number; name: string; price: number; marketCap: number }[],
  containerWidth: number,
  containerHeight: number
): { x: number; y: number; w: number; h: number; symbol: string; change: number; name: string; price: number; marketCap: number }[] {
  if (items.length === 0 || containerWidth <= 0 || containerHeight <= 0) return [];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return [];

  const result: { x: number; y: number; w: number; h: number; symbol: string; change: number; name: string; price: number; marketCap: number }[] = [];

  // Simple slice-and-dice layout
  let x = 0;
  let y = 0;
  let remainingWidth = containerWidth;
  let remainingHeight = containerHeight;
  let remainingWeight = totalWeight;
  let horizontal = containerWidth >= containerHeight;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ratio = item.weight / remainingWeight;

    let w: number, h: number;
    if (horizontal) {
      w = remainingWidth * ratio;
      h = remainingHeight;
      result.push({ x, y, w, h, symbol: item.symbol, change: item.change, name: item.name, price: item.price, marketCap: item.marketCap });
      x += w;
      remainingWidth -= w;
    } else {
      w = remainingWidth;
      h = remainingHeight * ratio;
      result.push({ x, y, w, h, symbol: item.symbol, change: item.change, name: item.name, price: item.price, marketCap: item.marketCap });
      y += h;
      remainingHeight -= h;
    }

    remainingWeight -= item.weight;

    // Alternate direction every few items for better aspect ratios
    if (i % 3 === 2) {
      horizontal = !horizontal;
    }
  }

  return result;
}

export default function MarketHeatmap({ onSelectAsset, category = 'crypto' }: MarketHeatmapProps) {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'market_cap' | 'volume' | 'change'>('market_cap');
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [count, setCount] = useState(30);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchMarketData() {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${COINGECKO_BASE}/coins/markets`, {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: count,
            page: 1,
            sparkline: false,
            price_change_percentage: '24h',
          },
        });
        setAssets(response.data);
      } catch (err) {
        setError('Failed to load market data. CoinGecko rate limit may apply.');
        console.error(err);
      }
      setLoading(false);
    }

    fetchMarketData();
  }, [isOpen, count]);

  const sortedAssets = useMemo(() => {
    const sorted = [...assets];
    if (sortBy === 'volume') {
      sorted.sort((a, b) => b.total_volume - a.total_volume);
    } else if (sortBy === 'change') {
      sorted.sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h));
    }
    // Default is already sorted by market_cap from API
    return sorted;
  }, [assets, sortBy]);

  const treemapItems = useMemo(() => {
    return sortedAssets.map(a => ({
      symbol: a.symbol.toUpperCase(),
      weight: Math.log10(Math.max(a.market_cap, 1)),
      change: a.price_change_percentage_24h || 0,
      name: a.name,
      price: a.current_price,
      marketCap: a.market_cap,
    }));
  }, [sortedAssets]);

  const CONTAINER_WIDTH = 900;
  const CONTAINER_HEIGHT = 500;
  const treemapLayout = useMemo(() => 
    squarify(treemapItems, CONTAINER_WIDTH, CONTAINER_HEIGHT),
    [treemapItems]
  );

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors border border-[var(--border)]"
      >
        <span>🗺️</span>
        <span>Market Heatmap</span>
        <span className="text-[var(--text-secondary)]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              🗺️ Market Heatmap
              <span className="text-xs text-[var(--text-secondary)] font-normal">
                Top {count} by market cap
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">Size by:</span>
              {[
                { id: 'market_cap', label: 'Market Cap' },
                { id: 'volume', label: 'Volume' },
                { id: 'change', label: '% Change' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as typeof sortBy)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    sortBy === opt.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <select
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs rounded px-2 py-1 border border-[var(--border)]"
              >
                <option value={20}>Top 20</option>
                <option value={30}>Top 30</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-2 flex items-center gap-2 text-xs border-b border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">24h Change:</span>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-red-600 inline-block"></span>
              <span className="text-[var(--text-secondary)]">-10%+</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-red-500/60 inline-block"></span>
              <span className="text-[var(--text-secondary)]">-2%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-gray-600 inline-block"></span>
              <span className="text-[var(--text-secondary)]">0%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-green-500/60 inline-block"></span>
              <span className="text-[var(--text-secondary)]">+2%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-green-600 inline-block"></span>
              <span className="text-[var(--text-secondary)]">+10%+</span>
            </div>
          </div>

          {/* Heatmap */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-[300px] text-[var(--text-secondary)]">
                <div className="animate-pulse">Loading market data...</div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-[200px] text-red-400">
                {error}
              </div>
            ) : (
              <div className="relative w-full" style={{ paddingBottom: `${(CONTAINER_HEIGHT / CONTAINER_WIDTH) * 100}%` }}>
                <div className="absolute inset-0">
                  <svg
                    viewBox={`0 0 ${CONTAINER_WIDTH} ${CONTAINER_HEIGHT}`}
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    {treemapLayout.map((rect, i) => {
                      const isHovered = hoveredAsset === rect.symbol;
                      const change = rect.change;
                      
                      // SVG fill colors
                      let fill: string;
                      if (change >= 10) fill = '#16a34a';
                      else if (change >= 5) fill = '#22c55e';
                      else if (change >= 2) fill = 'rgba(34, 197, 94, 0.8)';
                      else if (change >= 0.5) fill = 'rgba(34, 197, 94, 0.6)';
                      else if (change >= 0) fill = 'rgba(34, 197, 94, 0.3)';
                      else if (change >= -0.5) fill = 'rgba(239, 68, 68, 0.3)';
                      else if (change >= -2) fill = 'rgba(239, 68, 68, 0.6)';
                      else if (change >= -5) fill = 'rgba(239, 68, 68, 0.8)';
                      else if (change >= -10) fill = '#ef4444';
                      else fill = '#dc2626';

                      const fontSize = Math.min(rect.w / 5, rect.h / 3, 18);
                      const showPrice = rect.w > 70 && rect.h > 50;
                      const showChange = rect.w > 50 && rect.h > 35;

                      return (
                        <g
                          key={rect.symbol}
                          onMouseEnter={() => setHoveredAsset(rect.symbol)}
                          onMouseLeave={() => setHoveredAsset(null)}
                          onClick={() => onSelectAsset?.(rect.symbol)}
                          style={{ cursor: onSelectAsset ? 'pointer' : 'default' }}
                        >
                          <rect
                            x={rect.x + 1}
                            y={rect.y + 1}
                            width={Math.max(rect.w - 2, 0)}
                            height={Math.max(rect.h - 2, 0)}
                            fill={fill}
                            rx={4}
                            stroke={isHovered ? '#fff' : '#131722'}
                            strokeWidth={isHovered ? 2 : 1}
                            opacity={isHovered ? 1 : 0.9}
                          />
                          {fontSize >= 8 && (
                            <>
                              <text
                                x={rect.x + rect.w / 2}
                                y={rect.y + rect.h / 2 - (showPrice ? fontSize * 0.6 : 0)}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize={fontSize}
                                fontWeight="bold"
                              >
                                {rect.symbol}
                              </text>
                              {showChange && (
                                <text
                                  x={rect.x + rect.w / 2}
                                  y={rect.y + rect.h / 2 + fontSize * 0.5}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="rgba(255,255,255,0.9)"
                                  fontSize={fontSize * 0.7}
                                >
                                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                </text>
                              )}
                              {showPrice && (
                                <text
                                  x={rect.x + rect.w / 2}
                                  y={rect.y + rect.h / 2 + fontSize * 1.3}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill="rgba(255,255,255,0.7)"
                                  fontSize={fontSize * 0.55}
                                >
                                  ${rect.price < 1 ? rect.price.toFixed(4) : rect.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </text>
                              )}
                            </>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Hovered asset tooltip */}
          {hoveredAsset && (
            <div className="px-4 pb-3 text-sm text-[var(--text-secondary)]">
              {(() => {
                const asset = sortedAssets.find(a => a.symbol.toUpperCase() === hoveredAsset);
                if (!asset) return null;
                return (
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-[var(--text-primary)]">{asset.name} ({asset.symbol.toUpperCase()})</span>
                    <span>${asset.current_price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                    <span className={asset.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {asset.price_change_percentage_24h >= 0 ? '+' : ''}{asset.price_change_percentage_24h.toFixed(2)}%
                    </span>
                    <span>MCap: {formatMarketCap(asset.market_cap)}</span>
                    <span>Vol: {formatMarketCap(asset.total_volume)}</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
