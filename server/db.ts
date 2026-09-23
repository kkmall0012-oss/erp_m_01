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
  defaultReceiptType?: 'receipt' | 'invoice' | 'none';
  taxCategory?: 'deductible' | 'non_deductible' | 'tax_exempt';
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
  netAmount?: number;
  taxAmount?: number;
  taxDeductible?: boolean;
  sellerTaxId?: string;
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
  isNominalPettyCashHolder?: boolean;
  sortOrder?: number;
  updatedAt: number;
}

export interface CustomerContactPersonRow {
  id: string;
  name: string;
  title?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  lineId?: string;
  note?: string;
}

export interface CustomerEventRecordRow {
  id: string;
  date: string;
  category: 'wedding_funeral' | 'business_gift' | 'important_matter' | 'other';
  categoryLabel?: string;
  title: string;
  eventType?: string;
  hasAmount: boolean;
  amount?: number;
  direction?: 'outgoing' | 'incoming';
  targetPerson?: string;
  ourRepresentative?: string;
  isPettyCashLinked?: boolean;
  voucherNo?: string;
  proofNote?: string;
  note?: string;
  createdAt: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  shortName?: string;
  isIndividual: boolean;
  taxId?: string;
  representative?: string;
  representativeMobile?: string;
  secondaryRepresentative?: string;
  phone1?: string;
  phone2?: string;
  fax?: string;
  email?: string;
  website?: string;
  lineId?: string;
  postalCode?: string;
  address?: string;
  shippingAddress?: string;
  contacts: CustomerContactPersonRow[];
  paymentTerm?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  accountName?: string;
  businessItems?: string;
  isCustomer: boolean;
  isSupplier: boolean;
  favoriteCompanyIds: string[];
  events?: CustomerEventRecordRow[];
  note?: string;
  createdAt: number;
  updatedAt: number;
}

// 預設 3 間關係企業/行號主檔種子（三社共用零用金專戶，掛名主理：田頭工程有限公司）
export const DEFAULT_COMPANIES_SEED: CompanyProfileRow[] = [
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
    color: '#0066cc',
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
    color: '#059669',
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
    color: '#d97706',
    isDefault: false,
    isNominalPettyCashHolder: false,
    sortOrder: 3,
    updatedAt: Date.now()
  }
];

