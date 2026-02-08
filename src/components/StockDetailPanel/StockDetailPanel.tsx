import React, { useEffect, useState } from "react";
import { useStockStore } from "../../store/useStockStore";
import styles from "./StockDetailPanel.module.css";

interface StockDetailPanelProps {
  onClose?: () => void;
}

export const StockDetailPanel: React.FC<StockDetailPanelProps> = ({ onClose }) => {
  const selectedStock = useStockStore((state) => state.selectedStock);
  const isOpen = useStockStore((state) => state.isDetailPanelOpen);
  const closeDetailPanel = useStockStore((state) => state.closeDetailPanel);
  const addToWatchlist = useStockStore((state) => state.addToWatchlist);
  const watchlist = useStockStore((state) => state.watchlist);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      closeDetailPanel();
      onClose?.();
    }, 200);
  };

  const handleAddToWatchlist = () => {
    if (selectedStock) {
      addToWatchlist(selectedStock.symbol);
    }
  };

  if (!isOpen || !selectedStock) return null;

  const isInWatchlist = watchlist.includes(selectedStock.symbol);
  const isPositive = (selectedStock.changePercent ?? 0) >= 0;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={handleClose} />

      {/* Panel */}
      <div className={`${styles.panel} ${closing ? styles.closing : ""}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.symbolBadge}>{selectedStock.symbol}</div>
            <h2 className={styles.companyName}>
              {selectedStock.name || selectedStock.symbol}
            </h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close panel"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Price Section */}
          <div className={styles.priceSection}>
            <div className={styles.currentPrice}>
              {selectedStock.price
                ? `¥${selectedStock.price.toLocaleString()}`
                : "--"}
            </div>
            {selectedStock.changePercent !== undefined && (
              <div
                className={`${styles.priceChange} ${
                  isPositive ? styles.positive : styles.negative
                }`}
              >
                <span className={styles.changeArrow}>
                  {isPositive ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4l-8 8h6v8h4v-8h6z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 20l8-8h-6V4h-4v8H4z" />
                    </svg>
                  )}
                </span>
                <span>
                  {isPositive ? "+" : ""}
                  {selectedStock.changePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className={styles.quickStats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Open</div>
              <div className={styles.statValue}>--</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>High</div>
              <div className={styles.statValue}>--</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Low</div>
              <div className={styles.statValue}>--</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Volume</div>
              <div className={styles.statValue}>--</div>
            </div>
          </div>

          {/* AI Analysis Summary */}
          <div className={styles.analysisSection}>
            <div className={styles.sectionHeader}>
              <svg
                className={styles.sectionIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                <path d="M20 12a8 8 0 0 0-8-8v8h8z" />
              </svg>
              <h3 className={styles.sectionTitle}>AI Analysis</h3>
            </div>
            <div className={styles.analysisSummary}>
              <div className={styles.analysisRecommendation}>
                <span className={`${styles.recommendationBadge} ${styles.hold}`}>
                  ANALYZING
                </span>
                <span className={styles.confidenceText}>--% confidence</span>
              </div>
              <p className={styles.analysisText}>
                Select "Full Analysis" below to get AI-powered insights on this stock,
                including technical indicators, sentiment analysis, and price predictions.
              </p>
            </div>
          </div>

          {/* Related News */}
          <div className={styles.newsSection}>
            <div className={styles.sectionHeader}>
              <svg
                className={styles.sectionIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1M19 20a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-5v13h5z" />
              </svg>
              <h3 className={styles.sectionTitle}>Related News</h3>
            </div>
            <div className={styles.newsList}>
              <div className={styles.newsItem}>
                <p className={styles.newsHeadline}>
                  Loading latest news for {selectedStock.symbol}...
                </p>
                <span className={styles.newsMeta}>
                  Fetching from news sources
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.secondaryAction}`}
            onClick={handleAddToWatchlist}
            disabled={isInWatchlist}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isInWatchlist ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
          </button>
          <button className={`${styles.actionButton} ${styles.primaryAction}`}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
            </svg>
            Full Analysis
          </button>
        </div>
      </div>
    </>
  );
};

export default StockDetailPanel;
