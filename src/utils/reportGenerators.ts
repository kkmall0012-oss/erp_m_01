import * as XLSX from 'xlsx';
import { Transaction, CategoryConfig, MonthBudget, SubAccount, DirectorWithdrawal } from '../types';

export interface ReportDefinition {
  id: string;
  code: string;
  name: string;
  category: '明細與流水帳類' | '項目分類統計類';
  shortDesc: string;
  iconName: string;
}

export const REPORT_CATALOG: ReportDefinition[] = [
  // 1. 明細與流水帳類
  {
    id: 'tx_details',
    code: '01',
    name: '帳務記錄明細表',
    category: '明細與流水帳類',
    shortDesc: '完整收支流水簿、日期、科目、品名細項、經辦同仁、金額與單據號碼',
    iconName: 'FileText'
  },
  {
    id: 'daily_summary',
    code: '02',
    name: '收支日報表',
    category: '明細與流水帳類',
    shortDesc: '每日逐日日計統計、本日撥入、本日支出、日差額、結餘與當日開銷摘要',
    iconName: 'CalendarDays'
  },

  // 2. 項目分類統計類
  {
    id: 'category_stats',
    code: '03',
    name: '項目分類統計表',
    category: '項目分類統計類',
    shortDesc: '各支出科目總額排行、開銷筆數、支出佔比%、平均每筆與主要店家明細',
    iconName: 'PieChart'
  },
  {
    id: 'yearly_summary',
    code: '04',
    name: '年度收支統計表',
    category: '項目分類統計類',
    shortDesc: '全年度 1~12 月每月撥入、支出、月差額及累計結存走勢趨勢表',
    iconName: 'TrendingUp'
  },
  {
    id: 'yearly_matrix',
    code: '05',
    name: '年度收支統計彙總表',
    category: '項目分類統計類',
    shortDesc: '各大支出分類科目與撥補收入跨 1~12 月之年度交叉樞紐分析總表',
    iconName: 'Table'
  }
];

export interface ReportFilterOptions {
  periodType: 'month' | 'year' | 'custom' | 'all';
  yearMonth: string; // YYYY-MM (e.g. 2026-09)
  year: string; // YYYY (e.g. 2026)
  startDate?: string;
  endDate?: string;
  categoryId?: string; // 'all' or specific
  claimant?: string; // 'all' or specific
}

export interface ReportContextData {
  transactions: Transaction[];
  categories: CategoryConfig[];
  budgets?: Record<string, MonthBudget>;
  subAccounts?: SubAccount[];
  directorWithdrawals?: DirectorWithdrawal[];
}

// 取得篩選後的交易資料
export function getFilteredTransactions(
  transactions: Transaction[],
  filters: ReportFilterOptions
): Transaction[] {
  return transactions.filter((t) => {
    // 日期篩選
    if (filters.periodType === 'month') {
      if (!t.date.startsWith(filters.yearMonth)) return false;
    } else if (filters.periodType === 'year') {
      if (!t.date.startsWith(filters.year)) return false;
    } else if (filters.periodType === 'custom') {
      if (filters.startDate && t.date < filters.startDate) return false;
      if (filters.endDate && t.date > filters.endDate) return false;
    }

    // 分類篩選
    if (filters.categoryId && filters.categoryId !== 'all') {
      if (t.categoryId !== filters.categoryId) return false;
    }

    // 請領人篩選
    if (filters.claimant && filters.claimant !== 'all') {
      if (t.claimant !== filters.claimant) return false;
    }

    return true;
  });
}

// 取得報表期間文字描述
export function getPeriodDescription(filters: ReportFilterOptions): string {
  if (filters.periodType === 'month') {
    const [y, m] = filters.yearMonth.split('-');
    return `${y} 年 ${parseInt(m, 10)} 月度`;
  }
  if (filters.periodType === 'year') {
    return `${filters.year} 全年度`;
  }
  if (filters.periodType === 'custom') {
    return `${filters.startDate || '起初'} 至 ${filters.endDate || '迄今'}`;
  }
  return '全期歷史累計';
}