// 預設客戶與廠商種子名冊（含婚喪喜慶、商務交際與重要事項歷史紀錄）
export const DEFAULT_CUSTOMERS_SEED: CustomerRow[] = [
  {
    id: 'cust_seed_1',
    name: '台塑精密工程股份有限公司',
    shortName: '台塑精密',
    isIndividual: false,
    taxId: '23456789',
    representative: '陳志明',
    representativeMobile: '0912-345-678',
    phone1: '02-2789-0123',
    postalCode: '115',
    address: '台北市南港區重陽路120號',
    contacts: [
      { id: 'cnt_1_1', name: '李如榮', title: '業務專案經理', mobile: '0922-111-222', phone: '分機 301', note: '主要採購窗口' },
      { id: 'cnt_1_2', name: '林玉秀', title: '財務會計', phone: '02-2789-0123 分機 105', note: '請款核銷窗口' }
    ],
    paymentTerm: '銀行匯款 (月結 30 天)',
    bankName: '臺灣銀行 南港分行',
    bankBranch: '南港分行',
    bankAccount: '004-123-4567890',
    accountName: '台塑精密工程股份有限公司',
    businessItems: 'AC瀝青鋪面、鋼構廠房、冷卻管路機電維護',
    isCustomer: true,
    isSupplier: true,
    favoriteCompanyIds: ['comp_1', 'comp_3'],
    note: '雙向合作夥伴：我方承接其瀝青工程，其亦為我方機電協力廠商',
    events: [
      {
        id: 'evt_1_1',
        date: '2026-08-18',
        category: 'wedding_funeral',
        categoryLabel: '婚喪喜慶',
        title: '陳董令嬡文定喜宴 (紅包禮金)',
        eventType: '結婚紅包',
        hasAmount: true,
        amount: 3600,
        direction: 'outgoing',
        targetPerson: '陳志明 董事長',
        ourRepresentative: '陳廠長 (出席大直典華喜宴)',
        isPettyCashLinked: true,
        voucherNo: 'P2026081801-0002',
        proofNote: '喜帖存查、已附喜餅謝卡',
        note: '董事長親切致意，安排主桌貴賓席',
        createdAt: 1787040000000
      },
      {
        id: 'evt_1_2',
        date: '2026-05-12',
        category: 'wedding_funeral',
        categoryLabel: '婚喪喜慶',
        title: '工務部黃協理尊翁仙逝 (白包奠儀)',
        eventType: '公祭白包',
        hasAmount: true,
        amount: 2100,
        direction: 'outgoing',
        targetPerson: '工務部 黃協理',
        ourRepresentative: '李業務代表',
        isPettyCashLinked: true,
        voucherNo: 'P2026051201-0004',
        proofNote: '已附訃聞與謝卡存查',
        note: '市立第一殯儀館公祭致哀',
        createdAt: 1778572800000
      },
      {
        id: 'evt_1_3',
        date: '2026-01-20',
        category: 'business_gift',
        categoryLabel: '商務交際',
        title: '竹科二廠落成誌慶 (高架花籃一對)',
        eventType: '花籃盆栽',
        hasAmount: true,
        amount: 3000,
        direction: 'outgoing',
        targetPerson: '台塑精密全體同仁',
        ourRepresentative: '廠長暨全體業務部',
        isPettyCashLinked: false,
        proofNote: '花苑請款發票',
        note: '高架羅馬柱鮮花一對，賀詞：駿業崇隆',
        createdAt: 1768896000000
      },
      {
        id: 'evt_1_4',
        date: '2026-09-02',
        category: 'important_matter',
        categoryLabel: '重大記事',
        title: '續簽 2026~2027 年度產線高壓配電與空調設備聯合維護合約',
        eventType: '合約協議',
        hasAmount: false,
        targetPerson: '陳志明 董事長 / 李如榮 經理',
        ourRepresentative: '陳負責人、林會計',
        proofNote: '合約編號 HY-2026-ENG08 正本雙方用印歸檔',
        note: '合約條件維持原合約單價，附工安保險切結書',
        createdAt: 1788336000000
      }
    ],
    createdAt: Date.now() - 3600000 * 24 * 30,
    updatedAt: Date.now()
  },
  {
    id: 'cust_seed_2',
    name: '宏泰工業五金建材行',
    shortName: '宏泰建材',
    isIndividual: false,
    taxId: '34567890',
    representative: '林國華',
    representativeMobile: '0933-456-789',
    phone1: '02-2641-5588',
    postalCode: '221',
    address: '新北市汐止區大同路一段280號',
    contacts: [
      { id: 'cnt_2_1', name: '林國華', title: '負責人/老闆', mobile: '0933-456-789', note: '五金急料叫貨直接找林老闆' }
    ],
    paymentTerm: '開立支票 (次月 15 號換票 / 票期 30 天)',
    bankName: '第一商業銀行 汐止分行',
    bankBranch: '汐止分行',
    bankAccount: '007-654-3210987',
    accountName: '宏泰工業五金建材行',
    businessItems: '工廠維修五金、高張力螺絲、AC補路瀝青包、油漆塗料',
    isCustomer: false,
    isSupplier: true,
    favoriteCompanyIds: ['comp_1', 'comp_2', 'comp_3'],
    note: '汐止在地五金急件供應商，配合度高，可簽單月結',
    events: [
      {
        id: 'evt_2_1',
        date: '2026-09-10',
        category: 'business_gift',
        categoryLabel: '商務交際',
        title: '致送 2026 中秋節頂級高山茶伴手禮盒',
        eventType: '中秋禮盒',
        hasAmount: true,
        amount: 2400,
        direction: 'outgoing',
        targetPerson: '林國華 老闆',
        ourRepresentative: '李業務',
        isPettyCashLinked: true,
        voucherNo: 'P2026091001-0001',
        proofNote: '採買發票已入帳',
        note: '感謝林老闆工期緊急時假日配合調料',
        createdAt: 1789027200000
      },
      {
        id: 'evt_2_2',
        date: '2026-06-06',
        category: 'wedding_funeral',
        categoryLabel: '婚喪喜慶',
        title: '林老闆長孫誕生 (彌月添喜紅包)',
        eventType: '彌月紅包',
        hasAmount: true,
        amount: 2000,
        direction: 'outgoing',
        targetPerson: '林國華 老闆',
        ourRepresentative: '廠長',
        isPettyCashLinked: true,
        proofNote: '已收到彌月蛋糕油飯與賀卡',
        note: '林家添丁弄璋之喜',
        createdAt: 1780732800000
      }
    ],
    createdAt: Date.now() - 3600000 * 24 * 60,
    updatedAt: Date.now()
  }
];

