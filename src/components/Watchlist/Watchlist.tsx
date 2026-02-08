import React from "react";
import { useStockStore } from "../../store/useStockStore";
import styles from "./Watchlist.module.css";

// Icons
const Icons = {
  Star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  ChevronUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  ),
  Bookmark: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

interface WatchlistProps {
  onSelectStock: (stock: { symbol: string; name: string; currentPrice?: number; changePercent?: number }) => void;
}

// Sample stock data (in real app, fetch from API)
const STOCK_DATA: Record<string, { name: string; price: number; change: number; sector: string }> = {
  NVDA: { name: "NVIDIA Corporation", price: 142.58, change: 3.42, sector: "Technology" },
  MSFT: { name: "Microsoft Corporation", price: 378.91, change: -0.87, sector: "Technology" },
  GOOGL: { name: "Alphabet Inc.", price: 176.23, change: 1.56, sector: "Technology" },
  AAPL: { name: "Apple Inc.", price: 189.45, change: -1.23, sector: "Technology" },
  TSLA: { name: "Tesla, Inc.", price: 248.50, change: 4.21, sector: "Automotive" },
  AMZN: { name: "Amazon.com, Inc.", price: 186.32, change: 2.15, sector: "Consumer" },
  META: { name: "Meta Platforms, Inc.", price: 512.78, change: -0.45, sector: "Technology" },
  AMD: { name: "Advanced Micro Devices", price: 164.25, change: 2.89, sector: "Technology" },
};

