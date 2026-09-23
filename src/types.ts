export type TransactionType = 'expense' | 'income';
export type ReceiptType = 'receipt' | 'invoice' | 'none';

export interface CategoryConfig {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  subLabel: string; // e.g. "店家", "加油站", "姓名", "細項", "撥補來源"
  defaultSubItems: string[];
  hasPeopleCount?: boolean; // true for 餐飲
  defaultReceiptType?: ReceiptType; // 預設憑證類型：'invoice' (發票) | 'receipt' (收據) | 'none' (無)
  taxCategory?: 'deductible' | 'non_deductible' | 'tax_exempt'; // 營業稅屬性：可扣抵5% | 依稅法不得扣抵 | 免稅/收據大水池
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  categoryId: string;
  categoryName: string; // 靜態寫入 Snapshot，即便日後分類更名或刪除，歷史資料依然完整
  subItem: string; // 靜態寫入 Snapshot (店家、加油站、預支姓名、雜支項目、撥補來源)
  claimant?: string; // 零用金請領人 (經辦同仁/請領人，方便查核是誰領的)
  peopleCount?: number; // 餐飲人數
  amount: number; // 金額 (NT$) - 實付含稅總額
  note: string;
  createdAt: number;
  receiptType?: ReceiptType; // 'receipt' (收據) | 'invoice' (發票) | 'none' (無憑證)
  invoiceNumber?: string; // 發票號碼 (選填，當 receiptType === 'invoice' 時)
  voucherNo?: string; // 系統加工後之高可讀性傳票編號 (方案 A，例如：P2026090714-0001，當月獨立流水號)
  rawVoucherId?: string; // 帳務小管家原生建檔模式編號 (例如：P20260907142530123，用於與小管家 100% 相容匯入匯出)
  subAccountSourceId?: string; // 若是由專款子帳戶匯入，記錄來源子帳戶 ID
  subAccountSourceName?: string; // 若是由專款子帳戶匯入，記錄子帳戶名稱
  companyId?: string; // 所屬公司/行號 ID (支援 3 間關係企業，或 'shared' 代表田頭共用大水池)
  // --- 稅務智慧計算與歸檔支援 (供未來稅務/會計模組直接抓取) ---
  netAmount?: number; // 未稅金額 / 銷售額 (NT$)
  taxAmount?: number; // 營業稅額 5% (NT$)
  taxDeductible?: boolean; // 是否得扣抵 401 營業稅 (true: 可扣抵進項稅額；false: 免稅或依法不得扣抵)
  sellerTaxId?: string; // 開立發票之店家/加油站統一編號 (8碼，供未來 401 媒體檔申報)
}

// 採買子帳號 (例如：小明每週午餐採買備用金5000元、工地臨時採買備用金等)
export interface SubAccountItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'expense' | 'income'; // 支出 (採買開銷) 或 收入 (追加備用金)
  categoryId?: string; // 支出分類 ID (如：dining, fuel, misc)
  categoryName?: string; // 支出分類名稱 (如：餐費、油資/交通)
  subItem: string; // 店家或項目名稱 (例如：池上便當)
  amount: number; // 金額 (NT$)
  receiptType: ReceiptType; // 單據憑證類型：收據 / 發票 / 無
  invoiceNumber?: string; // 發票號碼 (選填)
  claimant?: string; // 採買/經手人
  note?: string; // 備註說明
  createdAt: number;
  isImportedToGeneral?: boolean; // 是否已匯入總帳
}

export interface SubAccount {
  id: string;
  name: string; // 例如「每週午餐採買 (小明)」、「台北採購備用金」
  custodian: string; // 採買負責同仁 (經辦人)
  initialFund: number; // 撥發採買備用金金額 (NT$)
  startDate: string; // 撥款/開始日期
  status: 'active' | 'settled'; // 進行中 | 已結算
  note?: string; // 用途備註 (如：每週一預撥5000元，週五結算匯入總帳)
  createdAt: number;
  settledAt?: number; // 結算時間戳
  settlementNote?: string; // 結算備註
  items: SubAccountItem[]; // 每日採買明細
}

// 廠長專用零用金領取紀錄 (只記錄何時領了多少)
export interface DirectorWithdrawal {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // 金額 (NT$)
  note?: string; // 簡短備註 (選填)
  createdAt: number;
}

