use serde::{Deserialize, Serialize};

// .envファイルを読み込む（開発時のみ）
fn load_env() {
    #[cfg(debug_assertions)]
    {
        if let Err(e) = dotenvy::dotenv() {
            println!("⚠️  .env file not found or error loading: {}", e);
            println!("💡 Create a .env file in the project root with ALPHA_VANTAGE_API_KEY=your_key");
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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Alpha Vantage APIから株価を取得（レート制限が緩い）
#[tauri::command]
async fn fetch_stock_quote_alpha_vantage(symbol: String) -> Result<StockQuote, String> {
    let api_key = std::env::var("ALPHA_VANTAGE_API_KEY")
        .unwrap_or_else(|_| "demo".to_string());
    
    let url = format!(
        "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={}&apikey={}",
        symbol, api_key
    );
    
    println!("Fetching quote from Alpha Vantage: {}", symbol);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    // Alpha Vantageのレスポンス形式
    let quote = &json["Global Quote"];
    
    // エラーチェック
    if quote.is_null() || json.get("Note").is_some() {
        return Err(format!("API limit or invalid symbol: {}", symbol));
    }
    
    let price = quote["05. price"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    
    let change = quote["09. change"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    
    let change_percent_str = quote["10. change percent"]
        .as_str()
        .unwrap_or("0%");
    
    let change_percent = change_percent_str
        .trim_end_matches('%')
        .parse::<f64>()
        .unwrap_or(0.0);
    
    let volume = quote["06. volume"]
        .as_str()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);
    
    println!("Successfully fetched {}: price={}, change={}%", symbol, price, change_percent);
    
    Ok(StockQuote {
        symbol: symbol.clone(),
        price,
        change,
        change_percent,
        volume,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// Yahoo Finance APIからリアルタイム株価を取得
#[tauri::command]
async fn fetch_stock_quote(symbol: String) -> Result<StockQuote, String> {
    // Yahoo Finance API (v8) - 無料で利用可能
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}",
        symbol
    );
    
    println!("Fetching quote for: {}", symbol);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    // エラー時のみレスポンスをログ出力
    if !status.is_success() || text.contains("error") {
        println!("Response for {} (status {}): {}", symbol, status, 
                 if text.len() > 300 { &text[..300] } else { &text });
    }
    
    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse JSON for {}: {} (status: {})", symbol, e, status))?;
    
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
    let volume = if let Some(quote) = result["indicators"]["quote"].as_array().and_then(|arr| arr.first()) {
        quote["volume"]
            .as_array()
            .and_then(|arr| arr.iter().rev().find_map(|v| v.as_i64()))
            .unwrap_or(0)
    } else {
        0
    };
    
    println!("Successfully fetched {}: price={}, change={}%", symbol, regular_price, change_percent);
    
    Ok(StockQuote {
        symbol: symbol.clone(),
        price: regular_price,
        change,
        change_percent,
        volume,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

/// Alpha Vantage APIから株価履歴を取得
#[tauri::command]
async fn fetch_stock_history_alpha_vantage(symbol: String, period: String) -> Result<Vec<StockDataPoint>, String> {
    let api_key = std::env::var("ALPHA_VANTAGE_API_KEY")
        .unwrap_or_else(|_| {
            println!("⚠️  ALPHA_VANTAGE_API_KEY not found in environment, using demo key");
            "demo".to_string()
        });
    
    println!("📊 Using API key: {}...", &api_key.chars().take(4).collect::<String>());
    
    // periodに応じてoutputsizeを決定
    let outputsize = if period == "1mo" || period == "1d" || period == "5d" {
        "compact" // 最新100日分
    } else {
        "full" // 全データ
    };
    
    let url = format!(
        "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={}&outputsize={}&apikey={}",
        symbol, outputsize, api_key
    );
    
    println!("Fetching history from Alpha Vantage: {} ({})", symbol, outputsize);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    // レスポンスの最初の部分をログ出力
    println!("📥 API Response (first 500 chars): {}", 
             if text.len() > 500 { &text[..500] } else { &text });
    
    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse JSON: {} (status: {})", e, status))?;
    
    // エラーメッセージをチェック
    if let Some(error_msg) = json.get("Error Message") {
        return Err(format!("API Error: {}", error_msg));
    }
    
    if let Some(note) = json.get("Note") {
        return Err(format!("API Note (rate limit?): {}", note));
    }
    
    let time_series = &json["Time Series (Daily)"];
    
    if time_series.is_null() {
        println!("❌ No 'Time Series (Daily)' found in response");
        println!("📄 Full response: {}", serde_json::to_string_pretty(&json).unwrap_or_default());
        return Err(format!("No data available for {}", symbol));
    }
    
    let mut data_points = Vec::new();
    
    if let Some(obj) = time_series.as_object() {
        let mut dates: Vec<_> = obj.keys().collect();
        dates.sort();
        dates.reverse(); // 新しい順
        
        for date in dates.iter().take(100) { // 最大100日分
            if let Some(day_data) = obj.get(*date) {
                let open = day_data["1. open"].as_str()
                    .and_then(|s| s.parse::<f64>().ok())
                    .unwrap_or(0.0);
                let high = day_data["2. high"].as_str()
                    .and_then(|s| s.parse::<f64>().ok())
                    .unwrap_or(0.0);
                let low = day_data["3. low"].as_str()
                    .and_then(|s| s.parse::<f64>().ok())
                    .unwrap_or(0.0);
                let close = day_data["4. close"].as_str()
                    .and_then(|s| s.parse::<f64>().ok())
                    .unwrap_or(0.0);
                let volume = day_data["5. volume"].as_str()
                    .and_then(|s| s.parse::<i64>().ok())
                    .unwrap_or(0);
                
                data_points.push(StockDataPoint {
                    time: date.to_string(),
                    open,
                    high,
                    low,
                    close,
                    volume,
                });
            }
        }
    }
    
    data_points.reverse(); // 古い順に戻す
    
    println!("✅ Fetched {} data points for {}", data_points.len(), symbol);
    
    Ok(data_points)
}

/// 株価の履歴データを取得
#[tauri::command]
async fn fetch_stock_history(symbol: String, period: String) -> Result<Vec<StockDataPoint>, String> {
    // period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?range={}&interval=1d",
        symbol, period
    );
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse JSON for {}: {} (status: {})", symbol, e, status))?;
    
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
            let datetime = chrono::DateTime::from_timestamp(ts, 0)
                .ok_or("Invalid timestamp")?;
            
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

/// Finnhub APIから企業プロフィールを取得（セクター情報含む）
#[tauri::command]
async fn fetch_company_profile_finnhub(symbol: String) -> Result<CompanyProfile, String> {
    let api_key = std::env::var("FINNHUB_API_KEY")
        .unwrap_or_else(|_| "demo".to_string());
    
    let url = format!(
        "https://finnhub.io/api/v1/stock/profile2?symbol={}&token={}",
        symbol, api_key
    );
    
    println!("📊 Fetching company profile from Finnhub: {}", symbol);
    println!("🔗 URL: {}", url.replace(&api_key, "***"));
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    let status = response.status();
    println!("📡 Response status: {}", status);
    
    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    println!("📦 Response JSON: {}", serde_json::to_string_pretty(&json).unwrap_or_else(|_| "Invalid JSON".to_string()));
    
    // エラーチェック
    if json.get("error").is_some() {
        return Err(format!("API error: {}", json["error"]));
    }
    
    if json.is_null() || json.get("name").is_none() {
        return Err(format!("No data found for symbol: {} (empty response from API)", symbol));
    }
    
    let profile = CompanyProfile {
        symbol: symbol.clone(),
        name: json["name"].as_str().unwrap_or("Unknown").to_string(),
        country: json["country"].as_str().unwrap_or("").to_string(),
        currency: json["currency"].as_str().unwrap_or("USD").to_string(),
        exchange: json["exchange"].as_str().unwrap_or("").to_string(),
        market_capitalization: json["marketCapitalization"].as_f64().unwrap_or(0.0),
        industry: json["finnhubIndustry"].as_str().unwrap_or("").to_string(),
        sector: json["finnhubIndustry"].as_str().unwrap_or("").to_string(), // セクター情報
        weburl: json["weburl"].as_str().unwrap_or("").to_string(),
        logo: json["logo"].as_str().unwrap_or("").to_string(),
    };
    
    println!("✅ Company profile fetched: {} ({})", profile.name, profile.sector);
    
    Ok(profile)
}

/// Finnhub APIからニュースセンチメントを取得（注目度測定）
#[tauri::command]
async fn fetch_news_sentiment_finnhub(symbol: String) -> Result<NewsSentiment, String> {
    let api_key = std::env::var("FINNHUB_API_KEY")
        .unwrap_or_else(|_| "demo".to_string());
    
    let url = format!(
        "https://finnhub.io/api/v1/news-sentiment?symbol={}&token={}",
        symbol, api_key
    );
    
    println!("📰 Fetching news sentiment from Finnhub: {}", symbol);
    println!("🔗 URL: {}", url.replace(&api_key, "***"));
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    let status = response.status();
    println!("📡 Response status: {}", status);
    
    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    println!("📦 Response JSON: {}", serde_json::to_string_pretty(&json).unwrap_or_else(|_| "Invalid JSON".to_string()));
    
    // エラーチェック
    if json.get("error").is_some() {
        return Err(format!("API error: {}", json["error"]));
    }
    
    let sentiment_data = &json["sentiment"];
    let buzz_data = &json["buzz"];
    
    let sentiment = NewsSentiment {
        symbol: symbol.clone(),
        sentiment: sentiment_data["companyNewsScore"].as_f64().unwrap_or(0.0),
        buzz_volume: buzz_data["articlesInLastWeek"].as_f64().unwrap_or(0.0),
        company_news_score: sentiment_data["companyNewsScore"].as_f64().unwrap_or(0.0),
        sector_average_bullish_percent: sentiment_data["sectorAverageBullishPercent"].as_f64().unwrap_or(0.0),
        sector_average_news_score: sentiment_data["sectorAverageNewsScore"].as_f64().unwrap_or(0.0),
    };
    
    println!("✅ News sentiment: score={:.2}, buzz={:.0}", sentiment.sentiment, sentiment.buzz_volume);
    
    Ok(sentiment)
}

/// Finnhub APIから最新ニュースを取得
#[tauri::command]
async fn fetch_company_news_finnhub(symbol: String, from: String, to: String) -> Result<Vec<NewsArticle>, String> {
    let api_key = std::env::var("FINNHUB_API_KEY")
        .unwrap_or_else(|_| "demo".to_string());
    
    let url = format!(
        "https://finnhub.io/api/v1/company-news?symbol={}&from={}&to={}&token={}",
        symbol, from, to, api_key
    );
    
    println!("📰 Fetching company news from Finnhub: {}", symbol);
    
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let mut articles = Vec::new();
    
    if let Some(news_array) = json.as_array() {
        for news in news_array.iter().take(10) { // 最新10件
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

/// Pythonスクリプトで日本株の企業プロフィールを取得（yfinance使用）
#[tauri::command]
async fn fetch_japanese_stock_profile(symbol: String) -> Result<CompanyProfile, String> {
    println!("🐍 Fetching Japanese stock profile via Python: {}", symbol);
    
    // Pythonスクリプトのパスを取得
    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/fetch_japanese_stock.py");
    
    // Pythonスクリプトを実行
    let output = std::process::Command::new("python")
        .arg(script_path)
        .arg("profile")
        .arg(&symbol)
        .output()
        .map_err(|e| format!("Failed to execute Python script: {}. Make sure Python is installed and yfinance is available.", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python script error: {}", error));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    println!("🐍 Python output: {}", stdout);
    
    // JSONをパース
    let profile: CompanyProfile = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse Python output: {}", e))?;
    
    println!("✅ Japanese stock profile fetched: {} ({})", profile.name, profile.sector);
    
    Ok(profile)
}

/// Pythonスクリプトで日本株のニュースセンチメントを取得
#[tauri::command]
async fn fetch_japanese_stock_sentiment(symbol: String) -> Result<NewsSentiment, String> {
    println!("🐍 Fetching Japanese stock sentiment via Python: {}", symbol);
    
    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/fetch_japanese_stock.py");
    
    let output = std::process::Command::new("python")
        .arg(script_path)
        .arg("sentiment")
        .arg(&symbol)
        .output()
        .map_err(|e| format!("Failed to execute Python script: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Python script error: {}", error));
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    let sentiment: NewsSentiment = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse Python output: {}", e))?;
    
    println!("✅ Japanese stock sentiment fetched");
    
    Ok(sentiment)
}

/// 拡張された包括的な日本株情報を取得
#[tauri::command]
async fn fetch_japanese_stock_comprehensive(symbol: String) -> Result<serde_json::Value, String> {
    use std::process::Command;
    
    println!("🔄 Enhanced comprehensive Japanese stock fetch for: {}", symbol);
    
    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/enhanced_japanese_stock.py");
        
    // スクリプトファイルの存在確認
    if !script_path.exists() {
        return Err(format!("Enhanced script not found: {:?}", script_path));
    }
    
    let output = Command::new("python")
        .arg(script_path.clone())
        .arg("comprehensive")
        .arg(&symbol)
        .current_dir(std::env::current_dir().unwrap())
        .output()
        .map_err(|e| format!("Enhanced script execution failed: {}", e))?;

    let stderr_output = String::from_utf8_lossy(&output.stderr);
    let stdout_output = String::from_utf8_lossy(&output.stdout);

    if !output.status.success() {
        eprintln!("⚠️ Enhanced script stderr: {}", stderr_output);
        return Err(format!("Enhanced script failed with exit code: {:?}, stderr: {}", output.status.code(), stderr_output));
    }

    // デバッグ出力
    eprintln!("Enhanced script stdout: {}", stdout_output);
    if !stderr_output.is_empty() {
        eprintln!("Enhanced script stderr (info): {}", stderr_output);
    }
    
    if stdout_output.trim().is_empty() {
        return Err(format!("Enhanced script returned empty output for {}", symbol));
    }
    
    serde_json::from_str(&stdout_output)
        .map_err(|e| format!("Enhanced JSON parse error: {}. Raw output: {}", e, stdout_output))
}

/// 現在の株価情報を取得
#[tauri::command]
async fn fetch_japanese_stock_price(symbol: String) -> Result<serde_json::Value, String> {
    use std::process::Command;
    
    println!("💰 Fetching current stock price for: {}", symbol);
    
    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/enhanced_japanese_stock.py");
    
    let output = Command::new("python")
        .arg(script_path)
        .arg("price")
        .arg(&symbol)
        .current_dir(std::env::current_dir().unwrap())
        .output()
        .map_err(|e| format!("Price fetch script execution failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Price fetch script failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout)
        .map_err(|e| format!("Price JSON parse error: {}", e))
}

/// チャートデータを取得
#[tauri::command]
async fn fetch_japanese_stock_chart(symbol: String) -> Result<serde_json::Value, String> {
    use std::process::Command;
    
    println!("📊 Fetching chart data for: {}", symbol);
    
    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/enhanced_japanese_stock.py");
    
    let output = Command::new("python")
        .arg(script_path)
        .arg("chart")
        .arg(&symbol)
        .current_dir(std::env::current_dir().unwrap())
        .output()
        .map_err(|e| format!("Chart fetch script execution failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Chart fetch script failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    serde_json::from_str(&stdout)
        .map_err(|e| format!("Chart JSON parse error: {}", e))
}

/// スクレイピング + API の複合手法で日本株の企業プロフィールを取得
#[tauri::command]
async fn fetch_japanese_stock_profile_hybrid(symbol: String) -> Result<CompanyProfile, String> {
    println!("🔄 Fetching Japanese stock profile via hybrid approach: {}", symbol);
    
    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/scrape_japanese_stock.py");
    
    // スクリプトファイルの存在確認
    if !script_path.exists() {
        return Err(format!("Scraping script not found: {:?}", script_path));
    }
    
    let output = std::process::Command::new("python")
        .arg("-X")
        .arg("utf8")  // UTF-8モードを強制
        .arg(script_path.clone())
        .arg("profile")
        .arg(&symbol)
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute Python scraping script: {}. \n\
                Script path: {:?}\n\
                Make sure Python is installed and available in PATH.",
                e, script_path
            )
        })?;
    
    let stderr_output = String::from_utf8(output.stderr)
        .map_err(|e| format!("Failed to decode stderr as UTF-8: {}", e))?;
    let stdout_output = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to decode stdout as UTF-8: {}", e))?;
    
    if !output.status.success() {
        println!("⚠️ Python script stderr: {}", stderr_output);
        return Err(format!(
            "Python scraping script error (exit code: {:?}): {}\n\
            Script stderr: {}",
            output.status.code(), stdout_output, stderr_output
        ));
    }
    
    println!("🐍 Hybrid Python stderr (info): {}", stderr_output);
    println!("🐍 Hybrid Python stdout: {}", stdout_output);
    
    if stdout_output.trim().is_empty() {
        return Err(format!(
            "Python script returned empty output for {}. \n\
            Stderr: {}",
            symbol, stderr_output
        ));
    }
    
    let profile: CompanyProfile = serde_json::from_str(&stdout_output)
        .map_err(|e| {
            format!(
                "Failed to parse Python output for {}: {}\n\
                Raw output: {}\n\
                Parse error: {}",
                symbol, e, stdout_output, e
            )
        })?;
    
    println!("✅ Japanese stock profile fetched via hybrid approach: {} ({})", profile.name, profile.sector);
    
    Ok(profile)
}

/// スクレイピング + API の複合手法で日本株のセンチメントを取得
#[tauri::command]
async fn fetch_japanese_stock_sentiment_hybrid(symbol: String) -> Result<NewsSentiment, String> {
    println!("🔄 Fetching Japanese stock sentiment via hybrid approach: {}", symbol);
    
    let script_path = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("../scripts/scrape_japanese_stock.py");
    
    if !script_path.exists() {
        return Err(format!("Scraping script not found: {:?}", script_path));
    }
    
    let output = std::process::Command::new("python")
        .arg("-X")
        .arg("utf8")  // UTF-8モードを強制
        .arg(script_path.clone())
        .arg("sentiment")
        .arg(&symbol)
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute Python scraping script: {}. \n\
                Script path: {:?}\n\
                Make sure Python is installed and available in PATH.",
                e, script_path
            )
        })?;
    
    let stderr_output = String::from_utf8(output.stderr)
        .map_err(|e| format!("Failed to decode stderr as UTF-8: {}", e))?;
    let stdout_output = String::from_utf8(output.stdout)
        .map_err(|e| format!("Failed to decode stdout as UTF-8: {}", e))?;
    
    if !output.status.success() {
        println!("⚠️ Python script stderr: {}", stderr_output);
        return Err(format!(
            "Python scraping script error (exit code: {:?}): {}\n\
            Script stderr: {};",
            output.status.code(), stdout_output, stderr_output
        ));
    }
    
    if stdout_output.trim().is_empty() {
        return Err(format!(
            "Python script returned empty sentiment output for {}. \n\
            Stderr: {}",
            symbol, stderr_output
        ));
    }
    
    let sentiment: NewsSentiment = serde_json::from_str(&stdout_output)
        .map_err(|e| {
            format!(
                "Failed to parse Python sentiment output for {}: {}\n\
                Raw output: {}\n\
                Parse error: {}",
                symbol, e, stdout_output, e
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
            greet,
            fetch_stock_quote,
            fetch_stock_history,
            fetch_multiple_quotes,
            fetch_stock_quote_alpha_vantage,
            fetch_stock_history_alpha_vantage,
            fetch_company_profile_finnhub,
            fetch_news_sentiment_finnhub,
            fetch_company_news_finnhub,
            fetch_japanese_stock_profile,
            fetch_japanese_stock_sentiment,
            fetch_japanese_stock_profile_hybrid,
            fetch_japanese_stock_sentiment_hybrid,
            fetch_japanese_stock_comprehensive,
            fetch_japanese_stock_price,
            fetch_japanese_stock_chart
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
