import { invoke } from "@tauri-apps/api/core";
import {
  StockData,
  CompanyProfile,
  NewsSentiment,
  NewsArticle,
} from "../types";

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

/**
 * Alpha Vantage APIでリアルタイム株価を取得（レート制限が緩い）
 * 日本株: 7203.TYO (トヨタ)、9984.TYO (ソフトバンク)
 * 米国株: AAPL、NVDA など
 */
export async function fetchStockQuoteAlphaVantage(
  symbol: string
): Promise<StockQuote> {
  try {
    const quote = await invoke<StockQuote>("fetch_stock_quote_alpha_vantage", {
      symbol,
    });
    return quote;
  } catch (error) {
    console.error(
      `Failed to fetch quote from Alpha Vantage for ${symbol}:`,
      error
    );
    throw new Error(`株価データの取得に失敗しました: ${symbol}`);
  }
}

/**
 * Alpha Vantage APIで株価履歴データを取得
 */
export async function fetchStockHistoryAlphaVantage(
  symbol: string,
  period: string = "1mo"
): Promise<StockData[]> {
  try {
    const history = await invoke<StockDataPoint[]>(
      "fetch_stock_history_alpha_vantage",
      {
        symbol,
        period,
      }
    );

    return history.map((point) => ({
      time: point.time,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
  } catch (error) {
    console.error(
      `Failed to fetch history from Alpha Vantage for ${symbol}:`,
      error
    );
    throw new Error(`履歴データの取得に失敗しました: ${symbol}`);
  }
}

/**
 * リアルタイム株価を取得
 */
export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const quote = await invoke<StockQuote>("fetch_stock_quote", { symbol });
    return quote;
  } catch (error) {
    console.error(`Failed to fetch quote for ${symbol}:`, error);
    throw new Error(`株価データの取得に失敗しました: ${symbol}`);
  }
}

/**
 * 株価履歴データを取得
 * @param symbol 銘柄シンボル
 * @param period 期間 (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
 */
export async function fetchStockHistory(
  symbol: string,
  period: string = "1mo"
): Promise<StockData[]> {
  try {
    const history = await invoke<StockDataPoint[]>("fetch_stock_history", {
      symbol,
      period,
    });

    // StockDataPoint[] を StockData[] に変換
    return history.map((point) => ({
      time: point.time,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
  } catch (error) {
    console.error(`Failed to fetch history for ${symbol}:`, error);
    throw new Error(`履歴データの取得に失敗しました: ${symbol}`);
  }
}

/**
 * 複数銘柄の株価を一括取得
 */
export async function fetchMultipleQuotes(
  symbols: string[]
): Promise<StockQuote[]> {
  try {
    const quotes = await invoke<StockQuote[]>("fetch_multiple_quotes", {
      symbols,
    });
    return quotes;
  } catch (error) {
    console.error("Failed to fetch multiple quotes:", error);
    throw new Error("複数銘柄データの取得に失敗しました");
  }
}

/**
 * 市場データを取得(日経、S&P500、NASDAQ)
 * エラーが発生した場合は個別にフォールバックデータを使用
 * レート制限回避のため順次取得
 */
export async function fetchMarketData(): Promise<{
  nikkei: StockQuote;
  sp500: StockQuote;
  nasdaq: StockQuote;
}> {
  const result = {
    nikkei: createEmptyQuote("^N225"),
    sp500: createEmptyQuote("^GSPC"),
    nasdaq: createEmptyQuote("^IXIC"),
  };

  // レート制限を避けるため、複数銘柄一括取得を使用
  try {
    const quotes = await fetchMultipleQuotes(["^N225", "^GSPC", "^IXIC"]);

    quotes.forEach((quote) => {
      if (quote.symbol === "^N225") result.nikkei = quote;
      else if (quote.symbol === "^GSPC") result.sp500 = quote;
      else if (quote.symbol === "^IXIC") result.nasdaq = quote;
    });
  } catch (error) {
    console.error("Failed to fetch market data:", error);
    // エラーでも空データを返す（フォールバック）
  }

  return result;
}

/**
 * エラー時のフォールバック用空データ
 */
function createEmptyQuote(symbol: string): StockQuote {
  return {
    symbol,
    price: 0,
    change: 0,
    change_percent: 0,
    volume: 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 市場が開いているかチェック（簡易版）
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();

  // 土日は休場
  if (day === 0 || day === 6) {
    return false;
  }

  // 平日の9:30-16:00を開場時間とする（米国市場の例）
  // 実際はタイムゾーンや祝日を考慮する必要がある
  return hours >= 9 && hours < 16;
}

/**
 * 次の更新までの推奨待機時間（ミリ秒）
 */
export function getRecommendedUpdateInterval(): number {
  return isMarketOpen() ? 30000 : 300000; // 開場中30秒、閉場中5分
}

/**
 * Finnhub APIから企業プロフィールを取得（セクター・業種情報含む）
 */
export async function fetchCompanyProfile(
  symbol: string
): Promise<CompanyProfile> {
  try {
    const profile = await invoke<CompanyProfile>(
      "fetch_company_profile_finnhub",
      { symbol }
    );
    return profile;
  } catch (error) {
    console.error(`Failed to fetch company profile for ${symbol}:`, error);
    throw new Error(`企業情報の取得に失敗しました: ${symbol}`);
  }
}

/**
 * Finnhub APIからニュースセンチメントを取得（注目度・期待度の指標）
 */
export async function fetchNewsSentiment(
  symbol: string
): Promise<NewsSentiment> {
  try {
    const sentiment = await invoke<NewsSentiment>(
      "fetch_news_sentiment_finnhub",
      { symbol }
    );
    return sentiment;
  } catch (error) {
    console.error(`Failed to fetch news sentiment for ${symbol}:`, error);
    throw new Error(`センチメント情報の取得に失敗しました: ${symbol}`);
  }
}

/**
 * Finnhub APIから企業ニュースを取得
 * @param symbol 銘柄シンボル
 * @param from 開始日 (YYYY-MM-DD)
 * @param to 終了日 (YYYY-MM-DD)
 */
export async function fetchCompanyNews(
  symbol: string,
  from: string,
  to: string
): Promise<NewsArticle[]> {
  try {
    const news = await invoke<NewsArticle[]>("fetch_company_news_finnhub", {
      symbol,
      from,
      to,
    });
    return news;
  } catch (error) {
    console.error(`Failed to fetch company news for ${symbol}:`, error);
    throw new Error(`ニュースの取得に失敗しました: ${symbol}`);
  }
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
 * 日本株の企業プロフィールを取得（Pythonスクリプト経由）
 * yfinanceを使用するため無料で利用可能
 */
export async function fetchJapaneseStockProfile(
  symbol: string
): Promise<CompanyProfile> {
  try {
    const profile = await invoke<CompanyProfile>(
      "fetch_japanese_stock_profile",
      { symbol }
    );
    return profile;
  } catch (error) {
    console.error(
      `Failed to fetch Japanese stock profile for ${symbol}:`,
      error
    );
    throw new Error(`日本株企業情報の取得に失敗しました: ${symbol}`);
  }
}

/**
 * 日本株のニュースセンチメントを取得（Pythonスクリプト経由）
 */
export async function fetchJapaneseStockSentiment(
  symbol: string
): Promise<NewsSentiment> {
  try {
    const sentiment = await invoke<NewsSentiment>(
      "fetch_japanese_stock_sentiment",
      { symbol }
    );
    return sentiment;
  } catch (error) {
    console.error(
      `Failed to fetch Japanese stock sentiment for ${symbol}:`,
      error
    );
    throw new Error(`日本株センチメント情報の取得に失敗しました: ${symbol}`);
  }
}

/**
 * 日本株の企業プロフィールを複合手法（API + スクレイピング）で取得
 * より安定したデータ取得を実現
 */
export async function fetchJapaneseStockProfileHybrid(
  symbol: string
): Promise<CompanyProfile> {
  try {
    const profile = await invoke<CompanyProfile>(
      "fetch_japanese_stock_profile_hybrid",
      { symbol }
    );
    return profile;
  } catch (error) {
    console.error(
      `Failed to fetch Japanese stock profile (hybrid) for ${symbol}:`,
      error
    );
    throw new Error(
      `日本株企業情報の取得に失敗しました（複合手法）: ${symbol}`
    );
  }
}

/**
 * 日本株のセンチメントを複合手法（API + スクレイピング）で取得
 */
export async function fetchJapaneseStockSentimentHybrid(
  symbol: string
): Promise<NewsSentiment> {
  try {
    const sentiment = await invoke<NewsSentiment>(
      "fetch_japanese_stock_sentiment_hybrid",
      { symbol }
    );
    return sentiment;
  } catch (error) {
    console.error(
      `Failed to fetch Japanese stock sentiment (hybrid) for ${symbol}:`,
      error
    );
    throw new Error(
      `日本株センチメント情報の取得に失敗しました（複合手法）: ${symbol}`
    );
  }
}

/**
 * 日本株の包括的な情報を取得（拡張版）
 * プロフィール、株価、説明、財務指標、ニュース、チャートデータを含む
 */
export async function fetchJapaneseStockComprehensive(
  symbol: string
): Promise<any> {
  try {
    const data = await invoke<any>("fetch_japanese_stock_comprehensive", {
      symbol,
    });
    return data;
  } catch (error) {
    console.error(
      `Failed to fetch comprehensive Japanese stock data for ${symbol}:`,
      error
    );
    throw new Error(`日本株包括情報の取得に失敗しました: ${symbol}`);
  }
}

/**
 * 日本株の現在価格を取得
 */
export async function fetchJapaneseStockPrice(symbol: string): Promise<any> {
  try {
    const priceData = await invoke<any>("fetch_japanese_stock_price", {
      symbol,
    });
    return priceData;
  } catch (error) {
    console.error(`Failed to fetch Japanese stock price for ${symbol}:`, error);
    throw new Error(`日本株価格の取得に失敗しました: ${symbol}`);
  }
}

/**
 * 日本株のチャートデータを取得
 */
export async function fetchJapaneseStockChart(symbol: string): Promise<any> {
  try {
    const chartData = await invoke<any>("fetch_japanese_stock_chart", {
      symbol,
    });
    return chartData;
  } catch (error) {
    console.error(`Failed to fetch Japanese stock chart for ${symbol}:`, error);
    throw new Error(`日本株チャートの取得に失敗しました: ${symbol}`);
  }
}
