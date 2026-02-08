import { NewsSearchService } from "../services/news/newsSearchService";

// MSWなどのモックライブラリを使用しないシンプルなモック
global.fetch = jest.fn();

describe("NewsSearchService", () => {
  let service: NewsSearchService;

  beforeEach(() => {
    service = new NewsSearchService("test-finnhub-key", "test-newsapi-key");
    (fetch as jest.Mock).mockClear();
  });

  describe("Finnhubニュース検索", () => {
    it("should fetch company news from Finnhub", async () => {
      const mockNews = [
        {
          category: "company news",
          datetime: Date.now() / 1000,
          headline: "NVIDIA announces new AI chip",
          id: 123456,
          image: "https://example.com/image.jpg",
          related: "NVDA",
          source: "Reuters",
          summary: "NVIDIA has announced a breakthrough AI chip...",
          url: "https://reuters.com/article/nvda-chip",
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNews,
      });

      const news = await service.fetchCompanyNews("NVDA");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("finnhub.io/api/v1/company-news")
      );
      expect(news).toHaveLength(1);
      expect(news[0].headline).toContain("NVIDIA");
    });

    it("should handle date range for news search", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const fromDate = new Date("2024-01-01");
      const toDate = new Date("2024-01-31");

      await service.fetchCompanyNews("AAPL", fromDate, toDate);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("from=2024-01-01")
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("to=2024-01-31")
      );
    });
  });

  describe("NewsAPI検索", () => {
    it("should search news by keyword from NewsAPI", async () => {
      const mockResponse = {
        status: "ok",
        totalResults: 2,
        articles: [
          {
            source: { id: "bloomberg", name: "Bloomberg" },
            author: "John Doe",
            title: "Tesla stock surges on earnings beat",
            description: "Tesla exceeded expectations...",
            url: "https://bloomberg.com/tesla-earnings",
            urlToImage: "https://example.com/tesla.jpg",
            publishedAt: "2024-01-15T10:30:00Z",
            content: "Full article content...",
          },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const news = await service.searchNews("Tesla earnings");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("newsapi.org/v2/everything")
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("q=Tesla%20earnings")
      );
      expect(news).toHaveLength(1);
      expect(news[0].headline).toContain("Tesla");
    });

    it("should sort news by relevancy", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok", articles: [] }),
      });

      await service.searchNews("NVDA surge", { sortBy: "relevancy" });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=relevancy")
      );
    });

    it("should limit number of results", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "ok", articles: [] }),
      });

      await service.searchNews("Apple", { pageSize: 5 });

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("pageSize=5"));
    });
  });

  describe("急騰・急落用ニュース検索", () => {
    it("should search news for stock surge", async () => {
      const mockFinnhubNews = [
        {
          category: "company news",
          datetime: Date.now() / 1000,
          headline: "NVIDIA stock jumps on AI demand",
          source: "CNBC",
          summary: "Shares soared after strong demand...",
          url: "https://cnbc.com/nvda",
        },
      ];

      const mockNewsAPIResponse = {
        status: "ok",
        articles: [
          {
            source: { id: null, name: "TechCrunch" },
            author: null,
            title: "AI Chip Maker NVIDIA Sees Surge",
            description: "Stock price increases dramatically",
            url: "https://example.com/nvda-surge",
            urlToImage: null,
            publishedAt: new Date().toISOString(),
            content: "",
          },
        ],
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFinnhubNews,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNewsAPIResponse,
        });

      const news = await service.searchForSurge("NVDA", "up");

      expect(news.length).toBeGreaterThan(0);
      expect(news.some((n) => n.headline.includes("NVIDIA"))).toBe(true);
    });

    it("should include company name in search query", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: "ok", articles: [] }),
        });

      await service.searchForSurge("TSLA", "down");

      // NewsAPI呼び出しでTeslaを検索
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("Tesla"));
    });
  });

  describe("エラーハンドリング", () => {
    it("should handle API errors gracefully", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      await expect(service.fetchCompanyNews("AAPL")).rejects.toThrow();
    });

    it("should handle rate limit errors", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      await expect(service.searchNews("test")).rejects.toThrow("rate limit");
    });

    it("should return empty array on no results", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const news = await service.fetchCompanyNews("UNKNOWN");
      expect(news).toEqual([]);
    });
  });
});
