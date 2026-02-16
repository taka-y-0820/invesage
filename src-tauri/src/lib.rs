use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

/// グローバルHTTPクライアント（タイムアウト設定済み）
static HTTP_CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .expect("Failed to create HTTP client")
});

/// Pythonスクリプトのタイムアウト（秒）
const PYTHON_SCRIPT_TIMEOUT_SECS: u64 = 30;

/// Pythonスクリプトをタイムアウト付きで実行するヘルパー
async fn run_python_script_with_timeout(
    script_path: &std::path::Path,
    args: &[&str],
    timeout_secs: u64,
) -> Result<(String, String), String> {
    use tokio::process::Command as TokioCommand;
    use tokio::time::{timeout, Duration};

    if !script_path.exists() {
        return Err(format!("Script not found: {:?}", script_path));
    }

    let mut cmd = TokioCommand::new("python");
    cmd.arg("-X").arg("utf8").arg(script_path);
    for arg in args {
        cmd.arg(arg);
    }

    if let Ok(cwd) = std::env::current_dir() {
        cmd.current_dir(cwd);
    }

    let child = cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            format!(
                "Failed to execute Python script: {}. Script path: {:?}\n\
                Make sure Python is installed and available in PATH.",
                e, script_path
            )
        })?;

    let output = timeout(Duration::from_secs(timeout_secs), child.wait_with_output())
        .await
        .map_err(|_| {
            format!(
                "Python script timed out after {} seconds: {:?}",
                timeout_secs, script_path
            )
        })?
        .map_err(|e| format!("Failed to wait for Python script: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!(
            "Python script failed (exit code: {:?}): stderr: {}",
            output.status.code(),
            stderr
        ));
    }

    if stdout.trim().is_empty() {
        return Err(format!(
            "Python script returned empty output. stderr: {}",
            stderr
        ));
    }

    if !stderr.is_empty() {
        eprintln!("🐍 Script stderr (info): {}", stderr);
    }

    Ok((stdout, stderr))
}

