import * as XLSX from 'xlsx';
import { Transaction, MonthBudget } from '../types';

export function exportTransactionsToExcel(
  transactions: Transaction[],
  yearMonthFilter?: string,
  currentBudget?: MonthBudget
): void {
  // 篩選欲匯出的資料（若有指定月份）
  const filtered = yearMonthFilter
    ? transactions.filter((t) => t.date.startsWith(yearMonthFilter))
    : [...transactions];

  // 依照日期排序（由近到遠）
  filtered.sort((a, b) => (b.date > a.date ? 1 : -1));

  // 1. 建立「零用金收支流水明細」
  const detailRows = filtered.map((t, idx) => {
    const isExpense = t.type === 'expense';
    const perPerson =
      isExpense && t.peopleCount && t.peopleCount > 1
        ? Math.round(t.amount / t.peopleCount)
        : t.amount;

    return {
      '流水序號': idx + 1,
      '交易日期': t.date,
      '收支屬性': isExpense ? '零用金支出' : '零用金撥補',
      '請領同仁': isExpense ? (t.claimant || '未指定') : '撥補入帳',
      '主分類': t.categoryName, // 靜態快照資料
      '項目 (店家/站點/細項/來源)': t.subItem || '無', // 靜態快照資料
      '用餐人數': t.peopleCount ? `${t.peopleCount} 人` : '-',
      '每人均攤 (NT$)': t.peopleCount && t.peopleCount > 1 ? perPerson : '-',
      '金額 (NT$)': t.amount,
      '備註說明': t.note || ''
    };
  });

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);

  // 設定明細表欄寬
  detailSheet['!cols'] = [
    { wch: 10 }, // 流水序號
    { wch: 14 }, // 交易日期
    { wch: 14 }, // 收支屬性
    { wch: 16 }, // 請領同仁
    { wch: 14 }, // 主分類
    { wch: 24 }, // 項目 (店家/站點/同仁/來源)
    { wch: 12 }, // 用餐人數
    { wch: 14 }, // 每人均攤
    { wch: 14 }, // 金額
    { wch: 32 }  // 備註說明
  ];

  // 2. 建立「零用金支出分類統計」
  const expensesOnly = filtered.filter((t) => t.type === 'expense');
  const totalExpense = expensesOnly.reduce((sum, t) => sum + t.amount, 0);

  const categoryMap: Record<string, { count: number; total: number }> = {};
  expensesOnly.forEach((t) => {
    const cat = t.categoryName || '其他';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, total: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].total += t.amount;
  });

  const summaryRows = Object.entries(categoryMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([catName, stats]) => {
      const percentage = totalExpense > 0 ? ((stats.total / totalExpense) * 100).toFixed(1) + '%' : '0%';
      return {
        '支出分類 (靜態快照)': catName,
        '開支筆數': stats.count,
        '支出總額 (NT$)': stats.total,
        '支出佔比': percentage
      };
    });

  // 加總列
  summaryRows.push({
    '支出分類 (靜態快照)': '【當期支出合計】',
    '開支筆數': expensesOnly.length,
    '支出總額 (NT$)': totalExpense,
    '支出佔比': '100.0%'
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 }
  ];

  // 3. 建立「零用金水位與撥補分析」
  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const netPettyCash = totalIncome - totalExpense;
  const budgetVal = currentBudget?.budgetAmount || 0;
  const remainingBudget = budgetVal - totalExpense;
  const budgetUsageRate = budgetVal > 0 ? ((totalExpense / budgetVal) * 100).toFixed(1) + '%' : '未設定';

  let alertStatus = '水位良好正常';
  if (budgetVal > 0) {
    if (remainingBudget < 0) {
      alertStatus = `已超額 NT$ ${Math.abs(remainingBudget).toLocaleString()} (請儘速請款歸墊)`;
    } else if (remainingBudget <= budgetVal * ((currentBudget?.alertThresholdPercent || 20) / 100)) {
      alertStatus = '低於警戒線 (應備妥單據辦理撥補)';
    }
  }

  const reportRows = [
    { '零用金指標': '統計期間', '財務數據': yearMonthFilter ? `${yearMonthFilter} 月度` : '全歷史明細' },
    { '零用金指標': '零用金總開支 (NT$)', '財務數據': totalExpense.toLocaleString() },
    { '零用金指標': '本期撥補總額 (NT$)', '財務數據': totalIncome.toLocaleString() },
    { '零用金指標': '實體結存差額 (NT$)', '財務數據': netPettyCash.toLocaleString() },
    { '零用金指標': '零用金核定額度 (NT$)', '財務數據': budgetVal > 0 ? budgetVal.toLocaleString() : '未設定' },
    { '零用金指標': '剩餘可用額度 (NT$)', '財務數據': budgetVal > 0 ? remainingBudget.toLocaleString() : '-' },
    { '零用金指標': '額度使用比率', '財務數據': budgetUsageRate },
    { '零用金指標': '撥補警示狀態', '財務數據': alertStatus },
    { '零用金指標': '資料保存機制', '財務數據': '單機靜態資料寫入 (Snapshot Pattern)' },
    { '零用金指標': '報表匯出時間', '財務數據': new Date().toLocaleString('zh-TW') }
  ];

  const reportSheet = XLSX.utils.json_to_sheet(reportRows);
  reportSheet['!cols'] = [{ wch: 24 }, { wch: 32 }];

  // 組合活頁簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, detailSheet, '零用金流水明細');
  XLSX.utils.book_append_sheet(workbook, summarySheet, '支出分類統計');
  XLSX.utils.book_append_sheet(workbook, reportSheet, '零用金水位與撥補分析');

  // 檔名設定
  const filePrefix = yearMonthFilter ? `${yearMonthFilter}_公司零用金收支報表` : '全歷史_公司零用金收支報表';
  const fileName = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // 觸發下載
  XLSX.writeFile(workbook, fileName);
}
