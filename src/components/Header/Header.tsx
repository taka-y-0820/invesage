import React, { useState, useEffect } from "react";
import { useStockStore } from "../../store/useStockStore";
import { useApiKeyStore } from "../../store/useApiKeyStore";
import { useMarketDataUpdater } from "../../hooks/useStockData";
import styles from "./Header.module.css";

interface HeaderProps {
  alertCount?: number;
  onAlertClick?: () => void;
  onApiKeyClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  alertCount = 0,
  onAlertClick,
  onApiKeyClick,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const marketData = useStockStore((state) => state.marketData);
  const isApiKeyConfigured = useApiKeyStore((state) => state.isConfigured);
  const { refetch: refetchMarketData, isLoading } = useMarketDataUpdater(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const marketLabels: Record<string, string> = {
    nikkei: "日経225",
  };

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.headerInner}>
          <h1 className={styles.logoTitle}>Invesage</h1>

          {/* Market Data */}
          <div className={styles.marketData}>
            <button
              onClick={() => refetchMarketData()}
              className={styles.refreshButton}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Refresh"}
            </button>

            {Object.entries(marketData).map(([key, data]) => (
              <div key={key} className={styles.marketCard}>
                <div className={styles.marketLabel}>
                  {marketLabels[key] || key.toUpperCase()}
                </div>
                <div className={styles.marketValue}>
                  <span className={styles.marketPrice}>
                    {data.value > 0 ? data.value.toLocaleString() : "--"}
                  </span>
                  <span
                    className={`${styles.marketChange} ${
                      data.trend === "up" ? styles.up : styles.down
                    }`}
                  >
                    {data.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {!isApiKeyConfigured && (
              <button
                className={styles.apiKeyButton}
                onClick={onApiKeyClick}
                aria-label="APIキー設定"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={styles.apiKeyIcon}
                >
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                APIキー
              </button>
            )}
            {alertCount > 0 && (
              <button
                className={styles.alertBadge}
                onClick={onAlertClick}
                aria-label={`${alertCount} alerts`}
              >
                Alert
                <span className={styles.alertCount}>{alertCount}</span>
              </button>
            )}
          </div>
        </div>

        <div className={styles.gradientLine} />
      </header>

      <div className={styles.headerSpacer} />
    </>
  );
};

export default Header;
