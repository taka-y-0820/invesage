import { invoke } from "@tauri-apps/api/core";
import {
  CompanyIRInfo,
  IRRelease,
  EarningsData,
  DividendInfo,
  IRCategory,
} from "../../types";

/**
 * IR情報取得サービス
 * TDnet（適時開示情報伝達システム）やFinnhubからIR情報を取得する
 */

/** Finnhub の earnings カレンダー応答 */
interface FinnhubEarnings {
  actual?: number;
  estimate?: number;
  period: string;
  quarter?: number;
  surprise?: number;
  surprisePercent?: number;
  symbol: string;
  year?: number;
}

/** Finnhub の basic financials 応答 */
interface FinnhubBasicFinancials {
  metric: {
    "10DayAverageTradingVolume"?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    dividendYieldIndicatedAnnual?: number;
    epsAnnual?: number;
    epsGrowth3Y?: number;
    epsGrowthTTMYoy?: number;
    payoutRatioAnnual?: number;
    revenueGrowth3Y?: number;
    revenueGrowthTTMYoy?: number;
    roaRfy?: number;
    roeRfy?: number;
    [key: string]: number | undefined;
  };
}

/**
 * 銘柄が日本株かどうかを判定
 */
function isJapaneseStock(symbol: string): boolean {
  return /\.(T|OS|NK|SA)$/.test(symbol) || /^\d{4}$/.test(symbol);
}

/**
 * 日本株のシンボルを正規化（4桁コードに .T を付与）
 */
function normalizeJapaneseSymbol(symbol: string): string {
  if (/^\d{4}$/.test(symbol)) {
    return `${symbol}.T`;
  }
  return symbol;
}

/**
 * Finnhub APIから決算データを取得
 */
async function fetchEarningsFromFinnhub(
  symbol: string
): Promise<EarningsData[]> {
  try {
    const data = await invoke<FinnhubEarnings[]>("fetch_earnings_finnhub", {
      symbol,
    });

    return data.map((item) => ({
      period: `${item.year ?? ""}Q${item.quarter ?? ""}`,
      periodLabel: item.period,
      eps: item.actual ?? item.estimate,
      isEstimate: item.actual === undefined || item.actual === null,
    }));
  } catch (error) {
    console.error(`Failed to fetch earnings from Finnhub for ${symbol}:`, error);
    return [];
  }
}

/**
 * Finnhub APIから財務指標を取得
 */
async function fetchFinancialsFromFinnhub(
  symbol: string
): Promise<{ dividendYield?: number; payoutRatio?: number; eps?: number }> {
  try {
    const data = await invoke<FinnhubBasicFinancials>(
      "fetch_basic_financials_finnhub",
      { symbol }
    );

    return {
      dividendYield: data.metric?.dividendYieldIndicatedAnnual,
      payoutRatio: data.metric?.payoutRatioAnnual,
      eps: data.metric?.epsAnnual,
    };
  } catch (error) {
    console.error(
      `Failed to fetch financials from Finnhub for ${symbol}:`,
      error
    );
    return {};
  }
}

/**
 * 日本株のIR情報をTauri バックエンド経由で取得
 */
async function fetchJapaneseIRInfo(
  symbol: string
): Promise<CompanyIRInfo | null> {
  const normalizedSymbol = normalizeJapaneseSymbol(symbol);
  try {
    const irInfo = await invoke<CompanyIRInfo>("fetch_japanese_ir_info", {
      symbol: normalizedSymbol,
    });
    return irInfo;
  } catch (error) {
    console.error(
      `Failed to fetch Japanese IR info for ${normalizedSymbol}:`,
      error
    );
    return null;
  }
}

/**
 * Finnhubの企業ニュースからIRリリースを分類・抽出
 */
