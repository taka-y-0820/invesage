import React, { useState, useCallback } from "react";
import {
  CompanyIRInfo,
  IRRelease,
  EarningsData,
  IRCategory,
} from "../../types";
import {
  fetchCompanyIRInfo,
  getIRCategoryLabel,
  getIRCategoryColor,
} from "../../services/ir/irService";
import styles from "./IRPanel.module.css";

const QUICK_SYMBOLS = [
  { symbol: "7203.T", label: "トヨタ" },
  { symbol: "9984.T", label: "SBG" },
  { symbol: "6758.T", label: "ソニー" },
  { symbol: "AAPL", label: "Apple" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "NVDA", label: "NVIDIA" },
];

const ALL_CATEGORIES: IRCategory[] = [
  "earnings",
  "guidance",
  "dividend",
  "shareholder",
  "corporate",
  "disclosure",
  "presentation",
  "other",
];

export const IRPanel: React.FC = () => {
  const [symbol, setSymbol] = useState("");
  const [irInfo, setIrInfo] = useState<CompanyIRInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<IRCategory>>(
    new Set()
  );

  const handleFetch = useCallback(
    async (targetSymbol?: string) => {
      const sym = (targetSymbol || symbol).trim().toUpperCase();
      if (!sym) return;

      setLoading(true);
      setError(null);
      setSelectedCategories(new Set());

      try {
        const data = await fetchCompanyIRInfo(sym);
        setIrInfo(data);
        if (!targetSymbol) setSymbol(sym);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "IR情報の取得に失敗しました"
        );
        setIrInfo(null);
      } finally {
        setLoading(false);
      }
    },
    [symbol]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFetch();
  };

  const toggleCategory = (category: IRCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filteredReleases: IRRelease[] = irInfo
    ? selectedCategories.size === 0
      ? irInfo.irReleases
      : irInfo.irReleases.filter((r) => selectedCategories.has(r.category))
    : [];

  const formatAmount = (amount?: number): string => {
    if (amount === undefined || amount === null) return "--";
    if (Math.abs(amount) >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}兆`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}億`;
    }
    return `${amount.toFixed(0)}百万`;
  };

  const formatYoY = (yoy?: number): React.ReactNode => {
    if (yoy === undefined || yoy === null) return "--";
    const isPositive = yoy >= 0;
    return (
      <span className={isPositive ? styles.yoyPositive : styles.yoyNegative}>
        {isPositive ? "+" : ""}
        {yoy.toFixed(1)}%
      </span>
    );
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2 className={styles.headerTitle}>IR情報</h2>
            <p className={styles.headerSubtitle}>
              企業の投資家向け情報を一覧表示
            </p>
          </div>
        </div>
        {irInfo && (
          <span className={styles.lastUpdated}>
            更新: {formatDate(irInfo.lastUpdated)}
          </span>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchSection}>
        <input
          className={styles.searchInput}
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="銘柄コードを入力 (例: 7203.T, AAPL)"
        />
        <button
          className={styles.searchButton}
          onClick={() => handleFetch()}
          disabled={loading || !symbol.trim()}
        >
          {loading ? "取得中..." : "IR情報を取得"}
        </button>
      </div>

      {/* Quick Select */}
      <div className={styles.quickSelect}>
        {QUICK_SYMBOLS.map((item) => (
          <button
            key={item.symbol}
            className={styles.quickButton}
            onClick={() => {
              setSymbol(item.symbol);
              handleFetch(item.symbol);
            }}
          >
            {item.label} ({item.symbol})
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <span className={styles.loadingText}>IR情報を取得中...</span>
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* IR Content */}
      {irInfo && !loading && (
        <>
          {/* Next Earnings */}
          {irInfo.nextEarningsDate && (
            <div className={styles.nextEarningsBanner}>
              <div className={styles.nextEarningsIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className={styles.nextEarningsText}>
                <div className={styles.nextEarningsLabel}>次回決算発表日</div>
                <div className={styles.nextEarningsDate}>
                  {formatDate(irInfo.nextEarningsDate)}
                </div>
              </div>
            </div>
          )}

          {/* Earnings Section */}
          {irInfo.earnings.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <svg
                  className={styles.sectionIcon}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
                <h3 className={styles.sectionTitle}>決算情報</h3>
              </div>
              <div className={styles.sectionBody}>
                <EarningsTable
                  earnings={irInfo.earnings}
                  formatAmount={formatAmount}
                  formatYoY={formatYoY}
                />
              </div>
            </div>
          )}

          {/* Dividend Section */}
          {irInfo.dividend && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <svg
                  className={styles.sectionIcon}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
                <h3 className={styles.sectionTitle}>配当情報</h3>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.dividendGrid}>
                  {irInfo.dividend.annualDividend !== undefined && (
                    <div className={styles.dividendItem}>
                      <div className={styles.dividendLabel}>年間配当</div>
                      <div className={styles.dividendValue}>
                        ¥{irInfo.dividend.annualDividend.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {irInfo.dividend.dividendYield !== undefined && (
                    <div className={styles.dividendItem}>
                      <div className={styles.dividendLabel}>配当利回り</div>
                      <div className={styles.dividendValue}>
                        {irInfo.dividend.dividendYield.toFixed(2)}%
                      </div>
                    </div>
                  )}
                  {irInfo.dividend.payoutRatio !== undefined && (
                    <div className={styles.dividendItem}>
                      <div className={styles.dividendLabel}>配当性向</div>
                      <div className={styles.dividendValue}>
                        {irInfo.dividend.payoutRatio.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {irInfo.dividend.interimDividend !== undefined && (
                    <div className={styles.dividendItem}>
                      <div className={styles.dividendLabel}>中間配当</div>
                      <div className={styles.dividendValue}>
                        ¥{irInfo.dividend.interimDividend.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {irInfo.dividend.finalDividend !== undefined && (
                    <div className={styles.dividendItem}>
                      <div className={styles.dividendLabel}>期末配当</div>
                      <div className={styles.dividendValue}>
                        ¥{irInfo.dividend.finalDividend.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {irInfo.dividend.exDividendDate && (
                    <div className={styles.dividendItem}>
                      <div className={styles.dividendLabel}>権利落日</div>
                      <div className={styles.dividendValue}>
                        {formatDate(irInfo.dividend.exDividendDate)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* IR Releases Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <svg
                className={styles.sectionIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <h3 className={styles.sectionTitle}>
                IR開示情報 ({filteredReleases.length})
              </h3>
            </div>

            {/* Category Filter */}
            <div className={styles.categoryFilter}>
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.categoryChip} ${
                    selectedCategories.has(cat) ? styles.categoryChipActive : ""
                  }`}
                  onClick={() => toggleCategory(cat)}
                >
                  {getIRCategoryLabel(cat)}
                </button>
              ))}
            </div>

            <div className={styles.sectionBody}>
              {filteredReleases.length > 0 ? (
                <div className={styles.releaseList}>
                  {filteredReleases.map((release) => (
                    <IRReleaseItem
                      key={release.id}
                      release={release}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className={styles.emptyText}>
                    {selectedCategories.size > 0
                      ? "選択したカテゴリのIR情報はありません"
                      : "IR開示情報はありません"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* IR Page Link */}
          {irInfo.irPageUrl && (
            <a
              className={styles.irLink}
              href={irInfo.irPageUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              企業IRページを開く
            </a>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!irInfo && !loading && !error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className={styles.emptyText}>
            銘柄コードを入力してIR情報を取得してください
          </p>
        </div>
      )}
    </div>
  );
};

/** 決算テーブルコンポーネント */
const EarningsTable: React.FC<{
  earnings: EarningsData[];
  formatAmount: (amount?: number) => string;
  formatYoY: (yoy?: number) => React.ReactNode;
}> = ({ earnings, formatAmount, formatYoY }) => {
  return (
    <table className={styles.earningsTable}>
      <thead>
        <tr>
          <th>期間</th>
          <th>売上高</th>
          <th>営業利益</th>
          <th>純利益</th>
          <th>EPS</th>
        </tr>
      </thead>
      <tbody>
        {earnings.map((e) => (
          <tr key={e.period}>
            <td>
              {e.periodLabel || e.period}
              {e.isEstimate && (
                <span className={styles.estimateBadge}>予想</span>
              )}
            </td>
            <td>
              {formatAmount(e.revenue)}
              {e.revenueYoY !== undefined && (
                <div style={{ fontSize: "var(--text-xs)" }}>
                  {formatYoY(e.revenueYoY)}
                </div>
              )}
            </td>
            <td>
              {formatAmount(e.operatingIncome)}
              {e.operatingIncomeYoY !== undefined && (
                <div style={{ fontSize: "var(--text-xs)" }}>
                  {formatYoY(e.operatingIncomeYoY)}
                </div>
              )}
            </td>
            <td>
              {formatAmount(e.netIncome)}
              {e.netIncomeYoY !== undefined && (
                <div style={{ fontSize: "var(--text-xs)" }}>
                  {formatYoY(e.netIncomeYoY)}
                </div>
              )}
            </td>
            <td>
              {e.eps !== undefined ? `¥${e.eps.toLocaleString()}` : "--"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** IR開示項目コンポーネント */
const IRReleaseItem: React.FC<{
  release: IRRelease;
  formatDate: (dateStr: string) => string;
}> = ({ release, formatDate }) => {
  return (
    <div className={styles.releaseItem}>
      <span
        className={styles.releaseCategoryBadge}
        style={{ backgroundColor: getIRCategoryColor(release.category) }}
      >
        {getIRCategoryLabel(release.category)}
      </span>
      <div className={styles.releaseContent}>
        <p className={styles.releaseTitle}>
          {release.url ? (
            <a href={release.url} target="_blank" rel="noopener noreferrer">
              {release.title}
            </a>
          ) : (
            release.title
          )}
        </p>
        <div className={styles.releaseMeta}>
          <span>{formatDate(release.publishedAt)}</span>
          <span>|</span>
          <span>{release.source}</span>
        </div>
        {release.summary && (
          <p className={styles.releaseSummary}>{release.summary}</p>
        )}
      </div>
    </div>
  );
};

export default IRPanel;
