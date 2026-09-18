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
  BusinessContact
} from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'expense_tracker_transactions_v1',
  CATEGORIES: 'expense_tracker_categories_v1',
  BUDGETS: 'expense_tracker_budgets_v1',
  CLAIMANTS: 'expense_tracker_claimants_v1',
  DIRECTOR_WITHDRAWALS: 'expense_tracker_director_v1',
  SUB_ACCOUNTS: 'expense_tracker_sub_accounts_v1',
  COMPANY_PROFILE: 'expense_tracker_company_profile_v1',
  BUSINESS_CONTACTS: 'expense_tracker_business_contacts_v1',
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

// 本公司預設初始基本資料
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: '弘業精密實業有限公司',
  taxId: '54892163',
  owner: '王大衛',
  phone: '02-2789-8800',
  fax: '02-2789-8801',
  email: 'service@hongye-precision.com.tw',
  registeredAddress: '台北市內湖區瑞光路 588 號 8 樓',
  shippingAddress: '新北市五股區五工二路 102 號 (五股廠區倉庫)',
  bankName: '004 臺灣銀行',
  bankBranch: '南港分行',
  bankAccount: '054-001-889922',
  bankAccountName: '弘業精密實業有限公司',
  invoiceTitleNotes: '請一律開立三聯式統一發票 (含稅 5%)，發票備註欄請填寫承辦採買案號'
};

// 預設往來客戶與供應商示範資料
export const DEFAULT_BUSINESS_CONTACTS: BusinessContact[] = [
  {
    id: 'cnt-v-1',
    type: 'vendor',
    name: '協成五金螺絲五金建材行',
    shortName: '協成五金',
    taxId: '12345678',
    category: '五金耗材',
    contactPerson: '李協理',
    jobTitle: '廠務業務專員',
    phone: '02-2998-1122',
    mobile: '0912-345-678',
    email: 'sales@xiecheng-hardware.com',
    lineId: 'xc_hardware',
    address: '新北市新莊區化成路 320 號',
    paymentTerms: '零用金現金實支 / 月結 30 天',
    bankInfo: {
      bankName: '007 第一銀行',
      branch: '新莊分行',
      accountNumber: '215-10-888999',
      accountName: '協成五金行'
    },
    status: 'active',
    notes: '常規採買螺絲、膨脹螺栓、噴劑，可憑收據或三聯發票報銷',
    createdAt: Date.now() - 86400000 * 30
  },
  {
    id: 'cnt-v-2',
    type: 'vendor',
    name: '福盛紙業包裝工業股份有限公司',
    shortName: '福盛紙業',
    taxId: '87654321',
    category: '包裝耗材',
    contactPerson: '張玉婷',
    jobTitle: '客服組長',
    phone: '02-8686-5566',
    mobile: '0928-888-999',
    email: 'order@fusheng-pack.com.tw',
    lineId: 'fusheng_pack',
    address: '新北市樹林區三俊街 65 號',
    paymentTerms: '次月 15 日電匯',
    bankInfo: {
      bankName: '013 國泰世華銀行',
      branch: '樹林分行',
      accountNumber: '037-03-5001234',
      accountName: '福盛紙業包裝工業股份有限公司'
    },
    status: 'active',
    notes: '出貨瓦楞紙箱、氣泡布，每批滿額送免運',
    createdAt: Date.now() - 86400000 * 20
  },
  {
    id: 'cnt-c-1',
    type: 'client',
    name: '永泰航太科技股份有限公司',
    shortName: '永泰航太',
    taxId: '23456789',
    category: '精密航太客戶',
    contactPerson: '陳建銘',
    jobTitle: '資深採購工程師',
    phone: '03-388-7799',
    mobile: '0933-123-456',
    email: 'jmchen@yongtai-tech.com',
    lineId: 'jmchen_yt',
    address: '桃園市蘆竹區南青路 188 號',
    paymentTerms: '月結 60 天匯款',
    bankInfo: {
      bankName: '008 華南商業銀行',
      branch: '蘆竹分行',
      accountNumber: '175-20-112233',
      accountName: '永泰航太科技股份有限公司'
    },
    status: 'active',
    notes: 'A級重要客戶，每月定期交貨精密沖壓件',
    createdAt: Date.now() - 86400000 * 45
  },
  {
    id: 'cnt-v-3',
    type: 'vendor',
    name: '池上木片便當 (五股工專店)',
    shortName: '池上便當',
    taxId: '34567890',
    category: '餐飲供應',
    contactPerson: '林老闆',
    jobTitle: '店長',
    phone: '02-2299-3355',
    mobile: '0955-667-889',
    address: '新北市五股區成泰路二段 45 號',
    paymentTerms: '零用金每日現場付現 / 可開免用統一發票專用收據',
    status: 'active',
    notes: '廠區加班同仁午晚餐便當，滿10個可外送',
    createdAt: Date.now() - 86400000 * 15
  }
];

