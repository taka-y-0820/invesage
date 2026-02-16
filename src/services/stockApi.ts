import { invoke } from "@tauri-apps/api/core";
import {
  StockData,
  CompanyProfile,
  NewsSentiment,
  NewsArticle,
} from "../types";
import { withRetry, isRetryableError } from "../utils/retry";
import {
  cachedFetch,
  stockQuoteCache,
  stockHistoryCache,
  companyProfileCache,
  newsSentimentCache,
  newsArticleCache,
} from "../utils/cache";
import {
  yahooFinanceBreaker,
  finnhubBreaker,
  tdnetBreaker,
} from "../utils/circuitBreaker";
import { useApiKeyStore } from "../store/useApiKeyStore";

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  timestamp: string;
}

export interface StockDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** リトライ共通オプション */
const retryOptions = {
  maxRetries: 2,
  baseDelay: 1500,
  shouldRetry: isRetryableError,
  onRetry: (error: unknown, attempt: number, delay: number) => {
    console.warn(
      `[stockApi] リトライ ${attempt}回目 (${delay}ms後): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  },
};

/**
 * リアルタイム株価を取得（Yahoo Finance経由）
 * - キャッシュ: 1分 TTL
 * - リトライ: 最大2回 + 指数バックオフ
 * - サーキットブレーカー: 5回連続失敗で60秒停止
 */
export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  return cachedFetch(stockQuoteCache, `quote:${symbol}`, () =>
    yahooFinanceBreaker.execute(() =>
      withRetry(
        () => invoke<StockQuote>("fetch_stock_quote", { symbol }),
        retryOptions
      )
    )
  ).catch((error) => {
    console.error(`Failed to fetch quote for ${symbol}:`, error);
    throw new Error(
      `株価データの取得に失敗しました: ${symbol} - ${extractErrorMessage(error)}`
    );
  });
}

/**
 * 株価履歴データを取得
 * - キャッシュ: 5分 TTL
 * - リトライ: 最大2回
 */
export async function fetchStockHistory(
  symbol: string,
  period: string = "1mo"
): Promise<StockData[]> {
  const cacheKey = `history:${symbol}:${period}`;

  return cachedFetch(stockHistoryCache, cacheKey, () =>
    yahooFinanceBreaker.execute(() =>
      withRetry(
        async () => {
          const history = await invoke<StockDataPoint[]>(
            "fetch_stock_history",
            { symbol, period }
          );
          return history.map((point) => ({
            time: point.time,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            volume: point.volume,
          }));
        },
        retryOptions
      )
    )
  ).catch((error) => {
    console.error(`Failed to fetch history for ${symbol}:`, error);
    throw new Error(
      `履歴データの取得に失敗しました: ${symbol} - ${extractErrorMessage(error)}`
    );
  });
}

/**
 * 複数銘柄の株価を一括取得
 * - バックエンド側で2秒間隔のレート制限回避済み
 * - リトライ: 一括取得全体をリトライ
 */
export async function fetchMultipleQuotes(
  symbols: string[]
): Promise<StockQuote[]> {
  try {
    return await yahooFinanceBreaker.execute(() =>
      withRetry(
        () => invoke<StockQuote[]>("fetch_multiple_quotes", { symbols }),
        { ...retryOptions, maxRetries: 1 }
      )
    );
  } catch (error) {
    console.error("Failed to fetch multiple quotes:", error);
    throw new Error(
      `複数銘柄データの取得に失敗しました - ${extractErrorMessage(error)}`
    );
  }
}

/**
 * セクターヒートマップ用：複数銘柄の株価をバッチ取得
 */
export async function fetchSectorQuotes(
  symbols: string[]
): Promise<StockQuote[]> {
  try {
    return await yahooFinanceBreaker.execute(() =>
      withRetry(
        () => invoke<StockQuote[]>("fetch_sector_quotes", { symbols }),
        { ...retryOptions, maxRetries: 1 }
      )
    );
  } catch (error) {
    console.error("Failed to fetch sector quotes:", error);
    throw new Error(
      `セクター銘柄データの取得に失敗しました - ${extractErrorMessage(error)}`
    );
  }
}

/**
 * Finnhub APIから企業ニュースを取得
 * - キャッシュ: 5分 TTL
 * - リトライ: 最大2回
 */
export async function fetchCompanyNews(
  symbol: string,
  from: string,
  to: string
): Promise<NewsArticle[]> {
  const cacheKey = `news:${symbol}:${from}:${to}`;
  const apiKey = useApiKeyStore.getState().finnhubApiKey;

  return cachedFetch(newsArticleCache, cacheKey, () =>
    finnhubBreaker.execute(() =>
      withRetry(
        () => {
          // APIキーが設定されている場合は新しいコマンドを使用
          if (apiKey && apiKey !== "demo") {
            return invoke<NewsArticle[]>("fetch_company_news_finnhub_with_key", {
              symbol,
              from,
              to,
              apiKey,
            });
          }
          // 互換性のため、APIキーがない場合は既存のコマンドを使用
          return invoke<NewsArticle[]>("fetch_company_news_finnhub", {
            symbol,
            from,
            to,
          });
        },
        retryOptions
      )
    )
  ).catch((error) => {
    console.error(`Failed to fetch company news for ${symbol}:`, error);
    throw new Error(
      `ニュースの取得に失敗しました: ${symbol} - ${extractErrorMessage(error)}`
    );
  });
}

/**
 * 注目度レベルを計算（buzz volumeから判定）
 */
export function calculateAttentionLevel(
  buzzVolume: number
): "low" | "medium" | "high" {
  if (buzzVolume >= 50) return "high";
  if (buzzVolume >= 20) return "medium";
  return "low";
}

/**
 * 日本株の企業プロフィールを複合手法（API + スクレイピング）で取得
 * - キャッシュ: 30分 TTL
 * - リトライ: 最大2回
 * - サーキットブレーカー: TDnet用（3回失敗で120秒停止）
 */
export async function fetchJapaneseStockProfileHybrid(
  symbol: string
): Promise<CompanyProfile> {
  return cachedFetch(companyProfileCache, `profile:${symbol}`, () =>
    tdnetBreaker.execute(() =>
      withRetry(
        () =>
          invoke<CompanyProfile>("fetch_japanese_stock_profile_hybrid", {
            symbol,
          }),
        { ...retryOptions, maxRetries: 1 }
      )
    )
  ).catch((error) => {
    console.error(
      `Failed to fetch Japanese stock profile (hybrid) for ${symbol}:`,
      error
    );
    throw new Error(
      `日本株企業情報の取得に失敗しました（複合手法）: ${symbol} - ${extractErrorMessage(error)}`
    );
  });
}

/**
 * 日本株のセンチメントを複合手法（API + スクレイピング）で取得
 * - キャッシュ: 10分 TTL
 */
export async function fetchJapaneseStockSentimentHybrid(
  symbol: string
): Promise<NewsSentiment> {
  return cachedFetch(newsSentimentCache, `sentiment:${symbol}`, () =>
    tdnetBreaker.execute(() =>
      withRetry(
        () =>
          invoke<NewsSentiment>("fetch_japanese_stock_sentiment_hybrid", {
            symbol,
          }),
        { ...retryOptions, maxRetries: 1 }
      )
    )
  ).catch((error) => {
    console.error(
      `Failed to fetch Japanese stock sentiment (hybrid) for ${symbol}:`,
      error
    );
    throw new Error(
      `日本株センチメント情報の取得に失敗しました（複合手法）: ${symbol} - ${extractErrorMessage(error)}`
    );
  });
}

/**
 * 日本株の包括的な情報を取得（拡張版）
 */
export async function fetchJapaneseStockComprehensive(
  symbol: string
): Promise<any> {
  try {
    return await tdnetBreaker.execute(() =>
      withRetry(
        () =>
          invoke<any>("fetch_japanese_stock_comprehensive", { symbol }),
        { ...retryOptions, maxRetries: 1 }
      )
    );
  } catch (error) {
    console.error(
      `Failed to fetch comprehensive Japanese stock data for ${symbol}:`,
      error
    );
    throw new Error(
      `日本株包括情報の取得に失敗しました: ${symbol} - ${extractErrorMessage(error)}`
    );
  }
}

/**
 * 日本株の現在価格を取得
 */
export async function fetchJapaneseStockPrice(symbol: string): Promise<any> {
  return cachedFetch(stockQuoteCache, `jp-price:${symbol}`, () =>
    tdnetBreaker.execute(() =>
      withRetry(
        () => invoke<any>("fetch_japanese_stock_price", { symbol }),
        retryOptions
      )
    )
  ).catch((error) => {
    console.error(
      `Failed to fetch Japanese stock price for ${symbol}:`,
      error
    );
    throw new Error(
      `日本株価格の取得に失敗しました: ${symbol} - ${extractErrorMessage(error)}`
    );
  });
}

/**
 * 日本株のチャートデータを取得
 */
export async function fetchJapaneseStockChart(symbol: string): Promise<any> {
  return cachedFetch(stockHistoryCache, `jp-chart:${symbol}`, () =>
    tdnetBreaker.execute(() =>
      withRetry(
        () => invoke<any>("fetch_japanese_stock_chart", { symbol }),
        retryOptions
      )
    )
  ).catch((error) => {
    console.error(
      `Failed to fetch Japanese stock chart for ${symbol}:`,
      error
    );
    throw new Error(
      `日本株チャートの取得に失敗しました: ${symbol} - ${extractErrorMessage(error)}`
    );
  });
}

/**
 * エラーオブジェクトからメッセージを抽出するヘルパー
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // サーキットブレーカーのエラーはそのまま表示
    if (error.name === "CircuitOpenError") {
      return error.message;
    }
    return error.message;
  }
  if (typeof error === "string") return error;
  return "不明なエラー";
}