// 預設分類種子資料 (包含稅務扣抵性與單據預設)
const INITIAL_CATEGORIES: CategoryConfigRow[] = [
  {
    id: 'dining',
    name: '餐飲開銷',
    type: 'expense',
    icon: 'utensils',
    color: '#ea580c',
    subLabel: '店家/餐飲名稱',
    defaultSubItems: ['八方雲集', '鬍鬚張便當', '星巴克會議咖啡', '麥當勞', '池上木片便當', '飲料手搖飲'],
    hasPeopleCount: true,
    defaultReceiptType: 'receipt',
    taxCategory: 'tax_exempt'
  },
  {
    id: 'fuel',
    name: '車輛油資',
    type: 'expense',
    icon: 'fuel',
    color: '#0284c7',
    subLabel: '加油站名稱',
    defaultSubItems: ['台灣中油 (直營)', '全國加油站', '台亞石油', '統一精工加油站', '高速公路休息站加油'],
    defaultReceiptType: 'invoice',
    taxCategory: 'deductible'
  },
  {
    id: 'advance',
    name: '員工預支',
    type: 'expense',
    icon: 'hand-coins',
    color: '#7c3aed',
    subLabel: '預支同仁姓名',
    defaultSubItems: ['王大明', '李小華', '張志明', '工程部外勤同仁', '臨時工班預支'],
    defaultReceiptType: 'receipt',
    taxCategory: 'tax_exempt'
  },
  {
    id: 'misc',
    name: '雜項開銷',
    type: 'expense',
    icon: 'package-check',
    color: '#475569',
    subLabel: '支出項目/用途',
    defaultSubItems: ['文具影印紙張', '辦公室衛生紙茶包', '郵寄掛號郵資', '五金清潔耗材', '拜拜水果供品'],
    defaultReceiptType: 'receipt',
    taxCategory: 'tax_exempt'
  },
  {
    id: 'transport',
    name: '交通出差',
    type: 'expense',
    icon: 'car',
    color: '#0d9488',
    subLabel: '交通項目/站名',
    defaultSubItems: ['高鐵車票', '台鐵火車票', '計程車資 (Uber/小黃)', '市區公車/捷運', '臨時停車費', 'ETC eTag 儲值'],
    defaultReceiptType: 'invoice',
    taxCategory: 'deductible'
  },
  {
    id: 'replenishment',
    name: '零用金撥補',
    type: 'income',
    icon: 'coins',
    color: '#059669',
    subLabel: '撥補來源 / 歸墊方式',
    defaultSubItems: ['銀行提領補充', '主管交付撥款', '會計請款核銷歸墊', '同仁預支款繳回', '零星收入 / 押金退還'],
    defaultReceiptType: 'none',
    taxCategory: 'tax_exempt'
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
      subAccountSourceName TEXT,
      companyId TEXT,
      netAmount REAL,
      taxAmount REAL,
      taxDeductible INTEGER DEFAULT 1,
      sellerTaxId TEXT
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
      defaultReceiptType TEXT,
      taxCategory TEXT,
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
      isNominalPettyCashHolder INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shortName TEXT,
      isIndividual INTEGER DEFAULT 0,
      taxId TEXT,
      representative TEXT,
      representativeMobile TEXT,
      secondaryRepresentative TEXT,
      phone1 TEXT,
      phone2 TEXT,
      fax TEXT,
      email TEXT,
      website TEXT,
      lineId TEXT,
      postalCode TEXT,
      address TEXT,
      shippingAddress TEXT,
      contacts TEXT NOT NULL,
      paymentTerm TEXT,
      bankName TEXT,
      bankBranch TEXT,
      bankAccount TEXT,
      accountName TEXT,
      businessItems TEXT,
      isCustomer INTEGER DEFAULT 1,
      isSupplier INTEGER DEFAULT 0,
      favoriteCompanyIds TEXT NOT NULL,
      events TEXT,
      note TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  // 欄位升級防護
  try { database.run(`ALTER TABLE transactions ADD COLUMN companyId TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN netAmount REAL`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN taxAmount REAL`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN taxDeductible INTEGER DEFAULT 1`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN sellerTaxId TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE categories ADD COLUMN defaultReceiptType TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE categories ADD COLUMN taxCategory TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN color TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN isDefault INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN isNominalPettyCashHolder INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN sortOrder INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE customers ADD COLUMN events TEXT`); } catch (e) {}

  // 既有交易自動補齊營業稅計算 (發票自動推算未稅與5%稅額，收據標為免稅/0稅額)
  try {
    database.run(`UPDATE transactions SET netAmount = ROUND(amount / 1.05), taxAmount = amount - ROUND(amount / 1.05), taxDeductible = 1 WHERE receiptType = 'invoice' AND (netAmount IS NULL OR netAmount = 0)`);
    database.run(`UPDATE transactions SET netAmount = amount, taxAmount = 0, taxDeductible = 0 WHERE (receiptType != 'invoice' OR receiptType IS NULL) AND (netAmount IS NULL OR netAmount = 0)`);
  } catch (e) {}

  // 既有科目自動補齊稅務與憑證預設
  try {
    database.run(`UPDATE categories SET defaultReceiptType = 'invoice', taxCategory = 'deductible' WHERE id IN ('fuel', 'transport') AND (defaultReceiptType IS NULL OR defaultReceiptType = '')`);
    database.run(`UPDATE categories SET defaultReceiptType = 'receipt', taxCategory = 'tax_exempt' WHERE id IN ('dining', 'advance', 'misc') AND (defaultReceiptType IS NULL OR defaultReceiptType = '')`);
    database.run(`UPDATE categories SET defaultReceiptType = 'none', taxCategory = 'tax_exempt' WHERE id = 'replenishment' AND (defaultReceiptType IS NULL OR defaultReceiptType = '')`);
  } catch (e) {}

  // 檢查既有行號主檔，並初始化 3 間關係企業（三社共用零用金專戶）
  const cpCountRes = database.exec('SELECT COUNT(*) AS cnt FROM company_profile');
  const cpCount = (cpCountRes[0]?.values[0]?.[0] as number) || 0;
  
  if (cpCount === 0) {
    DEFAULT_COMPANIES_SEED.forEach((cp) => {
      database.run(
        `INSERT INTO company_profile (
          id, name, shortName, taxId, representative, phone, fax, email, website,
          postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
          chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
          color, isDefault, isNominalPettyCashHolder, sortOrder, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cp.id, cp.name, cp.shortName || null, cp.taxId || null, cp.representative || null,
          cp.phone || null, cp.fax || null, cp.email || null, cp.website || null,
          cp.postalCode || null, cp.address || null, cp.bankName || null, cp.bankBranch || null,
          cp.bankCode || null, cp.bankAccount || null, cp.accountName || null,
          cp.chiefAccountant || null, cp.cashier || null, cp.reportHeader || null,
          cp.invoiceBuyerName || null, cp.taxInvoiceNote || null,
          cp.color || '#0066cc', cp.isDefault ? 1 : 0, cp.isNominalPettyCashHolder ? 1 : 0, cp.sortOrder || 1, cp.updatedAt
        ]
      );
    });
  } else if (cpCount === 1) {
    // 檢查現有唯一行號，補齊第二、第三間關係企業
    const defRes = database.exec(`SELECT * FROM company_profile LIMIT 1`);
    if (defRes && defRes.length > 0 && defRes[0].values.length > 0) {
      const curId = String(defRes[0].values[0][0] || 'comp_1');
      // 將第一家公司設為預設與法定掛名零用金公司
      database.run(`UPDATE company_profile SET isDefault = 1, isNominalPettyCashHolder = 1 WHERE id = ?`, [curId]);
      
      // 補上第二、第三家公司
      const otherSeeds = DEFAULT_COMPANIES_SEED.filter(c => c.id !== curId && c.id !== 'comp_1');
      otherSeeds.forEach((cp) => {
        database.run(
          `INSERT OR IGNORE INTO company_profile (
            id, name, shortName, taxId, representative, phone, fax, email, website,
            postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
            chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
            color, isDefault, isNominalPettyCashHolder, sortOrder, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cp.id, cp.name, cp.shortName || null, cp.taxId || null, cp.representative || null,
            cp.phone || null, cp.fax || null, cp.email || null, cp.website || null,
            cp.postalCode || null, cp.address || null, cp.bankName || null, cp.bankBranch || null,
            cp.bankCode || null, cp.bankAccount || null, cp.accountName || null,
            cp.chiefAccountant || null, cp.cashier || null, cp.reportHeader || null,
            cp.invoiceBuyerName || null, cp.taxInvoiceNote || null,
            cp.color || '#059669', 0, 0, cp.sortOrder || 2, cp.updatedAt
          ]
        );
      });
    }
  }

  // 系統升級與自動清理殘留的預設種子「宏揚」、「hongyang」與舊版暫存「第二關係企業」字眼
  try {
    database.run(`UPDATE company_profile SET reportHeader = name || ' 零用金收支月報表' WHERE reportHeader LIKE '%宏揚%' OR reportHeader LIKE '%第二關係企業%' OR reportHeader IS NULL`);
    database.run(`UPDATE company_profile SET accountName = name WHERE accountName LIKE '%宏揚%' OR accountName LIKE '%第二關係企業%'`);
    database.run(`UPDATE company_profile SET invoiceBuyerName = name WHERE invoiceBuyerName LIKE '%宏揚%' OR invoiceBuyerName LIKE '%第二關係企業%'`);
    database.run(`UPDATE company_profile SET email = NULL WHERE email LIKE '%hongyang%'`);
    database.run(`UPDATE company_profile SET website = NULL WHERE website LIKE '%hongyang%'`);
    // 確保有且僅有一家作為三社共用零用金之法定掛名主理公司
    const nomRes = database.exec(`SELECT COUNT(*) AS cnt FROM company_profile WHERE isNominalPettyCashHolder = 1`);
    if (!nomRes || !nomRes[0]?.values[0]?.[0]) {
      database.run(`UPDATE company_profile SET isNominalPettyCashHolder = 1 WHERE isDefault = 1 OR id = 'comp_1'`);
    }
  } catch (err) {
    console.warn('Residual seed cleanup notice:', err);
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

  // Seed default customers with realistic event/courtesy records if empty
  const customerCountRes = database.exec('SELECT COUNT(*) AS cnt FROM customers');
  const customerCount = (customerCountRes[0]?.values[0]?.[0] as number) || 0;
  if (customerCount === 0) {
    DEFAULT_CUSTOMERS_SEED.forEach((c) => {
      const now = Date.now();
      database.run(
        `INSERT INTO customers (
          id, name, shortName, isIndividual, taxId, representative, representativeMobile,
          secondaryRepresentative, phone1, phone2, fax, email, website, lineId,
          postalCode, address, shippingAddress, contacts, paymentTerm, bankName,
          bankBranch, bankAccount, accountName, businessItems, isCustomer, isSupplier,
          favoriteCompanyIds, events, note, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id,
          c.name,
          c.shortName || null,
          c.isIndividual ? 1 : 0,
          c.taxId || null,
          c.representative || null,
          c.representativeMobile || null,
          c.secondaryRepresentative || null,
          c.phone1 || null,
          c.phone2 || null,
          c.fax || null,
          c.email || null,
          c.website || null,
          c.lineId || null,
          c.postalCode || null,
          c.address || null,
          c.shippingAddress || null,
          JSON.stringify(c.contacts || []),
          c.paymentTerm || null,
          c.bankName || null,
          c.bankBranch || null,
          c.bankAccount || null,
          c.accountName || null,
          c.businessItems || null,
          c.isCustomer ? 1 : 0,
          c.isSupplier ? 1 : 0,
          JSON.stringify(c.favoriteCompanyIds || []),
          JSON.stringify(c.events || []),
          c.note || null,
          c.createdAt || now,
          c.updatedAt || now
        ]
      );
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
    const amt = Number(obj.amount);
    const isInv = obj.receiptType === 'invoice';
    const computedNet = isInv ? Math.round(amt / 1.05) : amt;
    const computedTax = isInv ? amt - computedNet : 0;

    return {
      id: obj.id,
      date: obj.date,
      type: obj.type,
      categoryId: obj.categoryId,
      categoryName: obj.categoryName,
      subItem: obj.subItem,
      claimant: obj.claimant || undefined,
      peopleCount: obj.peopleCount !== null && obj.peopleCount !== undefined ? Number(obj.peopleCount) : undefined,
      amount: amt,
      note: obj.note || '',
      createdAt: Number(obj.createdAt),
      receiptType: obj.receiptType || undefined,
      invoiceNumber: obj.invoiceNumber || undefined,
      voucherNo: obj.voucherNo || undefined,
      rawVoucherId: obj.rawVoucherId || undefined,
      subAccountSourceId: obj.subAccountSourceId || undefined,
      subAccountSourceName: obj.subAccountSourceName || undefined,
      companyId: obj.companyId ? String(obj.companyId) : 'comp_1',
      netAmount: obj.netAmount !== null && obj.netAmount !== undefined ? Number(obj.netAmount) : computedNet,
      taxAmount: obj.taxAmount !== null && obj.taxAmount !== undefined ? Number(obj.taxAmount) : computedTax,
      taxDeductible: obj.taxDeductible !== null && obj.taxDeductible !== undefined ? Boolean(obj.taxDeductible) : (isInv ? true : false),
      sellerTaxId: obj.sellerTaxId || undefined
    };
  });
}

export async function addTransaction(t: TransactionRow): Promise<void> {
  const database = await getDb();
  const amt = Number(t.amount) || 0;
  const isInv = t.receiptType === 'invoice';
  const computedNet = t.netAmount !== undefined ? t.netAmount : (isInv ? Math.round(amt / 1.05) : amt);
  const computedTax = t.taxAmount !== undefined ? t.taxAmount : (isInv ? amt - computedNet : 0);
  const isDeductible = t.taxDeductible !== undefined ? (t.taxDeductible ? 1 : 0) : (isInv ? 1 : 0);

  database.run(
    `INSERT OR REPLACE INTO transactions (
      id, date, type, categoryId, categoryName, subItem, claimant, peopleCount,
      amount, note, createdAt, receiptType, invoiceNumber, voucherNo, rawVoucherId,
      subAccountSourceId, subAccountSourceName, companyId,
      netAmount, taxAmount, taxDeductible, sellerTaxId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      t.date || new Date().toISOString().slice(0, 10),
      t.type || 'expense',
      t.categoryId || 'misc',
      t.categoryName || '雜支',
      t.subItem || '',
      t.claimant || null,
      t.peopleCount ?? null,
      amt,
      t.note || '',
      t.createdAt || Date.now(),
      t.receiptType || null,
      t.invoiceNumber || null,
      t.voucherNo || null,
      t.rawVoucherId || null,
      t.subAccountSourceId || null,
      t.subAccountSourceName || null,
      t.companyId || 'comp_1',
      computedNet,
      computedTax,
      isDeductible,
      t.sellerTaxId || null
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
    const amt = Number(t.amount) || 0;
    const isInv = t.receiptType === 'invoice';
    const computedNet = t.netAmount !== undefined ? t.netAmount : (isInv ? Math.round(amt / 1.05) : amt);
    const computedTax = t.taxAmount !== undefined ? t.taxAmount : (isInv ? amt - computedNet : 0);
    const isDeductible = t.taxDeductible !== undefined ? (t.taxDeductible ? 1 : 0) : (isInv ? 1 : 0);

    database.run(
      `INSERT INTO transactions (
        id, date, type, categoryId, categoryName, subItem, claimant, peopleCount,
        amount, note, createdAt, receiptType, invoiceNumber, voucherNo, rawVoucherId,
        subAccountSourceId, subAccountSourceName, companyId,
        netAmount, taxAmount, taxDeductible, sellerTaxId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        t.date || new Date().toISOString().slice(0, 10),
        t.type || 'expense',
        t.categoryId || 'misc',
        t.categoryName || '雜支',
        t.subItem || '',
        t.claimant || null,
        t.peopleCount ?? null,
        amt,
        t.note || '',
        t.createdAt || Date.now(),
        t.receiptType || null,
        t.invoiceNumber || null,
        t.voucherNo || null,
        t.rawVoucherId || null,
        t.subAccountSourceId || null,
        t.subAccountSourceName || null,
        t.companyId || 'comp_1',
        computedNet,
        computedTax,
        isDeductible,
        t.sellerTaxId || null
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
      hasPeopleCount: Boolean(obj.hasPeopleCount),
      defaultReceiptType: obj.defaultReceiptType || (obj.id === 'fuel' || obj.id === 'transport' ? 'invoice' : obj.id === 'replenishment' ? 'none' : 'receipt'),
      taxCategory: obj.taxCategory || (obj.id === 'fuel' || obj.id === 'transport' ? 'deductible' : 'tax_exempt')
    };
  });
}

