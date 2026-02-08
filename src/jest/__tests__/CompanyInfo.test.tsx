import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CompanyInfo } from "../../components/CompanyInfo";

jest.mock("@tauri-apps/api/core");
jest.mock("../../services/stockApi", () => ({
  fetchJapaneseStockProfileHybrid: jest.fn(),
  fetchJapaneseStockSentimentHybrid: jest.fn(),
  fetchCompanyNews: jest.fn(),
}));

describe("CompanyInfo component", () => {
  test("renders and has input and buttons", async () => {
    render(<CompanyInfo />);

    const input = screen.getByPlaceholderText(/銘柄シンボル/i);
    expect(input).toBeInTheDocument();

    const infoButton = screen.getByRole("button", { name: /情報取得/ });
    expect(infoButton).toBeInTheDocument();

    // Quick check: clicking should not throw
    fireEvent.click(infoButton);

    // エラーメッセージが表示されるまで待機（モックされているため）
    await waitFor(() => {
      // エラーが表示されても問題なし（モックのため）
      expect(input).toBeInTheDocument();
    });
  });
});
