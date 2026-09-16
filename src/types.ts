export type TransactionType = 'expense' | 'income';

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

export interface BackupData {
  version: string;
  exportedAt: string;
  transactions: Transaction[];
  categories: CategoryConfig[];
  budgets: Record<string, MonthBudget>;
  claimants?: string[];
  directorWithdrawals?: DirectorWithdrawal[];
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
