/**
 * 東証33業種セクター分類と代表銘柄データ
 * 全上場企業から検索・セクター別表示を行うためのマスタデータ
 */

/** セクター情報 */
export interface TSESector {
  id: string;
  name: string;        // 日本語名
  nameEn: string;      // 英語名
  color: string;       // ヒートマップ用カラー
}

/** 銘柄情報 */
export interface TSEStock {
  symbol: string;      // 銘柄コード (例: "7203.T")
  code: string;        // 4桁コード (例: "7203")
  name: string;        // 日本語名
  nameEn: string;      // 英語名
  sectorId: string;    // セクターID
}

/** 東証33業種セクター一覧 */
export const TSE_SECTORS: TSESector[] = [
  { id: "fishery", name: "水産・農林業", nameEn: "Fishery/Agriculture/Forestry", color: "#2dd4bf" },
  { id: "mining", name: "鉱業", nameEn: "Mining", color: "#a78bfa" },
  { id: "construction", name: "建設業", nameEn: "Construction", color: "#f97316" },
  { id: "food", name: "食料品", nameEn: "Foods", color: "#84cc16" },
  { id: "textile", name: "繊維製品", nameEn: "Textiles & Apparel", color: "#ec4899" },
  { id: "pulp_paper", name: "パルプ・紙", nameEn: "Pulp & Paper", color: "#a3e635" },
  { id: "chemicals", name: "化学", nameEn: "Chemicals", color: "#06b6d4" },
  { id: "pharma", name: "医薬品", nameEn: "Pharmaceutical", color: "#f43f5e" },
  { id: "oil_coal", name: "石油・石炭製品", nameEn: "Oil & Coal Products", color: "#78716c" },
  { id: "rubber", name: "ゴム製品", nameEn: "Rubber Products", color: "#d946ef" },
  { id: "glass_ceramics", name: "ガラス・土石製品", nameEn: "Glass & Ceramics", color: "#14b8a6" },
  { id: "steel", name: "鉄鋼", nameEn: "Iron & Steel", color: "#64748b" },
  { id: "nonferrous", name: "非鉄金属", nameEn: "Nonferrous Metals", color: "#fb923c" },
  { id: "metal_products", name: "金属製品", nameEn: "Metal Products", color: "#94a3b8" },
  { id: "machinery", name: "機械", nameEn: "Machinery", color: "#3b82f6" },
  { id: "electric", name: "電気機器", nameEn: "Electric Appliances", color: "#8b5cf6" },
  { id: "transport_equip", name: "輸送用機器", nameEn: "Transportation Equipment", color: "#ef4444" },
  { id: "precision", name: "精密機器", nameEn: "Precision Instruments", color: "#10b981" },
  { id: "other_products", name: "その他製品", nameEn: "Other Products", color: "#f59e0b" },
  { id: "utility_electric", name: "電気・ガス業", nameEn: "Electric Power & Gas", color: "#fbbf24" },
  { id: "land_transport", name: "陸運業", nameEn: "Land Transportation", color: "#22d3ee" },
  { id: "sea_transport", name: "海運業", nameEn: "Marine Transportation", color: "#0ea5e9" },
  { id: "air_transport", name: "空運業", nameEn: "Air Transportation", color: "#6366f1" },
  { id: "warehouse", name: "倉庫・運輸関連業", nameEn: "Warehousing & Transport", color: "#a855f7" },
  { id: "telecom", name: "情報・通信業", nameEn: "Information & Communication", color: "#2563eb" },
  { id: "wholesale", name: "卸売業", nameEn: "Wholesale Trade", color: "#16a34a" },
  { id: "retail", name: "小売業", nameEn: "Retail Trade", color: "#e11d48" },
  { id: "bank", name: "銀行業", nameEn: "Banks", color: "#1d4ed8" },
  { id: "securities", name: "証券、商品先物取引業", nameEn: "Securities & Commodity Futures", color: "#7c3aed" },
  { id: "insurance", name: "保険業", nameEn: "Insurance", color: "#0891b2" },
  { id: "other_finance", name: "その他金融業", nameEn: "Other Financing Business", color: "#059669" },
  { id: "real_estate", name: "不動産業", nameEn: "Real Estate", color: "#ca8a04" },
  { id: "services", name: "サービス業", nameEn: "Services", color: "#dc2626" },
];

