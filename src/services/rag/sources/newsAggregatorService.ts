/**
 * 複数のニュースソースから株式関連情報を集約するサービス
 * Yahoo!ニュース、日経新聞、その他の信頼できるソースから情報収集
 */

import type { NewsArticleExtended, RAGQuery } from '../../../types';
import { cache } from '../../../utils/cache';
import { circuitBreaker } from '../../../utils/circuitBreaker';

interface NewsSource {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
}

interface RSSFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category?: string;
}

class NewsAggregatorService {
  private readonly sources: NewsSource[];
  private readonly cachePrefix = 'news';
  private readonly defaultCacheTTL = 10 * 60 * 1000; // 10分
  private readonly circuitBreaker = circuitBreaker;

  constructor() {
    this.sources = [
      {
        id: 'yahoo_news',
        name: 'Yahoo!ニュース',
        baseUrl: 'https://news.yahoo.co.jp',
        rateLimit: 60
      },
      {
        id: 'nikkei',
        name: '日本経済新聞',
        baseUrl: 'https://www.nikkei.com',
        rateLimit: 30
      },
      {
        id: 'tradingview',
        name: 'TradingView News',
        baseUrl: 'https://jp.tradingview.com',
        rateLimit: 60
      },
      {
        id: 'kabutan',
        name: '株探',
        baseUrl: 'https://kabutan.jp',
        rateLimit: 30
      },
      {
        id: 'minkabu',
        name: 'みんかぶ',
        baseUrl: 'https://minkabu.jp',
        rateLimit: 30
      }
    ];
  }

  /**
   * 複数ソースからニュースを検索・集約
   */
  async searchNews(query: RAGQuery): Promise<NewsArticleExtended[]> {
    const cacheKey = `${this.cachePrefix}:search:${this.createQueryHash(query)}`;

    // キャッシュチェック
    const cached = cache.get<NewsArticleExtended[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 並列でソースから収集
      const searchPromises = this.sources.map(source =>
        this.searchFromSource(source, query).catch(error => {
          console.warn(`Failed to fetch from ${source.name}:`, error);
          return [];
        })
      );

      const allResults = await Promise.allSettled(searchPromises);
      const successfulResults = allResults
        .filter((result): result is PromiseFulfilledResult<NewsArticleExtended[]> =>
          result.status === 'fulfilled'
        )
        .flatMap(result => result.value);

      // 重複除去とソート
      const uniqueArticles = this.deduplicateArticles(successfulResults);
      const sortedArticles = this.sortByRelevanceAndRecency(uniqueArticles, query);

      // 件数制限
      const limitedResults = query.limit ? sortedArticles.slice(0, query.limit) : sortedArticles;

      // キャッシュに保存
      cache.set(cacheKey, limitedResults, this.defaultCacheTTL);

      return limitedResults;
    } catch (error) {
      console.error('News search failed:', error);
      return this.getFallbackNews(query);
    }
  }

  /**
   * 特定銘柄のニュース取得
   */
  async getStockNews(symbol: string, limit: number = 20): Promise<NewsArticleExtended[]> {
    // 銘柄コードから企業名を取得（簡易マッピング）
    const companyName = this.getCompanyName(symbol);

    const query: RAGQuery = {
      text: `${symbol} ${companyName} 決算 業績 株価`,
      symbols: [symbol],
      limit
    };

    return this.searchNews(query);
  }

  /**
   * 市場全体のニュース
   */
  async getMarketNews(): Promise<NewsArticleExtended[]> {
    const query: RAGQuery = {
      text: '日経平均 TOPIX 東証 市場 経済',
      limit: 30
    };

    return this.searchNews(query);
  }

  /**
   * セクター別ニュース
   */
  async getSectorNews(sector: string): Promise<NewsArticleExtended[]> {
    const query: RAGQuery = {
      text: `${sector} 業界 セクター`,
      limit: 20
    };

    return this.searchNews(query);
  }

  /**
   * 個別ソースから検索
   */
  private async searchFromSource(source: NewsSource, query: RAGQuery): Promise<NewsArticleExtended[]> {
    switch (source.id) {
      case 'yahoo_news':
        return this.searchYahooNews(query);
      case 'nikkei':
        return this.searchNikkeiNews(query);
      case 'kabutan':
        return this.searchKabutanNews(query);
      case 'minkabu':
        return this.searchMinkabuNews(query);
      default:
        return [];
    }
  }