export interface MonthBudget {
  yearMonth: string; // YYYY-MM
  budgetAmount: number; // 當月預計支出上限 / 預備金總額 (NT$)
  alertThresholdPercent: number; // 警戒百分比 (預設 20%，即零用金低於20%時發出請款撥補警示)
}

export interface CompanyProfile {
  id: string; // e.g. 'comp_1', 'comp_2', 'comp_3'
  name: string; // 公司全名 (如「田頭工程有限公司」)
  shortName?: string; // 公司簡稱 (如「田頭工程」)
  taxId?: string; // 統一編號 (8 碼)
  representative?: string; // 負責人 / 代表人
  phone?: string; // 公司代表號電話
  fax?: string; // 傳真號碼
  email?: string; // 電子郵件信箱
  website?: string; // 官方網站
  postalCode?: string; // 郵遞區號
  address?: string; // 登記/營運地址
  // 財務與匯款銀行帳號 (未來供表格、請款單、撥補匯款帶入)
  bankName?: string; // 往來銀行 (如「臺灣銀行」)
  bankBranch?: string; // 分行 (如「營業部」)
  bankCode?: string; // 銀行代碼 (如「004」)
  bankAccount?: string; // 帳號
  accountName?: string; // 戶名
  // 表格與簽核常用人員
  chiefAccountant?: string; // 主辦會計 / 財務主管
  cashier?: string; // 出納 / 零用金經管人
  // 表單抬頭與發票設定
  reportHeader?: string; // 報表列印大抬頭 (留空則預設顯示公司全名)
  invoiceBuyerName?: string; // 常用發票買受人
  taxInvoiceNote?: string; // 表格下方附註文字
  color?: string; // 行號專屬識別色標 (如 #0066cc, #059669, #d97706)
  isDefault?: boolean; // 是否為主要預設行號
  isNominalPettyCashHolder?: boolean; // 是否為三社共用零用金之法定掛名主理行號 (實體零用金為三間公司共用，但依法定/內帳掛名於此公司)
  sortOrder?: number;
  updatedAt?: number;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  id: 'comp_1',
  name: '田頭工程有限公司',
  shortName: '田頭工程',
  taxId: '13044353',
  representative: '李永勝',
  phone: '02-2345-6789',
  fax: '',
  email: '',
  website: '',
  postalCode: '221',
  address: '新北市汐止區新台五路一段100號',
  bankName: '臺灣銀行 南港分行',
  bankBranch: '南港分行',
  bankCode: '004',
  bankAccount: '004-012-3456789',
  accountName: '田頭工程有限公司',
  chiefAccountant: '會計',
  cashier: '出納',
  reportHeader: '田頭工程有限公司 零用金收支月報表',
  invoiceBuyerName: '田頭工程有限公司',
  taxInvoiceNote: '報銷請開立三聯式發票，載明統編 13044353',
  color: '#0066cc',
  isDefault: true,
  isNominalPettyCashHolder: true,
  sortOrder: 1,
  updatedAt: Date.now()
};

