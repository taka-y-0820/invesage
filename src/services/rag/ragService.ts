/**
 * RAG（Retrieval-Augmented Generation）ベースの情報収集・分析サービス
 * 複数の情報源から株式関連情報を収集し、AIで分析・要約する
 */

import type {
  RAGQuery,
  RAGSearchResult,
  AnalyzedInformation,
  AIMarketReport,
  DataSource
} from '../../types';
import { twitterService } from './sources/twitterService';
import { newsAggregatorService } from './sources/newsAggregatorService';
import { aiAnalysisService } from './aiAnalysisService';
import { cache } from '../../utils/cache';

class RAGService {
  private readonly cachePrefix = 'rag';
  private readonly defaultCacheTTL = 5 * 60 * 1000; // 5分

  /**
   * 複数ソースから情報を検索・収集
   */
  async search(query: RAGQuery): Promise<RAGSearchResult> {
    const cacheKey = `${this.cachePrefix}:search:${this.createQueryHash(query)}`;

    // キャッシュチェック
    const cached = cache.get<RAGSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchPromises: Promise<AnalyzedInformation[]>[] = [];
      const searchedSources: DataSource[] = [];

      // 各ソースからの情報収集
      if (!query.sources || query.sources.includes('twitter')) {
        searchPromises.push(this.searchTwitter(query));
        searchedSources.push('twitter');
      }

      if (!query.sources || query.sources.includes('yahoo_news')) {
        searchPromises.push(this.searchNews(query));
        searchedSources.push('yahoo_news');
      }

      if (!query.sources || query.sources.includes('finnhub')) {
        searchPromises.push(this.searchFinnhub(query));
        searchedSources.push('finnhub');
      }

      // 並列実行
      const allResults = await Promise.allSettled(searchPromises);
      const successfulResults = allResults
        .filter((result): result is PromiseFulfilledResult<AnalyzedInformation[]> =>
          result.status === 'fulfilled'
        )
        .flatMap(result => result.value);

      // 重複除去とランキング
      const uniqueResults = this.deduplicateResults(successfulResults);
      const rankedResults = this.rankResults(uniqueResults, query);

      // 件数制限適用
      const limitedResults = query.limit ? rankedResults.slice(0, query.limit) : rankedResults;

      // 関連クエリ生成
      const relatedQueries = await this.generateRelatedQueries(query, limitedResults);

      const result: RAGSearchResult = {
        query: query.text,
        results: limitedResults,
        totalCount: uniqueResults.length,
        searchedSources,
        generatedAt: new Date().toISOString(),
        relatedQueries
      };

      // キャッシュに保存
      cache.set(cacheKey, result, this.defaultCacheTTL);

      return result;
    } catch (error) {
      console.error('RAG search failed:', error);
      throw new Error(`情報検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * AIエージェントによる市場分析レポート生成
   */
  async generateMarketReport(symbols?: string[]): Promise<AIMarketReport> {
    const cacheKey = `${this.cachePrefix}:report:${symbols?.join(',') || 'general'}`;

    const cached = cache.get<AIMarketReport>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 市場関連の最新情報を収集
      const marketQuery: RAGQuery = {
        text: symbols ?
          `${symbols.join(' ')} 株価 市場動向 決算 ニュース` :
          '日本株 市場動向 経済指標 マーケット ニュース',
        symbols,
        timeRange: {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 過去24時間
          to: new Date().toISOString()
        },
        limit: 50
      };

      const searchResult = await this.search(marketQuery);

      // AI分析実行
      const report = await aiAnalysisService.generateMarketReport(
        searchResult.results,
        symbols
      );

      // キャッシュに保存（15分）
      cache.set(cacheKey, report, 15 * 60 * 1000);

      return report;
    } catch (error) {
      console.error('Market report generation failed:', error);
      throw new Error(`市場分析レポートの生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * 銘柄固有の詳細分析
   */
  async analyzeStock(symbol: string): Promise<{
    stockInfo: AnalyzedInformation[];
    aiInsights: string[];
    sentiment: number;
    recommendation: 'buy' | 'sell' | 'hold';
  }> {
    const query: RAGQuery = {
      text: `${symbol} 株価 業績 ニュース 分析`,
      symbols: [symbol],
      timeRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 過去1週間
        to: new Date().toISOString()
      },
      limit: 20
    };

    const searchResult = await this.search(query);
    const analysis = await aiAnalysisService.analyzeStock(symbol, searchResult.results);

    return {
      stockInfo: searchResult.results,
      aiInsights: analysis.insights,
      sentiment: analysis.sentiment,
      recommendation: analysis.recommendation
    };
  }

  /**
   * リアルタイム市場監視
   */
  async getRealtimeMarketSentiment(): Promise<{
    overallSentiment: number;
    trendingTopics: string[];
    alertPosts: AnalyzedInformation[];
  }> {
    const query: RAGQuery = {
      text: '株価 急騰 急落 買い 売り トレンド',
      sources: ['twitter'],
      timeRange: {
        from: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 過去1時間
        to: new Date().toISOString()
      },
      limit: 100
    };

    const searchResult = await this.search(query);
    const sentiment = await aiAnalysisService.calculateOverallSentiment(searchResult.results);
    const topics = await aiAnalysisService.extractTrendingTopics(searchResult.results);

    // 注意すべき投稿をフィルター
    const alertPosts = searchResult.results.filter(post =>
      post.impact === 'high' ||
      Math.abs(post.sentiment) > 0.7 ||
      post.credibility > 0.8
    );

    return {
      overallSentiment: sentiment,
      trendingTopics: topics,
      alertPosts: alertPosts.slice(0, 10) // 上位10件
    };
  }

  /**
   * Twitter検索
   */
  private async searchTwitter(query: RAGQuery): Promise<AnalyzedInformation[]> {
    try {
      const posts = await twitterService.searchPosts(query);
      return posts.map(post => this.convertTwitterToAnalyzed(post));
    } catch (error) {
      console.error('Twitter search failed:', error);
      return [];
    }
  }

  /**
   * ニュース検索
   */
  private async searchNews(query: RAGQuery): Promise<AnalyzedInformation[]> {
    try {
      const articles = await newsAggregatorService.searchNews(query);
      return articles.map(article => this.convertNewsToAnalyzed(article));
    } catch (error) {
      console.error('News search failed:', error);
      return [];
    }
  }

  /**
   * Finnhub検索
   */
  private async searchFinnhub(query: RAGQuery): Promise<AnalyzedInformation[]> {
    try {
      // Finnhub APIから関連ニュースを取得
      // 実装は既存のサービスを利用
      return [];
    } catch (error) {
      console.error('Finnhub search failed:', error);
      return [];
    }
  }

  /**
   * 検索結果の重複除去
   */
  private deduplicateResults(results: AnalyzedInformation[]): AnalyzedInformation[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.source}:${result.title}:${result.publishedAt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 検索結果のランキング
   */
  private rankResults(results: AnalyzedInformation[], query: RAGQuery): AnalyzedInformation[] {
    return results.sort((a, b) => {
      // 関連度スコア計算
      let scoreA = this.calculateRelevanceScore(a, query);
      let scoreB = this.calculateRelevanceScore(b, query);

      // 信頼性と影響度を加味
      scoreA += a.credibility * 0.3 + this.getImpactScore(a.impact) * 0.2;
      scoreB += b.credibility * 0.3 + this.getImpactScore(b.impact) * 0.2;

      return scoreB - scoreA;
    });
  }

  /**
   * 関連度スコア計算
   */
  private calculateRelevanceScore(info: AnalyzedInformation, query: RAGQuery): number {
    let score = 0;

    // タイトルマッチング
    const titleWords = info.title.toLowerCase().split(' ');
    const queryWords = query.text.toLowerCase().split(' ');
    const titleMatches = titleWords.filter(word =>
      queryWords.some(qword => word.includes(qword) || qword.includes(word))
    ).length;
    score += (titleMatches / titleWords.length) * 0.4;

    // 銘柄マッチング
    if (query.symbols?.length) {
      const symbolMatches = info.relatedSymbols.filter(symbol =>
        query.symbols!.includes(symbol)
      ).length;
      score += (symbolMatches / query.symbols.length) * 0.3;
    }

    // 時系列の新しさ
    const hoursAgo = (Date.now() - new Date(info.publishedAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, (24 - hoursAgo) / 24) * 0.3;

    return score;
  }

  /**
   * 影響度スコア変換
   */
  private getImpactScore(impact: string): number {
    switch (impact) {
      case 'high': return 1.0;
      case 'medium': return 0.6;
      case 'low': return 0.3;
      default: return 0.0;
    }
  }

  /**
   * クエリハッシュ生成
   */
  private createQueryHash(query: RAGQuery): string {
    return btoa(JSON.stringify(query)).slice(0, 16);
  }

  /**
   * Twitter投稿の変換
   */
  private convertTwitterToAnalyzed(post: any): AnalyzedInformation {
    return {
      id: post.id,
      source: 'twitter',
      title: post.text.slice(0, 100) + (post.text.length > 100 ? '...' : ''),
      content: post.text,
      sentiment: 0, // AI分析で後で更新
      credibility: 0.5, // デフォルト値
      impact: 'medium',
      publishedAt: post.publishedAt,
      url: `https://twitter.com/i/status/${post.id}`,
      author: post.author?.displayName,
      tags: post.hashtags || [],
      relatedSymbols: [], // AI分析で抽出
    };
  }

  /**
   * ニュース記事の変換
   */
  private convertNewsToAnalyzed(article: any): AnalyzedInformation {
    return {
      id: article.id,
      source: article.source,
      title: article.title,
      content: article.content || article.summary,
      sentiment: article.sentiment || 0,
      credibility: 0.8, // ニュースソースは高信頼性
      impact: 'medium',
      publishedAt: article.publishedAt,
      url: article.url,
      author: article.author,
      tags: [article.category].filter(Boolean),
      relatedSymbols: article.relatedSymbols || [],
    };
  }

  /**
   * 関連クエリ生成
   */
  private async generateRelatedQueries(
    query: RAGQuery,
    results: AnalyzedInformation[]
  ): Promise<string[]> {
    // 結果から抽出したキーワードベースの関連クエリ生成
    const allTags = results.flatMap(r => r.tags);
    const uniqueTags = [...new Set(allTags)].slice(0, 5);

    return uniqueTags.map(tag => `${tag} ${query.text.split(' ')[0]}`);
  }
}

export const ragService = new RAGService();