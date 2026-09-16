import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  BackupData, 
  DEFAULT_CATEGORIES, 
  DEFAULT_CLAIMANTS, 
  DirectorWithdrawal 
} from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'expense_tracker_transactions_v1',
  CATEGORIES: 'expense_tracker_categories_v1',
  BUDGETS: 'expense_tracker_budgets_v1',
  CLAIMANTS: 'expense_tracker_claimants_v1',
  DIRECTOR_WITHDRAWALS: 'expense_tracker_director_v1',
  LAST_BACKUP: 'expense_tracker_last_backup_date'
};

// 格式化今日日期字串 YYYY-MM-DD
export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 格式化當前年月 YYYY-MM
export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// 讀取分類設定
export function loadCategories(): CategoryConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // 遷移：如果含有個人舊薪資分類，替換為零用金撥補
      const hasSalary = parsed.some((c: CategoryConfig) => c.id === 'salary');
      if (hasSalary) {
        const migrated = parsed
          .filter((c: CategoryConfig) => c.id !== 'salary')
          .concat(DEFAULT_CATEGORIES.filter((c) => c.id === 'replenishment'));
        saveCategories(migrated);
        return migrated;
      }
      return parsed;
    }
    return DEFAULT_CATEGORIES;
  } catch (e) {
    console.error('Failed to load categories', e);
    return DEFAULT_CATEGORIES;
  }
}

// 儲存分類設定
export function saveCategories(categories: CategoryConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories', e);
  }
}

// 讀取常用請領人名單
export function loadClaimants(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLAIMANTS);
    if (!raw) {
      saveClaimants(DEFAULT_CLAIMANTS);
      return DEFAULT_CLAIMANTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CLAIMANTS;
  } catch (e) {
    console.error('Failed to load claimants', e);
    return DEFAULT_CLAIMANTS;
  }
}

// 儲存常用請領人名單
export function saveClaimants(claimants: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLAIMANTS, JSON.stringify(claimants));
  } catch (e) {
    console.error('Failed to save claimants', e);
  }
}

// 讀取廠長專用零用金領取紀錄
export function loadDirectorWithdrawals(): DirectorWithdrawal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DIRECTOR_WITHDRAWALS);
    if (!raw) {
      // 預設一筆初次範例
      const currentYM = getCurrentYearMonth();
      const initial: DirectorWithdrawal[] = [
        {
          id: 'dir-demo-1',
          date: `${currentYM}-05`,
          amount: 5000,
          note: '廠長公務備用金',
          createdAt: Date.now() - 86400000 * 10
        }
      ];
      saveDirectorWithdrawals(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load director withdrawals', e);
    return [];
  }
}

// 儲存廠長專用零用金領取紀錄
export function saveDirectorWithdrawals(records: DirectorWithdrawal[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DIRECTOR_WITHDRAWALS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save director withdrawals', e);
  }
}

// 讀取所有交易記錄（若首次開啟，放入符合當前月份的範例資料，方便使用者初次體驗）
export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      const initialSeed = generateInitialSeedData();
      saveTransactions(initialSeed);
      return initialSeed;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load transactions', e);
    return [];
  }
}

// 儲存所有交易記錄
export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions', e);
  }
}

// 讀取各月預算設定 (預計花費)
export function loadBudgets(): Record<string, MonthBudget> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (!raw) {
      const defaultBudget: Record<string, MonthBudget> = {
        [getCurrentYearMonth()]: {
          yearMonth: getCurrentYearMonth(),
          budgetAmount: 35000,
          alertThresholdPercent: 20
        }
      };
      saveBudgets(defaultBudget);
      return defaultBudget;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load budgets', e);
    return {};
  }
}

// 儲存各月預算設定
export function saveBudgets(budgets: Record<string, MonthBudget>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  } catch (e) {
    console.error('Failed to save budgets', e);
  }
}

