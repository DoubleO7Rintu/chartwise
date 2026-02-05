'use client';

import { useState, useEffect } from 'react';

interface TickerItem {
  symbol: string;
  price: number;
  change24h: number;
}

interface MarketTickerProps {
  onSelectAsset?: (symbol: string) => void;
  className?: string;
}

export default function MarketTicker({ onSelectAsset, className = '' }: MarketTickerProps) {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?' +
          'vs_currency=usd&ids=bitcoin,ethereum,solana,ripple,sui,dogecoin,cardano' +
          '&order=market_cap_desc&sparkline=false&price_change_percentage=24h'
        );
        if (!res.ok) return;
        const data = await res.json();
        
        setItems(data.map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          price: coin.current_price,
          change24h: coin.price_change_percentage_24h || 0,
        })));
      } catch {
        // silently fail
      }
    }

    fetchTicker();
    const interval = setInterval(fetchTicker, 30000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className={`bg-[var(--bg-secondary)] border-b border-[var(--border)] overflow-hidden ${className}`}>
      <div className="flex items-center gap-6 px-4 py-1.5 animate-scroll whitespace-nowrap">
        {/* Duplicate items for seamless scroll effect */}
        {[...items, ...items].map((item, i) => (
          <button
            key={`${item.symbol}-${i}`}
            onClick={() => onSelectAsset?.(item.symbol)}
            className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity shrink-0"
          >
            <span className="font-medium text-[var(--text-primary)]">{item.symbol}</span>
            <span className="text-[var(--text-secondary)]">
              ${item.price >= 1 ? item.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : item.price.toFixed(4)}
            </span>
            <span className={`font-medium ${item.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
