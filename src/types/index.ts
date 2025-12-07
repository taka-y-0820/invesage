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
