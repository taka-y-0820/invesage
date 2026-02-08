import { FinnhubWebSocket } from "../services/realtime/finnhubWebSocket";

// モック用のWebSocket
class MockWebSocket {
  private handlers: Map<string, Function[]> = new Map();
  readyState: number = MockWebSocket.CONNECTING;
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(public url: string) {
    // 接続シミュレート
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.trigger("open", {});
    }, 10);
  }

  addEventListener(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.trigger("close", {});
  }

  // テスト用: イベントをトリガー
  trigger(event: string, data: any) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }

  // テスト用: メッセージを受信したことにする
  simulateMessage(data: any) {
    this.trigger("message", { data: JSON.stringify(data) });
  }
}

// WebSocketをモック
global.WebSocket = MockWebSocket as any;

describe("FinnhubWebSocket", () => {
  let ws: FinnhubWebSocket;

  beforeEach(() => {
    ws = new FinnhubWebSocket("test-api-key");
  });

  afterEach(() => {
    ws.disconnect();
  });

  describe("接続管理", () => {
    it("should connect to Finnhub WebSocket", async () => {
      const connected = await ws.connect();
      expect(connected).toBe(true);
    });

    it("should subscribe to symbols on connect", async () => {
      await ws.connect();

      // 少し待って接続が完全に確立されるのを待つ
      await new Promise((resolve) => setTimeout(resolve, 50));

      ws.subscribe(["AAPL", "NVDA"]);

      // サブスクライブされた銘柄を確認
      const subscribed = ws.getSubscribedSymbols();
      expect(subscribed).toContain("AAPL");
      expect(subscribed).toContain("NVDA");
    });

    it("should disconnect cleanly", async () => {
      await ws.connect();
      ws.disconnect();

      expect(ws.isConnected()).toBe(false);
    });
  });

  describe("価格更新の受信", () => {
    it("should receive and emit price updates", async () => {
      await ws.connect();
      ws.subscribe(["AAPL"]);

      const updates: any[] = [];
      ws.on("trade", (data) => updates.push(data));

      // モックデータを送信
      const mockTrade = {
        type: "trade",
        data: [
          {
            s: "AAPL", // symbol
            p: 185.5, // price
            v: 1000, // volume
            t: Date.now(),
          },
        ],
      };

      (ws as any).ws.simulateMessage(mockTrade);

      expect(updates).toHaveLength(1);
      expect(updates[0].symbol).toBe("AAPL");
      expect(updates[0].price).toBe(185.5);
    });

    it("should handle multiple trades", async () => {
      await ws.connect();
      ws.subscribe(["NVDA", "TSLA"]);

      const updates: any[] = [];
      ws.on("trade", (data) => updates.push(data));

      const mockTrades = {
        type: "trade",
        data: [
          { s: "NVDA", p: 485.2, v: 2000, t: Date.now() },
          { s: "TSLA", p: 242.8, v: 1500, t: Date.now() },
        ],
      };

      (ws as any).ws.simulateMessage(mockTrades);

      expect(updates).toHaveLength(2);
      expect(updates.find((u: any) => u.symbol === "NVDA")).toBeDefined();
      expect(updates.find((u: any) => u.symbol === "TSLA")).toBeDefined();
    });
  });

  describe("急騰・急落の検知", () => {
    it("should detect price surge (>3%)", async () => {
      await ws.connect();
      ws.subscribe(["NVDA"]);

      const surges: any[] = [];
      ws.on("surge", (data) => surges.push(data));

      // 初期価格
      (ws as any).ws.simulateMessage({
        type: "trade",
        data: [{ s: "NVDA", p: 480.0, v: 1000, t: Date.now() }],
      });

      // 3%以上の上昇
      setTimeout(() => {
        (ws as any).ws.simulateMessage({
          type: "trade",
          data: [{ s: "NVDA", p: 495.0, v: 5000, t: Date.now() }],
        });
      }, 100);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(surges.length).toBeGreaterThan(0);
      const surge = surges[0];
      expect(surge.symbol).toBe("NVDA");
      expect(surge.changePercent).toBeGreaterThan(3);
      expect(surge.direction).toBe("up");
    });

    it("should detect price drop (<-3%)", async () => {
      await ws.connect();
      ws.subscribe(["TSLA"]);

      const drops: any[] = [];
      ws.on("surge", (data) => drops.push(data));

      // 初期価格
      (ws as any).ws.simulateMessage({
        type: "trade",
        data: [{ s: "TSLA", p: 250.0, v: 1000, t: Date.now() }],
      });

      // 3%以上の下落
      setTimeout(() => {
        (ws as any).ws.simulateMessage({
          type: "trade",
          data: [{ s: "TSLA", p: 242.0, v: 5000, t: Date.now() }],
        });
      }, 100);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(drops.length).toBeGreaterThan(0);
      const drop = drops[0];
      expect(drop.symbol).toBe("TSLA");
      expect(drop.changePercent).toBeLessThan(-3);
      expect(drop.direction).toBe("down");
    });

    it("should not trigger on small changes (<3%)", async () => {
      await ws.connect();
      ws.subscribe(["AAPL"]);

      const surges: any[] = [];
      ws.on("surge", (data) => surges.push(data));

      (ws as any).ws.simulateMessage({
        type: "trade",
        data: [{ s: "AAPL", p: 180.0, v: 1000, t: Date.now() }],
      });

      setTimeout(() => {
        (ws as any).ws.simulateMessage({
          type: "trade",
          data: [{ s: "AAPL", p: 182.0, v: 1000, t: Date.now() }],
        });
      }, 100);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(surges).toHaveLength(0);
    });
  });

  describe("エラーハンドリング", () => {
    it("should handle connection errors", async () => {
      const errors: any[] = [];
      ws.on("error", (err) => errors.push(err));

      await ws.connect();
      (ws as any).ws.trigger("error", new Error("Connection failed"));

      expect(errors).toHaveLength(1);
    });

    it("should auto-reconnect on disconnect", async () => {
      await ws.connect();

      // 接続確立まで待つ
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(ws.isConnected()).toBe(true);

      // 切断をシミュレート
      (ws as any).ws.close();

      // 切断を確認
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(ws.isConnected()).toBe(false);

      // 自動再接続を待つ
      await new Promise((resolve) => setTimeout(resolve, 3100));

      // 再接続されているはず
      expect(ws.isConnected()).toBe(true);
    });
  });
});
