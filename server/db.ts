import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

export interface CategoryConfigRow {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  subLabel: string;
  defaultSubItems: string[];
  hasPeopleCount?: boolean;
}

export interface TransactionRow {
  id: string;
  date: string;
  type: 'expense' | 'income';
  categoryId: string;
  categoryName: string;
  subItem: string;
  claimant?: string;
  peopleCount?: number;
  amount: number;
  note: string;
  createdAt: number;
  receiptType?: 'receipt' | 'invoice' | 'none';
  invoiceNumber?: string;
  voucherNo?: string;
  rawVoucherId?: string;
  subAccountSourceId?: string;
  subAccountSourceName?: string;
  companyId?: string;
}

export interface MonthBudgetRow {
  yearMonth: string;
  budgetAmount: number;
  alertThresholdPercent: number;
}

export interface SubAccountItemRow {
  id: string;
  date: string;
  type: 'expense' | 'income';
  categoryId?: string;
  categoryName?: string;
  subItem: string;
  amount: number;
  receiptType: 'receipt' | 'invoice' | 'none';
  invoiceNumber?: string;
  claimant?: string;
  note?: string;
  createdAt: number;
  isImportedToGeneral?: boolean;
}

export interface SubAccountRow {
  id: string;
  name: string;
  custodian: string;
  initialFund: number;
  startDate: string;
  status: 'active' | 'settled';
  note?: string;
  createdAt: number;
  settledAt?: number;
  settlementNote?: string;
  items: SubAccountItemRow[];
}

export interface DirectorWithdrawalRow {
  id: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: number;
}

export interface CompanyProfileRow {
  id: string;
  name: string;
  shortName?: string;
  taxId?: string;
  representative?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  postalCode?: string;
  address?: string;
  bankName?: string;
  bankBranch?: string;
  bankCode?: string;
  bankAccount?: string;
  accountName?: string;
  chiefAccountant?: string;
  cashier?: string;
  reportHeader?: string;
  invoiceBuyerName?: string;
  taxInvoiceNote?: string;
  color?: string;
  isDefault?: boolean;
  sortOrder?: number;
  updatedAt: number;
}

// 預設 3 間關係企業/行號主檔種子
export const DEFAULT_COMPANIES_SEED: CompanyProfileRow[] = [
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
    color: '#0066cc',
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
    color: '#059669',
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
    taxInvoiceNote: '二聯式發票或收據請蓋商行專用印章',
    color: '#d97706',
    isDefault: false,
    sortOrder: 3,
    updatedAt: Date.now()
  }
];

// 預設分類種子資料
const INITIAL_CATEGORIES: CategoryConfigRow[] = [
  {
    id: 'dining',
    name: '餐飲開銷',
    type: 'expense',
    icon: 'utensils',
    color: '#ea580c',
    subLabel: '店家/餐飲名稱',
    defaultSubItems: ['八方雲集', '鬍鬚張便當', '星巴克會議咖啡', '麥當勞', '池上木片便當', '飲料手搖飲'],
    hasPeopleCount: true
  },
  {
    id: 'fuel',
    name: '車輛油資',
    type: 'expense',
    icon: 'fuel',
    color: '#0284c7',
    subLabel: '加油站名稱',
    defaultSubItems: ['台灣中油 (直營)', '全國加油站', '台亞石油', '統一精工加油站', '高速公路休息站加油']
  },
  {
    id: 'advance',
    name: '員工預支',
    type: 'expense',
    icon: 'hand-coins',
    color: '#7c3aed',
    subLabel: '預支同仁姓名',
    defaultSubItems: ['王大明', '李小華', '張志明', '工程部外勤同仁', '臨時工班預支']
  },
  {
    id: 'misc',
    name: '雜項開銷',
    type: 'expense',
    icon: 'package-check',
    color: '#475569',
    subLabel: '支出項目/用途',
    defaultSubItems: ['文具影印紙張', '辦公室衛生紙茶包', '郵寄掛號郵資', '五金清潔耗材', '拜拜水果供品']
  },
  {
    id: 'transport',
    name: '交通出差',
    type: 'expense',
    icon: 'car',
    color: '#0d9488',
    subLabel: '交通項目/站名',
    defaultSubItems: ['高鐵車票', '台鐵火車票', '計程車資 (Uber/小黃)', '市區公車/捷運', '臨時停車費', 'ETC eTag 儲值']
  },
  {
    id: 'replenishment',
    name: '零用金撥補',
    type: 'income',
    icon: 'coins',
    color: '#059669',
    subLabel: '撥補來源 / 歸墊方式',
    defaultSubItems: ['銀行提領補充', '主管交付撥款', '會計請款核銷歸墊', '同仁預支款繳回', '零星收入 / 押金退還']
  }
];