// 取得報表產出時間字串
export function getReportGeneratedTimestamp(): string {
  return new Date().toLocaleString('zh-TW', { hour12: false });
}

// =========================================================================
// 1. 帳務記錄明細表資料計算
// =========================================================================
export function buildTxDetailsReport(
  txs: Transaction[]
) {
  const sorted = [...txs].sort((a, b) => (b.date > a.date ? 1 : -1));
  const expenses = sorted.filter((t) => t.type === 'expense');
  const incomes = sorted.filter((t) => t.type === 'income');
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

  let invoiceCount = 0;
  let receiptCount = 0;
  let noDocCount = 0;
  sorted.forEach((t) => {
    if (t.receiptType === 'invoice') invoiceCount++;
    else if (t.receiptType === 'receipt') receiptCount++;
    else noDocCount++;
  });

  return {
    rows: sorted,
    totalExpense,
    totalIncome,
    netBalance: totalIncome - totalExpense,
    count: sorted.length,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    invoiceCount,
    receiptCount,
    noDocCount
  };
}

// =========================================================================
// 2. 收支日報表資料計算
// =========================================================================
export function buildDailySummaryReport(
  txs: Transaction[]
) {
  const map: Record<string, {
    date: string;
    dayOfWeek: string;
    income: number;
    expense: number;
    txCount: number;
    notes: string[];
    items: Transaction[];
  }> = {};

  const daysOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  txs.forEach((t) => {
    if (!map[t.date]) {
      const d = new Date(t.date);
      const dow = isNaN(d.getDay()) ? '-' : daysOfWeek[d.getDay()];
      map[t.date] = {
        date: t.date,
        dayOfWeek: dow,
        income: 0,
        expense: 0,
        txCount: 0,
        notes: [],
        items: []
      };
    }
    if (t.type === 'income') {
      map[t.date].income += t.amount;
    } else {
      map[t.date].expense += t.amount;
    }
    map[t.date].txCount += 1;
    map[t.date].items.push(t);
    const summary = `${t.categoryName}: ${t.subItem} ($${t.amount.toLocaleString()})`;
    if (map[t.date].notes.length < 3) {
      map[t.date].notes.push(summary);
    }
  });

  const datesAsc = Object.keys(map).sort();
  let cumulative = 0;
  const rows = datesAsc.map((d) => {
    const item = map[d];
    cumulative += (item.income - item.expense);
    return {
      date: item.date,
      dayOfWeek: item.dayOfWeek,
      income: item.income,
      expense: item.expense,
      net: item.income - item.expense,
      cumulativeBalance: cumulative,
      txCount: item.txCount,
      notes: item.notes.join('； '),
      items: item.items
    };
  });

  const totalIncome = rows.reduce((s, r) => s + r.income, 0);
  const totalExpense = rows.reduce((s, r) => s + r.expense, 0);

  return {
    rows,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    totalDays: rows.length
  };
}

