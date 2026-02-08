import { useState } from "react";
import {
  analyzeStock,
  type StockAnalysis as Analysis,
} from "../services/aiAnalysisService";
import { fetchStockQuote } from "../services/stockApi";

export function StockAnalysis() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symbol.trim()) {
      setError("銘柄シンボルを入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // リアルタイム株価を取得
      const stockData = await fetchStockQuote(symbol);

      // AI分析を実行
      const result = await analyzeStock({
        symbol: stockData.symbol,
        price: stockData.price,
        change: stockData.change,
        change_percent: stockData.change_percent,
        volume: stockData.volume,
      });

      setAnalysis(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "分析中にエラーが発生しました";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "BUY":
        return "#4CAF50";
      case "SELL":
        return "#f44336";
      case "HOLD":
        return "#FF9800";
      default:
        return "#888";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "#4CAF50";
    if (confidence >= 60) return "#FF9800";
    return "#f44336";
  };

  return (
    <div
      style={{
        backgroundColor: "#1a1a1a",
        color: "#fff",
        padding: "20px",
        borderRadius: "8px",
      }}
    >
      <h2
        style={{
          marginBottom: "20px",
          color: "#4CAF50",
          borderBottom: "2px solid #4CAF50",
          paddingBottom: "10px",
        }}
      >
        🤖 AI 株式分析
      </h2>

      {/* 入力フォーム */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="銘柄シンボル (例: AAPL, 7203.T)"
          disabled={loading}
          style={{
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #555",
            backgroundColor: "#333",
            color: "#fff",
            fontSize: "16px",
            flex: 1,
          }}
          onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            padding: "10px 24px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: loading ? "#555" : "#2196F3",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {loading ? "分析中..." : "分析開始"}
        </button>
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
        </div>
      )}

      {/* 分析結果表示 */}
      {analysis && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#252525",
            borderRadius: "8px",
            border: "1px solid #333",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#fff" }}>
              分析結果: {symbol}
            </h3>
            <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
              {new Date(analysis.timestamp).toLocaleString("ja-JP")}
            </p>
          </div>

          {/* 推奨アクション */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#aaa" }}>推奨:</span>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: "bold",
                  color: getRecommendationColor(analysis.recommendation),
                }}
              >
                {analysis.recommendation}
              </span>
            </div>

            {/* 信頼度 */}
            <div style={{ marginBottom: "15px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "5px",
                }}
              >
                <span style={{ fontSize: "14px", color: "#aaa" }}>信頼度:</span>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: getConfidenceColor(analysis.confidence),
                  }}
                >
                  {analysis.confidence}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  backgroundColor: "#333",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${analysis.confidence}%`,
                    height: "100%",
                    backgroundColor: getConfidenceColor(analysis.confidence),
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* 分析理由 */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#1a1a1a",
              borderRadius: "6px",
              border: "1px solid #333",
            }}
          >
            <h4
              style={{
                margin: "0 0 10px 0",
                color: "#4CAF50",
                fontSize: "16px",
              }}
            >
              📊 分析根拠
            </h4>
            <p style={{ margin: 0, color: "#ddd", lineHeight: "1.6" }}>
              {analysis.reasoning}
            </p>
          </div>
        </div>
      )}

      {/* 初期状態のヘルプテキスト */}
      {!analysis && !error && !loading && (
        <div
          style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}
        >
          <p style={{ fontSize: "18px", marginBottom: "10px" }}>
            🔍 銘柄シンボルを入力してAI分析を開始
          </p>
          <p style={{ fontSize: "14px", margin: 0 }}>
            例: AAPL (Apple), NVDA (NVIDIA), 7203.T (トヨタ), 9984.T
            (ソフトバンク)
          </p>
        </div>
      )}
    </div>
  );
}
