'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchCryptoOHLCV } from '@/lib/api';
import { OHLCV } from '@/utils/indicators';

interface CorrelationMatrixProps {
  className?: string;
}

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'SUI'];

function calculateCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;

  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);

  const meanA = aSlice.reduce((s, v) => s + v, 0) / n;
  const meanB = bSlice.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i++) {
    const da = aSlice[i] - meanA;
    const db = bSlice[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  const denominator = Math.sqrt(denomA * denomB);
  return denominator === 0 ? 0 : numerator / denominator;
}

function getCorrelationColor(corr: number): string {
  if (corr >= 0.8) return 'bg-green-500';
  if (corr >= 0.5) return 'bg-green-500/60';
  if (corr >= 0.2) return 'bg-green-500/30';
  if (corr >= -0.2) return 'bg-gray-500/30';
  if (corr >= -0.5) return 'bg-red-500/30';
  if (corr >= -0.8) return 'bg-red-500/60';
  return 'bg-red-500';
}

function getCorrelationTextColor(corr: number): string {
  if (Math.abs(corr) >= 0.5) return 'text-white';
  return 'text-[var(--text-primary)]';
}

export default function CorrelationMatrix({ className = '' }: CorrelationMatrixProps) {
  const [returns, setReturns] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchData() {
      setLoading(true);
      const allReturns: Record<string, number[]> = {};

      for (const symbol of CRYPTO_SYMBOLS) {
        try {
          const ohlcv: OHLCV[] = await fetchCryptoOHLCV(symbol, '1d', 90);
          if (ohlcv.length > 1) {
            const dailyReturns: number[] = [];
            for (let i = 1; i < ohlcv.length; i++) {
              dailyReturns.push((ohlcv[i].close - ohlcv[i - 1].close) / ohlcv[i - 1].close);
            }
            allReturns[symbol] = dailyReturns;
          }
        } catch {
          // skip
        }
      }

      setReturns(allReturns);
      setLoading(false);
    }

    fetchData();
  }, [isOpen]);

  const matrix = useMemo(() => {
    const symbols = CRYPTO_SYMBOLS.filter(s => returns[s]);
    const result: { row: string; cols: { symbol: string; corr: number }[] }[] = [];

    for (const rowSymbol of symbols) {
      const cols = symbols.map(colSymbol => ({
        symbol: colSymbol,
        corr: rowSymbol === colSymbol ? 1 : calculateCorrelation(returns[rowSymbol], returns[colSymbol]),
      }));
      result.push({ row: rowSymbol, cols });
    }

    return result;
  }, [returns]);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔗</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Correlation Matrix</h3>
          <span className="text-xs text-[var(--text-secondary)]">(90d)</span>
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="spinner" />
            </div>
          ) : matrix.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-[var(--text-secondary)]"></th>
                    {matrix[0].cols.map(col => (
                      <th key={col.symbol} className="p-1 text-center text-[var(--text-secondary)] font-medium">
                        {col.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map(row => (
                    <tr key={row.row}>
                      <td className="p-1 text-[var(--text-secondary)] font-medium">{row.row}</td>
                      {row.cols.map(col => (
                        <td
                          key={col.symbol}
                          className={`p-1 text-center rounded ${getCorrelationColor(col.corr)} ${getCorrelationTextColor(col.corr)}`}
                          title={`${row.row} vs ${col.symbol}: ${col.corr.toFixed(3)}`}
                        >
                          {col.corr.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Strong +</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-500/30 rounded" />
                  <span>Weak</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span>Strong −</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-[var(--text-secondary)] text-sm py-4">
              Unable to calculate correlations
            </div>
          )}
        </div>
      )}
    </div>
  );
}
