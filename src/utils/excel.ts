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

  const expensesOnly = filtered.filter((t) => t.type === 'expense');
  const incomesOnly = filtered.filter((t) => t.type === 'income');
  const totalExpense = expensesOnly.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomesOnly.reduce((sum, t) => sum + t.amount, 0);
  const netPettyCash = totalIncome - totalExpense;

  // 憑證統計計算
  let invoiceCount = 0;
  let invoiceAmount = 0;
  let receiptCount = 0;
  let receiptAmount = 0;
  let noDocCount = 0;
  let noDocAmount = 0;
  let totalDiningPeople = 0;

  expensesOnly.forEach((t) => {
    if (t.peopleCount) totalDiningPeople += t.peopleCount;

    if (t.receiptType === 'invoice') {
      invoiceCount++;
      invoiceAmount += t.amount;
    } else if (t.receiptType === 'receipt') {
      receiptCount++;
      receiptAmount += t.amount;
    } else {
      noDocCount++;
      noDocAmount += t.amount;
    }
  });

  // 1. 建立「零用金收支流水明細」
  const detailRows: any[] = filtered.map((t, idx) => {
    const isExpense = t.type === 'expense';
    const perPerson =
      isExpense && t.peopleCount && t.peopleCount > 1
        ? Math.round(t.amount / t.peopleCount)
        : t.amount;

    let receiptLabel = '無憑證';
    if (t.receiptType === 'invoice') receiptLabel = '🧾 發票';
    else if (t.receiptType === 'receipt') receiptLabel = '📄 收據';

    return {
      '流水序號': idx + 1,
      '交易日期': t.date,
      '收支屬性': isExpense ? '零用金支出' : '零用金撥補',
      '請領同仁': isExpense ? (t.claimant || '未指定') : '撥補入帳',
      '主分類': t.categoryName, // 靜態快照資料
      '憑證類型': isExpense ? receiptLabel : '-',
      '發票號碼': isExpense ? (t.invoiceNumber || '-') : '-',
      '項目 (店家/站點/細項/來源)': t.subItem || '無', // 靜態快照資料
      '用餐人數': t.peopleCount ? `${t.peopleCount} 人` : '-',
      '每人均攤 (NT$)': t.peopleCount && t.peopleCount > 1 ? perPerson : '-',
      '金額 (NT$)': t.amount,
      '備註說明': t.note || ''
    };
  });

  // 在流水明細底端加入「統計項目」彙整列
  detailRows.push({
    '流水序號': '【統計合計】',
    '交易日期': `共 ${filtered.length} 筆明細`,
    '收支屬性': `支出 ${expensesOnly.length} 筆 / 撥補 ${incomesOnly.length} 筆`,
    '請領同仁': `支出總計 NT$ ${totalExpense.toLocaleString()}`,
    '主分類': `撥補總計 NT$ ${totalIncome.toLocaleString()}`,
    '憑證類型': `發票${invoiceCount}張/收據${receiptCount}張/無${noDocCount}筆`,
    '發票號碼': `結餘差額 NT$ ${netPettyCash.toLocaleString()}`,
    '項目 (店家/站點/細項/來源)': `有憑證比例: ${totalExpense > 0 ? (((invoiceAmount + receiptAmount) / totalExpense) * 100).toFixed(1) : 100}%`,
    '用餐人數': totalDiningPeople > 0 ? `共 ${totalDiningPeople} 人次` : '-',
    '每人均攤 (NT$)': '-',
    '金額 (NT$)': totalExpense,
    '備註說明': `淨差額 NT$ ${netPettyCash.toLocaleString()} (撥補 - 支出)`
  });

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);

  // 設定明細表欄寬
  detailSheet['!cols'] = [
    { wch: 12 }, // 流水序號
    { wch: 14 }, // 交易日期
    { wch: 16 }, // 收支屬性
    { wch: 18 }, // 請領同仁
    { wch: 14 }, // 主分類
    { wch: 12 }, // 憑證類型
    { wch: 16 }, // 發票號碼
    { wch: 26 }, // 項目 (店家/站點/同仁/來源)
    { wch: 12 }, // 用餐人數
    { wch: 14 }, // 每人均攤
    { wch: 16 }, // 金額
    { wch: 36 }  // 備註說明
  ];

  // 2. 建立「零用金支出分類統計」與「憑證統計」
  const categoryMap: Record<string, { count: number; total: number }> = {};
  expensesOnly.forEach((t) => {
    const cat = t.categoryName || '其他';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, total: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].total += t.amount;
  });

  const summaryRows: any[] = [
    { '項目分類': '===【支出主分類統計】===', '開支筆數': '', '金額小計 (NT$)': '', '支出比重': '' }
  ];

  Object.entries(categoryMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([catName, stats]) => {
      const percentage = totalExpense > 0 ? ((stats.total / totalExpense) * 100).toFixed(1) + '%' : '0%';
      summaryRows.push({
        '項目分類': catName,
        '開支筆數': stats.count,
        '金額小計 (NT$)': stats.total,
        '支出比重': percentage
      });
    });

  // 主分類合計列
  summaryRows.push({
    '項目分類': '【總支出合計】',
    '開支筆數': expensesOnly.length,
    '金額小計 (NT$)': totalExpense,
    '支出比重': '100.0%'
  });

  // 空行分隔
  summaryRows.push({ '項目分類': '', '開支筆數': '', '金額小計 (NT$)': '', '支出比重': '' });
  summaryRows.push({ '項目分類': '===【憑證類型統計項目】===', '開支筆數': '', '金額小計 (NT$)': '', '支出比重': '' });

  summaryRows.push({
    '項目分類': '🧾 統一發票 (含發票號碼)',
    '開支筆數': invoiceCount,
    '金額小計 (NT$)': invoiceAmount,
    '支出比重': totalExpense > 0 ? ((invoiceAmount / totalExpense) * 100).toFixed(1) + '%' : '0%'
  });

  summaryRows.push({
    '項目分類': '📄 免用統一發票收據 / 單據',
    '開支筆數': receiptCount,
    '金額小計 (NT$)': receiptAmount,
    '支出比重': totalExpense > 0 ? ((receiptAmount / totalExpense) * 100).toFixed(1) + '%' : '0%'
  });

  summaryRows.push({
    '項目分類': '❌ 無憑證開銷',
    '開支筆數': noDocCount,
    '金額小計 (NT$)': noDocAmount,
    '支出比重': totalExpense > 0 ? ((noDocAmount / totalExpense) * 100).toFixed(1) + '%' : '0%'
  });

  // 空行分隔
  summaryRows.push({ '項目分類': '', '開支筆數': '', '金額小計 (NT$)': '', '支出比重': '' });
  summaryRows.push({ '項目分類': '===【請領同仁統計項目】===', '開支筆數': '', '金額小計 (NT$)': '', '支出比重': '' });

  const claimantMap: Record<string, { count: number; total: number }> = {};
  expensesOnly.forEach((t) => {
    const cl = t.claimant || '未指定';
    if (!claimantMap[cl]) claimantMap[cl] = { count: 0, total: 0 };
    claimantMap[cl].count += 1;
    claimantMap[cl].total += t.amount;
  });

  Object.entries(claimantMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([clName, stats]) => {
      summaryRows.push({
        '項目分類': clName,
        '開支筆數': stats.count,
        '金額小計 (NT$)': stats.total,
        '支出比重': totalExpense > 0 ? ((stats.total / totalExpense) * 100).toFixed(1) + '%' : '0%'
      });
    });

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 30 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 }
  ];

  // 3. 建立「零用金水位與撥補分析」
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
    { '零用金指標': '總開支筆數', '財務數據': `${expensesOnly.length} 筆` },
    { '零用金指標': '零用金總開支 (NT$)', '財務數據': totalExpense.toLocaleString() },
    { '零用金指標': '本期撥補筆數', '財務數據': `${incomesOnly.length} 筆` },
    { '零用金指標': '本期撥補總額 (NT$)', '財務數據': totalIncome.toLocaleString() },
    { '零用金指標': '實體結存差額 (NT$)', '財務數據': netPettyCash.toLocaleString() },
    { '零用金指標': '發票開支總額 (含號碼)', '財務數據': `NT$ ${invoiceAmount.toLocaleString()} (${invoiceCount} 筆)` },
    { '零用金指標': '收據開支總額', '財務數據': `NT$ ${receiptAmount.toLocaleString()} (${receiptCount} 筆)` },
    { '零用金指標': '無憑證開支總額', '財務數據': `NT$ ${noDocAmount.toLocaleString()} (${noDocCount} 筆)` },
    { '零用金指標': '單據憑證合法覆蓋率', '財務數據': `${totalExpense > 0 ? (((invoiceAmount + receiptAmount) / totalExpense) * 100).toFixed(1) : 100}%` },
    { '零用金指標': '零用金核定額度 (NT$)', '財務數據': budgetVal > 0 ? budgetVal.toLocaleString() : '未設定' },
    { '零用金指標': '剩餘可用額度 (NT$)', '財務數據': budgetVal > 0 ? remainingBudget.toLocaleString() : '-' },
    { '零用金指標': '額度使用比率', '財務數據': budgetUsageRate },
    { '零用金指標': '撥補警示狀態', '財務數據': alertStatus },
    { '零用金指標': '資料保存機制', '財務數據': '單機靜態資料寫入 (Snapshot Pattern)' },
    { '零用金指標': '報表匯出時間', '財務數據': new Date().toLocaleString('zh-TW') }
  ];

  const reportSheet = XLSX.utils.json_to_sheet(reportRows);
  reportSheet['!cols'] = [{ wch: 26 }, { wch: 36 }];

  // 組合活頁簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, detailSheet, '零用金流水明細與統計');
  XLSX.utils.book_append_sheet(workbook, summarySheet, '分類與憑證統計表');
  XLSX.utils.book_append_sheet(workbook, reportSheet, '零用金總體財務指標');

  // 檔名設定
  const filePrefix = yearMonthFilter ? `${yearMonthFilter}_公司零用金收支報表` : '全歷史_公司零用金收支報表';
  const fileName = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // 觸發下載
  XLSX.writeFile(workbook, fileName);
}
