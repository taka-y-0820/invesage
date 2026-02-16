import { invoke } from "@tauri-apps/api/core";
import { EarningsCalendarEvent } from "../../types";
import { withRetry, isRetryableError } from "../../utils/retry";
import { cachedFetch, earningsCalendarCache } from "../../utils/cache";
import { finnhubBreaker } from "../../utils/circuitBreaker";
import { useApiKeyStore } from "../../store/useApiKeyStore";

/**
 * 決算カレンダーサービス
 * Finnhub APIから決算発表日カレンダーを取得し、
 * ウォッチリスト銘柄でフィルタリングする
 */

/** Tauri バックエンドからの決算カレンダー応答 */
interface EarningsCalendarRawItem {
  symbol: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  hour: string;
  quarter: number;
  year: number;
}

/**
 * 指定期間の決算カレンダーを取得
 */
export async function fetchEarningsCalendar(
  from: string,
  to: string
): Promise<EarningsCalendarEvent[]> {
  const cacheKey = `earnings:${from}:${to}`;
  const apiKey = useApiKeyStore.getState().finnhubApiKey;

  return cachedFetch(earningsCalendarCache, cacheKey, async () => {
    try {
      const items = await finnhubBreaker.execute(() =>
        withRetry(
          () => {
            // APIキーが設定されている場合は新しいコマンドを使用
            if (apiKey && apiKey !== "demo") {
              return invoke<EarningsCalendarRawItem[]>("fetch_earnings_calendar_with_key", {
                from,
                to,
                apiKey,
              });
            }
            // 互換性のため、APIキーがない場合は既存のコマンドを使用
            return invoke<EarningsCalendarRawItem[]>("fetch_earnings_calendar", {
              from,
              to,
            });
          },
          { maxRetries: 2, baseDelay: 1500, shouldRetry: isRetryableError }
        )
      );

      return items.map((item) => ({
        symbol: item.symbol,
        companyName: item.symbol,
        date: item.date,
        fiscalPeriod:
          item.year && item.quarter
            ? `${item.year}Q${item.quarter}`
            : `${item.year}FY`,
        estimate: item.epsEstimate ?? undefined,
        actual: item.epsActual ?? undefined,
        revenueEstimate: item.revenueEstimate ?? undefined,
        revenueActual: item.revenueActual ?? undefined,
        hour: (item.hour as EarningsCalendarEvent["hour"]) || "",
      }));
    } catch (error) {
      console.error("決算カレンダーの取得に失敗しました:", error);
      throw error;
    }
  });
}

/**
 * ウォッチリスト銘柄の決算カレンダーを取得
 */
export async function fetchWatchlistEarnings(
  watchlist: string[],
  from: string,
  to: string
): Promise<EarningsCalendarEvent[]> {
  const allEvents = await fetchEarningsCalendar(from, to);

  // ウォッチリスト銘柄でフィルタ
  const watchlistSet = new Set(
    watchlist.map((s) => s.replace(".T", "").toUpperCase())
  );

  return allEvents.filter((event) => {
    const normalizedSymbol = event.symbol.replace(".T", "").toUpperCase();
    return watchlistSet.has(normalizedSymbol);
  });
}

/**
 * 月の開始日と終了日を計算
 */
export function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

/**
 * 決算発表タイミングの日本語ラベル
 */
export function getEarningsHourLabel(hour: string): string {
  switch (hour) {
    case "bmo":
      return "寄付前";
    case "amc":
      return "引け後";
    case "dmh":
      return "取引時間中";
    default:
      return "";
  }
}
