import { useState } from "react";
import {
  analyzeStock,
  type StockAnalysis as Analysis,
} from "../../services/aiAnalysisService";
import { fetchStockQuote } from "../../services/stockApi";
import styles from "./StockAnalysis.module.css";

export function StockAnalysis() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symbol.trim()) {
      setError("Please enter a stock symbol");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const stockData = await fetchStockQuote(symbol);
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
        err instanceof Error ? err.message : "An error occurred during analysis";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationClass = (rec: string) => {
    switch (rec) {
      case "BUY":
        return styles.buy;
      case "SELL":
        return styles.sell;
      case "HOLD":
        return styles.hold;
      default:
        return "";
    }
  };

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 80) return "high";
    if (confidence >= 60) return "medium";
    return "low";
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
            <path d="M20 12a8 8 0 0 0-8-8v8h8z" />
          </svg>
        </div>
        <h2 className={styles.title}>AI Stock Analysis</h2>
      </div>

      {/* Input Form */}
      <div className={styles.inputForm}>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter symbol (e.g., AAPL, 7203.T)"
          disabled={loading}
          className={styles.symbolInput}
          onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={styles.analyzeButton}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <svg
            className={styles.errorIcon}
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
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h3 className={styles.resultsTitle}>Analysis: {symbol}</h3>
            <p className={styles.resultsTimestamp}>
              {new Date(analysis.timestamp).toLocaleString("ja-JP")}
            </p>
          </div>

          {/* Recommendation */}
          <div className={styles.recommendation}>
            <div className={styles.recommendationRow}>
              <span className={styles.recommendationLabel}>Action:</span>
              <span
                className={`${styles.recommendationValue} ${getRecommendationClass(
                  analysis.recommendation
                )}`}
              >
                {analysis.recommendation}
              </span>
            </div>

            {/* Confidence */}
            <div className={styles.confidence}>
              <div className={styles.confidenceHeader}>
                <span className={styles.confidenceLabel}>Confidence:</span>
                <span
                  className={`${styles.confidenceValue} ${
                    styles[getConfidenceClass(analysis.confidence)]
                  }`}
                >
                  {analysis.confidence}%
                </span>
              </div>
              <div className={styles.confidenceBar}>
                <div
                  className={`${styles.confidenceFill} ${
                    styles[getConfidenceClass(analysis.confidence)]
                  }`}
                  style={{ width: `${analysis.confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className={styles.reasoning}>
            <div className={styles.reasoningHeader}>
              <svg
                className={styles.reasoningIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3v18h18" />
                <path d="M18 17V9M13 17V5M8 17v-3" />
              </svg>
              <h4 className={styles.reasoningTitle}>Analysis Reasoning</h4>
            </div>
            <p className={styles.reasoningText}>{analysis.reasoning}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analysis && !error && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className={styles.emptyStateTitle}>
            Enter a stock symbol to start AI analysis
          </p>
          <p className={styles.emptyStateHint}>
            Examples: AAPL (Apple), NVDA (NVIDIA), 7203.T (Toyota), 9984.T (SoftBank)
          </p>
        </div>
      )}
    </div>
  );
}

export default StockAnalysis;