// .envファイルを読み込む（開発時のみ）
fn load_env() {
    #[cfg(debug_assertions)]
    {
        if let Err(e) = dotenvy::dotenv() {
            println!("⚠️  .env file not found or error loading: {}", e);
            println!("💡 Create a .env file in the project root with FINNHUB_API_KEY=your_key");
        } else {
            println!("✅ .env file loaded successfully");
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockQuote {
    pub symbol: String,
    pub price: f64,
    pub change: f64,
    pub change_percent: f64,
    pub volume: i64,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockDataPoint {
    pub time: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyProfile {
    pub symbol: String,
    pub name: String,
    pub country: String,
    pub currency: String,
    pub exchange: String,
    pub market_capitalization: f64,
    pub industry: String,
    pub sector: String,
    pub weburl: String,
    pub logo: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsSentiment {
    pub symbol: String,
    pub sentiment: f64,
    pub buzz_volume: f64,
    pub company_news_score: f64,
    pub sector_average_bullish_percent: f64,
    pub sector_average_news_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewsArticle {
    pub category: String,
    pub datetime: i64,
    pub headline: String,
    pub id: i64,
    pub image: String,
    pub related: String,
    pub source: String,
    pub summary: String,
    pub url: String,
}

/// Yahoo Finance APIからレスポンスを取得（リトライなし内部関数）
async fn fetch_yahoo_chart_raw(url: &str) -> Result<(reqwest::StatusCode, String), String> {
    let response = HTTP_CLIENT
        .get(url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("API request timed out: {}", e)
            } else if e.is_connect() {
                format!("API connection failed: {}", e)
            } else {
                format!("API request failed: {}", e)
            }
        })?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok((status, text))
}

/// Yahoo Finance APIからリアルタイム株価を取得（リトライ付き）
#[tauri::command]
async fn fetch_stock_quote(symbol: String) -> Result<StockQuote, String> {
    // Yahoo Finance API (v8) - 無料で利用可能
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}",
        symbol
    );

    println!("Fetching quote for: {}", symbol);

    // 最大3回リトライ（429 Too Many Requests 対策）
    let max_retries = 3;
    let mut last_status = reqwest::StatusCode::OK;
    let mut last_text = String::new();

    for attempt in 0..=max_retries {
        if attempt > 0 {
            // 指数バックオフ: 2秒, 4秒, 8秒
            let delay = 2000u64 * (1u64 << (attempt - 1));
            println!(
                "⏳ Retry {}/{} for {} after {}ms delay...",
                attempt, max_retries, symbol, delay
            );
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
        }

        let (status, text) = fetch_yahoo_chart_raw(&url).await?;
        last_status = status;
        last_text = text;

        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            println!(
                "⚠️ Rate limited (429) for {} (attempt {}/{})",
                symbol,
                attempt + 1,
                max_retries + 1
            );
            continue;
        }

        // 429以外のレスポンスはリトライしない
        break;
    }

    // 最終的に429のままの場合
    if last_status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(format!(
            "Rate limited (429) for {} after {} retries. Please try again later.",
            symbol, max_retries
        ));
    }

    // エラー時のみレスポンスをログ出力
    if !last_status.is_success() || last_text.contains("error") {
        println!(
            "Response for {} (status {}): {}",
            symbol,
            last_status,
            if last_text.len() > 300 {
                &last_text[..300]
            } else {
                &last_text
            }
        );
    }

    let json: serde_json::Value = serde_json::from_str(&last_text).map_err(|e| {
        format!(
            "Failed to parse JSON for {}: {} (status: {})",
            symbol, e, last_status
        )
    })?;

    // エラーチェック
    if let Some(error) = json.get("chart").and_then(|c| c.get("error")) {
        return Err(format!("API error for {}: {:?}", symbol, error));
    }

    // JSONから必要なデータを抽出
    let result = json["chart"]["result"]
        .as_array()
        .and_then(|arr| arr.first())
        .ok_or_else(|| format!("No result data for {}", symbol))?;

    let meta = &result["meta"];

    // 価格データの取得（複数のフィールドを試す）
    let regular_price = meta["regularMarketPrice"]
        .as_f64()
        .or_else(|| meta["previousClose"].as_f64())
        .unwrap_or(0.0);

    let previous_close = meta["chartPreviousClose"]
        .as_f64()
        .or_else(|| meta["previousClose"].as_f64())
        .unwrap_or(regular_price);

    let change = regular_price - previous_close;
    let change_percent = if previous_close != 0.0 {
        (change / previous_close) * 100.0
    } else {
        0.0
    };

    // volumeの取得
    let volume = if let Some(quote) = result["indicators"]["quote"]
        .as_array()
        .and_then(|arr| arr.first())
    {
        quote["volume"]
            .as_array()
            .and_then(|arr| arr.iter().rev().find_map(|v| v.as_i64()))
            .unwrap_or(0)
    } else {
        0
    };

    println!(
        "Successfully fetched {}: price={}, change={}%",
        symbol, regular_price, change_percent
    );

    Ok(StockQuote {
        symbol: symbol.clone(),
        price: regular_price,
        change,
        change_percent,
        volume,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// 株価の履歴データを取得
#[tauri::command]
async fn fetch_stock_history(
    symbol: String,
    period: String,
) -> Result<Vec<StockDataPoint>, String> {
    // period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?range={}&interval=1d",
        symbol, period
    );

    // 最大3回リトライ（429 Too Many Requests 対策）
    let max_retries = 3;
    let mut last_status = reqwest::StatusCode::OK;
    let mut last_text = String::new();

    for attempt in 0..=max_retries {
        if attempt > 0 {
            let delay = 2000u64 * (1u64 << (attempt - 1));
            println!(
                "⏳ Retry {}/{} for {} history after {}ms delay...",
                attempt, max_retries, symbol, delay
            );
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
        }

        let (status, text) = fetch_yahoo_chart_raw(&url).await?;
        last_status = status;
        last_text = text;

        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            println!(
                "⚠️ Rate limited (429) for {} history (attempt {}/{})",
                symbol,
                attempt + 1,
                max_retries + 1
            );
            continue;
        }

        break;
    }

    if last_status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(format!(
            "Rate limited (429) for {} history after {} retries",
            symbol, max_retries
        ));
    }

    let status = last_status;
    let text = last_text;

    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| {
        format!(
            "Failed to parse JSON for {}: {} (status: {})",
            symbol, e, status
        )
    })?;

    // エラーチェック
    if let Some(error) = json.get("chart").and_then(|c| c.get("error")) {
        return Err(format!("API error for {}: {:?}", symbol, error));
    }

    let result = json["chart"]["result"]
        .as_array()
        .and_then(|arr| arr.first())
        .ok_or_else(|| format!("No result data for {}", symbol))?;

    let timestamps = result["timestamp"]
        .as_array()
        .ok_or_else(|| format!("No timestamp data for {}", symbol))?;

    let quote = result["indicators"]["quote"]
        .as_array()
        .and_then(|arr| arr.first())
        .ok_or_else(|| format!("No quote data for {}", symbol))?;

    let opens = quote["open"].as_array().ok_or("No open data")?;
    let highs = quote["high"].as_array().ok_or("No high data")?;
    let lows = quote["low"].as_array().ok_or("No low data")?;
    let closes = quote["close"].as_array().ok_or("No close data")?;
    let volumes = quote["volume"].as_array().ok_or("No volume data")?;

    let mut data_points = Vec::new();

    for i in 0..timestamps.len() {
        // nullチェックを追加
        let ts = timestamps[i].as_i64();
        let o = opens.get(i).and_then(|v| v.as_f64());
        let h = highs.get(i).and_then(|v| v.as_f64());
        let l = lows.get(i).and_then(|v| v.as_f64());
        let c = closes.get(i).and_then(|v| v.as_f64());
        let v = volumes.get(i).and_then(|v| v.as_i64());

        if let (Some(ts), Some(o), Some(h), Some(l), Some(c)) = (ts, o, h, l, c) {
            let datetime = chrono::DateTime::from_timestamp(ts, 0).ok_or("Invalid timestamp")?;

            data_points.push(StockDataPoint {
                time: datetime.format("%Y-%m-%d").to_string(),
                open: o,
                high: h,
                low: l,
                close: c,
                volume: v.unwrap_or(0),
            });
        }
    }

    if data_points.is_empty() {
        return Err(format!("No valid data points for {}", symbol));
    }

    Ok(data_points)
}

