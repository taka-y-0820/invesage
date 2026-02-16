import React, { useState } from 'react';
import { useApiKeyStore } from '../../store/useApiKeyStore';
import styles from './ApiKeySetup.module.css';

interface ApiKeySetupProps {
  onComplete?: () => void;
  isModal?: boolean;
}

export function ApiKeySetup({ onComplete, isModal = false }: ApiKeySetupProps) {
  const {
    finnhubApiKey,
    openaiApiKey,
    setFinnhubApiKey,
    setOpenaiApiKey,
    isConfigured,
  } = useApiKeyStore();

  const [localFinnhubKey, setLocalFinnhubKey] = useState(finnhubApiKey);
  const [localOpenaiKey, setLocalOpenaiKey] = useState(openaiApiKey);
  const [showFinnhubKey, setShowFinnhubKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateFinnhubKey = async (key: string): Promise<boolean> => {
    if (!key || key === 'demo') {
      setValidationError('有効なFinnhub APIキーを入力してください');
      return false;
    }

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`
      );
      if (response.status === 200) {
        return true;
      } else if (response.status === 401) {
        setValidationError('無効なFinnhub APIキーです');
        return false;
      } else {
        setValidationError('APIキーの検証に失敗しました');
        return false;
      }
    } catch (error) {
      setValidationError('ネットワークエラーが発生しました');
      return false;
    }
  };

  const handleSave = async () => {
    setIsValidating(true);
    setValidationError('');

    // Finnhub APIキーの検証
    const isValid = await validateFinnhubKey(localFinnhubKey);

    if (isValid) {
      setFinnhubApiKey(localFinnhubKey);
      setOpenaiApiKey(localOpenaiKey);

      if (onComplete) {
        onComplete();
      }
    }

    setIsValidating(false);
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className={`${styles.container} ${isModal ? styles.modal : ''}`}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>APIキー設定</h2>
          <p className={styles.description}>
            株式情報の取得に必要なAPIキーを設定してください。
          </p>
        </div>

        <div className={styles.form}>
          {/* Finnhub API Key */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Finnhub APIキー
              <span className={styles.required}>*必須</span>
            </label>
            <p className={styles.hint}>
              ニュースやセンチメント分析に使用されます。
              <a
                href="https://finnhub.io/register"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                無料でAPIキーを取得
              </a>
            </p>
            <div className={styles.inputWrapper}>
              <input
                type={showFinnhubKey ? 'text' : 'password'}
                value={localFinnhubKey}
                onChange={(e) => setLocalFinnhubKey(e.target.value)}
                placeholder="ct1ab12ad3iabc123abc"
                className={styles.input}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowFinnhubKey(!showFinnhubKey)}
                className={styles.toggleButton}
                aria-label={showFinnhubKey ? 'APIキーを隠す' : 'APIキーを表示'}
              >
                {showFinnhubKey ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={styles.icon}
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={styles.icon}
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* OpenAI API Key (Optional) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              OpenAI APIキー
              <span className={styles.optional}>オプション</span>
            </label>
            <p className={styles.hint}>
              AI分析機能を使用する場合に必要です。
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                APIキーを取得
              </a>
            </p>
            <div className={styles.inputWrapper}>
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                value={localOpenaiKey}
                onChange={(e) => setLocalOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className={styles.input}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className={styles.toggleButton}
                aria-label={showOpenaiKey ? 'APIキーを隠す' : 'APIキーを表示'}
              >
                {showOpenaiKey ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={styles.icon}
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className={styles.icon}
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {validationError && (
            <div className={styles.error}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={styles.errorIcon}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {validationError}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleSkip}
              className={styles.skipButton}
              disabled={isValidating}
            >
              スキップ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={styles.saveButton}
              disabled={isValidating || !localFinnhubKey}
            >
              {isValidating ? '検証中...' : '保存して続行'}
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <p className={styles.note}>
            APIキーは暗号化されてローカルに保存されます。
            サーバーには送信されません。
          </p>
        </div>
      </div>
    </div>
  );
}