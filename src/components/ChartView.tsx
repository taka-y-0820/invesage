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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#333" }}>
            今後上がる企業スクリーニング
          </h2>
          {currentStock.lastUpdate && (
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
              最終更新:{" "}
              {new Date(currentStock.lastUpdate).toLocaleTimeString("ja-JP")}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isLoading && (
            <span style={{ fontSize: "14px", color: "#666" }}>更新中...</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              backgroundColor: isLoading ? "#6c757d" : "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            🔄 更新
          </button>
          <button
            onClick={() => setShowScreening(!showScreening)}
            style={{
              padding: "8px 16px",
              backgroundColor: showScreening ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showScreening ? "スクリーニング結果" : "スクリーニングを表示"}
          </button>
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            style={{
              padding: "8px 16px",
              backgroundColor: showAnalysis ? "#007bff" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showAnalysis ? "詳細分析" : "詳細分析を表示"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            color: "#721c24",
          }}
        >
          ⚠️ {error}
          <button
            onClick={() => refetch()}
            style={{
              marginLeft: "12px",
              padding: "4px 12px",
              backgroundColor: "#721c24",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            再試行
          </button>
        </div>
      )}

      {showScreening && (
        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", color: "#495057" }}>
            上昇期待企業ランキング
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {screeningResults.map((result, index) => (
              <div
                key={result.symbol}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 80px 200px 1fr 100px 100px 120px",
                  alignItems: "center",
                  padding: "12px 16px",
                  backgroundColor: "white",
                  borderRadius: "6px",
                  border: "1px solid #e9ecef",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    backgroundColor: index < 3 ? "#ffd700" : "#e9ecef",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: index < 3 ? "#333" : "#6c757d",
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {result.symbol}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>
                    {result.companyName}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    {result.sector}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {result.signals.slice(0, 2).map((signal, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "12px",
                        backgroundColor:
                          signal.strength === "strong"
                            ? "#dc3545"
                            : signal.strength === "moderate"
                            ? "#ffc107"
                            : "#28a745",
                        color: "white",
                      }}
                    >
                      {signal.type === "volume_spike"
                        ? "出来高↑"
                        : signal.type === "breakout"
                        ? "ブレイク"
                        : signal.type === "momentum"
                        ? "モメンタム"
                        : "パターン"}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color:
                      result.overallScore >= 80
                        ? "#28a745"
                        : result.overallScore >= 60
                        ? "#ffc107"
                        : "#dc3545",
                  }}
                >
                  {result.overallScore.toFixed(0)}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: result.priceChange24h > 0 ? "#28a745" : "#dc3545",
                  }}
                >
                  {result.priceChange24h > 0 ? "+" : ""}
                  {result.priceChange24h.toFixed(1)}%
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor:
                      result.category === "高成長期待"
                        ? "#28a745"
                        : result.category === "成長有望"
                        ? "#17a2b8"
                        : result.category === "安定成長"
                        ? "#ffc107"
                        : "#6c757d",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  {result.category}
                </div>
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
          border: "1px solid #ddd",
          marginBottom: "20px",
          position: "relative",
          backgroundColor: "#f8f9fa",
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
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📊</div>
            <div style={{ fontSize: "14px", color: "#666" }}>
              データ読み込み中...
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
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📈</div>
            <div style={{ fontSize: "14px", color: "#666" }}>
              データがありません
            </div>
          </div>
        )}
      </div>

      {showAnalysis && analysis && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #dee2e6",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0", color: "#495057" }}>
            投資分析結果
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                padding: "10px",
                backgroundColor: "white",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "14px", color: "#6c757d" }}>
                総合スコア
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: analysis.overallScore >= 70 ? "#28a745" : "#ffc107",
                }}
              >
                {analysis.overallScore.toFixed(1)}/100
              </div>
            </div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "white",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "14px", color: "#6c757d" }}>
                テクニカル
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#007bff",
                }}
              >
                {analysis.technicalScore.toFixed(1)}
              </div>
            </div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "white",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "14px", color: "#6c757d" }}>
                ファンダメンタルズ
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#17a2b8",
                }}
              >
                {analysis.fundamentalScore.toFixed(1)}
              </div>
            </div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "white",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "14px", color: "#6c757d" }}>推奨</div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color:
                    analysis.recommendation === "buy"
                      ? "#28a745"
                      : analysis.recommendation === "hold"
                      ? "#ffc107"
                      : "#dc3545",
                }}
              >
                {analysis.recommendation.toUpperCase()}
              </div>
            </div>
          </div>

          {signals.length > 0 && (
            <div>
              <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>
                検出されたシグナル
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {signals.map((signal, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "white",
                      borderLeft: `4px solid ${
                        signal.strength === "strong"
                          ? "#dc3545"
                          : signal.strength === "moderate"
                          ? "#ffc107"
                          : "#28a745"
                      }`,
                      borderRadius: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: "bold", color: "#495057" }}>
                        {signal.type === "volume_spike"
                          ? "出来高急増"
                          : signal.type === "breakout"
                          ? "ブレイクアウト"
                          : signal.type === "momentum"
                          ? "モメンタム"
                          : "パターン"}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          backgroundColor:
                            signal.strength === "strong"
                              ? "#dc3545"
                              : signal.strength === "moderate"
                              ? "#ffc107"
                              : "#28a745",
                          color: "white",
                        }}
                      >
                        {signal.strength === "strong"
                          ? "強"
                          : signal.strength === "moderate"
                          ? "中"
                          : "弱"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#6c757d",
                        marginTop: "4px",
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
