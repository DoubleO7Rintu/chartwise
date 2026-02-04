'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchCryptoOHLCV, fetchStockOHLCV, getSupportedAssets } from '@/lib/api';
import { OHLCV, SMA, BollingerBands } from '@/utils/indicators';

const Chart = dynamic(() => import('@/components/Chart'), { ssr: false });

interface MultiChartViewProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbols?: string[];
}

const assets = getSupportedAssets();

export default function MultiChartView({ isOpen, onClose, initialSymbols = ['BTC', 'ETH'] }: MultiChartViewProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(initialSymbols.slice(0, 4));
  const [chartData, setChartData] = useState<Record<string, OHLCV[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [layout, setLayout] = useState<'2x1' | '2x2' | '1x2'>('2x1');

  useEffect(() => {
    if (!isOpen) return;
    
    selectedSymbols.forEach(async (symbol) => {
      if (chartData[symbol]) return;
      
      setLoading(prev => ({ ...prev, [symbol]: true }));
      try {
        const asset = assets.find(a => a.symbol === symbol);
        let data: OHLCV[];
        
        if (asset?.type === 'stock') {
          data = await fetchStockOHLCV(symbol, 90);
        } else {
          data = await fetchCryptoOHLCV(symbol, '1d', 90);
        }
        
        setChartData(prev => ({ ...prev, [symbol]: data }));
      } catch (error) {
        console.error(`Failed to load ${symbol}:`, error);
      }
      setLoading(prev => ({ ...prev, [symbol]: false }));
    });
  }, [isOpen, selectedSymbols]);

  const addSymbol = (symbol: string) => {
    if (selectedSymbols.length >= 4 || selectedSymbols.includes(symbol)) return;
    setSelectedSymbols([...selectedSymbols, symbol]);
  };

  const removeSymbol = (symbol: string) => {
    if (selectedSymbols.length <= 1) return;
    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    setChartData(prev => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  };

  const getGridClass = () => {
    switch (layout) {
      case '2x2': return 'grid-cols-2 grid-rows-2';
      case '1x2': return 'grid-cols-1 grid-rows-2';
      default: return 'grid-cols-2 grid-rows-1';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-primary)] rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">📊 Multi-Chart View</h2>
            
            {/* Layout Selector */}
            <div className="flex gap-1">
              {[
                { id: '2x1', label: '▢▢' },
                { id: '1x2', label: '▭' },
                { id: '2x2', label: '⊞' },
              ].map(l => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id as any)}
                  className={`px-2 py-1 rounded text-sm ${
                    layout === l.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Symbol Selector */}
        <div className="p-3 border-b border-gray-700 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Add:</span>
          {assets.filter(a => !selectedSymbols.includes(a.symbol)).slice(0, 8).map(asset => (
            <button
              key={asset.symbol}
              onClick={() => addSymbol(asset.symbol)}
              disabled={selectedSymbols.length >= 4}
              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + {asset.symbol}
            </button>
          ))}
          {selectedSymbols.length >= 4 && (
            <span className="text-xs text-yellow-500">Max 4 charts</span>
          )}
        </div>

        {/* Charts Grid */}
        <div className={`flex-1 grid ${getGridClass()} gap-2 p-2 overflow-auto`}>
          {selectedSymbols.map(symbol => {
            const data = chartData[symbol] || [];
            const isLoading = loading[symbol];
            const indicators = data.length > 20 ? {
              sma20: SMA(data.map(d => d.close), 20),
              bb: BollingerBands(data.map(d => d.close)),
            } : {};

            return (
              <div key={symbol} className="bg-gray-800 rounded-lg overflow-hidden flex flex-col min-h-[250px]">
                <div className="px-3 py-2 bg-gray-900 flex items-center justify-between">
                  <span className="font-medium">{symbol}</span>
                  {selectedSymbols.length > 1 && (
                    <button
                      onClick={() => removeSymbol(symbol)}
                      className="text-gray-500 hover:text-red-400 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Loading {symbol}...
                    </div>
                  ) : data.length > 0 ? (
                    <Chart
                      data={data}
                      indicators={indicators}
                      height={layout === '2x2' ? 200 : 300}
                      chartType="candlestick"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No data for {symbol}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
