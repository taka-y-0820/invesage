import { useState, useEffect, useRef } from "react";
import { JapanSurgeMonitor } from "../services/realtime/japanSurgeMonitor";
import {
  SurgeScannerService,
  type SurgeStock,
} from "../services/scanner/surgeScannerService";

interface UseJapanSurgeMonitorOptions {
  enabled?: boolean;
  interval?: number;
  threshold?: number;
}

export const useJapanSurgeMonitor = (
  apiKey: string,
  options: UseJapanSurgeMonitorOptions = {}
) => {
  const { enabled = true, interval = 60000, threshold = 5 } = options;

  const [surgeStocks, setSurgeStocks] = useState<SurgeStock[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const monitorRef = useRef<JapanSurgeMonitor | null>(null);

  useEffect(() => {
    if (!enabled || !apiKey) {
      return;
    }

    // サービスの初期化
    const scanner = new SurgeScannerService(apiKey);
    const monitor = new JapanSurgeMonitor(scanner);
    monitorRef.current = monitor;

    // 監視開始
    setIsMonitoring(true);
    monitor.start(
      (stock) => {
        setSurgeStocks((prev) => {
          // 既存の銘柄を更新または追加
          const index = prev.findIndex((s) => s.symbol === stock.symbol);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = stock;
            return updated;
          }
          return [stock, ...prev];
        });
      },
      {
        interval,
        threshold,
        onError: (err) => {
          setError(err);
          console.error("Japan surge monitor error:", err);
        },
      }
    );

    // クリーンアップ
    return () => {
      monitor.stop();
      setIsMonitoring(false);
    };
  }, [apiKey, enabled, interval, threshold]);

  const clearStocks = () => {
    setSurgeStocks([]);
    monitorRef.current?.reset();
  };

  return {
    surgeStocks,
    isMonitoring,
    error,
    clearStocks,
  };
};
