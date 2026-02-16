/**
 * サーキットブレーカーパターン
 * 繰り返しAPIが失敗する場合、一定期間リクエストをスキップして負荷を軽減する
 */

type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** オープンになるまでの連続失敗回数 (デフォルト: 5) */
  failureThreshold?: number;
  /** オープン状態の持続時間 ms (デフォルト: 60秒) */
  resetTimeout?: number;
  /** ハーフオープン時の試行成功回数でクローズに戻る (デフォルト: 2) */
  successThreshold?: number;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;

  constructor(
    private readonly name: string,
    options?: CircuitBreakerOptions
  ) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeout = options?.resetTimeout ?? 60_000;
    this.successThreshold = options?.successThreshold ?? 2;
  }

  /**
   * サーキットブレーカーを通してリクエストを実行する
   * オープン状態の場合は即座にエラーを返す
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = "half-open";
        this.successCount = 0;
        console.log(`[CircuitBreaker:${this.name}] half-open: 試行再開`);
      } else {
        throw new CircuitOpenError(
          `${this.name}: サービスが一時的に利用できません。しばらくしてからお試しください。`,
          this.remainingResetTime
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** リクエストが利用可能かどうか（UIでの表示判定用） */
  get isAvailable(): boolean {
    if (this.state === "closed" || this.state === "half-open") return true;
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  /** リセットまでの残り時間 (ms) */
  get remainingResetTime(): number {
    if (this.state !== "open") return 0;
    return Math.max(0, this.resetTimeout - (Date.now() - this.lastFailureTime));
  }

  /** 現在の状態 */
  get currentState(): CircuitState {
    return this.state;
  }

  /** 手動リセット */
  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`[CircuitBreaker:${this.name}] 手動リセット`);
  }

  private onSuccess(): void {
    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = "closed";
        this.failureCount = 0;
        console.log(`[CircuitBreaker:${this.name}] closed: サービス回復`);
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open" || this.failureCount >= this.failureThreshold) {
      this.state = "open";
      console.warn(
        `[CircuitBreaker:${this.name}] open: ${this.failureCount}回連続失敗 - ${this.resetTimeout / 1000}秒間リクエストを停止`
      );
    }
  }
}

/** サーキットがオープン状態のときにスローされるエラー */
export class CircuitOpenError extends Error {
  constructor(
    message: string,
    public readonly remainingMs: number
  ) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

// ============================================================================
// アプリケーション用のサーキットブレーカーインスタンス
// ============================================================================

/** Yahoo Finance API 用サーキットブレーカー */
export const yahooFinanceBreaker = new CircuitBreaker("YahooFinance", {
  failureThreshold: 5,
  resetTimeout: 60_000,
});

/** Finnhub API 用サーキットブレーカー */
export const finnhubBreaker = new CircuitBreaker("Finnhub", {
  failureThreshold: 5,
  resetTimeout: 60_000,
});

/** TDnet / Python スクリプト用サーキットブレーカー */
export const tdnetBreaker = new CircuitBreaker("TDnet", {
  failureThreshold: 3,
  resetTimeout: 120_000,
});