const INITIAL_CLAIMANTS: string[] = [
  '自己 / 零用金管理員',
  '王大明 (總務)',
  '李小華 (業務)',
  '張志明 (工程)',
  '陳廠長 (廠區)',
  '林會計 (財務)'
];

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'petty_cash.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  persist();
  return db;
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      categoryName TEXT NOT NULL,
      subItem TEXT NOT NULL,
      claimant TEXT,
      peopleCount INTEGER,
      amount REAL NOT NULL,
      note TEXT,
      createdAt INTEGER NOT NULL,
      receiptType TEXT,
      invoiceNumber TEXT,
      voucherNo TEXT,
      rawVoucherId TEXT,
      subAccountSourceId TEXT,
      subAccountSourceName TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      subLabel TEXT,
      defaultSubItems TEXT NOT NULL,
      hasPeopleCount INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS claimants (
      name TEXT PRIMARY KEY,
      sortOrder INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS budgets (
      yearMonth TEXT PRIMARY KEY,
      budgetAmount REAL NOT NULL,
      alertThresholdPercent REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sub_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      custodian TEXT NOT NULL,
      initialFund REAL NOT NULL,
      startDate TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      createdAt INTEGER NOT NULL,
      settledAt INTEGER,
      settlementNote TEXT,
      items TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS director_withdrawals (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shortName TEXT,
      taxId TEXT,
      representative TEXT,
      phone TEXT,
      fax TEXT,
      email TEXT,
      website TEXT,
      postalCode TEXT,
      address TEXT,
      bankName TEXT,
      bankBranch TEXT,
      bankCode TEXT,
      bankAccount TEXT,
      accountName TEXT,
      chiefAccountant TEXT,
      cashier TEXT,
      reportHeader TEXT,
      invoiceBuyerName TEXT,
      taxInvoiceNote TEXT,
      color TEXT,
      isDefault INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
  `);

  // 欄位升級防護
  try { database.run(`ALTER TABLE transactions ADD COLUMN companyId TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN color TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN isDefault INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN sortOrder INTEGER DEFAULT 0`); } catch (e) {}

  // 檢查既有行號主檔，並初始化 3 間關係企業
  const cpCountRes = database.exec('SELECT COUNT(*) AS cnt FROM company_profile');
  const cpCount = (cpCountRes[0]?.values[0]?.[0] as number) || 0;
  
  if (cpCount === 0) {
    DEFAULT_COMPANIES_SEED.forEach((cp) => {
      database.run(
        `INSERT INTO company_profile (
          id, name, shortName, taxId, representative, phone, fax, email, website,
          postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
          chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
          color, isDefault, sortOrder, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cp.id, cp.name, cp.shortName || null, cp.taxId || null, cp.representative || null,
          cp.phone || null, cp.fax || null, cp.email || null, cp.website || null,
          cp.postalCode || null, cp.address || null, cp.bankName || null, cp.bankBranch || null,
          cp.bankCode || null, cp.bankAccount || null, cp.accountName || null,
          cp.chiefAccountant || null, cp.cashier || null, cp.reportHeader || null,
          cp.invoiceBuyerName || null, cp.taxInvoiceNote || null,
          cp.color || '#0066cc', cp.isDefault ? 1 : 0, cp.sortOrder || 1, cp.updatedAt
        ]
      );
    });
  } else if (cpCount === 1) {
    // 若只有 default 一筆且是空白佔位，替換為 3 間示範企業；若是真實資料則重命名為 comp_1 並補齊 comp_2, comp_3
    const defRes = database.exec(`SELECT * FROM company_profile WHERE id = 'default' LIMIT 1`);
    if (defRes && defRes.length > 0 && defRes[0].values.length > 0) {
      const defaultName = String(defRes[0].values[0][1] || '');
      if (defaultName.includes('您的公司全名')) {
        database.run(`DELETE FROM company_profile WHERE id = 'default'`);
        DEFAULT_COMPANIES_SEED.forEach((cp) => {
          database.run(
            `INSERT INTO company_profile (
              id, name, shortName, taxId, representative, phone, fax, email, website,
              postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
              chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
              color, isDefault, sortOrder, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cp.id, cp.name, cp.shortName || null, cp.taxId || null, cp.representative || null,
              cp.phone || null, cp.fax || null, cp.email || null, cp.website || null,
              cp.postalCode || null, cp.address || null, cp.bankName || null, cp.bankBranch || null,
              cp.bankCode || null, cp.bankAccount || null, cp.accountName || null,
              cp.chiefAccountant || null, cp.cashier || null, cp.reportHeader || null,
              cp.invoiceBuyerName || null, cp.taxInvoiceNote || null,
              cp.color || '#0066cc', cp.isDefault ? 1 : 0, cp.sortOrder || 1, cp.updatedAt
            ]
          );
        });
      } else {
        database.run(`UPDATE company_profile SET id = 'comp_1', isDefault = 1, sortOrder = 1, color = '#0066cc' WHERE id = 'default'`);
        // 補上第二、第三家公司
        const otherSeeds = DEFAULT_COMPANIES_SEED.filter(c => c.id !== 'comp_1');
        otherSeeds.forEach((cp) => {
          database.run(
            `INSERT OR IGNORE INTO company_profile (
              id, name, shortName, taxId, representative, phone, fax, email, website,
              postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
              chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
              color, isDefault, sortOrder, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cp.id, cp.name, cp.shortName || null, cp.taxId || null, cp.representative || null,
              cp.phone || null, cp.fax || null, cp.email || null, cp.website || null,
              cp.postalCode || null, cp.address || null, cp.bankName || null, cp.bankBranch || null,
              cp.bankCode || null, cp.bankAccount || null, cp.accountName || null,
              cp.chiefAccountant || null, cp.cashier || null, cp.reportHeader || null,
              cp.invoiceBuyerName || null, cp.taxInvoiceNote || null,
              cp.color || '#059669', 0, cp.sortOrder || 2, cp.updatedAt
            ]
          );
        });
      }
    }
  }

  // 確保舊交易若無 companyId 預設補為 comp_1
  try {
    database.run(`UPDATE transactions SET companyId = 'comp_1' WHERE companyId IS NULL OR companyId = ''`);
  } catch (e) {}

  // Seed default categories if empty
  const catCountRes = database.exec('SELECT COUNT(*) AS cnt FROM categories');
  const catCount = (catCountRes[0]?.values[0]?.[0] as number) || 0;
  if (catCount === 0) {
    INITIAL_CATEGORIES.forEach((cat, idx) => {
      database.run(
        `INSERT INTO categories (id, name, type, icon, color, subLabel, defaultSubItems, hasPeopleCount, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cat.id,
          cat.name,
          cat.type,
          cat.icon,
          cat.color,
          cat.subLabel,
          JSON.stringify(cat.defaultSubItems),
          cat.hasPeopleCount ? 1 : 0,
          idx
        ]
      );
    });
  }

  // Seed default claimants if empty
  const claimantCountRes = database.exec('SELECT COUNT(*) AS cnt FROM claimants');
  const claimantCount = (claimantCountRes[0]?.values[0]?.[0] as number) || 0;
  if (claimantCount === 0) {
    INITIAL_CLAIMANTS.forEach((name, idx) => {
      database.run(`INSERT INTO claimants (name, sortOrder) VALUES (?, ?)`, [name, idx]);
    });
  }
}

export function persist() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database file:', err);
  }
}

export function getDatabaseFilePath(): string {
  return DB_PATH;
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const database = await getDb();
  const res = database.exec(`SELECT * FROM transactions ORDER BY date DESC, createdAt DESC`);
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id,
      date: obj.date,
      type: obj.type,
      categoryId: obj.categoryId,
      categoryName: obj.categoryName,
      subItem: obj.subItem,
      claimant: obj.claimant || undefined,
      peopleCount: obj.peopleCount !== null && obj.peopleCount !== undefined ? Number(obj.peopleCount) : undefined,
      amount: Number(obj.amount),
      note: obj.note || '',
      createdAt: Number(obj.createdAt),
      receiptType: obj.receiptType || undefined,
      invoiceNumber: obj.invoiceNumber || undefined,
      voucherNo: obj.voucherNo || undefined,
      rawVoucherId: obj.rawVoucherId || undefined,
      subAccountSourceId: obj.subAccountSourceId || undefined,
      subAccountSourceName: obj.subAccountSourceName || undefined,
      companyId: obj.companyId ? String(obj.companyId) : 'comp_1'
    };
  });
}

export async function addTransaction(t: TransactionRow): Promise<void> {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO transactions (
      id, date, type, categoryId, categoryName, subItem, claimant, peopleCount,
      amount, note, createdAt, receiptType, invoiceNumber, voucherNo, rawVoucherId,
      subAccountSourceId, subAccountSourceName, companyId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.id,
      t.date,
      t.type,
      t.categoryId,
      t.categoryName,
      t.subItem,
      t.claimant || null,
      t.peopleCount ?? null,
      t.amount,
      t.note || '',
      t.createdAt,
      t.receiptType || null,
      t.invoiceNumber || null,
      t.voucherNo || null,
      t.rawVoucherId || null,
      t.subAccountSourceId || null,
      t.subAccountSourceName || null,
      t.companyId || 'comp_1'
    ]
  );
  persist();
}

export async function updateTransaction(t: TransactionRow): Promise<void> {
  return addTransaction(t);
}

export async function deleteTransaction(id: string): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM transactions WHERE id = ?`, [id]);
  persist();
}

export async function replaceAllTransactions(transactions: TransactionRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM transactions`);
  for (const t of transactions) {
    database.run(
      `INSERT INTO transactions (
        id, date, type, categoryId, categoryName, subItem, claimant, peopleCount,
        amount, note, createdAt, receiptType, invoiceNumber, voucherNo, rawVoucherId,
        subAccountSourceId, subAccountSourceName, companyId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        t.date,
        t.type,
        t.categoryId,
        t.categoryName,
        t.subItem,
        t.claimant || null,
        t.peopleCount ?? null,
        t.amount,
        t.note || '',
        t.createdAt,
        t.receiptType || null,
        t.invoiceNumber || null,
        t.voucherNo || null,
        t.rawVoucherId || null,
        t.subAccountSourceId || null,
        t.subAccountSourceName || null,
        t.companyId || 'comp_1'
      ]
    );
  }
  persist();
}

