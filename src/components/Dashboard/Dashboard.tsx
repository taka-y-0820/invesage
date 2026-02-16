import React from "react";
import { useStockStore } from "../../store/useStockStore";
import { SurgeStock } from "../../services/scanner/surgeScannerService";
import { JapaneseStockSearch } from "../JapaneseStockSearch";
import styles from "./Dashboard.module.css";

// Icons as inline SVGs for performance
const Icons = {
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
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
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

interface DashboardProps {
  surgeStocks: SurgeStock[];
  isMonitoring: boolean;
  onSelectStock: (stock: { symbol: string; name: string; currentPrice?: number; changePercent?: number }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  surgeStocks,
  isMonitoring,
  onSelectStock,
}) => {
  const marketData = useStockStore((state) => state.marketData);
  const watchlist = useStockStore((state) => state.watchlist);

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${formatNumber(change)}%`;
  };

  const metrics = {
    totalWatched: watchlist.length,
    surgeAlerts: surgeStocks.length,
    avgChange: surgeStocks.length > 0
      ? surgeStocks.reduce((acc, s) => acc + s.changePercent, 0) / surgeStocks.length
      : 0,
    marketStatus: new Date().getHours() >= 9 && new Date().getHours() < 15 ? "Open" : "Closed",
  };

  return (
    <div className={styles.dashboard}>
      {/* Market Pulse - Nikkei 225 */}
      <section className={`${styles.marketPulse} ${styles.animateFadeInUp}`}>
        <div className={styles.marketPulseHeader}>
          <h2 className={styles.marketPulseTitle}>
            <span className={styles.marketPulseIcon}><Icons.Globe /></span>
            Market Pulse
          </h2>
          {isMonitoring && (
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              Live
            </div>
          )}
        </div>
        <div className={styles.marketIndices}>
          <div
            className={`${styles.indexCard} ${
              marketData.nikkei.trend === "up" ? styles.indexCardBullish : styles.indexCardBearish
            }`}
          >
            <div className={styles.indexName}>Nikkei 225</div>
            <div className={styles.indexValue}>
              {marketData.nikkei.value > 0 ? formatNumber(marketData.nikkei.value, 2) : "---"}
            </div>
            <div
              className={`${styles.indexChange} ${
                marketData.nikkei.trend === "up" ? styles.indexChangeBullish : styles.indexChangeBearish
              }`}
            >
              <span className={styles.changeArrow}>
                {marketData.nikkei.trend === "up" ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
              </span>
              {marketData.nikkei.change}
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <div className={styles.metricsRow}>
        <div className={`${styles.metricCard} ${styles.metricCardTeal} ${styles.animateFadeInUp} ${styles.animateDelay1}`}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIcon}>
              <Icons.Eye />
            </div>
          </div>
          <div className={styles.metricLabel}>Watching</div>
          <div className={styles.metricValue}>{metrics.totalWatched}</div>
          <div className={styles.metricSubtext}>Stocks in watchlist</div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricCardGold} ${styles.animateFadeInUp} ${styles.animateDelay2}`}>
          <div className={styles.metricHeader}>
            <div className={`${styles.metricIcon} ${styles.metricIconGold}`}>
              <Icons.Zap />
            </div>
            {metrics.surgeAlerts > 0 && (
              <span className={styles.metricBadge}>Active</span>
            )}
          </div>
          <div className={styles.metricLabel}>Surge Alerts</div>
          <div className={styles.metricValue}>{metrics.surgeAlerts}</div>
          <div className={styles.metricSubtext}>Detected today</div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricCardBullish} ${styles.animateFadeInUp} ${styles.animateDelay3}`}>
          <div className={styles.metricHeader}>
            <div className={`${styles.metricIcon} ${styles.metricIconBullish}`}>
              <Icons.TrendingUp />
            </div>
            {metrics.avgChange !== 0 && (
              <span className={`${styles.metricBadge} ${metrics.avgChange < 0 ? styles.metricBadgeBearish : ""}`}>
                {metrics.avgChange >= 0 ? "Bullish" : "Bearish"}
              </span>
            )}
          </div>
          <div className={styles.metricLabel}>Avg. Surge</div>
          <div className={styles.metricValue}>
            {metrics.avgChange !== 0 ? formatChange(metrics.avgChange) : "---"}
          </div>
          <div className={styles.metricSubtext}>Movement detected</div>
        </div>

        <div className={`${styles.metricCard} ${styles.metricCardTeal} ${styles.animateFadeInUp} ${styles.animateDelay4}`}>
          <div className={styles.metricHeader}>
            <div className={styles.metricIcon}>
              <Icons.Activity />
            </div>
          </div>
          <div className={styles.metricLabel}>Market</div>
          <div className={`${styles.metricValue} ${styles.metricValueSmall}`}>
            {metrics.marketStatus}
          </div>
          <div className={styles.metricSubtext}>
            {metrics.marketStatus === "Open" ? "Trading active" : "After hours"}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.grid}>
        {/* Surge Stocks Section */}
        <div className={`${styles.gridTwoThirds} ${styles.animateFadeInUp} ${styles.animateDelay2}`}>
          <section className={styles.surgeSection}>
            <div className={styles.surgeHeader}>
              <h3 className={styles.surgeTitle}>
                <span className={styles.surgeTitleIcon}>
                  <Icons.Zap />
                </span>
                Surge Detection
              </h3>
              {surgeStocks.length > 0 && (
                <span className={styles.surgeCount}>
                  {surgeStocks.length} Active
                </span>
              )}
            </div>

            {surgeStocks.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Icons.AlertTriangle />
                </div>
                <h4 className={styles.emptyTitle}>No Surge Activity</h4>
                <p className={styles.emptySubtitle}>
                  Monitoring for significant price movements...
                </p>
              </div>
            ) : (
              <div className={styles.surgeGrid}>
                {surgeStocks.slice(0, 6).map((stock, idx) => (
                  <div
                    key={stock.symbol}
                    className={`${styles.surgeCard} ${
                      stock.changePercent >= 0 ? styles.surgeCardBullish : styles.surgeCardBearish
                    } ${styles.animateSlideInRight}`}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    onClick={() => onSelectStock({
                      symbol: stock.symbol,
                      name: stock.name,
                      currentPrice: stock.currentPrice,
                      changePercent: stock.changePercent,
                    })}
                  >
                    <div className={styles.surgeCardHeader}>
                      <span className={styles.surgeSymbol}>{stock.symbol}</span>
                      <div className={styles.surgeChangeWrapper}>
                        <div
                          className={`${styles.surgeChange} ${
                            stock.changePercent >= 0
                              ? styles.surgeChangeBullish
                              : styles.surgeChangeBearish
                          }`}
                        >
                          {formatChange(stock.changePercent)}
                        </div>
                        <div className={styles.surgeChangeLabel}>Change</div>
                      </div>
                    </div>
                    <div className={styles.surgeName}>{stock.name}</div>
                    <div className={styles.surgePriceRow}>
                      <div>
                        <div className={styles.surgePrice}>
                          {formatPrice(stock.currentPrice)}
                        </div>
                        <div className={styles.surgePrevPrice}>
                          Prev: {formatPrice(stock.previousClose)}
                        </div>
                      </div>
                      {stock.volume && (
                        <div className={styles.surgeVolume}>
                          <span className={styles.surgeVolumeIcon}>
                            <Icons.BarChart />
                          </span>
                          {(stock.volume / 1000).toFixed(0)}K
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Japanese Stock Search */}
        <div className={`${styles.gridThird} ${styles.animateFadeInUp} ${styles.animateDelay3}`}>
          <JapaneseStockSearch
            onStockSelect={(stock) =>
              onSelectStock({
                symbol: stock.symbol,
                name: stock.name,
                currentPrice: stock.price,
                changePercent: stock.changePercent,
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
