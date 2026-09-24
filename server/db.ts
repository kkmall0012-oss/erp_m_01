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
  accountingCategory?: 'official_tax' | 'internal_management';
  taxType?: 'taxable' | 'tax_free' | 'receipt_pool' | 'unspecified';
  isConfidential?: boolean;
}

export interface MonthBudgetRow {
  yearMonth: string;
  budgetAmount: number;
  alertThresholdPercent: number;
}

export interface SubAccountItemRow {
  id: string;
  subAccountId?: string;
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

export interface CompanyPhoneEntryRow {
  id: string;
  companyId?: string;
  type: 'phone' | 'fax' | 'mobile' | 'other';
  number: string;
  label?: string;
  isDefault?: boolean;
  sortOrder?: number;
  createdAt?: number;
}

export interface CompanyBankAccountRow {
  id: string;
  companyId?: string;
  bankName: string;
  bankBranch?: string;
  bankCode?: string;
  branchCode?: string;
  bankAccount: string;
  accountName: string;
  accountType?: 'operating' | 'payroll' | 'petty_cash' | 'savings' | 'other';
  isDefault?: boolean;
  isConfidential?: boolean;
  isPrivateAccount?: boolean;
  note?: string;
  sortOrder?: number;
  createdAt?: number;
}

export interface CompanyProfileRow {
  id: string;
  name: string;
  shortName?: string;
  taxId?: string;
  representative?: string;
  entityType?: 'corporate' | 'individual';
  isJointHeader?: boolean;
  isConfidential?: boolean;
  phone?: string;
  fax?: string;
  phones?: CompanyPhoneEntryRow[];
  bankAccounts?: CompanyBankAccountRow[];
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
  customerId?: string;
  name: string;
  title?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  lineId?: string;
  note?: string;
  sortOrder?: number;
}

export interface CustomerEventRecordRow {
  id: string;
  customerId?: string;
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
  linkedTransactionId?: string;
  companyId?: string;
  proofNote?: string;
  note?: string;
  createdAt: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  shortName?: string;
  isIndividual: boolean;
  customerCategory?: string; // 客戶分類屬性 (如：個人客戶、店家/門市行號、公司企業法人、政府機關)
  supplierCategory?: string; // 廠商業務分類 (如：瀝青建材、工程工班、機具租賃、五金水電、運輸物流等)
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
    entityType: 'corporate',
    isJointHeader: true,
    isConfidential: false,
    phone: '05-5973882',
    fax: '05-5964269',
    phones: [
      { id: 'comp_1_p1', companyId: 'comp_1', type: 'phone', number: '05-5973882', label: '公司代表號', isDefault: true, sortOrder: 1 },
      { id: 'comp_1_p2', companyId: 'comp_1', type: 'fax', number: '05-5964269', label: '傳真專線', isDefault: true, sortOrder: 2 }
    ],
    bankAccounts: [
      {
        id: 'comp_1_b1',
        companyId: 'comp_1',
        bankName: '臺灣銀行',
        bankBranch: '斗南分行',
        bankCode: '004',
        bankAccount: '004-012-3456789',
        accountName: '田頭工程有限公司',
        accountType: 'operating',
        isDefault: true,
        isConfidential: false,
        isPrivateAccount: false,
        note: '主要營運與對外請款扣款帳戶',
        sortOrder: 1
      },
      {
        id: 'comp_1_b2',
        companyId: 'comp_1',
        bankName: '玉山銀行',
        bankBranch: '斗六分行',
        bankCode: '808',
        bankAccount: '808-036-9876543',
        accountName: '田頭工程有限公司',
        accountType: 'petty_cash',
        isDefault: false,
        isConfidential: false,
        isPrivateAccount: false,
        note: '零用金定期定額撥補與員工薪資轉帳帳戶',
        sortOrder: 2
      }
    ],
    email: 'v23039@yahoo.com.tw',
    website: '',
    postalCode: '630',
    address: '雲林縣斗南鎮田頭里田南一路53號',
    bankName: '臺灣銀行',
    bankBranch: '斗南分行',
    bankCode: '004',
    bankAccount: '004-012-3456789',
    accountName: '田頭工程有限公司',
    chiefAccountant: '林會計',
    cashier: '張出納',
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
    entityType: 'corporate',
    isJointHeader: true,
    isConfidential: false,
    phone: '05-5973882',
    fax: '05-5964269',
    phones: [
      { id: 'comp_2_p1', companyId: 'comp_2', type: 'phone', number: '05-5973882', label: '辦公室市話', isDefault: true, sortOrder: 1 },
      { id: 'comp_2_p2', companyId: 'comp_2', type: 'fax', number: '05-5964269', label: '傳真號碼', isDefault: true, sortOrder: 2 }
    ],
    bankAccounts: [
      {
        id: 'comp_2_b1',
        companyId: 'comp_2',
        bankName: '臺灣銀行',
        bankBranch: '斗南分行',
        bankCode: '004',
        bankAccount: '004-055-1234567',
        accountName: '田頭工業有限公司',
        accountType: 'operating',
        isDefault: true,
        isConfidential: false,
        isPrivateAccount: false,
        note: '田頭工業主要營運帳戶',
        sortOrder: 1
      }
    ],
    email: 'v23039@yahoo.com.tw',
    website: '',
    postalCode: '630',
    address: '雲林縣斗南鎮田頭里田南一路53號',
    bankName: '臺灣銀行',
    bankBranch: '斗南分行',
    bankCode: '004',
    bankAccount: '004-055-1234567',
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
    name: '田頭工業社',
    shortName: '工業社',
    taxId: '97605960',
    representative: '李永勝',
    entityType: 'corporate',
    isJointHeader: true,
    isConfidential: false,
    phone: '05-5973882',
    fax: '05-5964269',
    phones: [
      { id: 'comp_3_p1', companyId: 'comp_3', type: 'phone', number: '05-5973882', label: '代表號', isDefault: true, sortOrder: 1 }
    ],
    bankAccounts: [
      {
        id: 'comp_3_b1',
        companyId: 'comp_3',
        bankName: '合作金庫銀行',
        bankBranch: '斗南分行',
        bankCode: '006',
        bankAccount: '006-088-7654321',
        accountName: '田頭工業社',
        accountType: 'operating',
        isDefault: true,
        isConfidential: false,
        isPrivateAccount: false,
        note: '商行經常收支帳戶',
        sortOrder: 1
      }
    ],
    email: 'v23039@yahoo.com.tw',
    website: '',
    postalCode: '630',
    address: '雲林縣斗南鎮田頭里田南一路53號',
    bankName: '合作金庫銀行',
    bankBranch: '斗南分行',
    bankCode: '006',
    bankAccount: '006-088-7654321',
    accountName: '田頭工業社',
    chiefAccountant: '會計',
    cashier: '出納',
    reportHeader: '田頭工業社 現金收支帳簿',
    invoiceBuyerName: '田頭工業社',
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
    customerCategory: '公司企業法人',
    supplierCategory: '工程發包 / 現場工班',
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
    customerCategory: '店家 / 門市行號',
    supplierCategory: '五金材料 / 水電設備',
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
  },
  {
    id: 'cust_seed_3',
    name: '張美惠 (自用住宅庭院改造案)',
    shortName: '張美惠小姐',
    isIndividual: true,
    customerCategory: '個人客戶',
    representative: '張美惠',
    representativeMobile: '0918-765-432',
    phone1: '02-8660-1234',
    postalCode: '234',
    address: '新北市永和區環河西路一段88號',
    contacts: [
      { id: 'cnt_3_1', name: '張美惠', title: '屋主本人', mobile: '0918-765-432', note: '平日白天上班，傍晚聯繫' }
    ],
    paymentTerm: '現金 / 貨到付款',
    businessItems: '自用別墅車庫與庭院AC瀝青鋪面、排水側溝整地',
    isCustomer: true,
    isSupplier: false,
    favoriteCompanyIds: ['comp_1'],
    note: '優質個人客戶，款項驗收即付現，轉介多位社區鄰居',
    createdAt: Date.now() - 3600000 * 24 * 15,
    updatedAt: Date.now()
  },
  {
    id: 'cust_seed_4',
    name: '三興瀝青柏油實業股份有限公司',
    shortName: '三興瀝青',
    isIndividual: false,
    taxId: '84561234',
    representative: '王興發',
    representativeMobile: '0932-888-999',
    phone1: '03-386-7788',
    postalCode: '337',
    address: '桃園市大園區中正東路三段500號',
    contacts: [
      { id: 'cnt_4_1', name: '陳調度', title: '出料總調度', mobile: '0935-123-789', note: '叫熱料、壓實度配比叫料專線' },
      { id: 'cnt_4_2', name: '王興發', title: '總經理', mobile: '0932-888-999' }
    ],
    paymentTerm: '銀行匯款 (次月 25 號電匯)',
    bankName: '臺灣土地銀行 大園分行',
    bankBranch: '大園分行',
    bankAccount: '005-098-7654321',
    accountName: '三興瀝青柏油實業股份有限公司',
    businessItems: '熱拌瀝青混凝土、再生瀝青、乳化瀝青、粗細骨材',
    customerCategory: '公司企業法人',
    supplierCategory: '瀝青砂石 / 建材原料',
    isCustomer: false,
    isSupplier: true,
    favoriteCompanyIds: ['comp_1', 'comp_2', 'comp_3'],
    note: '大型熱料拌合廠，全天候供應，附出廠檢驗合格品質報告',
    createdAt: Date.now() - 3600000 * 24 * 45,
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
    id: 'courtesy',
    name: '交際禮金 / 公關應酬',
    type: 'expense',
    icon: 'heart-handshake',
    color: '#e11d48',
    subLabel: '交際對象 / 項目',
    defaultSubItems: [
      '婚喪喜慶紅白包 (喜事賀禮/喪事奠儀)',
      '年節公關禮盒 (中秋月餅/端午禮品/春節伴手禮)',
      '業務拜訪禮品/伴手禮',
      '開工動土/喬遷誌慶花籃',
      '地方宮廟活動/睦鄰贊助款',
      '同業公會/商會贊助費',
      '客戶/廠商餐敘招待'
    ],
    defaultReceiptType: 'receipt',
    taxCategory: 'non_deductible'
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
      sellerTaxId TEXT,
      accountingCategory TEXT DEFAULT 'official_tax',
      taxType TEXT DEFAULT 'taxable',
      isConfidential INTEGER DEFAULT 0
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
      entityType TEXT DEFAULT 'corporate',
      isJointHeader INTEGER DEFAULT 1,
      isConfidential INTEGER DEFAULT 0,
      isDefault INTEGER DEFAULT 0,
      isNominalPettyCashHolder INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_phones (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      type TEXT NOT NULL,
      number TEXT NOT NULL,
      label TEXT,
      isDefault INTEGER DEFAULT 0,
      sortOrder INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (companyId) REFERENCES company_profile(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_company_phones_companyId ON company_phones(companyId);

    CREATE TABLE IF NOT EXISTS company_bank_accounts (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      bankName TEXT NOT NULL,
      bankBranch TEXT,
      bankCode TEXT,
      branchCode TEXT,
      bankAccount TEXT NOT NULL,
      accountName TEXT NOT NULL,
      accountType TEXT,
      isDefault INTEGER DEFAULT 0,
      isConfidential INTEGER DEFAULT 0,
      isPrivateAccount INTEGER DEFAULT 0,
      note TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (companyId) REFERENCES company_profile(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_companyId ON company_bank_accounts(companyId);

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
      customerCategory TEXT,
      supplierCategory TEXT,
      isCustomer INTEGER DEFAULT 1,
      isSupplier INTEGER DEFAULT 0,
      favoriteCompanyIds TEXT NOT NULL,
      events TEXT,
      note TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_contacts (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      mobile TEXT,
      phone TEXT,
      email TEXT,
      lineId TEXT,
      note TEXT,
      sortOrder INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customer_events (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      categoryLabel TEXT,
      title TEXT NOT NULL,
      eventType TEXT,
      hasAmount INTEGER DEFAULT 0,
      amount REAL DEFAULT 0,
      direction TEXT DEFAULT 'outgoing',
      targetPerson TEXT,
      ourRepresentative TEXT,
      isPettyCashLinked INTEGER DEFAULT 0,
      voucherNo TEXT,
      linkedTransactionId TEXT,
      companyId TEXT,
      proofNote TEXT,
      note TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sub_account_items (
      id TEXT PRIMARY KEY,
      subAccountId TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      categoryId TEXT,
      categoryName TEXT,
      subItem TEXT,
      amount REAL NOT NULL,
      receiptType TEXT,
      invoiceNumber TEXT,
      claimant TEXT,
      note TEXT,
      createdAt INTEGER NOT NULL,
      isImportedToGeneral INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_customerId ON customer_contacts(customerId);
    CREATE INDEX IF NOT EXISTS idx_events_customerId ON customer_events(customerId);
    CREATE INDEX IF NOT EXISTS idx_events_linkedTx ON customer_events(linkedTransactionId);
    CREATE INDEX IF NOT EXISTS idx_sub_items_subAccountId ON sub_account_items(subAccountId);
  `);

  // 欄位升級防護
  try { database.run(`ALTER TABLE transactions ADD COLUMN companyId TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN netAmount REAL`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN taxAmount REAL`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN taxDeductible INTEGER DEFAULT 1`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN sellerTaxId TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN accountingCategory TEXT DEFAULT 'official_tax'`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN taxType TEXT DEFAULT 'taxable'`); } catch (e) {}
  try { database.run(`ALTER TABLE transactions ADD COLUMN isConfidential INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE categories ADD COLUMN defaultReceiptType TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE categories ADD COLUMN taxCategory TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN color TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN entityType TEXT DEFAULT 'corporate'`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN isJointHeader INTEGER DEFAULT 1`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN isConfidential INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN isDefault INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN isNominalPettyCashHolder INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_profile ADD COLUMN sortOrder INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_bank_accounts ADD COLUMN isConfidential INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE company_bank_accounts ADD COLUMN isPrivateAccount INTEGER DEFAULT 0`); } catch (e) {}
  try { database.run(`ALTER TABLE customers ADD COLUMN events TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE customers ADD COLUMN customerCategory TEXT`); } catch (e) {}
  try { database.run(`ALTER TABLE customers ADD COLUMN supplierCategory TEXT`); } catch (e) {}

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
          color, entityType, isJointHeader, isConfidential, isDefault, isNominalPettyCashHolder, sortOrder, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cp.id, cp.name, cp.shortName || null, cp.taxId || null, cp.representative || null,
          cp.phone || null, cp.fax || null, cp.email || null, cp.website || null,
          cp.postalCode || null, cp.address || null, cp.bankName || null, cp.bankBranch || null,
          cp.bankCode || null, cp.bankAccount || null, cp.accountName || null,
          cp.chiefAccountant || null, cp.cashier || null, cp.reportHeader || null,
          cp.invoiceBuyerName || null, cp.taxInvoiceNote || null,
          cp.color || '#0066cc', cp.entityType || 'corporate', cp.isJointHeader ? 1 : 0, cp.isConfidential ? 1 : 0,
          cp.isDefault ? 1 : 0, cp.isNominalPettyCashHolder ? 1 : 0, cp.sortOrder || 1, cp.updatedAt
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
            color, entityType, isJointHeader, isConfidential, isDefault, isNominalPettyCashHolder, sortOrder, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cp.id, cp.name, cp.shortName || null, cp.taxId || null, cp.representative || null,
            cp.phone || null, cp.fax || null, cp.email || null, cp.website || null,
            cp.postalCode || null, cp.address || null, cp.bankName || null, cp.bankBranch || null,
            cp.bankCode || null, cp.bankAccount || null, cp.accountName || null,
            cp.chiefAccountant || null, cp.cashier || null, cp.reportHeader || null,
            cp.invoiceBuyerName || null, cp.taxInvoiceNote || null,
            cp.color || '#059669', cp.entityType || 'corporate', cp.isJointHeader ? 1 : 0, cp.isConfidential ? 1 : 0,
            0, 0, cp.sortOrder || 2, cp.updatedAt
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

  // 檢查並建立/遷移 company_phones
  try {
    const phoneCountRes = database.exec('SELECT COUNT(*) AS cnt FROM company_phones');
    const phoneCount = (phoneCountRes[0]?.values[0]?.[0] as number) || 0;
    if (phoneCount === 0) {
      DEFAULT_COMPANIES_SEED.forEach((cp) => {
        if (Array.isArray(cp.phones)) {
          cp.phones.forEach((ph, pIdx) => {
            database.run(
              `INSERT OR IGNORE INTO company_phones (
                id, companyId, type, number, label, isDefault, sortOrder, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                ph.id || `${cp.id}_p_${pIdx + 1}`,
                cp.id,
                ph.type || 'phone',
                ph.number,
                ph.label || '電話號碼',
                ph.isDefault ? 1 : 0,
                ph.sortOrder || pIdx + 1,
                Date.now()
              ]
            );
          });
        }
      });
      const cpRes = database.exec(`SELECT id, phone, fax FROM company_profile`);
      if (cpRes && cpRes.length > 0 && cpRes[0].values.length > 0) {
        cpRes[0].values.forEach(([cId, ph, fx]) => {
          const companyId = String(cId);
          const hasExisting = database.exec(`SELECT COUNT(*) FROM company_phones WHERE companyId = '${companyId.replace(/'/g, "''")}'`);
          if (!hasExisting || !hasExisting[0]?.values[0]?.[0]) {
            let sOrder = 1;
            if (ph && String(ph).trim()) {
              database.run(
                `INSERT INTO company_phones (id, companyId, type, number, label, isDefault, sortOrder, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [`${companyId}_ph_1`, companyId, 'phone', String(ph).trim(), '公司代表號', 1, sOrder++, Date.now()]
              );
            }
            if (fx && String(fx).trim()) {
              database.run(
                `INSERT INTO company_phones (id, companyId, type, number, label, isDefault, sortOrder, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [`${companyId}_fx_1`, companyId, 'fax', String(fx).trim(), '傳真專線', 1, sOrder++, Date.now()]
              );
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('company_phones migration notice:', err);
  }

  // 檢查並建立/遷移 company_bank_accounts
  try {
    const bankCountRes = database.exec('SELECT COUNT(*) AS cnt FROM company_bank_accounts');
    const bankCount = (bankCountRes[0]?.values[0]?.[0] as number) || 0;
    if (bankCount === 0) {
      DEFAULT_COMPANIES_SEED.forEach((cp) => {
        if (Array.isArray(cp.bankAccounts)) {
          cp.bankAccounts.forEach((bAcc, bIdx) => {
            database.run(
              `INSERT OR IGNORE INTO company_bank_accounts (
                id, companyId, bankName, bankBranch, bankCode, branchCode, bankAccount, accountName, accountType, isDefault, note, sortOrder, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                bAcc.id || `${cp.id}_b_${bIdx + 1}`,
                cp.id,
                bAcc.bankName || '臺灣銀行',
                bAcc.bankBranch || null,
                bAcc.bankCode || null,
                bAcc.branchCode || null,
                bAcc.bankAccount || '',
                bAcc.accountName || cp.name,
                bAcc.accountType || 'operating',
                bAcc.isDefault ? 1 : 0,
                bAcc.note || null,
                bAcc.sortOrder || bIdx + 1,
                Date.now()
              ]
            );
          });
        }
      });
      const cpRes = database.exec(`SELECT id, bankName, bankBranch, bankCode, bankAccount, accountName, name FROM company_profile`);
      if (cpRes && cpRes.length > 0 && cpRes[0].values.length > 0) {
        cpRes[0].values.forEach(([cId, bName, bBranch, bCode, bAcc, accName, cName]) => {
          const companyId = String(cId);
          const hasExisting = database.exec(`SELECT COUNT(*) FROM company_bank_accounts WHERE companyId = '${companyId.replace(/'/g, "''")}'`);
          if (!hasExisting || !hasExisting[0]?.values[0]?.[0]) {
            if ((bName && String(bName).trim()) || (bAcc && String(bAcc).trim())) {
              database.run(
                `INSERT INTO company_bank_accounts (
                  id, companyId, bankName, bankBranch, bankCode, branchCode, bankAccount, accountName, accountType, isDefault, note, sortOrder, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  `${companyId}_bk_1`,
                  companyId,
                  bName ? String(bName).trim() : '臺灣銀行',
                  bBranch ? String(bBranch).trim() : null,
                  bCode ? String(bCode).trim() : null,
                  null,
                  bAcc ? String(bAcc).trim() : '',
                  accName ? String(accName).trim() : String(cName || ''),
                  'operating',
                  1,
                  '主要往來扣款帳戶',
                  1,
                  Date.now()
                ]
              );
            }
          }
        });
      }
    }
  } catch (err) {
    console.warn('company_bank_accounts migration notice:', err);
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

  // 自動升級保證：確保資料庫中必定包含「交際禮金 / 公關應酬」支出大類
  try {
    const courtesyRes = database.exec("SELECT COUNT(*) AS cnt FROM categories WHERE id = 'courtesy' OR name LIKE '%禮金%' OR name LIKE '%交際%'");
    const courtesyCount = (courtesyRes[0]?.values[0]?.[0] as number) || 0;
    if (courtesyCount === 0) {
      database.run(
        `INSERT INTO categories (id, name, type, icon, color, subLabel, defaultSubItems, hasPeopleCount, defaultReceiptType, taxCategory, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'courtesy',
          '交際禮金 / 公關應酬',
          'expense',
          'heart-handshake',
          '#e11d48',
          '交際對象 / 項目',
          JSON.stringify([
            '婚喪喜慶紅白包 (喜事賀禮/喪事奠儀)',
            '年節公關禮盒 (中秋月餅/端午禮品/春節伴手禮)',
            '業務拜訪禮品/伴手禮',
            '開工動土/喬遷誌慶花籃',
            '地方宮廟活動/睦鄰贊助款',
            '同業公會/商會贊助費',
            '客戶/廠商餐敘招待'
          ]),
          0,
          'receipt',
          'non_deductible',
          6
        ]
      );
    }
  } catch (err) {
    console.warn('courtesy category migration check notice:', err);
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

      // Seed customer_contacts
      if (Array.isArray(c.contacts)) {
        c.contacts.forEach((contact, idx) => {
          database.run(
            `INSERT OR IGNORE INTO customer_contacts (
              id, customerId, name, title, mobile, phone, email, lineId, note, sortOrder
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              contact.id || `contact_${c.id}_${idx}`,
              c.id,
              contact.name,
              contact.title || null,
              contact.mobile || null,
              contact.phone || null,
              contact.email || null,
              contact.lineId || null,
              contact.note || null,
              idx
            ]
          );
        });
      }

      // Seed customer_events
      if (Array.isArray(c.events)) {
        c.events.forEach((ev) => {
          database.run(
            `INSERT OR IGNORE INTO customer_events (
              id, customerId, date, category, categoryLabel, title, eventType,
              hasAmount, amount, direction, targetPerson, ourRepresentative,
              isPettyCashLinked, voucherNo, linkedTransactionId, companyId, proofNote, note, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ev.id || `ev_${c.id}_${Math.random().toString(36).slice(2, 6)}`,
              c.id,
              ev.date || new Date().toISOString().slice(0, 10),
              ev.category || 'other',
              ev.categoryLabel || null,
              ev.title || '',
              ev.eventType || null,
              ev.hasAmount ? 1 : 0,
              Number(ev.amount || 0),
              ev.direction || 'outgoing',
              ev.targetPerson || null,
              ev.ourRepresentative || null,
              ev.isPettyCashLinked ? 1 : 0,
              ev.voucherNo || null,
              ev.linkedTransactionId || null,
              ev.companyId || null,
              ev.proofNote || null,
              ev.note || null,
              Number(ev.createdAt || now)
            ]
          );
        });
      }
    });
  }

  // 既有資料自動遷移：將舊 JSON 欄位拆解遷移至獨立實體 SQL 資料表
  try {
    const contactsCountRes = database.exec('SELECT COUNT(*) AS cnt FROM customer_contacts');
    const contactsCount = (contactsCountRes[0]?.values[0]?.[0] as number) || 0;
    if (contactsCount === 0) {
      const custRes = database.exec('SELECT id, contacts FROM customers');
      if (custRes && custRes.length > 0 && custRes[0].values.length > 0) {
        custRes[0].values.forEach((row) => {
          const custId = String(row[0]);
          const rawContacts = String(row[1] || '[]');
          try {
            const list = JSON.parse(rawContacts);
            if (Array.isArray(list)) {
              list.forEach((contact: any, idx: number) => {
                database.run(
                  `INSERT OR IGNORE INTO customer_contacts (
                    id, customerId, name, title, mobile, phone, email, lineId, note, sortOrder
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    contact.id || `contact_${custId}_${idx}`,
                    custId,
                    contact.name || '未具名聯絡人',
                    contact.title || null,
                    contact.mobile || null,
                    contact.phone || null,
                    contact.email || null,
                    contact.lineId || null,
                    contact.note || null,
                    idx
                  ]
                );
              });
            }
          } catch (e) {}
        });
      }
    }
  } catch (e) {
    console.warn('customer_contacts migration notice:', e);
  }

  try {
    const eventsCountRes = database.exec('SELECT COUNT(*) AS cnt FROM customer_events');
    const eventsCount = (eventsCountRes[0]?.values[0]?.[0] as number) || 0;
    if (eventsCount === 0) {
      const custRes = database.exec('SELECT id, events FROM customers');
      if (custRes && custRes.length > 0 && custRes[0].values.length > 0) {
        custRes[0].values.forEach((row) => {
          const custId = String(row[0]);
          const rawEvents = String(row[1] || '[]');
          try {
            const list = JSON.parse(rawEvents);
            if (Array.isArray(list)) {
              list.forEach((ev: any) => {
                database.run(
                  `INSERT OR IGNORE INTO customer_events (
                    id, customerId, date, category, categoryLabel, title, eventType,
                    hasAmount, amount, direction, targetPerson, ourRepresentative,
                    isPettyCashLinked, voucherNo, linkedTransactionId, companyId, proofNote, note, createdAt
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    ev.id || `ev_${custId}_${Math.random().toString(36).slice(2, 6)}`,
                    custId,
                    ev.date || new Date().toISOString().slice(0, 10),
                    ev.category || 'other',
                    ev.categoryLabel || null,
                    ev.title || '',
                    ev.eventType || null,
                    ev.hasAmount ? 1 : 0,
                    Number(ev.amount || 0),
                    ev.direction || 'outgoing',
                    ev.targetPerson || null,
                    ev.ourRepresentative || null,
                    ev.isPettyCashLinked ? 1 : 0,
                    ev.voucherNo || null,
                    ev.linkedTransactionId || null,
                    ev.companyId || null,
                    ev.proofNote || null,
                    ev.note || null,
                    Number(ev.createdAt || Date.now())
                  ]
                );
              });
            }
          } catch (e) {}
        });
      }
    }
  } catch (e) {
    console.warn('customer_events migration notice:', e);
  }

  try {
    const subItemsCountRes = database.exec('SELECT COUNT(*) AS cnt FROM sub_account_items');
    const subItemsCount = (subItemsCountRes[0]?.values[0]?.[0] as number) || 0;
    if (subItemsCount === 0) {
      const subRes = database.exec('SELECT id, items, startDate FROM sub_accounts');
      if (subRes && subRes.length > 0 && subRes[0].values.length > 0) {
        subRes[0].values.forEach((row) => {
          const subId = String(row[0]);
          const rawItems = String(row[1] || '[]');
          const defaultDate = String(row[2] || new Date().toISOString().slice(0, 10));
          try {
            const list = JSON.parse(rawItems);
            if (Array.isArray(list)) {
              list.forEach((item: any) => {
                database.run(
                  `INSERT OR IGNORE INTO sub_account_items (
                    id, subAccountId, date, type, categoryId, categoryName, subItem, amount,
                    receiptType, invoiceNumber, claimant, note, createdAt, isImportedToGeneral
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    subId,
                    item.date || defaultDate,
                    item.type || 'expense',
                    item.categoryId || 'misc',
                    item.categoryName || '雜支',
                    item.subItem || '',
                    Number(item.amount) || 0,
                    item.receiptType || null,
                    item.invoiceNumber || null,
                    item.claimant || null,
                    item.note || null,
                    Number(item.createdAt || Date.now()),
                    item.isImportedToGeneral ? 1 : 0
                  ]
                );
              });
            }
          } catch (e) {}
        });
      }
    }
  } catch (e) {
    console.warn('sub_account_items migration notice:', e);
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
      sellerTaxId: obj.sellerTaxId || undefined,
      accountingCategory: obj.accountingCategory || (isInv ? 'official_tax' : 'internal_management'),
      taxType: obj.taxType || (isInv ? 'taxable' : 'receipt_pool'),
      isConfidential: Boolean(obj.isConfidential)
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
  const accCat = t.accountingCategory || (isInv ? 'official_tax' : 'internal_management');
  const tType = t.taxType || (isInv ? 'taxable' : 'receipt_pool');
  const isConf = t.isConfidential ? 1 : 0;

  database.run(
    `INSERT OR REPLACE INTO transactions (
      id, date, type, categoryId, categoryName, subItem, claimant, peopleCount,
      amount, note, createdAt, receiptType, invoiceNumber, voucherNo, rawVoucherId,
      subAccountSourceId, subAccountSourceName, companyId,
      netAmount, taxAmount, taxDeductible, sellerTaxId,
      accountingCategory, taxType, isConfidential
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      t.sellerTaxId || null,
      accCat,
      tType,
      isConf
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
    const accCat = t.accountingCategory || (isInv ? 'official_tax' : 'internal_management');
    const tType = t.taxType || (isInv ? 'taxable' : 'receipt_pool');
    const isConf = t.isConfidential ? 1 : 0;

    database.run(
      `INSERT INTO transactions (
        id, date, type, categoryId, categoryName, subItem, claimant, peopleCount,
        amount, note, createdAt, receiptType, invoiceNumber, voucherNo, rawVoucherId,
        subAccountSourceId, subAccountSourceName, companyId,
        netAmount, taxAmount, taxDeductible, sellerTaxId,
        accountingCategory, taxType, isConfidential
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        t.sellerTaxId || null,
        accCat,
        tType,
        isConf
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
  const subs = res[0].values.map((row) => {
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

  // 讀取正規化 sub_account_items 資料表
  const itemsMap: Record<string, SubAccountItemRow[]> = {};
  const itemsRes = database.exec(`SELECT * FROM sub_account_items ORDER BY date ASC, createdAt ASC`);
  if (itemsRes && itemsRes.length > 0 && itemsRes[0].values.length > 0) {
    const iCols = itemsRes[0].columns;
    itemsRes[0].values.forEach((row) => {
      const obj: any = {};
      iCols.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      const subId = String(obj.subAccountId);
      if (!itemsMap[subId]) itemsMap[subId] = [];
      itemsMap[subId].push({
        id: String(obj.id),
        subAccountId: subId,
        date: String(obj.date),
        type: obj.type,
        categoryId: obj.categoryId || undefined,
        categoryName: obj.categoryName || undefined,
        subItem: String(obj.subItem || ''),
        amount: Number(obj.amount),
        receiptType: obj.receiptType || 'receipt',
        invoiceNumber: obj.invoiceNumber || undefined,
        claimant: obj.claimant || undefined,
        note: obj.note || undefined,
        createdAt: Number(obj.createdAt),
        isImportedToGeneral: Boolean(obj.isImportedToGeneral)
      });
    });
  }

  return subs.map((sa) => ({
    ...sa,
    items: itemsMap[sa.id] !== undefined ? itemsMap[sa.id] : sa.items
  }));
}

export async function saveAllSubAccounts(subAccounts: SubAccountRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM sub_accounts`);
  database.run(`DELETE FROM sub_account_items`);
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

    if (Array.isArray(sa.items)) {
      sa.items.forEach((item) => {
        database.run(
          `INSERT INTO sub_account_items (
            id, subAccountId, date, type, categoryId, categoryName, subItem, amount,
            receiptType, invoiceNumber, claimant, note, createdAt, isImportedToGeneral
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sa.id,
            item.date || sa.startDate,
            item.type || 'expense',
            item.categoryId || 'misc',
            item.categoryName || '雜支',
            item.subItem || '',
            Number(item.amount) || 0,
            item.receiptType || null,
            item.invoiceNumber || null,
            item.claimant || null,
            item.note || null,
            Number(item.createdAt || Date.now()),
            item.isImportedToGeneral ? 1 : 0
          ]
        );
      });
    }
  });
  persist();
}

export async function getAllSubAccountItems(): Promise<SubAccountItemRow[]> {
  const database = await getDb();
  const res = database.exec(`SELECT * FROM sub_account_items ORDER BY date ASC, createdAt ASC`);
  if (!res || res.length === 0 || !res[0].values.length) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: String(obj.id),
      subAccountId: String(obj.subAccountId),
      date: String(obj.date),
      type: obj.type,
      categoryId: obj.categoryId || undefined,
      categoryName: obj.categoryName || undefined,
      subItem: String(obj.subItem || ''),
      amount: Number(obj.amount),
      receiptType: obj.receiptType || 'receipt',
      invoiceNumber: obj.invoiceNumber || undefined,
      claimant: obj.claimant || undefined,
      note: obj.note || undefined,
      createdAt: Number(obj.createdAt),
      isImportedToGeneral: Boolean(obj.isImportedToGeneral)
    };
  });
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

export async function getAllCompanyPhones(companyId?: string): Promise<CompanyPhoneEntryRow[]> {
  const database = await getDb();
  let query = `SELECT * FROM company_phones ORDER BY sortOrder ASC, id ASC`;
  if (companyId) {
    query = `SELECT * FROM company_phones WHERE companyId = '${companyId.replace(/'/g, "''")}' ORDER BY sortOrder ASC, id ASC`;
  }
  const res = database.exec(query);
  if (!res || !res.length || !res[0].values.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const o: any = {};
    cols.forEach((c, idx) => { o[c] = row[idx]; });
    return {
      id: String(o.id),
      companyId: String(o.companyId),
      type: o.type as any,
      number: String(o.number || ''),
      label: o.label ? String(o.label) : '',
      isDefault: Boolean(o.isDefault),
      sortOrder: Number(o.sortOrder || 1),
      createdAt: Number(o.createdAt || Date.now())
    };
  });
}

export async function getAllCompanyBankAccounts(companyId?: string): Promise<CompanyBankAccountRow[]> {
  const database = await getDb();
  let query = `SELECT * FROM company_bank_accounts ORDER BY isDefault DESC, sortOrder ASC, id ASC`;
  if (companyId) {
    query = `SELECT * FROM company_bank_accounts WHERE companyId = '${companyId.replace(/'/g, "''")}' ORDER BY isDefault DESC, sortOrder ASC, id ASC`;
  }
  const res = database.exec(query);
  if (!res || !res.length || !res[0].values.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const o: any = {};
    cols.forEach((c, idx) => { o[c] = row[idx]; });
    return {
      id: String(o.id),
      companyId: String(o.companyId),
      bankName: String(o.bankName || ''),
      bankBranch: o.bankBranch ? String(o.bankBranch) : '',
      bankCode: o.bankCode ? String(o.bankCode) : '',
      branchCode: o.branchCode ? String(o.branchCode) : '',
      bankAccount: String(o.bankAccount || ''),
      accountName: String(o.accountName || ''),
      accountType: o.accountType as any,
      isDefault: Boolean(o.isDefault),
      isConfidential: Boolean(o.isConfidential),
      isPrivateAccount: Boolean(o.isPrivateAccount),
      note: o.note ? String(o.note) : '',
      sortOrder: Number(o.sortOrder || 1),
      createdAt: Number(o.createdAt || Date.now())
    };
  });
}

export function mapRowToCompanyProfile(
  obj: any,
  phones?: CompanyPhoneEntryRow[],
  bankAccounts?: CompanyBankAccountRow[]
): CompanyProfileRow {
  const compId = String(obj.id || 'comp_1');
  let companyPhones = phones || [];
  let companyBanks = bankAccounts || [];

  // 若尚未關聯子表資料，提供向下相容合成
  if (companyPhones.length === 0) {
    const fallbackPhones: CompanyPhoneEntryRow[] = [];
    if (obj.phone && String(obj.phone).trim()) {
      fallbackPhones.push({
        id: `${compId}_p_default`,
        companyId: compId,
        type: 'phone',
        number: String(obj.phone).trim(),
        label: '代表號電話',
        isDefault: true,
        sortOrder: 1
      });
    }
    if (obj.fax && String(obj.fax).trim()) {
      fallbackPhones.push({
        id: `${compId}_f_default`,
        companyId: compId,
        type: 'fax',
        number: String(obj.fax).trim(),
        label: '傳真專線',
        isDefault: true,
        sortOrder: 2
      });
    }
    if (fallbackPhones.length > 0) {
      companyPhones = fallbackPhones;
    }
  }

  if (companyBanks.length === 0 && (obj.bankName || obj.bankAccount)) {
    companyBanks = [
      {
        id: `${compId}_b_default`,
        companyId: compId,
        bankName: String(obj.bankName || '臺灣銀行'),
        bankBranch: obj.bankBranch ? String(obj.bankBranch) : '',
        bankCode: obj.bankCode ? String(obj.bankCode) : '',
        bankAccount: String(obj.bankAccount || ''),
        accountName: String(obj.accountName || obj.name || ''),
        accountType: 'operating',
        isDefault: true,
        note: '公司主要往來帳戶',
        sortOrder: 1
      }
    ];
  }

  // 取得代表號與主要銀行帳號以維持向下相容
  const defaultPhone = companyPhones.find(p => p.isDefault && p.type !== 'fax') || companyPhones.find(p => p.type !== 'fax');
  const defaultFax = companyPhones.find(p => p.isDefault && p.type === 'fax') || companyPhones.find(p => p.type === 'fax');
  const defaultBank = companyBanks.find(b => b.isDefault) || companyBanks[0];

  return {
    id: compId,
    name: String(obj.name || ''),
    shortName: obj.shortName ? String(obj.shortName) : '',
    taxId: obj.taxId ? String(obj.taxId) : '',
    representative: obj.representative ? String(obj.representative) : '',
    phone: defaultPhone ? defaultPhone.number : (obj.phone ? String(obj.phone) : ''),
    fax: defaultFax ? defaultFax.number : (obj.fax ? String(obj.fax) : ''),
    phones: companyPhones,
    bankAccounts: companyBanks,
    email: obj.email ? String(obj.email) : '',
    website: obj.website ? String(obj.website) : '',
    postalCode: obj.postalCode ? String(obj.postalCode) : '',
    address: obj.address ? String(obj.address) : '',
    bankName: defaultBank ? defaultBank.bankName : (obj.bankName ? String(obj.bankName) : ''),
    bankBranch: defaultBank ? (defaultBank.bankBranch || '') : (obj.bankBranch ? String(obj.bankBranch) : ''),
    bankCode: defaultBank ? (defaultBank.bankCode || '') : (obj.bankCode ? String(obj.bankCode) : ''),
    bankAccount: defaultBank ? defaultBank.bankAccount : (obj.bankAccount ? String(obj.bankAccount) : ''),
    accountName: defaultBank ? defaultBank.accountName : (obj.accountName ? String(obj.accountName) : ''),
    chiefAccountant: obj.chiefAccountant ? String(obj.chiefAccountant) : '',
    cashier: obj.cashier ? String(obj.cashier) : '',
    reportHeader: obj.reportHeader ? String(obj.reportHeader) : '',
    invoiceBuyerName: obj.invoiceBuyerName ? String(obj.invoiceBuyerName) : '',
    taxInvoiceNote: obj.taxInvoiceNote ? String(obj.taxInvoiceNote) : '',
    color: obj.color ? String(obj.color) : '#0066cc',
    entityType: (obj.entityType as any) || 'corporate',
    isJointHeader: obj.isJointHeader !== null && obj.isJointHeader !== undefined ? Boolean(obj.isJointHeader) : true,
    isConfidential: Boolean(obj.isConfidential),
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
  const allPhones = await getAllCompanyPhones();
  const allBanks = await getAllCompanyBankAccounts();

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    const cId = String(obj.id);
    const cPhones = allPhones.filter(p => p.companyId === cId);
    const cBanks = allBanks.filter(b => b.companyId === cId);
    return mapRowToCompanyProfile(obj, cPhones, cBanks);
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
  const cId = String(obj.id);
  const phones = await getAllCompanyPhones(cId);
  const banks = await getAllCompanyBankAccounts(cId);

  return mapRowToCompanyProfile(obj, phones, banks);
}

export async function saveCompanyProfile(profile: CompanyProfileRow): Promise<void> {
  const database = await getDb();
  if (profile.isDefault) {
    database.run(`UPDATE company_profile SET isDefault = 0 WHERE id != ?`, [profile.id]);
  }
  if (profile.isNominalPettyCashHolder) {
    database.run(`UPDATE company_profile SET isNominalPettyCashHolder = 0 WHERE id != ?`, [profile.id]);
  }

  // 同步預設電話與傳真至主檔欄位
  let primePhone = profile.phone || null;
  let primeFax = profile.fax || null;
  if (Array.isArray(profile.phones) && profile.phones.length > 0) {
    const defPh = profile.phones.find(p => p.isDefault && p.type !== 'fax') || profile.phones.find(p => p.type !== 'fax');
    const defFx = profile.phones.find(p => p.isDefault && p.type === 'fax') || profile.phones.find(p => p.type === 'fax');
    if (defPh) primePhone = defPh.number;
    if (defFx) primeFax = defFx.number;
  }

  // 同步預設銀行帳戶至主檔欄位
  let primeBankName = profile.bankName || null;
  let primeBankBranch = profile.bankBranch || null;
  let primeBankCode = profile.bankCode || null;
  let primeBankAccount = profile.bankAccount || null;
  let primeAccountName = profile.accountName || null;
  if (Array.isArray(profile.bankAccounts) && profile.bankAccounts.length > 0) {
    const defBk = profile.bankAccounts.find(b => b.isDefault) || profile.bankAccounts[0];
    if (defBk) {
      primeBankName = defBk.bankName;
      primeBankBranch = defBk.bankBranch || null;
      primeBankCode = defBk.bankCode || null;
      primeBankAccount = defBk.bankAccount;
      primeAccountName = defBk.accountName || profile.name;
    }
  }

  database.run(
    `INSERT OR REPLACE INTO company_profile (
      id, name, shortName, taxId, representative, phone, fax, email, website,
      postalCode, address, bankName, bankBranch, bankCode, bankAccount, accountName,
      chiefAccountant, cashier, reportHeader, invoiceBuyerName, taxInvoiceNote,
      color, entityType, isJointHeader, isConfidential, isDefault, isNominalPettyCashHolder, sortOrder, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.id || 'comp_1',
      profile.name || '公司名稱',
      profile.shortName || null,
      profile.taxId || null,
      profile.representative || null,
      primePhone,
      primeFax,
      profile.email || null,
      profile.website || null,
      profile.postalCode || null,
      profile.address || null,
      primeBankName,
      primeBankBranch,
      primeBankCode,
      primeBankAccount,
      primeAccountName,
      profile.chiefAccountant || null,
      profile.cashier || null,
      profile.reportHeader || null,
      profile.invoiceBuyerName || null,
      profile.taxInvoiceNote || null,
      profile.color || '#0066cc',
      profile.entityType || 'corporate',
      profile.isJointHeader !== undefined ? (profile.isJointHeader ? 1 : 0) : 1,
      profile.isConfidential ? 1 : 0,
      profile.isDefault ? 1 : 0,
      profile.isNominalPettyCashHolder ? 1 : 0,
      profile.sortOrder ?? 1,
      Date.now()
    ]
  );

  // 儲存/同步多筆電話與傳真
  if (Array.isArray(profile.phones)) {
    database.run(`DELETE FROM company_phones WHERE companyId = ?`, [profile.id]);
    profile.phones.forEach((ph, pIdx) => {
      database.run(
        `INSERT INTO company_phones (
          id, companyId, type, number, label, isDefault, sortOrder, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ph.id || `${profile.id}_p_${pIdx + 1}_${Date.now()}`,
          profile.id,
          ph.type || 'phone',
          ph.number,
          ph.label || null,
          ph.isDefault ? 1 : 0,
          ph.sortOrder || pIdx + 1,
          ph.createdAt || Date.now()
        ]
      );
    });
  }

  // 儲存/同步多筆銀行帳戶
  if (Array.isArray(profile.bankAccounts)) {
    database.run(`DELETE FROM company_bank_accounts WHERE companyId = ?`, [profile.id]);
    profile.bankAccounts.forEach((bk, bIdx) => {
      database.run(
        `INSERT INTO company_bank_accounts (
          id, companyId, bankName, bankBranch, bankCode, branchCode, bankAccount, accountName, accountType, isDefault, isConfidential, isPrivateAccount, note, sortOrder, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bk.id || `${profile.id}_b_${bIdx + 1}_${Date.now()}`,
          profile.id,
          bk.bankName,
          bk.bankBranch || null,
          bk.bankCode || null,
          bk.branchCode || null,
          bk.bankAccount,
          bk.accountName || profile.name,
          bk.accountType || 'operating',
          bk.isDefault ? 1 : 0,
          bk.isConfidential ? 1 : 0,
          bk.isPrivateAccount ? 1 : 0,
          bk.note || null,
          bk.sortOrder || bIdx + 1,
          bk.createdAt || Date.now()
        ]
      );
    });
  }

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
  database.run(`DELETE FROM company_phones WHERE companyId = ?`, [id]);
  database.run(`DELETE FROM company_bank_accounts WHERE companyId = ?`, [id]);
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
    customerCategory: obj.customerCategory ? String(obj.customerCategory) : undefined,
    supplierCategory: obj.supplierCategory ? String(obj.supplierCategory) : undefined,
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
  const customers = res[0].values.map((row) => mapRowToCustomer(row, columns));

  // 1. 載入正規化 customer_contacts 資料表
  const contactsMap: Record<string, CustomerContactPersonRow[]> = {};
  const contactsRes = database.exec(`SELECT * FROM customer_contacts ORDER BY sortOrder ASC, id ASC`);
  if (contactsRes && contactsRes.length > 0 && contactsRes[0].values.length > 0) {
    const cCols = contactsRes[0].columns;
    contactsRes[0].values.forEach((row) => {
      const obj: any = {};
      cCols.forEach((col, idx) => { obj[col] = row[idx]; });
      const custId = String(obj.customerId);
      if (!contactsMap[custId]) contactsMap[custId] = [];
      contactsMap[custId].push({
        id: String(obj.id),
        customerId: custId,
        name: String(obj.name || ''),
        title: obj.title ? String(obj.title) : undefined,
        mobile: obj.mobile ? String(obj.mobile) : undefined,
        phone: obj.phone ? String(obj.phone) : undefined,
        email: obj.email ? String(obj.email) : undefined,
        lineId: obj.lineId ? String(obj.lineId) : undefined,
        note: obj.note ? String(obj.note) : undefined,
        sortOrder: obj.sortOrder !== null && obj.sortOrder !== undefined ? Number(obj.sortOrder) : 0
      });
    });
  }

  // 2. 載入正規化 customer_events 資料表
  const eventsMap: Record<string, CustomerEventRecordRow[]> = {};
  const eventsRes = database.exec(`SELECT * FROM customer_events ORDER BY date DESC, createdAt DESC`);
  if (eventsRes && eventsRes.length > 0 && eventsRes[0].values.length > 0) {
    const eCols = eventsRes[0].columns;
    eventsRes[0].values.forEach((row) => {
      const obj: any = {};
      eCols.forEach((col, idx) => { obj[col] = row[idx]; });
      const custId = String(obj.customerId);
      if (!eventsMap[custId]) eventsMap[custId] = [];
      eventsMap[custId].push({
        id: String(obj.id),
        customerId: custId,
        date: String(obj.date),
        category: obj.category,
        categoryLabel: obj.categoryLabel ? String(obj.categoryLabel) : undefined,
        title: String(obj.title || ''),
        eventType: obj.eventType ? String(obj.eventType) : undefined,
        hasAmount: Boolean(obj.hasAmount),
        amount: Number(obj.amount || 0),
        direction: obj.direction || 'outgoing',
        targetPerson: obj.targetPerson ? String(obj.targetPerson) : undefined,
        ourRepresentative: obj.ourRepresentative ? String(obj.ourRepresentative) : undefined,
        isPettyCashLinked: Boolean(obj.isPettyCashLinked),
        voucherNo: obj.voucherNo ? String(obj.voucherNo) : undefined,
        linkedTransactionId: obj.linkedTransactionId ? String(obj.linkedTransactionId) : undefined,
        companyId: obj.companyId ? String(obj.companyId) : undefined,
        proofNote: obj.proofNote ? String(obj.proofNote) : undefined,
        note: obj.note ? String(obj.note) : undefined,
        createdAt: Number(obj.createdAt)
      });
    });
  }

  // 將正規化關聯資料與客戶主檔無縫結合
  return customers.map((c) => {
    const normalizedContacts = contactsMap[c.id];
    const normalizedEvents = eventsMap[c.id];
    return {
      ...c,
      contacts: normalizedContacts !== undefined ? normalizedContacts : c.contacts,
      events: normalizedEvents !== undefined ? normalizedEvents : c.events
    };
  });
}

export async function addCustomer(c: CustomerRow): Promise<void> {
  const database = await getDb();
  const now = Date.now();
  database.run(
    `INSERT INTO customers (
      id, name, shortName, isIndividual, taxId, representative, representativeMobile,
      secondaryRepresentative, phone1, phone2, fax, email, website, lineId,
      postalCode, address, shippingAddress, contacts, paymentTerm, bankName,
      bankBranch, bankAccount, accountName, businessItems, customerCategory, supplierCategory,
      isCustomer, isSupplier, favoriteCompanyIds, events, note, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      c.customerCategory || null,
      c.supplierCategory || null,
      c.isCustomer ? 1 : 0,
      c.isSupplier ? 1 : 0,
      JSON.stringify(c.favoriteCompanyIds || []),
      JSON.stringify(c.events || []),
      c.note || null,
      c.createdAt || now,
      c.updatedAt || now
    ]
  );

  // 同步寫入正規化 customer_contacts 表
  database.run(`DELETE FROM customer_contacts WHERE customerId = ?`, [c.id]);
  if (Array.isArray(c.contacts)) {
    c.contacts.forEach((contact, idx) => {
      database.run(
        `INSERT OR REPLACE INTO customer_contacts (
          id, customerId, name, title, mobile, phone, email, lineId, note, sortOrder
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contact.id || `contact_${c.id}_${idx}`,
          c.id,
          contact.name,
          contact.title || null,
          contact.mobile || null,
          contact.phone || null,
          contact.email || null,
          contact.lineId || null,
          contact.note || null,
          idx
        ]
      );
    });
  }

  // 同步寫入正規化 customer_events 表
  database.run(`DELETE FROM customer_events WHERE customerId = ?`, [c.id]);
  if (Array.isArray(c.events)) {
    c.events.forEach((ev) => {
      database.run(
        `INSERT OR REPLACE INTO customer_events (
          id, customerId, date, category, categoryLabel, title, eventType,
          hasAmount, amount, direction, targetPerson, ourRepresentative,
          isPettyCashLinked, voucherNo, linkedTransactionId, companyId, proofNote, note, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ev.id || `ev_${c.id}_${Math.random().toString(36).slice(2, 6)}`,
          c.id,
          ev.date || new Date().toISOString().slice(0, 10),
          ev.category || 'other',
          ev.categoryLabel || null,
          ev.title || '',
          ev.eventType || null,
          ev.hasAmount ? 1 : 0,
          Number(ev.amount || 0),
          ev.direction || 'outgoing',
          ev.targetPerson || null,
          ev.ourRepresentative || null,
          ev.isPettyCashLinked ? 1 : 0,
          ev.voucherNo || null,
          ev.linkedTransactionId || null,
          ev.companyId || null,
          ev.proofNote || null,
          ev.note || null,
          Number(ev.createdAt || now)
        ]
      );
    });
  }

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
      bankAccount = ?, accountName = ?, businessItems = ?, customerCategory = ?, supplierCategory = ?,
      isCustomer = ?, isSupplier = ?, favoriteCompanyIds = ?, events = ?, note = ?, updatedAt = ?
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
      c.customerCategory || null,
      c.supplierCategory || null,
      c.isCustomer ? 1 : 0,
      c.isSupplier ? 1 : 0,
      JSON.stringify(c.favoriteCompanyIds || []),
      JSON.stringify(c.events || []),
      c.note || null,
      now,
      c.id
    ]
  );

  // 同步更新正規化 customer_contacts 表
  database.run(`DELETE FROM customer_contacts WHERE customerId = ?`, [c.id]);
  if (Array.isArray(c.contacts)) {
    c.contacts.forEach((contact, idx) => {
      database.run(
        `INSERT OR REPLACE INTO customer_contacts (
          id, customerId, name, title, mobile, phone, email, lineId, note, sortOrder
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contact.id || `contact_${c.id}_${idx}`,
          c.id,
          contact.name,
          contact.title || null,
          contact.mobile || null,
          contact.phone || null,
          contact.email || null,
          contact.lineId || null,
          contact.note || null,
          idx
        ]
      );
    });
  }

  // 同步更新正規化 customer_events 表
  database.run(`DELETE FROM customer_events WHERE customerId = ?`, [c.id]);
  if (Array.isArray(c.events)) {
    c.events.forEach((ev) => {
      database.run(
        `INSERT OR REPLACE INTO customer_events (
          id, customerId, date, category, categoryLabel, title, eventType,
          hasAmount, amount, direction, targetPerson, ourRepresentative,
          isPettyCashLinked, voucherNo, linkedTransactionId, companyId, proofNote, note, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ev.id || `ev_${c.id}_${Math.random().toString(36).slice(2, 6)}`,
          c.id,
          ev.date || new Date().toISOString().slice(0, 10),
          ev.category || 'other',
          ev.categoryLabel || null,
          ev.title || '',
          ev.eventType || null,
          ev.hasAmount ? 1 : 0,
          Number(ev.amount || 0),
          ev.direction || 'outgoing',
          ev.targetPerson || null,
          ev.ourRepresentative || null,
          ev.isPettyCashLinked ? 1 : 0,
          ev.voucherNo || null,
          ev.linkedTransactionId || null,
          ev.companyId || null,
          ev.proofNote || null,
          ev.note || null,
          Number(ev.createdAt || now)
        ]
      );
    });
  }

  persist();
}

export async function deleteCustomer(id: string): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM customers WHERE id = ?`, [id]);
  database.run(`DELETE FROM customer_contacts WHERE customerId = ?`, [id]);
  database.run(`DELETE FROM customer_events WHERE customerId = ?`, [id]);
  persist();
}

export async function replaceAllCustomers(customers: CustomerRow[]): Promise<void> {
  const database = await getDb();
  database.run(`DELETE FROM customers`);
  database.run(`DELETE FROM customer_contacts`);
  database.run(`DELETE FROM customer_events`);
  for (const c of customers) {
    await addCustomer(c);
  }
  persist();
}

export async function getAllCustomerEvents(): Promise<(CustomerEventRecordRow & { customerName?: string })[]> {
  const database = await getDb();
  const res = database.exec(`
    SELECT e.*, c.name AS customerName
    FROM customer_events e
    LEFT JOIN customers c ON e.customerId = c.id
    ORDER BY e.date DESC, e.createdAt DESC
  `);
  if (!res || res.length === 0 || !res[0].values.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: String(obj.id),
      customerId: String(obj.customerId),
      customerName: obj.customerName ? String(obj.customerName) : undefined,
      date: String(obj.date),
      category: obj.category,
      categoryLabel: obj.categoryLabel ? String(obj.categoryLabel) : undefined,
      title: String(obj.title || ''),
      eventType: obj.eventType ? String(obj.eventType) : undefined,
      hasAmount: Boolean(obj.hasAmount),
      amount: Number(obj.amount || 0),
      direction: obj.direction || 'outgoing',
      targetPerson: obj.targetPerson ? String(obj.targetPerson) : undefined,
      ourRepresentative: obj.ourRepresentative ? String(obj.ourRepresentative) : undefined,
      isPettyCashLinked: Boolean(obj.isPettyCashLinked),
      voucherNo: obj.voucherNo ? String(obj.voucherNo) : undefined,
      linkedTransactionId: obj.linkedTransactionId ? String(obj.linkedTransactionId) : undefined,
      companyId: obj.companyId ? String(obj.companyId) : undefined,
      proofNote: obj.proofNote ? String(obj.proofNote) : undefined,
      note: obj.note ? String(obj.note) : undefined,
      createdAt: Number(obj.createdAt)
    };
  });
}

export async function getAllCustomerContacts(): Promise<(CustomerContactPersonRow & { customerName?: string })[]> {
  const database = await getDb();
  const res = database.exec(`
    SELECT ct.*, c.name AS customerName
    FROM customer_contacts ct
    LEFT JOIN customers c ON ct.customerId = c.id
    ORDER BY ct.customerId ASC, ct.sortOrder ASC
  `);
  if (!res || res.length === 0 || !res[0].values.length) return [];
  const cols = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    cols.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: String(obj.id),
      customerId: String(obj.customerId),
      customerName: obj.customerName ? String(obj.customerName) : undefined,
      name: String(obj.name || ''),
      title: obj.title ? String(obj.title) : undefined,
      mobile: obj.mobile ? String(obj.mobile) : undefined,
      phone: obj.phone ? String(obj.phone) : undefined,
      email: obj.email ? String(obj.email) : undefined,
      lineId: obj.lineId ? String(obj.lineId) : undefined,
      note: obj.note ? String(obj.note) : undefined,
      sortOrder: Number(obj.sortOrder || 0)
    };
  });
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
    'sub_accounts', 'sub_account_items', 'director_withdrawals',
    'company_profile', 'company_phones', 'company_bank_accounts',
    'customers', 'customer_contacts', 'customer_events'
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
    'company_phones',
    'company_bank_accounts',
    'customers',
    'customer_contacts',
    'customer_events',
    'categories',
    'claimants',
    'budgets',
    'sub_accounts',
    'sub_account_items',
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

// 匯出單一模組 JSON 格式物件（支援客戶、流水帳、公司主檔等獨立備份）
export async function getModularDatabaseJsonExport(moduleKey: string): Promise<Record<string, any>> {
  const database = await getDb();
  persist();

  const base = {
    version: '2.0.0',
    backupType: 'module',
    moduleKey,
    exportedAt: new Date().toISOString(),
    system: '企業零用金與客戶財務管理系統'
  };

  switch (moduleKey) {
    case 'companies':
      return {
        ...base,
        moduleLabel: '公司行號主檔',
        companies: await getAllCompanyProfiles(),
        companyProfile: await getCompanyProfile()
      };
    case 'customers':
      return {
        ...base,
        moduleLabel: '客戶與廠商名冊',
        customers: await getAllCustomers()
      };
    case 'transactions':
      return {
        ...base,
        moduleLabel: '零用金收支流水帳',
        transactions: await getAllTransactions()
      };
    case 'categories_claimants':
      return {
        ...base,
        moduleLabel: '系統分類與請領人名冊',
        categories: await getAllCategories(),
        claimants: await getAllClaimants()
      };
    case 'sub_accounts':
      return {
        ...base,
        moduleLabel: '專案採買子帳戶',
        subAccounts: await getAllSubAccounts()
      };
    case 'budgets':
      return {
        ...base,
        moduleLabel: '月份預算額度',
        budgets: await getAllBudgets()
      };
    case 'director_withdrawals':
      return {
        ...base,
        moduleLabel: '廠長大額提領記錄',
        directorWithdrawals: await getAllDirectorWithdrawals()
      };
    default:
      throw new Error(`未知的模組代碼: ${moduleKey}`);
  }
}

// 智慧模組還原 (支援 Replace 覆蓋替換 或 Merge 智慧比對追加)
export async function restoreModularData(
  data: Record<string, any>,
  modules: string[],
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; affectedModules: string[]; summary: Record<string, number> }> {
  const database = await getDb();
  const summary: Record<string, number> = {};

  database.run('BEGIN TRANSACTION');

  try {
    for (const mod of modules) {
      switch (mod) {
        case 'companies': {
          const incomingCompanies: CompanyProfileRow[] = Array.isArray(data.companies) 
            ? data.companies 
            : (data.companyProfile ? [data.companyProfile] : []);
          
          if (mode === 'replace') {
            database.run(`DELETE FROM company_profile`);
            for (const c of incomingCompanies) {
              await saveCompanyProfile(c);
            }
            summary.companies = incomingCompanies.length;
          } else {
            let count = 0;
            for (const inc of incomingCompanies) {
              await saveCompanyProfile(inc);
              count++;
            }
            summary.companies = count;
          }
          break;
        }

        case 'customers': {
          const incomingCustomers: CustomerRow[] = Array.isArray(data.customers) ? data.customers : [];
          if (mode === 'replace') {
            database.run(`DELETE FROM customers`);
            for (const c of incomingCustomers) {
              await addCustomer(c);
            }
            summary.customers = incomingCustomers.length;
          } else {
            const existing = await getAllCustomers();
            const existingIds = new Set(existing.map(c => c.id));
            let count = 0;
            for (const c of incomingCustomers) {
              if (existingIds.has(c.id)) {
                await updateCustomer(c);
              } else {
                await addCustomer(c);
              }
              count++;
            }
            summary.customers = count;
          }
          break;
        }

        case 'transactions': {
          const incomingTx: TransactionRow[] = Array.isArray(data.transactions) ? data.transactions : [];
          if (mode === 'replace') {
            database.run(`DELETE FROM transactions`);
            for (const tx of incomingTx) {
              await addTransaction(tx);
            }
            summary.transactions = incomingTx.length;
          } else {
            const existing = await getAllTransactions();
            const existingIds = new Set(existing.map(t => t.id));
            let count = 0;
            for (const tx of incomingTx) {
              if (existingIds.has(tx.id)) {
                await updateTransaction(tx);
              } else {
                await addTransaction(tx);
              }
              count++;
            }
            summary.transactions = count;
          }
          break;
        }

        case 'categories_claimants': {
          const incomingCats: CategoryConfigRow[] = Array.isArray(data.categories) ? data.categories : [];
          const incomingClaimants: string[] = Array.isArray(data.claimants) ? data.claimants : [];

          if (mode === 'replace') {
            if (incomingCats.length > 0) {
              await saveAllCategories(incomingCats);
            }
            if (incomingClaimants.length > 0) {
              await saveAllClaimants(incomingClaimants);
            }
            summary.categories = incomingCats.length;
            summary.claimants = incomingClaimants.length;
          } else {
            const existingCats = await getAllCategories();
            const existingCatMap = new Map(existingCats.map(c => [c.id, c]));
            const mergedCats = [...existingCats];
            for (const inc of incomingCats) {
              if (existingCatMap.has(inc.id)) {
                const idx = mergedCats.findIndex(c => c.id === inc.id);
                if (idx >= 0) mergedCats[idx] = inc;
              } else {
                mergedCats.push(inc);
              }
            }
            await saveAllCategories(mergedCats);

            const existingClaimants = await getAllClaimants();
            const claimantSet = new Set(existingClaimants);
            for (const cl of incomingClaimants) {
              if (typeof cl === 'string' && cl.trim()) {
                claimantSet.add(cl.trim());
              }
            }
            await saveAllClaimants(Array.from(claimantSet));

            summary.categories = mergedCats.length;
            summary.claimants = claimantSet.size;
          }
          break;
        }

        case 'sub_accounts': {
          const incomingSubs: SubAccountRow[] = Array.isArray(data.subAccounts) ? data.subAccounts : [];
          if (mode === 'replace') {
            await saveAllSubAccounts(incomingSubs);
            summary.subAccounts = incomingSubs.length;
          } else {
            const existing = await getAllSubAccounts();
            const existingMap = new Map(existing.map(s => [s.id, s]));
            const merged = [...existing];
            for (const inc of incomingSubs) {
              if (existingMap.has(inc.id)) {
                const idx = merged.findIndex(s => s.id === inc.id);
                if (idx >= 0) merged[idx] = inc;
              } else {
                merged.push(inc);
              }
            }
            await saveAllSubAccounts(merged);
            summary.subAccounts = merged.length;
          }
          break;
        }

        case 'budgets': {
          const incomingBudgets = (typeof data.budgets === 'object' && data.budgets !== null) ? data.budgets : {};
          if (mode === 'replace') {
            await saveAllBudgets(incomingBudgets);
            summary.budgets = Object.keys(incomingBudgets).length;
          } else {
            const existing = await getAllBudgets();
            const merged = { ...existing, ...incomingBudgets };
            await saveAllBudgets(merged);
            summary.budgets = Object.keys(merged).length;
          }
          break;
        }

        case 'director_withdrawals': {
          const incomingDw: DirectorWithdrawalRow[] = Array.isArray(data.directorWithdrawals) ? data.directorWithdrawals : [];
          if (mode === 'replace') {
            await saveAllDirectorWithdrawals(incomingDw);
            summary.directorWithdrawals = incomingDw.length;
          } else {
            const existing = await getAllDirectorWithdrawals();
            const existingIds = new Set(existing.map(d => d.id));
            const merged = [...existing];
            for (const inc of incomingDw) {
              if (existingIds.has(inc.id)) {
                const idx = merged.findIndex(d => d.id === inc.id);
                if (idx >= 0) merged[idx] = inc;
              } else {
                merged.push(inc);
              }
            }
            await saveAllDirectorWithdrawals(merged);
            summary.directorWithdrawals = merged.length;
          }
          break;
        }
      }
    }

    database.run('COMMIT');
    persist();
    return { success: true, affectedModules: modules, summary };
  } catch (err) {
    database.run('ROLLBACK');
    throw err;
  }
}