// =========================================================================
// 3. 項目分類統計表
// =========================================================================
export function buildCategoryStatsReport(
  txs: Transaction[],
  categories: CategoryConfig[]
) {
  const expenses = txs.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

  const catMap: Record<string, {
    id: string;
    name: string;
    amount: number;
    count: number;
    subItems: Record<string, number>;
    claimants: Record<string, number>;
    transactions: Transaction[];
  }> = {};

  categories.forEach((c) => {
    if (c.type === 'expense') {
      catMap[c.id] = {
        id: c.id,
        name: c.name,
        amount: 0,
        count: 0,
        subItems: {},
        claimants: {},
        transactions: []
      };
    }
  });

  expenses.forEach((t) => {
    const id = t.categoryId || 'misc';
    if (!catMap[id]) {
      catMap[id] = {
        id,
        name: t.categoryName || '其他',
        amount: 0,
        count: 0,
        subItems: {},
        claimants: {},
        transactions: []
      };
    }
    catMap[id].amount += t.amount;
    catMap[id].count += 1;
    catMap[id].transactions.push(t);

    const sub = t.subItem || '未載明';
    catMap[id].subItems[sub] = (catMap[id].subItems[sub] || 0) + t.amount;

    if (t.claimant) {
      catMap[id].claimants[t.claimant] = (catMap[id].claimants[t.claimant] || 0) + t.amount;
    }
  });

  const list = Object.values(catMap)
    .filter((c) => c.amount > 0 || categories.some((orig) => orig.id === c.id))
    .map((c) => {
      const topSub = Object.entries(c.subItems).sort((a, b) => b[1] - a[1])[0];
      const topClaimant = Object.entries(c.claimants).sort((a, b) => b[1] - a[1])[0];
      return {
        id: c.id,
        name: c.name,
        amount: c.amount,
        count: c.count,
        percentage: totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0,
        avgPerTx: c.count > 0 ? Math.round(c.amount / c.count) : 0,
        topSubItem: topSub ? `${topSub[0]} ($${topSub[1].toLocaleString()})` : '-',
        topClaimant: topClaimant ? `${topClaimant[0]} ($${topClaimant[1].toLocaleString()})` : '-',
        transactions: [...c.transactions].sort((a, b) => (b.date > a.date ? 1 : -1))
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    rows: list,
    totalExpense,
    totalCount: expenses.length,
    overallAvg: expenses.length > 0 ? Math.round(totalExpense / expenses.length) : 0
  };
}

// =========================================================================
// 6. 年度收支統計表 (1~12月趨勢)
// =========================================================================
export function buildYearlySummaryReport(
  transactions: Transaction[],
  year: string
) {
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const mStr = String(i + 1).padStart(2, '0');
    return {
      monthStr: `${year}-${mStr}`,
      monthName: `${i + 1} 月`,
      income: 0,
      expense: 0,
      count: 0,
      transactions: [] as Transaction[]
    };
  });

  transactions.forEach((t) => {
    if (t.date.startsWith(year)) {
      const mIdx = parseInt(t.date.split('-')[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        if (t.type === 'income') {
          monthsData[mIdx].income += t.amount;
        } else {
          monthsData[mIdx].expense += t.amount;
        }
        monthsData[mIdx].count += 1;
        monthsData[mIdx].transactions.push(t);
      }
    }
  });

  let runningBalance = 0;
  const rows = monthsData.map((m) => {
    const net = m.income - m.expense;
    runningBalance += net;
    return {
      monthName: m.monthName,
      monthStr: m.monthStr,
      income: m.income,
      expense: m.expense,
      net,
      cumulativeBalance: runningBalance,
      txCount: m.count,
      transactions: [...m.transactions].sort((a, b) => (b.date > a.date ? 1 : -1))
    };
  });

  const totalIncome = rows.reduce((s, r) => s + r.income, 0);
  const totalExpense = rows.reduce((s, r) => s + r.expense, 0);

  return {
    rows,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    year
  };
}

// =========================================================================
// 7. 年度收支統計彙總表 (交叉分析矩陣)
// =========================================================================
export function buildYearlyMatrixReport(
  transactions: Transaction[],
  categories: CategoryConfig[],
  year: string
) {
  const matrix: Record<string, {
    id: string;
    name: string;
    months: number[];
    total: number;
  }> = {};

  categories.forEach((c) => {
    if (c.type === 'expense') {
      matrix[c.id] = {
        id: c.id,
        name: c.name,
        months: Array(12).fill(0),
        total: 0
      };
    }
  });

  transactions.forEach((t) => {
    if (t.date.startsWith(year) && t.type === 'expense') {
      const catId = t.categoryId || 'misc';
      if (!matrix[catId]) {
        matrix[catId] = {
          id: catId,
          name: t.categoryName || '其他',
          months: Array(12).fill(0),
          total: 0
        };
      }
      const mIdx = parseInt(t.date.split('-')[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        matrix[catId].months[mIdx] += t.amount;
        matrix[catId].total += t.amount;
      }
    }
  });

  const monthlyTotals = Array(12).fill(0);
  const monthlyIncomes = Array(12).fill(0);

  transactions.forEach((t) => {
    if (t.date.startsWith(year)) {
      const mIdx = parseInt(t.date.split('-')[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        if (t.type === 'expense') monthlyTotals[mIdx] += t.amount;
        else monthlyIncomes[mIdx] += t.amount;
      }
    }
  });

  const rows = Object.values(matrix)
    .filter((r) => r.total > 0 || categories.some((c) => c.id === r.id))
    .sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return {
    rows,
    monthlyTotals,
    monthlyIncomes,
    grandTotal,
    grandIncome: monthlyIncomes.reduce((s, a) => s + a, 0),
    year
  };
}

// =========================================================================
// 8. 損益表 (收支損益分析)
// =========================================================================
export function buildIncomeStatementReport(
  txs: Transaction[]
) {
  const incomes = txs.filter((t) => t.type === 'income');
  const expenses = txs.filter((t) => t.type === 'expense');

  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

  // 費用項目細拆
  const expenseCatMap: Record<string, number> = {};
  expenses.forEach((t) => {
    const name = t.categoryName || '其他費用';
    expenseCatMap[name] = (expenseCatMap[name] || 0) + t.amount;
  });

  const expenseItems = Object.entries(expenseCatMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    }));

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    expenseItems
  };
}

