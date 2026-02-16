import React, { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  { symbol: "8035.T", label: "東エレク" },
  { symbol: "6501.T", label: "日立" },
  { symbol: "9432.T", label: "NTT" },
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState("");

  const handleFetch = useCallback(
    async (targetSymbol?: string) => {
      const sym = (targetSymbol || symbol).trim().toUpperCase();
      if (!sym) return;

      setLoading(true);
      setError(null);
      setSelectedCategories(new Set());
      setLoadingProgress("TDnet / Finnhub APIに接続中...");

      try {
        const progressTimer = setInterval(() => {
          setLoadingProgress((prev) => {
            if (prev.includes("接続中")) return "IR開示情報を取得中...";
            if (prev.includes("IR開示情報")) return "決算・配当データを解析中...";
            if (prev.includes("解析中")) return "データを整理中...";
            return prev;
          });
        }, 2000);

        const data = await fetchCompanyIRInfo(sym);
        clearInterval(progressTimer);
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
        setLoadingProgress("");
      }
    },
    [symbol]
  );

  const handleOpenPdf = useCallback((url: string) => {
    setPdfUrl(url);
  }, []);

  const handleClosePdf = useCallback(() => {
    setPdfUrl(null);
  }, []);

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
          placeholder="銘柄コードを入力 (例: 7203.T)"
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
        <div className={styles.loadingContainer}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>{loadingProgress || "IR情報を取得中..."}</span>
          </div>
          {/* Skeleton UI */}
          <div className={styles.skeleton}>
            <div className={styles.skeletonBanner}>
              <div className={styles.skeletonPulse} style={{ width: "120px", height: "16px" }} />
              <div className={styles.skeletonPulse} style={{ width: "180px", height: "24px", marginTop: "8px" }} />
            </div>
            <div className={styles.skeletonSection}>
              <div className={styles.skeletonPulse} style={{ width: "100px", height: "18px", marginBottom: "12px" }} />
              <div className={styles.skeletonTable}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeletonRow}>
                    <div className={styles.skeletonPulse} style={{ width: "80px", height: "14px" }} />
                    <div className={styles.skeletonPulse} style={{ width: "60px", height: "14px" }} />
                    <div className={styles.skeletonPulse} style={{ width: "60px", height: "14px" }} />
                    <div className={styles.skeletonPulse} style={{ width: "60px", height: "14px" }} />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.skeletonSection}>
              <div className={styles.skeletonPulse} style={{ width: "120px", height: "18px", marginBottom: "12px" }} />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.skeletonItem}>
                  <div className={styles.skeletonPulse} style={{ width: "60px", height: "22px", borderRadius: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <div className={styles.skeletonPulse} style={{ width: "90%", height: "14px" }} />
                    <div className={styles.skeletonPulse} style={{ width: "40%", height: "12px", marginTop: "6px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                      onOpenPdf={handleOpenPdf}
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

      {/* PDF Viewer Modal */}
      {pdfUrl && (
        <PdfViewer url={pdfUrl} onClose={handleClosePdf} />
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

/** URLがPDFかどうかを判定 */
function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$|#)/i.test(url);
}

/** IR開示項目コンポーネント */
const IRReleaseItem: React.FC<{
  release: IRRelease;
  formatDate: (dateStr: string) => string;
  onOpenPdf: (url: string) => void;
}> = ({ release, formatDate, onOpenPdf }) => {
  const hasPdf = release.url ? isPdfUrl(release.url) : false;

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
          {hasPdf && (
            <>
              <span>|</span>
              <button
                className={styles.pdfButton}
                onClick={() => onOpenPdf(release.url!)}
                title="PDFをアプリ内で表示"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                PDF表示
              </button>
            </>
          )}
        </div>
        {release.summary && (
          <p className={styles.releaseSummary}>{release.summary}</p>
        )}
      </div>
    </div>
  );
};

/** PDFビューアーコンポーネント（Tauriプロキシ経由でPDFを取得 - リトライ付き） */
const PdfViewer: React.FC<{
  url: string;
  onClose: () => void;
}> = ({ url, onClose }) => {
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Tauriプロキシ経由でPDFを取得（retryCountが変化すると再取得）
  useEffect(() => {
    let cancelled = false;

    const fetchPdf = async () => {
      setPdfLoading(true);
      setPdfError(null);
      setBlobUrl(null);

      try {
        const base64Data = await invoke<string>("proxy_fetch_pdf", { url });

        if (cancelled) return;

        // Base64をバイナリに変換してBlob URLを生成
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setPdfLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("PDF proxy fetch failed:", err);
        setPdfError(
          err instanceof Error ? err.message : "PDFの取得に失敗しました"
        );
        setPdfLoading(false);
      }
    };

    fetchPdf();

    return () => {
      cancelled = true;
      // Blob URLをクリーンアップ
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [url, retryCount]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      className={styles.pdfOverlay}
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className={styles.pdfModal}>
        <div className={styles.pdfHeader}>
          <div className={styles.pdfHeaderLeft}>
            <svg
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
            <span className={styles.pdfHeaderTitle}>PDF表示</span>
          </div>
          <div className={styles.pdfHeaderActions}>
            <a
              className={styles.pdfExternalLink}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="外部ブラウザで開く"
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
            </a>
            <button
              className={styles.pdfCloseButton}
              onClick={onClose}
              title="閉じる (Esc)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.pdfBody}>
          {pdfLoading && (
            <div className={styles.pdfLoading}>
              <div className={styles.loadingSpinner} />
              <span className={styles.loadingText}>PDFをダウンロード中...</span>
            </div>
          )}
          {pdfError ? (
            <div className={styles.pdfErrorState}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p>PDFの読み込みに失敗しました</p>
              <p className={styles.pdfErrorDetail}>{pdfError}</p>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  className={styles.pdfFallbackLink}
                  onClick={() => setRetryCount((c) => c + 1)}
                  style={{ cursor: "pointer", border: "1px solid currentColor", borderRadius: "6px", padding: "6px 16px", background: "transparent" }}
                >
                  再試行する
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.pdfFallbackLink}
                >
                  外部ブラウザで開く
                </a>
              </div>
            </div>
          ) : blobUrl ? (
            <iframe
              className={styles.pdfFrame}
              src={blobUrl}
              title="PDF Viewer"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default IRPanel;
