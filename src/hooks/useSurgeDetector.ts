import { useState, useEffect, useCallback } from "react";
import { FinnhubWebSocket } from "../services/realtime/finnhubWebSocket";
import { NewsSearchService } from "../services/news/newsSearchService";
import { RAGAnalysisService } from "../services/ai/ragAnalysisService";

interface SurgeAlert {
  id: string;
  symbol: string;
  changePercent: number;
  direction: "up" | "down";
  timestamp: Date;
  reason?: string;
  sentiment?: "positive" | "negative" | "neutral";
  confidence?: number;
  keyFactors?: string[];
  newsArticles?: Array<{
    headline: string;
    source: string;
    url: string;
  }>;
  isAnalyzing?: boolean;
}

interface UseSurgeDetectorOptions {
  symbols: string[];
  surgeThreshold?: number; // デフォルト3%
  enableAIAnalysis?: boolean;
}

/**
 * リアルタイム急騰・急落検知フック
 */
export function useSurgeDetector(options: UseSurgeDetectorOptions) {
  const { symbols = [], enableAIAnalysis = true } = options;

  const [alerts, setAlerts] = useState<SurgeAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 環境変数からAPIキーを取得
  const finnhubKey = import.meta.env.VITE_FINNHUB_API_KEY || "";
  const newsApiKey = import.meta.env.VITE_NEWS_API_KEY || "";
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || "";

  useEffect(() => {
    if (!finnhubKey) {
      setError("Finnhub APIキーが設定されていません");
      return;
    }

    const ws = new FinnhubWebSocket(finnhubKey);
    const newsService = new NewsSearchService(finnhubKey, newsApiKey);

    // OpenAI APIキーがある場合のみRAGサービスを初期化
    let ragService: RAGAnalysisService | null = null;
    if (enableAIAnalysis && openaiKey) {
      try {
        ragService = new RAGAnalysisService(openaiKey);
      } catch (error) {
        console.warn("AI分析サービスの初期化に失敗:", error);
      }
    }

    // WebSocket接続
    ws.connect()
      .then(() => {
        setIsConnected(true);
        ws.subscribe(symbols);
      })
      .catch((err) => {
        setError(`接続エラー: ${err.message}`);
      });

    // 急騰・急落イベントをリッスン
    ws.on("surge", async (surgeEvent: any) => {
      const alertId = `${surgeEvent.symbol}-${surgeEvent.timestamp}`;

      // アラートを追加（分析中）
      const newAlert: SurgeAlert = {
        id: alertId,
        symbol: surgeEvent.symbol,
        changePercent: surgeEvent.changePercent,
        direction: surgeEvent.direction,
        timestamp: new Date(surgeEvent.timestamp),
        isAnalyzing: enableAIAnalysis,
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 10)); // 最新10件のみ保持

      // AI分析を実行
      if (enableAIAnalysis && newsApiKey && ragService) {
        try {
          // ニュース検索
          const news = await newsService.searchForSurge(
            surgeEvent.symbol,
            surgeEvent.direction
          );

          // AI分析
          const analysis = await ragService.analyzeSurgeReason(
            surgeEvent.symbol,
            news,
            surgeEvent.changePercent
          );

          // アラートを更新
          setAlerts((prev) =>
            prev.map((alert) =>
              alert.id === alertId
                ? {
                    ...alert,
                    reason: analysis.reason,
                    sentiment: analysis.sentiment,
                    confidence: analysis.confidence,
                    keyFactors: analysis.keyFactors,
                    newsArticles: news.slice(0, 3).map((n) => ({
                      headline: n.headline,
                      source: n.source,
                      url: n.url,
                    })),
                    isAnalyzing: false,
                  }
                : alert
            )
          );
        } catch (err) {
          console.error("AI分析エラー:", err);
          // 分析失敗でもアラートは残す
          setAlerts((prev) =>
            prev.map((alert) =>
              alert.id === alertId ? { ...alert, isAnalyzing: false } : alert
            )
          );
        }
      }
    });

    // クリーンアップ
    return () => {
      ws.disconnect();
    };
  }, [symbols.join(","), finnhubKey, newsApiKey, openaiKey, enableAIAnalysis]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    isConnected,
    error,
    dismissAlert,
    clearAllAlerts,
  };
}
