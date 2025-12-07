#!/usr/bin/env python3
"""
日本株の企業情報をスクレイピング + API の複合手法で取得
多段階フォールバック戦略を実装
"""

# UTF-8エンコーディングを強制設定
import sys
import io

# Windows環境での文字化け対策
if sys.platform == 'win32':
    # stdoutとstderrをUTF-8に設定
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time
import random
import re
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

# ユーザーエージェント（ブロック回避）
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
]

def get_headers():
    """ランダムなヘッダーを返す"""
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }

def clean_symbol(symbol):
    """シンボルを正規化（.T を削除してコードのみ取得）"""
    return symbol.replace('.T', '').replace('.TYO', '')

def clean_company_name(raw_name, symbol):
    """企業名をクリーニングする"""
    if not raw_name or raw_name.strip() == "":
        return "不明"
    
    name = raw_name.strip()
    
    # 不要な文字列パターンを除去
    patterns_to_remove = [
        r'\(株\)', r'（株）', r'株式会社',
        r'\([0-9]+\)', r'（[0-9]+）',  # 銘柄コード
        r'基本情報$', r'株価$', r'情報$',
        r'の株価.*$', r'について$',
        r'決算短信.*$', r'AI要約.*$',
        r'：.*$', r'【.*】',
        r'\s+$', r'^\s+',  # 先頭末尾の空白
    ]
    
    for pattern in patterns_to_remove:
        name = re.sub(pattern, '', name)
    
    # 長すぎる場合は最初の部分のみ
    if len(name) > 50:
        name = name[:50].strip()
    
    # 短すぎる場合はフォールバック
    if len(name) < 2:
        return get_fallback_company_name(symbol)[0] if get_fallback_company_name(symbol) else "不明"
    
    return name.strip()

def get_fallback_company_name(symbol):
    """シンボルから推測される企業名リスト"""
    fallback_names = {
        "7203.T": ["トヨタ自動車", "TOYOTA"],
        "9984.T": ["ソフトバンクグループ", "SoftBank"],
        "6758.T": ["ソニーグループ", "Sony"],
        "5803.T": ["フジクラ", "Fujikura"],
        "7974.T": ["任天堂", "Nintendo"],
        "9432.T": ["日本電信電話", "NTT"],
        "8306.T": ["三菱UFJ", "MUFG"],
        "6501.T": ["日立製作所", "Hitachi"],
        "7267.T": ["本田技研", "Honda"],
        "6902.T": ["デンソー", "DENSO"],
    }
    return fallback_names.get(symbol, ["不明"])

