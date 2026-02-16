/**
 * リトライロジック - 指数バックオフ付きリトライユーティリティ
 */

export interface RetryOptions {
  /** 最大リトライ回数 (デフォルト: 3) */
  maxRetries?: number;
  /** 初回待機時間 ms (デフォルト: 1000) */
  baseDelay?: number;
  /** 最大待機時間 ms (デフォルト: 10000) */
  maxDelay?: number;
  /** リトライ対象かどうかを判定する関数 (デフォルト: すべてのエラーでリトライ) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** リトライ時のコールバック */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * 指数バックオフ付きでリトライを実行する
 *
 * @example
 * const data = await withRetry(() => fetchStockQuote("7203.T"), {
 *   maxRetries: 3,
 *   shouldRetry: (err) => isRetryableError(err),
 * });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= opts.maxRetries || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // 指数バックオフ + ジッター
      const exponentialDelay = opts.baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * opts.baseDelay * 0.5;
      const delay = Math.min(exponentialDelay + jitter, opts.maxDelay);

      opts.onRetry(error, attempt + 1, delay);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * エラーがリトライ可能かどうかを判定
 * - ネットワークエラー
 * - レート制限 (429)
 * - サーバーエラー (5xx)
 * - タイムアウトエラー
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // レート制限
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    // タイムアウト
    if (msg.includes("timeout") || msg.includes("timed out")) return true;
    // ネットワークエラー
    if (msg.includes("network") || msg.includes("fetch failed")) return true;
    // サーバーエラー
    if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) return true;
    // 接続エラー
    if (msg.includes("econnrefused") || msg.includes("econnreset")) return true;
  }
  // Tauri invoke のエラーは文字列で返ってくることがある
  if (typeof error === "string") {
    const msg = error.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("timeout") || msg.includes("timed out")) return true;
    if (msg.includes("network") || msg.includes("api request failed")) return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