export const DEFAULT_COMPANIES: CompanyProfile[] = [
  {
    id: 'comp_1',
    name: '田頭工程有限公司',
    shortName: '田頭工程',
    taxId: '13044353',
    representative: '李永勝',
    phone: '02-2345-6789',
    fax: '',
    email: '',
    website: '',
    postalCode: '221',
    address: '新北市汐止區新台五路一段100號',
    bankName: '臺灣銀行 南港分行',
    bankBranch: '南港分行',
    bankCode: '004',
    bankAccount: '004-012-3456789',
    accountName: '田頭工程有限公司',
    chiefAccountant: '會計',
    cashier: '出納',
    reportHeader: '田頭工程有限公司 零用金收支月報表',
    invoiceBuyerName: '田頭工程有限公司',
    taxInvoiceNote: '報銷請開立三聯式發票，載明統編 13044353',
    color: '#0066cc', // 經典海軍藍
    isDefault: true,
    isNominalPettyCashHolder: true,
    sortOrder: 1,
    updatedAt: Date.now()
  },
  {
    id: 'comp_2',
    name: '田頭工業有限公司',
    shortName: '田頭工業',
    taxId: '45107604',
    representative: '李湋薇',
    phone: '',
    fax: '',
    email: '',
    website: '',
    postalCode: '',
    address: '',
    bankName: '',
    bankBranch: '',
    bankCode: '',
    bankAccount: '',
    accountName: '田頭工業有限公司',
    chiefAccountant: '會計',
    cashier: '出納',
    reportHeader: '田頭工業有限公司 零用金收支月報表',
    invoiceBuyerName: '田頭工業有限公司',
    taxInvoiceNote: '發票請載明各項支出報銷憑證',
    color: '#059669', // 翡翠綠
    isDefault: false,
    isNominalPettyCashHolder: false,
    sortOrder: 2,
    updatedAt: Date.now()
  },
  {
    id: 'comp_3',
    name: '第三關係商行',
    shortName: '關係行號三',
    taxId: '',
    representative: '負責人',
    phone: '',
    fax: '',
    email: '',
    website: '',
    postalCode: '',
    address: '',
    bankName: '',
    bankBranch: '',
    bankCode: '',
    bankAccount: '',
    accountName: '第三關係商行',
    chiefAccountant: '會計',
    cashier: '出納',
    reportHeader: '第三關係商行 現金收支帳簿',
    invoiceBuyerName: '第三關係商行',
    taxInvoiceNote: '二聯式發票或收據請蓋公司/商行專用印章',
    color: '#d97706', // 琥珀橘
    isDefault: false,
    isNominalPettyCashHolder: false,
    sortOrder: 3,
    updatedAt: Date.now()
  }
];

// ==========================================
// 客戶聯絡資訊模組 (與記帳解耦，但預留廠商雙重身分)
// ==========================================

export interface CustomerContactPerson {
  id: string;
  name: string; // 聯絡人姓名 (如李如榮、李金銘)
  title?: string; // 職稱 (如業務主任、工地主任、專案工程師)
  mobile?: string; // 行動電話
  phone?: string; // 市話分機
  email?: string; // 電子郵件
  lineId?: string; // LINE ID
  note?: string; // 備註 (如主要聯絡窗口、李太太專線)
}

// 客戶屬性分類選項 (區分個人客戶、店家行號、企業法人)
export const CUSTOMER_CATEGORY_OPTIONS = [
  '個人客戶',
  '店家 / 門市行號',
  '公司企業法人',
  '政府機關 / 學校公營',
  '其他經銷通路'
] as const;

// 合作廠商業務所屬分類選項 (依所屬業務分類)
export const SUPPLIER_CATEGORY_OPTIONS = [
  '瀝青砂石 / 建材原料',
  '工程發包 / 現場工班',
  '機具車輛 / 租賃保養',
  '五金材料 / 水電設備',
  '運輸物流 / 吊卡車隊',
  '環保安全 / 現場工安',
  '資訊事務 / 辦公設備',
  '專業委外 / 顧問檢驗',
  '餐飲便當 / 雜項補給',
  '其他協力業務'
] as const;

export interface Customer {
  id: string;
  name: string; // 客戶/公司名稱 或 個人姓名 (必填)
  shortName?: string; // 簡稱/代號
  isIndividual: boolean; // 是否為個人客戶 (true: 個人, false: 公司法人行號)
  customerCategory?: string; // 客戶類別屬性 (例如：個人客戶、店家/門市行號、公司企業法人)
  supplierCategory?: string; // 廠商所屬業務分類 (例如：瀝青建材原料、工程工班、機具租賃、五金水電等)
  taxId?: string; // 統一編號 (選填，8碼，需通過台灣加權邏輯檢查；個人可留空)
  representative?: string; // 負責人 / 代表人
  representativeMobile?: string; // 負責人行動電話
  secondaryRepresentative?: string; // 副負責人 / 現場主管 (如舊資料之林主任、謝帝旺)
  
  // 聯絡電話與通訊
  phone1?: string; // 電話 1 (代表號或市話)
  phone2?: string; // 電話 2 (專線或備用)
  fax?: string; // 傳真
  email?: string; // 電子信箱
  website?: string; // 官方網站
  lineId?: string; // LINE ID

  // 地址與郵遞
  postalCode?: string; // 郵遞區號 (如 231, 640)
  address?: string; // 通訊/營業/戶籍地址
  shippingAddress?: string; // 送貨/施工地址 (選填)

