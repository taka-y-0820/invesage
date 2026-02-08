import React, { useState, useEffect } from "react";
import icon from "../../assets/invesage-icon.png";
import { useStockStore } from "../../store/useStockStore";
import { useMarketDataUpdater } from "../../hooks/useStockData";
import styles from "./Header.module.css";

interface HeaderProps {
  alertCount?: number;
  onAlertClick?: () => void;
  onSettingsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  alertCount = 0,
  onAlertClick,
  onSettingsClick,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const marketData = useStockStore((state) => state.marketData);
  const { refetch: refetchMarketData, isLoading } = useMarketDataUpdater(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const marketLabels: Record<string, string> = {
    nikkei: "Nikkei 225",
    sp500: "S&P 500",
    nasdaq: "NASDAQ",
  };

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
        <div className={styles.headerInner}>
          {/* Logo Section */}
          <div className={styles.logoSection}>
            <img
              src={icon}
              alt="Invesage"
              className={styles.logoImage}
            />
            <div className={styles.logoText}>
              <h1 className={styles.logoTitle}>Invesage</h1>
              <p className={styles.logoSubtitle}>AI Investment Platform</p>
            </div>
          </div>

          {/* Market Data */}
          <div className={styles.marketData}>
            <button
              onClick={() => refetchMarketData()}
              className={styles.refreshButton}
              disabled={isLoading}
            >
              <span className={isLoading ? styles.spinning : ""}>
                {isLoading ? "..." : "Refresh"}
              </span>
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
            {alertCount > 0 && (
              <button
                className={styles.alertBadge}
                onClick={onAlertClick}
                aria-label={`${alertCount} alerts`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className={styles.alertCount}>{alertCount}</span>
              </button>
            )}

            <button
              className={styles.settingsButton}
              onClick={onSettingsClick}
              aria-label="Settings"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.gradientLine} />
      </header>

      <div className={styles.headerSpacer} />
    </>
  );
};

export default Header;
