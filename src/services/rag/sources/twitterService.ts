/**
 * X（旧Twitter）APIから株式関連情報を収集するサービス
 * Twitter API v2を使用してリアルタイムの市場情報・センチメントを取得
 */

import type { TwitterPost, RAGQuery } from '../../../types';
import { cache } from '../../../utils/cache';
import { circuitBreaker } from '../../../utils/circuitBreaker';

interface TwitterAPIConfig {
  apiKey: string;
  apiSecret: string;
  bearerToken: string;
  baseUrl: string;
}

interface TwitterSearchResponse {
  data?: TwitterPost[];
  meta: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
  includes?: {
    users?: Array<{
      id: string;
      username: string;
      name: string;
      verified?: boolean;
      public_metrics?: {
        followers_count: number;
        following_count: number;
        tweet_count: number;
      };
    }>;
  };
}

class TwitterService {
  private readonly config: TwitterAPIConfig;
  private readonly cachePrefix = 'twitter';
  private readonly defaultCacheTTL = 2 * 60 * 1000; // 2分
  private readonly circuitBreaker = circuitBreaker;

  constructor() {
    this.config = {
      apiKey: process.env.TWITTER_API_KEY || '',
      apiSecret: process.env.TWITTER_API_SECRET || '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
      baseUrl: 'https://api.twitter.com/2'
    };
  }

  /**
   * 株式関連投稿の検索
   */
  async searchPosts(query: RAGQuery): Promise<TwitterPost[]> {
    const cacheKey = `${this.cachePrefix}:search:${this.createQueryHash(query)}`;

    // キャッシュチェック
    const cached = cache.get<TwitterPost[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      return await this.circuitBreaker.execute(async () => {
        const searchQuery = this.buildSearchQuery(query);
        const posts = await this.executeSearch(searchQuery, query);

        // キャッシュに保存
        cache.set(cacheKey, posts, this.defaultCacheTTL);

        return posts;
      });
    } catch (error) {
      console.error('Twitter search failed:', error);
      return this.getFallbackPosts(query);
    }
  }

  /**
   * 特定銘柄の最新ツイート
   */
  async getStockMentions(symbol: string, limit: number = 20): Promise<TwitterPost[]> {
    const query: RAGQuery = {
      text: `${symbol} OR $${symbol}`,
      symbols: [symbol],
      limit
    };

    return this.searchPosts(query);
  }

  /**
   * トレンド投稿の取得
   */
  async getTrendingStockPosts(): Promise<TwitterPost[]> {
    const trendingHashtags = [
      '#株式投資', '#投資', '#株価', '#マーケット', '#日経平均',
      '#TOPIX', '#東証', '#決算', '#IPO', '#株主優待'
    ];

    const query: RAGQuery = {
      text: trendingHashtags.join(' OR '),
      limit: 50
    };

    return this.searchPosts(query);
  }

  /**
   * インフルエンサー投稿の取得
   */
  async getInfluencerPosts(): Promise<TwitterPost[]> {
    // 有名な株式投資系アカウント
    const influencers = [
      'kabutan_jp',           // 株探
      'minkabu_jp',           // みんかぶ
      'nikkei',               // 日経新聞
      'tokyostockexchange',   // 東京証券取引所
      // その他の有名投資家・アナリスト
    ];

    const query: RAGQuery = {
      text: `from:${influencers.join(' OR from:')} (株価 OR 投資 OR 決算)`,
      limit: 30
    };

    return this.searchPosts(query);
  }

  /**
   * 急騰・急落関連の投稿
   */
  async getSurgeRelatedPosts(): Promise<TwitterPost[]> {
    const surgeKeywords = [
      '急騰', '急落', 'ストップ高', 'ストップ安',
      '暴騰', '暴落', '大幅上昇', '大幅下落',
      '注目株', 'ブレイクアウト'
    ];

    const query: RAGQuery = {
      text: surgeKeywords.join(' OR '),
      limit: 100
    };

    return this.searchPosts(query);
  }

  /**
   * 検索クエリの構築
   */
  private buildSearchQuery(query: RAGQuery): string {
    let searchTerms = [query.text];

    // 銘柄指定がある場合
    if (query.symbols?.length) {
      const symbolTerms = query.symbols.flatMap(symbol => [
        symbol,
        `$${symbol}`,
        symbol.replace('.T', '') // .T サフィックス除去
      ]);
      searchTerms.push(`(${symbolTerms.join(' OR ')})`);
    }

    // 株式関連キーワードを追加
    const stockKeywords = [
      '株価', '投資', '決算', 'IR', '業績',
      'セクター', 'マーケット', '相場'
    ];
    searchTerms.push(`(${stockKeywords.join(' OR ')})`);

    // ネガティブフィルター（スパム除去）
    const excludeTerms = [
      '-is:retweet',     // リツイート除外
      '-is:reply',       // リプライ除外
      '-has:links',      // 外部リンク含む投稿除外（スパム対策）
      '-lang:en'         // 英語投稿除外（日本株フォーカス）
    ];

    return `${searchTerms.join(' AND ')} ${excludeTerms.join(' ')} lang:ja`;
  }

