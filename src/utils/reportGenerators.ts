import * as XLSX from 'xlsx';
import { Transaction, CategoryConfig, MonthBudget, SubAccount, DirectorWithdrawal } from '../types';

export interface ReportDefinition {
  id: string;
  code: string;
  name: string;
  category: '明細與流水帳類' | '項目分類統計類' | '損益與收支淨值類';
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
  },

  // 3. 損益與收支淨值類
  {
    id: 'income_statement',
    code: '06',
    name: '損益表 (收支損益分析)',
    category: '損益與收支淨值類',
    shortDesc: '營業收入撥補 vs 營業費用零星開銷 vs 本期收支淨損益結餘',
    iconName: 'Receipt'
  },
  {
    id: 'net_cash_flow',
    code: '07',
    name: '收支淨值報表 (淨值流量表)',
    category: '損益與收支淨值類',
    shortDesc: '各期現金流入、流出、淨現金流量與累計零用金水位變化',
    iconName: 'Activity'
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
        notes: []
      };
    }
    if (t.type === 'income') {
      map[t.date].income += t.amount;
    } else {
      map[t.date].expense += t.amount;
    }
    map[t.date].txCount += 1;
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
      notes: item.notes.join('； ')
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
  }> = {};

  categories.forEach((c) => {
    if (c.type === 'expense') {
      catMap[c.id] = {
        id: c.id,
        name: c.name,
        amount: 0,
        count: 0,
        subItems: {},
        claimants: {}
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
        claimants: {}
      };
    }
    catMap[id].amount += t.amount;
    catMap[id].count += 1;

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
        topClaimant: topClaimant ? `${topClaimant[0]} ($${topClaimant[1].toLocaleString()})` : '-'
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
      count: 0
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
      txCount: m.count
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
    const rows = data.rows.map((t, idx) => ({
      '序號': idx + 1,
      '記帳日期': t.date,
      '收支類型': t.type === 'income' ? '撥補入金' : '零用金支出',
      '科目分類': t.categoryName,
      '細項/店家': t.subItem,
      '金額 (NT$)': t.amount,
      '經辦/請領人': t.claimant || '-',
      '憑證類型': t.receiptType === 'invoice' ? '統一發票' : t.receiptType === 'receipt' ? '收據' : '無憑證',
      '發票號碼': t.invoiceNumber || '-',
      '備註說明': t.note || '-'
    }));

    // 合計列
    rows.push({
      '序號': '【總計】',
      '記帳日期': `共 ${data.count} 筆`,
      '收支類型': `總支出 $${data.totalExpense.toLocaleString()}`,
      '科目分類': `總撥補 $${data.totalIncome.toLocaleString()}`,
      '細項/店家': `淨額 $${data.netBalance.toLocaleString()}`,
      '金額 (NT$)': data.totalExpense,
      '經辦/請領人': `發票 ${data.invoiceCount} 張`,
      '憑證類型': `收據 ${data.receiptCount} 張`,
      '發票號碼': `無證 ${data.noDocCount} 筆`,
      '備註說明': `報表列印時間: ${printTime}`
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, '帳務記錄明細');
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
  } else if (reportId === 'income_statement') {
    const data = buildIncomeStatementReport(filteredTxs);
    const rows = [
      { '財務會計科目': '【一、營業撥補收入總計】', '金額 (NT$)': data.totalIncome, '比率': '100.0%', '說明備註': '零用金撥補款項' },
      ...data.expenseItems.map((e) => ({
        '財務會計科目': `　營業費用 - ${e.name}`,
        '金額 (NT$)': e.amount,
        '比率': `${e.percentage.toFixed(1)}%`,
        '說明備註': '各項日常零星開支'
      })),
      { '財務會計科目': '【二、零用金費用支出總計】', '金額 (NT$)': data.totalExpense, '比率': '100.0%', '說明備註': '本期全部開銷' },
      { '財務會計科目': '【三、本期收支淨損益結餘】', '金額 (NT$)': data.netProfit, '比率': '-', '說明備註': data.netProfit >= 0 ? '資金充裕' : '超支請款' }
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, '收支損益表');
  } else if (reportId === 'net_cash_flow') {
    const keyStr = filters.yearMonth || filters.year || '';
    const data = buildNetCashFlowReport(context.transactions, filters.periodType === 'year' ? 'year' : 'month', keyStr);
    const rows = [
      { '指標項目': '統計期間', '金額 (NT$)': data.period, '狀態/說明': '現金流量統計期間' },
      { '指標項目': '零用金撥入款項 (流入總計)', '金額 (NT$)': data.inflow, '狀態/說明': `共 ${data.inflowCount} 筆入金` },
      { '指標項目': '零用金日常開銷 (流出總計)', '金額 (NT$)': data.outflow, '狀態/說明': `共 ${data.outflowCount} 筆支出` },
      { '指標項目': '本期淨現金流量 (淨額)', '金額 (NT$)': data.netFlow, '狀態/說明': data.status },
      { '指標項目': '報表產出時間', '金額 (NT$)': printTime, '狀態/說明': `基準: ${periodDesc}` }
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, '收支淨值報表');
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
  const filteredTxs = getFilteredTransactions(context.transactions, filters);

  reportIds.forEach((id) => {
    const reportDef = REPORT_CATALOG.find((r) => r.id === id);
    if (!reportDef) return;

    if (id === 'tx_details') {
      const data = buildTxDetailsReport(filteredTxs);
      const rows = data.rows.map((t, idx) => ({
        '序號': idx + 1,
        '記帳日期': t.date,
        '收支類型': t.type === 'income' ? '撥補入金' : '零用金支出',
        '科目分類': t.categoryName,
        '細項/店家': t.subItem,
        '金額 (NT$)': t.amount,
        '經辦/請領人': t.claimant || '-',
        '憑證類型': t.receiptType === 'invoice' ? '統一發票' : t.receiptType === 'receipt' ? '收據' : '無憑證',
        '發票號碼': t.invoiceNumber || '-',
        '備註說明': t.note || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
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
    } else if (id === 'income_statement') {
      const data = buildIncomeStatementReport(filteredTxs);
      const rows = [
        { '財務會計科目': '【一、營業撥補收入總計】', '金額 (NT$)': data.totalIncome, '比率': '100.0%' },
        ...data.expenseItems.map((e) => ({
          '財務會計科目': `　營業費用 - ${e.name}`,
          '金額 (NT$)': e.amount,
          '比率': `${e.percentage.toFixed(1)}%`
        })),
        { '財務會計科目': '【二、零用金費用支出總計】', '金額 (NT$)': data.totalExpense, '比率': '100.0%' },
        { '財務會計科目': '【三、本期收支淨損益結餘】', '金額 (NT$)': data.netProfit, '比率': '-' }
      ];
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '損益表');
    } else if (id === 'net_cash_flow') {
      const keyStr = filters.yearMonth || filters.year || '';
      const data = buildNetCashFlowReport(context.transactions, filters.periodType === 'year' ? 'year' : 'month', keyStr);
      const rows = [
        { '指標項目': '統計期間', '金額 (NT$)': data.period, '狀態/備註': '現金流量期間' },
        { '指標項目': '零用金撥入款項 (流入)', '金額 (NT$)': data.inflow, '狀態/備註': `${data.inflowCount} 筆入帳` },
        { '指標項目': '零用金開銷支出 (流出)', '金額 (NT$)': data.outflow, '狀態/備註': `${data.outflowCount} 筆支出` },
        { '指標項目': '本期淨現金流量 (淨額)', '金額 (NT$)': data.netFlow, '狀態/備註': data.status }
      ];
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, '收支淨值報表');
    }
  });

  const filename = `零用金_自選財務統計報表_${filters.yearMonth || filters.year || '綜合'}.xlsx`;
  XLSX.writeFile(wb, filename);
}