  // 多聯絡人彈性支援 (支援多位窗口)
  contacts: CustomerContactPerson[];

  // 收款條件與銀行帳戶資訊 (選單式選填)
  paymentTerm?: string; // 主要配合收款方式 (例如：匯款(月結30天)、現金/貨到付款、支票次月15號、完工驗收付款)
  bankName?: string; // 往來銀行代碼與名稱 (如：004 臺灣銀行、808 玉山銀行)
  bankBranch?: string; // 分行名稱 (如：南港分行)
  bankAccount?: string; // 匯款帳號
  accountName?: string; // 匯款戶名

  // 業務分類與廠商雙重身分預留
  businessItems?: string; // 營業項目 / 專案備註 (如：電機/AC瀝青鋪路/冷氣維護、建築五金)
  isCustomer: boolean; // 是否為客戶身分 (預設 true)
  isSupplier: boolean; // 是否為合作廠商身分 (預設 false，可一鍵轉為或兼具廠商身分)
  
  // 常用公司標記 (跨行號全集團共用名冊，但可分哪一間公司的常用客戶)
  favoriteCompanyIds: string[]; // 存放 comp_1, comp_2 等，便於切換各公司時一鍵篩選常用客戶
  
  // 關於該公司之重要事項與交際禮金紀錄 (婚喪喜慶/紅包白包/商務送禮/重大合約)
  events?: CustomerEventRecord[];

  note?: string; // 總體備註說明
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// 客戶/廠商重要事項與交際禮金紀錄 (婚喪喜慶/紅包白包/商務送禮/重大記事)
// ==========================================

export type CustomerEventCategory = 'wedding_funeral' | 'business_gift' | 'important_matter' | 'other';

export interface CustomerEventRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: CustomerEventCategory; // 大分類: 婚喪喜慶 | 商務交際 | 重要事項 | 其他備忘
  categoryLabel?: string;
  title: string; // 事由 / 事件名稱 (例如：陳董令嬡喜宴紅包、新廠落成高架花籃、林總公祭奠儀、年度維護合約簽署)
  eventType?: string; // 細分標籤 (如：結婚紅包、公祭白包、花籃盆栽、中秋禮盒、合約簽署、拜訪紀要)
  hasAmount: boolean; // 是否與金錢相關 (true: 有金額, false: 純事項)
  amount?: number; // 金額 (NT$)，若與金錢相關；純事項為 0 或 undefined
  direction?: 'outgoing' | 'incoming'; // 往來方向：'outgoing' (我方送出禮金/支出) | 'incoming' (對方送入禮金/回禮)
  targetPerson?: string; // 對象 / 收受人 (例如：陳董事長、林總監、李經理)
  ourRepresentative?: string; // 我方經手人 / 出席代表 (例如：廠長、李業務、總經理)
  isPettyCashLinked?: boolean; // 是否已由公司零用金出款核銷
  voucherNo?: string; // 零用金傳票號碼 (選填)
  linkedTransactionId?: string; // 關聯之零用金交易 ID (選填)
  companyId?: string; // 出款所屬公司 ID (選填)
  proofNote?: string; // 憑證與附件 (如：謝卡已收、喜帖存查、已附訃聞、合約正本存檔)
  note?: string; // 補充備註說明
  createdAt: number;
}

