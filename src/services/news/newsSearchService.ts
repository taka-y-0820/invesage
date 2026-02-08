/**
 * ニュース検索サービス
 * Finnhub と NewsAPI を使用して株式関連ニュースを取得
 */

export interface NewsArticle {
  headline: string;
  source: string;
  summary: string;
  url: string;
  publishedAt: Date;
  image?: string;
  sentiment?: number;
}

interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults?: number;
  articles: NewsAPIArticle[];
}

interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

// 銘柄シンボルから企業名へのマッピング
const SYMBOL_TO_NAME: Record<string, string> = {
  AAPL: "Apple",
  NVDA: "NVIDIA",
  TSLA: "Tesla",
  GOOGL: "Google",
  MSFT: "Microsoft",
  AMZN: "Amazon",
  META: "Meta",
  NFLX: "Netflix",
  // 日本株
  "7203.T": "Toyota",
  "9984.T": "SoftBank",
  "6758.T": "Sony",
};

export class NewsSearchService {
  private finnhubApiKey: string;
  private newsApiKey: string;

  constructor(finnhubApiKey: string, newsApiKey: string) {
    this.finnhubApiKey = finnhubApiKey;
    this.newsApiKey = newsApiKey;
  }

  /**
   * Finnhubから企業ニュースを取得
   */
  async fetchCompanyNews(
    symbol: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<NewsArticle[]> {
    const from = fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7日前
    const to = toDate || new Date();

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromStr}&to=${toStr}&token=${this.finnhubApiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }

      const news: FinnhubNews[] = await response.json();

      return news.map((article) => ({
        headline: article.headline,
        source: article.source,
        summary: article.summary,
        url: article.url,
        publishedAt: new Date(article.datetime * 1000),
        image: article.image,
      }));
    } catch (error) {
      console.error("Failed to fetch Finnhub news:", error);
      throw error;
    }
  }

  /**
   * NewsAPIでキーワード検索
   */
  async searchNews(
    query: string,
    options: {
      sortBy?: "relevancy" | "popularity" | "publishedAt";
      pageSize?: number;
      from?: Date;
    } = {}
  ): Promise<NewsArticle[]> {
    const {
      sortBy = "relevancy",
      pageSize = 10,
      from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    } = options;

    const fromStr = from.toISOString();
    const encodedQuery = encodeURIComponent(query);

    const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&sortBy=${sortBy}&pageSize=${pageSize}&from=${fromStr}&apiKey=${this.newsApiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("NewsAPI rate limit exceeded");
        }
        throw new Error(`NewsAPI error: ${response.statusText}`);
      }

      const data: NewsAPIResponse = await response.json();

      if (data.status !== "ok" || !data.articles) {
        return [];
      }

      return data.articles.map((article) => ({
        headline: article.title,
        source: article.source.name,
        summary: article.description || "",
        url: article.url,
        publishedAt: new Date(article.publishedAt),
        image: article.urlToImage || undefined,
      }));
    } catch (error) {
      console.error("Failed to search NewsAPI:", error);
      throw error;
    }
  }

  /**
   * 急騰・急落時のニュース検索
   * FinnhubとNewsAPIの両方から取得してマージ
   */
  async searchForSurge(
    symbol: string,
    direction: "up" | "down"
  ): Promise<NewsArticle[]> {
    const companyName = SYMBOL_TO_NAME[symbol] || symbol;
    const keywords =
      direction === "up"
        ? ["surge", "jump", "rally", "soar", "gain"]
        : ["drop", "fall", "plunge", "decline", "loss"];

    // 過去24時間のニュース
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // Finnhubから企業ニュースを取得
      const finnhubNewsPromise = this.fetchCompanyNews(symbol, yesterday);

      // NewsAPIでキーワード検索
      const searchQuery = `${companyName} ${keywords.join(" OR ")}`;
      const newsApiPromise = this.searchNews(searchQuery, {
        sortBy: "publishedAt",
        pageSize: 5,
        from: yesterday,
      });

      const [finnhubNews, newsApiResults] = await Promise.all([
        finnhubNewsPromise,
        newsApiPromise,
      ]);

      // 重複を除去してマージ
      const allNews = [...finnhubNews, ...newsApiResults];
      const uniqueNews = this.deduplicateNews(allNews);

      // 新しい順にソート
      return uniqueNews.sort(
        (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
      );
    } catch (error) {
      console.error("Failed to search news for surge:", error);
      // エラーでも空配列を返す（他の機能を止めない）
      return [];
    }
  }

  /**
   * ニュースの重複を除去
   */
  private deduplicateNews(news: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return news.filter((article) => {
      const key = article.url || article.headline;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 銘柄シンボルに対応する企業名を取得
   */
  static getCompanyName(symbol: string): string {
    return SYMBOL_TO_NAME[symbol] || symbol;
  }

  /**
   * 新しい企業名マッピングを追加
   */
  static addCompanyMapping(symbol: string, name: string): void {
    SYMBOL_TO_NAME[symbol] = name;
  }
}
