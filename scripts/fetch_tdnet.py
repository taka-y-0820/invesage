#!/usr/bin/env python3
"""
TDnet（適時開示情報伝達システム）から速報IR情報を取得するスクリプト

TDnetのI-NET検索ページをスクレイピングし、銘柄コード指定で
直近のIR開示情報を取得する。

使い方:
  python fetch_tdnet.py <symbol>      # 例: python fetch_tdnet.py 7203
  python fetch_tdnet.py latest        # 最新の適時開示一覧を取得
"""

import requests
import json
import sys
import re
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

# TDnet 適時開示情報閲覧サービス
TDNET_SEARCH_URL = "https://www.release.tdnet.info/inbs/I_list_001_{date}.html"
TDNET_BASE_URL = "https://www.release.tdnet.info/inbs/"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

# TDnetの開示カテゴリからIRカテゴリへのマッピング
CATEGORY_MAP = {
    "決算短信": "earnings",
    "四半期決算短信": "earnings",
    "業績予想": "guidance",
    "業績予想の修正": "guidance",
    "配当予想の修正": "dividend",
    "剰余金の配当": "dividend",
    "配当": "dividend",
    "自己株式": "shareholder",
    "自社株買い": "shareholder",
    "株主総会": "shareholder",
    "役員": "corporate",
    "取締役": "corporate",
    "代表取締役": "corporate",
    "ガバナンス": "corporate",
    "コーポレート": "corporate",
    "適時開示": "disclosure",
    "有価証券報告書": "disclosure",
    "訂正": "disclosure",
    "説明会": "presentation",
    "IR": "presentation",
    "プレゼンテーション": "presentation",
}


def get_headers():
    """HTTPリクエスト用ヘッダー"""
    import random
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    }


# 接続を再利用するセッション
_session = None

def get_session():
    """HTTPセッションを再利用して接続オーバーヘッドを削減"""
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers.update(get_headers())
    return _session


def clean_symbol(symbol):
    """シンボルを4桁コードに正規化"""
    return symbol.replace(".T", "").replace(".TYO", "").strip()


def classify_title(title):
    """タイトルからIRカテゴリを分類"""
    title_lower = title.lower()

    for keyword, category in CATEGORY_MAP.items():
        if keyword in title:
            return category

    # 追加のキーワードチェック
    if any(w in title for w in ["決算", "業績", "売上", "利益", "損益"]):
        return "earnings"
    if any(w in title for w in ["予想", "見通し", "修正"]):
        return "guidance"
    if any(w in title for w in ["配当", "分配"]):
        return "dividend"
    if any(w in title for w in ["株主", "総会", "自己株式"]):
        return "shareholder"
    if any(w in title for w in ["ガバナンス", "役員", "取締役"]):
        return "corporate"
    if any(w in title for w in ["説明会", "プレゼン", "IR"]):
        return "presentation"
    if any(w in title for w in ["開示", "報告書", "届出"]):
        return "disclosure"

    return "other"


def fetch_tdnet_page(date_str, page=1):
    """TDnetの指定日の開示一覧ページを取得

    Args:
        date_str: 日付文字列 (YYYYMMDD)
        page: ページ番号 (1始まり、1ページ100件)
    """
    page_str = f"{page:03d}"
    url = f"https://www.release.tdnet.info/inbs/I_list_{page_str}_{date_str}.html"
    print(f"Fetching TDnet page: {url}", file=sys.stderr)

    try:
        session = get_session()
        response = session.get(url, timeout=10)
        response.encoding = "utf-8"

        if response.status_code == 404:
            print(f"TDnet page not found for date: {date_str}", file=sys.stderr)
            return None

        response.raise_for_status()

        # 開示がない日は短いHTML（「開示された情報はありません」）
        if "開示された情報はありません" in response.text:
            print(f"No disclosures on {date_str}", file=sys.stderr)
            return None

        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TDnet page: {e}", file=sys.stderr)
        return None


def parse_tdnet_page(html, target_code=None):
    """TDnetの開示一覧HTMLをパースしてIRリリース情報を抽出

    TDnetのHTMLテーブル構造:
      <tr>
        <td class="*kjTime">HH:MM</td>
        <td class="*kjCode">XXXXX</td>  (5桁、先頭4桁が銘柄コード)
        <td class="*kjName">会社名</td>
        <td class="*kjTitle"><a href="PDF">表題</a></td>
        <td class="*kjXbrl">...</td>
        <td class="*kjPlace">...</td>
        <td class="*kjHistroy">...</td>
      </tr>
    """
    soup = BeautifulSoup(html, "html.parser")
    releases = []

    # main-list-table内のtr行を取得
    rows = soup.select("#main-list-table tr")

    for row in rows:
        try:
            # CSSクラスで各セルを取得
            time_cell = row.select_one("td[class*='kjTime']")
            code_cell = row.select_one("td[class*='kjCode']")
            name_cell = row.select_one("td[class*='kjName']")
            title_cell = row.select_one("td[class*='kjTitle']")

            if not code_cell or not title_cell:
                continue

            # 銘柄コード: 5桁表示、先頭4桁が実際のコード
            raw_code = code_cell.get_text(strip=True)
            code_value = raw_code[:4]

            # ターゲットコードが指定されている場合、フィルタリング
            if target_code and code_value != target_code:
                continue

            # タイトルとリンク
            link = title_cell.find("a")
            if not link:
                continue

            title = link.get_text(strip=True)
            if not title:
                continue

            href = link.get("href", "")
            if href:
                if href.startswith("http"):
                    url = href
                else:
                    url = TDNET_BASE_URL + href
            else:
                url = ""

            # 時刻
            published_at = ""
            if time_cell:
                published_at = time_cell.get_text(strip=True)

            # 会社名
            company_name = ""
            if name_cell:
                company_name = name_cell.get_text(strip=True)

            category = classify_title(title)

            release = {
                "id": f"tdnet_{code_value}_{len(releases)}_{abs(hash(title)) % 100000}",
                "title": title,
                "category": category,
                "publishedAt": published_at,
                "url": url,
                "source": "TDnet",
                "companyCode": code_value,
                "companyName": company_name,
            }
            releases.append(release)

        except Exception as e:
            print(f"Error parsing row: {e}", file=sys.stderr)
            continue

    return releases


