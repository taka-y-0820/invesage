import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { useStockStore } from "../../store/useStockStore";
import { useStockDataUpdater } from "../../hooks/useStockData";
import { SurgeStock } from "../../services/scanner/surgeScannerService";
import { NewsPanel } from "../NewsPanel";
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
  Volume: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />
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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const marketData = useStockStore((state) => state.marketData);
  const watchlist = useStockStore((state) => state.watchlist);
  const currentStock = useStockStore((state) => state.currentStock);
  const setActiveTab = useStockStore((state) => state.setActiveTab);

  const { refetch } = useStockDataUpdater("NVDA", false);

  // Initialize mini chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0a0f14" },
        textColor: "#64748b",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: "rgba(45, 212, 191, 0.3)", width: 1, style: 2 },
        horzLine: { color: "rgba(45, 212, 191, 0.3)", width: 1, style: 2 },
      },
    });

    chartRef.current = chart;

    const areaSeries = chart.addAreaSeries({
      lineColor: "#2dd4bf",
      topColor: "rgba(45, 212, 191, 0.3)",
      bottomColor: "rgba(45, 212, 191, 0.02)",
      lineWidth: 2,
    });

    seriesRef.current = areaSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (seriesRef.current && currentStock.data.length > 0) {
      const areaData = currentStock.data.map((d) => ({
        time: d.time as Time,
        value: d.close,
      }));
      seriesRef.current.setData(areaData);
    }
  }, [currentStock.data]);

  // Fetch initial data
  useEffect(() => {
    if (currentStock.data.length === 0) {
      refetch();
    }
  }, []);

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatPrice = (price: number, market: "JP" | "US" = "JP") => {
    if (market === "JP") {
      return `¥${price.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
    }
    return `$${formatNumber(price)}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${formatNumber(change)}%`;
  };

  // Mock data for metrics (in real app, derive from actual data)
  const metrics = {
    totalWatched: watchlist.length,
    surgeAlerts: surgeStocks.length,
    avgChange: surgeStocks.length > 0
      ? surgeStocks.reduce((acc, s) => acc + s.changePercent, 0) / surgeStocks.length
      : 0,
    marketStatus: new Date().getHours() >= 9 && new Date().getHours() < 16 ? "Open" : "Closed",
  };

  // Sample watchlist data (in real app, fetch actual prices)
  const watchlistData = watchlist.slice(0, 5).map((symbol, idx) => ({
    symbol,
    name: symbol === "NVDA" ? "NVIDIA Corp"
        : symbol === "MSFT" ? "Microsoft Corp"
        : symbol === "GOOGL" ? "Alphabet Inc"
        : symbol === "AAPL" ? "Apple Inc"
        : symbol === "TSLA" ? "Tesla Inc"
        : symbol,
    price: [142.58, 378.91, 176.23, 189.45, 248.50][idx] || 100,
    change: [2.34, -0.87, 1.56, -1.23, 4.21][idx] || 0,
  }));

  return (
    <div className={styles.dashboard}>
      {/* Market Pulse - Live Indices */}
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
          {Object.entries(marketData).map(([key, data]) => (
            <div
              key={key}
              className={`${styles.indexCard} ${
                data.trend === "up" ? styles.indexCardBullish : styles.indexCardBearish
              }`}
            >
              <div className={styles.indexName}>
                {key === "nikkei" ? "Nikkei 225" : key.toUpperCase()}
              </div>
              <div className={styles.indexValue}>
                {data.value > 0 ? formatNumber(data.value, 2) : "---"}
              </div>
              <div
                className={`${styles.indexChange} ${
                  data.trend === "up" ? styles.indexChangeBullish : styles.indexChangeBearish
                }`}
              >
                <span className={styles.changeArrow}>
                  {data.trend === "up" ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
                </span>
                {data.change}
              </div>
            </div>
          ))}
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
                          {formatPrice(stock.currentPrice, "JP")}
                        </div>
                        <div className={styles.surgePrevPrice}>
                          Prev: {formatPrice(stock.previousClose, "JP")}
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

        {/* Watchlist Quick View */}
        <div className={`${styles.gridThird} ${styles.animateFadeInUp} ${styles.animateDelay3}`}>
          <section className={styles.watchlistSection}>
            <div className={styles.watchlistHeader}>
              <h3 className={styles.watchlistTitle}>Watchlist</h3>
              <button
                className={styles.watchlistViewAll}
                onClick={() => setActiveTab("watchlist")}
              >
                View All
              </button>
            </div>
            <div className={styles.watchlistTable}>
              {watchlistData.map((item, idx) => (
                <div
                  key={item.symbol}
                  className={styles.watchlistRow}
                  onClick={() => onSelectStock({
                    symbol: item.symbol,
                    name: item.name,
                    currentPrice: item.price,
                    changePercent: item.change,
                  })}
                >
                  <span className={styles.watchlistSymbol}>{item.symbol}</span>
                  <span className={styles.watchlistName}>{item.name}</span>
                  <span className={styles.watchlistPrice}>
                    ${formatNumber(item.price)}
                  </span>
                  <span
                    className={`${styles.watchlistChange} ${
                      item.change >= 0
                        ? styles.watchlistChangeBullish
                        : styles.watchlistChangeBearish
                    }`}
                  >
                    {formatChange(item.change)}
                  </span>
                  <MiniSparkline positive={item.change >= 0} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Chart Section */}
        <div className={`${styles.gridTwoThirds} ${styles.animateFadeInUp} ${styles.animateDelay4}`}>
          <section className={styles.chartSection}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>
                NVDA Performance
              </h3>
              <div className={styles.chartControls}>
                {["1D", "1W", "1M", "3M", "1Y"].map((period) => (
                  <button
                    key={period}
                    className={`${styles.chartTimeBtn} ${
                      period === "1M" ? styles.chartTimeBtnActive : ""
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chartContainerRef} className={styles.chartContainer} />
          </section>
        </div>

        {/* Japanese Stock Search */}
        <div className={`${styles.gridThird} ${styles.animateFadeInUp} ${styles.animateDelay5}`}>
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

        {/* News Panel */}
        <div className={`${styles.gridFull} ${styles.animateFadeInUp} ${styles.animateDelay5}`}>
          <NewsPanel
            symbols={["AAPL", "NVDA", "MSFT", "GOOGL", "TSLA"]}
            maxItems={8}
            title="Market News"
            subtitle="Latest financial news and analysis"
            autoRefresh={true}
            refreshInterval={300000}
          />
        </div>
      </div>
    </div>
  );
};

// Mini Sparkline Component
const MiniSparkline: React.FC<{ positive: boolean }> = ({ positive }) => {
  const points = positive
    ? "0,20 5,18 10,15 15,17 20,12 25,14 30,8 35,10 40,5"
    : "0,5 5,8 10,6 15,10 20,12 25,9 30,15 35,14 40,20";

  return (
    <svg
      viewBox="0 0 40 25"
      className={styles.watchlistSparkline}
      style={{ width: 60, height: 24 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Dashboard;
