import { analyzeStock } from "../services/aiAnalysisService";

describe("AI Stock Analysis Service", () => {
  describe("analyzeStock", () => {
    it("should return analysis with recommendation", async () => {
      const mockStockData = {
        symbol: "AAPL",
        price: 150.0,
        change: 2.5,
        change_percent: 1.7,
        volume: 50000000,
      };

      const analysis = await analyzeStock(mockStockData);

      expect(analysis).toHaveProperty("recommendation");
      expect(analysis).toHaveProperty("confidence");
      expect(analysis).toHaveProperty("reasoning");
      expect(["BUY", "SELL", "HOLD"]).toContain(analysis.recommendation);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
    });

    it("should handle invalid data gracefully", async () => {
      const invalidData = {
        symbol: "",
        price: -1,
        change: 0,
        change_percent: 0,
        volume: 0,
      };

      await expect(analyzeStock(invalidData)).rejects.toThrow();
    });

    it("should return BUY for strong positive signals", async () => {
      const strongBuySignal = {
        symbol: "NVDA",
        price: 500.0,
        change: 25.0,
        change_percent: 5.3,
        volume: 100000000,
      };

      const analysis = await analyzeStock(strongBuySignal);

      expect(analysis.recommendation).toBe("BUY");
      expect(analysis.confidence).toBeGreaterThan(60);
    });
  });
});
