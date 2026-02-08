/**
 * Finnhub WebSocket クライアント
 * リアルタイム株価を取得し、急騰・急落を検知
 */

type EventHandler = (data: any) => void;

interface Trade {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

interface SurgeEvent {
  symbol: string;
  previousPrice: number;
  currentPrice: number;
  changePercent: number;
  direction: "up" | "down";
  timestamp: number;
}

export class FinnhubWebSocket {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private subscribedSymbols: Set<string> = new Set();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastPrices: Map<string, number> = new Map();
  private surgeThreshold = 3; // 3%の変動で急騰・急落とみなす
  private connected = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * WebSocketサーバーに接続
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const url = `wss://ws.finnhub.io?token=${this.apiKey}`;
        this.ws = new WebSocket(url);

        this.ws.addEventListener("open", () => {
          console.log("✅ Finnhub WebSocket connected");
          this.connected = true;
          resolve(true);
        });

        this.ws.addEventListener("message", (event) => {
          this.handleMessage(event);
        });

        this.ws.addEventListener("error", (error) => {
          console.error("❌ Finnhub WebSocket error:", error);
          this.emit("error", error);
          reject(error);
        });

        this.ws.addEventListener("close", () => {
          console.log("🔌 Finnhub WebSocket closed");
          this.connected = false;
          this.attemptReconnect();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 銘柄をサブスクライブ
   */
  subscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected. Cannot subscribe.");
      return;
    }

    symbols.forEach((symbol) => {
      const message = JSON.stringify({ type: "subscribe", symbol });
      this.ws!.send(message);
      this.subscribedSymbols.add(symbol);
      console.log(`📊 Subscribed to ${symbol}`);
    });
  }

  /**
   * 銘柄のサブスクライブを解除
   */
  unsubscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    symbols.forEach((symbol) => {
      const message = JSON.stringify({ type: "unsubscribe", symbol });
      this.ws!.send(message);
      this.subscribedSymbols.delete(symbol);
      this.lastPrices.delete(symbol);
      console.log(`🚫 Unsubscribed from ${symbol}`);
    });
  }

  /**
   * 切断
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.subscribedSymbols.clear();
    this.lastPrices.clear();
  }

  /**
   * イベントリスナーを登録
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * イベントリスナーを削除
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 接続状態を取得
   */
  isConnected(): boolean {
    return (
      this.connected &&
      this.ws !== null &&
      this.ws.readyState === WebSocket.OPEN
    );
  }

  /**
   * サブスクライブ済み銘柄を取得
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * メッセージを処理
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      if (message.type === "trade" && Array.isArray(message.data)) {
        message.data.forEach((trade: any) => {
          const tradeData: Trade = {
            symbol: trade.s,
            price: trade.p,
            volume: trade.v,
            timestamp: trade.t,
          };

          // 価格更新イベントを発火
          this.emit("trade", tradeData);

          // 急騰・急落を検知
          this.detectSurge(tradeData);
        });
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  }

  /**
   * 急騰・急落を検知
   */
  private detectSurge(trade: Trade): void {
    const lastPrice = this.lastPrices.get(trade.symbol);

    if (lastPrice !== undefined) {
      const changePercent = ((trade.price - lastPrice) / lastPrice) * 100;

      // 閾値を超えた場合
      if (Math.abs(changePercent) >= this.surgeThreshold) {
        const surgeEvent: SurgeEvent = {
          symbol: trade.symbol,
          previousPrice: lastPrice,
          currentPrice: trade.price,
          changePercent,
          direction: changePercent > 0 ? "up" : "down",
          timestamp: trade.timestamp,
        };

        console.log(
          `${surgeEvent.direction === "up" ? "🚀" : "📉"} ${trade.symbol} ${
            changePercent > 0 ? "+" : ""
          }${changePercent.toFixed(2)}%`
        );

        this.emit("surge", surgeEvent);
      }
    }

    // 価格を更新
    this.lastPrices.set(trade.symbol, trade.price);
  }

  /**
   * イベントを発火
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * 自動再接続を試行
   */
  private attemptReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    console.log("🔄 Reconnecting in 3 seconds...");
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        await this.connect();
        // 再接続後、以前のサブスクライブを復元
        const symbols = Array.from(this.subscribedSymbols);
        this.subscribedSymbols.clear();
        this.subscribe(symbols);
      } catch (error) {
        console.error("Reconnection failed:", error);
      }
    }, 3000);
  }
}