  /**
   * API実行
   */
  private async executeSearch(searchQuery: string, query: RAGQuery): Promise<TwitterPost[]> {
    const params = new URLSearchParams({
      query: searchQuery,
      max_results: Math.min(query.limit || 20, 100).toString(),
      'tweet.fields': [
        'id', 'text', 'author_id', 'created_at', 'public_metrics',
        'context_annotations', 'entities', 'possibly_sensitive'
      ].join(','),
      'user.fields': ['username', 'name', 'verified', 'public_metrics'].join(','),
      'expansions': 'author_id,attachments.media_keys',
      'media.fields': 'type,url,preview_image_url',
    });

    // 時間範囲指定
    if (query.timeRange?.from) {
      params.append('start_time', new Date(query.timeRange.from).toISOString());
    }
    if (query.timeRange?.to) {
      params.append('end_time', new Date(query.timeRange.to).toISOString());
    }

    const response = await fetch(
      `${this.config.baseUrl}/tweets/search/recent?${params}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }

    const data: TwitterSearchResponse = await response.json();

    return this.transformResponse(data);
  }

  /**
   * APIレスポンスの変換
   */
  private transformResponse(response: TwitterSearchResponse): TwitterPost[] {
    if (!response.data) {
      return [];
    }

    const usersMap = new Map();
    if (response.includes?.users) {
      for (const user of response.includes.users) {
        usersMap.set(user.id, user);
      }
    }

    return response.data.map(tweet => {
      const user = usersMap.get(tweet.author_id);
      const hashtags = tweet.entities?.hashtags?.map(h => h.tag) || [];
      const mentions = tweet.entities?.mentions?.map(m => m.username) || [];
      const urls = tweet.entities?.urls?.map(u => u.expanded_url).filter(Boolean) || [];

      return {
        id: tweet.id,
        text: tweet.text,
        author: {
          username: user?.username || 'unknown',
          displayName: user?.name || 'Unknown User',
          isVerified: user?.verified || false,
          followerCount: user?.public_metrics?.followers_count
        },
        metrics: {
          likeCount: tweet.public_metrics?.like_count || 0,
          retweetCount: tweet.public_metrics?.retweet_count || 0,
          replyCount: tweet.public_metrics?.reply_count || 0,
          viewCount: tweet.public_metrics?.impression_count
        },
        publishedAt: tweet.created_at,
        hashtags,
        mentions,
        urls,
        media: tweet.attachments?.media_keys ? [] : undefined // メディア情報の変換（簡略化）
      };
    });
  }

  /**
   * フォールバック投稿データ（API失敗時）
   */
  private getFallbackPosts(query: RAGQuery): TwitterPost[] {
    // デモ用のダミーデータ
    return [
      {
        id: 'demo_1',
        text: `${query.symbols?.[0] || 'NIKKEI'} が今日は好調ですね。決算の影響かな？ #投資 #株価`,
        author: {
          username: 'demo_user',
          displayName: 'デモユーザー',
          isVerified: false,
          followerCount: 1000
        },
        metrics: {
          likeCount: 15,
          retweetCount: 3,
          replyCount: 2
        },
        publishedAt: new Date().toISOString(),
        hashtags: ['投資', '株価'],
        mentions: [],
        urls: []
      }
    ];
  }

  /**
   * クエリハッシュ生成
   */
  private createQueryHash(query: RAGQuery): string {
    const queryStr = JSON.stringify({
      text: query.text,
      symbols: query.symbols?.sort(),
      timeRange: query.timeRange,
      limit: query.limit
    });
    return btoa(queryStr).slice(0, 16);
  }

  /**
   * 投稿の信頼性スコア計算
   */
  calculateCredibilityScore(post: TwitterPost): number {
    let score = 0.3; // ベーススコア

    // 認証アカウントボーナス
    if (post.author.isVerified) {
      score += 0.3;
    }

    // フォロワー数によるスコア
    if (post.author.followerCount) {
      if (post.author.followerCount > 10000) {
        score += 0.2;
      } else if (post.author.followerCount > 1000) {
        score += 0.1;
      }
    }

    // エンゲージメントによるスコア
    const engagement = post.metrics.likeCount + post.metrics.retweetCount;
    if (engagement > 100) {
      score += 0.2;
    } else if (engagement > 10) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 株式関連キーワード抽出
   */
  extractStockSymbols(text: string): string[] {
    const symbolPatterns = [
      /\$([A-Z]{1,5})/g,           // $AAPL 形式
      /([0-9]{4})\.T/g,            // 7203.T 形式（日本株）
      /([0-9]{4})\s*[株銘]/g,       // 7203株, 7203銘柄
    ];

    const symbols: string[] = [];
    for (const pattern of symbolPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        symbols.push(...matches.map(match => match.replace(/[\$株銘]/g, '')));
      }
    }

    return [...new Set(symbols)]; // 重複除去
  }
}

export const twitterService = new TwitterService();