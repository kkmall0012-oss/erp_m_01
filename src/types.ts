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
  subAccountSourceId?: string; // 若是由專款子帳戶匯入，記錄來源子帳戶 ID
  subAccountSourceName?: string; // 若是由專款子帳戶匯入，記錄子帳戶名稱
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

// 本公司基本設定
export interface CompanyProfile {
  name: string; // 公司名稱 / 行號全銜
  taxId: string; // 統一編號 (8碼)
  owner: string; // 負責人 / 代表人
  phone: string; // 聯絡電話
  fax?: string; // 傳真號碼
  email?: string; // 公司官方電子信箱
  registeredAddress: string; // 公司登記地址
  shippingAddress?: string; // 營業通訊 / 出貨倉庫地址
  bankName: string; // 主要匯款往來銀行 (含代碼)
  bankBranch?: string; // 分行名稱
  bankAccount: string; // 銀行帳號
  bankAccountName: string; // 銀行戶名
  invoiceTitleNotes?: string; // 開立發票與收據特別備註 (如：二聯/三聯抬頭、營業稅外加等)
  updatedAt?: number;
}

// 往來客戶與廠商通訊名冊
export interface BusinessContact {
  id: string;
  type: 'client' | 'vendor'; // 'client' (客戶) | 'vendor' (廠商/供應商)
  name: string; // 公司或行號名稱
  shortName?: string; // 簡稱
  taxId?: string; // 統一編號 (選填)
  category: string; // 產業類別 / 供貨項目 (如：五金耗材、包裝紙箱、外包工程、餐飲便當、長期客戶)
  contactPerson: string; // 主要聯絡窗口同仁姓名
  jobTitle?: string; // 窗口職稱
  phone?: string; // 市話電話
  mobile?: string; // 手機號碼
  email?: string; // 電子信箱
  lineId?: string; // LINE ID
  address?: string; // 通訊地址
  paymentTerms: string; // 付款/請款條件 (如：月結30天、匯款、零用金現金實支、次月15日電匯)
  bankInfo?: {
    bankName: string; // 銀行名稱
    branch?: string; // 分行
    accountNumber: string; // 帳號
    accountName: string; // 戶名
  };
  status: 'active' | 'inactive'; // 合作狀態：合作中 | 暫停合作
  notes?: string; // 備忘錄與注意事項
  createdAt: number;
  updatedAt?: number;
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
  businessContacts?: BusinessContact[];
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
      '台灣中油 (CPC)',
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
      '計程車 / Uber',
      '台灣高鐵',
      '台鐵火車',
      '停車費',
      '國道通行費 (eTag)',
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