def fetch_ir_for_symbol(symbol):
    """指定銘柄のIR情報をTDnetから取得（直近30日分、最適化版）"""
    code = clean_symbol(symbol)
    print(f"Fetching TDnet IR info for code: {code}", file=sys.stderr)

    all_releases = []
    today = datetime.now()
    consecutive_empty_days = 0

    # 直近14日分を検索（連続3日空なら早期終了）
    for days_ago in range(14):
        target_date = today - timedelta(days=days_ago)
        date_str = target_date.strftime("%Y%m%d")

        # 土日はスキップ（TDnetは平日のみ開示）
        if target_date.weekday() >= 5:
            continue

        # 各日のページ1を取得（開示がない日はNone返却で高速スキップ）
        html = fetch_tdnet_page(date_str, page=1)
        if html is None:
            consecutive_empty_days += 1
            if consecutive_empty_days >= 3:
                print(f"3 consecutive empty days, stopping search", file=sys.stderr)
                break
            continue

        consecutive_empty_days = 0
        releases = parse_tdnet_page(html, target_code=code)

        # 該当銘柄があった場合、追加ページもチェック（最大3ページに削減）
        if releases:
            for page in range(2, 4):
                html_next = fetch_tdnet_page(date_str, page=page)
                if html_next is None:
                    break
                more = parse_tdnet_page(html_next, target_code=code)
                if not more:
                    break
                releases.extend(more)

        # publishedAtに日付を追加
        for r in releases:
            time_part = r["publishedAt"]
            r["publishedAt"] = f"{target_date.strftime('%Y-%m-%d')}T{time_part}:00" if time_part else target_date.strftime('%Y-%m-%dT00:00:00')

        all_releases.extend(releases)

        # 十分な件数が集まったら早期終了
        if len(all_releases) >= 15:
            break

    # 日時で降順ソート
    all_releases.sort(key=lambda x: x["publishedAt"], reverse=True)

    # 会社名を最初のリリースから取得
    company_name = ""
    for r in all_releases:
        if r.get("companyName"):
            company_name = r["companyName"]
            break

    # CompanyIRInfo形式で返す
    ir_releases = []
    for r in all_releases:
        ir_releases.append({
            "id": r["id"],
            "title": r["title"],
            "category": r["category"],
            "publishedAt": r["publishedAt"],
            "summary": None,
            "url": r["url"],
            "source": r["source"],
        })

    result = {
        "symbol": symbol if "." in symbol else f"{code}.T",
        "companyName": company_name or f"銘柄 {code}",
        "lastUpdated": datetime.now().isoformat(),
        "irReleases": ir_releases,
        "earnings": [],
        "dividend": None,
        "nextEarningsDate": None,
        "irPageUrl": f"https://www.release.tdnet.info/inbs/I_list_001_{today.strftime('%Y%m%d')}.html",
        "fiscalYearEnd": None,
    }

    return result


def fetch_latest_disclosures():
    """最新の適時開示一覧を取得（直近の開示がある日を探す）"""
    today = datetime.now()

    # 直近5日分を遡って開示がある日を探す（休日・祝日対応）
    for days_ago in range(5):
        target_date = today - timedelta(days=days_ago)
        date_str = target_date.strftime("%Y%m%d")

        html = fetch_tdnet_page(date_str, page=1)
        if html is not None:
            releases = parse_tdnet_page(html)

            # publishedAtに日付を追加
            date_formatted = target_date.strftime("%Y-%m-%d")
            for r in releases:
                time_part = r["publishedAt"]
                r["publishedAt"] = f"{date_formatted}T{time_part}:00" if time_part else f"{date_formatted}T00:00:00"

            return {
                "date": date_str,
                "count": len(releases),
                "releases": releases,
            }

    return {"error": "直近の適時開示情報が見つかりませんでした", "releases": []}


def main():
    if len(sys.argv) < 2:
        print(json.dumps(
            {"error": "Usage: python fetch_tdnet.py <symbol|latest>"},
            ensure_ascii=False
        ))
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == "latest":
            result = fetch_latest_disclosures()
        else:
            # 銘柄コード指定
            result = fetch_ir_for_symbol(command)
    except Exception as e:
        result = {"error": f"Unexpected error: {str(e)}"}

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