/// 複数銘柄の株価を一括取得
/// 一部の銘柄が失敗しても、取得できたものは返す
/// レート制限回避のため、リクエスト間に遅延を入れる
#[tauri::command]
async fn fetch_multiple_quotes(symbols: Vec<String>) -> Result<Vec<StockQuote>, String> {
    let mut quotes = Vec::new();
    let mut errors = Vec::new();

    for (index, symbol) in symbols.iter().enumerate() {
        // 2番目以降のリクエストの前に2秒待機（レート制限回避を強化）
        if index > 0 {
            println!("Waiting 2 seconds before fetching {}...", symbol);
            tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
        }

        match fetch_stock_quote(symbol.clone()).await {
            Ok(quote) => quotes.push(quote),
            Err(e) => {
                eprintln!("Failed to fetch {}: {}", symbol, e);
                errors.push(format!("{}: {}", symbol, e));
            }
        }
    }

    // 1つも取得できなかった場合のみエラー
    if quotes.is_empty() && !errors.is_empty() {
        return Err(format!("All quotes failed: {}", errors.join(", ")));
    }

    Ok(quotes)
}

/// Finnhub APIから最新ニュースを取得（APIキー付き）
#[tauri::command]
async fn fetch_company_news_finnhub_with_key(
    symbol: String,
    from: String,
    to: String,
    api_key: String,
) -> Result<Vec<NewsArticle>, String> {
    if api_key.is_empty() || api_key == "demo" {
        return Err("有効なAPIキーが設定されていません".to_string());
    }

    let url = format!(
        "https://finnhub.io/api/v1/company-news?symbol={}&from={}&to={}&token={}",
        symbol, from, to, api_key
    );

    println!("📰 Fetching company news from Finnhub: {}", symbol);

    let response = HTTP_CLIENT
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Finnhub API request timed out: {}", e)
            } else {
                format!("Finnhub API request failed: {}", e)
            }
        })?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut articles = Vec::new();

    if let Some(news_array) = json.as_array() {
        for news in news_array.iter().take(10) {
            // 最新10件
            articles.push(NewsArticle {
                category: news["category"].as_str().unwrap_or("").to_string(),
                datetime: news["datetime"].as_i64().unwrap_or(0),
                headline: news["headline"].as_str().unwrap_or("").to_string(),
                id: news["id"].as_i64().unwrap_or(0),
                image: news["image"].as_str().unwrap_or("").to_string(),
                related: news["related"].as_str().unwrap_or("").to_string(),
                source: news["source"].as_str().unwrap_or("").to_string(),
                summary: news["summary"].as_str().unwrap_or("").to_string(),
                url: news["url"].as_str().unwrap_or("").to_string(),
            });
        }
    }

    println!("✅ Fetched {} news articles", articles.len());

    Ok(articles)
}

