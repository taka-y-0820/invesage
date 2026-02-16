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

// ============================================================================
// 損益管理（Trading Journal）関連の型定義
// ============================================================================

/** 取引の売買方向 */
export type TradeDirection = "long" | "short";

/** 取引の結果ステータス */
export type TradeResult = "win" | "loss" | "even";

/** 個別取引記録 */
export interface Trade {
  id: string;
  date: string;                    // 取引日 (YYYY-MM-DD)
  symbol: string;                  // 銘柄コード (例: "7203.T")
  name: string;                    // 銘柄名 (例: "トヨタ自動車")
  direction: TradeDirection;       // 売買方向
  entryPrice: number;              // エントリー価格
  exitPrice: number;               // エグジット価格
  quantity: number;                // 数量（株数）
  commission: number;              // 手数料
  profitLoss: number;              // 損益（手数料込み）
  profitLossPercent: number;       // 損益率（%）
  result: TradeResult;             // 勝敗
  entryReason?: string;            // エントリー理由
  exitReason?: string;             // エグジット理由
  memo?: string;                   // メモ・反省点
  tags?: string[];                 // タグ（セクター、戦略名等）
  createdAt: string;               // 登録日時 (ISO 8601)
}

/** 日次損益サマリー */
export interface DailySummary {
  date: string;                    // 日付 (YYYY-MM-DD)
  trades: Trade[];                 // その日の取引一覧
  totalProfitLoss: number;         // 合計損益
  winCount: number;                // 勝ちトレード数
  lossCount: number;               // 負けトレード数
  evenCount: number;               // 引き分け数
  winRate: number;                 // 勝率（%）
  maxWin: number;                  // 最大利益
  maxLoss: number;                 // 最大損失
  averageWin: number;              // 平均利益
  averageLoss: number;             // 平均損失
}

/** 月次損益サマリー */
export interface MonthlySummary {
  month: string;                   // 月 (YYYY-MM)
  totalProfitLoss: number;
  tradeCount: number;
  winRate: number;
  tradingDays: number;             // 取引日数
}

/** 振り返り分析データ */
export interface TradeAnalysis {
  totalTrades: number;
  totalProfitLoss: number;
  winRate: number;
  profitFactor: number;            // 総利益 / 総損失
  averageWin: number;
  averageLoss: number;
  maxConsecutiveWins: number;      // 最大連勝数
  maxConsecutiveLosses: number;    // 最大連敗数
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  averageHoldProfitPercent: number; // 平均損益率
  insights: string[];              // 分析からの洞察
}

// ============================================================================
// 決算カレンダー関連の型定義
// ============================================================================

/** 決算カレンダーイベント */
export interface EarningsCalendarEvent {
  symbol: string;              // 銘柄コード
  companyName: string;         // 企業名
  date: string;                // 決算発表日 (YYYY-MM-DD)
  fiscalPeriod: string;        // 決算期間 ("2024Q3", "2024FY" 等)
  estimate?: number;           // EPS予想
  actual?: number;             // EPS実績
  revenueEstimate?: number;    // 売上予想（百万円）
  revenueActual?: number;      // 売上実績（百万円）
  hour?: "bmo" | "amc" | "dmh" | ""; // 発表タイミング (Before Market Open, After Market Close, During Market Hours)
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

// ============================================================================
// RAG（検索拡張生成）& AIエージェント関連の型定義
// ============================================================================

/** 情報源の種類 */
export type DataSource =
  | "twitter"       // X（旧Twitter）
  | "yahoo_news"    // Yahoo!ニュース
  | "nikkei"        // 日経新聞
  | "tradingview"   // TradingView
  | "minkabu"       // みんかぶ
  | "kabutan"       // 株探
  | "tdnet"         // TDnet適時開示
  | "company_ir"    // 企業IR情報
  | "finnhub";      // Finnhub API

/** 収集した情報の分析結果 */
export interface AnalyzedInformation {
  id: string;
  source: DataSource;
  symbol?: string;               // 関連銘柄（特定できる場合）
  title: string;                 // タイトル・見出し
  content: string;               // 本文・コンテンツ
  summary?: string;              // AI生成サマリー
  sentiment: number;             // センチメントスコア (-1 to 1)
  credibility: number;           // 信頼性スコア (0 to 1)
  impact: "low" | "medium" | "high"; // 市場への影響度
  publishedAt: string;           // 公開日時 (ISO 8601)
  url?: string;                  // 元記事URL
  author?: string;               // 投稿者・記者名
  tags: string[];                // タグ（セクター、キーワード等）
  relatedSymbols: string[];      // 関連銘柄一覧
  aiInsights?: string[];         // AIによる洞察・分析
}

/** X（Twitter）投稿情報 */
export interface TwitterPost {
  id: string;
  text: string;
  author: {
    username: string;
    displayName: string;
    isVerified: boolean;
    followerCount?: number;
  };
  metrics: {
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    viewCount?: number;
  };
  publishedAt: string;
  hashtags: string[];
  mentions: string[];
  urls: string[];
  media?: Array<{
    type: "photo" | "video";
    url: string;
  }>;
}

/** ニュース記事情報 */
export interface NewsArticleExtended {
  id: string;
  title: string;
  content: string;
  source: DataSource;
  author?: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  category?: string;              // 経済、政治、企業など
  relatedSymbols: string[];       // 関連銘柄
  summary?: string;               // AI生成サマリー
  sentiment: number;              // センチメント分析結果
  keyPoints: string[];            // 重要ポイント
}

/** RAG検索結果 */
export interface RAGSearchResult {
  query: string;                  // 検索クエリ
  results: AnalyzedInformation[]; // 検索結果
  totalCount: number;             // 総件数
  searchedSources: DataSource[];  // 検索対象ソース
  generatedAt: string;            // 検索実行時刻
  relatedQueries: string[];       // 関連クエリ提案
}

/** AIエージェント分析レポート */
export interface AIMarketReport {
  id: string;
  title: string;
  executedAt: string;             // 実行時刻
  symbols: string[];              // 対象銘柄
  marketOverview: {
    summary: string;              // 市場全体の概況
    sentiment: number;            // 全体センチメント
    volatility: "low" | "medium" | "high";
    keyEvents: string[];          // 重要イベント
  };
  sectorAnalysis: Array<{
    sector: string;
    sentiment: number;
    trend: "bullish" | "bearish" | "neutral";
    keyFactors: string[];
  }>;
  stockInsights: Array<{
    symbol: string;
    name: string;
    sentiment: number;
    recommendation: "buy" | "sell" | "hold";
    reasoning: string;
    riskFactors: string[];
    opportunities: string[];
    targetPrice?: number;
  }>;
  sources: DataSource[];          // 分析に使用した情報源
  confidence: number;             // 分析の信頼度 (0 to 1)
}

/** RAG検索クエリ */
export interface RAGQuery {
  text: string;                   // 検索テキスト
  symbols?: string[];             // 対象銘柄指定
  sources?: DataSource[];         // 検索対象ソース指定
  timeRange?: {
    from: string;                 // 開始日時
    to: string;                   // 終了日時
  };
  sentiment?: "positive" | "negative" | "neutral"; // センチメントフィルター
  limit?: number;                 // 結果件数上限
}