// 讀取本公司設定
export function loadCompanyProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANY_PROFILE);
    if (!raw) {
      saveCompanyProfile(DEFAULT_COMPANY_PROFILE);
      return DEFAULT_COMPANY_PROFILE;
    }
    const parsed = JSON.parse(raw);
    return parsed && parsed.name ? parsed : DEFAULT_COMPANY_PROFILE;
  } catch (e) {
    console.error('Failed to load company profile', e);
    return DEFAULT_COMPANY_PROFILE;
  }
}

// 儲存本公司設定
export function saveCompanyProfile(profile: CompanyProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save company profile', e);
  }
}

// 讀取往來客戶與廠商通訊名冊
export function loadBusinessContacts(): BusinessContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS_CONTACTS);
    if (!raw) {
      saveBusinessContacts(DEFAULT_BUSINESS_CONTACTS);
      return DEFAULT_BUSINESS_CONTACTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_BUSINESS_CONTACTS;
  } catch (e) {
    console.error('Failed to load business contacts', e);
    return DEFAULT_BUSINESS_CONTACTS;
  }
}

// 儲存往來客戶與廠商通訊名冊
export function saveBusinessContacts(contacts: BusinessContact[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BUSINESS_CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    console.error('Failed to save business contacts', e);
  }
}

// 產生可存 10 年以上的全本機備份檔 (.json)
export function exportBackupJSON(
  transactions: Transaction[],
  categories: CategoryConfig[],
  budgets: Record<string, MonthBudget>,
  claimants?: string[],
  directorWithdrawals?: DirectorWithdrawal[],
  subAccounts?: SubAccount[],
  companyProfile?: CompanyProfile,
  businessContacts?: BusinessContact[]
): void {
  const data: BackupData = {
    version: '1.3.0',
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    budgets,
    claimants: claimants || loadClaimants(),
    directorWithdrawals: directorWithdrawals || loadDirectorWithdrawals(),
    subAccounts: subAccounts || loadSubAccounts(),
    companyProfile: companyProfile || loadCompanyProfile(),
    businessContacts: businessContacts || loadBusinessContacts()
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `公司零用金與商務通訊完整備份庫_${dateStr}.json`;
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
      version: data.version || '1.3.0',
      exportedAt: data.exportedAt || new Date().toISOString(),
      transactions: data.transactions,
      categories: Array.isArray(data.categories) ? data.categories : DEFAULT_CATEGORIES,
      budgets: typeof data.budgets === 'object' && data.budgets !== null ? data.budgets : {},
      claimants: Array.isArray(data.claimants) ? data.claimants : DEFAULT_CLAIMANTS,
      directorWithdrawals: Array.isArray(data.directorWithdrawals) ? data.directorWithdrawals : [],
      subAccounts: Array.isArray(data.subAccounts) ? data.subAccounts : [],
      companyProfile: data.companyProfile || DEFAULT_COMPANY_PROFILE,
      businessContacts: Array.isArray(data.businessContacts) ? data.businessContacts : DEFAULT_BUSINESS_CONTACTS
    };
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
    return null;
  }
}
