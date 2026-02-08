import { RAGAnalysisService } from "../services/ai/ragAnalysisService";
import type { NewsArticle } from "../services/news/newsSearchService";

// OpenAI APIのモック
const mockCreate = jest.fn();

jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe("RAGAnalysisService", () => {
  let service: RAGAnalysisService;

  beforeEach(() => {
    service = new RAGAnalysisService("test-openai-key");
    mockCreate.mockClear();
  });

  describe("急騰・急落の原因分析", () => {
    it("should analyze surge reason from news articles", async () => {
      const mockNews: NewsArticle[] = [
        {
          headline: "NVIDIA Announces Revolutionary AI Chip",
          source: "Reuters",
          summary:
            "NVIDIA unveiled its next-generation AI chip with 2x performance...",
          url: "https://reuters.com/nvda",
          publishedAt: new Date(),
        },
        {
          headline: "AI Demand Soars as Companies Invest Heavily",
          source: "Bloomberg",
          summary: "Enterprise AI spending expected to triple this year...",
          url: "https://bloomberg.com/ai",
          publishedAt: new Date(),
        },
      ];

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reason:
                  "新型AIチップ「Blackwell Ultra」の発表により、データセンター向け需要が急増する見込み",
                sentiment: "positive",
                confidence: 85,
                keyFactors: [
                  "次世代AIチップの性能が2倍に向上",
                  "データセンター市場での競争優位性",
                  "企業のAI投資拡大トレンド",
                ],
                relatedNews: [
                  "NVIDIA Announces Revolutionary AI Chip",
                  "AI Demand Soars as Companies Invest Heavily",
                ],
              }),
            },
          },
        ],
      });

      const analysis = await service.analyzeSurgeReason("NVDA", mockNews, 4.5);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
            }),
            expect.objectContaining({
              role: "user",
            }),
          ]),
        })
      );

      expect(analysis.reason).toContain("AIチップ");
      expect(analysis.sentiment).toBe("positive");
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.keyFactors).toBeInstanceOf(Array);
    });

    it("should handle negative sentiment for price drops", async () => {
      const mockNews: NewsArticle[] = [
        {
          headline: "Tesla Recalls Thousands of Vehicles",
          source: "CNBC",
          summary: "Safety concerns force massive recall...",
          url: "https://cnbc.com/tsla",
          publishedAt: new Date(),
        },
      ];

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reason: "大規模リコールによる安全性への懸念",
                sentiment: "negative",
                confidence: 90,
                keyFactors: ["数千台のリコール", "安全性問題"],
                relatedNews: ["Tesla Recalls Thousands of Vehicles"],
              }),
            },
          },
        ],
      });

      const analysis = await service.analyzeSurgeReason("TSLA", mockNews, -5.2);

      expect(analysis.sentiment).toBe("negative");
    });

    it("should include price change in context", async () => {
      const mockNews: NewsArticle[] = [];

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reason: "明確な要因が見つかりません",
                sentiment: "neutral",
                confidence: 30,
                keyFactors: [],
                relatedNews: [],
              }),
            },
          },
        ],
      });

      await service.analyzeSurgeReason("AAPL", mockNews, 3.8);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === "user");

      expect(userMessage.content).toContain("3.80%"); // フォーマット後は小数点2桁
      expect(userMessage.content).toContain("AAPL");
    });
  });

  describe("複数銘柄の比較分析", () => {
    it("should compare multiple stocks", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "AI関連銘柄全体が上昇トレンド",
                winners: ["NVDA", "AMD"],
                losers: [],
                sectorTrend: "positive",
              }),
            },
          },
        ],
      });

      const stocks = [
        { symbol: "NVDA", changePercent: 4.5 },
        { symbol: "AMD", changePercent: 3.2 },
      ];

      const analysis = await service.compareStocks(stocks);

      expect(analysis.summary).toBeTruthy();
      expect(analysis.winners).toContain("NVDA");
    });
  });

  describe("ポートフォリオアドバイス", () => {
    it("should generate portfolio advice", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                advice:
                  "テクノロジーセクターの比率が高すぎます。分散投資を推奨します。",
                riskLevel: "medium-high",
                suggestions: [
                  "金融セクターへの投資を検討",
                  "ヘルスケア銘柄でリスク分散",
                ],
              }),
            },
          },
        ],
      });

      const portfolio = [
        { symbol: "NVDA", shares: 10, avgCost: 450 },
        { symbol: "AAPL", shares: 5, avgCost: 180 },
      ];

      const advice = await service.analyzePortfolio(portfolio);

      expect(advice.advice).toBeTruthy();
      expect(advice.riskLevel).toBeTruthy();
      expect(advice.suggestions).toBeInstanceOf(Array);
    });
  });

  describe("エラーハンドリング", () => {
    it("should handle API errors gracefully", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API rate limit"));

      const mockNews: NewsArticle[] = [];

      await expect(
        service.analyzeSurgeReason("AAPL", mockNews, 3.0)
      ).rejects.toThrow();
    });

    it("should handle empty news array", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reason: "ニュース情報がありません",
                sentiment: "neutral",
                confidence: 0,
                keyFactors: [],
                relatedNews: [],
              }),
            },
          },
        ],
      });

      const analysis = await service.analyzeSurgeReason("TEST", [], 2.0);

      expect(analysis.confidence).toBeLessThan(50);
    });

    it("should handle malformed API responses", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Invalid JSON",
            },
          },
        ],
      });

      await expect(
        service.analyzeSurgeReason("AAPL", [], 3.0)
      ).rejects.toThrow();
    });
  });

  describe("プロンプトエンジニアリング", () => {
    it("should use appropriate system prompt", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reason: "test",
                sentiment: "neutral",
                confidence: 50,
                keyFactors: [],
                relatedNews: [],
              }),
            },
          },
        ],
      });

      await service.analyzeSurgeReason("AAPL", [], 3.0);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages.find(
        (m: any) => m.role === "system"
      );

      expect(systemMessage.content).toContain("金融アナリスト");
      expect(systemMessage.content).toContain("JSON形式");
    });
  });
});