export async function getAllCategories(): Promise<CategoryConfigRow[]> {
  const database = await getDb();
  const res = database.exec(`SELECT * FROM categories ORDER BY sortOrder ASC`);
  if (!res || res.length === 0) return INITIAL_CATEGORIES;
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    let subItems: string[] = [];
    try {
      subItems = JSON.parse(obj.defaultSubItems);
    } catch {
      subItems = [];
    }
    return {
      id: obj.id,
      name: obj.name,
      type: obj.type,
      icon: obj.icon,
      color: obj.color,
      subLabel: obj.subLabel,
      defaultSubItems: subItems,
      hasPeopleCount: Boolean(obj.hasPeopleCount)
    };
  });
}

export async function saveAllCategories(categories: CategoryConfigRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM categories`);
  categories.forEach((cat, idx) => {
    database.run(
      `INSERT INTO categories (id, name, type, icon, color, subLabel, defaultSubItems, hasPeopleCount, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id,
        cat.name,
        cat.type,
        cat.icon,
        cat.color,
        cat.subLabel,
        JSON.stringify(cat.defaultSubItems || []),
        cat.hasPeopleCount ? 1 : 0,
        idx
      ]
    );
  });
  persist();
}

export async function getAllClaimants(): Promise<string[]> {
  const database = await getDb();
  const res = database.exec(`SELECT name FROM claimants ORDER BY sortOrder ASC`);
  if (!res || res.length === 0) return INITIAL_CLAIMANTS;
  return res[0].values.map((row) => String(row[0]));
}

