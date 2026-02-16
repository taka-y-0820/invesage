import React from "react";
import styles from "./ErrorFallback.module.css";

export interface ErrorFallbackProps {
  /** エラーメッセージ */
  message: string;
  /** 詳細情報（折りたたみで表示） */
  detail?: string;
  /** リトライボタンのコールバック */
  onRetry?: () => void;
  /** サーキットブレーカーがオープンの場合の残り時間(秒) */
  retryAfterSec?: number;
  /** コンパクト表示 */
  compact?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  message,
  detail,
  onRetry,
  retryAfterSec,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={styles.compactContainer}>
        <svg
          className={styles.compactIcon}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className={styles.compactMessage}>{message}</span>
        {onRetry && (
          <button
            className={styles.compactRetryButton}
            onClick={onRetry}
            disabled={retryAfterSec !== undefined && retryAfterSec > 0}
          >
            {retryAfterSec && retryAfterSec > 0
              ? `${retryAfterSec}秒後に再試行可能`
              : "再試行"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <p className={styles.message}>{message}</p>
      {detail && <p className={styles.detail}>{detail}</p>}
      {onRetry && (
        <button
          className={styles.retryButton}
          onClick={onRetry}
          disabled={retryAfterSec !== undefined && retryAfterSec > 0}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {retryAfterSec && retryAfterSec > 0
            ? `${retryAfterSec}秒後に再試行可能`
            : "再試行する"}
        </button>
      )}
    </div>
  );
};

export default ErrorFallback;