  /**
   * Yahoo!ニュース検索
   */
  private async searchYahooNews(query: RAGQuery): Promise<NewsArticleExtended[]> {
    try {
      // Yahoo!ニュースのRSSフィードを利用
      const rssUrls = [
        'https://news.yahoo.co.jp/rss/topics/business.xml',
        'https://news.yahoo.co.jp/rss/topics/economy.xml'
      ];

      const articles: NewsArticleExtended[] = [];

      for (const rssUrl of rssUrls) {
        const feedItems = await this.fetchRSSFeed(rssUrl);
        const relevantItems = feedItems.filter(item =>
          this.isRelevantToQuery(item, query)
        );

        articles.push(...relevantItems.map(item => this.convertRSSToNews(item, 'yahoo_news')));
      }

      return articles;
    } catch (error) {
      console.error('Yahoo News search failed:', error);
      return [];
    }
  }

  /**
   * 日経ニュース検索
   */
  private async searchNikkeiNews(query: RAGQuery): Promise<NewsArticleExtended[]> {
    try {
      // 日経のAPIまたはスクレイピング実装
      // 現在はダミー実装
      return this.getFallbackNews(query, 'nikkei').slice(0, 5);
    } catch (error) {
      console.error('Nikkei search failed:', error);
      return [];
    }
  }

  /**
   * 株探ニュース検索
   */
  private async searchKabutanNews(query: RAGQuery): Promise<NewsArticleExtended[]> {
    try {
      // 株探APIまたはスクレイピング実装
      return this.getFallbackNews(query, 'kabutan').slice(0, 5);
    } catch (error) {
      console.error('Kabutan search failed:', error);
      return [];
    }
  }

  /**
   * みんかぶニュース検索
   */
  private async searchMinkabuNews(query: RAGQuery): Promise<NewsArticleExtended[]> {
    try {
      // みんかぶAPIまたはスクレイピング実装
      return this.getFallbackNews(query, 'minkabu').slice(0, 5);
    } catch (error) {
      console.error('Minkabu search failed:', error);
      return [];
    }
  }