/// Finnhub APIから最新ニュースを取得（既存の環境変数版 - 互換性のため保持）
#[tauri::command]
async fn fetch_company_news_finnhub(
    symbol: String,
    from: String,
    to: String,
) -> Result<Vec<NewsArticle>, String> {
    let api_key = std::env::var("FINNHUB_API_KEY").unwrap_or_else(|_| "demo".to_string());

    let url = format!(
        "https://finnhub.io/api/v1/company-news?symbol={}&from={}&to={}&token={}",
        symbol, from, to, api_key
    );

    println!("📰 Fetching company news from Finnhub: {}", symbol);

    let response = HTTP_CLIENT
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Finnhub API request timed out: {}", e)
            } else {
                format!("Finnhub API request failed: {}", e)
            }
        })?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut articles = Vec::new();

    if let Some(news_array) = json.as_array() {
        for news in news_array.iter().take(10) {
            // 最新10件
            articles.push(NewsArticle {
                category: news["category"].as_str().unwrap_or("").to_string(),
                datetime: news["datetime"].as_i64().unwrap_or(0),
                headline: news["headline"].as_str().unwrap_or("").to_string(),
                id: news["id"].as_i64().unwrap_or(0),
                image: news["image"].as_str().unwrap_or("").to_string(),
                related: news["related"].as_str().unwrap_or("").to_string(),
                source: news["source"].as_str().unwrap_or("").to_string(),
                summary: news["summary"].as_str().unwrap_or("").to_string(),
                url: news["url"].as_str().unwrap_or("").to_string(),
            });
        }
    }

    println!("✅ Fetched {} news articles", articles.len());

    Ok(articles)
}

/// 拡張された包括的な日本株情報を取得
#[tauri::command]
async fn fetch_japanese_stock_comprehensive(symbol: String) -> Result<serde_json::Value, String> {
    println!(
        "🔄 Enhanced comprehensive Japanese stock fetch for: {}",
        symbol
    );

    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/enhanced_japanese_stock.py");

    let (stdout, _stderr) = run_python_script_with_timeout(
        &script_path,
        &["comprehensive", &symbol],
        PYTHON_SCRIPT_TIMEOUT_SECS,
    )
    .await?;

    serde_json::from_str(&stdout).map_err(|e| {
        format!(
            "Enhanced JSON parse error: {}. Raw output: {}",
            e, stdout
        )
    })
}

