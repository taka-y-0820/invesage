/**
 * TTL付きキャッシュユーティリティ
 * フロントエンドでのAPI応答キャッシュに使用する
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  /** TTL（ミリ秒）。デフォルト: 5分 */
  ttl?: number;
  /** 最大エントリ数。デフォルト: 200 */
  maxSize?: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5分
const DEFAULT_MAX_SIZE = 200;

/**
 * TTL・サイズ制限付きのインメモリキャッシュ
 *
 * @example
 * const profileCache = new TTLCache<CompanyProfile>({ ttl: 10 * 60 * 1000 });
 * profileCache.set("7203.T", profile);
 * const cached = profileCache.get("7203.T"); // TTL内ならデータ返却、期限切れならundefined
 */
export class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private maxSize: number;

  constructor(options?: CacheOptions) {
    this.ttl = options?.ttl ?? DEFAULT_TTL;
    this.maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    // サイズ制限: 最も古いエントリを削除
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /** キャッシュ内の有効エントリ数 */
  get size(): number {
    this.evictExpired();
    return this.cache.size;
  }

  /** 期限切れエントリを一括削除 */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private findOldestKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

/**
 * キャッシュ付きでデータを取得するヘルパー
 * キャッシュにデータがあればそれを返し、なければfetcherを実行してキャッシュに保存する
 *
 * @example
 * const profile = await cachedFetch(
 *   profileCache,
 *   "7203.T",
 *   () => fetchJapaneseStockProfileHybrid("7203.T")
 * );
 */
export async function cachedFetch<T>(
  cache: TTLCache<T>,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const data = await fetcher();
  cache.set(key, data);
  return data;
}

// ============================================================================
// アプリケーション用のキャッシュインスタンス（データ種別ごとにTTLを最適化）
// ============================================================================

/** 株価データキャッシュ（短いTTL: 1分） */
export const stockQuoteCache = new TTLCache<any>({ ttl: 60 * 1000, maxSize: 100 });

/** 株価履歴キャッシュ（中程度TTL: 5分） */
export const stockHistoryCache = new TTLCache<any>({ ttl: 5 * 60 * 1000, maxSize: 50 });

/** 企業プロフィールキャッシュ（長いTTL: 30分） */
export const companyProfileCache = new TTLCache<any>({ ttl: 30 * 60 * 1000, maxSize: 200 });

/** ニュースセンチメントキャッシュ（中程度TTL: 10分） */
export const newsSentimentCache = new TTLCache<any>({ ttl: 10 * 60 * 1000, maxSize: 200 });

/** IR情報キャッシュ（長いTTL: 15分） */
export const irInfoCache = new TTLCache<any>({ ttl: 15 * 60 * 1000, maxSize: 100 });

/** ニュース記事キャッシュ（中程度TTL: 5分） */
export const newsArticleCache = new TTLCache<any>({ ttl: 5 * 60 * 1000, maxSize: 100 });

/** 決算カレンダーキャッシュ（長いTTL: 30分） */
export const earningsCalendarCache = new TTLCache<any>({ ttl: 30 * 60 * 1000, maxSize: 50 });
