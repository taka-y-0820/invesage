import {
  SurgeScannerService,
  type SurgeStock,
} from "../scanner/surgeScannerService";

/**
 * 日本市場の急騰・急落監視オプション
 */
export interface JapanSurgeMonitorOptions {
  interval?: number; // スキャン間隔(ミリ秒) - デフォルト60秒
  threshold?: number; // 検出閾値(%) - デフォルト5%
  onError?: (error: Error) => void; // エラーハンドラ
}

/**
 * 日本市場を定期的にスキャンして急騰・急落銘柄を監視するサービス
 */
export class JapanSurgeMonitor {
  private scanner: SurgeScannerService;
  private intervalId: NodeJS.Timeout | null = null;
  private notifiedStocks = new Map<string, number>(); // 銘柄コード → 変動率

  constructor(scanner: SurgeScannerService) {
    this.scanner = scanner;
  }

  /**
   * 監視を開始
   * @param onSurge 急騰・急落検出時のコールバック
   * @param options オプション設定
   */
  start(
    onSurge: (stock: SurgeStock) => void,
    options: JapanSurgeMonitorOptions = {}
  ): void {
    const {
      interval = 60000, // デフォルト60秒
      threshold = 5, // デフォルト5%
      onError,
    } = options;

    // 既存の監視を停止
    this.stop();

    // 定期スキャンを開始
    this.intervalId = setInterval(async () => {
      try {
        const surgeStocks = await this.scanner.scanJapanMarket(threshold);

        for (const stock of surgeStocks) {
          // 重複検出を防ぐ
          const previousChange = this.notifiedStocks.get(stock.symbol);

          if (
            previousChange === undefined ||
            previousChange !== stock.changePercent
          ) {
            // 新規または変動率が変わった場合のみ通知
            this.notifiedStocks.set(stock.symbol, stock.changePercent);
            onSurge(stock);
          }
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        } else {
          console.error("Failed to scan Japan market:", error);
        }
      }
    }, interval);

    // 初回スキャンを即座に実行
    (async () => {
      try {
        const surgeStocks = await this.scanner.scanJapanMarket(threshold);
        for (const stock of surgeStocks) {
          this.notifiedStocks.set(stock.symbol, stock.changePercent);
          onSurge(stock);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    })();
  }

  /**
   * 監視を停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 通知済み銘柄をリセット
   */
  reset(): void {
    this.notifiedStocks.clear();
  }
}
