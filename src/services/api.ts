import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  SubAccount, 
  DirectorWithdrawal,
  CompanyProfile
} from '../types';

export interface BootstrapResponse {
  success: boolean;
  source: 'sqlite';
  dbPath: string;
  transactions: Transaction[];
  categories: CategoryConfig[];
  claimants: string[];
  budgets: Record<string, MonthBudget>;
  subAccounts: SubAccount[];
  directorWithdrawals: DirectorWithdrawal[];
  companyProfile?: CompanyProfile;
  companies?: CompanyProfile[];
}

// 取得 SQLite 後端完整初始資料
export async function fetchBootstrap(): Promise<BootstrapResponse> {
  const res = await fetch('/api/bootstrap');
  if (!res.ok) {
    throw new Error(`伺服器回應錯誤: ${res.status}`);
  }
  return res.json();
}

// 新增單筆交易至 SQLite
export async function createTransactionApi(tx: Transaction): Promise<void> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx)
  });
  if (!res.ok) {
    throw new Error('儲存交易至 SQLite 失敗');
  }
}

// 更新單筆交易至 SQLite
export async function updateTransactionApi(tx: Transaction): Promise<void> {
  const res = await fetch(`/api/transactions/${encodeURIComponent(tx.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx)
  });
  if (!res.ok) {
    throw new Error('更新交易至 SQLite 失敗');
  }
}

// 刪除單筆交易
export async function deleteTransactionApi(id: string): Promise<void> {
  const res = await fetch(`/api/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error('從 SQLite 刪除交易失敗');
  }
}

// 批次替換交易紀錄 (用於還原或大批匯入)
export async function syncAllTransactionsApi(transactions: Transaction[]): Promise<void> {
  const res = await fetch('/api/transactions-batch', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions })
  });
  if (!res.ok) {
    throw new Error('同步所有交易至 SQLite 失敗');
  }
}

// 儲存選單分類項目至 SQLite
export async function syncCategoriesApi(categories: CategoryConfig[]): Promise<void> {
  const res = await fetch('/api/categories', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories })
  });
  if (!res.ok) {
    throw new Error('儲存分類項目至 SQLite 失敗');
  }
}

// 儲存常用請領人至 SQLite
export async function syncClaimantsApi(claimants: string[]): Promise<void> {
  const res = await fetch('/api/claimants', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimants })
  });
  if (!res.ok) {
    throw new Error('儲存請領人至 SQLite 失敗');
  }
}

// 儲存預算設定至 SQLite
export async function syncBudgetsApi(budgets: Record<string, MonthBudget>): Promise<void> {
  const res = await fetch('/api/budgets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ budgets })
  });
  if (!res.ok) {
    throw new Error('儲存預算至 SQLite 失敗');
  }
}

// 儲存專案採買子帳戶至 SQLite
export async function syncSubAccountsApi(subAccounts: SubAccount[]): Promise<void> {
  const res = await fetch('/api/sub-accounts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subAccounts })
  });
  if (!res.ok) {
    throw new Error('儲存專案採買子帳戶至 SQLite 失敗');
  }
}

// 儲存廠長提領紀錄至 SQLite
export async function syncDirectorWithdrawalsApi(withdrawals: DirectorWithdrawal[]): Promise<void> {
  const res = await fetch('/api/director-withdrawals', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ withdrawals })
  });
  if (!res.ok) {
    throw new Error('儲存提領紀錄至 SQLite 失敗');
  }
}

// 取得所有公司/行號主檔資料 (支援 3 間關係企業)
export async function fetchCompanies(): Promise<CompanyProfile[]> {
  const res = await fetch('/api/companies');
  if (!res.ok) {
    throw new Error('讀取公司行號列表失敗');
  }
  const json = await res.json();
  return json.data;
}

// 批次儲存所有公司/行號資料
export async function saveCompaniesApi(companies: CompanyProfile[]): Promise<CompanyProfile[]> {
  const res = await fetch('/api/companies', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companies })
  });
  if (!res.ok) {
    throw new Error('儲存公司行號列表失敗');
  }
  const json = await res.json();
  return json.data;
}

// 取得單一公司基本設定資料
export async function fetchCompanyProfile(id?: string): Promise<CompanyProfile> {
  const url = id ? `/api/company-profile?id=${encodeURIComponent(id)}` : '/api/company-profile';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('讀取公司設定失敗');
  }
  const json = await res.json();
  return json.data;
}

// 儲存單一公司基本設定至 SQLite
export async function saveCompanyProfileApi(profile: CompanyProfile): Promise<CompanyProfile> {
  const res = await fetch('/api/company-profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) {
    throw new Error('儲存公司設定至 SQLite 失敗');
  }
  const json = await res.json();
  return json.data;
}

// 刪除特定行號
export async function deleteCompanyApi(id: string): Promise<CompanyProfile[]> {
  const res = await fetch(`/api/companies/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new Error('刪除公司行號失敗');
  }
  const json = await res.json();
  return json.data;
}

// 一鍵下載實體 SQLite 檔案 (帶著走)
export function triggerDownloadSqliteFile(): void {
  const link = document.createElement('a');
  link.href = '/api/database/download';
  link.download = `petty_cash_${new Date().toISOString().slice(0, 10)}.sqlite`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 上傳替換 SQLite 實體檔案 (換機帶著走直接載入)
export async function uploadSqliteFileApi(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const res = await fetch('/api/database/upload-raw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    body: arrayBuffer
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || '載入 SQLite 資料庫檔案失敗');
  }
}

// 將瀏覽器舊版 localStorage 資料無縫轉移進 SQLite
export async function migrateFromLocalApi(data: {
  transactions?: Transaction[];
  categories?: CategoryConfig[];
  claimants?: string[];
  budgets?: Record<string, MonthBudget>;
  subAccounts?: SubAccount[];
  directorWithdrawals?: DirectorWithdrawal[];
}): Promise<any> {
  const res = await fetch('/api/database/migrate-from-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error('資料移轉失敗');
  }
  return res.json();
}
