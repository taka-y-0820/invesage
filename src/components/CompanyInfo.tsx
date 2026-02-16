import { useState } from "react";
import { useStockStore } from "../store/useStockStore";
import {
  fetchJapaneseStockProfileHybrid,
  fetchJapaneseStockSentimentHybrid,
  fetchJapaneseStockComprehensive,
  fetchJapaneseStockPrice,
  fetchJapaneseStockChart,
  fetchCompanyNews,
  calculateAttentionLevel,
} from "../services/stockApi";
import { NewsArticle } from "../types";
import styles from "./CompanyInfo.module.css";

export function CompanyInfo() {
  const [testSymbol, setTestSymbol] = useState("7203.T");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [comprehensiveData, setComprehensiveData] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [showComprehensive, setShowComprehensive] = useState(false);

  const {
    companyProfiles,
    newsSentiments,
    setCompanyProfile,
    setNewsSentiment,
  } = useStockStore();

  const handleFetchComprehensive = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJapaneseStockComprehensive(testSymbol);
      if (!data || typeof data !== "object") {
        throw new Error("無効なデータが返されました");
      }
      setComprehensiveData(data);
      setShowComprehensive(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`包括情報取得エラー: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPrice = async () => {
    setLoading(true);
    setError(null);
    setCurrentPrice(null);
    try {
      const priceData = await fetchJapaneseStockPrice(testSymbol);
      if (!priceData || typeof priceData !== "object") {
        throw new Error("無効な価格データが返されました");
      }
      setCurrentPrice(priceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`価格取得エラー: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchChart = async () => {
    setLoading(true);
    setError(null);
    setChartData(null);
    try {
      const chart = await fetchJapaneseStockChart(testSymbol);
      if (!chart || typeof chart !== "object") {
        throw new Error("無効なチャートデータが返されました");
      }
      setChartData(chart);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`チャートデータ取得エラー: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchJapaneseStockProfileHybrid(testSymbol);
      setCompanyProfile(testSymbol, profile);

      const sentiment = await fetchJapaneseStockSentimentHybrid(testSymbol);
      setNewsSentiment(testSymbol, sentiment);

      try {
        const newsData = await fetchCompanyNews(
          testSymbol.replace(".T", ""),
          "2024-01-01",
          new Date().toISOString().split("T")[0]
        );
        setNews(newsData.slice(0, 3));
      } catch {
        setNews([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = companyProfiles[testSymbol];
  const currentSentiment = newsSentiments[testSymbol];
  const quickSymbols = ["7203.T", "9984.T", "6758.T", "7974.T", "8035.T", "6501.T", "9432.T"];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <div>
          <h2 className={styles.title}>企業情報</h2>
        </div>
      </div>

      {/* Input Section */}
      <div className={styles.inputSection}>
        <div className={styles.inputRow}>
          <input
            type="text"
            value={testSymbol}
            onChange={(e) => setTestSymbol(e.target.value)}
            placeholder="銘柄シンボル (例: 7203.T)"
            className={styles.searchInput}
          />
          <button
            onClick={handleFetchInfo}
            disabled={loading}
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
          >
            {loading ? "取得中..." : "情報取得"}
          </button>
          <button
            onClick={handleFetchComprehensive}
            disabled={loading}
            className={`${styles.actionBtn} ${styles.actionBtnInfo}`}
          >
            包括情報
          </button>
          <button
            onClick={handleFetchPrice}
            disabled={loading}
            className={`${styles.actionBtn} ${styles.actionBtnCaution}`}
          >
            現在価格
          </button>
          <button
            onClick={handleFetchChart}
            disabled={loading}
            className={`${styles.actionBtn} ${styles.actionBtnAccent}`}
          >
            チャート
          </button>
        </div>

        {/* Quick Select */}
        <div className={styles.quickSelect}>
          <span className={styles.quickSelectLabel}>クイック選択:</span>
          {quickSymbols.map((symbol) => (
            <button
              key={symbol}
              onClick={() => setTestSymbol(symbol)}
              className={`${styles.quickSelectChip} ${testSymbol === symbol ? styles.quickSelectChipActive : ""}`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          <div className={styles.errorTitle}>エラー: {error}</div>
          <div className={styles.errorHelp}>
            {error.includes("日本株企業情報の取得に失敗（複合手法）") ? (
              <div>
                <p>解決策:</p>
                <ol>
                  <li>Pythonスクリプトが正常に動作するか確認してください</li>
                  <li>コマンドラインで `python scripts/scrape_japanese_stock.py profile 7203.T` を実行してテストしてください</li>
                  <li>スクリプトの依存関係（requests, beautifulsoup4）がインストールされているか確認してください</li>
                </ol>
              </div>
            ) : error.includes("Python") ? (
              <div>
                <p>Python環境を確認してください:</p>
                <ul>
                  <li>Pythonがインストールされ、PATHに含まれているか確認</li>
                  <li>必要なパッケージ: requests, beautifulsoup4, lxml</li>
                </ul>
              </div>
            ) : error.includes("403") || error.includes("access") ? (
              <div>
                <p>アクセス制限の可能性があります:</p>
                <ul>
                  <li>一時的にアクセスが制限されている可能性があります</li>
                  <li>しばらく時間をおいてから再試行してください</li>
                </ul>
              </div>
            ) : (
              <p>詳細なエラー情報については、開発者コンソールをご確認ください。</p>
            )}
          </div>
        </div>
      )}

      {/* Comprehensive Data */}
      {comprehensiveData && showComprehensive && (
        <>
          {comprehensiveData.profile && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>企業プロファイル</h3>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.dataGrid}>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>企業名</div>
                    <div className={styles.dataValue}>{comprehensiveData.profile.name}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>業種</div>
                    <div className={styles.dataValue}>{comprehensiveData.profile.industry}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>セクター</div>
                    <div className={styles.dataValue}>{comprehensiveData.profile.sector}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>時価総額</div>
                    <div className={styles.dataValue}>{comprehensiveData.profile.marketCapitalization}億円</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {comprehensiveData.currentPrice && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>株価情報</h3>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.dataGrid}>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>現在価格</div>
                    <div className={styles.dataValue}>¥{comprehensiveData.currentPrice.currentPrice || 0}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>変動</div>
                    <div className={styles.dataValue}>
                      ¥{comprehensiveData.currentPrice.priceChange || 0} ({(comprehensiveData.currentPrice.priceChangePercent || 0).toFixed(2)}%)
                    </div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>出来高</div>
                    <div className={styles.dataValue}>{(comprehensiveData.currentPrice.volume || 0).toLocaleString()}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>更新時刻</div>
                    <div className={styles.dataValue}>
                      {comprehensiveData.currentPrice.lastUpdated
                        ? new Date(comprehensiveData.currentPrice.lastUpdated).toLocaleString()
                        : "不明"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {comprehensiveData.description && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>企業概要</h3>
              </div>
              <div className={styles.sectionBody}>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-gray-700)", lineHeight: "var(--leading-relaxed)" }}>
                  {comprehensiveData.description}
                </p>
              </div>
            </div>
          )}

          {comprehensiveData.detailedFinancials && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>財務指標</h3>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.dataGrid}>
                  {Object.entries(comprehensiveData.detailedFinancials).map(
                    ([key, value]) => (
                      <div key={key} className={styles.dataItem}>
                        <div className={styles.dataLabel}>{key}</div>
                        <div className={styles.dataValue}>{String(value)}</div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {comprehensiveData.chartData && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>チャート情報</h3>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.dataGrid}>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>期間</div>
                    <div className={styles.dataValue}>{comprehensiveData.chartData.period}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>データポイント</div>
                    <div className={styles.dataValue}>{comprehensiveData.chartData.data?.length || 0}件</div>
                  </div>
                  {comprehensiveData.chartData.data && comprehensiveData.chartData.data.length > 0 && (
                    <>
                      <div className={styles.dataItem}>
                        <div className={styles.dataLabel}>最新価格</div>
                        <div className={styles.dataValue}>
                          ¥{comprehensiveData.chartData.data[comprehensiveData.chartData.data.length - 1].close}
                        </div>
                      </div>
                      <div className={styles.dataItem}>
                        <div className={styles.dataLabel}>最高値</div>
                        <div className={styles.dataValue}>
                          ¥{Math.max(...comprehensiveData.chartData.data.map((d: any) => d.high))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {comprehensiveData.recentNews && comprehensiveData.recentNews.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>最新ニュース</h3>
              </div>
              <div className={styles.sectionBody}>
                {comprehensiveData.recentNews.map((newsItem: any, index: number) => (
                  <div key={index} className={styles.newsItem}>
                    <p className={styles.newsHeadline}>{newsItem.headline}</p>
                    <div className={styles.newsMeta}>
                      <span>{newsItem.source}</span>
                      <span>{newsItem.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Individual Price Display */}
      {currentPrice && !showComprehensive && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>現在の株価</h3>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>現在価格</div>
                <div className={styles.dataValue}>¥{currentPrice.currentPrice || 0}</div>
              </div>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>変動</div>
                <div className={styles.dataValue}>
                  ¥{currentPrice.priceChange || 0} ({(currentPrice.priceChangePercent || 0).toFixed(2)}%)
                </div>
              </div>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>出来高</div>
                <div className={styles.dataValue}>{(currentPrice.volume || 0).toLocaleString()}</div>
              </div>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>更新時刻</div>
                <div className={styles.dataValue}>
                  {currentPrice.lastUpdated
                    ? new Date(currentPrice.lastUpdated).toLocaleString()
                    : "不明"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Chart Display */}
      {chartData && !showComprehensive && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>チャートデータ</h3>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>銘柄</div>
                <div className={styles.dataValue}>{chartData.symbol}</div>
              </div>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>期間</div>
                <div className={styles.dataValue}>{chartData.period}</div>
              </div>
              <div className={styles.dataItem}>
                <div className={styles.dataLabel}>データポイント</div>
                <div className={styles.dataValue}>{chartData.data?.length || 0}件</div>
              </div>
              {chartData.data && chartData.data.length > 0 && (
                <>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>最新価格</div>
                    <div className={styles.dataValue}>¥{chartData.data[chartData.data.length - 1]?.close || 0}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>最高値</div>
                    <div className={styles.dataValue}>¥{Math.max(...chartData.data.map((d: any) => Number(d.high) || 0))}</div>
                  </div>
                  <div className={styles.dataItem}>
                    <div className={styles.dataLabel}>最安値</div>
                    <div className={styles.dataValue}>¥{Math.min(...chartData.data.map((d: any) => Number(d.low) || Infinity))}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Company Profile & Sentiment */}
      {(currentProfile || currentSentiment) && (
        <div className={styles.twoColumn}>
          {currentProfile && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>企業プロフィール</h3>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>企業名</span>
                  <span className={styles.infoValue}>{currentProfile.name}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>シンボル</span>
                  <span className={styles.infoValue}>{currentProfile.symbol}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>国</span>
                  <span className={styles.infoValue}>{currentProfile.country}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>取引所</span>
                  <span className={styles.infoValue}>{currentProfile.exchange}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>業種</span>
                  <span className={styles.infoValue}>{currentProfile.industry}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>セクター</span>
                  <span className={`${styles.infoValue} ${styles.infoValueAccent}`}>{currentProfile.sector}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>時価総額</span>
                  <span className={styles.infoValue}>
                    {currentProfile.marketCapitalization.toLocaleString()}M {currentProfile.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentSentiment && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>市場センチメント</h3>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>注目度レベル</span>
                  <span className={`${styles.attentionBadge} ${
                    calculateAttentionLevel(currentSentiment.buzzVolume) === "high"
                      ? styles.attentionHigh
                      : calculateAttentionLevel(currentSentiment.buzzVolume) === "medium"
                      ? styles.attentionMedium
                      : styles.attentionLow
                  }`}>
                    {calculateAttentionLevel(currentSentiment.buzzVolume) === "high"
                      ? "高"
                      : calculateAttentionLevel(currentSentiment.buzzVolume) === "medium"
                      ? "中"
                      : "低"}
                  </span>
                </div>

                <div style={{ marginTop: "var(--space-4)" }}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>話題度</span>
                    <span className={styles.infoValue}>
                      {currentSentiment.buzzVolume.toFixed(1)}
                      <span style={{ color: "var(--color-gray-400)", fontSize: "var(--text-xs)" }}>/100</span>
                    </span>
                  </div>
                  <div className={styles.sentimentBar}>
                    <div
                      className={styles.sentimentFill}
                      style={{ width: `${Math.min(currentSentiment.buzzVolume * 2, 100)}%` }}
                    />
                  </div>
                </div>

                {currentSentiment.companyNewsScore && (
                  <div className={styles.infoRow} style={{ marginTop: "var(--space-3)" }}>
                    <span className={styles.infoLabel}>ニューススコア</span>
                    <span className={styles.infoValue}>
                      {(currentSentiment.companyNewsScore * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* News */}
      {news.length > 0 && !showComprehensive && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>最新ニュース</h3>
          </div>
          <div className={styles.sectionBody}>
            {news.map((article, index) => (
              <div key={index} className={styles.newsItem}>
                <p className={styles.newsHeadline}>{article.headline}</p>
                <p className={styles.newsSummary}>{article.summary}</p>
                <div className={styles.newsMeta}>
                  <span>{article.source}</span>
                  <span>{new Date(article.datetime * 1000).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentProfile && !currentSentiment && !loading && !comprehensiveData && !currentPrice && !chartData && (
        <div className={styles.emptyState}>
          銘柄シンボルを入力して「情報取得」をクリックしてください
        </div>
      )}
    </div>
  );
}