// 產生初次使用的範例記帳（精準符合公司零用金收支：零用金撥補、餐飲、加油、同仁預支、雜支）
function generateInitialSeedData(): Transaction[] {
  const currentYM = getCurrentYearMonth();
  return [
    {
      id: 'demo-0',
      date: `${currentYM}-01`,
      type: 'income',
      categoryId: 'replenishment',
      categoryName: '零用金撥補',
      subItem: '銀行提領補充',
      amount: 30000,
      note: '月初公司零用金固定撥款',
      createdAt: Date.now() - 86400000 * 14
    },
    {
      id: 'demo-1',
      date: `${currentYM}-02`,
      type: 'expense',
      categoryId: 'dining',
      categoryName: '餐飲',
      subItem: '便當店',
      peopleCount: 3,
      amount: 360,
      note: '工班同仁午餐便當',
      createdAt: Date.now() - 86400000 * 12
    },
    {
      id: 'demo-2',
      date: `${currentYM}-04`,
      type: 'expense',
      categoryId: 'fuel',
      categoryName: '加油',
      subItem: '台灣中油 (CPC)',
      amount: 1450,
      note: '公務車加滿 95無鉛汽油',
      createdAt: Date.now() - 86400000 * 10
    },
    {
      id: 'demo-3',
      date: `${currentYM}-06`,
      type: 'expense',
      categoryId: 'advance',
      categoryName: '預支',
      subItem: '陳小明',
      amount: 5000,
      note: '出差採購現場備料預支金',
      createdAt: Date.now() - 86400000 * 8
    },
    {
      id: 'demo-4',
      date: `${currentYM}-08`,
      type: 'expense',
      categoryId: 'misc',
      categoryName: '雜支',
      subItem: '五金耗材',
      amount: 820,
      note: '採購螺絲與電火布',
      createdAt: Date.now() - 86400000 * 6
    },
    {
      id: 'demo-5',
      date: `${currentYM}-10`,
      type: 'expense',
      categoryId: 'dining',
      categoryName: '餐飲',
      subItem: '熱炒店',
      peopleCount: 4,
      amount: 2200,
      note: '專案會議晚餐聚會',
      createdAt: Date.now() - 86400000 * 4
    },
    {
      id: 'demo-6',
      date: `${currentYM}-12`,
      type: 'expense',
      categoryId: 'fuel',
      categoryName: '加油',
      subItem: '台塑石油',
      amount: 1200,
      note: '貨車加油',
      createdAt: Date.now() - 86400000 * 2
    },
    {
      id: 'demo-7',
      date: `${currentYM}-13`,
      type: 'income',
      categoryId: 'replenishment',
      categoryName: '零用金撥補',
      subItem: '同仁預支款繳回',
      amount: 1800,
      note: '陳小明結算繳回未用零用金',
      createdAt: Date.now() - 86400000 * 1
    }
  ];
}

// 產生可存 10 年以上的全本機備份檔 (.json)
export function exportBackupJSON(
  transactions: Transaction[],
  categories: CategoryConfig[],
  budgets: Record<string, MonthBudget>,
  claimants?: string[],
  directorWithdrawals?: DirectorWithdrawal[]
): void {
  const data: BackupData = {
    version: '1.1.0',
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    budgets,
    claimants: claimants || loadClaimants(),
    directorWithdrawals: directorWithdrawals || loadDirectorWithdrawals()
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `公司零用金完整備份庫_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 還原備份檔 (.json)
export function parseBackupJSON(jsonStr: string): BackupData | null {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.transactions || !Array.isArray(data.transactions)) {
      throw new Error('無效的備份檔案格式：缺少交易紀錄資料');
    }
    return {
      version: data.version || '1.1.0',
      exportedAt: data.exportedAt || new Date().toISOString(),
      transactions: data.transactions,
      categories: Array.isArray(data.categories) ? data.categories : DEFAULT_CATEGORIES,
      budgets: typeof data.budgets === 'object' && data.budgets !== null ? data.budgets : {},
      claimants: Array.isArray(data.claimants) ? data.claimants : DEFAULT_CLAIMANTS,
      directorWithdrawals: Array.isArray(data.directorWithdrawals) ? data.directorWithdrawals : []
    };
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
    return null;
  }
}
