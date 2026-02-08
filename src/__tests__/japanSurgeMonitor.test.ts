import { JapanSurgeMonitor } from "../services/realtime/japanSurgeMonitor";
import { SurgeScannerService } from "../services/scanner/surgeScannerService";

jest.mock("../services/scanner/surgeScannerService");
jest.mock("isomorphic-ws");
jest.mock("isomorphic-ws");

describe("JapanSurgeMonitor", () => {
  let monitor: JapanSurgeMonitor;
  let mockScanner: jest.Mocked<SurgeScannerService>;

  beforeEach(() => {
    mockScanner = new SurgeScannerService(
      "test-key"
    ) as jest.Mocked<SurgeScannerService>;
    monitor = new JapanSurgeMonitor(mockScanner);
    jest.clearAllMocks();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe("start", () => {
    it("定期的に市場をスキャンする", async () => {
      mockScanner.scanJapanMarket.mockResolvedValue([
        {
          symbol: "7203.T",
          name: "Toyota",
          changePercent: 5.2,
          currentPrice: 2600,
          previousClose: 2400,
          timestamp: Date.now(),
        },
      ]);

      const onSurge = jest.fn();
      monitor.start(onSurge, { interval: 100, threshold: 3 });

      // 100ms待機してスキャンが実行されるのを確認
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockScanner.scanJapanMarket).toHaveBeenCalledWith(3);
      expect(onSurge).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "7203.T",
          changePercent: 5.2,
        })
      );
    });

    it("複数の急騰銘柄を検出する", async () => {
      mockScanner.scanJapanMarket.mockResolvedValue([
        {
          symbol: "7203.T",
          name: "Toyota",
          changePercent: 5.2,
          currentPrice: 2600,
          previousClose: 2400,
          timestamp: Date.now(),
        },
        {
          symbol: "6758.T",
          name: "Sony",
          changePercent: 8.5,
          currentPrice: 13000,
          previousClose: 12000,
          timestamp: Date.now(),
        },
      ]);

      const onSurge = jest.fn();
      monitor.start(onSurge, { interval: 100 });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(onSurge).toHaveBeenCalledTimes(2);
    });

    it("デフォルト設定で動作する", async () => {
      mockScanner.scanJapanMarket.mockResolvedValue([]);

      const onSurge = jest.fn();
      monitor.start(onSurge);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // デフォルト閾値5%でスキャン
      expect(mockScanner.scanJapanMarket).toHaveBeenCalledWith(5);
    });

    it("エラーが発生しても継続する", async () => {
      mockScanner.scanJapanMarket
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce([
          {
            symbol: "7203.T",
            name: "Toyota",
            changePercent: 5.2,
            currentPrice: 2600,
            previousClose: 2400,
            timestamp: Date.now(),
          },
        ]);

      const onSurge = jest.fn();
      const onError = jest.fn();
      monitor.start(onSurge, { interval: 100, onError });

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onSurge).toHaveBeenCalled(); // 2回目のスキャンは成功
    });
  });

  describe("stop", () => {
    it("スキャンを停止する", async () => {
      mockScanner.scanJapanMarket.mockResolvedValue([]);

      const onSurge = jest.fn();
      monitor.start(onSurge, { interval: 100 });

      await new Promise((resolve) => setTimeout(resolve, 50));
      monitor.stop();

      const callCountBeforeStop = mockScanner.scanJapanMarket.mock.calls.length;

      await new Promise((resolve) => setTimeout(resolve, 150));

      // stop後はスキャンされない
      expect(mockScanner.scanJapanMarket.mock.calls.length).toBe(
        callCountBeforeStop
      );
    });
  });

  describe("重複検出の防止", () => {
    it("同じ銘柄の急騰を1回だけ通知する", async () => {
      const surgeStock = {
        symbol: "7203.T",
        name: "Toyota",
        changePercent: 5.2,
        currentPrice: 2600,
        previousClose: 2400,
        timestamp: Date.now(),
      };

      mockScanner.scanJapanMarket.mockResolvedValue([surgeStock]);

      const onSurge = jest.fn();
      monitor.start(onSurge, { interval: 100 });

      await new Promise((resolve) => setTimeout(resolve, 350)); // 3回スキャン

      // 初回 + 3回スキャン = 4回呼ばれる、でも通知は1回だけ
      expect(mockScanner.scanJapanMarket).toHaveBeenCalledTimes(4);
      expect(onSurge).toHaveBeenCalledTimes(1);
    });

    it("変動率が変わったら再通知する", async () => {
      mockScanner.scanJapanMarket
        .mockResolvedValueOnce([
          {
            symbol: "7203.T",
            name: "Toyota",
            changePercent: 5.2,
            currentPrice: 2600,
            previousClose: 2400,
            timestamp: Date.now(),
          },
        ])
        .mockResolvedValueOnce([
          {
            symbol: "7203.T",
            name: "Toyota",
            changePercent: 8.5, // 変動率が上昇
            currentPrice: 2700,
            previousClose: 2400,
            timestamp: Date.now(),
          },
        ]);

      const onSurge = jest.fn();
      monitor.start(onSurge, { interval: 100 });

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(onSurge).toHaveBeenCalledTimes(2);
      expect(onSurge).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ changePercent: 5.2 })
      );
      expect(onSurge).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ changePercent: 8.5 })
      );
    });
  });
});