/// 現在の株価情報を取得
#[tauri::command]
async fn fetch_japanese_stock_price(symbol: String) -> Result<serde_json::Value, String> {
    println!("💰 Fetching current stock price for: {}", symbol);

    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/enhanced_japanese_stock.py");

    let (stdout, _stderr) = run_python_script_with_timeout(
        &script_path,
        &["price", &symbol],
        PYTHON_SCRIPT_TIMEOUT_SECS,
    )
    .await?;

    serde_json::from_str(&stdout).map_err(|e| format!("Price JSON parse error: {}", e))
}

/// チャートデータを取得
#[tauri::command]
async fn fetch_japanese_stock_chart(symbol: String) -> Result<serde_json::Value, String> {
    println!("📊 Fetching chart data for: {}", symbol);

    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/enhanced_japanese_stock.py");

    let (stdout, _stderr) = run_python_script_with_timeout(
        &script_path,
        &["chart", &symbol],
        PYTHON_SCRIPT_TIMEOUT_SECS,
    )
    .await?;

    serde_json::from_str(&stdout).map_err(|e| format!("Chart JSON parse error: {}", e))
}

/// スクレイピング + API の複合手法で日本株の企業プロフィールを取得
#[tauri::command]
async fn fetch_japanese_stock_profile_hybrid(symbol: String) -> Result<CompanyProfile, String> {
    println!(
        "🔄 Fetching Japanese stock profile via hybrid approach: {}",
        symbol
    );

    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/scrape_japanese_stock.py");

    let (stdout, _stderr) = run_python_script_with_timeout(
        &script_path,
        &["profile", &symbol],
        PYTHON_SCRIPT_TIMEOUT_SECS,
    )
    .await?;

    let profile: CompanyProfile = serde_json::from_str(&stdout).map_err(|e| {
        format!(
            "Failed to parse Python output for {}: {}\nRaw output: {}",
            symbol, e, stdout
        )
    })?;

    println!(
        "✅ Japanese stock profile fetched via hybrid approach: {} ({})",
        profile.name, profile.sector
    );

    Ok(profile)
}

/// TDnetから日本株のIR情報を取得
#[tauri::command]
async fn fetch_japanese_ir_info(symbol: String) -> Result<serde_json::Value, String> {
    println!(
        "📋 Fetching Japanese IR info from TDnet for: {}",
        symbol
    );

    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/fetch_tdnet.py");

    let (stdout, _stderr) = run_python_script_with_timeout(
        &script_path,
        &[&symbol],
        PYTHON_SCRIPT_TIMEOUT_SECS,
    )
    .await?;

    serde_json::from_str(&stdout).map_err(|e| {
        format!(
            "TDnet JSON parse error: {}. Raw output: {}",
            e,
            if stdout.len() > 500 { &stdout[..500] } else { &stdout }
        )
    })
}

/// Finnhub APIから決算カレンダーを取得
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EarningsCalendarItem {
    pub symbol: String,
    pub date: String,
    #[serde(default)]
    pub eps_actual: Option<f64>,
    #[serde(default)]
    pub eps_estimate: Option<f64>,
    #[serde(default)]
    pub revenue_actual: Option<f64>,
    #[serde(default)]
    pub revenue_estimate: Option<f64>,
    #[serde(default)]
    pub hour: String,
    #[serde(default)]
    pub quarter: i32,
    #[serde(default)]
    pub year: i32,
}

#[tauri::command]
async fn fetch_earnings_calendar_with_key(
    from: String,
    to: String,
    api_key: String,
) -> Result<Vec<EarningsCalendarItem>, String> {
    if api_key.is_empty() || api_key == "demo" {
        return Err("有効なAPIキーが設定されていません".to_string());
    }

    let url = format!(
        "https://finnhub.io/api/v1/calendar/earnings?from={}&to={}&token={}",
        from, to, api_key
    );

    println!("📅 Fetching earnings calendar: {} ~ {}", from, to);

    let response = HTTP_CLIENT
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Finnhub API request timed out: {}", e)
            } else {
                format!("Finnhub API request failed: {}", e)
            }
        })?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut items = Vec::new();

    if let Some(earnings_array) = json["earningsCalendar"].as_array() {
        for earning in earnings_array {
            items.push(EarningsCalendarItem {
                symbol: earning["symbol"].as_str().unwrap_or("").to_string(),
                date: earning["date"].as_str().unwrap_or("").to_string(),
                eps_actual: earning["epsActual"].as_f64(),
                eps_estimate: earning["epsEstimate"].as_f64(),
                revenue_actual: earning["revenueActual"].as_f64(),
                revenue_estimate: earning["revenueEstimate"].as_f64(),
                hour: earning["hour"].as_str().unwrap_or("").to_string(),
                quarter: earning["quarter"].as_i64().unwrap_or(0) as i32,
                year: earning["year"].as_i64().unwrap_or(0) as i32,
            });
        }
    }

    println!("✅ Fetched {} earnings calendar items", items.len());

    Ok(items)
}