export async function saveAllCategories(categories: CategoryConfigRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM categories`);
  categories.forEach((cat, idx) => {
    database.run(
      `INSERT INTO categories (id, name, type, icon, color, subLabel, defaultSubItems, hasPeopleCount, defaultReceiptType, taxCategory, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id,
        cat.name,
        cat.type,
        cat.icon,
        cat.color,
        cat.subLabel,
        JSON.stringify(cat.defaultSubItems || []),
        cat.hasPeopleCount ? 1 : 0,
        cat.defaultReceiptType || (cat.id === 'fuel' || cat.id === 'transport' ? 'invoice' : cat.id === 'replenishment' ? 'none' : 'receipt'),
        cat.taxCategory || (cat.id === 'fuel' || cat.id === 'transport' ? 'deductible' : 'tax_exempt'),
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
    isNominalPettyCashHolder: Boolean(obj.isNominalPettyCashHolder),
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
  if (profile.isNominalPettyCashHolder) {
    database.run(`UPDATE company_profile SET isNominalPettyCashHolder = 0 WHERE id != ?`, [profile.id]);
  }
  database.run(
    `INSERT OR REPLACE INTO company_profile (
      id, name, shortName, taxId, representative, phone, fax, email, website,
      postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
      chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
      color, isDefault, isNominalPettyCashHolder, sortOrder, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      profile.isNominalPettyCashHolder ? 1 : 0,
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

// -------------------------------------------------------------
// 客戶聯絡資訊 CRUD 模組 (資料庫操作)
// -------------------------------------------------------------

function mapRowToCustomer(row: any[], columns: string[]): CustomerRow {
  const obj: any = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });

  let contacts: CustomerContactPersonRow[] = [];
  try {
    if (obj.contacts) {
      contacts = JSON.parse(String(obj.contacts));
    }
  } catch (e) {
    contacts = [];
  }

  let favoriteCompanyIds: string[] = [];
  try {
    if (obj.favoriteCompanyIds) {
      favoriteCompanyIds = JSON.parse(String(obj.favoriteCompanyIds));
    }
  } catch (e) {
    favoriteCompanyIds = [];
  }

  let events: CustomerEventRecordRow[] = [];
  try {
    if (obj.events) {
      events = JSON.parse(String(obj.events));
    }
  } catch (e) {
    events = [];
  }

  return {
    id: String(obj.id),
    name: String(obj.name || ''),
    shortName: obj.shortName ? String(obj.shortName) : undefined,
    isIndividual: Boolean(obj.isIndividual),
    taxId: obj.taxId ? String(obj.taxId) : undefined,
    representative: obj.representative ? String(obj.representative) : undefined,
    representativeMobile: obj.representativeMobile ? String(obj.representativeMobile) : undefined,
    secondaryRepresentative: obj.secondaryRepresentative ? String(obj.secondaryRepresentative) : undefined,
    phone1: obj.phone1 ? String(obj.phone1) : undefined,
    phone2: obj.phone2 ? String(obj.phone2) : undefined,
    fax: obj.fax ? String(obj.fax) : undefined,
    email: obj.email ? String(obj.email) : undefined,
    website: obj.website ? String(obj.website) : undefined,
    lineId: obj.lineId ? String(obj.lineId) : undefined,
    postalCode: obj.postalCode ? String(obj.postalCode) : undefined,
    address: obj.address ? String(obj.address) : undefined,
    shippingAddress: obj.shippingAddress ? String(obj.shippingAddress) : undefined,
    contacts,
    paymentTerm: obj.paymentTerm ? String(obj.paymentTerm) : undefined,
    bankName: obj.bankName ? String(obj.bankName) : undefined,
    bankBranch: obj.bankBranch ? String(obj.bankBranch) : undefined,
    bankAccount: obj.bankAccount ? String(obj.bankAccount) : undefined,
    accountName: obj.accountName ? String(obj.accountName) : undefined,
    businessItems: obj.businessItems ? String(obj.businessItems) : undefined,
    isCustomer: obj.isCustomer !== undefined ? Boolean(obj.isCustomer) : true,
    isSupplier: Boolean(obj.isSupplier),
    favoriteCompanyIds,
    events,
    note: obj.note ? String(obj.note) : undefined,
    createdAt: Number(obj.createdAt || Date.now()),
    updatedAt: Number(obj.updatedAt || Date.now())
  };
}

export async function getAllCustomers(): Promise<CustomerRow[]> {
  const database = await getDb();
  const res = database.exec(`SELECT * FROM customers ORDER BY createdAt DESC`);
  if (!res || res.length === 0 || !res[0].values.length) {
    return [];
  }
  const columns = res[0].columns;
  return res[0].values.map((row) => mapRowToCustomer(row, columns));
}

export async function addCustomer(c: CustomerRow): Promise<void> {
  const database = await getDb();
  const now = Date.now();
  database.run(
    `INSERT INTO customers (
      id, name, shortName, isIndividual, taxId, representative, representativeMobile,
      secondaryRepresentative, phone1, phone2, fax, email, website, lineId,
      postalCode, address, shippingAddress, contacts, paymentTerm, bankName,
      bankBranch, bankAccount, accountName, businessItems, isCustomer, isSupplier,
      favoriteCompanyIds, events, note, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.id,
      c.name,
      c.shortName || null,
      c.isIndividual ? 1 : 0,
      c.taxId || null,
      c.representative || null,
      c.representativeMobile || null,
      c.secondaryRepresentative || null,
      c.phone1 || null,
      c.phone2 || null,
      c.fax || null,
      c.email || null,
      c.website || null,
      c.lineId || null,
      c.postalCode || null,
      c.address || null,
      c.shippingAddress || null,
      JSON.stringify(c.contacts || []),
      c.paymentTerm || null,
      c.bankName || null,
      c.bankBranch || null,
      c.bankAccount || null,
      c.accountName || null,
      c.businessItems || null,
      c.isCustomer ? 1 : 0,
      c.isSupplier ? 1 : 0,
      JSON.stringify(c.favoriteCompanyIds || []),
      JSON.stringify(c.events || []),
      c.note || null,
      c.createdAt || now,
      c.updatedAt || now
    ]
  );
  persist();
}

export async function updateCustomer(c: CustomerRow): Promise<void> {
  const database = await getDb();
  const now = Date.now();
  database.run(
    `UPDATE customers SET
      name = ?, shortName = ?, isIndividual = ?, taxId = ?, representative = ?,
      representativeMobile = ?, secondaryRepresentative = ?, phone1 = ?, phone2 = ?,
      fax = ?, email = ?, website = ?, lineId = ?, postalCode = ?, address = ?,
      shippingAddress = ?, contacts = ?, paymentTerm = ?, bankName = ?, bankBranch = ?,
      bankAccount = ?, accountName = ?, businessItems = ?, isCustomer = ?, isSupplier = ?,
      favoriteCompanyIds = ?, events = ?, note = ?, updatedAt = ?
    WHERE id = ?`,
    [
      c.name,
      c.shortName || null,
      c.isIndividual ? 1 : 0,
      c.taxId || null,
      c.representative || null,
      c.representativeMobile || null,
      c.secondaryRepresentative || null,
      c.phone1 || null,
      c.phone2 || null,
      c.fax || null,
      c.email || null,
      c.website || null,
      c.lineId || null,
      c.postalCode || null,
      c.address || null,
      c.shippingAddress || null,
      JSON.stringify(c.contacts || []),
      c.paymentTerm || null,
      c.bankName || null,
      c.bankBranch || null,
      c.bankAccount || null,
      c.accountName || null,
      c.businessItems || null,
      c.isCustomer ? 1 : 0,
      c.isSupplier ? 1 : 0,
      JSON.stringify(c.favoriteCompanyIds || []),
      JSON.stringify(c.events || []),
      c.note || null,
      now,
      c.id
    ]
  );
  persist();
}

export async function deleteCustomer(id: string): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM customers WHERE id = ?`, [id]);
  persist();
}

export async function replaceAllCustomers(customers: CustomerRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM customers`);
  for (const c of customers) {
    await addCustomer(c);
  }
  persist();
}

