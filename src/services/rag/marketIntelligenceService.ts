/**
 * 市場インテリジェンスサービス
 * RAG、X、ニュース、AIエージェントを統合した包括的な情報収集・分析システム
 */

import type {
  AnalyzedInformation,
  AIMarketReport,
  RAGQuery,
  RAGSearchResult,
  DataSource
} from '../../types';
import { ragService } from './ragService';
import { twitterService } from './sources/twitterService';
import { newsAggregatorService } from './sources/newsAggregatorService';
import { aiAnalysisService } from './aiAnalysisService';
import { cache } from '../../utils/cache';

interface MarketIntelligenceConfig {
  enableRealTimeMonitoring: boolean;
  monitoringIntervals: {
    twitter: number;    // ミリ秒
    news: number;       // ミリ秒
    aiAnalysis: number; // ミリ秒
  };
  alertThresholds: {
    sentimentChange: number;      // センチメント変化閾値
    volumeSpike: number;          // ボリューム急増閾値
    credibilityMinimum: number;   // 最低信頼性スコア
  };
}

interface MarketAlert {
  id: string;
  type: 'sentiment_spike' | 'volume_surge' | 'breaking_news' | 'technical_signal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  symbol?: string;
  title: string;
  description: string;
  information: AnalyzedInformation;
  createdAt: string;
  isRead: boolean;
}

interface RealTimeMarketData {
  lastUpdated: string;
  overallSentiment: number;
  sentimentTrend: 'rising' | 'falling' | 'stable';
  activeAlerts: MarketAlert[];
  trendingSymbols: Array<{
    symbol: string;
    name: string;
    sentiment: number;
    mentionCount: number;
    changePercent: number;
  }>;
  topNews: AnalyzedInformation[];
  marketInsights: string[];
}

class MarketIntelligenceService {
  private readonly config: MarketIntelligenceConfig;
  private readonly cachePrefix = 'market_intelligence';
  private monitoringIntervals: Record<string, NodeJS.Timeout> = {};
  private lastSentiment = 0;

  constructor() {
    this.config = {
      enableRealTimeMonitoring: true,
      monitoringIntervals: {
        twitter: 60 * 1000,      // 1分
        news: 5 * 60 * 1000,     // 5分
        aiAnalysis: 15 * 60 * 1000 // 15分
      },
      alertThresholds: {
        sentimentChange: 0.3,     // 30%のセンチメント変化
        volumeSpike: 5.0,         // 5倍のボリューム増加
        credibilityMinimum: 0.7   // 70%以上の信頼性
      }
    };
  }

  /**
   * 包括的な市場インテリジェンス取得
   */
  async getComprehensiveMarketIntelligence(symbols?: string[]): Promise<{
    marketReport: AIMarketReport;
    realTimeData: RealTimeMarketData;
    searchResults: RAGSearchResult;
  }> {
    const cacheKey = `${this.cachePrefix}:comprehensive:${symbols?.join(',') || 'general'}`;

    try {
      // 並列で情報収集
      const [marketReport, realTimeData, searchResults] = await Promise.all([
        this.generateMarketReport(symbols),
        this.getRealTimeMarketData(symbols),
        this.searchMarketInformation(symbols)
      ]);

      const result = {
        marketReport,
        realTimeData,
        searchResults
      };

      // 短時間キャッシュ
      cache.set(cacheKey, result, 5 * 60 * 1000); // 5分

      return result;
    } catch (error) {
      console.error('Comprehensive market intelligence failed:', error);
      throw new Error('市場インテリジェンスの取得に失敗しました');
    }
  }

  /**
   * 市場情報検索
   */
  async searchMarketInformation(symbols?: string[]): Promise<RAGSearchResult> {
    const query: RAGQuery = {
      text: symbols ?
        `${symbols.join(' ')} 株価 決算 ニュース 分析` :
        '日本株 市場動向 経済指標',
      symbols,
      limit: 50
    };

    return ragService.search(query);
  }

  /**
   * AIマーケットレポート生成
   */
  async generateMarketReport(symbols?: string[]): Promise<AIMarketReport> {
    return ragService.generateMarketReport(symbols);
  }

