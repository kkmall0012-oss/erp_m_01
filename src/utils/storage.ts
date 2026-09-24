import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  BackupData, 
  DEFAULT_CATEGORIES, 
  DEFAULT_CLAIMANTS, 
  DirectorWithdrawal,
  SubAccount,
  CompanyProfile,
  DEFAULT_COMPANIES,
  DEFAULT_COMPANY_PROFILE,
  Customer,
  DatabaseModuleKey,
  DATABASE_MODULE_CONFIGS
} from '../types';
import { encryptBackupData, isEncryptedBackup } from './crypto';

const STORAGE_KEYS = {
  TRANSACTIONS: 'expense_tracker_transactions_v1',
  CATEGORIES: 'expense_tracker_categories_v1',
  BUDGETS: 'expense_tracker_budgets_v1',
  CLAIMANTS: 'expense_tracker_claimants_v1',
  DIRECTOR_WITHDRAWALS: 'expense_tracker_director_v1',
  SUB_ACCOUNTS: 'expense_tracker_sub_accounts_v1',
  COMPANIES: 'expense_tracker_companies_v1',
  COMPANY_PROFILE: 'expense_tracker_company_profile_v1',
  CUSTOMERS: 'expense_tracker_customers_v1',
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
      let cleaned = parsed;
      if (hasSalary) {
        cleaned = parsed
          .filter((c: CategoryConfig) => c.id !== 'salary')
          .concat(DEFAULT_CATEGORIES.filter((c) => c.id === 'replenishment'));
      }
      // 確保支出分類預設皆為無單據
      const normalized = cleaned.map((c: CategoryConfig) => {
        if (c.type === 'expense' && (c.defaultReceiptType === 'receipt' || !c.defaultReceiptType)) {
          return { ...c, defaultReceiptType: 'none' as const };
        }
        return c;
      });
      saveCategories(normalized);
      return normalized;
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

// 讀取專款子帳戶 (代管備用金 / 代收代付子帳號)
export function loadSubAccounts(): SubAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUB_ACCOUNTS);
    if (!raw) {
      // 預設建立一筆生動的示範專款子帳戶
      const today = getTodayDateStr();
      const currentYM = getCurrentYearMonth();
      const demoSubAccount: SubAccount = {
        id: 'sub-demo-1',
        name: '每週午餐餐點採買專款 (陳小明)',
        custodian: '陳小明',
        initialFund: 5000,
        startDate: `${currentYM}-01`,
        status: 'active',
        note: '每週預撥5,000元代管備用金，採買每日午餐，每週五統一結算匯入總帳',
        createdAt: Date.now() - 86400000 * 5,
        items: [
          {
            id: 'sub-item-1',
            date: `${currentYM}-02`,
            type: 'expense',
            subItem: '池上便當 (午餐5人份)',
            amount: 550,
            receiptType: 'invoice',
            invoiceNumber: 'UB-98765432',
            note: '現場領收便當',
            createdAt: Date.now() - 86400000 * 4,
            isImportedToGeneral: false
          },
          {
            id: 'sub-item-2',
            date: `${currentYM}-03`,
            type: 'expense',
            subItem: '全聯福利中心 (茶水點心與水果)',
            amount: 380,
            receiptType: 'receipt',
            note: '會議茶水水果',
            createdAt: Date.now() - 86400000 * 3,
            isImportedToGeneral: false
          },
          {
            id: 'sub-item-3',
            date: `${currentYM}-04`,
            type: 'expense',
            subItem: '麥當勞午餐 (4人份)',
            amount: 620,
            receiptType: 'invoice',
            invoiceNumber: 'VC-12349876',
            note: '午餐餐點',
            createdAt: Date.now() - 86400000 * 2,
            isImportedToGeneral: false
          }
        ]
      };
      saveSubAccounts([demoSubAccount]);
      return [demoSubAccount];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load sub accounts', e);
    return [];
  }
}

// 儲存專款子帳戶
export function saveSubAccounts(accounts: SubAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUB_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save sub accounts', e);
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

// 讀取本機公司主檔設定
export function loadCompanies(): CompanyProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (!raw) return DEFAULT_COMPANIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COMPANIES;
  } catch {
    return DEFAULT_COMPANIES;
  }
}

