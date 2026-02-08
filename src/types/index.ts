export interface StockData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSignal {
  type: "volume_spike" | "breakout" | "pattern" | "momentum";
  strength: "weak" | "moderate" | "strong";
  description: string;
  timestamp: string;
}

export interface FundamentalData {
  symbol: string;
  companyName: string;
  sector: string;
  aiExposure: number; // 成長ポテンシャル 0-100
  revenue: number;
  marketCap: number;
  peRatio: number;
  recentNews: string[];
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  shareOutstanding: number;
  industry: string;
  sector: string; // セクター情報
  weburl: string;
  logo: string;
  phone: string;
}

export interface NewsSentiment {
  symbol: string;
  sentiment: number; // -1 to 1 (ネガティブからポジティブ)
  buzzVolume: number; // ニュースの量（注目度）
  companyNewsScore: number; // 0-1
  sectorAverageBullishPercent: number;
  sectorAverageNewsScore: number;
}

export interface NewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface ScreeningResult {
  symbol: string;
  companyName: string;
  technicalScore: number;
  fundamentalScore: number;
  overallScore: number;
  signals: TechnicalSignal[];
  category: string;
  sector: string;
  marketCap: number;
  priceChange24h: number;
  volumeChange24h: number;
  // 新しく追加: 注目度・期待度指標
  sentimentScore?: number; // -1 to 1
  buzzVolume?: number; // ニュースボリューム
  attentionLevel?: "low" | "medium" | "high"; // 注目度レベル
}

export interface AnalysisResult {
  symbol: string;
  technicalScore: number; // 0-100
  fundamentalScore: number; // 0-100
  overallScore: number; // 0-100
  signals: TechnicalSignal[];
  recommendation: "buy" | "hold" | "sell";
}

// ============================================================================
// IR情報（Investor Relations）関連の型定義
// ============================================================================

/** IR情報のカテゴリ */
export type IRCategory =
  | "earnings"        // 決算情報
  | "guidance"        // 業績予想・ガイダンス
  | "dividend"        // 配当情報
  | "shareholder"     // 株主向け情報
  | "corporate"       // コーポレートガバナンス
  | "disclosure"      // 適時開示
  | "presentation"    // 説明会資料
  | "other";          // その他

/** 個別のIRリリース項目 */
export interface IRRelease {
  id: string;
  title: string;
  category: IRCategory;
  publishedAt: string;       // ISO 8601 日時
  summary?: string;
  url?: string;              // PDFやページへのリンク
  source: string;            // 情報ソース (TDnet, 企業サイト等)
}

/** 決算データ（四半期・通期） */
export interface EarningsData {
  period: string;            // "2024Q3", "2024FY" 等
  periodLabel: string;       // "2024年3月期 第3四半期" 等
  revenue?: number;          // 売上高（百万円）
  operatingIncome?: number;  // 営業利益（百万円）
  netIncome?: number;        // 純利益（百万円）
  eps?: number;              // 一株当たり利益（円）
  revenueYoY?: number;      // 売上高前年同期比（%）
  operatingIncomeYoY?: number;
  netIncomeYoY?: number;
  isEstimate: boolean;       // 予想値かどうか
}

/** 配当情報 */
export interface DividendInfo {
  fiscalYear: string;        // "2024" 等
  interimDividend?: number;  // 中間配当（円）
  finalDividend?: number;    // 期末配当（円）
  annualDividend?: number;   // 年間配当（円）
  dividendYield?: number;    // 配当利回り（%）
  payoutRatio?: number;      // 配当性向（%）
  exDividendDate?: string;   // 権利落ち日
  recordDate?: string;       // 基準日
}

/** 企業のIR情報まとめ */
export interface CompanyIRInfo {
  symbol: string;
  companyName: string;
  lastUpdated: string;       // 最終更新日時
  irReleases: IRRelease[];   // IR開示一覧
  earnings: EarningsData[];  // 決算データ（直近数期分）
  dividend?: DividendInfo;   // 配当情報
  nextEarningsDate?: string; // 次回決算発表日
  irPageUrl?: string;        // IR情報ページURL
  fiscalYearEnd?: string;    // 決算月 ("3月" 等)
}