/** セクターIDから情報を取得するマップ */
export const SECTOR_MAP = new Map(TSE_SECTORS.map(s => [s.id, s]));

/**
 * 東証上場銘柄一覧（主要銘柄 - セクター別）
 * 全33業種から代表銘柄を網羅
 */
export const TSE_STOCKS: TSEStock[] = [
  // 水産・農林業
  { symbol: "1332.T", code: "1332", name: "日本水産", nameEn: "Nippon Suisan Kaisha", sectorId: "fishery" },
  { symbol: "1333.T", code: "1333", name: "マルハニチロ", nameEn: "Maruha Nichiro", sectorId: "fishery" },

  // 鉱業
  { symbol: "1605.T", code: "1605", name: "INPEX", nameEn: "INPEX", sectorId: "mining" },
  { symbol: "1662.T", code: "1662", name: "石油資源開発", nameEn: "Japan Petroleum Exploration", sectorId: "mining" },

  // 建設業
  { symbol: "1801.T", code: "1801", name: "大成建設", nameEn: "Taisei Corporation", sectorId: "construction" },
  { symbol: "1802.T", code: "1802", name: "大林組", nameEn: "Obayashi Corporation", sectorId: "construction" },
  { symbol: "1803.T", code: "1803", name: "清水建設", nameEn: "Shimizu Corporation", sectorId: "construction" },
  { symbol: "1812.T", code: "1812", name: "鹿島建設", nameEn: "Kajima Corporation", sectorId: "construction" },
  { symbol: "1925.T", code: "1925", name: "大和ハウス工業", nameEn: "Daiwa House Industry", sectorId: "construction" },
  { symbol: "1928.T", code: "1928", name: "積水ハウス", nameEn: "Sekisui House", sectorId: "construction" },

  // 食料品
  { symbol: "2002.T", code: "2002", name: "日清製粉グループ本社", nameEn: "Nisshin Seifun Group", sectorId: "food" },
  { symbol: "2269.T", code: "2269", name: "明治ホールディングス", nameEn: "Meiji Holdings", sectorId: "food" },
  { symbol: "2502.T", code: "2502", name: "アサヒグループホールディングス", nameEn: "Asahi Group Holdings", sectorId: "food" },
  { symbol: "2503.T", code: "2503", name: "キリンホールディングス", nameEn: "Kirin Holdings", sectorId: "food" },
  { symbol: "2801.T", code: "2801", name: "キッコーマン", nameEn: "Kikkoman", sectorId: "food" },
  { symbol: "2802.T", code: "2802", name: "味の素", nameEn: "Ajinomoto", sectorId: "food" },
  { symbol: "2914.T", code: "2914", name: "日本たばこ産業", nameEn: "Japan Tobacco", sectorId: "food" },

  // 繊維製品
  { symbol: "3401.T", code: "3401", name: "帝人", nameEn: "Teijin", sectorId: "textile" },
  { symbol: "3402.T", code: "3402", name: "東レ", nameEn: "Toray Industries", sectorId: "textile" },

  // パルプ・紙
  { symbol: "3861.T", code: "3861", name: "王子ホールディングス", nameEn: "Oji Holdings", sectorId: "pulp_paper" },
  { symbol: "3863.T", code: "3863", name: "日本製紙", nameEn: "Nippon Paper Industries", sectorId: "pulp_paper" },

  // 化学
  { symbol: "4063.T", code: "4063", name: "信越化学工業", nameEn: "Shin-Etsu Chemical", sectorId: "chemicals" },
  { symbol: "4183.T", code: "4183", name: "三井化学", nameEn: "Mitsui Chemicals", sectorId: "chemicals" },
  { symbol: "4188.T", code: "4188", name: "三菱ケミカルグループ", nameEn: "Mitsubishi Chemical Group", sectorId: "chemicals" },
  { symbol: "4452.T", code: "4452", name: "花王", nameEn: "Kao Corporation", sectorId: "chemicals" },
  { symbol: "4901.T", code: "4901", name: "富士フイルムホールディングス", nameEn: "Fujifilm Holdings", sectorId: "chemicals" },
  { symbol: "4911.T", code: "4911", name: "資生堂", nameEn: "Shiseido", sectorId: "chemicals" },

  // 医薬品
  { symbol: "4502.T", code: "4502", name: "武田薬品工業", nameEn: "Takeda Pharmaceutical", sectorId: "pharma" },
  { symbol: "4503.T", code: "4503", name: "アステラス製薬", nameEn: "Astellas Pharma", sectorId: "pharma" },
  { symbol: "4519.T", code: "4519", name: "中外製薬", nameEn: "Chugai Pharmaceutical", sectorId: "pharma" },
  { symbol: "4523.T", code: "4523", name: "エーザイ", nameEn: "Eisai", sectorId: "pharma" },
  { symbol: "4568.T", code: "4568", name: "第一三共", nameEn: "Daiichi Sankyo", sectorId: "pharma" },

  // 石油・石炭製品
  { symbol: "5019.T", code: "5019", name: "出光興産", nameEn: "Idemitsu Kosan", sectorId: "oil_coal" },
  { symbol: "5020.T", code: "5020", name: "ENEOSホールディングス", nameEn: "ENEOS Holdings", sectorId: "oil_coal" },

  // ゴム製品
  { symbol: "5101.T", code: "5101", name: "横浜ゴム", nameEn: "Yokohama Rubber", sectorId: "rubber" },
  { symbol: "5108.T", code: "5108", name: "ブリヂストン", nameEn: "Bridgestone", sectorId: "rubber" },

  // ガラス・土石製品
  { symbol: "5201.T", code: "5201", name: "AGC", nameEn: "AGC Inc.", sectorId: "glass_ceramics" },
  { symbol: "5332.T", code: "5332", name: "TOTO", nameEn: "TOTO", sectorId: "glass_ceramics" },

  // 鉄鋼
  { symbol: "5401.T", code: "5401", name: "日本製鉄", nameEn: "Nippon Steel", sectorId: "steel" },
  { symbol: "5411.T", code: "5411", name: "JFEホールディングス", nameEn: "JFE Holdings", sectorId: "steel" },

  // 非鉄金属
  { symbol: "5706.T", code: "5706", name: "三井金属鉱業", nameEn: "Mitsui Mining & Smelting", sectorId: "nonferrous" },
  { symbol: "5711.T", code: "5711", name: "三菱マテリアル", nameEn: "Mitsubishi Materials", sectorId: "nonferrous" },
  { symbol: "5713.T", code: "5713", name: "住友金属鉱山", nameEn: "Sumitomo Metal Mining", sectorId: "nonferrous" },

  // 金属製品
  { symbol: "5802.T", code: "5802", name: "住友電気工業", nameEn: "Sumitomo Electric Industries", sectorId: "metal_products" },
  { symbol: "5803.T", code: "5803", name: "フジクラ", nameEn: "Fujikura", sectorId: "metal_products" },

  // 機械
  { symbol: "6273.T", code: "6273", name: "SMC", nameEn: "SMC Corporation", sectorId: "machinery" },
  { symbol: "6301.T", code: "6301", name: "小松製作所", nameEn: "Komatsu", sectorId: "machinery" },
  { symbol: "6326.T", code: "6326", name: "クボタ", nameEn: "Kubota", sectorId: "machinery" },
  { symbol: "6367.T", code: "6367", name: "ダイキン工業", nameEn: "Daikin Industries", sectorId: "machinery" },

  // 電気機器
  { symbol: "6501.T", code: "6501", name: "日立製作所", nameEn: "Hitachi", sectorId: "electric" },
  { symbol: "6503.T", code: "6503", name: "三菱電機", nameEn: "Mitsubishi Electric", sectorId: "electric" },
  { symbol: "6594.T", code: "6594", name: "日本電産", nameEn: "Nidec", sectorId: "electric" },
  { symbol: "6645.T", code: "6645", name: "オムロン", nameEn: "Omron", sectorId: "electric" },
  { symbol: "6702.T", code: "6702", name: "富士通", nameEn: "Fujitsu", sectorId: "electric" },
  { symbol: "6752.T", code: "6752", name: "パナソニックホールディングス", nameEn: "Panasonic Holdings", sectorId: "electric" },
  { symbol: "6758.T", code: "6758", name: "ソニーグループ", nameEn: "Sony Group", sectorId: "electric" },
  { symbol: "6861.T", code: "6861", name: "キーエンス", nameEn: "Keyence", sectorId: "electric" },
  { symbol: "6902.T", code: "6902", name: "デンソー", nameEn: "Denso", sectorId: "electric" },
  { symbol: "6954.T", code: "6954", name: "ファナック", nameEn: "FANUC", sectorId: "electric" },
  { symbol: "6971.T", code: "6971", name: "京セラ", nameEn: "Kyocera", sectorId: "electric" },
  { symbol: "6981.T", code: "6981", name: "村田製作所", nameEn: "Murata Manufacturing", sectorId: "electric" },
  { symbol: "8035.T", code: "8035", name: "東京エレクトロン", nameEn: "Tokyo Electron", sectorId: "electric" },
  { symbol: "6920.T", code: "6920", name: "レーザーテック", nameEn: "Lasertec", sectorId: "electric" },
  { symbol: "6857.T", code: "6857", name: "アドバンテスト", nameEn: "Advantest", sectorId: "electric" },

  // 輸送用機器
  { symbol: "7201.T", code: "7201", name: "日産自動車", nameEn: "Nissan Motor", sectorId: "transport_equip" },
  { symbol: "7203.T", code: "7203", name: "トヨタ自動車", nameEn: "Toyota Motor", sectorId: "transport_equip" },
  { symbol: "7267.T", code: "7267", name: "本田技研工業", nameEn: "Honda Motor", sectorId: "transport_equip" },
  { symbol: "7269.T", code: "7269", name: "スズキ", nameEn: "Suzuki Motor", sectorId: "transport_equip" },
  { symbol: "7270.T", code: "7270", name: "SUBARU", nameEn: "Subaru", sectorId: "transport_equip" },
  { symbol: "7272.T", code: "7272", name: "ヤマハ発動機", nameEn: "Yamaha Motor", sectorId: "transport_equip" },

  // 精密機器
  { symbol: "4543.T", code: "4543", name: "テルモ", nameEn: "Terumo", sectorId: "precision" },
  { symbol: "7731.T", code: "7731", name: "ニコン", nameEn: "Nikon", sectorId: "precision" },
  { symbol: "7733.T", code: "7733", name: "オリンパス", nameEn: "Olympus", sectorId: "precision" },
  { symbol: "7741.T", code: "7741", name: "HOYA", nameEn: "HOYA", sectorId: "precision" },

  // その他製品
  { symbol: "7832.T", code: "7832", name: "バンダイナムコホールディングス", nameEn: "Bandai Namco Holdings", sectorId: "other_products" },
  { symbol: "7974.T", code: "7974", name: "任天堂", nameEn: "Nintendo", sectorId: "other_products" },
  { symbol: "7751.T", code: "7751", name: "キヤノン", nameEn: "Canon", sectorId: "other_products" },

  // 電気・ガス業
  { symbol: "9501.T", code: "9501", name: "東京電力ホールディングス", nameEn: "Tokyo Electric Power", sectorId: "utility_electric" },
  { symbol: "9502.T", code: "9502", name: "中部電力", nameEn: "Chubu Electric Power", sectorId: "utility_electric" },
  { symbol: "9503.T", code: "9503", name: "関西電力", nameEn: "Kansai Electric Power", sectorId: "utility_electric" },

  // 陸運業
  { symbol: "9020.T", code: "9020", name: "東日本旅客鉄道", nameEn: "East Japan Railway", sectorId: "land_transport" },
  { symbol: "9021.T", code: "9021", name: "西日本旅客鉄道", nameEn: "West Japan Railway", sectorId: "land_transport" },
  { symbol: "9022.T", code: "9022", name: "東海旅客鉄道", nameEn: "Central Japan Railway", sectorId: "land_transport" },

  // 海運業
  { symbol: "9101.T", code: "9101", name: "日本郵船", nameEn: "Nippon Yusen", sectorId: "sea_transport" },
  { symbol: "9104.T", code: "9104", name: "商船三井", nameEn: "Mitsui O.S.K. Lines", sectorId: "sea_transport" },
  { symbol: "9107.T", code: "9107", name: "川崎汽船", nameEn: "Kawasaki Kisen Kaisha", sectorId: "sea_transport" },

  // 空運業
  { symbol: "9201.T", code: "9201", name: "日本航空", nameEn: "Japan Airlines", sectorId: "air_transport" },
  { symbol: "9202.T", code: "9202", name: "ANAホールディングス", nameEn: "ANA Holdings", sectorId: "air_transport" },

  // 倉庫・運輸関連業
  { symbol: "9064.T", code: "9064", name: "ヤマトホールディングス", nameEn: "Yamato Holdings", sectorId: "warehouse" },
  { symbol: "9147.T", code: "9147", name: "NIPPON EXPRESSホールディングス", nameEn: "NIPPON EXPRESS Holdings", sectorId: "warehouse" },

  // 情報・通信業
  { symbol: "9432.T", code: "9432", name: "日本電信電話", nameEn: "Nippon Telegraph & Telephone", sectorId: "telecom" },
  { symbol: "9433.T", code: "9433", name: "KDDI", nameEn: "KDDI", sectorId: "telecom" },
  { symbol: "9434.T", code: "9434", name: "ソフトバンク", nameEn: "SoftBank Corp.", sectorId: "telecom" },
  { symbol: "9984.T", code: "9984", name: "ソフトバンクグループ", nameEn: "SoftBank Group", sectorId: "telecom" },
  { symbol: "4689.T", code: "4689", name: "Zホールディングス", nameEn: "Z Holdings", sectorId: "telecom" },
  { symbol: "4755.T", code: "4755", name: "楽天グループ", nameEn: "Rakuten Group", sectorId: "telecom" },
  { symbol: "6098.T", code: "6098", name: "リクルートホールディングス", nameEn: "Recruit Holdings", sectorId: "telecom" },

  // 卸売業
  { symbol: "8001.T", code: "8001", name: "伊藤忠商事", nameEn: "ITOCHU", sectorId: "wholesale" },
  { symbol: "8002.T", code: "8002", name: "丸紅", nameEn: "Marubeni", sectorId: "wholesale" },
  { symbol: "8031.T", code: "8031", name: "三井物産", nameEn: "Mitsui & Co.", sectorId: "wholesale" },
  { symbol: "8053.T", code: "8053", name: "住友商事", nameEn: "Sumitomo Corporation", sectorId: "wholesale" },
  { symbol: "8058.T", code: "8058", name: "三菱商事", nameEn: "Mitsubishi Corporation", sectorId: "wholesale" },

  // 小売業
  { symbol: "3382.T", code: "3382", name: "セブン&アイ・ホールディングス", nameEn: "Seven & i Holdings", sectorId: "retail" },
  { symbol: "8267.T", code: "8267", name: "イオン", nameEn: "Aeon", sectorId: "retail" },
  { symbol: "9983.T", code: "9983", name: "ファーストリテイリング", nameEn: "Fast Retailing", sectorId: "retail" },

  // 銀行業
  { symbol: "8306.T", code: "8306", name: "三菱UFJフィナンシャル・グループ", nameEn: "Mitsubishi UFJ Financial Group", sectorId: "bank" },
  { symbol: "8316.T", code: "8316", name: "三井住友フィナンシャルグループ", nameEn: "Sumitomo Mitsui Financial Group", sectorId: "bank" },
  { symbol: "8411.T", code: "8411", name: "みずほフィナンシャルグループ", nameEn: "Mizuho Financial Group", sectorId: "bank" },

  // 証券、商品先物取引業
  { symbol: "8601.T", code: "8601", name: "大和証券グループ本社", nameEn: "Daiwa Securities Group", sectorId: "securities" },
  { symbol: "8604.T", code: "8604", name: "野村ホールディングス", nameEn: "Nomura Holdings", sectorId: "securities" },

  // 保険業
  { symbol: "8630.T", code: "8630", name: "SOMPOホールディングス", nameEn: "SOMPO Holdings", sectorId: "insurance" },
  { symbol: "8725.T", code: "8725", name: "MS&ADインシュアランスグループホールディングス", nameEn: "MS&AD Insurance Group", sectorId: "insurance" },
  { symbol: "8766.T", code: "8766", name: "東京海上ホールディングス", nameEn: "Tokio Marine Holdings", sectorId: "insurance" },

  // その他金融業
  { symbol: "8591.T", code: "8591", name: "オリックス", nameEn: "Orix", sectorId: "other_finance" },
  { symbol: "8697.T", code: "8697", name: "日本取引所グループ", nameEn: "Japan Exchange Group", sectorId: "other_finance" },

  // 不動産業
  { symbol: "3289.T", code: "3289", name: "東急不動産ホールディングス", nameEn: "Tokyu Fudosan Holdings", sectorId: "real_estate" },
  { symbol: "8801.T", code: "8801", name: "三井不動産", nameEn: "Mitsui Fudosan", sectorId: "real_estate" },
  { symbol: "8802.T", code: "8802", name: "三菱地所", nameEn: "Mitsubishi Estate", sectorId: "real_estate" },
  { symbol: "8830.T", code: "8830", name: "住友不動産", nameEn: "Sumitomo Realty & Development", sectorId: "real_estate" },

  // サービス業
  { symbol: "2413.T", code: "2413", name: "エムスリー", nameEn: "M3", sectorId: "services" },
  { symbol: "4661.T", code: "4661", name: "オリエンタルランド", nameEn: "Oriental Land", sectorId: "services" },
  { symbol: "6098.T", code: "6098", name: "リクルートホールディングス", nameEn: "Recruit Holdings", sectorId: "services" },
];

/**
 * セクター別に銘柄をグルーピング
 */
export function getStocksBySector(): Map<string, TSEStock[]> {
  const map = new Map<string, TSEStock[]>();
  for (const stock of TSE_STOCKS) {
    const existing = map.get(stock.sectorId) || [];
    // 重複排除
    if (!existing.find(s => s.symbol === stock.symbol)) {
      existing.push(stock);
    }
    map.set(stock.sectorId, existing);
  }
  return map;
}

/**
 * 全銘柄を検索（コード・名前・英語名で部分一致）
 */
export function searchStocks(query: string): TSEStock[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return TSE_STOCKS.filter(stock =>
    stock.code.includes(q) ||
    stock.symbol.toLowerCase().includes(q) ||
    stock.name.includes(query) ||
    stock.nameEn.toLowerCase().includes(q)
  );
}

/**
 * 全銘柄シンボルの一覧を取得
 */
export function getAllSymbols(): string[] {
  const seen = new Set<string>();
  return TSE_STOCKS.filter(s => {
    if (seen.has(s.symbol)) return false;
    seen.add(s.symbol);
    return true;
  }).map(s => s.symbol);
}