export async function saveAllClaimants(claimants: string[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM claimants`);
  claimants.forEach((name, idx) => {
    database.run(`INSERT INTO claimants (name, sortOrder) VALUES (?, ?)`, [name, idx]);
  });
  persist();
}

export async function getAllBudgets(): Promise<Record<string, MonthBudgetRow>> {
  const database = await getDb();
  const res = database.exec(`SELECT yearMonth, budgetAmount, alertThresholdPercent FROM budgets`);
  const record: Record<string, MonthBudgetRow> = {};
  if (!res || res.length === 0) return record;
  res[0].values.forEach((row) => {
    const ym = String(row[0]);
    record[ym] = {
      yearMonth: ym,
      budgetAmount: Number(row[1]),
      alertThresholdPercent: Number(row[2])
    };
  });
  return record;
}

export async function saveAllBudgets(budgets: Record<string, MonthBudgetRow>): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM budgets`);
  Object.values(budgets).forEach((b) => {
    database.run(
      `INSERT OR REPLACE INTO budgets (yearMonth, budgetAmount, alertThresholdPercent) VALUES (?, ?, ?)`,
      [b.yearMonth, b.budgetAmount, b.alertThresholdPercent]
    );
  });
  persist();
}

export async function getAllSubAccounts(): Promise<SubAccountRow[]> {
  const database = await getDb();
  const res = database.exec(`SELECT * FROM sub_accounts ORDER BY createdAt DESC`);
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    let items: SubAccountItemRow[] = [];
    try {
      items = JSON.parse(obj.items);
    } catch {
      items = [];
    }
    return {
      id: obj.id,
      name: obj.name,
      custodian: obj.custodian,
      initialFund: Number(obj.initialFund),
      startDate: obj.startDate,
      status: obj.status,
      note: obj.note || '',
      createdAt: Number(obj.createdAt),
      settledAt: obj.settledAt ? Number(obj.settledAt) : undefined,
      settlementNote: obj.settlementNote || undefined,
      items
    };
  });
}