// 大分類設定與快捷標籤配置
export const EVENT_CATEGORY_CONFIG: Record<CustomerEventCategory, {
  label: string;
  shortLabel: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  defaultHasAmount: boolean;
  quickPresets: Array<{
    title: string;
    eventType: string;
    suggestedAmount?: number;
    proofPlaceholder?: string;
  }>;
}> = {
  wedding_funeral: {
    label: '婚喪喜慶 (紅包/白包/花籃)',
    shortLabel: '婚喪喜慶',
    color: '#e11d48',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    defaultHasAmount: true,
    quickPresets: [
      { title: '結婚賀禮 (紅包禮金)', eventType: '結婚紅包', suggestedAmount: 3600, proofPlaceholder: '已留喜帖存查' },
      { title: '公祭奠儀 (白包禮金)', eventType: '公祭白包', suggestedAmount: 2100, proofPlaceholder: '謝卡已收存' },
      { title: '新廠開幕/喬遷誌慶高架花籃', eventType: '花籃盆栽', suggestedAmount: 3000, proofPlaceholder: '花店簽單' },
      { title: '彌月賀喜/弄璋弄瓦紅包', eventType: '彌月紅包', suggestedAmount: 2000, proofPlaceholder: '彌月卡' },
      { title: '長輩壽誕祝賀禮金', eventType: '壽誕禮金', suggestedAmount: 3600, proofPlaceholder: '賀卡' },
      { title: '榮陞祝賀花牌/盆景', eventType: '祝賀盆景', suggestedAmount: 2600, proofPlaceholder: '發票收據' },
    ]
  },
  business_gift: {
    label: '商務交際 (禮盒/公關/餐敘)',
    shortLabel: '商務交際',
    color: '#d97706',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    defaultHasAmount: true,
    quickPresets: [
      { title: '中秋年節頂級禮盒', eventType: '中秋禮盒', suggestedAmount: 2400, proofPlaceholder: '採買發票' },
      { title: '春節伴手年禮致意', eventType: '春節年禮', suggestedAmount: 2600, proofPlaceholder: '採買發票' },
      { title: '端午佳節香粽禮盒', eventType: '端午禮盒', suggestedAmount: 2000, proofPlaceholder: '採買發票' },
      { title: '合作廠商尾牙摸彩贊助', eventType: '尾牙贊助', suggestedAmount: 6000, proofPlaceholder: '贊助收據/感謝狀' },
      { title: '專案拜訪商務公關餐敘', eventType: '公關餐敘', suggestedAmount: 3200, proofPlaceholder: '餐飲收據/發票' },
      { title: '同業公會/協進會活動贊助', eventType: '活動贊助', suggestedAmount: 5000, proofPlaceholder: '公會收據' },
    ]
  },
  important_matter: {
    label: '重大協議與公司記事 (簽約/異動)',
    shortLabel: '重大記事',
    color: '#2563eb',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    defaultHasAmount: false,
    quickPresets: [
      { title: '簽訂長期年度維護合約', eventType: '合約協議', suggestedAmount: 0, proofPlaceholder: '合約編號存檔' },
      { title: '重大工程發包議定備忘', eventType: '工程備忘', suggestedAmount: 0, proofPlaceholder: '會議紀錄副本' },
      { title: '主要負責人/財務窗口變更', eventType: '人事窗口', suggestedAmount: 0, proofPlaceholder: '正式函文/名片' },
      { title: '付款條件特別約定特批', eventType: '付款協議', suggestedAmount: 0, proofPlaceholder: '主管簽核單' },
      { title: '重大客訴與現場維修完工確認', eventType: '客訴維護', suggestedAmount: 0, proofPlaceholder: '工程驗收單' },
      { title: '信用票信或抵押約定備查', eventType: '信用備忘', suggestedAmount: 0, proofPlaceholder: '票據影本/徵信報告' },
    ]
  },
  other: {
    label: '其他事項與往來備忘',
    shortLabel: '其他備忘',
    color: '#475569',
    badgeBg: 'bg-stone-100 border-stone-200',
    badgeText: 'text-stone-700',
    defaultHasAmount: false,
    quickPresets: [
      { title: '例行事務聯繫紀要', eventType: '聯繫備忘' },
      { title: '臨時交代特殊事項', eventType: '特殊備忘' },
    ]
  }
};

// 台灣傳統常見禮金金額 (吉利雙數紅包與單數奠儀)
export const TAIWAN_COURTESY_AMOUNTS = {
  redLucky: [1200, 1600, 2000, 2200, 2600, 3200, 3600, 6000, 6600, 12000],
  whiteCondolence: [1100, 1500, 2100, 3100, 5100, 7100, 11000]
};