// 儲存本機公司主檔設定
export function saveCompanies(companies: CompanyProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  } catch (e) {
    console.error('Failed to save companies', e);
  }
}

export function loadCompanyProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
    if (!raw) return DEFAULT_COMPANY_PROFILE;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_COMPANY_PROFILE;
  }
}

export function saveCompanyProfile(profile: CompanyProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save company profile', e);
  }
}

export function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load customers from localStorage', e);
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Failed to save customers to localStorage', e);
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
      subItem: '台灣中油',
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

// 輔助函式：觸發瀏覽器下載檔案
function triggerBrowserDownload(content: string, filename: string, mimeType: string = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 產生全本機備份檔 (.json，支援選用 AES-256-GCM 密碼加密保密)
export async function exportBackupJSON(
  transactions: Transaction[],
  categories: CategoryConfig[],
  budgets: Record<string, MonthBudget>,
  claimants?: string[],
  directorWithdrawals?: DirectorWithdrawal[],
  subAccounts?: SubAccount[],
  companies?: CompanyProfile[],
  companyProfile?: CompanyProfile,
  customers?: Customer[],
  password?: string
): Promise<void> {
  const allCompanies = companies && companies.length > 0 ? companies : loadCompanies();
  const defCompany = companyProfile || allCompanies.find(c => c.isDefault) || allCompanies[0] || loadCompanyProfile();

  const data: BackupData = {
    version: '2.0.0',
    backupType: 'full',
    exportedAt: new Date().toISOString(),
    system: '企業零用金與客戶財務管理系統',
    transactions,
    categories,
    budgets,
    claimants: claimants || loadClaimants(),
    directorWithdrawals: directorWithdrawals || loadDirectorWithdrawals(),
    subAccounts: subAccounts || loadSubAccounts(),
    companies: allCompanies,
    companyProfile: defCompany,
    customers: customers || []
  };

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  if (password && password.trim().length > 0) {
    const encrypted = await encryptBackupData(data, password.trim(), 'full');
    triggerBrowserDownload(
      JSON.stringify(encrypted, null, 2),
      `系統全庫安全加密備份_${dateStr}.enc.json`
    );
  } else {
    triggerBrowserDownload(
      JSON.stringify(data, null, 2),
      `系統全庫完整備份_${dateStr}.json`
    );
  }
}

// 單獨匯出特定模組備份檔 (.json，支援選用密碼加密)
export async function exportModularBackupJSON(
  moduleKey: DatabaseModuleKey,
  allData: {
    transactions: Transaction[];
    categories: CategoryConfig[];
    budgets: Record<string, MonthBudget>;
    claimants?: string[];
    directorWithdrawals?: DirectorWithdrawal[];
    subAccounts?: SubAccount[];
    companies?: CompanyProfile[];
    companyProfile?: CompanyProfile;
    customers?: Customer[];
  },
  password?: string
): Promise<void> {
  const config = DATABASE_MODULE_CONFIGS[moduleKey];
  const moduleLabel = config?.label || moduleKey;

  const modularData: Partial<BackupData> & { moduleKey: DatabaseModuleKey; moduleLabel: string } = {
    version: '2.0.0',
    backupType: 'module',
    moduleKey,
    moduleLabel,
    exportedAt: new Date().toISOString(),
    system: '企業零用金與客戶財務管理系統'
  } as any;

  switch (moduleKey) {
    case 'companies':
      modularData.companies = allData.companies && allData.companies.length > 0 ? allData.companies : loadCompanies();
      modularData.companyProfile = allData.companyProfile || modularData.companies?.[0];
      break;
    case 'customers':
      modularData.customers = allData.customers || [];
      break;
    case 'transactions':
      modularData.transactions = allData.transactions || [];
      break;
    case 'categories_claimants':
      modularData.categories = allData.categories || DEFAULT_CATEGORIES;
      modularData.claimants = allData.claimants || loadClaimants();
      break;
    case 'sub_accounts':
      modularData.subAccounts = allData.subAccounts || loadSubAccounts();
      break;
    case 'budgets':
      modularData.budgets = allData.budgets || {};
      break;
    case 'director_withdrawals':
      modularData.directorWithdrawals = allData.directorWithdrawals || loadDirectorWithdrawals();
      break;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  if (password && password.trim().length > 0) {
    const encrypted = await encryptBackupData(modularData, password.trim(), 'module', moduleKey, moduleLabel);
    triggerBrowserDownload(
      JSON.stringify(encrypted, null, 2),
      `模組備份_${moduleLabel}_加密檔_${dateStr}.enc.json`
    );
  } else {
    triggerBrowserDownload(
      JSON.stringify(modularData, null, 2),
      `模組備份_${moduleLabel}_${dateStr}.json`
    );
  }
}

// 單獨匯出選單項目與請領人設定 (.json)
export function exportSettingsBackupJSON(
  categories: CategoryConfig[],
  claimants: string[]
): void {
  const data = {
    version: '2.0.0',
    backupType: 'module',
    moduleKey: 'categories_claimants' as DatabaseModuleKey,
    moduleLabel: '系統分類與請領人名冊',
    exportedAt: new Date().toISOString(),
    categories,
    claimants
  };

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  triggerBrowserDownload(JSON.stringify(data, null, 2), `公司零用金_主題分類與請領人名冊_${dateStr}.json`);
}

// 解析還原備份檔 (.json，支援完整庫備份或單獨模組備份，自動偵測加密)
export function parseBackupJSON(jsonStr: string): { data?: BackupData; isEncrypted: boolean; encryptedPayload?: any } | null {
  try {
    const parsed = JSON.parse(jsonStr);

    // 1. 檢驗是否為加密檔案
    if (isEncryptedBackup(parsed)) {
      return { isEncrypted: true, encryptedPayload: parsed };
    }

    // 2. 檢驗模組與內容
    const hasTransactions = Array.isArray(parsed.transactions);
    const hasCategories = Array.isArray(parsed.categories);
    const hasClaimants = Array.isArray(parsed.claimants);
    const hasCustomers = Array.isArray(parsed.customers);
    const hasCompanies = Array.isArray(parsed.companies) || !!parsed.companyProfile;
    const hasSubAccounts = Array.isArray(parsed.subAccounts);
    const hasBudgets = typeof parsed.budgets === 'object' && parsed.budgets !== null;
    const hasDirectorWithdrawals = Array.isArray(parsed.directorWithdrawals);

    const hasAnyValidData = 
      hasTransactions || 
      hasCategories || 
      hasClaimants || 
      hasCustomers || 
      hasCompanies || 
      hasSubAccounts || 
      hasBudgets || 
      hasDirectorWithdrawals;

    if (!hasAnyValidData) {
      throw new Error('無效的備份檔案格式：找不到任何合法的模組資料節點');
    }

    const backup: BackupData = {
      version: parsed.version || '2.0.0',
      backupType: parsed.backupType || (parsed.moduleKey ? 'module' : 'full'),
      moduleKey: parsed.moduleKey,
      moduleLabel: parsed.moduleLabel,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      system: parsed.system,
      transactions: hasTransactions ? parsed.transactions : [],
      categories: hasCategories ? parsed.categories : DEFAULT_CATEGORIES,
      budgets: hasBudgets ? parsed.budgets : {},
      claimants: hasClaimants ? parsed.claimants : DEFAULT_CLAIMANTS,
      directorWithdrawals: hasDirectorWithdrawals ? parsed.directorWithdrawals : [],
      subAccounts: hasSubAccounts ? parsed.subAccounts : [],
      companies: Array.isArray(parsed.companies) ? parsed.companies : (parsed.companyProfile ? [parsed.companyProfile] : undefined),
      companyProfile: parsed.companyProfile,
      customers: hasCustomers ? parsed.customers : [],
      extraTables: parsed.extraTables
    };

    return { data: backup, isEncrypted: false };
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
    return null;
  }
}