// 匯出完整全庫 JSON 格式物件（包含全歷史流水帳、公司主檔、客戶通訊、專款子帳與所有自訂項目，並動態抓取未來新增的自訂資料表）
export async function getFullDatabaseJsonExport(): Promise<Record<string, any>> {
  const database = await getDb();
  persist();

  // 1. 取得標準核心結構
  const transactions = await getAllTransactions();
  const categories = await getAllCategories();
  const claimants = await getAllClaimants();
  const budgets = await getAllBudgets();
  const subAccounts = await getAllSubAccounts();
  const directorWithdrawals = await getAllDirectorWithdrawals();
  const companies = await getAllCompanyProfiles();
  const defaultCompany = await getCompanyProfile();
  const customers = await getAllCustomers();

  // 2. 動態檢視 sqlite_master 抓取未來新模組動到的所有資料表內容
  const allTablesRes = database.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
  const extraTables: Record<string, any[]> = {};
  const coreTableSet = new Set([
    'transactions', 'categories', 'claimants', 'budgets',
    'sub_accounts', 'director_withdrawals', 'company_profile', 'customers'
  ]);

  if (allTablesRes && allTablesRes.length > 0 && allTablesRes[0].values.length > 0) {
    for (const [tName] of allTablesRes[0].values) {
      const tableName = String(tName);
      if (!coreTableSet.has(tableName)) {
        const rowsRes = database.exec(`SELECT * FROM "${tableName}"`);
        if (rowsRes && rowsRes.length > 0) {
          const cols = rowsRes[0].columns;
          extraTables[tableName] = rowsRes[0].values.map((row) => {
            const obj: Record<string, any> = {};
            cols.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        } else {
          extraTables[tableName] = [];
        }
      }
    }
  }

  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    system: '企業零用金與客戶財務管理系統',
    transactions,
    categories,
    claimants,
    budgets,
    subAccounts,
    directorWithdrawals,
    companies,
    companyProfile: defaultCompany,
    customers,
    extraTables
  };
}

// 載入外部傳入的全新 SQLite 二進位檔案（用於使用者自備檔案還原或攜帶換機）
export async function replaceWithDatabaseBinary(fileBuffer: Uint8Array): Promise<void> {
  if (!fileBuffer || fileBuffer.length < 16) {
    throw new Error('檔案過小，並非有效的 SQLite 資料庫檔案');
  }
  // 檢驗 SQLite 檔案標頭，防止傳入非 SQLite 檔案導致 WASM 拋出 raw exception
  const header = Buffer.from(fileBuffer.buffer, fileBuffer.byteOffset, 16).toString('ascii');
  if (!header.startsWith('SQLite format 3')) {
    throw new Error('所提供的二進位資料並非有效的 SQLite 3 資料庫格式（缺少 SQLite format 3 識別標頭）');
  }
  if (!SQL) {
    SQL = await initSqlJs();
  }
  const newDb = new SQL.Database(fileBuffer);
  initSchema(newDb);
  db = newDb;
  persist();
}

// 匯出包含完整資料庫結構與所有資料列的標準 SQL 文字備份檔 (.sql) - 動態涵蓋目前與未來所有新增資料表
export async function generateSqlDump(): Promise<string> {
  const database = await getDb();
  persist();

  // 優先依外鍵關聯順序排列核心資料表，並動態抓取資料庫中所有現存資料表
  const preferredOrder = [
    'company_profile',
    'customers',
    'categories',
    'claimants',
    'budgets',
    'sub_accounts',
    'director_withdrawals',
    'transactions'
  ];

  const allTablesRes = database.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
  const existingTables = new Set<string>();
  if (allTablesRes && allTablesRes.length > 0 && allTablesRes[0].values.length > 0) {
    for (const [tName] of allTablesRes[0].values) {
      existingTables.add(String(tName));
    }
  }

  const tables: string[] = [];
  for (const t of preferredOrder) {
    if (existingTables.has(t)) {
      tables.push(t);
      existingTables.delete(t);
    }
  }
  // 未來新模組新增的任何資料表亦全數納入備份
  for (const remainingTable of existingTables) {
    tables.push(remainingTable);
  }

  let sql = `-- ==================================================================\n`;
  sql += `-- 企業零用金與客戶財務管理系統 - SQLite 完整資料庫 SQL 語法備份檔 (.sql)\n`;
  sql += `-- 匯出時間: ${new Date().toISOString()} (${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })})\n`;
  sql += `-- 備份內容: 100% 完整收錄全資料庫（包含客戶通訊、零用金流水帳、公司設定及所有未來新增模組）\n`;
  sql += `-- 包含資料表 (${tables.length} 個): ${tables.join(', ')}\n`;
  sql += `-- 適用環境: 換機一鍵還原、本機離線保存、DBeaver / Navicat / SQLite Studio 工具直接檢視\n`;
  sql += `-- ==================================================================\n\n`;
  sql += `PRAGMA foreign_keys = OFF;\n`;
  sql += `BEGIN TRANSACTION;\n\n`;

  for (const tableName of tables) {
    const schemaRes = database.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}';`);
    if (!schemaRes || !schemaRes.length || !schemaRes[0].values.length) continue;
    const createTableSql = schemaRes[0].values[0][0];

    sql += `-- ------------------------------------------------------------------\n`;
    sql += `-- 資料表結構: ${tableName}\n`;
    sql += `-- ------------------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS "${tableName}";\n`;
    sql += `${createTableSql};\n\n`;

    const rowsRes = database.exec(`SELECT * FROM "${tableName}";`);
    if (rowsRes && rowsRes.length && rowsRes[0].values.length) {
      const columns = rowsRes[0].columns;
      const colList = columns.map(c => `"${c}"`).join(', ');

      sql += `-- 匯入資料: ${tableName} (共 ${rowsRes[0].values.length} 筆紀錄)\n`;
      for (const row of rowsRes[0].values) {
        const valList = row.map((val) => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          const str = String(val).replace(/'/g, "''");
          return `'${str}'`;
        }).join(', ');
        sql += `INSERT INTO "${tableName}" (${colList}) VALUES (${valList});\n`;
      }
      sql += `\n`;
    }
  }

  sql += `COMMIT;\n`;
  return sql;
}