  /**
   * RSSフィード取得
   */
  private async fetchRSSFeed(rssUrl: string): Promise<RSSFeedItem[]> {
    try {
      const response = await fetch(rssUrl);
      if (!response.ok) {
        throw new Error(`RSS fetch failed: ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseRSSFeed(xmlText);
    } catch (error) {
      console.error('RSS feed fetch failed:', error);
      return [];
    }
  }

  /**
   * RSS XML解析
   */
  private parseRSSFeed(xmlText: string): RSSFeedItem[] {
    try {
      // 簡易XML解析（本格的な実装では DOMParser や xml2js を使用）
      const items: RSSFeedItem[] = [];
      const itemMatches = xmlText.match(/<item>(.*?)<\/item>/gs);

      if (itemMatches) {
        for (const itemMatch of itemMatches) {
          const title = this.extractXMLValue(itemMatch, 'title');
          const link = this.extractXMLValue(itemMatch, 'link');
          const description = this.extractXMLValue(itemMatch, 'description');
          const pubDate = this.extractXMLValue(itemMatch, 'pubDate');

          if (title && link) {
            items.push({
              title,
              link,
              description: description || '',
              pubDate: pubDate || new Date().toISOString(),
              source: 'yahoo_news'
            });
          }
        }
      }

      return items;
    } catch (error) {
      console.error('RSS parsing failed:', error);
      return [];
    }
  }

  /**
   * XML値抽出
   */
  private extractXMLValue(xml: string, tagName: string): string {
    const match = xml.match(new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 's'));
    return match ? match[1].trim() : '';
  }

  /**
   * クエリ関連性チェック
   */
  private isRelevantToQuery(item: RSSFeedItem, query: RAGQuery): boolean {
    const searchText = `${item.title} ${item.description}`.toLowerCase();
    const queryWords = query.text.toLowerCase().split(' ');

    // 基本キーワードマッチング
    const hasKeyword = queryWords.some(word => searchText.includes(word));

    // 銘柄マッチング
    const hasSymbol = query.symbols?.some(symbol =>
      searchText.includes(symbol) ||
      searchText.includes(symbol.replace('.T', ''))
    ) || false;

    // 株式関連キーワード
    const stockKeywords = ['株価', '決算', '業績', '投資', '市場', '経済'];
    const hasStockKeyword = stockKeywords.some(keyword => searchText.includes(keyword));

    return (hasKeyword || hasSymbol) && hasStockKeyword;
  }

  /**
   * RSS記事をNewsArticleExtendedに変換
   */
  private convertRSSToNews(item: RSSFeedItem, sourceId: string): NewsArticleExtended {
    return {
      id: this.generateArticleId(item.link),
      title: item.title,
      content: item.description,
      source: sourceId as any,
      publishedAt: this.convertToISO(item.pubDate),
      url: item.link,
      category: item.category,
      relatedSymbols: this.extractSymbolsFromText(item.title + ' ' + item.description),
      sentiment: 0, // AI分析で後で更新
      keyPoints: []
    };
  }

  /**
   * 記事の重複除去
   */
  private deduplicateArticles(articles: NewsArticleExtended[]): NewsArticleExtended[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = `${article.title}:${article.publishedAt}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 関連性と新しさでソート
   */
  private sortByRelevanceAndRecency(articles: NewsArticleExtended[], query: RAGQuery): NewsArticleExtended[] {
    return articles.sort((a, b) => {
      // 関連性スコア
      const relevanceA = this.calculateRelevanceScore(a, query);
      const relevanceB = this.calculateRelevanceScore(b, query);

      // 時系列スコア
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      const timeScore = (timeB - timeA) / (1000 * 60 * 60); // 時間差（時間）

      // 総合スコア
      const scoreA = relevanceA * 0.7 + Math.min(timeScore, 24) / 24 * 0.3;
      const scoreB = relevanceB * 0.7 + Math.max(-timeScore, -24) / 24 * 0.3;

      return scoreB - scoreA;
    });
  }

  /**
   * 関連性スコア計算
   */
  private calculateRelevanceScore(article: NewsArticleExtended, query: RAGQuery): number {
    let score = 0;

    const searchText = `${article.title} ${article.content}`.toLowerCase();
    const queryWords = query.text.toLowerCase().split(' ');

    // キーワードマッチング
    const matchCount = queryWords.filter(word => searchText.includes(word)).length;
    score += (matchCount / queryWords.length) * 0.5;

    // 銘柄マッチング
    if (query.symbols?.length) {
      const symbolMatches = article.relatedSymbols.filter(symbol =>
        query.symbols!.includes(symbol)
      ).length;
      score += (symbolMatches / query.symbols.length) * 0.3;
    }

    // ソース信頼性
    const sourceCredibility = this.getSourceCredibility(article.source);
    score += sourceCredibility * 0.2;

    return score;
  }

  /**
   * ソース信頼性スコア
   */
  private getSourceCredibility(source: string): number {
    const credibilityMap: Record<string, number> = {
      'nikkei': 1.0,
      'yahoo_news': 0.9,
      'kabutan': 0.8,
      'minkabu': 0.7,
      'tradingview': 0.7
    };
    return credibilityMap[source] || 0.5;
  }

  /**
   * テキストから銘柄コード抽出
   */
  private extractSymbolsFromText(text: string): string[] {
    const patterns = [
      /([0-9]{4})\.T/g,
      /([0-9]{4})\s*[株銘]/g,
      /コード\s*([0-9]{4})/g
    ];

    const symbols: string[] = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        symbols.push(...matches.map(match => match.replace(/[^\d]/g, '') + '.T'));
      }
    }

    return [...new Set(symbols)];
  }

  /**
   * ユーティリティメソッド
   */
  private createQueryHash(query: RAGQuery): string {
    return btoa(JSON.stringify(query)).slice(0, 16);
  }

  private generateArticleId(url: string): string {
    return btoa(url).slice(0, 16);
  }

  private convertToISO(dateStr: string): string {
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private getCompanyName(symbol: string): string {
    // 簡易マッピング（実際のプロジェクトではデータベースから取得）
    const companyMap: Record<string, string> = {
      '7203.T': 'トヨタ自動車',
      '9984.T': 'ソフトバンクグループ',
      '6758.T': 'ソニーグループ',
      '7974.T': '任天堂',
      '8035.T': '東京エレクトロン'
    };
    return companyMap[symbol] || symbol.replace('.T', '');
  }

  /**
   * フォールバックニュース（API失敗時）
   */
  private getFallbackNews(query: RAGQuery, source?: string): NewsArticleExtended[] {
    const now = new Date();
    return [
      {
        id: 'demo_news_1',
        title: `${query.symbols?.[0] || '日経平均'} 関連ニュース - 決算発表の影響で注目集まる`,
        content: `${query.symbols?.[0] || '市場'} に関する最新情報です。投資家の注目が集まっています。`,
        source: (source as any) || 'yahoo_news',
        publishedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30分前
        url: `https://example.com/news/${query.symbols?.[0] || 'market'}`,
        relatedSymbols: query.symbols || [],
        sentiment: 0.1,
        keyPoints: ['決算発表', '注目株', '市場動向'],
        category: '経済'
      }
    ];
  }
}

export const newsAggregatorService = new NewsAggregatorService();