// 台灣常見銀行清單 (選單式選填)
export const TAIWAN_BANKS = [
  { code: '004', name: '臺灣銀行' },
  { code: '005', name: '臺灣土地銀行' },
  { code: '006', name: '合作金庫商業銀行' },
  { code: '007', name: '第一商業銀行' },
  { code: '008', name: '華南商業銀行' },
  { code: '009', name: '彰化商業銀行' },
  { code: '011', name: '上海商業儲蓄銀行' },
  { code: '012', name: '台北富邦商業銀行' },
  { code: '013', name: '國泰世華商業銀行' },
  { code: '016', name: '高雄銀行' },
  { code: '017', name: '兆豐國際商業銀行' },
  { code: '050', name: '臺灣中小企業銀行' },
  { code: '052', name: '渣打國際商業銀行' },
  { code: '053', name: '台中商業銀行' },
  { code: '054', name: '京城商業銀行' },
  { code: '103', name: '新光商業銀行' },
  { code: '108', name: '陽信商業銀行' },
  { code: '147', name: '三信商業銀行' },
  { code: '700', name: '中華郵政公司 (郵局)' },
  { code: '803', name: '聯邦商業銀行' },
  { code: '805', name: '遠東國際商業銀行' },
  { code: '806', name: '元大商業銀行' },
  { code: '807', name: '永豐商業銀行' },
  { code: '808', name: '玉山商業銀行' },
  { code: '812', name: '台新國際商業銀行' },
  { code: '822', name: '中國信託商業銀行' }
];

// 常見付款/收款途徑方式 (核心三大方式：電匯、現金、支票)
export const PAYMENT_METHOD_OPTIONS = [
  '銀行匯款',
  '現金支付',
  '開立支票',
  '其他 / 依合約'
] as const;

// 常用結算週期與放款票期快捷選項
export const SETTLEMENT_CYCLE_OPTIONS = [
  '次月 25 號電匯',
  '次月 15 號放款',
  '月結 30 天期票',
  '月結 60 天期票',
  '貨到現結 / 現場付現',
  '驗收合格付款',
  '依工程合約進度'
] as const;

// 常見收款與結算方式選項清單 (選單式選填相容)
export const PAYMENT_TERMS_OPTIONS = [
  '現金 / 貨到付款',
  '銀行匯款 (月結 30 天)',
  '銀行匯款 (月結 60 天)',
  '銀行匯款 (次月 25 號電匯)',
  '開立支票 (次月 15 號換票 / 票期 30 天)',
  '開立支票 (次月 15 號換票 / 票期 60 天)',
  '依工程完工進度驗收請款',
  '預付訂金 30% / 驗收尾款 70%',
  '其他協議方式'
];

/**
 * 台灣財政部統一編號邏輯檢核演算法 (8 碼標準加權檢查)
 * 回傳：{ isValid: boolean, error?: string }
 */
export function validateTaiwanTaxId(taxId?: string): { isValid: boolean; error?: string } {
  if (!taxId || !taxId.trim()) {
    return { isValid: true }; // 選填時若無輸入算通過
  }
  const clean = taxId.trim().replace(/[-\s]/g, '');
  if (!/^\d{8}$/.test(clean)) {
    return { isValid: false, error: '統一編號必須為剛好 8 碼半形數字' };
  }

  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const digit = parseInt(clean[i], 10);
    const prod = digit * weights[i];
    // 兩位數拆開相加 (或 Math.floor(prod/10) + prod%10)
    sum += Math.floor(prod / 10) + (prod % 10);
  }

  // 若第 7 位是 7，除以 10 餘 9 亦可算有效
  if (sum % 10 === 0) {
    return { isValid: true };
  }
  if (clean[6] === '7' && (sum + 1) % 10 === 0) {
    return { isValid: true };
  }

  return { isValid: false, error: '統一編號邏輯檢查碼不符（請確認是否有打錯數字）' };
}

export interface BackupData {
  version: string;
  exportedAt: string;
  transactions: Transaction[];
  categories: CategoryConfig[];
  budgets: Record<string, MonthBudget>;
  claimants?: string[];
  directorWithdrawals?: DirectorWithdrawal[];
  subAccounts?: SubAccount[];
  companyProfile?: CompanyProfile;
  companies?: CompanyProfile[];
  customers?: Customer[];
}

export type RestoreScope = 'full' | 'settings_only' | 'transactions_only';

export interface RestoreOptions {
  scope: RestoreScope;
}

// 預設常用請領人名單
export const DEFAULT_CLAIMANTS: string[] = [
  '自己 / 零用金管理員',
  '廠長',
  '陳小明',
  '林先生',
  '王小姐',
  '張組長',
  '李同仁'
];