#[tauri::command]
async fn fetch_earnings_calendar(from: String, to: String) -> Result<Vec<EarningsCalendarItem>, String> {
    let api_key = std::env::var("FINNHUB_API_KEY").unwrap_or_else(|_| "demo".to_string());

    let url = format!(
        "https://finnhub.io/api/v1/calendar/earnings?from={}&to={}&token={}",
        from, to, api_key
    );

    println!("📅 Fetching earnings calendar: {} ~ {}", from, to);

    let response = HTTP_CLIENT
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Earnings calendar API request timed out: {}", e)
            } else {
                format!("Earnings calendar API request failed: {}", e)
            }
        })?;

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse earnings calendar JSON: {}", e))?;

    let mut items = Vec::new();

    if let Some(earnings_array) = json.get("earningsCalendar").and_then(|v| v.as_array()) {
        for item in earnings_array {
            let symbol = item["symbol"].as_str().unwrap_or("").to_string();
            if symbol.is_empty() {
                continue;
            }

            items.push(EarningsCalendarItem {
                symbol,
                date: item["date"].as_str().unwrap_or("").to_string(),
                eps_actual: item["epsActual"].as_f64(),
                eps_estimate: item["epsEstimate"].as_f64(),
                revenue_actual: item["revenueActual"].as_f64(),
                revenue_estimate: item["revenueEstimate"].as_f64(),
                hour: item["hour"].as_str().unwrap_or("").to_string(),
                quarter: item["quarter"].as_i64().unwrap_or(0) as i32,
                year: item["year"].as_i64().unwrap_or(0) as i32,
            });
        }
    }

    println!("✅ Fetched {} earnings calendar items", items.len());

    Ok(items)
}

/// TDnet等のPDFをプロキシ経由でダウンロードし、Base64で返す（リトライ付き）
#[tauri::command]
async fn proxy_fetch_pdf(url: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    println!("📄 Proxy fetching PDF: {}", url);

    // PDF用クライアント（タイムアウト30秒）
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // 最大2回リトライ
    let max_retries = 2;
    let mut last_error = String::new();

    for attempt in 0..=max_retries {
        if attempt > 0 {
            let delay = 2000u64 * (1u64 << (attempt - 1));
            println!(
                "⏳ PDF retry {}/{} after {}ms delay...",
                attempt, max_retries, delay
            );
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
        }

        match client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .header("Accept", "application/pdf,*/*")
            .header("Accept-Language", "ja,en-US;q=0.5")
            .send()
            .await
        {
            Ok(response) => {
                if !response.status().is_success() {
                    last_error = format!("PDF fetch returned status: {}", response.status());
                    // 4xx エラーはリトライしない
                    if response.status().is_client_error() {
                        return Err(last_error);
                    }
                    continue;
                }

                let bytes = response
                    .bytes()
                    .await
                    .map_err(|e| format!("Failed to read PDF bytes: {}", e))?;

                if bytes.is_empty() {
                    last_error = "PDF response was empty".to_string();
                    continue;
                }

                println!("✅ PDF fetched successfully: {} bytes", bytes.len());

                let base64_data = STANDARD.encode(&bytes);
                return Ok(base64_data);
            }
            Err(e) => {
                if e.is_timeout() {
                    last_error = format!("PDF fetch timed out: {}", e);
                } else {
                    last_error = format!("PDF fetch failed: {}", e);
                }
                continue;
            }
        }
    }

    Err(format!(
        "PDF fetch failed after {} retries: {}",
        max_retries, last_error
    ))
}