export async function saveAllSubAccounts(subAccounts: SubAccountRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM sub_accounts`);
  subAccounts.forEach((sa) => {
    database.run(
      `INSERT INTO sub_accounts (
        id, name, custodian, initialFund, startDate, status, note, createdAt, settledAt, settlementNote, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sa.id,
        sa.name,
        sa.custodian,
        sa.initialFund,
        sa.startDate,
        sa.status,
        sa.note || null,
        sa.createdAt,
        sa.settledAt || null,
        sa.settlementNote || null,
        JSON.stringify(sa.items || [])
      ]
    );
  });
  persist();
}

export async function getAllDirectorWithdrawals(): Promise<DirectorWithdrawalRow[]> {
  const database = await getDb();
  const res = database.exec(`SELECT id, date, amount, note, createdAt FROM director_withdrawals ORDER BY date DESC`);
  if (!res || res.length === 0) return [];
  return res[0].values.map((row) => ({
    id: String(row[0]),
    date: String(row[1]),
    amount: Number(row[2]),
    note: row[3] ? String(row[3]) : undefined,
    createdAt: Number(row[4])
  }));
}

export async function saveAllDirectorWithdrawals(withdrawals: DirectorWithdrawalRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM director_withdrawals`);
  withdrawals.forEach((w) => {
    database.run(
      `INSERT INTO director_withdrawals (id, date, amount, note, createdAt) VALUES (?, ?, ?, ?, ?)`,
      [w.id, w.date, w.amount, w.note || null, w.createdAt]
    );
  });
  persist();
}

export function mapRowToCompanyProfile(obj: any): CompanyProfileRow {
  return {
    id: String(obj.id || 'comp_1'),
    name: String(obj.name || ''),
    shortName: obj.shortName ? String(obj.shortName) : '',
    taxId: obj.taxId ? String(obj.taxId) : '',
    representative: obj.representative ? String(obj.representative) : '',
    phone: obj.phone ? String(obj.phone) : '',
    fax: obj.fax ? String(obj.fax) : '',
    email: obj.email ? String(obj.email) : '',
    website: obj.website ? String(obj.website) : '',
    postalCode: obj.postalCode ? String(obj.postalCode) : '',
    address: obj.address ? String(obj.address) : '',
    bankName: obj.bankName ? String(obj.bankName) : '',
    bankBranch: obj.bankBranch ? String(obj.bankBranch) : '',
    bankCode: obj.bankCode ? String(obj.bankCode) : '',
    bankAccount: obj.bankAccount ? String(obj.bankAccount) : '',
    accountName: obj.accountName ? String(obj.accountName) : '',
    chiefAccountant: obj.chiefAccountant ? String(obj.chiefAccountant) : '',
    cashier: obj.cashier ? String(obj.cashier) : '',
    reportHeader: obj.reportHeader ? String(obj.reportHeader) : '',
    invoiceBuyerName: obj.invoiceBuyerName ? String(obj.invoiceBuyerName) : '',
    taxInvoiceNote: obj.taxInvoiceNote ? String(obj.taxInvoiceNote) : '',
    color: obj.color ? String(obj.color) : '#0066cc',
    isDefault: Boolean(obj.isDefault),
    sortOrder: Number(obj.sortOrder || 1),
    updatedAt: Number(obj.updatedAt || Date.now())
  };
}

export async function getAllCompanyProfiles(): Promise<CompanyProfileRow[]> {
  const database = await getDb();
  const res = database.exec(`SELECT * FROM company_profile ORDER BY sortOrder ASC, id ASC`);
  if (!res || res.length === 0 || !res[0].values.length) {
    return DEFAULT_COMPANIES_SEED;
  }
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return mapRowToCompanyProfile(obj);
  });
}

export async function getCompanyProfile(id?: string): Promise<CompanyProfileRow> {
  const database = await getDb();
  let query = `SELECT * FROM company_profile WHERE isDefault = 1 LIMIT 1`;
  if (id) {
    query = `SELECT * FROM company_profile WHERE id = '${id.replace(/'/g, "''")}' LIMIT 1`;
  }
  let res = database.exec(query);
  if (!res || res.length === 0 || !res[0].values.length) {
    res = database.exec(`SELECT * FROM company_profile ORDER BY sortOrder ASC LIMIT 1`);
  }
  if (!res || res.length === 0 || !res[0].values.length) {
    return DEFAULT_COMPANIES_SEED[0];
  }

  const columns = res[0].columns;
  const row = res[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return mapRowToCompanyProfile(obj);
}

