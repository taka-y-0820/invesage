import { SurgeScannerService } from "../services/scanner/surgeScannerService";

// Mock fetch
global.fetch = jest.fn();

describe("SurgeScannerService", () => {
  let service: SurgeScannerService;

  beforeEach(() => {
    service = new SurgeScannerService("test-api-key");
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("scanJapanMarket", () => {
    it("日本市場の急騰銘柄を検出できる", async () => {
      // Mock: 日本の主要銘柄リスト取得
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { symbol: "7203.T", description: "Toyota Motor Corp" },
            { symbol: "6758.T", description: "Sony Group Corp" },
            { symbol: "9984.T", description: "SoftBank Group Corp" },
          ],
        })
        // Mock: 各銘柄の価格変動データ
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            c: 2500, // 現在価格
            pc: 2400, // 前日終値
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            c: 13000,
            pc: 12000,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            c: 6500,
            pc: 6400,
          }),
        });

      const results = await service.scanJapanMarket(0); // 閾値0%で全て取得

      expect(results).toHaveLength(3);
      expect(results[0]).toMatchObject({
        symbol: "6758.T", // ソート後は最大変動率が最初
        name: "Sony Group Corp",
        changePercent: expect.any(Number),
        currentPrice: 13000,
        previousClose: 12000,
      });
    });

    it("閾値以上の銘柄のみを返す(デフォルト3%)", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { symbol: "7203.T", description: "Toyota" },
            { symbol: "6758.T", description: "Sony" },
          ],
        })
        // Toyota: +5% (急騰)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 2100, pc: 2000 }),
        })
        // Sony: +1% (通常)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 12120, pc: 12000 }),
        });

      const results = await service.scanJapanMarket(3); // 3%閾値

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe("7203.T");
      expect(results[0].changePercent).toBeGreaterThanOrEqual(3);
    });

    it("急落銘柄も検出できる(マイナス値)", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ symbol: "9984.T", description: "SoftBank" }],
        })
        // SoftBank: -5% (急落)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 5700, pc: 6000 }),
        });

      const results = await service.scanJapanMarket(3);

      expect(results).toHaveLength(1);
      expect(results[0].changePercent).toBeLessThan(-3);
    });

    it("カスタム閾値を設定できる", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ symbol: "7203.T", description: "Toyota" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 2070, pc: 2000 }), // +3.5%
        });

      // 閾値5%: 検出されない
      const results5 = await service.scanJapanMarket(5);
      expect(results5).toHaveLength(0);

      // 閾値3%: 検出される
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ symbol: "7203.T", description: "Toyota" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 2070, pc: 2000 }),
        });

      const results3 = await service.scanJapanMarket(3);
      expect(results3).toHaveLength(1);
    });

    it("APIエラー時は空配列を返す", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      const results = await service.scanJapanMarket();

      expect(results).toEqual([]);
    });
  });

  describe("scanUSMarket", () => {
    it("米国市場の急騰銘柄を検出できる", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { symbol: "AAPL", description: "Apple Inc" },
            { symbol: "NVDA", description: "NVIDIA Corp" },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 180, pc: 170 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 500, pc: 480 }),
        });

      const results = await service.scanUSMarket();

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe("AAPL");
      expect(results[1].symbol).toBe("NVDA");
    });
  });

  describe("結果のソート", () => {
    it("変動率の大きい順にソートされる", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { symbol: "A.T", description: "Company A" },
            { symbol: "B.T", description: "Company B" },
            { symbol: "C.T", description: "Company C" },
          ],
        })
        // A: +3%, B: +8%, C: +5%
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 103, pc: 100 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 108, pc: 100 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ c: 105, pc: 100 }),
        });

      const results = await service.scanJapanMarket(2);

      expect(results[0].symbol).toBe("B.T"); // 8%が最初
      expect(results[1].symbol).toBe("C.T"); // 5%が2番目
      expect(results[2].symbol).toBe("A.T"); // 3%が最後
    });
  });
});
