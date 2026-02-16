import { useEffect, useRef, useCallback } from "react";
import { useStockStore } from "../store/useStockStore";
import {
  fetchStockHistory,
  fetchStockQuote,
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
      const data = await fetchStockHistory(symbol, "3mo");

      // テクニカル分析を実行
      const signals = TechnicalAnalyzer.analyzeStock(data);

      // ストアに保存
      store.setCurrentStock(symbol, data, signals);

      console.log(`Updated ${symbol} at ${new Date().toLocaleTimeString()}`);
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

    // 定期更新の設定（2分ごと）
    intervalRef.current = window.setInterval(fetchData, 120000);

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
 * 市場データ（日経指数）の自動更新フック
 */
export function useMarketDataUpdater(enabled: boolean = true) {
  const store = useStockStore();
  const intervalRef = useRef<number | null>(null);
  const isLoadingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;

    try {
      const nikkeiQuote = await fetchStockQuote("^N225");

      store.setMarketData({
        nikkei: {
          symbol: "N225",
          value: Math.round(nikkeiQuote.price),
          change: `${
            nikkeiQuote.change_percent >= 0 ? "+" : ""
          }${nikkeiQuote.change_percent.toFixed(1)}%`,
          trend: nikkeiQuote.change_percent >= 0 ? "up" : "down",
        },
      });

      console.log(
        `Updated market data at ${new Date().toLocaleTimeString()}`
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
    isLoading: isLoadingRef.current,
  };
}