function classifyNewsAsIR(
  news: Array<{
    category: string;
    datetime: number;
    headline: string;
    id: number;
    source: string;
    summary: string;
    url: string;
  }>
): IRRelease[] {
  const irKeywords: Record<IRCategory, string[]> = {
    earnings: [
      "earnings", "quarterly", "revenue", "profit", "loss", "financial results",
      "決算", "業績", "売上", "利益", "損益",
    ],
    guidance: [
      "guidance", "forecast", "outlook", "expects", "projection",
      "予想", "見通し", "ガイダンス", "修正",
    ],
    dividend: [
      "dividend", "payout", "distribution",
      "配当", "分配",
    ],
    shareholder: [
      "buyback", "repurchase", "shareholder", "AGM", "annual meeting",
      "株主", "自社株買い", "総会",
    ],
    corporate: [
      "governance", "board", "director", "officer", "ESG",
      "ガバナンス", "取締役", "役員",
    ],
    disclosure: [
      "disclosure", "filing", "SEC", "regulatory",
      "開示", "届出", "適時開示",
    ],
    presentation: [
      "presentation", "investor day", "conference", "briefing",
      "説明会", "プレゼン",
    ],
    other: [],
  };

  return news
    .filter((item) => {
      const text = `${item.headline} ${item.summary}`.toLowerCase();
      return Object.values(irKeywords).some((keywords) =>
        keywords.some((kw) => text.includes(kw.toLowerCase()))
      );
    })
    .map((item) => {
      const text = `${item.headline} ${item.summary}`.toLowerCase();
      let category: IRCategory = "other";

      for (const [cat, keywords] of Object.entries(irKeywords)) {
        if (cat === "other") continue;
        if (keywords.some((kw) => text.includes(kw.toLowerCase()))) {
          category = cat as IRCategory;
          break;
        }
      }

      return {
        id: String(item.id),
        title: item.headline,
        category,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        summary: item.summary,
        url: item.url,
        source: item.source,
      };
    });
}

/**
 * 企業のIR情報を統合的に取得
 * 日本株の場合はTDnet等から、米国株の場合はFinnhub APIから取得
 */
export async function fetchCompanyIRInfo(
  symbol: string,
  companyName?: string
): Promise<CompanyIRInfo> {
  const isJP = isJapaneseStock(symbol);

  if (isJP) {
    // 日本株：バックエンド経由でIR情報を取得
    const irInfo = await fetchJapaneseIRInfo(symbol);
    if (irInfo) {
      return irInfo;
    }
    // フォールバック: 空のIR情報を返す
    return createEmptyIRInfo(symbol, companyName);
  }

  // 米国株：Finnhub APIから取得
  const [earnings, financials, newsData] = await Promise.all([
    fetchEarningsFromFinnhub(symbol),
    fetchFinancialsFromFinnhub(symbol),
    fetchCompanyNewsForIR(symbol),
  ]);

  const irReleases = classifyNewsAsIR(newsData);

  const dividend: DividendInfo | undefined = financials.dividendYield
    ? {
        fiscalYear: new Date().getFullYear().toString(),
        dividendYield: financials.dividendYield,
        payoutRatio: financials.payoutRatio,
      }
    : undefined;

  return {
    symbol,
    companyName: companyName || symbol,
    lastUpdated: new Date().toISOString(),
    irReleases,
    earnings,
    dividend,
    nextEarningsDate: undefined,
    irPageUrl: undefined,
    fiscalYearEnd: undefined,
  };
}

/**
 * 企業ニュースを取得（IR分類用）
 */
async function fetchCompanyNewsForIR(
  symbol: string
): Promise<
  Array<{
    category: string;
    datetime: number;
    headline: string;
    id: number;
    source: string;
    summary: string;
    url: string;
  }>
> {
  try {
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const news = await invoke<
      Array<{
        category: string;
        datetime: number;
        headline: string;
        id: number;
        image: string;
        related: string;
        source: string;
        summary: string;
        url: string;
      }>
    >("fetch_company_news_finnhub", { symbol, from, to });

    return news;
  } catch (error) {
    console.error(`Failed to fetch company news for IR (${symbol}):`, error);
    return [];
  }
}

/**
 * 空のIR情報を生成（フォールバック用）
 */
function createEmptyIRInfo(
  symbol: string,
  companyName?: string
): CompanyIRInfo {
  return {
    symbol,
    companyName: companyName || symbol,
    lastUpdated: new Date().toISOString(),
    irReleases: [],
    earnings: [],
    dividend: undefined,
    nextEarningsDate: undefined,
    irPageUrl: undefined,
    fiscalYearEnd: undefined,
  };
}

/**
 * IRカテゴリの日本語ラベルを取得
 */
export function getIRCategoryLabel(category: IRCategory): string {
  const labels: Record<IRCategory, string> = {
    earnings: "決算情報",
    guidance: "業績予想",
    dividend: "配当情報",
    shareholder: "株主向け",
    corporate: "ガバナンス",
    disclosure: "適時開示",
    presentation: "説明会",
    other: "その他",
  };
  return labels[category];
}

/**
 * IRカテゴリのカラーを取得
 */
export function getIRCategoryColor(category: IRCategory): string {
  const colors: Record<IRCategory, string> = {
    earnings: "#2563eb",
    guidance: "#7c3aed",
    dividend: "#059669",
    shareholder: "#d97706",
    corporate: "#6b7280",
    disclosure: "#dc2626",
    presentation: "#0891b2",
    other: "#9ca3af",
  };
  return colors[category];
}
