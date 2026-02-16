import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchSectorQuotes, StockQuote } from "../../services/stockApi";
import {
  TSE_SECTORS,
  TSE_STOCKS,
  SECTOR_MAP,
  searchStocks,
  getStocksBySector,
  TSEStock,
} from "../../data/tseSectors";
import styles from "./SectorHeatmap.module.css";

// Icons
const Icons = {
  Grid: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  RefreshCw: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

interface SectorData {
  sectorId: string;
  avgChange: number;
  stocks: Array<{
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
  }>;
}

interface SectorHeatmapProps {
  onSelectStock: (stock: { symbol: string; name: string; currentPrice?: number; changePercent?: number }) => void;
}

export const SectorHeatmap: React.FC<SectorHeatmapProps> = ({ onSelectStock }) => {
  const [sectorData, setSectorData] = useState<Map<string, SectorData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const stocksBySector = useMemo(() => getStocksBySector(), []);

  const loadSectorData = useCallback(async () => {
    setLoading(true);
    setLoadingProgress("銘柄データを取得中...");

    try {
      // 全セクターの代表銘柄を収集（重複排除）
      const allSymbols: string[] = [];
      const seen = new Set<string>();
      for (const stock of TSE_STOCKS) {
        if (!seen.has(stock.symbol)) {
          seen.add(stock.symbol);
          allSymbols.push(stock.symbol);
        }
      }

      setLoadingProgress(`${allSymbols.length} 銘柄の株価を取得中...`);

      // バッチ取得
      const quotes = await fetchSectorQuotes(allSymbols);

      // 株価データをマップ化
      const quoteMap = new Map<string, StockQuote>();
      for (const q of quotes) {
        quoteMap.set(q.symbol, q);
      }

      setLoadingProgress("セクター別に集計中...");

      // セクター別に集計
      const newSectorData = new Map<string, SectorData>();

      for (const [sectorId, stocks] of stocksBySector) {
        const stocksWithData: SectorData["stocks"] = [];
        let totalChange = 0;
        let count = 0;

        for (const stock of stocks) {
          const quote = quoteMap.get(stock.symbol);
          if (quote) {
            stocksWithData.push({
              symbol: stock.symbol,
              name: stock.name,
              price: quote.price,
              changePercent: quote.change_percent,
            });
            totalChange += quote.change_percent;
            count++;
          }
        }

        // 変動率でソート（降順）
        stocksWithData.sort((a, b) => b.changePercent - a.changePercent);

        newSectorData.set(sectorId, {
          sectorId,
          avgChange: count > 0 ? totalChange / count : 0,
          stocks: stocksWithData,
        });
      }

      setSectorData(newSectorData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to load sector data:", error);
    } finally {
      setLoading(false);
      setLoadingProgress("");
    }
  }, [stocksBySector]);

  useEffect(() => {
    loadSectorData();
  }, [loadSectorData]);

  // 検索結果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchStocks(searchQuery).slice(0, 10);
  }, [searchQuery]);

  // サマリー統計
  const summary = useMemo(() => {
    let bullish = 0;
    let bearish = 0;
    let totalChange = 0;
    let count = 0;

    for (const [, data] of sectorData) {
      if (data.avgChange > 0) bullish++;
      else if (data.avgChange < 0) bearish++;
      totalChange += data.avgChange;
      count++;
    }

    return {
      bullish,
      bearish,
      avgChange: count > 0 ? totalChange / count : 0,
    };
  }, [sectorData]);

  // セクター変動率からCSSクラスを判定
  const getSectorClass = (change: number) => {
    if (change >= 2) return styles.sectorTileBullishStrong;
    if (change > 0) return styles.sectorTileBullish;
    if (change <= -2) return styles.sectorTileBearishStrong;
    if (change < 0) return styles.sectorTileBearish;
    return styles.sectorTileNeutral;
  };

  const getChangeClass = (change: number) => {
    if (change > 0) return styles.sectorChangeBullish;
    if (change < 0) return styles.sectorChangeBearish;
    return styles.sectorChangeNeutral;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
  };

  const handleStockClick = (stock: { symbol: string; name: string; price?: number; changePercent?: number }) => {
    onSelectStock({
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: stock.price,
      changePercent: stock.changePercent,
    });
  };

  const handleSearchResultClick = (stock: TSEStock) => {
    setSearchQuery("");
    // 株価は検索結果からは不明なので、シンボルと名前だけで選択
    onSelectStock({
      symbol: stock.symbol,
      name: stock.name,
    });
  };

  // セクターをソート（変動率の絶対値が大きい順）
  const sortedSectors = useMemo(() => {
    return TSE_SECTORS
      .map(sector => ({
        sector,
        data: sectorData.get(sector.id),
      }))
      .sort((a, b) => {
        const changeA = a.data?.avgChange ?? 0;
        const changeB = b.data?.avgChange ?? 0;
        return Math.abs(changeB) - Math.abs(changeA);
      });
  }, [sectorData]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Icons.Grid />
          </div>
          <div>
            <h2 className={styles.title}>Sector Heatmap</h2>
            <div className={styles.subtitle}>
              東証33業種 セクター別パフォーマンス
              {lastUpdate && ` — ${lastUpdate.toLocaleTimeString("ja-JP")} 更新`}
            </div>
          </div>
        </div>
        <div className={styles.controls}>
          <button
            className={`${styles.refreshBtn} ${loading ? styles.refreshBtnSpinning : ""}`}
            onClick={loadSectorData}
            disabled={loading}
          >
            <span className={styles.refreshBtnIcon}>
              <Icons.RefreshCw />
            </span>
            更新
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>
            <Icons.Search />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="全上場企業を検索（コード・企業名・英語名で検索）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            {searchResults.map((stock) => {
              const sector = SECTOR_MAP.get(stock.sectorId);
              return (
                <div
                  key={stock.symbol}
                  className={styles.searchResultItem}
                  onClick={() => handleSearchResultClick(stock)}
                >
                  <div className={styles.searchResultLeft}>
                    <span className={styles.searchResultCode}>{stock.code}</span>
                    <span className={styles.searchResultName}>{stock.name}</span>
                  </div>
                  <span className={styles.searchResultSector}>
                    {sector?.name ?? stock.sectorId}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>セクターデータを読み込み中...</div>
          {loadingProgress && (
            <div className={styles.loadingProgress}>{loadingProgress}</div>
          )}
        </div>
      )}

      {!loading && sectorData.size > 0 && (
        <>
          {/* Summary */}
          <div className={styles.summaryBar}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>上昇セクター</div>
              <div className={`${styles.summaryValue} ${styles.summaryValueBullish}`}>
                {summary.bullish}
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>下落セクター</div>
              <div className={`${styles.summaryValue} ${styles.summaryValueBearish}`}>
                {summary.bearish}
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>市場平均変動</div>
              <div className={`${styles.summaryValue} ${summary.avgChange >= 0 ? styles.summaryValueBullish : styles.summaryValueBearish}`}>
                {formatChange(summary.avgChange)}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendBullishStrong}`} />
              +2%以上
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendBullish}`} />
              上昇
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendNeutral}`} />
              横ばい
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendBearish}`} />
              下落
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendBearishStrong}`} />
              -2%以下
            </div>
          </div>

          {/* Expanded Sector Detail */}
          {expandedSector && (
            <div className={styles.sectorDetail}>
              <div className={styles.sectorDetailHeader}>
                <div className={styles.sectorDetailTitle}>
                  <span
                    className={`${styles.sectorDetailIndicator} ${
                      (sectorData.get(expandedSector)?.avgChange ?? 0) > 0
                        ? styles.indicatorBullish
                        : (sectorData.get(expandedSector)?.avgChange ?? 0) < 0
                        ? styles.indicatorBearish
                        : styles.indicatorNeutral
                    }`}
                  />
                  {SECTOR_MAP.get(expandedSector)?.name ?? expandedSector}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1rem" }}>
                    {formatChange(sectorData.get(expandedSector)?.avgChange ?? 0)}
                  </span>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={() => setExpandedSector(null)}
                >
                  <Icons.X /> 閉じる
                </button>
              </div>
              <div className={styles.stockGrid}>
                {sectorData.get(expandedSector)?.stocks.map((stock) => (
                  <div
                    key={stock.symbol}
                    className={`${styles.stockCard} ${
                      stock.changePercent >= 0 ? styles.stockCardBullish : styles.stockCardBearish
                    }`}
                    onClick={() => handleStockClick(stock)}
                  >
                    <div className={styles.stockCardHeader}>
                      <span className={styles.stockSymbol}>{stock.symbol.replace(".T", "")}</span>
                      <span
                        className={`${styles.stockChange} ${
                          stock.changePercent >= 0 ? styles.stockChangeBullish : styles.stockChangeBearish
                        }`}
                      >
                        {formatChange(stock.changePercent)}
                      </span>
                    </div>
                    <div className={styles.stockName}>{stock.name}</div>
                    <div className={styles.stockPrice}>{formatPrice(stock.price)}</div>
                  </div>
                ))}
                {(sectorData.get(expandedSector)?.stocks.length ?? 0) === 0 && (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px", color: "#64748b" }}>
                    株価データの取得に失敗しました
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Heatmap Grid */}
          <div className={styles.heatmapGrid}>
            {sortedSectors.map(({ sector, data }) => {
              const change = data?.avgChange ?? 0;
              const stockCount = data?.stocks.length ?? 0;

              return (
                <div
                  key={sector.id}
                  className={`${styles.sectorTile} ${getSectorClass(change)}`}
                  onClick={() => setExpandedSector(expandedSector === sector.id ? null : sector.id)}
                >
                  <div>
                    <div className={styles.sectorName}>{sector.name}</div>
                    <div className={styles.sectorNameEn}>{sector.nameEn}</div>
                  </div>
                  <div className={styles.sectorStats}>
                    <span className={`${styles.sectorChange} ${getChangeClass(change)}`}>
                      {stockCount > 0 ? formatChange(change) : "---"}
                    </span>
                    <span className={styles.sectorStockCount}>
                      {stockCount} 銘柄
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SectorHeatmap;
