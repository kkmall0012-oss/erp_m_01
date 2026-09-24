import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  SubAccount, 
  DirectorWithdrawal,
  CompanyProfile,
  Customer
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
  customers?: Customer[];
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

// ==========================================
// 客戶聯絡資訊 API
// ==========================================

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch('/api/customers');
  if (!res.ok) {
    throw new Error('讀取客戶資料失敗');
  }
  const json = await res.json();
  return json.data;
}

export async function createCustomerApi(customer: Customer): Promise<Customer[]> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '新增客戶資料失敗');
  }
  const json = await res.json();
  return json.data;
}

export async function updateCustomerApi(customer: Customer): Promise<Customer[]> {
  const res = await fetch(`/api/customers/${encodeURIComponent(customer.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '更新客戶資料失敗');
  }
  const json = await res.json();
  return json.data;
}

export async function deleteCustomerApi(id: string): Promise<Customer[]> {
  const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '刪除客戶資料失敗');
  }
  const json = await res.json();
  return json.data;
}

export async function syncCustomersBatchApi(customers: Customer[]): Promise<Customer[]> {
  const res = await fetch('/api/customers/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '批次同步客戶資料失敗');
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

// 一鍵下載純文字標準 SQL 語法備份檔 (.sql，包含全資料表與所有資料列)
export function triggerDownloadSqlDumpFile(): void {
  const link = document.createElement('a');
  link.href = '/api/database/dump-sql';
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  link.download = `petty_cash_database_dump_${dateStr}.sql`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 一鍵下載 SQLite 完整全庫 JSON 格式備份檔 (.json，包含公司設定、客戶通訊、流水帳及所有附加資料表)
export function triggerDownloadFullJsonBackupFile(): void {
  const link = document.createElement('a');
  link.href = '/api/database/dump-json';
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  link.download = `petty_cash_full_backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 一鍵下載單一模組 JSON 格式備份檔 (.json)
export function triggerDownloadModularJsonBackupFile(moduleKey: string, moduleLabel?: string): void {
  const link = document.createElement('a');
  link.href = `/api/database/dump-json?module=${encodeURIComponent(moduleKey)}`;
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const label = moduleLabel || moduleKey;
  link.download = `模組備份_${label}_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 智慧模組精準還原 API
export async function restoreModularDataApi(
  data: any,
  modules: string[],
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string; result?: any }> {
  const res = await fetch('/api/database/restore-modular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, modules, mode })
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || '模組還原失敗');
  }
  return resData;
}

// 將 SQLite 最新資料匯出至 data/seeds/*.json 以供 Git 追蹤
export async function exportSeedsApi(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/database/export-seeds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok || !resData.success) {
    throw new Error(resData.error || '匯出 Git 種子資料失敗');
  }
  return resData;
}

// 上傳替換 SQLite 實體檔案、.sql 腳本或 JSON 備份檔 (換機帶著走直接載入)
export async function uploadSqliteFileApi(file: File): Promise<{ success: boolean; message: string; type?: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const res = await fetch('/api/database/upload-raw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    body: arrayBuffer
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || '載入 SQLite 資料庫檔案失敗');
  }
  return data;
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