/// 複数銘柄の株価を高速バッチ取得（セクターヒートマップ用）
/// fetch_multiple_quotes とは異なり、取得できなかった銘柄は無視して返す
/// レート制限回避のため、1銘柄あたり1.5秒の間隔を空ける
#[tauri::command]
async fn fetch_sector_quotes(symbols: Vec<String>) -> Result<Vec<StockQuote>, String> {
    println!("📊 Fetching sector quotes for {} symbols", symbols.len());

    let mut all_quotes = Vec::new();
    let mut consecutive_rate_limits = 0u32;

    for (index, symbol) in symbols.iter().enumerate() {
        // 最初のリクエスト以降は待機
        if index > 0 {
            // 連続でレート制限を受けた場合、待機時間を延長
            let delay = if consecutive_rate_limits >= 3 {
                5000u64 // 3回連続429なら5秒待機
            } else if consecutive_rate_limits >= 1 {
                3000u64 // 1回でも429なら3秒待機
            } else {
                1500u64 // 通常は1.5秒間隔
            };
            tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
        }

        match fetch_stock_quote(symbol.clone()).await {
            Ok(quote) => {
                consecutive_rate_limits = 0; // 成功したらカウントリセット
                all_quotes.push(quote);
            }
            Err(e) => {
                if e.contains("429") || e.contains("Rate limited") {
                    consecutive_rate_limits += 1;
                    eprintln!(
                        "⚠️ Rate limited for {} (consecutive: {})",
                        symbol, consecutive_rate_limits
                    );
                } else {
                    consecutive_rate_limits = 0;
                    eprintln!("⚠️ Skipping {}: {}", symbol, e);
                }
            }
        }

        // 進捗ログ（10銘柄ごと）
        if (index + 1) % 10 == 0 {
            println!(
                "📊 Progress: {}/{} symbols fetched ({} successful)",
                index + 1,
                symbols.len(),
                all_quotes.len()
            );
        }
    }

    println!(
        "✅ Fetched {}/{} sector quotes",
        all_quotes.len(),
        symbols.len()
    );
    Ok(all_quotes)
}

/// スクレイピング + API の複合手法で日本株のセンチメントを取得
#[tauri::command]
async fn fetch_japanese_stock_sentiment_hybrid(symbol: String) -> Result<NewsSentiment, String> {
    println!(
        "🔄 Fetching Japanese stock sentiment via hybrid approach: {}",
        symbol
    );

    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/scrape_japanese_stock.py");

    let (stdout, _stderr) = run_python_script_with_timeout(
        &script_path,
        &["sentiment", &symbol],
        PYTHON_SCRIPT_TIMEOUT_SECS,
    )
    .await?;

    let sentiment: NewsSentiment = serde_json::from_str(&stdout).map_err(|e| {
        format!(
            "Failed to parse Python sentiment output for {}: {}\nRaw output: {}",
            symbol, e, stdout
        )
    })?;

    println!("✅ Japanese stock sentiment fetched via hybrid approach");

    Ok(sentiment)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // .envファイルを読み込む
    load_env();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            fetch_stock_quote,
            fetch_stock_history,
            fetch_multiple_quotes,
            fetch_sector_quotes,
            fetch_company_news_finnhub,
            fetch_company_news_finnhub_with_key,
            fetch_japanese_ir_info,
            fetch_japanese_stock_profile_hybrid,
            fetch_japanese_stock_sentiment_hybrid,
            fetch_japanese_stock_comprehensive,
            fetch_japanese_stock_price,
            fetch_japanese_stock_chart,
            proxy_fetch_pdf,
            fetch_earnings_calendar,
            fetch_earnings_calendar_with_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
