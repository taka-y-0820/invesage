import "@testing-library/jest-dom";

// Tauri API のモック
jest.mock("@tauri-apps/api/core", () => ({
  invoke: jest.fn(),
}));

// console.error と console.warn を抑制（テスト中の予期されたログを非表示）
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // React の act() 警告を抑制
    if (
      typeof args[0] === "string" &&
      args[0].includes("An update to") &&
      args[0].includes("was not wrapped in act")
    ) {
      return;
    }
    // Tauri invoke エラーを抑制
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Failed to fetch") ||
        args[0].includes("Cannot read properties of undefined"))
    ) {
      return;
    }
    // その他のエラーは表示
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    // News fetch のテスト用警告を抑制
    if (typeof args[0] === "string" && args[0].includes("News fetch failed")) {
      return;
    }
    // その他の警告は表示
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
