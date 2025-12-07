import { useState } from "react";
import { useStockStore } from "../store/useStockStore";
import {
  fetchCompanyProfile,
  fetchNewsSentiment,
  fetchJapaneseStockProfileHybrid,
  fetchJapaneseStockSentimentHybrid,
  fetchJapaneseStockComprehensive,
  fetchJapaneseStockPrice,
  fetchJapaneseStockChart,
  fetchCompanyNews,
  calculateAttentionLevel,
} from "../services/stockApi";
import { NewsArticle } from "../types";

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

  // 日本株かどうかを判定（.T, .OS などのサフィックス）
  const isJapaneseStock = (symbol: string) => {
    return symbol.match(/\.(T|OS|NK|SA)$/i) !== null;
  };

  // 包括的な日本株情報を取得
  const handleFetchComprehensive = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isJapaneseStock(testSymbol)) {
        throw new Error("包括的データ取得は日本株のみサポートしています");
      }

      console.log("🔄 Fetching comprehensive data...");
      const data = await fetchJapaneseStockComprehensive(testSymbol);

      if (!data || typeof data !== "object") {
        throw new Error("無効なデータが返されました");
      }

      setComprehensiveData(data);
      console.log("✅ Comprehensive Data:", data);
      setShowComprehensive(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`包括情報取得エラー: ${errorMessage}`);
      console.error("包括情報取得エラー:", err);
      console.error("Error details:", { type: typeof err, value: err });
    } finally {
      setLoading(false);
    }
  };

  // 現在の株価を取得
  const handleFetchPrice = async () => {
    setLoading(true);
    setError(null);
    setCurrentPrice(null); // 前回のデータをクリア
    try {
      if (!isJapaneseStock(testSymbol)) {
        throw new Error("価格取得は日本株のみサポートしています");
      }

      console.log("💰 Fetching current price...");
      const priceData = await fetchJapaneseStockPrice(testSymbol);

      if (!priceData || typeof priceData !== "object") {
        throw new Error("無効な価格データが返されました");
      }

      setCurrentPrice(priceData);
      console.log("✅ Price Data:", priceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`価格取得エラー: ${errorMessage}`);
      console.error("価格取得エラー:", err);
      console.error("Error details:", { type: typeof err, value: err });
    } finally {
      setLoading(false);
    }
  };

  // チャートデータを取得
  const handleFetchChart = async () => {
    setLoading(true);
    setError(null);
    setChartData(null); // 前回のデータをクリア
    try {
      if (!isJapaneseStock(testSymbol)) {
        throw new Error("チャートデータ取得は日本株のみサポートしています");
      }

      console.log("📊 Fetching chart data...");
      const chart = await fetchJapaneseStockChart(testSymbol);

      if (!chart || typeof chart !== "object") {
        throw new Error("無効なチャートデータが返されました");
      }

      setChartData(chart);
      console.log("✅ Chart Data:", chart);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`チャートデータ取得エラー: ${errorMessage}`);
      console.error("チャートデータ取得エラー:", err);
      console.error("Error details:", { type: typeof err, value: err });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const isJP = isJapaneseStock(testSymbol);

      if (isJP) {
        // 日本株: 複合手法（API + スクレイピング）
        console.log("🇯🇵 Fetching Japanese stock data via hybrid approach...");
        const profile = await fetchJapaneseStockProfileHybrid(testSymbol);
        setCompanyProfile(testSymbol, profile);
        console.log("✅ Company Profile:", profile);

        const sentiment = await fetchJapaneseStockSentimentHybrid(testSymbol);
        setNewsSentiment(testSymbol, sentiment);
        console.log("✅ News Sentiment:", sentiment);

        // ニュース取得（Finnhub APIを使用）
        try {
          const newsData = await fetchCompanyNews(
            testSymbol.replace(".T", ""),
            "2024-01-01",
            new Date().toISOString().split("T")[0]
          );
          setNews(newsData.slice(0, 3)); // 最新3件
        } catch (newsError) {
          console.warn("News fetch failed:", newsError);
          setNews([]);
        }
      } else {
        // 米国株: Finnhub API
        console.log("🇺🇸 Fetching US stock data via Finnhub...");
        const profile = await fetchCompanyProfile(testSymbol);
        setCompanyProfile(testSymbol, profile);
        console.log("✅ Company Profile:", profile);

        const sentiment = await fetchNewsSentiment(testSymbol);
        setNewsSentiment(testSymbol, sentiment);
        console.log("✅ News Sentiment:", sentiment);

        // ニュース取得
        try {
          const newsData = await fetchCompanyNews(
            testSymbol,
            "2024-01-01",
            new Date().toISOString().split("T")[0]
          );
          setNews(newsData.slice(0, 3)); // 最新3件
        } catch (newsError) {
          console.warn("News fetch failed:", newsError);
          setNews([]);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = companyProfiles[testSymbol];
  const currentSentiment = newsSentiments[testSymbol];

  return (
    <div style={{ backgroundColor: "#1a1a1a", color: "#fff", padding: "20px" }}>
      <h2
        style={{
          marginBottom: "20px",
          color: "#4CAF50",
          borderBottom: "2px solid #4CAF50",
          paddingBottom: "10px",
        }}
      >
        🏢 企業情報
      </h2>

      {/* 入力フィールドと基本ボタン */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          value={testSymbol}
          onChange={(e) => setTestSymbol(e.target.value)}
          placeholder="銘柄シンボル (例: 7203.T, AAPL)"
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid #555",
            backgroundColor: "#333",
            color: "#fff",
            fontSize: "14px",
            width: "250px",
          }}
        />
        <button
          onClick={handleFetchInfo}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: loading ? "#555" : "#0066cc",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "14px",
          }}
        >
          {loading ? "取得中..." : "情報取得"}
        </button>

        {/* 拡張機能ボタン群 */}
        {isJapaneseStock(testSymbol) && (
          <>
            <button
              onClick={handleFetchComprehensive}
              disabled={loading}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: loading ? "#555" : "#2196F3",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              🔄 包括情報
            </button>

            <button
              onClick={handleFetchPrice}
              disabled={loading}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: loading ? "#555" : "#FF9800",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              💰 現在価格
            </button>

            <button
              onClick={handleFetchChart}
              disabled={loading}
              style={{
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: loading ? "#555" : "#9C27B0",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              📊 チャート
            </button>
          </>
        )}
      </div>

      {/* クイック選択ボタン */}
      <div
        style={{
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#252525",
          borderRadius: "4px",
        }}
      >
        <strong style={{ color: "#fff", marginRight: "10px" }}>
          クイック選択:
        </strong>
        {["7203.T", "9984.T", "6758.T", "7974.T", "AAPL", "MSFT", "NVDA"].map(
          (symbol) => (
            <button
              key={symbol}
              onClick={() => setTestSymbol(symbol)}
              style={{
                margin: "0 5px 5px 0",
                padding: "4px 8px",
                backgroundColor:
                  testSymbol === symbol ? "#4CAF50" : "transparent",
                color: testSymbol === symbol ? "#fff" : "#ddd",
                border: "1px solid #555",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {symbol}
            </button>
          )
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#d32f2f",
            color: "#fff",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <strong>⚠️ エラー: </strong>
          {error}
          <div style={{ marginTop: "10px", fontSize: "14px" }}>
            {error.includes("日本株企業情報の取得に失敗（複合手法）") ? (
              <div>
                <p>✅ 解決策:</p>
                <ol style={{ margin: "5px 0", paddingLeft: "20px" }}>
                  <li>Pythonスクリプトが正常に動作するか確認してください</li>
                  <li>
                    コマンドラインで `python scripts/scrape_japanese_stock.py
                    profile 7203.T` を実行してテストしてください
                  </li>
                  <li>
                    スクリプトの依存関係（requests,
                    beautifulsoup4）がインストールされているか確認してください
                  </li>
                </ol>
              </div>
            ) : error.includes("Python") ? (
              <div>
                <p>🐍 Python環境を確認してください:</p>
                <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
                  <li>Pythonがインストールされ、PATHに含まれているか確認</li>
                  <li>必要なパッケージ: requests, beautifulsoup4, lxml</li>
                </ul>
              </div>
            ) : error.includes("403") || error.includes("access") ? (
              <div>
                <p>🔐 アクセス制限の可能性があります:</p>
                <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
                  <li>一時的にアクセスが制限されている可能性があります</li>
                  <li>しばらく時間をおいてから再試行してください</li>
                </ul>
              </div>
            ) : (
              <p>
                詳細なエラー情報については、開発者コンソールをご確認ください。
              </p>
            )}
          </div>
        </div>
      )}

      {/* 包括的データ表示 */}
      {comprehensiveData && showComprehensive && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#252525",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#4CAF50", marginBottom: "15px" }}>
            🔄 包括的株式情報
          </h3>

          {/* 基本情報 */}
          {comprehensiveData.profile && (
            <div
              style={{
                marginBottom: "15px",
                padding: "12px",
                backgroundColor: "#333",
                borderRadius: "6px",
              }}
            >
              <h4 style={{ color: "#2196F3", marginTop: 0 }}>
                📋 企業プロファイル
              </h4>
              <p>
                <strong>企業名:</strong> {comprehensiveData.profile.name}
              </p>
              <p>
                <strong>業種:</strong> {comprehensiveData.profile.industry}
              </p>
              <p>
                <strong>セクター:</strong> {comprehensiveData.profile.sector}
              </p>
              <p>
                <strong>時価総額:</strong>{" "}
                {comprehensiveData.profile.marketCapitalization}億円
              </p>
            </div>
          )}

          {/* 現在価格 */}
          {comprehensiveData.currentPrice && (
            <div
              style={{
                marginBottom: "15px",
                padding: "12px",
                backgroundColor: "#333",
                borderRadius: "6px",
              }}
            >
              <h4 style={{ color: "#FF9800", marginTop: 0 }}>💰 株価情報</h4>
              <p>
                <strong>現在価格:</strong> ¥
                {comprehensiveData.currentPrice.currentPrice || 0}
              </p>
              <p>
                <strong>変動:</strong> ¥
                {comprehensiveData.currentPrice.priceChange || 0} (
                {(
                  comprehensiveData.currentPrice.priceChangePercent || 0
                ).toFixed(2)}
                %)
              </p>
              <p>
                <strong>出来高:</strong>{" "}
                {(comprehensiveData.currentPrice.volume || 0).toLocaleString()}
              </p>
              <p>
                <strong>更新時刻:</strong>{" "}
                {comprehensiveData.currentPrice.lastUpdated
                  ? new Date(
                      comprehensiveData.currentPrice.lastUpdated
                    ).toLocaleString()
                  : "不明"}
              </p>
            </div>
          )}

          {/* 企業説明 */}
          {comprehensiveData.description && (
            <div
              style={{
                marginBottom: "15px",
                padding: "12px",
                backgroundColor: "#333",
                borderRadius: "6px",
              }}
            >
              <h4 style={{ color: "#9C27B0", marginTop: 0 }}>📝 企業概要</h4>
              <p>{comprehensiveData.description}</p>
            </div>
          )}

          {/* 財務指標 */}
          {comprehensiveData.detailedFinancials && (
            <div
              style={{
                marginBottom: "15px",
                padding: "12px",
                backgroundColor: "#333",
                borderRadius: "6px",
              }}
            >
              <h4 style={{ color: "#00BCD4", marginTop: 0 }}>📊 財務指標</h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {Object.entries(comprehensiveData.detailedFinancials).map(
                  ([key, value]) => (
                    <p key={key}>
                      <strong>{key}:</strong> {String(value)}
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {/* チャート情報 */}
          {comprehensiveData.chartData && (
            <div
              style={{
                marginBottom: "15px",
                padding: "12px",
                backgroundColor: "#333",
                borderRadius: "6px",
              }}
            >
              <h4 style={{ color: "#E91E63", marginTop: 0 }}>
                📈 チャート情報
              </h4>
              <p>
                <strong>期間:</strong> {comprehensiveData.chartData.period}
              </p>
              <p>
                <strong>データポイント:</strong>{" "}
                {comprehensiveData.chartData.data?.length || 0}件
              </p>
              {comprehensiveData.chartData.data &&
                comprehensiveData.chartData.data.length > 0 && (
                  <div>
                    <p>
                      <strong>最新価格:</strong> ¥
                      {
                        comprehensiveData.chartData.data[
                          comprehensiveData.chartData.data.length - 1
                        ].close
                      }
                    </p>
                    <p>
                      <strong>最高値:</strong> ¥
                      {Math.max(
                        ...comprehensiveData.chartData.data.map(
                          (d: any) => d.high
                        )
                      )}
                    </p>
                    <p>
                      <strong>最安値:</strong> ¥
                      {Math.min(
                        ...comprehensiveData.chartData.data.map(
                          (d: any) => d.low
                        )
                      )}
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* 最新ニュース */}
          {comprehensiveData.recentNews &&
            comprehensiveData.recentNews.length > 0 && (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#333",
                  borderRadius: "6px",
                }}
              >
                <h4 style={{ color: "#FFC107", marginTop: 0 }}>
                  📰 最新ニュース
                </h4>
                {comprehensiveData.recentNews.map(
                  (newsItem: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: "8px",
                        padding: "8px",
                        backgroundColor: "#444",
                        borderRadius: "4px",
                      }}
                    >
                      <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
                        {newsItem.headline}
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                        {newsItem.source} - {newsItem.date}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
        </div>
      )}

      {/* 個別の現在価格表示 */}
      {currentPrice && !showComprehensive && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#252525",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#FF9800", marginBottom: "15px" }}>
            💰 現在の株価
          </h3>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#333",
              borderRadius: "6px",
            }}
          >
            <p>
              <strong>現在価格:</strong> ¥{currentPrice.currentPrice || 0}
            </p>
            <p>
              <strong>変動:</strong> ¥{currentPrice.priceChange || 0} (
              {(currentPrice.priceChangePercent || 0).toFixed(2)}%)
            </p>
            <p>
              <strong>出来高:</strong>{" "}
              {(currentPrice.volume || 0).toLocaleString()}
            </p>
            <p>
              <strong>更新時刻:</strong>{" "}
              {currentPrice.lastUpdated
                ? new Date(currentPrice.lastUpdated).toLocaleString()
                : "不明"}
            </p>
          </div>
        </div>
      )}

      {/* 個別のチャート表示 */}
      {chartData && !showComprehensive && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#252525",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#9C27B0", marginBottom: "15px" }}>
            📊 チャートデータ
          </h3>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#333",
              borderRadius: "6px",
            }}
          >
            <p>
              <strong>銘柄:</strong> {chartData.symbol}
            </p>
            <p>
              <strong>期間:</strong> {chartData.period}
            </p>
            <p>
              <strong>データポイント:</strong> {chartData.data?.length || 0}件
            </p>
            {chartData.data && chartData.data.length > 0 && (
              <div>
                <p>
                  <strong>最新価格:</strong> ¥
                  {chartData.data[chartData.data.length - 1]?.close || 0}
                </p>
                <p>
                  <strong>最高値:</strong> ¥
                  {Math.max(
                    ...chartData.data.map((d: any) => Number(d.high) || 0)
                  )}
                </p>
                <p>
                  <strong>最安値:</strong> ¥
                  {Math.min(
                    ...chartData.data.map((d: any) => Number(d.low) || Infinity)
                  )}
                </p>
                <p style={{ fontSize: "12px", color: "#888" }}>
                  {chartData.dataSource || "データソース不明"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 企業情報表示 */}
      {(currentProfile || currentSentiment) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              currentProfile && currentSentiment ? "1fr 1fr" : "1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {currentProfile && (
            <div
              style={{
                padding: "15px",
                backgroundColor: "#252525",
                borderRadius: "6px",
              }}
            >
              <h3
                style={{ marginTop: 0, color: "#4CAF50", marginBottom: "15px" }}
              >
                🏢 企業プロフィール
              </h3>
              <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>企業名:</strong>
                  <span>{currentProfile.name}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>シンボル:</strong>
                  <span>{currentProfile.symbol}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>国:</strong>
                  <span>{currentProfile.country}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>取引所:</strong>
                  <span>{currentProfile.exchange}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>業種:</strong>
                  <span>{currentProfile.industry}</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>セクター:</strong>
                  <span style={{ color: "#64B5F6" }}>
                    {currentProfile.sector}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <strong>時価総額:</strong>
                  <span>
                    {currentProfile.marketCapitalization.toLocaleString()}M{" "}
                    {currentProfile.currency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentSentiment && (
            <div
              style={{
                padding: "15px",
                backgroundColor: "#252525",
                borderRadius: "6px",
              }}
            >
              <h3
                style={{ marginTop: 0, color: "#FF9800", marginBottom: "15px" }}
              >
                📊 市場センチメント
              </h3>
              <div style={{ fontSize: "14px", lineHeight: "1.8" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                  }}
                >
                  <strong>注目度レベル:</strong>
                  <span
                    style={{
                      color:
                        calculateAttentionLevel(currentSentiment.buzzVolume) ===
                        "high"
                          ? "#4CAF50"
                          : calculateAttentionLevel(
                              currentSentiment.buzzVolume
                            ) === "medium"
                          ? "#FF9800"
                          : "#888",
                      fontWeight: "bold",
                    }}
                  >
                    {calculateAttentionLevel(currentSentiment.buzzVolume) ===
                    "high"
                      ? "🔥 高"
                      : calculateAttentionLevel(currentSentiment.buzzVolume) ===
                        "medium"
                      ? "⚡ 中"
                      : "😴 低"}
                  </span>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <strong>話題度:</strong>
                    <span>
                      {currentSentiment.buzzVolume.toFixed(1)}
                      <span style={{ color: "#888", fontSize: "12px" }}>
                        /100
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      backgroundColor: "#444",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(
                          currentSentiment.buzzVolume * 2,
                          100
                        )}%`,
                        height: "100%",
                        backgroundColor: "#00bcd4",
                        borderRadius: "4px",
                      }}
                    ></div>
                  </div>
                </div>

                {currentSentiment.companyNewsScore && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <strong>ニューススコア:</strong>
                    <span>
                      {(currentSentiment.companyNewsScore * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 最新ニュース */}
      {news.length > 0 && !showComprehensive && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#252525",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#2196F3", marginBottom: "15px" }}>
            📰 最新ニュース
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {news.map((article, index) => (
              <div
                key={index}
                style={{
                  padding: "12px",
                  backgroundColor: "#333",
                  borderRadius: "6px",
                  borderLeft: "4px solid #2196F3",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {article.headline}
                </h4>
                <p
                  style={{
                    margin: "0 0 8px 0",
                    color: "#ccc",
                    fontSize: "13px",
                    lineHeight: "1.4",
                  }}
                >
                  {article.summary}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#888", fontSize: "12px" }}>
                    {article.source}
                  </span>
                  <span style={{ color: "#888", fontSize: "12px" }}>
                    {new Date(article.datetime * 1000).toLocaleDateString(
                      "ja-JP"
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!currentProfile && !currentSentiment && !loading && (
        <p style={{ color: "#888", marginTop: "20px", textAlign: "center" }}>
          銘柄シンボルを入力して「情報取得」をクリックしてください
        </p>
      )}
    </div>
  );
}