def scrape_yahoo_finance_jp(symbol):
    """Yahoo Finance Japan から企業情報をスクレイピング（改善版）"""
    code = clean_symbol(symbol)
    url = f"https://finance.yahoo.co.jp/quote/{code}"
    
    try:
        print(f"🌐 Scraping Yahoo Finance JP for {symbol}: {url}", file=sys.stderr)
        
        # リクエスト送信
        response = requests.get(url, headers=get_headers(), timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 企業名を取得（改善版）
        company_name = "不明"
        try:
            # タイトルから企業名を抽出
            title_element = soup.find('title')
            if title_element:
                title = title_element.get_text().strip()
                # "トヨタ自動車(株)【7203】：株価・株式情報 - Yahoo!ファイナンス" から "トヨタ自動車" を抽出
                name_match = re.search(r'^([^(【]+)', title)
                if name_match:
                    company_name = name_match.group(1).strip()
                    # "(株)"、"（株）" などの不要な部分をクリーンアップ
                    company_name = re.sub(r'[(（]?株[)）]?', '', company_name).strip()
            
            # h1タグからも試行
            if company_name == "不明" or not company_name:
                h1_element = soup.find('h1')
                if h1_element:
                    h1_text = h1_element.get_text().strip()
                    # "トヨタ自動車(株)の株価・株式情報" から "トヨタ自動車" を抽出
                    name_match = re.search(r'^([^(の]+)', h1_text)
                    if name_match:
                        company_name = name_match.group(1).strip()
                        company_name = re.sub(r'[(（]?株[)）]?', '', company_name).strip()
        except Exception as e:
            print(f"⚠️ Error extracting company name: {e}", file=sys.stderr)
        
        # 時価総額を取得（改善版）
        market_cap = 0
        try:
            # より柔軟な時価総額検索
            market_cap_patterns = [r'時価総額', r'Market Cap', r'マーケットキャップ']
            for pattern in market_cap_patterns:
                market_cap_element = soup.find(string=re.compile(pattern))
                if market_cap_element:
                    # 親要素から値を探す
                    parent = market_cap_element.parent
                    for _ in range(3):  # 最大3階層まで探す
                        if parent:
                            next_elements = parent.find_all(['td', 'span', 'div'])
                            for elem in next_elements:
                                cap_text = elem.get_text().strip()
                                if re.search(r'[0-9]', cap_text):
                                    # "1兆2000億円" または "1,200,000百万円" のような表記を処理
                                    if '兆' in cap_text:
                                        trillion_match = re.search(r'([0-9,]+(?:\.[0-9]+)?)兆', cap_text)
                                        if trillion_match:
                                            market_cap = float(trillion_match.group(1).replace(',', '')) * 1000000  # 兆円をMillion単位に
                                            break
                                    elif '億' in cap_text:
                                        billion_match = re.search(r'([0-9,]+(?:\.[0-9]+)?)億', cap_text)
                                        if billion_match:
                                            market_cap = float(billion_match.group(1).replace(',', '')) * 100  # 億円をMillion単位に
                                            break
                                    else:
                                        # 通常の数値
                                        num_match = re.search(r'([0-9,]+)', cap_text)
                                        if num_match:
                                            market_cap = float(num_match.group(1).replace(',', '')) / 1000  # 万円をMillion単位に
                                            break
                            parent = parent.parent
                        else:
                            break
                    if market_cap > 0:
                        break
        except Exception as e:
            print(f"⚠️ Error extracting market cap: {e}", file=sys.stderr)
        
        # セクター・業種情報を取得（改善版）
        sector = "不明"
        industry = "不明"
        try:
            # 業種情報のセレクタを複数試す
            industry_patterns = [r'業種', r'セクター', r'分野']
            for pattern in industry_patterns:
                industry_element = soup.find(string=re.compile(pattern))
                if industry_element:
                    parent = industry_element.parent
                    if parent:
                        # 複数の要素タイプを試す
                        next_elements = parent.find_all_next(['td', 'span', 'div', 'a'])[:5]
                        for elem in next_elements:
                            text = elem.get_text().strip()
                            if text and text != pattern and len(text) < 50:  # 適度な長さの業種名
                                industry = text
                                sector = map_industry_to_sector(industry)
                                break
                    if industry != "不明":
                        break
        except Exception as e:
            print(f"⚠️ Error extracting sector info: {e}", file=sys.stderr)
        
        # PERやPBRなどの指標も取得可能
        financial_metrics = {}
        try:
            for metric in ['PER', 'PBR', 'ROE']:
                metric_element = soup.find(string=re.compile(metric))
                if metric_element:
                    parent = metric_element.parent
                    if parent:
                        next_element = parent.find_next(['td', 'span'])
                        if next_element:
                            value = next_element.get_text().strip()
                            if value and value != '-':
                                financial_metrics[metric] = value
        except:
            pass
        
        profile = {
            "symbol": symbol,
            "name": company_name,
            "country": "Japan",
            "currency": "JPY",
            "exchange": "TSE",
            "marketCapitalization": market_cap,
            "industry": industry,
            "sector": sector,
            "weburl": url,
            "logo": "",
            "financialMetrics": financial_metrics,  # 追加の財務指標
        }
        
        print(f"✅ Scraped data for {symbol}: {company_name} (業種: {industry})", file=sys.stderr)
        return profile
        
    except Exception as e:
        print(f"❌ Yahoo Finance JP scraping failed for {symbol}: {e}", file=sys.stderr)
        return None

def map_industry_to_sector(industry):
    """業種からセクターを推測（拡張版）"""
    sector_mapping = {
        # 自動車関連
        '自動車': '自動車',
        '自動車部品': '自動車',
        '輸送用機器': '自動車',
        
        # テクノロジー
        '電機': 'テクノロジー',
        '精密機器': 'テクノロジー',
        'ゲーム': 'テクノロジー',
        'ソフトウェア': 'テクノロジー',
        'IT': 'テクノロジー',
        '情報通信': 'テクノロジー',
        '半導体': 'テクノロジー',
        'エレクトロニクス': 'テクノロジー',
        
        # 通信
        '通信': '通信',
        '電気通信': '通信',
        'インターネット': '通信',
        
        # 金融
        '金融': '金融',
        '銀行': '金融',
        '証券': '金融',
        '保険': '金融',
        'リース': '金融',
        
        # 消費財・小売
        '小売': '小売',
        '食品': '消費財',
        '飲料': '消費財',
        'アパレル': '消費財',
        '化粧品': '消費財',
        '日用品': '消費財',
        
        # ヘルスケア
        '医薬品': 'ヘルスケア',
        '医療機器': 'ヘルスケア',
        'バイオ': 'ヘルスケア',
        '病院': 'ヘルスケア',
        
        # 素材・化学
        '化学': '素材',
        '鉄鋼': '素材',
        '非鉄金属': '素材',
        '繊維': '素材',
        '紙パルプ': '素材',
        'ガラス': '素材',
        'セメント': '素材',
        
        # エネルギー・ユーティリティ
        'エネルギー': 'エネルギー',
        '石油': 'エネルギー',
        'ガス': 'ユーティリティ',
        '電力': 'ユーティリティ',
        
        # 不動産・建設
        '不動産': '不動産',
        '建設': '建設',
        '住宅': '不動産',
        
        # 運輸
        '運輸': '運輸',
        '航空': '運輸',
        '海運': '運輸',
        '陸運': '運輸',
        '物流': '運輸',
        
        # その他
        '商社': '商社',
        '総合商社': '商社',
        '専門商社': '商社',
    }
    
    for key, value in sector_mapping.items():
        if key in industry:
            return value
    
    return "その他"

def scrape_minkabu_info(symbol):
    """Minkabu から企業情報をスクレイピング"""
    code = clean_symbol(symbol)
    url = f"https://minkabu.jp/stock/{code}"
    
    try:
        print(f"🌐 Scraping Minkabu for {symbol}: {url}", file=sys.stderr)
        
        response = requests.get(url, headers=get_headers(), timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 企業名
        company_name = "不明"
        try:
            # メインタイトルから企業名を取得
            title_element = soup.find('h1') or soup.find('title')
            if title_element:
                title = title_element.get_text().strip()
                # "トヨタ自動車 (7203) 株価" から "トヨタ自動車" を抽出
                name_match = re.search(r'^([^(\uff08]+)', title)
                if name_match:
                    raw_name = name_match.group(1).strip()
                    company_name = clean_company_name(raw_name, symbol)
        except:
            pass
        
        # 業種
        industry = "不明"
        sector = "不明"
        try:
            # 業種情報を探す
            industry_element = soup.find(string=re.compile(r'業種|セクター'))
            if industry_element:
                parent = industry_element.parent
                if parent:
                    next_element = parent.find_next() or parent.find_next_sibling()
                    if next_element:
                        industry = next_element.get_text().strip()
                        sector = map_industry_to_sector(industry)
        except:
            pass
        
        # 時価総額
        market_cap = 0
        try:
            market_cap_element = soup.find(string=re.compile(r'時価総額'))
            if market_cap_element:
                parent = market_cap_element.parent
                if parent:
                    next_element = parent.find_next('span') or parent.find_next('td')
                    if next_element:
                        cap_text = next_element.get_text().strip()
                        # "1兆2000億円" のような表記を数値に変換
                        cap_match = re.search(r'([0-9,]+)', cap_text.replace(',', ''))
                        if cap_match:
                            market_cap = int(cap_match.group(1))
        except:
            pass
        
        return {
            "symbol": symbol,
            "name": company_name,
            "country": "Japan",
            "currency": "JPY",
            "exchange": "TSE",
            "marketCapitalization": market_cap / 100,  # 億円をMillion単位に
            "industry": industry,
            "sector": sector,
            "weburl": url,
            "logo": "",
        }
        
    except Exception as e:
        print(f"❌ Minkabu scraping failed for {symbol}: {e}", file=sys.stderr)
        return None

def scrape_nikkei_info(symbol):
    """日経電子版から企業情報をスクレイピング"""
    code = clean_symbol(symbol)
    url = f"https://www.nikkei.com/nkd/company/?scode={code}"
    
    try:
        print(f"🌐 Scraping Nikkei for {symbol}: {url}", file=sys.stderr)
        
        response = requests.get(url, headers=get_headers(), timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 企業名
        company_name = "不明"
        try:
            name_element = soup.find('h1') or soup.find('h2', class_=re.compile(r'company|name'))
            if name_element:
                company_name = name_element.get_text().strip()
                # 不要な文字列を除去
                company_name = re.sub(r'\s*\([^)]+\)\s*', '', company_name).strip()
        except:
            pass
        
        # 業種
        industry = "不明"
        sector = "不明"
        try:
            industry_element = soup.find(string=re.compile(r'業種|事業内容'))
            if industry_element:
                parent = industry_element.parent
                if parent:
                    next_element = parent.find_next('dd') or parent.find_next('span')
                    if next_element:
                        industry = next_element.get_text().strip()
                        sector = map_industry_to_sector(industry)
        except:
            pass
        
        return {
            "name": company_name,
            "industry": industry,
            "sector": sector
        }
        
    except Exception as e:
        print(f"❌ Nikkei scraping failed for {symbol}: {e}", file=sys.stderr)
        return None

def fetch_company_profile_hybrid(symbol):
    """スクレイピング専用で企業プロフィールを取得（API使用しない）"""
    print(f"🔄 Fetching profile for {symbol} using scraping-only approach", file=sys.stderr)
    
    # 戦略1: Yahoo Finance Japan スクレイピング
    yahoo_data = scrape_yahoo_finance_jp(symbol)
    if yahoo_data and yahoo_data["name"] != "不明":
        print(f"✅ Yahoo Finance JP scraping success for {symbol}", file=sys.stderr)
        
        # 業種・セクター情報が不十分な場合、Kabutanで補完
        if yahoo_data["industry"] == "不明" or yahoo_data["sector"] == "不明":
            time.sleep(random.uniform(2, 4))
            kabutan_data = scrape_kabutan_info(symbol)
            if kabutan_data and kabutan_data.get("industry") != "不明":
                yahoo_data["industry"] = kabutan_data["industry"]
                yahoo_data["sector"] = kabutan_data["sector"]
                print(f"✅ Enhanced with Kabutan data for {symbol}", file=sys.stderr)
        
        return yahoo_data
    
    # 戦略2: Kabutan スクレイピング（Yahoo失敗時）
    time.sleep(random.uniform(2, 4))
    kabutan_data = scrape_kabutan_info(symbol)
    if kabutan_data and kabutan_data["name"] != "不明":
        print(f"✅ Kabutan scraping success for {symbol}", file=sys.stderr)
        return {
            "symbol": symbol,
            "name": kabutan_data["name"],
            "country": "Japan",
            "currency": "JPY",
            "exchange": "TSE",
            "marketCapitalization": get_fallback_market_cap(symbol),
            "industry": kabutan_data["industry"],
            "sector": kabutan_data["sector"],
            "weburl": f"https://kabutan.jp/stock/?code={clean_symbol(symbol)}",
            "logo": "",
        }
    
def scrape_kabutan_info(symbol):
    """Kabutan から詳細な企業情報をスクレイピング（改善版）"""
    code = clean_symbol(symbol)
    url = f"https://kabutan.jp/stock/?code={code}"
    
    try:
        print(f"🌐 Scraping Kabutan for {symbol}: {url}", file=sys.stderr)
        
        response = requests.get(url, headers=get_headers(), timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 企業名
        company_name = "不明"
        try:
            # 複数のパターンで企業名を探す
            name_selectors = [
                'h3.company_block',
                'h2[class*="company"]',
                'h1',
                '.stockName'
            ]
            
            for selector in name_selectors:
                name_element = soup.select_one(selector)
                if name_element:
                    raw_name = name_element.get_text().strip()
                    # データクリーニング適用
                    cleaned_name = clean_company_name(raw_name, symbol)
                    if cleaned_name and cleaned_name != "不明" and len(cleaned_name) > 1:
                        company_name = cleaned_name
                        break
                        
            # フォールバック: シンボルから企業名を推測
            if company_name == "不明":
                fallback_names = get_fallback_company_name(symbol)
                company_name = fallback_names[0] if fallback_names else "不明"
        except Exception as e:
            print(f"⚠️ Error extracting company name from Kabutan: {e}", file=sys.stderr)
        
        # 業種
        industry = "不明"
        try:
            industry_patterns = [r'業種', r'セクター', r'事業内容']
            for pattern in industry_patterns:
                industry_element = soup.find(string=re.compile(pattern))
                if industry_element:
                    parent = industry_element.parent
                    if parent:
                        # より柔軟な検索
                        next_elements = parent.find_all_next(['td', 'span', 'div', 'a'])[:3]
                        for elem in next_elements:
                            text = elem.get_text().strip()
                            if text and text != pattern and len(text) < 30:
                                industry = text
                                break
                    if industry != "不明":
                        break
        except Exception as e:
            print(f"⚠️ Error extracting industry from Kabutan: {e}", file=sys.stderr)
        
        return {
            "name": company_name,
            "industry": industry,
            "sector": map_industry_to_sector(industry)
        }
        
    except Exception as e:
        print(f"❌ Kabutan scraping failed for {symbol}: {e}", file=sys.stderr)
        return None
    # 戦略3: Minkabu スクレイピング（新しく追加）
    time.sleep(random.uniform(2, 4))
    minkabu_data = scrape_minkabu_info(symbol)
    if minkabu_data and minkabu_data["name"] != "不明":
        print(f"✅ Minkabu scraping success for {symbol}", file=sys.stderr)
        return minkabu_data
    
    # 戦略4: 日経電子版スクレイピング（補強）
    time.sleep(random.uniform(2, 4))
    nikkei_data = scrape_nikkei_info(symbol)
    if nikkei_data and nikkei_data["name"] != "不明":
        print(f"✅ Nikkei scraping success for {symbol}", file=sys.stderr)
        # 基本情報とマージ
        return {
            "symbol": symbol,
            "name": nikkei_data["name"],
            "country": "Japan",
            "currency": "JPY",
            "exchange": "TSE",
            "marketCapitalization": get_fallback_market_cap(symbol),
            "industry": nikkei_data["industry"],
            "sector": nikkei_data["sector"],
            "weburl": f"https://www.nikkei.com/nkd/company/?scode={code}",
            "logo": "",
        }
    
    # 戦略5: フォールバックデータ
    print(f"🔄 Using fallback data for {symbol}", file=sys.stderr)
    return get_fallback_profile(symbol)

def get_fallback_market_cap(symbol):
    """銘柄別の推定時価総額を返す"""
    market_caps = {
        "7203.T": 45000000,    # トヨタ
        "9984.T": 15000000,    # ソフトバンクG
        "6758.T": 18000000,    # ソニー
        "7974.T": 8000000,     # 任天堂
        "9432.T": 12000000,    # NTT
        "8306.T": 8000000,     # 三菱UFJ
        "6501.T": 6000000,     # 日立
        "7267.T": 5000000,     # ホンダ
        "6902.T": 4000000,     # デンソー
        "5803.T": 500000,      # フジクラ
    }
    return market_caps.get(symbol, 1000000)  # デフォルト100億円

def get_fallback_profile(symbol):
    """フォールバック企業データ（既存）"""
    fallback_data = {
        "7203.T": {
            "name": "トヨタ自動車",
            "sector": "自動車",
            "industry": "自動車製造",
            "marketCapitalization": 45000000,
        },
        "9984.T": {
            "name": "ソフトバンクグループ",
            "sector": "通信",
            "industry": "電気通信",
            "marketCapitalization": 15000000,
        },
        "6758.T": {
            "name": "ソニーグループ",
            "sector": "テクノロジー",
            "industry": "エレクトロニクス",
            "marketCapitalization": 18000000,
        },
        "7974.T": {
            "name": "任天堂",
            "sector": "テクノロジー",
            "industry": "ゲーム",
            "marketCapitalization": 8000000,
        },
        "9432.T": {
            "name": "日本電信電話",
            "sector": "通信",
            "industry": "電気通信",
            "marketCapitalization": 12000000,
        },
        "8306.T": {
            "name": "三菱UFJフィナンシャル・グループ",
            "sector": "金融",
            "industry": "銀行",
            "marketCapitalization": 8000000,
        },
        "6501.T": {
            "name": "日立製作所",
            "sector": "テクノロジー",
            "industry": "電機",
            "marketCapitalization": 6000000,
        },
        "7267.T": {
            "name": "本田技研工業",
            "sector": "自動車",
            "industry": "自動車製造",
            "marketCapitalization": 5000000,
        },
        "6902.T": {
            "name": "デンソー",
            "sector": "自動車",
            "industry": "自動車部品",
            "marketCapitalization": 4000000,
        },
        "5803.T": {
            "name": "フジクラ",
            "sector": "テクノロジー",
            "industry": "電子部品",
            "marketCapitalization": 500000,
        },
    }

    default_data = {
        "name": f"銘柄コード {symbol}",
        "sector": "不明",
        "industry": "不明",
        "marketCapitalization": 1000000,
    }

    data = fallback_data.get(symbol, default_data)

    return {
        "symbol": symbol,
        "name": data["name"],
        "country": "Japan",
        "currency": "JPY",
        "exchange": "TSE",
        "marketCapitalization": data["marketCapitalization"],
        "industry": data["industry"],
        "sector": data["sector"],
        "weburl": "",
        "logo": "",
    }

def fetch_news_sentiment_hybrid(symbol):
    """複合戦略でセンチメント情報を取得"""
    # シンプルなランダムセンチメント（改善可能）
    return {
        "symbol": symbol,
        "sentiment": random.uniform(-0.3, 0.3),
        "buzzVolume": random.randint(5, 30),
        "companyNewsScore": 0.5,
        "sectorAverageBullishPercent": 45.0 + random.uniform(-15, 15),
        "sectorAverageNewsScore": 0.45 + random.uniform(-0.15, 0.15),
    }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python scrape_japanese_stock.py <command> <symbol>"}, ensure_ascii=False))
        sys.exit(1)

    command = sys.argv[1]
    symbol = sys.argv[2]

    result = None

    try:
        if command == "profile":
            result = fetch_company_profile_hybrid(symbol)
        elif command == "sentiment":
            result = fetch_news_sentiment_hybrid(symbol)
        elif command == "news":
            # 簡易ニュース（後で改善可能）
            result = [{
                "category": "general",
                "datetime": int(time.time()),
                "headline": f"{symbol} 市場情報",
                "id": hash(f"{symbol}_news"),
                "image": "",
                "related": symbol,
                "source": "Market Data",
                "summary": "複合データソースから企業情報を取得しています。",
                "url": "",
            }]
        else:
            result = {"error": f"Unknown command: {command}"}
    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        result = {"error": f"Unexpected error: {str(e)}"}

    # UTF-8エンコーディングを明示的に設定して出力
    import io
    import sys
    
    # stdoutをUTF-8に設定
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    
    # JSON形式で出力（UTF-8を確実に使用）
    output = json.dumps(result, ensure_ascii=False, indent=2)
    print(output)

if __name__ == "__main__":
    main()