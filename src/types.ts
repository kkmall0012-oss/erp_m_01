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
  amount: number; // 金額 (NT$)
  note: string;
  createdAt: number;
  receiptType?: ReceiptType; // 'receipt' (收據) | 'invoice' (發票) | 'none' (無憑證)
  invoiceNumber?: string; // 發票號碼 (選填，當 receiptType === 'invoice' 時)
  voucherNo?: string; // 系統加工後之高可讀性傳票編號 (方案 A，例如：P2026090714-0001，當月獨立流水號)
  rawVoucherId?: string; // 帳務小管家原生建檔模式編號 (例如：P20260907142530123，用於與小管家 100% 相容匯入匯出)
  subAccountSourceId?: string; // 若是由專款子帳戶匯入，記錄來源子帳戶 ID
  subAccountSourceName?: string; // 若是由專款子帳戶匯入，記錄子帳戶名稱
  companyId?: string; // 所屬公司/行號 ID (支援 3 間關係企業獨立作帳與切換)
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
  name: string; // 公司全名 (如「宏揚精密工業股份有限公司」)
  shortName?: string; // 公司簡稱 (如「宏揚精密」)
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
  sortOrder?: number;
  updatedAt?: number;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  id: 'comp_1',
  name: '宏揚精密工業股份有限公司',
  shortName: '宏揚精密',
  taxId: '84920193',
  representative: '陳負責人',
  phone: '02-2345-6789',
  fax: '02-2345-6790',
  email: 'finance@hongyang.com.tw',
  website: '',
  postalCode: '221',
  address: '新北市汐止區新台五路一段100號',
  bankName: '臺灣銀行 南港分行',
  bankBranch: '南港分行',
  bankCode: '004',
  bankAccount: '004-012-3456789',
  accountName: '宏揚精密工業股份有限公司',
  chiefAccountant: '林會計',
  cashier: '張出納',
  reportHeader: '',
  invoiceBuyerName: '宏揚精密工業股份有限公司',
  taxInvoiceNote: '發票開立請開立三聯式發票並載明統一編號 84920193',
  color: '#0066cc',
  isDefault: true,
  sortOrder: 1,
  updatedAt: Date.now()
};

export const DEFAULT_COMPANIES: CompanyProfile[] = [
  {
    id: 'comp_1',
    name: '宏揚精密工業股份有限公司',
    shortName: '宏揚精密',
    taxId: '84920193',
    representative: '陳負責人',
    phone: '02-2345-6789',
    fax: '02-2345-6790',
    email: 'finance@hongyang.com.tw',
    website: '',
    postalCode: '221',
    address: '新北市汐止區新台五路一段100號',
    bankName: '臺灣銀行 南港分行',
    bankBranch: '南港分行',
    bankCode: '004',
    bankAccount: '004-012-3456789',
    accountName: '宏揚精密工業股份有限公司',
    chiefAccountant: '林會計',
    cashier: '張出納',
    reportHeader: '宏揚精密工業 零用金收支報表',
    invoiceBuyerName: '宏揚精密工業股份有限公司',
    taxInvoiceNote: '請開立三聯式發票，載明統編 84920193',
    color: '#0066cc', // 經典海軍藍
    isDefault: true,
    sortOrder: 1,
    updatedAt: Date.now()
  },
  {
    id: 'comp_2',
    name: '宏揚智能科技有限公司',
    shortName: '宏揚科技',
    taxId: '90218842',
    representative: '陳負責人',
    phone: '02-2345-6780',
    fax: '02-2345-6791',
    email: 'smart@hongyang.com.tw',
    website: '',
    postalCode: '114',
    address: '台北市內湖區瑞光路500號',
    bankName: '玉山銀行 內湖分行',
    bankBranch: '內湖分行',
    bankCode: '808',
    bankAccount: '808-987-6543210',
    accountName: '宏揚智能科技有限公司',
    chiefAccountant: '林會計',
    cashier: '張出納',
    reportHeader: '宏揚智能科技 零用金收支月報表',
    invoiceBuyerName: '宏揚智能科技有限公司',
    taxInvoiceNote: '請開立三聯式發票，載明統編 90218842',
    color: '#059669', // 翡翠綠
    isDefault: false,
    sortOrder: 2,
    updatedAt: Date.now()
  },
  {
    id: 'comp_3',
    name: '弘揚工程商行',
    shortName: '弘揚商行',
    taxId: '38472910',
    representative: '陳負責人',
    phone: '02-2345-6788',
    fax: '',
    email: 'engineering@hongyang.com.tw',
    website: '',
    postalCode: '221',
    address: '新北市汐止區工建路200號',
    bankName: '第一銀行 汐止分行',
    bankBranch: '汐止分行',
    bankCode: '007',
    bankAccount: '007-567-8901234',
    accountName: '弘揚工程商行',
    chiefAccountant: '林會計',
    cashier: '張出納',
    reportHeader: '弘揚工程商行 現金收支帳簿',
    invoiceBuyerName: '弘揚工程商行',
    taxInvoiceNote: '二聯式發票或收據請蓋公司/商行專用印章',
    color: '#d97706', // 琥珀橘
    isDefault: false,
    sortOrder: 3,
    updatedAt: Date.now()
  }
];

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

// 公司零用金預設主分類與階層設定 (完全支援自訂與刪除)
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
    hasPeopleCount: true
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
    hasPeopleCount: false
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
    hasPeopleCount: false
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
    hasPeopleCount: false
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
    hasPeopleCount: false
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
    hasPeopleCount: false
  }
];
