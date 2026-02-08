import React, { ReactNode } from "react";
import styles from "./Layout.module.css";
import { useStockStore } from "../../store/useStockStore";

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  isMonitoring?: boolean;
  error?: Error | null;
  apiKey?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = true,
  isMonitoring = false,
  error,
  apiKey,
}) => {
  const watchlist = useStockStore((state) => state.watchlist);

  return (
    <div className={styles.layout}>
      <div className={styles.mainContainer}>
        {showSidebar && (
          <aside className={styles.sidebar}>
            {/* Search */}
            <div className={styles.sidebarSection}>
              <div className={styles.searchBox}>
                <svg
                  className={styles.searchIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search stocks..."
                />
              </div>
            </div>

            {/* Watchlist */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Watchlist</h3>
              <div>
                {watchlist.map((symbol) => (
                  <div key={symbol} className={styles.watchlistItem}>
                    <span className={styles.watchlistSymbol}>{symbol}</span>
                    <span className={`${styles.watchlistChange} ${styles.positive}`}>
                      --
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        <main className={`${styles.mainContent} ${!showSidebar ? styles.fullWidth : ""}`}>
          {/* Status Bar */}
          {apiKey && (
            <div className={styles.statusBar}>
              <div
                className={`${styles.statusIndicator} ${
                  isMonitoring ? styles.active : styles.inactive
                }`}
              >
                <span
                  className={`${styles.statusDot} ${
                    isMonitoring ? styles.active : styles.inactive
                  }`}
                />
                {isMonitoring ? "Monitoring" : "Stopped"}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className={styles.errorBanner}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>Error: {error.message}</span>
            </div>
          )}

          {/* API Key Warning */}
          {!apiKey && (
            <div className={styles.apiWarning}>
              <h3>Finnhub API Key Required</h3>
              <p>
                Add <code>VITE_FINNHUB_API_KEY=your_api_key</code> to your .env file
              </p>
              <p>
                <a
                  href="https://finnhub.io/register"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get a free API key from Finnhub
                </a>
              </p>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
