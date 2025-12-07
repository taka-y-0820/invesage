import { useEffect, useRef, useCallback } from "react";
import { useStockStore } from "../store/useStockStore";
import {
  fetchStockHistoryAlphaVantage,
  fetchMarketData,
  getRecommendedUpdateInterval,
} from "../services/stockApi";
import { TechnicalAnalyzer } from "../utils/technicalAnalysis";

/**
 * 株価データの自動更新フック
 */
export function useStockDataUpdater(symbol: string, enabled: boolean = true) {
  const store = useStockStore();
  const intervalRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isLoadingRef.current || !symbol) return;

    isLoadingRef.current = true;
    store.setLoading(true);

    try {
      // Alpha Vantage APIで株価履歴データを取得（レート制限が緩い）
      const data = await fetchStockHistoryAlphaVantage(symbol, "3mo");

      // テクニカル分析を実行
      const signals = TechnicalAnalyzer.analyzeStock(data);

      // ストアに保存
      store.setCurrentStock(symbol, data, signals);

      console.log(`✅ Updated ${symbol} at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error("Failed to fetch stock data:", error);
      store.setError(error instanceof Error ? error.message : "不明なエラー");
    } finally {
      isLoadingRef.current = false;
      store.setLoading(false);
    }
  }, [symbol, store]);

  useEffect(() => {
    if (!enabled || !symbol) return;

    // 初回データ取得（2秒遅延 - 市場データの後に取得）
    const initialTimeout = setTimeout(fetchData, 2000);

    // 定期更新の設定
    const interval = getRecommendedUpdateInterval();
    intervalRef.current = window.setInterval(fetchData, interval);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, enabled, fetchData]);

  return {
    refetch: fetchData,
  };
}

/**
 * 市場データ（指数）の自動更新フック
 */
export function useMarketDataUpdater(enabled: boolean = true) {
  const store = useStockStore();
  const intervalRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;

    try {
      const marketData = await fetchMarketData();

      // ストアに保存
      store.setMarketData({
        nikkei: {
          symbol: "N225",
          value: Math.round(marketData.nikkei.price),
          change: `${
            marketData.nikkei.change_percent >= 0 ? "+" : ""
          }${marketData.nikkei.change_percent.toFixed(1)}%`,
          trend: marketData.nikkei.change_percent >= 0 ? "up" : "down",
        },
        sp500: {
          symbol: "SPX",
          value: Math.round(marketData.sp500.price),
          change: `${
            marketData.sp500.change_percent >= 0 ? "+" : ""
          }${marketData.sp500.change_percent.toFixed(1)}%`,
          trend: marketData.sp500.change_percent >= 0 ? "up" : "down",
        },
        nasdaq: {
          symbol: "IXIC",
          value: Math.round(marketData.nasdaq.price),
          change: `${
            marketData.nasdaq.change_percent >= 0 ? "+" : ""
          }${marketData.nasdaq.change_percent.toFixed(1)}%`,
          trend: marketData.nasdaq.change_percent >= 0 ? "up" : "down",
        },
      });

      console.log(
        `✅ Updated market data at ${new Date().toLocaleTimeString()}`
      );
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [store]);

  useEffect(() => {
    if (!enabled) return;

    // 初回データ取得（1秒遅延してレート制限を回避）
    const initialTimeout = setTimeout(fetchData, 1000);

    // 定期更新（2分ごと - レート制限を考慮）
    intervalRef.current = window.setInterval(fetchData, 120000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, fetchData]);

  return {
    refetch: fetchData,
  };
}