// =========================================================================
// 7. 收支淨值報表 (淨值流量表)
// =========================================================================
export function buildNetCashFlowReport(
  transactions: Transaction[],
  periodType: 'month' | 'year',
  keyStr: string
) {
  // 依時間區間計算現金淨流入與流出
  const filtered = transactions.filter((t) => t.date.startsWith(keyStr));
  const incomes = filtered.filter((t) => t.type === 'income');
  const expenses = filtered.filter((t) => t.type === 'expense');

  const totalIn = incomes.reduce((s, t) => s + t.amount, 0);
  const totalOut = expenses.reduce((s, t) => s + t.amount, 0);
  const net = totalIn - totalOut;

  return {
    period: keyStr || '全部期間',
    inflow: totalIn,
    outflow: totalOut,
    netFlow: net,
    inflowCount: incomes.length,
    outflowCount: expenses.length,
    status: net >= 0 ? '資金淨流入' : '資金淨流出'
  };
}

// =========================================================================
// 單一報表獨立匯出 Excel
// =========================================================================
export function exportSingleReportExcel(
  reportId: string,
  context: ReportContextData,
  filters: ReportFilterOptions
): void {
  const wb = XLSX.utils.book_new();
  const printTime = getReportGeneratedTimestamp();
  const periodDesc = getPeriodDescription(filters);
  const filteredTxs = getFilteredTransactions(context.transactions, filters);

  const reportDef = REPORT_CATALOG.find((r) => r.id === reportId) || REPORT_CATALOG[0];
  const filename = `零用金_${reportDef.name}_${filters.yearMonth || filters.year || '報表'}.xlsx`;

  if (reportId === 'tx_details') {
    const data = buildTxDetailsReport(filteredTxs);

    // 1. 主要明細表（收支分開列示：獨立「收入金額」與「支出金額」欄位）
    const rows = data.rows.map((t, idx) => {
      const isIncome = t.type === 'income';
      return {
        '序號': idx + 1,
        '傳票編號': t.voucherNo || t.id,
        '記帳日期': t.date,
        '收支類型': isIncome ? '🟢 撥補入金' : '🔴 零用支出',
        '科目分類': t.categoryName,
        '細項/店家/來源': t.subItem,
        '收入金額 (NT$)': isIncome ? t.amount : '',
        '支出金額 (NT$)': !isIncome ? t.amount : '',
        '經辦/請領人': t.claimant || '-',
        '憑證類型': t.receiptType === 'invoice' ? '統一發票' : t.receiptType === 'receipt' ? '收據' : '無憑證',
        '發票號碼': t.invoiceNumber || '-',
        '用餐人數': t.peopleCount && t.peopleCount > 1 ? `${t.peopleCount}人` : '-',
        '備註說明': t.note || '-'
      };
    });

    // 合計列
    rows.push({
      '序號': '【合計】',
      '傳票編號': `共 ${data.count} 筆`,
      '記帳日期': periodDesc,
      '收支類型': `結存淨差額 $${data.netBalance.toLocaleString()}`,
      '科目分類': '-',
      '細項/店家/來源': `收入 ${data.incomeCount} 筆 / 支出 ${data.expenseCount} 筆`,
      '收入金額 (NT$)': data.totalIncome,
      '支出金額 (NT$)': data.totalExpense,
      '經辦/請領人': `發票 ${data.invoiceCount} 張`,
      '憑證類型': `收據 ${data.receiptCount} 張`,
      '發票號碼': `無證 ${data.noDocCount} 筆`,
      '用餐人數': '-',
      '備註說明': `報表列印時間: ${printTime}`
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },  // 序號
      { wch: 20 }, // 傳票編號
      { wch: 13 }, // 記帳日期
      { wch: 14 }, // 收支類型
      { wch: 16 }, // 科目分類
      { wch: 26 }, // 細項/店家/來源
      { wch: 16 }, // 收入金額
      { wch: 16 }, // 支出金額
      { wch: 14 }, // 經辦/請領人
      { wch: 12 }, // 憑證類型
      { wch: 16 }, // 發票號碼
      { wch: 10 }, // 用餐人數
      { wch: 28 }  // 備註說明
    ];
    XLSX.utils.book_append_sheet(wb, ws, '帳務明細(收支分欄)');

    // 2. 獨立「零用金支出明細」工作表（更直觀單獨檢視所有開銷）
    const expenseRows = data.rows
      .filter((t) => t.type === 'expense')
      .map((t, idx) => ({
        '序號': idx + 1,
        '傳票編號': t.voucherNo || t.id,
        '支出日期': t.date,
        '支出科目': t.categoryName,
        '開銷細項/店家': t.subItem,
        '支出金額 (NT$)': t.amount,
        '請領同仁': t.claimant || '-',
        '憑證類型': t.receiptType === 'invoice' ? '統一發票' : t.receiptType === 'receipt' ? '收據' : '無憑證',
        '發票號碼': t.invoiceNumber || '-',
        '用餐人數': t.peopleCount && t.peopleCount > 1 ? `${t.peopleCount}人` : '-',
        '備註說明': t.note || '-'
      }));

    expenseRows.push({
      '序號': '【支出總計】',
      '傳票編號': `共 ${data.expenseCount} 筆開支`,
      '支出日期': periodDesc,
      '支出科目': '-',
      '開銷細項/店家': '零用金開銷總額',
      '支出金額 (NT$)': data.totalExpense,
      '請領同仁': `發票 ${data.invoiceCount} 張 / 收據 ${data.receiptCount} 張`,
      '憑證類型': `無憑證 ${data.noDocCount} 筆`,
      '發票號碼': '-',
      '用餐人數': '-',
      '備註說明': `列印時間: ${printTime}`
    } as any);

    const wsExpense = XLSX.utils.json_to_sheet(expenseRows);
    wsExpense['!cols'] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 13 },
      { wch: 16 },
      { wch: 26 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 10 },
      { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(wb, wsExpense, '零用金支出明細');

    // 3. 獨立「撥補收入明細」工作表（更直觀單獨檢視所有入帳款項）
    const incomeRows = data.rows
      .filter((t) => t.type === 'income')
      .map((t, idx) => ({
        '序號': idx + 1,
        '傳票編號': t.voucherNo || t.id,
        '撥入日期': t.date,
        '收入科目': t.categoryName,
        '撥入來源/品項': t.subItem,
        '收入金額 (NT$)': t.amount,
        '經辦同仁/出納': t.claimant || '公司出納',
        '備註說明': t.note || '-'
      }));

    incomeRows.push({
      '序號': '【撥補總計】',
      '傳票編號': `共 ${data.incomeCount} 筆撥補`,
      '撥入日期': periodDesc,
      '收入科目': '-',
      '撥入來源/品項': '撥補入金總額',
      '收入金額 (NT$)': data.totalIncome,
      '經辦同仁/出納': '-',
      '備註說明': `列印時間: ${printTime}`
    } as any);

    const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
    wsIncome['!cols'] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 13 },
      { wch: 16 },
      { wch: 26 },
      { wch: 16 },
      { wch: 16 },
      { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(wb, wsIncome, '撥補收入明細');
  } else if (reportId === 'daily_summary') {
    const data = buildDailySummaryReport(filteredTxs);
    const rows = data.rows.map((r) => ({
      '記帳日期': r.date,
      '星期': r.dayOfWeek,
      '本日撥入 (NT$)': r.income,
      '本日支出 (NT$)': r.expense,
      '本日淨額 (NT$)': r.net,
      '累計結餘 (NT$)': r.cumulativeBalance,
      '單據筆數': r.txCount,
      '主要開銷備註摘要': r.notes
    }));
    rows.push({
      '記帳日期': '【合計】',
      '星期': `${data.totalDays} 天有收支`,
      '本日撥入 (NT$)': data.totalIncome,
      '本日支出 (NT$)': data.totalExpense,
      '本日淨額 (NT$)': data.netBalance,
      '累計結餘 (NT$)': data.netBalance,
      '單據筆數': data.rows.reduce((s, r) => s + r.txCount, 0),
      '主要開銷備註摘要': `列印時間: ${printTime}`
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, '收支日報表');
  } else if (reportId === 'category_stats') {
    const data = buildCategoryStatsReport(filteredTxs, context.categories);
    const rows = data.rows.map((r, idx) => ({
      '排名': idx + 1,
      '支出科目': r.name,
      '支出金額 (NT$)': r.amount,
      '佔比 (%)': `${r.percentage.toFixed(1)}%`,
      '開支筆數': r.count,
      '平均每筆 (NT$)': r.avgPerTx,
      '主要店家/細項': r.topSubItem,
      '主要請領同仁': r.topClaimant
    }));
    rows.push({
      '排名': '【合計】',
      '支出科目': '零用金費用總計',
      '支出金額 (NT$)': data.totalExpense,
      '佔比 (%)': '100.0%',
      '開支筆數': data.totalCount,
      '平均每筆 (NT$)': data.overallAvg,
      '主要店家/細項': `期間: ${periodDesc}`,
      '主要請領同仁': `列印時間: ${printTime}`
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, '項目分類統計');
  } else if (reportId === 'yearly_summary') {
    const yr = filters.year || filters.yearMonth.split('-')[0] || new Date().getFullYear().toString();
    const data = buildYearlySummaryReport(context.transactions, yr);
    const rows = data.rows.map((r) => ({
      '月份': r.monthName,
      '撥補入帳 (NT$)': r.income,
      '零用金支出 (NT$)': r.expense,
      '收支差額 (NT$)': r.net,
      '累計結存 (NT$)': r.cumulativeBalance,
      '筆數': r.txCount
    }));
    rows.push({
      '月份': '【全年總計】',
      '撥補入帳 (NT$)': data.totalIncome,
      '零用金支出 (NT$)': data.totalExpense,
      '收支差額 (NT$)': data.netBalance,
      '累計結存 (NT$)': data.netBalance,
      '筆數': data.rows.reduce((s, r) => s + r.txCount, 0)
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, `${yr}年度收支統計`);
  } else if (reportId === 'yearly_matrix') {
    const yr = filters.year || filters.yearMonth.split('-')[0] || new Date().getFullYear().toString();
    const data = buildYearlyMatrixReport(context.transactions, context.categories, yr);
    const rows = data.rows.map((r) => {
      const obj: any = { '支出科目': r.name };
      for (let i = 0; i < 12; i++) {
        obj[`${i + 1}月`] = r.months[i];
      }
      obj['全年合計'] = r.total;
      obj['佔比 (%)'] = `${data.grandTotal > 0 ? ((r.total / data.grandTotal) * 100).toFixed(1) : 0}%`;
      return obj;
    });

    // 總計列
    const totalRow: any = { '支出科目': '【每月支出合計】' };
    for (let i = 0; i < 12; i++) {
      totalRow[`${i + 1}月`] = data.monthlyTotals[i];
    }
    totalRow['全年合計'] = data.grandTotal;
    totalRow['佔比 (%)'] = '100.0%';
    rows.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${yr}年度彙總樞紐表`);
  } else {
    // 預設匯出帳務明細
    const data = buildTxDetailsReport(filteredTxs);
    const ws = XLSX.utils.json_to_sheet(data.rows);
    XLSX.utils.book_append_sheet(wb, ws, reportDef.name);
  }

  XLSX.writeFile(wb, filename);
}

// =========================================================================
// 多選報表打包匯出 Excel (自選多個報表，每個報表一個 Sheet)
// =========================================================================
export function exportMultipleSelectedReportsExcel(
  reportIds: string[],
  context: ReportContextData,
  filters: ReportFilterOptions
): void {
  if (reportIds.length === 0) return;
  const wb = XLSX.utils.book_new();
  const printTime = getReportGeneratedTimestamp();
  const periodDesc = getPeriodDescription(filters);
  const filteredTxs = getFilteredTransactions(context.transactions, filters);

  reportIds.forEach((id) => {
    const reportDef = REPORT_CATALOG.find((r) => r.id === id);
    if (!reportDef) return;

    if (id === 'tx_details') {
      const data = buildTxDetailsReport(filteredTxs);
      const rows = data.rows.map((t, idx) => {
        const isIncome = t.type === 'income';
        return {
          '序號': idx + 1,
          '傳票編號': t.voucherNo || t.id,
          '記帳日期': t.date,
          '收支類型': isIncome ? '🟢 撥補入金' : '🔴 零用支出',
          '科目分類': t.categoryName,
          '細項/店家/來源': t.subItem,
          '收入金額 (NT$)': isIncome ? t.amount : '',
          '支出金額 (NT$)': !isIncome ? t.amount : '',
          '經辦/請領人': t.claimant || '-',
          '憑證類型': t.receiptType === 'invoice' ? '統一發票' : t.receiptType === 'receipt' ? '收據' : '無憑證',
          '發票號碼': t.invoiceNumber || '-',
          '用餐人數': t.peopleCount && t.peopleCount > 1 ? `${t.peopleCount}人` : '-',
          '備註說明': t.note || '-'
        };
      });

      // 合計列
      rows.push({
        '序號': '【合計】',
        '傳票編號': `共 ${data.count} 筆`,
        '記帳日期': periodDesc,
        '收支類型': `淨差額 $${data.netBalance.toLocaleString()}`,
        '科目分類': '-',
        '細項/店家/來源': `收入 ${data.incomeCount} 筆 / 支出 ${data.expenseCount} 筆`,
        '收入金額 (NT$)': data.totalIncome,
        '支出金額 (NT$)': data.totalExpense,
        '經辦/請領人': `發票 ${data.invoiceCount} 張`,
        '憑證類型': `收據 ${data.receiptCount} 張`,
        '發票號碼': `無證 ${data.noDocCount} 筆`,
        '用餐人數': '-',
        '備註說明': `列印時間: ${printTime}`
      } as any);

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 8 },  // 序號
        { wch: 20 }, // 傳票編號
        { wch: 13 }, // 記帳日期
        { wch: 14 }, // 收支類型
        { wch: 16 }, // 科目分類
        { wch: 26 }, // 細項/店家/來源
        { wch: 16 }, // 收入金額
        { wch: 16 }, // 支出金額
        { wch: 14 }, // 經辦/請領人
        { wch: 12 }, // 憑證類型
        { wch: 16 }, // 發票號碼
        { wch: 10 }, // 用餐人數
        { wch: 28 }  // 備註說明
      ];
      XLSX.utils.book_append_sheet(wb, ws, '帳務記錄明細表');
    } else if (id === 'daily_summary') {
      const data = buildDailySummaryReport(filteredTxs);
      const rows = data.rows.map((r) => ({
        '記帳日期': r.date,
        '星期': r.dayOfWeek,
        '本日撥入 (NT$)': r.income,
        '本日支出 (NT$)': r.expense,
        '本日淨額 (NT$)': r.net,
        '累計結餘 (NT$)': r.cumulativeBalance,
        '單據筆數': r.txCount,
        '主要開銷備註摘要': r.notes
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '收支日報表');
    } else if (id === 'category_stats') {
      const data = buildCategoryStatsReport(filteredTxs, context.categories);
      const rows = data.rows.map((r, idx) => ({
        '排名': idx + 1,
        '支出科目': r.name,
        '支出金額 (NT$)': r.amount,
        '佔比 (%)': `${r.percentage.toFixed(1)}%`,
        '開支筆數': r.count,
        '平均每筆 (NT$)': r.avgPerTx,
        '主要店家/細項': r.topSubItem,
        '主要請領同仁': r.topClaimant
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '項目分類統計表');
    } else if (id === 'yearly_summary') {
      const yr = filters.year || filters.yearMonth.split('-')[0] || new Date().getFullYear().toString();
      const data = buildYearlySummaryReport(context.transactions, yr);
      const rows = data.rows.map((r) => ({
        '月份': r.monthName,
        '撥補入帳 (NT$)': r.income,
        '零用金支出 (NT$)': r.expense,
        '收支差額 (NT$)': r.net,
        '累計結存 (NT$)': r.cumulativeBalance,
        '筆數': r.txCount
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `${yr}年度收支統計表`);
    } else if (id === 'yearly_matrix') {
      const yr = filters.year || filters.yearMonth.split('-')[0] || new Date().getFullYear().toString();
      const data = buildYearlyMatrixReport(context.transactions, context.categories, yr);
      const rows = data.rows.map((r) => {
        const obj: any = { '支出科目': r.name };
        for (let i = 0; i < 12; i++) {
          obj[`${i + 1}月`] = r.months[i];
        }
        obj['全年合計'] = r.total;
        obj['佔比 (%)'] = `${data.grandTotal > 0 ? ((r.total / data.grandTotal) * 100).toFixed(1) : 0}%`;
        return obj;
      });
      const totalRow: any = { '支出科目': '【每月支出合計】' };
      for (let i = 0; i < 12; i++) {
        totalRow[`${i + 1}月`] = data.monthlyTotals[i];
      }
      totalRow['全年合計'] = data.grandTotal;
      totalRow['佔比 (%)'] = '100.0%';
      rows.push(totalRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `${yr}年度彙總樞紐表`);
    }
  });

  const filename = `零用金_自選財務統計報表_${filters.yearMonth || filters.year || '綜合'}.xlsx`;
  XLSX.writeFile(wb, filename);
}
