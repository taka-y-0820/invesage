/**
 * AIエージェントによる情報分析・要約サービス
 * OpenAI GPT-4o-mini を使用して収集した情報を分析・要約
 */

import type {
  AnalyzedInformation,
  AIMarketReport,
  NewsArticleExtended,
  TwitterPost
} from '../../types';
import { cache } from '../../utils/cache';

interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StockAnalysisResult {
  sentiment: number;
  recommendation: 'buy' | 'sell' | 'hold';
  insights: string[];
  riskFactors: string[];
  opportunities: string[];
  targetPrice?: number;
  confidence: number;
}

class AIAnalysisService {
  private readonly config: OpenAIConfig;
  private readonly cachePrefix = 'ai_analysis';
  private readonly defaultCacheTTL = 30 * 60 * 1000; // 30分

  constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini'
    };
  }

  /**
   * 市場分析レポート生成
   */
  async generateMarketReport(
    information: AnalyzedInformation[],
    targetSymbols?: string[]
  ): Promise<AIMarketReport> {
    const cacheKey = `${this.cachePrefix}:market_report:${targetSymbols?.join(',') || 'general'}`;

    const cached = cache.get<AIMarketReport>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.createMarketReportPrompt(information, targetSymbols);
      const response = await this.callOpenAI(prompt);

      const report = this.parseMarketReportResponse(response, information, targetSymbols);

      // キャッシュに保存
      cache.set(cacheKey, report, this.defaultCacheTTL);

      return report;
    } catch (error) {
      console.error('Market report generation failed:', error);
      return this.getFallbackMarketReport(targetSymbols);
    }
  }

  /**
   * 個別銘柄分析
   */
  async analyzeStock(symbol: string, information: AnalyzedInformation[]): Promise<StockAnalysisResult> {
    const cacheKey = `${this.cachePrefix}:stock_analysis:${symbol}`;

    const cached = cache.get<StockAnalysisResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.createStockAnalysisPrompt(symbol, information);
      const response = await this.callOpenAI(prompt);

      const analysis = this.parseStockAnalysisResponse(response);

      // キャッシュに保存
      cache.set(cacheKey, analysis, this.defaultCacheTTL);

      return analysis;
    } catch (error) {
      console.error('Stock analysis failed:', error);
      return this.getFallbackStockAnalysis(symbol);
    }
  }

  /**
   * センチメント分析
   */
  async analyzeSentiment(text: string): Promise<number> {
    try {
      const prompt = this.createSentimentPrompt(text);
      const response = await this.callOpenAI(prompt);

      // レスポンスから数値を抽出
      const sentimentMatch = response.match(/-?\d+\.?\d*/);
      if (sentimentMatch) {
        const sentiment = parseFloat(sentimentMatch[0]);
        return Math.max(-1, Math.min(1, sentiment)); // -1から1の範囲に制限
      }

      return 0; // デフォルトはニュートラル
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return 0;
    }
  }

  /**
   * 情報要約
   */
  async summarizeInformation(information: AnalyzedInformation[]): Promise<string> {
    try {
      const prompt = this.createSummaryPrompt(information);
      const response = await this.callOpenAI(prompt);

      return response.trim();
    } catch (error) {
      console.error('Information summarization failed:', error);
      return '要約の生成に失敗しました。';
    }
  }

  /**
   * 全体センチメント計算
   */
  async calculateOverallSentiment(information: AnalyzedInformation[]): Promise<number> {
    if (information.length === 0) return 0;

    // 情報の影響度と信頼性を重み付けして計算
    let totalWeight = 0;
    let weightedSentiment = 0;

    for (const info of information) {
      const weight = this.calculateInformationWeight(info);
      totalWeight += weight;
      weightedSentiment += info.sentiment * weight;
    }

    return totalWeight > 0 ? weightedSentiment / totalWeight : 0;
  }

  /**
   * トレンドトピック抽出
   */
  async extractTrendingTopics(information: AnalyzedInformation[]): Promise<string[]> {
    try {
      const prompt = this.createTopicExtractionPrompt(information);
      const response = await this.callOpenAI(prompt);

      // レスポンスからトピックリストを抽出
      const topics = response
        .split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(topic => topic.length > 0)
        .slice(0, 10); // 上位10件

      return topics;
    } catch (error) {
      console.error('Topic extraction failed:', error);
      return ['市場動向', '決算発表', '業績予想'];
    }
  }

  /**
   * 関連銘柄抽出
   */
  async extractRelatedSymbols(text: string): Promise<string[]> {
    try {
      const prompt = this.createSymbolExtractionPrompt(text);
      const response = await this.callOpenAI(prompt);

      const symbols = response
        .split('\n')
        .map(line => line.trim())
        .filter(symbol => /^[0-9]{4}\.T$/.test(symbol))
        .slice(0, 5);

      return symbols;
    } catch (error) {
      console.error('Symbol extraction failed:', error);
      return [];
    }
  }

  /**
   * OpenAI API呼び出し
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '日本の株式市場専門のアナリストとして、正確で実用的な分析を提供してください。回答は日本語で行い、具体的な数値や根拠を含めてください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIResponse = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid OpenAI response format');
    }

    return data.choices[0].message.content;
  }

  /**
   * 市場レポートプロンプト作成
   */
  private createMarketReportPrompt(information: AnalyzedInformation[], symbols?: string[]): string {
    const infoSummary = information
      .slice(0, 20) // 上位20件
      .map(info => `[${info.source}] ${info.title}: ${info.content.slice(0, 200)}`)
      .join('\n\n');

    return `
以下の情報を基に、日本株市場の包括的な分析レポートを作成してください：

【対象銘柄】
${symbols?.join(', ') || '日本株全体'}

【収集情報】
${infoSummary}

【分析項目】
1. 市場全体の概況とセンチメント（-1から1のスコア）
2. ボラティリティ評価（低・中・高）
3. 重要イベントの特定
4. セクター別分析（主要セクターのトレンドと要因）
5. 個別銘柄の投資推奨（買い・売り・保有）とその理由
6. リスク要因と機会の特定
7. 分析の信頼度（0から1）

JSON形式で以下の構造で回答してください：
{
  "marketOverview": {
    "summary": "市場概況の要約",
    "sentiment": センチメントスコア,
    "volatility": "ボラティリティレベル",
    "keyEvents": ["重要イベント1", "重要イベント2"]
  },
  "sectorAnalysis": [
    {
      "sector": "セクター名",
      "sentiment": センチメントスコア,
      "trend": "トレンド",
      "keyFactors": ["要因1", "要因2"]
    }
  ],
  "stockInsights": [
    {
      "symbol": "銘柄コード",
      "name": "企業名",
      "sentiment": センチメントスコア,
      "recommendation": "投資推奨",
      "reasoning": "推奨理由",
      "riskFactors": ["リスク1", "リスク2"],
      "opportunities": ["機会1", "機会2"]
    }
  ],
  "confidence": 信頼度スコア
}`;
  }

  /**
   * 個別銘柄分析プロンプト作成
   */
  private createStockAnalysisPrompt(symbol: string, information: AnalyzedInformation[]): string {
    const relevantInfo = information
      .filter(info => info.relatedSymbols.includes(symbol) || info.content.includes(symbol))
      .slice(0, 10)
      .map(info => `${info.title}: ${info.content.slice(0, 300)}`)
      .join('\n\n');

    return `
銘柄 ${symbol} について、以下の情報を基に詳細分析を行ってください：

【関連情報】
${relevantInfo}

【分析項目】
1. センチメント分析（-1から1）
2. 投資推奨（buy/sell/hold）
3. 主要な分析ポイント（3-5項目）
4. リスク要因
5. 投資機会
6. 目標株価（可能であれば）
7. 分析の信頼度

JSON形式で回答：
{
  "sentiment": センチメントスコア,
  "recommendation": "投資推奨",
  "insights": ["洞察1", "洞察2", "洞察3"],
  "riskFactors": ["リスク1", "リスク2"],
  "opportunities": ["機会1", "機会2"],
  "targetPrice": 目標株価または null,
  "confidence": 信頼度
}`;
  }

  /**
   * センチメント分析プロンプト
   */
  private createSentimentPrompt(text: string): string {
    return `
以下のテキストの投資・株式に関するセンチメントを分析し、-1（非常にネガティブ）から1（非常にポジティブ）のスコアで評価してください。

テキスト: "${text}"

数値のみで回答してください（例: 0.3, -0.7）：`;
  }

  /**
   * 要約プロンプト作成
   */
  private createSummaryPrompt(information: AnalyzedInformation[]): string {
    const allContent = information
      .slice(0, 15)
      .map(info => info.content)
      .join('\n\n');

    return `
以下の株式関連情報を200文字程度で要約してください：

${allContent}

重要なポイントを整理し、投資家にとって有用な情報を中心にまとめてください。`;
  }

  /**
   * トピック抽出プロンプト
   */
  private createTopicExtractionPrompt(information: AnalyzedInformation[]): string {
    const titles = information
      .slice(0, 30)
      .map(info => info.title)
      .join('\n');

    return `
以下のニュースタイトルから、株式投資に関連するトレンドトピックを5-10個抽出してください：

${titles}

各行に1つずつ、番号付きリストで回答してください：`;
  }

  /**
   * 銘柄抽出プロンプト
   */
  private createSymbolExtractionPrompt(text: string): string {
    return `
以下のテキストから日本株の銘柄コード（4桁数字.T形式）を抽出してください：

"${text}"

見つかった銘柄コードを1行に1つずつ記載してください：`;
  }

  /**
   * 市場レポートレスポンス解析
   */
  private parseMarketReportResponse(
    response: string,
    information: AnalyzedInformation[],
    symbols?: string[]
  ): AIMarketReport {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          id: this.generateReportId(),
          title: `AI市場分析レポート - ${new Date().toLocaleDateString()}`,
          executedAt: new Date().toISOString(),
          symbols: symbols || [],
          marketOverview: parsed.marketOverview || {
            summary: '市場分析を実行しました',
            sentiment: 0,
            volatility: 'medium' as const,
            keyEvents: []
          },
          sectorAnalysis: parsed.sectorAnalysis || [],
          stockInsights: parsed.stockInsights || [],
          sources: [...new Set(information.map(info => info.source))],
          confidence: parsed.confidence || 0.5
        };
      }
    } catch (error) {
      console.error('Failed to parse market report response:', error);
    }

    return this.getFallbackMarketReport(symbols);
  }

  /**
   * 個別銘柄分析レスポンス解析
   */
  private parseStockAnalysisResponse(response: string): StockAnalysisResult {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          sentiment: parsed.sentiment || 0,
          recommendation: parsed.recommendation || 'hold',
          insights: parsed.insights || [],
          riskFactors: parsed.riskFactors || [],
          opportunities: parsed.opportunities || [],
          targetPrice: parsed.targetPrice,
          confidence: parsed.confidence || 0.5
        };
      }
    } catch (error) {
      console.error('Failed to parse stock analysis response:', error);
    }

    return this.getFallbackStockAnalysis();
  }

  /**
   * 情報の重要度計算
   */
  private calculateInformationWeight(info: AnalyzedInformation): number {
    let weight = 0.5; // ベース重み

    // 影響度による重み付け
    switch (info.impact) {
      case 'high': weight += 0.3; break;
      case 'medium': weight += 0.1; break;
      case 'low': weight -= 0.1; break;
    }

    // 信頼性による重み付け
    weight += info.credibility * 0.2;

    // ソースによる重み付け
    const sourceWeights: Record<string, number> = {
      'nikkei': 0.2,
      'yahoo_news': 0.15,
      'finnhub': 0.1,
      'twitter': 0.05,
      'kabutan': 0.1,
      'minkabu': 0.1
    };
    weight += sourceWeights[info.source] || 0;

    return Math.max(0.1, Math.min(1.0, weight));
  }

  /**
   * フォールバック用レポート
   */
  private getFallbackMarketReport(symbols?: string[]): AIMarketReport {
    return {
      id: this.generateReportId(),
      title: 'AI市場分析レポート（簡易版）',
      executedAt: new Date().toISOString(),
      symbols: symbols || [],
      marketOverview: {
        summary: '市場は現在、様々な要因により変動しています。詳細な分析を継続中です。',
        sentiment: 0,
        volatility: 'medium' as const,
        keyEvents: ['市場の動向を監視中']
      },
      sectorAnalysis: [],
      stockInsights: [],
      sources: ['fallback'],
      confidence: 0.3
    };
  }

  /**
   * フォールバック用個別分析
   */
  private getFallbackStockAnalysis(symbol?: string): StockAnalysisResult {
    return {
      sentiment: 0,
      recommendation: 'hold',
      insights: [`${symbol || '対象銘柄'} の分析を継続中です`],
      riskFactors: ['市場の不確実性'],
      opportunities: ['詳細分析により判明予定'],
      confidence: 0.3
    };
  }

  /**
   * レポートID生成
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const aiAnalysisService = new AIAnalysisService();