// 公司零用金預設主分類與階層設定 (完全支援自訂與刪除，自帶稅務與單據智慧預設規則)
export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'dining',
    name: '餐飲',
    type: 'expense',
    icon: 'Utensils',
    color: '#f97316', // orange
    subLabel: '用餐店家',
    defaultSubItems: [
      '便當店',
      '早餐店',
      '麥當勞',
      '鼎泰豐',
      '牛肉麵店',
      '熱炒店',
      '火鍋店',
      '義大利麵',
      '便利商店',
      '咖啡店'
    ],
    hasPeopleCount: true,
    defaultReceiptType: 'none', // 預設無單據
    taxCategory: 'tax_exempt' // 免稅營業費用，不扣抵 401 營業稅，歸入田頭共用大水池
  },
  {
    id: 'fuel',
    name: '加油',
    type: 'expense',
    icon: 'Fuel',
    color: '#0284c7', // sky blue
    subLabel: '加油站',
    defaultSubItems: [
      '台灣中油',
      '台塑石油',
      '全國加油站',
      '山隆加油站',
      '台亞石油',
      '福懋加油站'
    ],
    hasPeopleCount: false,
    defaultReceiptType: 'none', // 預設無單據 (可手動點選切換為發票)
    taxCategory: 'deductible' // 進項可扣抵 5% 營業稅 (401 申報扣抵憑證)
  },
  {
    id: 'advance',
    name: '預支',
    type: 'expense',
    icon: 'HandCoins',
    color: '#8b5cf6', // purple
    subLabel: '預支同仁姓名',
    defaultSubItems: [
      '陳小明',
      '林先生',
      '王小姐',
      '張副理',
      '李同仁'
    ],
    hasPeopleCount: false,
    defaultReceiptType: 'none', // 預設無單據 (內部借支)
    taxCategory: 'tax_exempt'
  },
  {
    id: 'misc',
    name: '雜支',
    type: 'expense',
    icon: 'PackageCheck',
    color: '#64748b', // slate
    subLabel: '雜支項目',
    defaultSubItems: [
      '五金耗材',
      '生活日用品',
      '水電瓦斯費',
      '文具紙張',
      '清潔打掃用品',
      '手續規費',
      '設備修繕維護',
      '臨時急用'
    ],
    hasPeopleCount: false,
    defaultReceiptType: 'none', // 預設無單據
    taxCategory: 'tax_exempt'
  },
  {
    id: 'courtesy',
    name: '交際應酬 / 禮金公關',
    type: 'expense',
    icon: 'HeartHandshake',
    color: '#e11d48', // rose-600
    subLabel: '交際對象 / 項目',
    defaultSubItems: [
      '婚喪喜慶紅白包 (喜事賀禮/喪事奠儀)',
      '年節公關禮盒 (中秋月餅/端午禮品/春節伴手禮)',
      '業務拜訪禮品/伴手禮',
      '開工動土/喬遷誌慶花籃',
      '地方宮廟活動/睦鄰贊助款',
      '同業公會/商會贊助費',
      '客戶/廠商餐敘招待'
    ],
    hasPeopleCount: false,
    defaultReceiptType: 'none', // 預設無單據 (可選喜帖/收據/發票)
    taxCategory: 'non_deductible' // 依加值型營業稅法第19條，交際應酬進項稅額依法不得扣抵銷項稅額
  },
  {
    id: 'transport',
    name: '交通差旅',
    type: 'expense',
    icon: 'Car',
    color: '#0d9488', // teal
    subLabel: '交通方式 / 業者',
    defaultSubItems: [
      '計程車 / 叫車',
      '台灣高鐵',
      '台鐵火車',
      '停車費',
      '國道通行費 / 通行費',
      '市區公車 / 捷運'
    ],
    hasPeopleCount: false,
    defaultReceiptType: 'invoice', // 高鐵/台鐵/停車費發票
    taxCategory: 'deductible' // 營業公務差旅發票可扣抵 5%
  },
  {
    id: 'replenishment',
    name: '零用金撥補',
    type: 'income',
    icon: 'Coins',
    color: '#16a34a', // green
    subLabel: '撥補來源 / 歸墊方式',
    defaultSubItems: [
      '銀行提領補充',
      '主管交付撥款',
      '會計請款核銷歸墊',
      '同仁預支款繳回',
      '零星收入 / 押金退還'
    ],
    hasPeopleCount: false,
    defaultReceiptType: 'none',
    taxCategory: 'tax_exempt'
  }
];