export const Watchlist: React.FC<WatchlistProps> = ({ onSelectStock }) => {
  const watchlist = useStockStore((state) => state.watchlist);
  const removeFromWatchlist = useStockStore((state) => state.removeFromWatchlist);

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${formatNumber(change)}%`;
  };

  // Calculate stats
  const stocksData = watchlist.map((symbol) => STOCK_DATA[symbol] || {
    name: symbol,
    price: 100,
    change: 0,
    sector: "Unknown",
  });

  const totalValue = stocksData.reduce((acc, s) => acc + s.price, 0);
  const gainers = stocksData.filter((s) => s.change > 0).length;
  const losers = stocksData.filter((s) => s.change < 0).length;
  const avgChange = stocksData.length > 0
    ? stocksData.reduce((acc, s) => acc + s.change, 0) / stocksData.length
    : 0;

  const handleRemove = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromWatchlist(symbol);
  };

  return (
    <div className={styles.watchlist}>
      {/* Header */}
      <header className={`${styles.header} ${styles.animateFadeInUp}`}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Icons.Star />
          </div>
          <div>
            <h1 className={styles.title}>Watchlist</h1>
            <p className={styles.subtitle}>Track your favorite stocks</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton}>
            <Icons.Plus />
            Add Stock
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.animateFadeInUp} ${styles.animateDelay1}`}>
          <div className={styles.statLabel}>Total Stocks</div>
          <div className={styles.statValue}>{watchlist.length}</div>
        </div>
        <div className={`${styles.statCard} ${styles.animateFadeInUp} ${styles.animateDelay2}`}>
          <div className={styles.statLabel}>Gainers</div>
          <div className={styles.statValue}>{gainers}</div>
          <div className={`${styles.statChange} ${styles.statChangeBullish}`}>
            {watchlist.length > 0 ? `${((gainers / watchlist.length) * 100).toFixed(0)}%` : "0%"}
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.animateFadeInUp} ${styles.animateDelay3}`}>
          <div className={styles.statLabel}>Losers</div>
          <div className={styles.statValue}>{losers}</div>
          <div className={`${styles.statChange} ${styles.statChangeBearish}`}>
            {watchlist.length > 0 ? `${((losers / watchlist.length) * 100).toFixed(0)}%` : "0%"}
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.animateFadeInUp} ${styles.animateDelay4}`}>
          <div className={styles.statLabel}>Avg. Change</div>
          <div className={styles.statValue}>{formatChange(avgChange)}</div>
          <div className={`${styles.statChange} ${avgChange >= 0 ? styles.statChangeBullish : styles.statChangeBearish}`}>
            {avgChange >= 0 ? "Bullish" : "Bearish"}
          </div>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className={`${styles.tableContainer} ${styles.animateFadeInUp} ${styles.animateDelay5}`}>
        {watchlist.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Icons.Bookmark />
            </div>
            <h3 className={styles.emptyTitle}>No stocks in watchlist</h3>
            <p className={styles.emptySubtitle}>
              Add stocks to your watchlist to track their performance and receive alerts.
            </p>
            <button className={styles.addStockButton}>
              <Icons.Plus />
              Add Your First Stock
            </button>
          </div>
        ) : (
          <>
            <div className={styles.tableHeader}>
              <span>#</span>
              <span>Symbol</span>
              <span>Company</span>
              <span style={{ textAlign: "right" }}>Price</span>
              <span style={{ textAlign: "center" }}>Change</span>
              <span style={{ textAlign: "center" }}>Trend</span>
              <span></span>
            </div>
            <div className={styles.tableBody}>
              {watchlist.map((symbol, index) => {
                const stock = STOCK_DATA[symbol] || {
                  name: symbol,
                  price: 0,
                  change: 0,
                  sector: "Unknown",
                };
                const isPositive = stock.change >= 0;

                return (
                  <div
                    key={symbol}
                    className={`${styles.tableRow} ${styles.animateSlideIn}`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                    onClick={() =>
                      onSelectStock({
                        symbol,
                        name: stock.name,
                        currentPrice: stock.price,
                        changePercent: stock.change,
                      })
                    }
                  >
                    {/* Rank */}
                    <div className={`${styles.rank} ${index < 3 ? styles.rankTop : ""}`}>
                      {index + 1}
                    </div>

                    {/* Symbol */}
                    <div className={styles.symbol}>
                      <div className={styles.symbolLogo}>
                        {symbol.slice(0, 2)}
                      </div>
                      <span className={styles.symbolText}>{symbol}</span>
                    </div>

                    {/* Company */}
                    <div className={styles.company}>{stock.name}</div>

                    {/* Price */}
                    <div className={styles.priceCell}>
                      <div className={styles.price}>${formatNumber(stock.price)}</div>
                      <div
                        className={`${styles.priceChange} ${
                          isPositive ? styles.priceChangeBullish : styles.priceChangeBearish
                        }`}
                      >
                        {isPositive ? "+" : ""}${Math.abs(stock.price * stock.change / 100).toFixed(2)}
                      </div>
                    </div>

                    {/* Change Badge */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div
                        className={`${styles.changeBadge} ${
                          isPositive ? styles.changeBadgeBullish : styles.changeBadgeBearish
                        }`}
                      >
                        <span className={styles.changeIcon}>
                          {isPositive ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                        </span>
                        {formatChange(stock.change)}
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className={styles.sparklineCell}>
                      <MiniSparkline positive={isPositive} />
                    </div>

                    {/* Actions */}
                    <div className={styles.actionsCell}>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock({
                            symbol,
                            name: stock.name,
                            currentPrice: stock.price,
                            changePercent: stock.change,
                          });
                        }}
                        title="View Details"
                      >
                        <Icons.Eye />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={(e) => handleRemove(symbol, e)}
                        title="Remove from Watchlist"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Mini Sparkline Component
const MiniSparkline: React.FC<{ positive: boolean }> = ({ positive }) => {
  // Generate random-ish but deterministic sparkline
  const points = positive
    ? "0,24 8,20 16,22 24,16 32,18 40,12 48,14 56,8 64,10 72,4 80,6"
    : "0,6 8,8 16,4 24,10 32,8 40,14 48,12 56,18 64,16 72,22 80,20";

  return (
    <svg viewBox="0 0 80 28" className={styles.sparkline}>
      <defs>
        <linearGradient id={`sparkGrad-${positive ? 'up' : 'down'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M${points} L80,28 L0,28 Z`}
        fill={`url(#sparkGrad-${positive ? 'up' : 'down'})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Watchlist;
