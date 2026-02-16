/// <reference types="testcafe" />
import { Selector } from "testcafe";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:1420/";

fixture`CompanyInfo E2E`.page`${BASE_URL}`;

test("CompanyInfo loads and can query", async (t) => {
  const input = Selector(
    'input[placeholder="銘柄シンボル (例: 7203.T)"]'
  );
  const button = Selector("button").withText("情報取得");

  await t
    .expect(input.exists)
    .ok()
    .typeText(input, "7203.T")
    .click(button)
    .wait(2000)
    .expect(Selector("h2").withText("🏢 企業情報").exists)
    .ok();
});
