import React, { useState, useCallback } from "react";
import {
  fetchJapaneseStockComprehensive,
  fetchStockQuote,
} from "../../services/stockApi";
import styles from "./JapaneseStockSearch.module.css";

// Icons
const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

// Japanese stock data
const JAPANESE_STOCKS: Record<string, { name: string; nameJa: string; sector: string }> = {
  "7203.T": { name: "Toyota Motor", nameJa: "トヨタ自動車", sector: "Automotive" },
  "6758.T": { name: "Sony Group", nameJa: "ソニーグループ", sector: "Technology" },
  "9984.T": { name: "SoftBank Group", nameJa: "ソフトバンクグループ", sector: "Technology" },
  "7974.T": { name: "Nintendo", nameJa: "任天堂", sector: "Entertainment" },
  "6861.T": { name: "Keyence", nameJa: "キーエンス", sector: "Technology" },
  "9432.T": { name: "NTT", nameJa: "日本電信電話", sector: "Telecommunications" },
  "8306.T": { name: "MUFG", nameJa: "三菱UFJフィナンシャル", sector: "Finance" },
  "6501.T": { name: "Hitachi", nameJa: "日立製作所", sector: "Technology" },
  "9433.T": { name: "KDDI", nameJa: "KDDI", sector: "Telecommunications" },
  "8035.T": { name: "Tokyo Electron", nameJa: "東京エレクトロン", sector: "Semiconductors" },
  "4063.T": { name: "Shin-Etsu Chemical", nameJa: "信越化学工業", sector: "Chemicals" },
  "6594.T": { name: "Nidec", nameJa: "日本電産", sector: "Technology" },
  "4502.T": { name: "Takeda", nameJa: "武田薬品工業", sector: "Healthcare" },
  "6902.T": { name: "Denso", nameJa: "デンソー", sector: "Automotive" },
  "7741.T": { name: "HOYA", nameJa: "HOYA", sector: "Healthcare" },
  "6367.T": { name: "Daikin Industries", nameJa: "ダイキン工業", sector: "Industrial" },
  "7267.T": { name: "Honda Motor", nameJa: "本田技研工業", sector: "Automotive" },
  "8058.T": { name: "Mitsubishi Corp", nameJa: "三菱商事", sector: "Trading" },
  "6098.T": { name: "Recruit Holdings", nameJa: "リクルートホールディングス", sector: "Services" },
  "4568.T": { name: "Daiichi Sankyo", nameJa: "第一三共", sector: "Healthcare" },
};

interface StockData {
  symbol: string;
  name: string;
  nameJa: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
  marketCap?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

interface JapaneseStockSearchProps {
  onStockSelect?: (stock: StockData) => void;
}

export const JapaneseStockSearch: React.FC<JapaneseStockSearchProps> = ({
  onStockSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStockData = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try to get comprehensive data first
      let stockInfo = JAPANESE_STOCKS[symbol];
      if (!stockInfo) {
        stockInfo = { name: symbol, nameJa: symbol, sector: "Unknown" };
      }

      // Fetch quote data via Yahoo Finance (works for Japanese stocks)
      const quote = await fetchStockQuote(symbol);

      const stockData: StockData = {
        symbol,
        name: stockInfo.name,
        nameJa: stockInfo.nameJa,
        price: quote.price,
        change: quote.change,
        changePercent: quote.change_percent,
        sector: stockInfo.sector,
        volume: quote.volume,
      };

      setSelectedStock(stockData);

      if (onStockSelect) {
        onStockSelect(stockData);
      }
    } catch (err) {
      console.error("Failed to fetch stock data:", err);
      setError("Failed to fetch stock data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onStockSelect]);

  const handleQuickSelect = (symbol: string) => {
    setSearchQuery(symbol);
    fetchStockData(symbol);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      let symbol = searchQuery.trim().toUpperCase();
      // Add .T suffix if not present for Japanese stocks
      if (/^\d{4}$/.test(symbol)) {
        symbol = `${symbol}.T`;
      }
      fetchStockData(symbol);
    }
  };

  const filteredStocks = Object.entries(JAPANESE_STOCKS).filter(([symbol, info]) => {
    const query = searchQuery.toLowerCase();
    return (
      symbol.toLowerCase().includes(query) ||
      info.name.toLowerCase().includes(query) ||
      info.nameJa.includes(searchQuery)
    );
  });

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className={styles.searchContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Icons.Globe />
        </div>
        <h3 className={styles.title}>Japanese Stocks</h3>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch}>
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon}>
            <Icons.Search />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by code (e.g., 7203) or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Quick Select */}
      <div className={styles.quickSelect}>
        <span className={styles.quickSelectLabel}>Popular Stocks</span>
        <div className={styles.quickSelectGrid}>
          {["7203.T", "6758.T", "9984.T", "7974.T", "8035.T", "6501.T"].map((symbol) => {
            const info = JAPANESE_STOCKS[symbol];
            return (
              <button
                key={symbol}
                className={`${styles.stockChip} ${
                  selectedStock?.symbol === symbol ? styles.stockChipActive : ""
                }`}
                onClick={() => handleQuickSelect(symbol)}
              >
                <span className={styles.stockChipFlag}>🇯🇵</span>
                {symbol.replace(".T", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading stock data...
        </div>
      )}

      {/* Error State */}
      {error && <div className={styles.emptyState}>{error}</div>}

      {/* Selected Stock Detail */}
      {selectedStock && !loading && (
        <div className={styles.stockDetail}>
          <div className={styles.stockDetailHeader}>
            <div className={styles.stockDetailInfo}>
              <span className={styles.stockDetailFlag}>🇯🇵</span>
              <div>
                <div className={styles.stockDetailSymbol}>{selectedStock.symbol}</div>
                <div className={styles.stockDetailName}>
                  {selectedStock.nameJa} ({selectedStock.name})
                </div>
              </div>
            </div>
            <div className={styles.stockDetailPrice}>
              <div className={styles.stockDetailPriceValue}>
                {formatPrice(selectedStock.price)}
              </div>
              <div
                className={`${styles.stockDetailPriceChange} ${
                  selectedStock.changePercent >= 0
                    ? styles.stockDetailPriceChangeBullish
                    : styles.stockDetailPriceChangeBearish
                }`}
              >
                {formatChange(selectedStock.changePercent)}
              </div>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Sector</div>
              <div className={styles.metricValue}>{selectedStock.sector}</div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Volume</div>
              <div className={styles.metricValue}>
                {selectedStock.volume
                  ? selectedStock.volume.toLocaleString()
                  : "N/A"}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Change (¥)</div>
              <div className={styles.metricValue}>
                {selectedStock.change >= 0 ? "+" : ""}
                {formatPrice(Math.abs(selectedStock.change * selectedStock.price / 100))}
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricLabel}>Market</div>
              <div className={styles.metricValue}>Tokyo (TSE)</div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results (when typing) */}
      {searchQuery && !selectedStock && !loading && filteredStocks.length > 0 && (
        <div className={styles.results}>
          {filteredStocks.slice(0, 5).map(([symbol, info]) => (
            <div
              key={symbol}
              className={styles.resultItem}
              onClick={() => handleQuickSelect(symbol)}
            >
              <div className={styles.resultLeft}>
                <span className={styles.resultFlag}>🇯🇵</span>
                <span className={styles.resultSymbol}>{symbol}</span>
                <span className={styles.resultName}>{info.nameJa}</span>
              </div>
              <div className={styles.resultRight}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {info.sector}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JapaneseStockSearch;
