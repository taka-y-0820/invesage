/**
 * RAG (Retrieval-Augmented Generation) 分析サービス
 * ニュース記事を基にAIが株価変動の原因を分析
 */

import OpenAI from "openai";
import type { NewsArticle } from "../news/newsSearchService";

export interface SurgeAnalysis {
  reason: string;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number; // 0-100
  keyFactors: string[];
  relatedNews: string[];
}

export interface StockComparison {
  summary: string;
  winners: string[];
  losers: string[];
  sectorTrend: "positive" | "negative" | "mixed";
}

export interface PortfolioAdvice {
  advice: string;
  riskLevel: "low" | "medium" | "medium-high" | "high";
  suggestions: string[];
}

interface PortfolioPosition {
  symbol: string;
  shares: number;
  avgCost: number;
}

interface StockChange {
  symbol: string;
  changePercent: number;
}

export class RAGAnalysisService {
  private openai: OpenAI | null = null;
  private model = "gpt-4o-mini"; // gpt-4o-mini は安価で高速

  constructor(apiKey: string) {
    // ブラウザ環境でのOpenAI使用は推奨されないため、
    // 本番環境ではTauriバックエンドで実装すべき
    if (apiKey && apiKey !== '') {
      try {
        this.openai = new OpenAI({ 
          apiKey,
          dangerouslyAllowBrowser: true // 開発用のみ
        });
      } catch (error) {
        console.warn('OpenAI initialization failed:', error);
      }
    }
  }

  /**
   * 急騰・急落の原因を分析
   */
  async analyzeSurgeReason(
    symbol: string,
    news: NewsArticle[],
    changePercent: number
  ): Promise<SurgeAnalysis> {
    // OpenAIが利用できない場合は基本的な分析を返す
    if (!this.openai) {
      return {
        reason: 'AI分析は利用できません（OpenAI APIキーが未設定）',
        sentiment: changePercent > 0 ? 'positive' : 'negative',
        confidence: 0,
        keyFactors: [],
        relatedNews: news.slice(0, 3).map(n => n.headline)
      };
    }

    const direction = changePercent > 0 ? "急騰" : "急落";
    const newsContext =
      news.length > 0
        ? news
            .map(
              (article) =>
                `- ${article.headline} (${article.source})\n  ${article.summary}`
            )
            .join("\n\n")
        : "ニュース情報なし";

    const prompt = `
銘柄: ${symbol}
価格変動: ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%

最近のニュース:
${newsContext}

上記の情報を基に、${symbol}が${direction}した理由を分析してください。
以下のJSON形式で回答してください:

{
  "reason": "主な原因を1-2文で簡潔に",
  "sentiment": "positive/negative/neutral",
  "confidence": 信頼度(0-100),
  "keyFactors": ["要因1", "要因2", ...],
  "relatedNews": ["関連ニュースのタイトル1", ...]
}

ニュース情報がない場合でも、市場全体のトレンドや一般的な要因を推測してください。
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `あなたは経験豊富な金融アナリストです。
株価の急激な変動の原因をニュース記事から分析し、投資家に分かりやすく説明します。
必ず指定されたJSON形式で回答してください。`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // 低めで一貫性を重視
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      const analysis: SurgeAnalysis = JSON.parse(content);
      return analysis;
    } catch (error) {
      console.error("Failed to analyze surge reason:", error);
      throw error;
    }
  }

  /**
   * 複数銘柄の比較分析
   */
  async compareStocks(stocks: StockChange[]): Promise<StockComparison> {
    if (!this.openai) {
      return {
        summary: 'AI分析は利用できません',
        winners: stocks.filter(s => s.changePercent > 0).map(s => s.symbol),
        losers: stocks.filter(s => s.changePercent < 0).map(s => s.symbol),
        sectorTrend: 'mixed'
      };
    }

    const stockList = stocks
      .map(
        (s) =>
          `${s.symbol}: ${
            s.changePercent > 0 ? "+" : ""
          }${s.changePercent.toFixed(2)}%`
      )
      .join("\n");

    const prompt = `
以下の銘柄の本日の値動きを分析してください:

${stockList}

JSON形式で回答:
{
  "summary": "全体的なトレンドの要約",
  "winners": ["上昇銘柄1", ...],
  "losers": ["下落銘柄1", ...],
  "sectorTrend": "positive/negative/mixed"
}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "金融アナリストとして、複数銘柄の値動きから市場トレンドを分析します。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to compare stocks:", error);
      throw error;
    }
  }

  /**
   * ポートフォリオのリスク分析とアドバイス
   */
  async analyzePortfolio(
    portfolio: PortfolioPosition[]
  ): Promise<PortfolioAdvice> {
    if (!this.openai) {
      return {
        advice: 'AI分析は利用できません（OpenAI APIキーが未設定）',
        riskLevel: 'medium',
        suggestions: []
      };
    }

    const positions = portfolio
      .map((p) => `${p.symbol}: ${p.shares}株 (平均取得単価: $${p.avgCost})`)
      .join("\n");

    const prompt = `
以下のポートフォリオを分析してください:

${positions}

JSON形式で回答:
{
  "advice": "総合的なアドバイス",
  "riskLevel": "low/medium/medium-high/high",
  "suggestions": ["提案1", "提案2", ...]
}

セクター分散、リスク管理、改善点を含めてください。
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "ファイナンシャルアドバイザーとして、ポートフォリオの分析とリスク評価を行います。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to analyze portfolio:", error);
      throw error;
    }
  }

  /**
   * ニュースの感情分析（複数記事）
   */
  async analyzeSentiment(news: NewsArticle[]): Promise<{
    overall: "bullish" | "bearish" | "neutral";
    score: number; // -100 to 100
    breakdown: { positive: number; negative: number; neutral: number };
  }> {
    if (!this.openai) {
      return {
        overall: 'neutral',
        score: 0,
        breakdown: { positive: 33, negative: 33, neutral: 34 }
      };
    }

    const headlines = news.map((n) => n.headline).join("\n");

    const prompt = `
以下のニュース見出しから全体的な感情を分析:

${headlines}

JSON形式:
{
  "overall": "bullish/bearish/neutral",
  "score": -100から100の数値,
  "breakdown": {
    "positive": ポジティブな記事の割合(0-100),
    "negative": ネガティブな記事の割合(0-100),
    "neutral": 中立的な記事の割合(0-100)
  }
}
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "ニュース記事の感情分析の専門家です。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to analyze sentiment:", error);
      throw error;
    }
  }
}
