import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StockAnalysis } from "../StockAnalysis";

// AI分析サービスと株価取得APIをモック
jest.mock("../../services/aiAnalysisService", () => ({
  analyzeStock: jest.fn(),
}));

jest.mock("../../services/stockApi", () => ({
  fetchStockQuote: jest.fn(),
}));

import { analyzeStock } from "../../services/aiAnalysisService";
import { fetchStockQuote } from "../../services/stockApi";

const mockAnalyzeStock = analyzeStock as jest.MockedFunction<
  typeof analyzeStock
>;
const mockFetchStockQuote = fetchStockQuote as jest.MockedFunction<
  typeof fetchStockQuote
>;

describe("StockAnalysis Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders stock analysis form", () => {
    render(<StockAnalysis />);

    expect(screen.getByPlaceholderText(/銘柄シンボル/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /分析開始/i })
    ).toBeInTheDocument();
  });

  it("displays loading state during analysis", async () => {
    mockFetchStockQuote.mockResolvedValue({
      symbol: "AAPL",
      price: 150.0,
      change: 2.5,
      change_percent: 1.7,
      volume: 50000000,
      timestamp: new Date().toISOString(),
    });

    mockAnalyzeStock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                recommendation: "BUY",
                confidence: 85,
                reasoning: "Strong momentum",
                timestamp: new Date().toISOString(),
              }),
            100
          )
        )
    );

    render(<StockAnalysis />);

    const input = screen.getByPlaceholderText(/銘柄シンボル/i);
    const button = screen.getByRole("button", { name: /分析開始/i });

    fireEvent.change(input, { target: { value: "AAPL" } });
    fireEvent.click(button);

    expect(await screen.findByText(/分析中/i)).toBeInTheDocument();
  });

  it("displays BUY recommendation with high confidence", async () => {
    mockFetchStockQuote.mockResolvedValue({
      symbol: "NVDA",
      price: 500.0,
      change: 25.0,
      change_percent: 5.3,
      volume: 100000000,
      timestamp: new Date().toISOString(),
    });

    mockAnalyzeStock.mockResolvedValue({
      recommendation: "BUY",
      confidence: 85,
      reasoning: "Strong upward momentum (+5.3%). High trading volume (100.0M)",
      timestamp: new Date().toISOString(),
    });

    render(<StockAnalysis />);

    const input = screen.getByPlaceholderText(/銘柄シンボル/i);
    const button = screen.getByRole("button", { name: /分析開始/i });

    fireEvent.change(input, { target: { value: "NVDA" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/BUY/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/i)).toBeInTheDocument();
      expect(screen.getByText(/Strong upward momentum/i)).toBeInTheDocument();
    });
  });

  it("displays SELL recommendation", async () => {
    mockFetchStockQuote.mockResolvedValue({
      symbol: "XYZ",
      price: 50.0,
      change: -2.5,
      change_percent: -4.2,
      volume: 5000000,
      timestamp: new Date().toISOString(),
    });

    mockAnalyzeStock.mockResolvedValue({
      recommendation: "SELL",
      confidence: 75,
      reasoning: "Sharp decline (-4.2%)",
      timestamp: new Date().toISOString(),
    });

    render(<StockAnalysis />);

    const input = screen.getByPlaceholderText(/銘柄シンボル/i);
    const button = screen.getByRole("button", { name: /分析開始/i });

    fireEvent.change(input, { target: { value: "XYZ" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/SELL/i)).toBeInTheDocument();
      expect(screen.getByText(/75%/i)).toBeInTheDocument();
    });
  });

  it("displays error message on analysis failure", async () => {
    mockFetchStockQuote.mockRejectedValue(new Error("Invalid stock data"));
    mockAnalyzeStock.mockRejectedValue(new Error("Invalid stock data"));

    render(<StockAnalysis />);

    const input = screen.getByPlaceholderText(/銘柄シンボル/i);
    const button = screen.getByRole("button", { name: /分析開始/i });

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/エラー/i)).toBeInTheDocument();
    });
  });

  it("allows user to analyze multiple stocks", async () => {
    mockFetchStockQuote
      .mockResolvedValueOnce({
        symbol: "AAPL",
        price: 150.0,
        change: 2.0,
        change_percent: 1.5,
        volume: 50000000,
        timestamp: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        symbol: "MSFT",
        price: 300.0,
        change: 0.5,
        change_percent: 0.2,
        volume: 30000000,
        timestamp: new Date().toISOString(),
      });

    mockAnalyzeStock
      .mockResolvedValueOnce({
        recommendation: "BUY",
        confidence: 80,
        reasoning: "Good signals",
        timestamp: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        recommendation: "HOLD",
        confidence: 60,
        reasoning: "Neutral",
        timestamp: new Date().toISOString(),
      });

    render(<StockAnalysis />);

    const input = screen.getByPlaceholderText(/銘柄シンボル/i);
    const button = screen.getByRole("button", { name: /分析開始/i });

    // First analysis
    fireEvent.change(input, { target: { value: "AAPL" } });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText(/BUY/i)).toBeInTheDocument());

    // Second analysis
    fireEvent.change(input, { target: { value: "MSFT" } });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText(/HOLD/i)).toBeInTheDocument());

    expect(mockAnalyzeStock).toHaveBeenCalledTimes(2);
  });
});
