import React, { useState, useEffect, useCallback } from "react";
import { fetchCompanyNews } from "../../services/stockApi";
import { NewsArticle } from "../../types";
import styles from "./NewsPanel.module.css";

// Icons
const Icons = {
  Newspaper: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  ),
  TrendingDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
      <polyline points="17,18 23,18 23,12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

type NewsFilter = "all" | "bullish" | "bearish";

interface NewsPanelProps {
  symbols?: string[];
  maxItems?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onArticleClick?: (article: NewsArticle) => void;
}

// Japanese stock symbols with their names
const JAPANESE_STOCKS: Record<string, string> = {
  "7203.T": "Toyota",
  "6758.T": "Sony",
  "9984.T": "SoftBank",
  "7974.T": "Nintendo",
  "6861.T": "Keyence",
  "9432.T": "NTT",
  "8306.T": "MUFG",
  "6501.T": "Hitachi",
  "9433.T": "KDDI",
  "8035.T": "Tokyo Electron",
};

// US stock symbols
const US_STOCKS: Record<string, string> = {
  AAPL: "Apple",
  NVDA: "NVIDIA",
  MSFT: "Microsoft",
  GOOGL: "Alphabet",
  AMZN: "Amazon",
  TSLA: "Tesla",
  META: "Meta",
};

export const NewsPanel: React.FC<NewsPanelProps> = ({
  symbols = ["AAPL", "NVDA", "MSFT", "GOOGL"],
  maxItems = 10,
  compact = false,
  title = "Market News",
  subtitle,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  onArticleClick,
}) => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Calculate date range (last 7 days)
      const toDate = new Date();
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const from = fromDate.toISOString().split("T")[0];
      const to = toDate.toISOString().split("T")[0];

      // Fetch news for each symbol (only US stocks for Finnhub)
      const usSymbols = symbols.filter((s) => !s.includes(".T"));
      const newsPromises = usSymbols.slice(0, 3).map((symbol) =>
        fetchCompanyNews(symbol, from, to).catch(() => [])
      );

      const results = await Promise.all(newsPromises);

      // Flatten and deduplicate
      const allNews = results.flat();
      const uniqueNews = deduplicateNews(allNews);

      // Sort by date (newest first) and limit
      const sortedNews = uniqueNews
        .sort((a, b) => {
          const dateA = new Date(a.datetime || a.publishedAt || 0).getTime();
          const dateB = new Date(b.datetime || b.publishedAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, maxItems);

      setNews(sortedNews);
    } catch (err) {
      console.error("Failed to fetch news:", err);
      setError("Failed to load news. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [symbols, maxItems]);

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => fetchNews(true), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchNews]);

  const deduplicateNews = (articles: NewsArticle[]): NewsArticle[] => {
    const seen = new Set<string>();
    return articles.filter((article) => {
      const key = article.url || article.headline;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const formatTimeAgo = (date: Date | string | number): string => {
    const now = new Date();
    const articleDate = new Date(date);
    const diffMs = now.getTime() - articleDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return articleDate.toLocaleDateString();
  };

  const getSentiment = (article: NewsArticle): "bullish" | "bearish" | "neutral" => {
    const text = (article.headline + " " + (article.summary || "")).toLowerCase();
    const bullishWords = ["surge", "jump", "gain", "rise", "rally", "soar", "high", "record", "growth", "profit", "beat"];
    const bearishWords = ["drop", "fall", "decline", "loss", "plunge", "crash", "low", "miss", "cut", "warn", "down"];

    const bullishScore = bullishWords.filter((w) => text.includes(w)).length;
    const bearishScore = bearishWords.filter((w) => text.includes(w)).length;

    if (bullishScore > bearishScore) return "bullish";
    if (bearishScore > bullishScore) return "bearish";
    return "neutral";
  };

  const filteredNews = news.filter((article) => {
    if (filter === "all") return true;
    return getSentiment(article) === filter;
  });

  const handleArticleClick = (article: NewsArticle) => {
    if (onArticleClick) {
      onArticleClick(article);
    } else if (article.url) {
      window.open(article.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={`${styles.newsPanel} ${compact ? styles.newsPanelCompact : ""}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Icons.Newspaper />
          </div>
          <div>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        <div className={styles.controls}>
          <button
            className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "bullish" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter("bullish")}
          >
            Bullish
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "bearish" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter("bearish")}
          >
            Bearish
          </button>
          <button
            className={`${styles.refreshBtn} ${refreshing ? styles.refreshBtnSpinning : ""}`}
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            title="Refresh news"
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>

      {/* News List */}
      <div className={styles.newsList}>
        {loading ? (
          <div className={styles.loadingState}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.loadingSkeleton}>
                <div className={styles.loadingImage} />
                <div className={styles.loadingContent}>
                  <div className={styles.loadingLine} />
                  <div className={`${styles.loadingLine} ${styles.loadingLineShort}`} />
                  <div className={`${styles.loadingLine} ${styles.loadingLineMeta}`} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Icons.AlertCircle />
            </div>
            <h4 className={styles.emptyTitle}>{error}</h4>
            <p className={styles.emptySubtitle}>
              Check your API configuration or try again later.
            </p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Icons.Newspaper />
            </div>
            <h4 className={styles.emptyTitle}>No news available</h4>
            <p className={styles.emptySubtitle}>
              {filter !== "all"
                ? `No ${filter} news found. Try changing the filter.`
                : "News will appear here when available."}
            </p>
          </div>
        ) : (
          filteredNews.map((article, index) => {
            const sentiment = getSentiment(article);
            const datetime = article.datetime
              ? new Date(article.datetime * 1000)
              : article.publishedAt;

            return (
              <div
                key={article.url || index}
                className={styles.newsItem}
                onClick={() => handleArticleClick(article)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {article.image ? (
                  <img
                    src={article.image}
                    alt=""
                    className={styles.newsImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className={styles.newsImagePlaceholder}>
                    <Icons.Image />
                  </div>
                )}
                <div className={styles.newsContent}>
                  <h4 className={styles.newsHeadline}>{article.headline}</h4>
                  {!compact && article.summary && (
                    <p className={styles.newsSummary}>{article.summary}</p>
                  )}
                  <div className={styles.newsMeta}>
                    <span className={styles.newsSource}>{article.source}</span>
                    <span className={styles.newsTime}>
                      <Icons.Clock />
                      {formatTimeAgo(datetime)}
                    </span>
                    {article.related && (
                      <span className={styles.symbolTag}>{article.related}</span>
                    )}
                    <span
                      className={`${styles.newsSentiment} ${
                        sentiment === "bullish"
                          ? styles.newsSentimentBullish
                          : sentiment === "bearish"
                          ? styles.newsSentimentBearish
                          : styles.newsSentimentNeutral
                      }`}
                    >
                      {sentiment === "bullish" ? (
                        <Icons.TrendingUp />
                      ) : sentiment === "bearish" ? (
                        <Icons.TrendingDown />
                      ) : null}
                      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NewsPanel;
