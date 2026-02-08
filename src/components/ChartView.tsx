import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickData,
  HistogramData,
} from "lightweight-charts";
import { FundamentalAnalyzer } from "../utils/fundamentalAnalysis";
import { FundamentalData, AnalysisResult, ScreeningResult } from "../types";
import { useStockStore } from "../store/useStockStore";
import { useStockDataUpdater } from "../hooks/useStockData";

interface ChartViewProps {
  symbol?: string;
}

const ChartView: React.FC<ChartViewProps> = ({ symbol = "NVDA" }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [screeningResults, setScreeningResults] = useState<ScreeningResult[]>(
    []
  );
  const [showScreening, setShowScreening] = useState(true);

  // グローバル状態から取得
  const currentStock = useStockStore((state) => state.currentStock);
  const isLoading = useStockStore((state) => state.isLoading);
  const error = useStockStore((state) => state.error);

  // 自動更新を無効化（レート制限対策）
  const { refetch } = useStockDataUpdater(symbol, false);

  const stockData = currentStock.symbol === symbol ? currentStock.data : [];
  const signals = currentStock.symbol === symbol ? currentStock.signals : [];

  // 初回のみデータ取得
  useEffect(() => {
    if (stockData.length === 0 && !isLoading) {
      refetch();
    }
  }, [symbol]); // symbolが変わった時のみ

  useEffect(() => {
    if (!chartContainerRef.current || stockData.length === 0) return;

    interface FixedChartApi extends IChartApi {
      addCandlestickSeries(): ISeriesApi<"Candlestick">;
      addHistogramSeries(options: any): ISeriesApi<"Histogram">;
    }

    const chart = createChart(chartContainerRef.current!) as FixedChartApi;

    const candlestickSeries = chart.addCandlestickSeries();
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const candles: CandlestickData[] = stockData.map((item) => ({
      time: item.time as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    const volumes: HistogramData[] = stockData.map((item) => ({
      time: item.time as Time,
      value: item.volume,
      color: item.close > item.open ? "#26a69a" : "#ef5350",
    }));

    candlestickSeries.setData(candles);
    volumeSeries.setData(volumes);

    // サンプルスクリーニングデータ
    const sampleScreeningResults: ScreeningResult[] = [
      {
        symbol: "NVDA",
        companyName: "NVIDIA Corp",
        technicalScore: 85,
        fundamentalScore: 78,
        overallScore: 82,
        signals: signals,
        category: "高成長期待",
        sector: "Semiconductors",
        marketCap: 1800000000000,
        priceChange24h: 3.2,
        volumeChange24h: 127,
      },
      {
        symbol: "MSFT",
        companyName: "Microsoft Corp",
        technicalScore: 72,
        fundamentalScore: 82,
        overallScore: 76,
        signals: [
          {
            type: "breakout",
            strength: "moderate",
            description: "20日線突破",
            timestamp: "2025-08-05",
          },
        ],
        category: "成長有望",
        sector: "Software",
        marketCap: 2800000000000,
        priceChange24h: 1.8,
        volumeChange24h: 105,
      },
      {
        symbol: "GOOGL",
        companyName: "Alphabet Inc",
        technicalScore: 68,
        fundamentalScore: 75,
        overallScore: 71,
        signals: [
          {
            type: "momentum",
            strength: "moderate",
            description: "RSI上昇",
            timestamp: "2025-08-05",
          },
        ],
        category: "成長有望",
        sector: "Internet",
        marketCap: 1600000000000,
        priceChange24h: 2.1,
        volumeChange24h: 98,
      },
      {
        symbol: "TSLA",
        companyName: "Tesla Inc",
        technicalScore: 75,
        fundamentalScore: 65,
        overallScore: 71,
        signals: [
          {
            type: "volume_spike",
            strength: "strong",
            description: "出来高急増",
            timestamp: "2025-08-05",
          },
        ],
        category: "成長有望",
        sector: "Electric Vehicles",
        marketCap: 800000000000,
        priceChange24h: 4.7,
        volumeChange24h: 156,
      },
      {
        symbol: "AMD",
        companyName: "Advanced Micro",
        technicalScore: 70,
        fundamentalScore: 68,
        overallScore: 69,
        signals: [
          {
            type: "pattern",
            strength: "moderate",
            description: "連続上昇",
            timestamp: "2025-08-05",
          },
        ],
        category: "安定成長",
        sector: "Semiconductors",
        marketCap: 220000000000,
        priceChange24h: 2.8,
        volumeChange24h: 112,
      },
    ];

    setScreeningResults(sampleScreeningResults);

    // 詳細分析用データ
    const fundamentalData: FundamentalData = {
      symbol,
      companyName: symbol === "NVDA" ? "NVIDIA Corporation" : "Sample Company",
      sector: "Technology - Semiconductors",
      aiExposure: symbol === "NVDA" ? 95 : 60,
      revenue: 60_900_000_000,
      marketCap: 1_800_000_000_000,
      peRatio: 28.5,
      recentNews: [
        "Strong AI chip demand continues",
        "New GPU architecture announced",
        "Partnership expansion with cloud providers",
      ],
    };

    const analysisResult = FundamentalAnalyzer.analyzeCompany(
      stockData,
      fundamentalData
    );
    analysisResult.signals = signals;
    setAnalysis(analysisResult);

    return () => chart.remove();
  }, [stockData, signals, symbol]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-5)",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h2 style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-gray-900)"
          }}>
            Stock Screening
          </h2>
          {currentStock.lastUpdate && (
            <p style={{
              margin: "var(--space-1) 0 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--color-gray-500)",
              fontFamily: "var(--font-mono)"
            }}>
              Last updated:{" "}
              {new Date(currentStock.lastUpdate).toLocaleTimeString("ja-JP")}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
          {isLoading && (
            <span style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-gray-500)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)"
            }}>
              <span className="spinner spinner-sm" />
              Updating...
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowScreening(!showScreening)}
            className={`btn ${showScreening ? "btn-primary" : "btn-ghost"}`}
          >
            {showScreening ? "Screening" : "Show Screening"}
          </button>
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={`btn ${showAnalysis ? "btn-primary" : "btn-ghost"}`}
          >
            {showAnalysis ? "Analysis" : "Show Analysis"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "var(--space-4)",
            backgroundColor: "var(--color-bearish-light)",
            border: "1px solid var(--color-bearish)",
            borderLeft: "4px solid var(--color-bearish)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-bearish-dark)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => refetch()}
            className="btn"
            style={{
              backgroundColor: "var(--color-bearish-dark)",
              color: "var(--color-white)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {showScreening && (
        <div
          style={{
            marginBottom: "var(--space-6)",
            padding: "var(--space-5)",
            backgroundColor: "var(--color-cream)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-divider)",
          }}
        >
          <h3 style={{
            margin: "0 0 var(--space-4) 0",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-gray-900)"
          }}>
            Top Stocks Ranking
          </h3>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {screeningResults.map((result, index) => (
              <div
                key={result.symbol}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 80px 180px 1fr 80px 80px 100px",
                  alignItems: "center",
                  padding: "var(--space-3) var(--space-4)",
                  backgroundColor: "var(--color-white)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-divider)",
                  gap: "var(--space-3)",
                  transition: "all var(--transition-fast)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    backgroundColor: index < 3 ? "var(--color-gold)" : "var(--color-gray-200)",
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-bold)",
                    color: index < 3 ? "var(--color-white)" : "var(--color-gray-600)",
                  }}
                >
                  {index + 1}
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: "var(--font-bold)",
                  fontSize: "var(--text-base)",
                  color: "var(--color-gray-900)"
                }}>
                  {result.symbol}
                </div>
                <div>
                  <div style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-medium)",
                    color: "var(--color-gray-900)"
                  }}>
                    {result.companyName}
                  </div>
                  <div style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-gray-500)"
                  }}>
                    {result.sector}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  {result.signals.slice(0, 2).map((signal, i) => (
                    <span
                      key={i}
                      className="badge"
                      style={{
                        backgroundColor:
                          signal.strength === "strong"
                            ? "var(--color-bearish-light)"
                            : signal.strength === "moderate"
                            ? "var(--color-caution-light)"
                            : "var(--color-bullish-light)",
                        color:
                          signal.strength === "strong"
                            ? "var(--color-bearish-dark)"
                            : signal.strength === "moderate"
                            ? "var(--color-caution-dark)"
                            : "var(--color-bullish-dark)",
                      }}
                    >
                      {signal.type === "volume_spike"
                        ? "Volume"
                        : signal.type === "breakout"
                        ? "Breakout"
                        : signal.type === "momentum"
                        ? "Momentum"
                        : "Pattern"}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-bold)",
                    color:
                      result.overallScore >= 80
                        ? "var(--color-bullish)"
                        : result.overallScore >= 60
                        ? "var(--color-caution)"
                        : "var(--color-bearish)",
                  }}
                >
                  {result.overallScore.toFixed(0)}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-semibold)",
                    color: result.priceChange24h > 0 ? "var(--color-bullish)" : "var(--color-bearish)",
                  }}
                >
                  {result.priceChange24h > 0 ? "+" : ""}
                  {result.priceChange24h.toFixed(1)}%
                </div>
                <span
                  className="badge"
                  style={{
                    backgroundColor:
                      result.category === "高成長期待"
                        ? "var(--color-bullish)"
                        : result.category === "成長有望"
                        ? "var(--color-teal-600)"
                        : result.category === "安定成長"
                        ? "var(--color-caution)"
                        : "var(--color-gray-500)",
                    color: "var(--color-white)",
                  }}
                >
                  {result.category === "高成長期待"
                    ? "High Growth"
                    : result.category === "成長有望"
                    ? "Promising"
                    : result.category === "安定成長"
                    ? "Stable"
                    : result.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "400px",
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-5)",
          position: "relative",
          backgroundColor: "var(--color-white)",
          overflow: "hidden",
        }}
      >
        {isLoading && stockData.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <div className="spinner spinner-lg" style={{ marginBottom: "var(--space-3)" }} />
            <div style={{ fontSize: "var(--text-sm)", color: "var(--color-gray-500)" }}>
              Loading data...
            </div>
          </div>
        )}
        {!isLoading && stockData.length === 0 && !error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "var(--color-gray-400)",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "var(--space-3)" }}>
              <path d="M3 3v18h18" />
              <path d="M18 17V9M13 17V5M8 17v-3" />
            </svg>
            <div style={{ fontSize: "var(--text-sm)" }}>
              No data available
            </div>
          </div>
        )}
      </div>

      {showAnalysis && analysis && (
        <div
          style={{
            padding: "var(--space-5)",
            backgroundColor: "var(--color-cream)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-divider)",
          }}
        >
          <h3 style={{
            margin: "0 0 var(--space-4) 0",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: "var(--font-semibold)",
            color: "var(--color-gray-900)"
          }}>
            Investment Analysis
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "var(--space-4)",
              marginBottom: "var(--space-5)",
            }}
          >
            <div
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--color-white)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-gray-500)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wider)",
                marginBottom: "var(--space-1)"
              }}>
                Overall Score
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: "var(--font-bold)",
                  color: analysis.overallScore >= 70 ? "var(--color-bullish)" : "var(--color-caution)",
                }}
              >
                {analysis.overallScore.toFixed(1)}
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-gray-400)" }}>/100</span>
              </div>
            </div>
            <div
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--color-white)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-gray-500)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wider)",
                marginBottom: "var(--space-1)"
              }}>
                Technical
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xl)",
                  fontWeight: "var(--font-bold)",
                  color: "var(--color-info)",
                }}
              >
                {analysis.technicalScore.toFixed(1)}
              </div>
            </div>
            <div
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--color-white)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-gray-500)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wider)",
                marginBottom: "var(--space-1)"
              }}>
                Fundamental
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xl)",
                  fontWeight: "var(--font-bold)",
                  color: "var(--color-teal-600)",
                }}
              >
                {analysis.fundamentalScore.toFixed(1)}
              </div>
            </div>
            <div
              style={{
                padding: "var(--space-4)",
                backgroundColor: "var(--color-white)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-gray-500)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wider)",
                marginBottom: "var(--space-1)"
              }}>
                Recommendation
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--font-bold)",
                  color:
                    analysis.recommendation === "buy"
                      ? "var(--color-bullish)"
                      : analysis.recommendation === "hold"
                      ? "var(--color-caution)"
                      : "var(--color-bearish)",
                }}
              >
                {analysis.recommendation.toUpperCase()}
              </div>
            </div>
          </div>

          {signals.length > 0 && (
            <div>
              <h4 style={{
                margin: "0 0 var(--space-3) 0",
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-gray-800)"
              }}>
                Detected Signals
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
              >
                {signals.map((signal, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      backgroundColor: "var(--color-white)",
                      borderLeft: `4px solid ${
                        signal.strength === "strong"
                          ? "var(--color-bearish)"
                          : signal.strength === "moderate"
                          ? "var(--color-caution)"
                          : "var(--color-bullish)"
                      }`,
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{
                        fontWeight: "var(--font-semibold)",
                        color: "var(--color-gray-800)"
                      }}>
                        {signal.type === "volume_spike"
                          ? "Volume Spike"
                          : signal.type === "breakout"
                          ? "Breakout"
                          : signal.type === "momentum"
                          ? "Momentum"
                          : "Pattern"}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            signal.strength === "strong"
                              ? "var(--color-bearish)"
                              : signal.strength === "moderate"
                              ? "var(--color-caution)"
                              : "var(--color-bullish)",
                          color: "var(--color-white)",
                        }}
                      >
                        {signal.strength === "strong"
                          ? "Strong"
                          : signal.strength === "moderate"
                          ? "Moderate"
                          : "Weak"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--color-gray-600)",
                        marginTop: "var(--space-1)",
                      }}
                    >
                      {signal.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartView;