export async function saveCompanyProfile(profile: CompanyProfileRow): Promise<void> {
  const database = await getDb();
  if (profile.isDefault) {
    database.run(`UPDATE company_profile SET isDefault = 0 WHERE id != ?`, [profile.id]);
  }
  database.run(
    `INSERT OR REPLACE INTO company_profile (
      id, name, shortName, taxId, representative, phone, fax, email, website,
      postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
      chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
      color, isDefault, sortOrder, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id || 'comp_1',
      profile.name || '公司名稱',
      profile.shortName || null,
      profile.taxId || null,
      profile.representative || null,
      profile.phone || null,
      profile.fax || null,
      profile.email || null,
      profile.website || null,
      profile.postalCode || null,
      profile.address || null,
      profile.bankName || null,
      profile.bankBranch || null,
      profile.bankCode || null,
      profile.bankAccount || null,
      profile.accountName || null,
      profile.chiefAccountant || null,
      profile.cashier || null,
      profile.reportHeader || null,
      profile.invoiceBuyerName || null,
      profile.taxInvoiceNote || null,
      profile.color || '#0066cc',
      profile.isDefault ? 1 : 0,
      profile.sortOrder ?? 1,
      Date.now()
    ]
  );
  persist();
}

export async function saveAllCompanyProfiles(profiles: CompanyProfileRow[]): Promise<void> {
  for (const profile of profiles) {
    await saveCompanyProfile(profile);
  }
  persist();
}

export async function deleteCompanyProfile(id: string): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM company_profile WHERE id = ?`, [id]);
  persist();
}

// 載入外部傳入的全新 SQLite 二進位檔案（用於使用者自備檔案還原或攜帶換機）
export async function replaceWithDatabaseBinary(fileBuffer: Uint8Array): Promise<void> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  const newDb = new SQL.Database(fileBuffer);
  initSchema(newDb);
  db = newDb;
  persist();
}
