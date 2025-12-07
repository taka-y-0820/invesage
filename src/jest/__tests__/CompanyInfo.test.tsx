import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompanyInfo } from "../../components/CompanyInfo";

describe("CompanyInfo component", () => {
  test("renders and has input and buttons", () => {
    render(<CompanyInfo />);

    const input = screen.getByPlaceholderText(/銘柄シンボル/i);
    expect(input).toBeInTheDocument();

    const infoButton = screen.getByRole("button", { name: /情報取得/ });
    expect(infoButton).toBeInTheDocument();

    // Quick check: clicking should not throw
    fireEvent.click(infoButton);
  });
});
