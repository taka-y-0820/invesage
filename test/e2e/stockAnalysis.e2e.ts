/// <reference types="testcafe" />
import { Selector } from "testcafe";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:1420/";

fixture`Stock Analysis E2E - AI Analysis Flow`.page`${BASE_URL}`;

test("User can analyze a stock and see AI recommendation", async (t) => {
  // StockAnalysis コンポーネントが表示されていることを確認
  const heading = Selector("h2").withText("🤖 AI 株式分析");
  await t.expect(heading.exists).ok("AI 株式分析ヘッダーが表示されていません");

  // 入力フィールドとボタンを取得
  const input = Selector('input[placeholder*="銘柄シンボル"]');
  const button = Selector("button").withText("分析開始");

  await t
    .expect(input.exists)
    .ok("入力フィールドが見つかりません")
    .expect(button.exists)
    .ok("分析ボタンが見つかりません");

  // 銘柄シンボルを入力
  await t
    .typeText(input, "AAPL")
    .expect(input.value)
    .eql("AAPL", "入力値が正しく設定されていません");

  // 分析を実行
  await t.click(button);

  // ローディング状態を確認（オプション）
  // const loadingText = Selector('button').withText('分析中...');
  // await t.expect(loadingText.exists).ok('ローディング状態が表示されません', { timeout: 1000 });

  // 分析結果が表示されるまで待機（最大10秒）
  const resultContainer = Selector("div").withText("分析結果");
  await t
    .expect(resultContainer.exists)
    .ok("分析結果が表示されません", { timeout: 10000 });

  // 推奨アクション（BUY/SELL/HOLD）が表示されることを確認
  const recommendation = Selector("span").withText(/BUY|SELL|HOLD/);
  await t.expect(recommendation.exists).ok("推奨アクションが表示されません");

  // 信頼度が表示されることを確認
  const confidence = Selector("span").withText(/%/);
  await t.expect(confidence.exists).ok("信頼度が表示されません");

  // 分析根拠が表示されることを確認
  const reasoning = Selector("h4").withText("📊 分析根拠");
  await t.expect(reasoning.exists).ok("分析根拠が表示されません");
});

test("User can analyze multiple stocks sequentially", async (t) => {
  const input = Selector('input[placeholder*="銘柄シンボル"]');
  const button = Selector("button").withText("分析開始");

  // 1つ目の銘柄を分析
  await t.typeText(input, "NVDA").click(button);

  const firstResult = Selector("div").withText("分析結果: NVDA");
  await t
    .expect(firstResult.exists)
    .ok("1つ目の分析結果が表示されません", { timeout: 10000 });

  // 2つ目の銘柄を分析
  await t.selectText(input).typeText(input, "MSFT").click(button);

  const secondResult = Selector("div").withText("分析結果: MSFT");
  await t
    .expect(secondResult.exists)
    .ok("2つ目の分析結果が表示されません", { timeout: 10000 });
});

test("Shows error when invalid symbol is entered", async (t) => {
  const input = Selector('input[placeholder*="銘柄シンボル"]');
  const button = Selector("button").withText("分析開始");

  // 空のシンボルで分析を試行
  await t
    .click(input) // フォーカス
    .pressKey("ctrl+a delete") // クリア
    .click(button);

  // エラーメッセージが表示されることを確認
  const errorMessage = Selector("div").withText(/エラー/i);
  await t
    .expect(errorMessage.exists)
    .ok("エラーメッセージが表示されません", { timeout: 3000 });
});