  /**
   * リアルタイム市場データ取得
   */
  async getRealTimeMarketData(symbols?: string[]): Promise<RealTimeMarketData> {
    const cacheKey = `${this.cachePrefix}:realtime:${symbols?.join(',') || 'general'}`;

    const cached = cache.get<RealTimeMarketData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // リアルタイム情報を並列収集
      const [
        sentimentData,
        trendingSymbols,
        topNews,
        activeAlerts
      ] = await Promise.all([
        ragService.getRealtimeMarketSentiment(),
        this.getTrendingSymbols(symbols),
        this.getTopMarketNews(),
        this.getActiveAlerts()
      ]);

      const data: RealTimeMarketData = {
        lastUpdated: new Date().toISOString(),
        overallSentiment: sentimentData.overallSentiment,
        sentimentTrend: this.calculateSentimentTrend(sentimentData.overallSentiment),
        activeAlerts,
        trendingSymbols,
        topNews,
        marketInsights: sentimentData.trendingTopics
      };

      // 2分キャッシュ
      cache.set(cacheKey, data, 2 * 60 * 1000);

      return data;
    } catch (error) {
      console.error('Real-time market data failed:', error);
      return this.getFallbackRealTimeData();
    }
  }

  /**
   * 特定銘柄の詳細分析
   */
  async analyzeStock(symbol: string): Promise<{
    stockAnalysis: any;
    relatedNews: AnalyzedInformation[];
    socialSentiment: any;
    aiInsights: string[];
  }> {
    try {
      const [
        stockAnalysis,
        relatedNews,
        socialSentiment
      ] = await Promise.all([
        ragService.analyzeStock(symbol),
        newsAggregatorService.getStockNews(symbol),
        twitterService.getStockMentions(symbol)
      ]);

      // AI分析実行
      const aiInsights = await aiAnalysisService.extractTrendingTopics(
        relatedNews.map(news => ({
          ...news,
          relatedSymbols: [symbol],
          tags: [],
          id: news.id || 'unknown',
          source: news.source as DataSource,
          impact: 'medium' as const,
          credibility: 0.8
        }))
      );

      return {
        stockAnalysis,
        relatedNews,
        socialSentiment: {
          posts: socialSentiment,
          overallSentiment: socialSentiment.reduce((sum, post) =>
            sum + twitterService.calculateCredibilityScore(post), 0) / socialSentiment.length || 0
        },
        aiInsights
      };
    } catch (error) {
      console.error(`Stock analysis failed for ${symbol}:`, error);
      throw new Error(`${symbol} の分析に失敗しました`);
    }
  }

  /**
   * リアルタイム監視開始
   */
  startRealTimeMonitoring(): void {
    if (!this.config.enableRealTimeMonitoring) {
      return;
    }

    console.log('Starting real-time market monitoring...');

    // Twitter監視
    this.monitoringIntervals.twitter = setInterval(async () => {
      try {
        await this.monitorTwitterSentiment();
      } catch (error) {
        console.error('Twitter monitoring error:', error);
      }
    }, this.config.monitoringIntervals.twitter);

    // ニュース監視
    this.monitoringIntervals.news = setInterval(async () => {
      try {
        await this.monitorNewsUpdates();
      } catch (error) {
        console.error('News monitoring error:', error);
      }
    }, this.config.monitoringIntervals.news);

    // AI分析定期実行
    this.monitoringIntervals.aiAnalysis = setInterval(async () => {
      try {
        await this.runPeriodicAnalysis();
      } catch (error) {
        console.error('AI analysis error:', error);
      }
    }, this.config.monitoringIntervals.aiAnalysis);
  }

  /**
   * リアルタイム監視停止
   */
  stopRealTimeMonitoring(): void {
    console.log('Stopping real-time market monitoring...');

    Object.values(this.monitoringIntervals).forEach(interval => {
      clearInterval(interval);
    });

    this.monitoringIntervals = {};
  }

  /**
   * トレンド銘柄取得
   */
  private async getTrendingSymbols(symbols?: string[]): Promise<any[]> {
    try {
      const trendingPosts = await twitterService.getTrendingStockPosts();
      const mentionCounts: Record<string, number> = {};

      // 銘柄メンション数をカウント
      trendingPosts.forEach(post => {
        const extractedSymbols = twitterService.extractStockSymbols(post.text);
        extractedSymbols.forEach(symbol => {
          mentionCounts[symbol] = (mentionCounts[symbol] || 0) + 1;
        });
      });

      // 上位10銘柄を抽出
      const topSymbols = Object.entries(mentionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      return topSymbols.map(([symbol, count]) => ({
        symbol,
        name: this.getCompanyName(symbol),
        sentiment: 0, // 実際は計算
        mentionCount: count,
        changePercent: 0 // 実際は株価データから計算
      }));
    } catch (error) {
      console.error('Trending symbols fetch failed:', error);
      return [];
    }
  }

  /**
   * トップニュース取得
   */
  private async getTopMarketNews(): Promise<AnalyzedInformation[]> {
    try {
      const marketNews = await newsAggregatorService.getMarketNews();

      return marketNews.slice(0, 10).map(news => ({
        id: news.id,
        source: news.source as DataSource,
        title: news.title,
        content: news.content,
        sentiment: news.sentiment,
        credibility: 0.8,
        impact: 'medium' as const,
        publishedAt: news.publishedAt,
        url: news.url,
        author: news.author,
        tags: [news.category].filter(Boolean),
        relatedSymbols: news.relatedSymbols
      }));
    } catch (error) {
      console.error('Top market news fetch failed:', error);
      return [];
    }
  }

  /**
   * アクティブアラート取得
   */
  private async getActiveAlerts(): Promise<MarketAlert[]> {
    // 実装：アラート履歴から未読のものを取得
    // 現在はダミーデータ
    return [];
  }

  /**
   * センチメントトレンド計算
   */
  private calculateSentimentTrend(currentSentiment: number): 'rising' | 'falling' | 'stable' {
    const change = currentSentiment - this.lastSentiment;
    const threshold = 0.1;

    if (Math.abs(change) < threshold) {
      return 'stable';
    }

    this.lastSentiment = currentSentiment;
    return change > 0 ? 'rising' : 'falling';
  }

  /**
   * Twitter センチメント監視
   */
  private async monitorTwitterSentiment(): Promise<void> {
    const surgePosts = await twitterService.getSurgeRelatedPosts();

    for (const post of surgePosts) {
      const credibility = twitterService.calculateCredibilityScore(post);

      if (credibility > this.config.alertThresholds.credibilityMinimum) {
        // 高信頼性投稿のアラート生成
        await this.createAlert({
          type: 'sentiment_spike',
          severity: 'medium',
          title: '注目投稿を検知',
          description: post.text.slice(0, 100),
          information: this.convertTwitterPostToAnalyzed(post)
        });
      }
    }
  }

  /**
   * ニュース更新監視
   */
  private async monitorNewsUpdates(): Promise<void> {
    const latestNews = await newsAggregatorService.getMarketNews();
    const recentNews = latestNews.filter(news => {
      const hoursSincePublished = (Date.now() - new Date(news.publishedAt).getTime()) / (1000 * 60 * 60);
      return hoursSincePublished < 1; // 1時間以内のニュース
    });

    for (const news of recentNews) {
      if (Math.abs(news.sentiment) > 0.5) {
        await this.createAlert({
          type: 'breaking_news',
          severity: 'high',
          title: '重要ニュース',
          description: news.title,
          information: this.convertNewsToAnalyzed(news)
        });
      }
    }
  }

  /**
   * 定期AI分析実行
   */
  private async runPeriodicAnalysis(): Promise<void> {
    try {
      const marketReport = await this.generateMarketReport();
      // レポート結果をもとにアラート生成などの処理
      console.log('Periodic AI analysis completed:', marketReport.title);
    } catch (error) {
      console.error('Periodic AI analysis failed:', error);
    }
  }

  /**
   * アラート生成
   */
  private async createAlert(alertData: Omit<MarketAlert, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
    const alert: MarketAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
      ...alertData
    };

    // アラートをキャッシュまたはデータベースに保存
    const alertsKey = `${this.cachePrefix}:alerts`;
    const existingAlerts = cache.get<MarketAlert[]>(alertsKey) || [];
    existingAlerts.unshift(alert);

    // 最大100件までに制限
    const limitedAlerts = existingAlerts.slice(0, 100);
    cache.set(alertsKey, limitedAlerts, 24 * 60 * 60 * 1000); // 24時間

    console.log(`Market alert created: ${alert.title}`);
  }

  /**
   * ユーティリティメソッド
   */
  private getCompanyName(symbol: string): string {
    const companyMap: Record<string, string> = {
      '7203.T': 'トヨタ自動車',
      '9984.T': 'ソフトバンクグループ',
      '6758.T': 'ソニーグループ',
      '7974.T': '任天堂',
      '8035.T': '東京エレクトロン'
    };
    return companyMap[symbol] || symbol.replace('.T', '');
  }

  private convertTwitterPostToAnalyzed(post: any): AnalyzedInformation {
    return {
      id: post.id,
      source: 'twitter',
      title: post.text.slice(0, 50),
      content: post.text,
      sentiment: 0,
      credibility: twitterService.calculateCredibilityScore(post),
      impact: 'medium',
      publishedAt: post.publishedAt,
      url: `https://twitter.com/i/status/${post.id}`,
      author: post.author?.displayName,
      tags: post.hashtags || [],
      relatedSymbols: twitterService.extractStockSymbols(post.text)
    };
  }

  private convertNewsToAnalyzed(news: any): AnalyzedInformation {
    return {
      id: news.id,
      source: news.source,
      title: news.title,
      content: news.content,
      sentiment: news.sentiment,
      credibility: 0.8,
      impact: 'high',
      publishedAt: news.publishedAt,
      url: news.url,
      author: news.author,
      tags: [news.category].filter(Boolean),
      relatedSymbols: news.relatedSymbols || []
    };
  }

  private getFallbackRealTimeData(): RealTimeMarketData {
    return {
      lastUpdated: new Date().toISOString(),
      overallSentiment: 0,
      sentimentTrend: 'stable',
      activeAlerts: [],
      trendingSymbols: [],
      topNews: [],
      marketInsights: ['市場データを取得中...']
    };
  }
}

export const marketIntelligenceService = new MarketIntelligenceService();