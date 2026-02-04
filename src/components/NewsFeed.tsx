'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface NewsFeedProps {
  symbol: string;
  className?: string;
}

// Free news sources - no API key required
async function fetchNews(symbol: string): Promise<NewsItem[]> {
  try {
    // Use our proxy to fetch from CoinGecko's free news endpoint
    const response = await fetch(`/api/news/${symbol}`);
    if (!response.ok) throw new Error('Failed to fetch news');
    const data = await response.json();
    return data.news || [];
  } catch (error) {
    console.error('News fetch error:', error);
    return [];
  }
}

export default function NewsFeed({ symbol, className = '' }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      const items = await fetchNews(symbol);
      setNews(items);
      setLoading(false);
    };
    loadNews();
  }, [symbol]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '📈';
      case 'negative': return '📉';
      default: return '📰';
    }
  };

  const displayedNews = expanded ? news : news.slice(0, 5);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📰 News for {symbol}
        </h3>
        {news.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            {expanded ? 'Show less' : `Show all (${news.length})`}
          </button>
        )}
      </div>
      
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No recent news for {symbol}
          </div>
        ) : (
          displayedNews.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{getSentimentIcon(item.sentiment)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 hover:text-blue-500">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{item.source}</span>
                    <span className="text-gray-400">•</span>
                    <span className={getSentimentColor(item.sentiment)}>{formatTime(item.publishedAt)}</span>
                  </div>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
