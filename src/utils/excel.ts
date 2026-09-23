import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Transaction, MonthBudget, CategoryConfig, ReceiptType, TransactionType, Customer } from '../types';

/**
 * 匯出完整財務報表至 Excel：
 * 包含：各項統計、收支日報表、分類統計表、收支流水明細、憑證同仁統計表
 * 並於各頁籤清楚註記報表列印產出及列印日期
 */
export function exportTransactionsToExcel(
  transactions: Transaction[],
  yearMonthFilter?: string,
  currentBudget?: MonthBudget
): void {
  const printDateStr = new Date().toLocaleString('zh-TW', { hour12: false });
  const printDateOnly = new Date().toISOString().slice(0, 10);

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

  // ==========================================
  // 1. 【總體財務指標與統計總表】
  // ==========================================
  const budgetVal = currentBudget?.budgetAmount || 0;
  const remainingBudget = budgetVal - totalExpense;
  const budgetUsageRate = budgetVal > 0 ? ((totalExpense / budgetVal) * 100).toFixed(1) + '%' : '未設定核定額度';

  let alertStatus = '水位良好正常';
  if (budgetVal > 0) {
    if (remainingBudget < 0) {
      alertStatus = `已超額 NT$ ${Math.abs(remainingBudget).toLocaleString()} (請儘速請款撥補)`;
    } else if (remainingBudget <= budgetVal * ((currentBudget?.alertThresholdPercent || 20) / 100)) {
      alertStatus = '低於安全警戒線 (應備妥單據辦理撥補)';
    }
  }

  const reportRows = [
    { '零用金財務指標': '【報表名稱】', '數值與財務說明': '公司內部零用金收支管理分析統計總表' },
    { '零用金財務指標': '【報表列印產出日期】', '數值與財務說明': printDateStr },
    { '零用金財務指標': '【資料統計期間】', '數值與財務說明': yearMonthFilter ? `${yearMonthFilter} 月度` : '全部歷史交易明細' },
    { '零用金財務指標': '【製表單位與系統】', '數值與財務說明': '財務部內部管理系統 (零用金管理模組)' },
    { '零用金財務指標': '--------------------', '數值與財務說明': '----------------------------------------' },
    { '零用金財務指標': '本期零用金總支出 (NT$)', '數值與財務說明': `${totalExpense.toLocaleString()} 元` },
    { '零用金財務指標': '本期支出開銷筆數', '數值與財務說明': `${expensesOnly.length} 筆` },
    { '零用金財務指標': '平均單筆開支金額 (NT$)', '數值與財務說明': expensesOnly.length > 0 ? `${Math.round(totalExpense / expensesOnly.length).toLocaleString()} 元` : '0 元' },
    { '零用金財務指標': '本期撥補入帳總額 (NT$)', '數值與財務說明': `${totalIncome.toLocaleString()} 元` },
    { '零用金財務指標': '本期撥補入帳筆數', '數值與財務說明': `${incomesOnly.length} 筆` },
    { '零用金財務指標': '本期淨收支差額 (NT$)', '數值與財務說明': `${netPettyCash.toLocaleString()} 元 (撥入減支出)` },
    { '零用金財務指標': '--------------------', '數值與財務說明': '----------------------------------------' },
    { '零用金財務指標': '統一發票支出總額 (含號碼)', '數值與財務說明': `${invoiceAmount.toLocaleString()} 元 (${invoiceCount} 筆，佔總開支 ${totalExpense > 0 ? ((invoiceAmount / totalExpense) * 100).toFixed(1) : 0}%)` },
    { '零用金財務指標': '收據支出總額', '數值與財務說明': `${receiptAmount.toLocaleString()} 元 (${receiptCount} 筆，佔總開支 ${totalExpense > 0 ? ((receiptAmount / totalExpense) * 100).toFixed(1) : 0}%)` },
    { '零用金財務指標': '無憑證開銷總額', '數值與財務說明': `${noDocAmount.toLocaleString()} 元 (${noDocCount} 筆，佔總開支 ${totalExpense > 0 ? ((noDocAmount / totalExpense) * 100).toFixed(1) : 0}%)` },
    { '零用金財務指標': '單據憑證合法合規比率', '數值與財務說明': `${totalExpense > 0 ? (((invoiceAmount + receiptAmount) / totalExpense) * 100).toFixed(1) : 100}%` },
    { '零用金財務指標': '--------------------', '數值與財務說明': '----------------------------------------' },
    { '零用金財務指標': '餐飲申報總用餐人次', '數值與財務說明': `${totalDiningPeople} 人次` },
    { '零用金財務指標': '零用金月度核定水位 (NT$)', '數值與財務說明': budgetVal > 0 ? `${budgetVal.toLocaleString()} 元` : '未設定' },
    { '零用金財務指標': '額度剩餘可用結餘 (NT$)', '數值與財務說明': budgetVal > 0 ? `${remainingBudget.toLocaleString()} 元` : '-' },
    { '零用金財務指標': '零用金額度使用比率', '數值與財務說明': budgetUsageRate },
    { '零用金財務指標': '水位監控警戒狀態', '數值與財務說明': alertStatus },
    { '零用金財務指標': '資料庫儲存驗證機制', '數值與財務說明': '靜態 Snapshot 快照寫入 ＆ 智慧防重複檢核' }
  ];

  const reportSheet = XLSX.utils.json_to_sheet(reportRows);
  reportSheet['!cols'] = [{ wch: 28 }, { wch: 45 }];

  // ==========================================
  // 2. 【收支日報表】(一般分析帳務必備的核心日報表)
  // ==========================================
  // 依照日期由近到遠（或由遠到近）群組
  const dailyMap: Record<string, {
    date: string;
    dayOfWeek: string;
    expenseTotal: number;
    incomeTotal: number;
    expenseCount: number;
    invoiceCount: number;
    receiptCount: number;
    noDocCount: number;
    itemsSummary: string[];
  }> = {};

  const daysOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  filtered.forEach((t) => {
    const dStr = t.date;
    if (!dailyMap[dStr]) {
      const dObj = new Date(dStr + 'T00:00:00');
      const dayName = isNaN(dObj.getTime()) ? '' : daysOfWeek[dObj.getDay()];
      dailyMap[dStr] = {
        date: dStr,
        dayOfWeek: dayName,
        expenseTotal: 0,
        incomeTotal: 0,
        expenseCount: 0,
        invoiceCount: 0,
        receiptCount: 0,
        noDocCount: 0,
        itemsSummary: []
      };
    }

    if (t.type === 'expense') {
      dailyMap[dStr].expenseTotal += t.amount;
      dailyMap[dStr].expenseCount += 1;
      if (t.receiptType === 'invoice') dailyMap[dStr].invoiceCount += 1;
      else if (t.receiptType === 'receipt') dailyMap[dStr].receiptCount += 1;
      else dailyMap[dStr].noDocCount += 1;

      if (t.subItem && !dailyMap[dStr].itemsSummary.includes(t.subItem)) {
        if (dailyMap[dStr].itemsSummary.length < 3) {
          dailyMap[dStr].itemsSummary.push(t.subItem);
        }
      }
    } else {
      dailyMap[dStr].incomeTotal += t.amount;
      if (t.subItem && !dailyMap[dStr].itemsSummary.includes(t.subItem)) {
        if (dailyMap[dStr].itemsSummary.length < 2) {
          dailyMap[dStr].itemsSummary.push(`[撥入]${t.subItem}`);
        }
      }
    }
  });

  const dailySortedKeys = Object.keys(dailyMap).sort((a, b) => (b > a ? 1 : -1));

  const dailyRows: any[] = [];
  dailySortedKeys.forEach((dKey) => {
    const d = dailyMap[dKey];
    dailyRows.push({
      '交易日期': d.date,
      '星期': d.dayOfWeek,
      '本日撥補入帳 (NT$)': d.incomeTotal,
      '本日支出開銷 (NT$)': d.expenseTotal,
      '本日收支差額 (NT$)': d.incomeTotal - d.expenseTotal,
      '支出筆數': d.expenseCount,
      '發票張數': d.invoiceCount,
      '收據張數': d.receiptCount,
      '無單據數': d.noDocCount,
      '當日主要開銷項目摘要': d.itemsSummary.join('、') || '無開銷',
      '報表產出日期': printDateOnly
    });
  });

  // 日報表合計列
  dailyRows.push({
    '交易日期': '【統計合計】',
    '星期': `共 ${dailySortedKeys.length} 天`,
    '本日撥補入帳 (NT$)': totalIncome,
    '本日支出開銷 (NT$)': totalExpense,
    '本日收支差額 (NT$)': netPettyCash,
    '支出筆數': expensesOnly.length,
    '發票張數': invoiceCount,
    '收據張數': receiptCount,
    '無單據數': noDocCount,
    '當日主要開銷項目摘要': `總計支出 ${totalExpense.toLocaleString()} 元，撥補 ${totalIncome.toLocaleString()} 元`,
    '報表產出日期': printDateStr
  });

  const dailySheet = XLSX.utils.json_to_sheet(dailyRows);
  dailySheet['!cols'] = [
    { wch: 14 },
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 35 },
    { wch: 14 }
  ];

  // ==========================================
  // 3. 【支出分類統計表】
  // ==========================================
  const categoryMap: Record<string, {
    catName: string;
    total: number;
    count: number;
    subItems: Record<string, number>;
    claimants: Set<string>;
  }> = {};

  expensesOnly.forEach((t) => {
    const cName = t.categoryName || '其他雜支';
    if (!categoryMap[cName]) {
      categoryMap[cName] = {
        catName: cName,
        total: 0,
        count: 0,
        subItems: {},
        claimants: new Set()
      };
    }
    categoryMap[cName].total += t.amount;
    categoryMap[cName].count += 1;
    if (t.subItem) {
      categoryMap[cName].subItems[t.subItem] = (categoryMap[cName].subItems[t.subItem] || 0) + t.amount;
    }
    if (t.claimant) {
      categoryMap[cName].claimants.add(t.claimant);
    }
  });

  const categoryRows: any[] = [];
  Object.values(categoryMap)
    .sort((a, b) => b.total - a.total)
    .forEach((cat) => {
      const topItems = Object.entries(cat.subItems)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amt]) => `${name}($${amt})`)
        .join('、');

      categoryRows.push({
        '支出大類名稱': cat.catName,
        '開銷總金額 (NT$)': cat.total,
        '開銷筆數': cat.count,
        '佔總支出比重 (%)': totalExpense > 0 ? ((cat.total / totalExpense) * 100).toFixed(1) + '%' : '0%',
        '平均單筆金額 (NT$)': cat.count > 0 ? Math.round(cat.total / cat.count) : 0,
        '主要開銷店家與品項': topItems || '-',
        '經手請領同仁': Array.from(cat.claimants).join('、') || '未指定',
        '報表產出日期': printDateOnly
      });
    });

  // 分類表合計列
  categoryRows.push({
    '支出大類名稱': '【總支出合計】',
    '開銷總金額 (NT$)': totalExpense,
    '開銷筆數': expensesOnly.length,
    '佔總支出比重 (%)': '100.0%',
    '平均單筆金額 (NT$)': expensesOnly.length > 0 ? Math.round(totalExpense / expensesOnly.length) : 0,
    '主要開銷店家與品項': `共 ${Object.keys(categoryMap).length} 個支出類別`,
    '經手請領同仁': '-',
    '報表產出日期': printDateStr
  });

  const categorySheet = XLSX.utils.json_to_sheet(categoryRows);
  categorySheet['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 35 },
    { wch: 22 },
    { wch: 14 }
  ];

  // ==========================================
  // 4. 【收支流水明細表】(收支分開列示：獨立「收入金額」與「支出金額」欄位)
  // ==========================================
  const detailRows: any[] = filtered.map((t, idx) => {
    const isExpense = t.type === 'expense';
    const perPerson =
      isExpense && t.peopleCount && t.peopleCount > 1
        ? Math.round(t.amount / t.peopleCount)
        : t.amount;

    let receiptLabel = '無憑證';
    if (t.receiptType === 'invoice') receiptLabel = '🧾 統一發票';
    else if (t.receiptType === 'receipt') receiptLabel = '📄 收據';

    return {
      '流水序號': idx + 1,
      '傳票編號(系統ID)': t.voucherNo || t.id,
      '交易日期': t.date,
      '收支屬性': isExpense ? '🔴 零用支出' : '🟢 撥補入帳',
      '請領人/經辦人': t.claimant || '-',
      '主分類': t.categoryName || (isExpense ? '支出' : '撥補'),
      '項目(店家/品項/來源)': t.subItem,
      '收入金額 (NT$)': !isExpense ? t.amount : '',
      '支出金額 (NT$)': isExpense ? t.amount : '',
      '單據憑證類型': receiptLabel,
      '發票號碼': t.invoiceNumber || '-',
      '用餐人數': isExpense && t.peopleCount ? `${t.peopleCount} 人` : '-',
      '每人均攤 (NT$)': isExpense && t.peopleCount && t.peopleCount > 1 ? perPerson : '-',
      '備註說明': t.note || '',
      '報表產出日期': printDateOnly
    };
  });

  // 明細合計列
  detailRows.push({
    '流水序號': '【明細合計】',
    '傳票編號(系統ID)': `總計 ${filtered.length} 筆資料`,
    '交易日期': printDateOnly,
    '收支屬性': `淨結存差額: NT$ ${netPettyCash.toLocaleString()}`,
    '請領人/經辦人': '-',
    '主分類': '-',
    '項目(店家/品項/來源)': `撥補 ${incomesOnly.length} 筆 / 支出 ${expensesOnly.length} 筆`,
    '收入金額 (NT$)': totalIncome,
    '支出金額 (NT$)': totalExpense,
    '單據憑證類型': `發票 ${invoiceCount} 張 / 收據 ${receiptCount} 張`,
    '發票號碼': '-',
    '用餐人數': `${totalDiningPeople} 人次`,
    '每人均攤 (NT$)': '-',
    '備註說明': `結餘淨差額 NT$ ${netPettyCash.toLocaleString()} 元`,
    '報表產出日期': printDateStr
  });

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 13 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 30 },
    { wch: 14 }
  ];

  // 獨立「零用金支出明細表」工作表
  const expenseSheetRows: any[] = expensesOnly.map((t, idx) => {
    const perPerson =
      t.peopleCount && t.peopleCount > 1
        ? Math.round(t.amount / t.peopleCount)
        : t.amount;

    let receiptLabel = '無憑證';
    if (t.receiptType === 'invoice') receiptLabel = '🧾 統一發票';
    else if (t.receiptType === 'receipt') receiptLabel = '📄 收據';

    return {
      '流水序號': idx + 1,
      '傳票編號': t.voucherNo || t.id,
      '支出日期': t.date,
      '支出科目': t.categoryName || '零用金支出',
      '開銷項目(店家/細項)': t.subItem,
      '支出金額 (NT$)': t.amount,
      '請領同仁': t.claimant || '-',
      '單據憑證': receiptLabel,
      '發票號碼': t.invoiceNumber || '-',
      '用餐人數': t.peopleCount ? `${t.peopleCount} 人` : '-',
      '每人均攤 (NT$)': t.peopleCount && t.peopleCount > 1 ? perPerson : '-',
      '備註說明': t.note || '',
      '報表產出日期': printDateOnly
    };
  });

  expenseSheetRows.push({
    '流水序號': '【支出合計】',
    '傳票編號': `總計 ${expensesOnly.length} 筆支出`,
    '支出日期': printDateOnly,
    '支出科目': '-',
    '開銷項目(店家/細項)': '零用金開銷總額',
    '支出金額 (NT$)': totalExpense,
    '請領同仁': `發票 ${invoiceCount} 張 / 收據 ${receiptCount} 張`,
    '單據憑證': `無憑證 ${noDocCount} 筆`,
    '發票號碼': '-',
    '用餐人數': `${totalDiningPeople} 人次`,
    '每人均攤 (NT$)': '-',
    '備註說明': `期間總開支 NT$ ${totalExpense.toLocaleString()} 元`,
    '報表產出日期': printDateStr
  });

  const expenseSheet = XLSX.utils.json_to_sheet(expenseSheetRows);
  expenseSheet['!cols'] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 13 },
    { wch: 16 },
    { wch: 26 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 30 },
    { wch: 14 }
  ];

  // 獨立「撥補收入明細表」工作表
  const incomeSheetRows: any[] = incomesOnly.map((t, idx) => ({
    '流水序號': idx + 1,
    '傳票編號': t.voucherNo || t.id,
    '撥入日期': t.date,
    '撥補科目': t.categoryName || '撥補收入',
    '撥入來源/品項': t.subItem,
    '收入金額 (NT$)': t.amount,
    '經辦同仁/出納': t.claimant || '公司出納',
    '備註說明': t.note || '',
    '報表產出日期': printDateOnly
  }));

  incomeSheetRows.push({
    '流水序號': '【撥補合計】',
    '傳票編號': `總計 ${incomesOnly.length} 筆入帳`,
    '撥入日期': printDateOnly,
    '撥補科目': '-',
    '撥入來源/品項': '撥補入帳總額',
    '收入金額 (NT$)': totalIncome,
    '經辦同仁/出納': '-',
    '備註說明': `期間撥入 NT$ ${totalIncome.toLocaleString()} 元`,
    '報表產出日期': printDateStr
  });

  const incomeSheet = XLSX.utils.json_to_sheet(incomeSheetRows);
  incomeSheet['!cols'] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 13 },
    { wch: 16 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 30 },
    { wch: 14 }
  ];

  // ==========================================
  // 5. 【憑證合規與同仁請款統計表】
  // ==========================================
  const claimantMap: Record<string, { count: number; total: number; invoiceCount: number; receiptCount: number }> = {};
  expensesOnly.forEach((t) => {
    const cl = t.claimant || '未指定同仁';
    if (!claimantMap[cl]) claimantMap[cl] = { count: 0, total: 0, invoiceCount: 0, receiptCount: 0 };
    claimantMap[cl].count += 1;
    claimantMap[cl].total += t.amount;
    if (t.receiptType === 'invoice') claimantMap[cl].invoiceCount += 1;
    else if (t.receiptType === 'receipt') claimantMap[cl].receiptCount += 1;
  });

  const complianceRows: any[] = [];
  complianceRows.push({
    '分析項目': '===【單據憑證合規分佈統計】===',
    '金額/數據 (NT$)': '',
    '筆數/張數': '',
    '比重佔比 (%)': '',
    '報表產出日期': printDateStr
  });
  complianceRows.push({
    '分析項目': '🧾 統一發票 (含字軌號碼)',
    '金額/數據 (NT$)': invoiceAmount,
    '筆數/張數': `${invoiceCount} 張`,
    '比重佔比 (%)': totalExpense > 0 ? ((invoiceAmount / totalExpense) * 100).toFixed(1) + '%' : '0%',
    '報表產出日期': printDateOnly
  });
  complianceRows.push({
    '分析項目': '📄 收據',
    '金額/數據 (NT$)': receiptAmount,
    '筆數/張數': `${receiptCount} 張`,
    '比重佔比 (%)': totalExpense > 0 ? ((receiptAmount / totalExpense) * 100).toFixed(1) + '%' : '0%',
    '報表產出日期': printDateOnly
  });
  complianceRows.push({
    '分析項目': '❌ 無憑證開支',
    '金額/數據 (NT$)': noDocAmount,
    '筆數/張數': `${noDocCount} 筆`,
    '比重佔比 (%)': totalExpense > 0 ? ((noDocAmount / totalExpense) * 100).toFixed(1) + '%' : '0%',
    '報表產出日期': printDateOnly
  });

  complianceRows.push({
    '分析項目': '',
    '金額/數據 (NT$)': '',
    '筆數/張數': '',
    '比重佔比 (%)': '',
    '報表產出日期': ''
  });
  complianceRows.push({
    '分析項目': '===【同仁請領累計排行統計】===',
    '金額/數據 (NT$)': '',
    '筆數/張數': '',
    '比重佔比 (%)': '',
    '報表產出日期': printDateStr
  });

  Object.entries(claimantMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([clName, stats]) => {
      complianceRows.push({
        '分析項目': `請領同仁：${clName}`,
        '金額/數據 (NT$)': stats.total,
        '筆數/張數': `${stats.count} 筆 (發票${stats.invoiceCount} / 收據${stats.receiptCount})`,
        '比重佔比 (%)': totalExpense > 0 ? ((stats.total / totalExpense) * 100).toFixed(1) + '%' : '0%',
        '報表產出日期': printDateOnly
      });
    });

  const complianceSheet = XLSX.utils.json_to_sheet(complianceRows);
  complianceSheet['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 }
  ];

  // 組合活頁簿 (核心財務分析報表)
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reportSheet, '零用金財務綜合指標');
  XLSX.utils.book_append_sheet(workbook, dailySheet, '收支日報表');
  XLSX.utils.book_append_sheet(workbook, categorySheet, '支出分類統計表');
  XLSX.utils.book_append_sheet(workbook, detailSheet, '收支流水明細表');
  XLSX.utils.book_append_sheet(workbook, expenseSheet, '零用金支出明細表');
  XLSX.utils.book_append_sheet(workbook, incomeSheet, '撥補收入明細表');
  XLSX.utils.book_append_sheet(workbook, complianceSheet, '憑證與同仁統計表');

  // 檔名設定
  const filePrefix = yearMonthFilter ? `${yearMonthFilter}_公司零用金綜合帳務報表` : '全歷史_公司零用金綜合帳務報表';
  const fileName = `${filePrefix}_${printDateOnly}.xlsx`;

  // 觸發下載
  XLSX.writeFile(workbook, fileName);
}

/**
 * 智慧日期標準化函數：
 * 支援輸入 "9/7"、"09/07"、"9-7"、"9.7"、"9月7日"、"2026/09/07"、"2026-09-07"、民國年 "115/9/7" 或 Excel 日期序列
 * 自動安全轉為標準 "YYYY-MM-DD" 格式（如 2026-09-07），避免匯入時發生日期格式報錯。
 */
export function normalizeDateString(rawDate: any, defaultYear: number = new Date().getFullYear()): string {
  if (!rawDate && rawDate !== 0) return '';
  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return '';
    const y = rawDate.getFullYear();
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const d = String(rawDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof rawDate === 'number') {
    if (rawDate > 30000 && rawDate < 70000) {
      const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
  }
  const str = String(rawDate).trim();
  if (!str) return '';

  // 移除非必要字元並標準化分隔符號
  const clean = str
    .replace(/[年月日號]/g, '-')
    .replace(/[\/.\_]/g, '-')
    .replace(/--+/g, '-')
    .replace(/-$/, '');

  // 1. 完整西元格式 YYYY-M-D
  const fullMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fullMatch) {
    const y = fullMatch[1];
    const m = fullMatch[2].padStart(2, '0');
    const d = fullMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. 民國年格式 (例如 115-9-7 或 115-09-07)
  const minguoMatch = clean.match(/^(\d{2,3})-(\d{1,2})-(\d{1,2})$/);
  if (minguoMatch && parseInt(minguoMatch[1], 10) < 1900) {
    const y = parseInt(minguoMatch[1], 10) + 1911;
    const m = minguoMatch[2].padStart(2, '0');
    const d = minguoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3. 短日期 M-D (例如 9/7, 09/07, 9-7, 9.7)
  const shortMatch = clean.match(/^(\d{1,2})-(\d{1,2})$/);
  if (shortMatch) {
    const m = parseInt(shortMatch[1], 10);
    const d = parseInt(shortMatch[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${defaultYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 4. 純數字 MMDD 或 YYYYMMDD
  const pureDigits = str.replace(/\D/g, '');
  if (pureDigits.length === 8) {
    const y = pureDigits.slice(0, 4);
    const m = pureDigits.slice(4, 6);
    const d = pureDigits.slice(6, 8);
    return `${y}-${m}-${d}`;
  } else if (pureDigits.length === 4) {
    const m = parseInt(pureDigits.slice(0, 2), 10);
    const d = parseInt(pureDigits.slice(2, 4), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${defaultYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  } else if (pureDigits.length === 3) {
    const m = parseInt(pureDigits.slice(0, 1), 10);
    const d = parseInt(pureDigits.slice(1, 3), 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${defaultYear}-0${m}-${String(d).padStart(2, '0')}`;
    }
  }

  return '';
}

/**
 * 產生並下載「人性化空白記帳匯入範本 (Excel)」
 * 使用 ExcelJS 原生產生支援【Excel 清單功能（資料驗證下拉選單）】與【標準日期自動格式化】之專用範本
 * 包含：
 * 1. 收支屬性：強制下拉選單（僅可點選「支出」或「撥補」）
 * 2. 憑證類型：強制下拉選單（發票、收據、無）
 * 3. 支出大類：支援依系統現有分類自訂或常用選單
 * 4. 請領同仁：支援同仁選單或手動填寫
 * 5. 交易日期：支援 Excel 標準日期格式 (YYYY/MM/DD) 以及輸入 9/7 自動轉換
 * 6. 預載 60 列格式化表格，開檔後即可直接用滑鼠點選與快速鍵入
 */
export async function generateBlankImportTemplate(
  categories?: CategoryConfig[],
  claimants?: string[]
): Promise<void> {
  const currentYear = new Date().getFullYear();

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '零用金收支管理系統';
    workbook.lastModifiedBy = '零用金收支管理系統';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ==========================================
    // 1. 主工作表：零用金記帳匯入表
    // ==========================================
    const worksheet = workbook.addWorksheet('零用金記帳匯入表', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    worksheet.columns = [
      { header: '交易日期 (例: 9/7)', key: 'date', width: 18 },
      { header: '收支屬性 (選單強制)', key: 'type', width: 16 },
      { header: '支出大類 (選單可選)', key: 'category', width: 18 },
      { header: '店家/品項/細項 (必填)', key: 'subItem', width: 32 },
      { header: '金額 (NT$ 必填)', key: 'amount', width: 15 },
      { header: '請領同仁 (選單或自填)', key: 'claimant', width: 18 },
      { header: '憑證類型 (選單強制)', key: 'receiptType', width: 15 },
      { header: '發票號碼 (選填)', key: 'invoiceNumber', width: 18 },
      { header: '用餐人數 (選填)', key: 'peopleCount', width: 12 },
      { header: '備註說明 (選填)', key: 'note', width: 38 },
      { header: '資料識別碼(選填)', key: 'id', width: 22 }
    ];

    // 標題列樣式設計
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // slate-800
      };
      cell.font = {
        name: 'Microsoft JhengHei',
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 11
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: false
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } }
      };
    });

    // 提取支出大類選項字串
    const defaultCategoryNames = categories && categories.length > 0
      ? categories.map((c) => c.name.trim()).filter(Boolean)
      : ['餐費', '油資/交通', '同仁代墊款', '文具耗材', '其他雜支', '零用金撥補'];
    const categoryFormula = `"${defaultCategoryNames.join(',')}"`;

    // 提取請領同仁選項字串
    const defaultClaimantNames = claimants && claimants.length > 0
      ? claimants.map((c) => c.trim()).filter(Boolean)
      : ['陳小明', '李大華', '王小美', '零用金管理員'];
    const claimantFormula = `"${defaultClaimantNames.join(',')}"`;

    // 示範資料列（前 4 筆）
    const sampleRows = [
      {
        date: `${currentYear}-09-07`,
        type: '支出',
        category: '餐費',
        subItem: '池上便當 (工廠會議午餐)',
        amount: 950,
        claimant: '陳小明',
        receiptType: '發票',
        invoiceNumber: 'AB-12345678',
        peopleCount: 10,
        note: '支援直接輸入 9/7 自動轉為 2026/09/07',
        id: ''
      },
      {
        date: `${currentYear}-09-08`,
        type: '支出',
        category: '油資/交通',
        subItem: '台灣中油加油站',
        amount: 1200,
        claimant: '李大華',
        receiptType: '發票',
        invoiceNumber: 'CD-87654321',
        peopleCount: null,
        note: '公務車9座加油出勤',
        id: ''
      },
      {
        date: `${currentYear}-09-09`,
        type: '支出',
        category: '其他雜支',
        subItem: '日日新五金行',
        amount: 450,
        claimant: '王小美',
        receiptType: '收據',
        invoiceNumber: '',
        peopleCount: null,
        note: '廠務修繕水管零件材料',
        id: ''
      },
      {
        date: `${currentYear}-09-10`,
        type: '撥補',
        category: '零用金撥補',
        subItem: '公司銀行帳戶提領',
        amount: 20000,
        claimant: '零用金管理員',
        receiptType: '無',
        invoiceNumber: '',
        peopleCount: null,
        note: '補足零用金安全水位',
        id: ''
      }
    ];

    sampleRows.forEach((r) => {
      worksheet.addRow(r);
    });

    // 預先產生 50 列預設可輸入空白列，每一列均已掛載 Excel 清單功能
    for (let i = 0; i < 50; i++) {
      worksheet.addRow({
        date: '',
        type: '支出',
        category: '',
        subItem: '',
        amount: null,
        claimant: '',
        receiptType: '發票',
        invoiceNumber: '',
        peopleCount: null,
        note: '',
        id: ''
      });
    }

    // 為所有資料列 (第 2 列 ~ 第 55 列) 套用格式與 Excel 清單功能 (Data Validation)
    const totalRowCount = worksheet.rowCount;
    for (let rowIdx = 2; rowIdx <= totalRowCount; rowIdx++) {
      const row = worksheet.getRow(rowIdx);
      row.height = 24;
      const isSample = rowIdx <= 5;
      const isEven = rowIdx % 2 === 0;

      // 1. 日期欄：設置日期格式
      const dateCell = row.getCell(1);
      dateCell.numFmt = 'yyyy/mm/dd';
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 2. 收支屬性：強制下拉選單 (支出、撥補)
      const typeCell = row.getCell(2);
      typeCell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"支出,撥補"'],
        showErrorMessage: true,
        errorTitle: '無效的收支屬性',
        error: '請點選儲存格右側箭頭，由清單中選擇「支出」或「撥補」。'
      };
      typeCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 3. 支出大類：下拉選單
      const catCell = row.getCell(3);
      catCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [categoryFormula],
        showErrorMessage: false
      };
      catCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 4. 店家/品項：左對齊
      const itemCell = row.getCell(4);
      itemCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // 5. 金額：千分位數字格式
      const amtCell = row.getCell(5);
      amtCell.numFmt = '#,##0';
      amtCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // 6. 請領同仁：下拉選單
      const claimantCell = row.getCell(6);
      claimantCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [claimantFormula],
        showErrorMessage: false
      };
      claimantCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 7. 憑證類型：強制下拉選單 (發票、收據、無)
      const receiptCell = row.getCell(7);
      receiptCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"發票,收據,無"'],
        showErrorMessage: true,
        errorTitle: '無效的憑證類型',
        error: '請點選儲存格右側箭頭，由清單中選擇「發票」、「收據」或「無」。'
      };
      receiptCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 8. 發票號碼：居中
      const invCell = row.getCell(8);
      invCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 9. 用餐人數：居中
      const pplCell = row.getCell(9);
      pplCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 10. 備註：靠左
      const noteCell = row.getCell(10);
      noteCell.alignment = { horizontal: 'left', vertical: 'middle' };

      // 格線與背景微著色
      row.eachCell({ includeEmpty: true }, (c) => {
        c.font = { name: 'Microsoft JhengHei', size: 10 };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (isSample) {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFF1F5F9' }
          };
        }
      });
    }

    // ==========================================
    // 2. 第二工作表：選單清單與填寫規範說明
    // ==========================================
    const guideSheet = workbook.addWorksheet('選單清單與速填指南');
    guideSheet.columns = [
      { header: '欄位名稱', key: 'col', width: 22 },
      { header: '人性化規則與填寫說明', key: 'rule', width: 55 },
      { header: 'Excel 選單清單選項或速記格式', key: 'example', width: 35 }
    ];

    const guideHeader = guideSheet.getRow(1);
    guideHeader.height = 28;
    guideHeader.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
      c.font = { name: 'Microsoft JhengHei', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const guideData = [
      { col: '★ 日期智慧速填技巧', rule: '日期欄位支援直接輸入「9/7」或「09/07」，匯入系統時會自動精準識別為 2026/09/07，絕不報錯！', example: '輸入 9/7 秒通' },
      { col: '★ Excel 下拉選單功能', rule: '「收支屬性」、「支出大類」、「憑證類型」欄位點選右側倒三角即可以滑鼠快速點選，防止輸入錯字。', example: '滑鼠點選倒三角清單' },
      { col: '★ 智慧防重複機制', rule: '系統具備防重複檢查機制！重複上傳同一張表會自動過濾已存在的紀錄，只會新增還沒登記的新資料。', example: '安心重複匯入不重複記帳' },
      { col: '交易日期', rule: '必填。支援西元年月日(2026-09-07、2026/09/07)或月日簡寫(9/7、0907、9-7)', example: '9/7 或 2026-09-07' },
      { col: '收支屬性', rule: '必填。Excel 已啟用清單功能，請點選「支出」或「撥補」（僅此兩種選項）', example: '支出 / 撥補' },
      { col: '支出大類', rule: '選填。可由下拉選單選取常用分類', example: defaultCategoryNames.join('、') },
      { col: '店家/品項/細項', rule: '必填。請填寫消費店家名稱、加油站、或開銷品項', example: '池上便當、台灣中油' },
      { col: '金額', rule: '必填。大於 0 之正整數金額，勿填負數或符號', example: '950' },
      { col: '請領同仁', rule: '選填。可由清單選擇同仁或直接輸入姓名', example: defaultClaimantNames.join('、') },
      { col: '憑證類型', rule: '選填。Excel 已啟用清單功能，請點選「發票」、「收據」或「無」', example: '發票 / 收據 / 無' },
      { col: '發票號碼', rule: '選填。發票 8 碼或字軌號碼', example: 'AB-12345678' },
      { col: '用餐人數', rule: '選填。若為餐飲請款可填人數，以利人均餐費統計', example: '10' },
      { col: '備註說明', rule: '選填。開銷事由、專案名稱或備註說明', example: '工地出勤中餐' },
      { col: '資料識別碼(選填)', rule: '選填。系統比對用唯一碼，手動填寫留空即可', example: '系統自動產生' }
    ];

    guideData.forEach((g) => {
      const r = guideSheet.addRow(g);
      r.height = 22;
      r.eachCell({ includeEmpty: true }, (c) => {
        c.font = { name: 'Microsoft JhengHei', size: 10 };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // 瀏覽器觸發下載
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '公司零用金記帳匯入空白範本.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('使用 ExcelJS 產生範本失敗，啟用備用方案：', error);
    // 備用方案：若環境不支援 ExcelJS 則退回 XLSX 產生基礎版本
    fallbackGenerateBlankImportTemplate(categories, claimants);
  }
}

/**
 * 備用方案：使用 XLSX 產生基本結構範本
 */
function fallbackGenerateBlankImportTemplate(
  categories?: CategoryConfig[],
  claimants?: string[]
): void {
  const currentYear = new Date().getFullYear();
  const sampleRows = [
    {
      '交易日期': `${currentYear}-09-07`,
      '收支屬性': '支出',
      '支出大類': '餐費',
      '店家/品項/細項': '池上便當 (工廠午餐)',
      '金額': 950,
      '請領同仁': claimants?.[0] || '陳小明',
      '憑證類型': '發票',
      '發票號碼': 'AB-12345678',
      '用餐人數': 10,
      '備註說明': '工廠會議便當 (支援直接輸入 9/7 自動轉為 2026/09/07)',
      '資料識別碼(選填)': ''
    },
    {
      '交易日期': `${currentYear}-09-08`,
      '收支屬性': '支出',
      '支出大類': '油資/交通',
      '店家/品項/細項': '台灣中油加油站',
      '金額': 1200,
      '請領同仁': claimants?.[1] || '李大華',
      '憑證類型': '發票',
      '發票號碼': 'CD-87654321',
      '用餐人數': '',
      '備註說明': '公務車9座加油出勤',
      '資料識別碼(選填)': ''
    }
  ];

  const templateSheet = XLSX.utils.json_to_sheet(sampleRows);
  templateSheet['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 38 },
    { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, templateSheet, '零用金記帳匯入表');
  XLSX.writeFile(workbook, `公司零用金記帳匯入空白範本.xlsx`);
}

/**
 * 將線上表格輸入之資料直接匯出為 Excel 檔案
 */
export function exportImportGridToExcel(
  rows: Array<{
    date: string;
    type: 'expense' | 'income';
    categoryName: string;
    subItem: string;
    amount: number;
    claimant?: string;
    receiptType?: string;
    invoiceNumber?: string;
    peopleCount?: number;
    note?: string;
  }>
): void {
  const exportRows = rows.map((r) => {
    let receiptLabel = '無';
    if (r.receiptType === 'invoice') receiptLabel = '發票';
    else if (r.receiptType === 'receipt') receiptLabel = '收據';

    return {
      '交易日期': r.date,
      '收支屬性': r.type === 'expense' ? '支出' : '撥補',
      '支出大類': r.categoryName || (r.type === 'expense' ? '其他雜支' : '零用金撥補'),
      '店家/品項/細項': r.subItem,
      '金額': r.amount,
      '請領同仁': r.claimant || '',
      '憑證類型': receiptLabel,
      '發票號碼': r.invoiceNumber || '',
      '用餐人數': r.peopleCount || '',
      '備註說明': r.note || '',
      '資料識別碼(選填)': ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
    { wch: 30 },
    { wch: 22 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '零用金記帳匯入表');

  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `零用金記帳匯入資料_${todayStr}.xlsx`);
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  newTransactions: Transaction[];
  duplicates: Array<{
    rowNumber: number;
    reason: string;
    date: string;
    subItem: string;
    amount: number;
    type: string;
    claimant?: string;
  }>;
  invalidRows: Array<{
    rowNumber: number;
    reason: string;
    raw: any;
  }>;
  errorMessage?: string;
}

/**
 * 輔助函數：計算交易項目的複合特徵碼 (Fingerprint)
 * 用於在沒有 ID 或自建檔案情況下，精準檢視資料庫是否已存在相同交易
 */
function getTransactionFingerprint(t: {
  date: string;
  type: string;
  amount: number;
  subItem: string;
  claimant?: string;
  categoryName?: string;
  invoiceNumber?: string;
}): string {
  const normDate = (t.date || '').trim();
  const normType = (t.type || '').trim();
  const normAmt = Math.round(Number(t.amount) || 0);
  const normSub = (t.subItem || '').trim().toLowerCase();
  const normClaimant = (t.claimant || '').trim();
  const normInv = (t.invoiceNumber || '').trim().toLowerCase();
  return `${normDate}|${normType}|${normAmt}|${normSub}|${normClaimant}|${normInv}`;
}

/**
 * 智慧解碼 CSV 二進位資料（自動判別 Big5 / ANSI 與 UTF-8）
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  
  // 檢查是否含有 UTF-8 BOM
  let hasUtf8Bom = false;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    hasUtf8Bom = true;
  }

  // 嘗試以 UTF-8 解碼
  try {
    const utf8Decoder = new TextDecoder('utf-8');
    const utf8Text = utf8Decoder.decode(buffer);
    // 若明確為 UTF-8 BOM 或完全無亂碼字元
    if (hasUtf8Bom || (!utf8Text.includes('\uFFFD') && utf8Text.includes('"'))) {
      return utf8Text;
    }
  } catch (e) {
    // 忽略錯誤，接續測試 Big5
  }

  // 嘗試以 Big5 (CP950 繁體中文，傳統 Windows 軟體預設編碼) 解碼
  try {
    const big5Decoder = new TextDecoder('big5');
    const big5Text = big5Decoder.decode(buffer);
    return big5Text;
  } catch (e) {
    // 若環境不支援 Big5，降級使用 UTF-8
    return new TextDecoder('utf-8').decode(buffer);
  }
}

/**
 * 判斷文字是否為「帳務小管家 (MyMoney)」專屬的 CSV 格式
 */
export function isMyMoneyCsvText(text: string): boolean {
  if (!text) return false;
  const first1000 = text.slice(0, 2000);
  return (
    first1000.includes('"4",') ||
    first1000.includes('"1",') ||
    first1000.includes('"2",') ||
    /P20\d{10,}/.test(first1000)
  );
}

/**
 * 智慧分類模糊比對器：
 * 當舊記帳軟體（帳務小管家）之科目與本系統分類不同時，自動利用語意關鍵字進行智能歸類，
 * 即使兩邊設定科目名稱不完全一致，也能精準自動對齊！
 */
export function mapMyMoneyCategory(
  subject: string,
  item: string,
  categories: CategoryConfig[],
  isIncome: boolean
): { id: string; name: string } {
  if (isIncome) {
    return { id: 'replenish', name: '零用金撥補' };
  }

  const combined = `${subject || ''} ${item || ''}`.trim().toLowerCase();

  // 1. 完全或包含名稱直接比對
  const directMatch = categories.find((c) => {
    const cName = c.name.toLowerCase();
    return combined.includes(cName) || cName.includes(subject.toLowerCase());
  });
  if (directMatch) return { id: directMatch.id, name: directMatch.name };

  // 2. 核心語意規則匹配
  // (A) 餐費 / 伙食
  if (combined.match(/餐|伙食|便當|午餐|晚餐|早點|飲食|外食|吃飯|飲料|咖啡|下午茶|水果/)) {
    const dining = categories.find((c) => c.id === 'dining' || c.name.includes('餐'));
    if (dining) return { id: dining.id, name: dining.name };
  }

  // (B) 油資 / 交通
  if (combined.match(/油|加油|中油|全國|台亞|車|客運|捷運|高鐵|計程車|uber|過路|etc|停車|通行/)) {
    const fuel = categories.find((c) => c.id === 'fuel' || c.name.includes('油') || c.name.includes('交通'));
    if (fuel) return { id: fuel.id, name: fuel.name };
  }

  // (C) 文具耗材 / 修繕材料
  if (combined.match(/文具|耗材|影印|紙|筆|墨水|五金|修繕|零件|水電|材料|包裝|箱|帶|清潔|掃具/)) {
    const supplies = categories.find((c) => c.id === 'supplies' || c.name.includes('文具') || c.name.includes('耗材'));
    if (supplies) return { id: supplies.id, name: supplies.name };
  }

  // (D) 同仁代墊款
  if (combined.match(/代墊|代付|經辦|請領|代支/)) {
    const advance = categories.find((c) => c.id === 'advance' || c.name.includes('代墊'));
    if (advance) return { id: advance.id, name: advance.name };
  }

  // (E) 郵資 / 運費
  if (combined.match(/郵|信|郵票|包裹|快遞|宅配|黑貓|郵資/)) {
    const postage = categories.find((c) => c.name.includes('郵') || c.name.includes('運') || c.id === 'supplies');
    if (postage) return { id: postage.id, name: postage.name };
  }

  // 3. 備援預設分類：其他雜支
  const misc = categories.find((c) => c.id === 'misc' || c.name.includes('雜支'));
  if (misc) return { id: misc.id, name: misc.name };

  return {
    id: categories[0]?.id || 'misc',
    name: categories[0]?.name || '其他雜支'
  };
}

/**
 * 分割 CSV 單行（支援引號字串包含逗號）
 */
function parseCsvLineCols(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      cols.push(cur.replace(/^"|"$/g, '').trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  cols.push(cur.replace(/^"|"$/g, '').trim());
  return cols;
}

export interface MyMoneyParsedRow {
  voucherId: string;    // 系統加工後傳票號碼 (方案 A: P2026090714-0001)
  rawVoucherId: string; // 帳務小管家原生建檔模式傳票號碼 (例如 P20260907142530123)
  date: string;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  subItem: string;
  amount: number;
  claimant: string;
  receiptType: ReceiptType;
  invoiceNumber?: string;
  peopleCount?: number;
  note?: string;
  rawSubject: string;
}

/**
 * 產出符合「帳務小管家 (MyMoney)」原生資料庫建檔模式之傳票編號 (Passbook ID)
 * 格式範例：P20260907142530001
 * 規格：P + 年月日(8碼) + 時分秒(6碼) + 毫秒/流水序(3碼)，全數字共 18 碼無破折號，
 * 專門用於「匯入帳務小管家」的 CSV 檔，確保小管家內部資料庫與解析程式 100% 成功通過檢核，絕不報錯！
 */
export function generateMyMoneyNativeVoucherId(
  dateStr: string,
  createdAt?: number,
  indexOffset: number = 1
): string {
  const cleanDate = (dateStr || '').replace(/[^0-9]/g, '').slice(0, 8).padEnd(8, '0');
  let h = '12';
  let m = '00';
  let s = '00';
  let ms = String(indexOffset % 1000).padStart(3, '0');

  if (createdAt && !isNaN(createdAt)) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      h = String(d.getHours()).padStart(2, '0');
      m = String(d.getMinutes()).padStart(2, '0');
      s = String(d.getSeconds()).padStart(2, '0');
      ms = String((d.getMilliseconds() + indexOffset) % 1000).padStart(3, '0');
    }
  }

  return `P${cleanDate}${h}${m}${s}${ms}`;
}

/**
 * 將帳務小管家原生編號 (如 P20260907142530123) 或系統記錄，加工為系統專用的高可讀性傳票編號 (方案 A)
 * 格式範例：P2026090714-0001
 * - P + 年月日(8碼) + (時2碼) + '-' + 當月4碼獨立流水號 (每月重新歸零起算)
 * - 依交易日期與時間先後排序，排序嚴格不亂序，且可一眼得知當月有幾張傳票
 */
export function formatSystemVoucherId(
  dateStr: string,
  monthSeq: number,
  rawVoucherId?: string,
  createdAt?: number
): string {
  const cleanDate = (dateStr || '').replace(/[^0-9]/g, '').slice(0, 8).padEnd(8, '0');

  let hourStr = '00';
  if (rawVoucherId && rawVoucherId.startsWith('P') && rawVoucherId.length >= 11) {
    const rawHour = rawVoucherId.slice(9, 11);
    if (/^\d{2}$/.test(rawHour)) {
      hourStr = rawHour;
    }
  } else if (createdAt && !isNaN(createdAt)) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      hourStr = String(d.getHours()).padStart(2, '0');
    }
  }

  const seqStr = String(monthSeq).padStart(4, '0');
  return `P${cleanDate}${hourStr}-${seqStr}`;
}

/**
 * 解析帳務小管家 CSV 文字
 * 自動組合複式傳票（兩筆一對）、提取借貸收支屬性、自適應分類對應、人數解析
 * 並將小管家建檔模式編號 (rawVoucherId) 加工為系統傳票編號 (voucherId, 方案 A: P2026090714-0001)
 */
export function parseMyMoneyCsvText(
  text: string,
  categories: CategoryConfig[],
  claimants: string[]
): MyMoneyParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const vouchers = new Map<string, string[][]>();

  lines.forEach((line) => {
    if (!line.startsWith('"4"') && !line.startsWith('4,')) return;
    const cols = parseCsvLineCols(line);
    if (cols[0] === '4') {
      const vId = cols[18] || `gen-${cols[2]}-${cols[6]}-${cols[4]}-${cols[5]}`;
      if (!vouchers.has(vId)) vouchers.set(vId, []);
      vouchers.get(vId)!.push(cols);
    }
  });

  const parsedList: MyMoneyParsedRow[] = [];
  const defaultClaimant = claimants[0] || '零用金管理員';

  vouchers.forEach((entries, vId) => {
    // 找出資產行 (例如科目包含零用金或現金，或類型標示為資產)
    let assetRow = entries.find(
      (e) => e[1] === '資產' || e[8] === '資產' || e[3].includes('零用金') || e[3].includes('現金')
    );
    let otherRow = entries.find((e) => e !== assetRow);

    if (!assetRow && entries.length >= 2) {
      assetRow = entries[0];
      otherRow = entries[1];
    } else if (!otherRow && assetRow) {
      otherRow = assetRow;
    } else if (!assetRow && entries.length === 1) {
      assetRow = entries[0];
      otherRow = entries[0];
    }

    if (!assetRow || !otherRow) return;

    // 解析日期
    const rawDate = assetRow[2] || otherRow[2] || '';
    const formattedDate = normalizeDateString(rawDate);
    if (!formattedDate) return;

    // 解析金額
    const amtAssetOut = Number(assetRow[4]) || 0;
    const amtAssetIn = Number(assetRow[5]) || 0;
    const amtOtherOut = Number(otherRow[4]) || 0;
    const amtOtherIn = Number(otherRow[5]) || 0;
    const amount = Math.round(Math.max(amtAssetOut, amtAssetIn, amtOtherOut, amtOtherIn));
    if (amount <= 0) return;

    // 解析科目與品項
    const rawSubject = (otherRow[3] || assetRow[3] || '').trim();
    let subItem = (otherRow[6] || assetRow[6] || rawSubject).trim();
    if (!subItem) subItem = rawSubject || '日常零用金支出';

    // 判定收支類型 (依複式簿記原則：資產借方增加為撥補，資產貸方減少為支出)
    let type: TransactionType = 'expense';
    if (
      otherRow[1] === '收入' ||
      otherRow[8] === '收入' ||
      rawSubject.includes('補充') ||
      rawSubject.includes('撥補') ||
      rawSubject.includes('存入') ||
      rawSubject.includes('提領') ||
      subItem.includes('起點金額') ||
      (assetRow[1] === '資產' && amtAssetOut > 0 && amtAssetIn === 0)
    ) {
      type = 'income';
    }

    // 智慧分類對應
    const catResult = mapMyMoneyCategory(rawSubject, subItem, categories, type === 'income');

    // 解析用餐人數 (如 "便當5人"、"3人"、"4位")
    let peopleCount: number | undefined;
    const peopleMatch = subItem.match(/(\d+)\s*(?:人|位)/i);
    if (peopleMatch) {
      peopleCount = parseInt(peopleMatch[1], 10);
    }

    // 備註與附加資訊
    const rawNote = (otherRow[7] || assetRow[7] || '').trim();
    const note = rawNote
      ? `${rawNote} (來源: 帳務小管家 科目[${rawSubject}])`
      : `來源: 帳務小管家 科目[${rawSubject}]`;

    parsedList.push({
      voucherId: vId,
      rawVoucherId: vId,
      date: formattedDate,
      type,
      categoryId: catResult.id,
      categoryName: catResult.name,
      subItem,
      amount,
      claimant: defaultClaimant,
      receiptType: 'invoice',
      peopleCount,
      note,
      rawSubject
    });
  });

  // 1. 嚴格依交易日期升冪排序，同日則依小管家原始傳票時間戳排序
  parsedList.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.rawVoucherId.localeCompare(b.rawVoucherId);
  });

  // 2. 按月份累計當月流水號 (YYYY-MM)，將小管家原生編號加工轉化為系統專用傳票編號 (方案 A: P2026090714-0001)
  const monthSeqMap = new Map<string, number>();
  parsedList.forEach((row) => {
    const ym = row.date.slice(0, 7);
    const curSeq = (monthSeqMap.get(ym) || 0) + 1;
    monthSeqMap.set(ym, curSeq);

    row.voucherId = formatSystemVoucherId(row.date, curSeq, row.rawVoucherId);
  });

  return parsedList;
}

export interface VoucherIdOptions {
  includeHour?: boolean; // 是否包含小時 (預設 true)
  separator?: string;    // 分隔符 (預設 '-')
  seqDigits?: number;    // 流水號位數 (預設 4 碼)
}

/**
 * 產出符合會計傳票與系統加工之傳票編號 (Voucher ID) - 方案 A
 * 格式範例：P2026090714-0001
 */
export function generateMonthlyVoucherId(
  dateStr: string,
  monthSeq: number,
  createdAt?: number,
  options?: VoucherIdOptions
): string {
  return formatSystemVoucherId(dateStr, monthSeq, undefined, createdAt);
}

/**
 * 將本系統零用金帳務明細匯出為「帳務小管家 (MyMoney)」相容之 CSV 檔案
 * 
 * 重要規範：
 * 1. 匯入帳務小管家的 CSV，傳票識別碼欄位 (第 19 欄) 必須嚴格符合小管家的原生建檔模式：
 *    「P」+「西元年月日(8碼)」+「時分秒(6碼)」+「毫秒序號(3碼)」(例如 P20260907142530001)，
 *    絕不可含有破折號「-」或其他非數字字元，否則小管家匯入解析程式會驗證失敗！
 * 2. 若資料為先前由小管家匯入，則保留其原始建檔編號；若為系統新記帳，則以小管家建檔規格自動生成。
 */
export function exportToMyMoneyCsv(transactions: Transaction[]): void {
  const lines: string[] = [];

  // 1. 嚴格依交易日期升冪排序（同日則依建立時間升冪），確保匯出順序正確無誤
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  sortedTransactions.forEach((tx, idx) => {
    const overallSeq = idx + 1;
    const dateFormatted = tx.date.replace(/-/g, '/');

    // 確保第 19 欄傳票識別碼符合帳務小管家建檔模式 (P + yyyyMMdd + HHmmss + fff)
    let myMoneyNativeVoucherId: string;
    if (
      tx.rawVoucherId &&
      tx.rawVoucherId.startsWith('P') &&
      !tx.rawVoucherId.includes('-') &&
      tx.rawVoucherId.length >= 15
    ) {
      myMoneyNativeVoucherId = tx.rawVoucherId;
    } else {
      myMoneyNativeVoucherId = generateMyMoneyNativeVoucherId(tx.date, tx.createdAt, overallSeq);
    }

    const subItemEscaped = tx.subItem.replace(/"/g, '""');
    const noteEscaped = (tx.note || '').replace(/"/g, '""');

    if (tx.type === 'income') {
      // 撥補 (收入): 行1 收入科目, 行2 零用金資產增加
      lines.push(
        `"4","收入","${dateFormatted}","補充零用金","0","${tx.amount}","${subItemEscaped}","${noteEscaped}","收入","1","","","","","1","${overallSeq}","0","","${myMoneyNativeVoucherId}","","","","","","","","","","","",""`
      );
      lines.push(
        `"4","資產","${dateFormatted}","零用金","${tx.amount}","0","${subItemEscaped}","${noteEscaped}","資產","2","","","","","1","${overallSeq}","0","","${myMoneyNativeVoucherId}","","","","","","","","","","","",""`
      );
    } else {
      // 支出: 行1 零用金資產減少, 行2 支出科目
      const categoryName = tx.categoryName || '日常雜支';
      lines.push(
        `"4","資產","${dateFormatted}","零用金","0","${tx.amount}","${subItemEscaped}","${noteEscaped}","資產","1","","","","","1","${overallSeq}","0","","${myMoneyNativeVoucherId}","","","","","","","","","","","",""`
      );
      lines.push(
        `"4","支出","${dateFormatted}","${categoryName}","${tx.amount}","0","${subItemEscaped}","${noteEscaped}","支出","2","","","","","1","${overallSeq}","0","","${myMoneyNativeVoucherId}","","","","","","","","","","","",""`
      );
    }
  });

  // 加入 UTF-8 BOM 避免 Excel 或純文字編輯器開檔亂碼
  const csvContent = '\uFEFF' + lines.join('\r\n') + '\r\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `帳務小管家相容_零用金帳務明細_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 匯入並檢核 Excel / CSV 檔案：
 * 1. 支援「一般 Excel / CSV 試算表」以及「帳務小管家 (MyMoney) CSV 匯出檔」
 * 2. 支援「智慧防重複檢核」
 * 3. 比對資料庫現有 ID 與複合交易特徵
 * 4. 略過重複項目，只加入全新資料
 * 5. 即使多次上傳或斷點續傳，也保證資料庫完全不會有重複登記事項
 */
export async function parseAndValidateImportFile(
  file: File,
  existingTransactions: Transaction[],
  categories: CategoryConfig[],
  claimants: string[]
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const decodedText = decodeCsvBuffer(arrayBuffer);

        // 建立現有資料的防重複檢索索引 (Set)
        const existingIdSet = new Set<string>();
        const existingFingerprintSet = new Set<string>();

        existingTransactions.forEach((t) => {
          if (t.id) existingIdSet.add(t.id.trim().toLowerCase());
          const fp = getTransactionFingerprint(t);
          existingFingerprintSet.add(fp);
        });

        // 記錄當前批次內已辨識出的特徵，防止同一個檔案內有兩筆完全相同的一起匯入
        const inBatchIdSet = new Set<string>();
        const inBatchFingerprintSet = new Set<string>();

        const newTransactions: Transaction[] = [];
        const duplicates: ImportResult['duplicates'] = [];
        const invalidRows: ImportResult['invalidRows'] = [];

        // =========================================================
        // 分支 A：若是「帳務小管家 (MyMoney)」CSV 檔案
        // =========================================================
        if (isMyMoneyCsvText(decodedText)) {
          const myMoneyRows = parseMyMoneyCsvText(decodedText, categories, claimants);

          if (myMoneyRows.length === 0) {
            resolve({
              success: false,
              totalRows: 0,
              newTransactions: [],
              duplicates: [],
              invalidRows: [],
              errorMessage: '在「帳務小管家」CSV 檔案中未辨識出任何有效的帳務傳票記錄。'
            });
            return;
          }

          myMoneyRows.forEach((r, idx) => {
            const rowNumber = idx + 1;
            const fp = getTransactionFingerprint({
              date: r.date,
              type: r.type,
              amount: r.amount,
              subItem: r.subItem,
              claimant: r.claimant,
              categoryName: r.categoryName
            });

            // 檢查是否已存在於系統中 (比對原生傳票號、加工後系統號、以及指紋)
            const isDuplicate =
              (r.rawVoucherId && existingIdSet.has(r.rawVoucherId.toLowerCase())) ||
              existingIdSet.has(r.voucherId.toLowerCase()) ||
              existingFingerprintSet.has(fp) ||
              (r.rawVoucherId && inBatchIdSet.has(r.rawVoucherId.toLowerCase())) ||
              inBatchIdSet.has(r.voucherId.toLowerCase()) ||
              inBatchFingerprintSet.has(fp);

            if (isDuplicate) {
              duplicates.push({
                rowNumber,
                reason: `已存在於資料庫中（系統傳票號: ${r.voucherId} / 小管家編號: ${r.rawVoucherId}）`,
                date: r.date,
                subItem: r.subItem,
                amount: r.amount,
                type: r.type === 'expense' ? '支出' : '撥補',
                claimant: r.claimant
              });
              return;
            }

            if (r.rawVoucherId) inBatchIdSet.add(r.rawVoucherId.toLowerCase());
            inBatchIdSet.add(r.voucherId.toLowerCase());
            inBatchFingerprintSet.add(fp);

            newTransactions.push({
              id: r.voucherId,
              voucherNo: r.voucherId,
              rawVoucherId: r.rawVoucherId,
              date: r.date,
              type: r.type,
              categoryId: r.categoryId,
              categoryName: r.categoryName,
              subItem: r.subItem,
              amount: r.amount,
              claimant: r.claimant,
              receiptType: r.receiptType,
              invoiceNumber: r.invoiceNumber,
              peopleCount: r.peopleCount,
              note: r.note,
              createdAt: Date.now()
            });
          });

          resolve({
            success: true,
            totalRows: myMoneyRows.length,
            newTransactions,
            duplicates,
            invalidRows
          });
          return;
        }

        // =========================================================
        // 分支 B：一般 Excel / CSV 試算表處理流程
        // =========================================================
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // 優先找「零用金記帳匯入表」或「收支流水明細」或第一個頁籤
        const sheetName =
          workbook.SheetNames.find(
            (s) => s.includes('匯入') || s.includes('流水明細') || s.includes('記帳')
          ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          resolve({
            success: false,
            totalRows: 0,
            newTransactions: [],
            duplicates: [],
            invalidRows: [],
            errorMessage: '在試算表檔案中找不到可讀取的工作表頁籤。'
          });
          return;
        }

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          resolve({
            success: false,
            totalRows: 0,
            newTransactions: [],
            duplicates: [],
            invalidRows: [],
            errorMessage: '上傳的試算表內沒有任何資料列。'
          });
          return;
        }

        // 欄位輔助取得函數：比對多種可能表頭名稱或包含關鍵字的欄位
        const getRowVal = (rowObj: any, keywords: string[]): any => {
          for (const kw of keywords) {
            if (rowObj[kw] !== undefined && rowObj[kw] !== null && rowObj[kw] !== '') {
              return rowObj[kw];
            }
          }
          const keys = Object.keys(rowObj);
          for (const kw of keywords) {
            const matchedKey = keys.find((k) => k.trim().toLowerCase().includes(kw.toLowerCase()));
            if (matchedKey && rowObj[matchedKey] !== undefined && rowObj[matchedKey] !== null && rowObj[matchedKey] !== '') {
              return rowObj[matchedKey];
            }
          }
          return '';
        };

        rawRows.forEach((row, index) => {
          const rowNumber = index + 2; // 表頭為第 1 列，資料從第 2 列起算

          // 排除合計列或說明列
          const firstVal = String(Object.values(row)[0] || '').trim();
          if (
            firstVal.startsWith('【') ||
            firstVal.includes('合計') ||
            firstVal.includes('總計') ||
            firstVal.startsWith('---') ||
            firstVal.includes('說明') ||
            firstVal.includes('指南')
          ) {
            return;
          }

          // 彈性相容各種表頭名稱
          const rawId = String(
            getRowVal(row, ['資料識別碼(系統ID)', '資料識別碼(選填)', '資料識別碼', '系統ID', 'ID', '識別碼'])
          ).trim();

          const rawDate = getRowVal(row, ['交易日期', '日期', 'Date', '帳務日期']);
          const rawType = String(getRowVal(row, ['收支屬性', '收支類別', '收支', '類型', 'Type']) || '支出').trim();
          const rawCategory = String(getRowVal(row, ['支出大類', '主分類', '類別', '分類', 'Category'])).trim();
          const rawSubItem = String(getRowVal(row, ['店家/品項/細項', '項目(店家/品項/來源)', '店家', '品項', '細項', '項目', '摘要', '開銷內容'])).trim();
          const rawAmount = getRowVal(row, ['金額 (NT$)', '金額', 'Amount', '費用', '小計']);
          const rawClaimant = String(getRowVal(row, ['請領同仁', '請領人/經辦人', '請領人', '經辦人', '同仁', 'Claimant'])).trim();
          const rawReceipt = String(getRowVal(row, ['單據憑證類型', '憑證類型', '憑證', '發票/收據'])).trim();
          const rawInvoice = String(getRowVal(row, ['發票號碼', '發票字軌', '發票號', 'Invoice'])).trim();
          const rawPeople = getRowVal(row, ['用餐人數', '人數', '人次', '用餐人數(人)']);
          const rawNote = String(getRowVal(row, ['備註說明', '備註', 'Note', '說明'])).trim();

          // 智慧格式化日期：全面支援 "9/7"、"09/07"、"2026/09/07"、"2026-09-07"、"115/9/7"
          const formattedDate = normalizeDateString(rawDate);

          if (!formattedDate) {
            // 若整行全是空的則略過
            if (!rawSubItem && !rawAmount) return;
            invalidRows.push({
              rowNumber,
              reason: '日期格式無法辨識（支援 YYYY-MM-DD、YYYY/MM/DD 或直接輸入簡寫 9/7）',
              raw: row
            });
            return;
          }

          // 解析金額
          const parsedAmount = Math.round(Number(String(rawAmount).replace(/[^0-9.-]+/g, '')));
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            invalidRows.push({
              rowNumber,
              reason: '金額需為大於 0 之正整數',
              raw: row
            });
            return;
          }

          // 解析店家/品項
          if (!rawSubItem) {
            invalidRows.push({
              rowNumber,
              reason: '店家/品項/細項為必填欄位',
              raw: row
            });
            return;
          }

          // 解析收支類型
          let transType: TransactionType = 'expense';
          if (rawType.includes('撥補') || rawType.includes('收入') || rawType.toLowerCase().includes('income')) {
            transType = 'income';
          }

          // 匹配支出分類
          let categoryId = 'misc';
          let categoryName = '其他雜支';
          if (transType === 'income') {
            categoryId = 'replenish';
            categoryName = '零用金撥補';
          } else {
            const matched = categories.find(
              (c) => c.name.trim() === rawCategory || (rawCategory && c.name.includes(rawCategory))
            );
            if (matched) {
              categoryId = matched.id;
              categoryName = matched.name;
            } else {
              // 依常見字自動辨識
              const sLower = rawSubItem.toLowerCase();
              if (sLower.includes('餐') || sLower.includes('便當') || sLower.includes('飯') || sLower.includes('茶')) {
                categoryId = 'dining';
                categoryName = '餐費';
              } else if (sLower.includes('油') || sLower.includes('車') || sLower.includes('高鐵') || sLower.includes('計程車')) {
                categoryId = 'fuel';
                categoryName = '油資/交通';
              } else if (sLower.includes('文具') || sLower.includes('紙') || sLower.includes('筆') || sLower.includes('墨水')) {
                categoryId = 'stationery';
                categoryName = '文具耗材';
              } else if (sLower.includes('代墊') || sLower.includes('代付')) {
                categoryId = 'advance';
                categoryName = '同仁代墊款';
              } else {
                categoryName = rawCategory || '其他雜支';
              }
            }
          }

          // 憑證類型
          let receiptType: ReceiptType = 'none';
          if (rawReceipt.includes('發票') || rawInvoice) {
            receiptType = 'invoice';
          } else if (rawReceipt.includes('收據')) {
            receiptType = 'receipt';
          }

          // 用餐人數
          let peopleCountNum: number | undefined = undefined;
          if (rawPeople) {
            const p = parseInt(String(rawPeople).replace(/[^0-9]/g, ''), 10);
            if (!isNaN(p) && p > 0) peopleCountNum = p;
          }

          // 請領人
          const finalClaimant = rawClaimant || claimants[0] || '零用金管理員';

          // =====================================
          // 核心防重複檢查 (Deduplication Check)
          // =====================================
          let isDuplicate = false;
          let duplicateReason = '';

          // 1. 若該列有既有系統 ID，且系統已存在此 ID
          if (rawId && existingIdSet.has(rawId.toLowerCase())) {
            isDuplicate = true;
            duplicateReason = `此筆資料識別碼 [${rawId}] 已存在於系統資料庫中，自動略過。`;
          }

          // 2. 檢測特徵碼（日期 + 收支類型 + 金額 + 店家品項 + 請領人 + 發票號碼）
          const fingerprint = getTransactionFingerprint({
            date: formattedDate,
            type: transType,
            amount: parsedAmount,
            subItem: rawSubItem,
            claimant: finalClaimant,
            invoiceNumber: rawInvoice
          });

          if (!isDuplicate && existingFingerprintSet.has(fingerprint)) {
            isDuplicate = true;
            duplicateReason = `資料庫已存在相同日期(${formattedDate})、金額(NT$ ${parsedAmount.toLocaleString()})、品項(${rawSubItem})及同仁之交易紀錄，自動略過避免重複登記。`;
          }

          // 3. 檢測上傳檔案同批次內是否重複
          if (!isDuplicate && ( (rawId && inBatchIdSet.has(rawId.toLowerCase())) || inBatchFingerprintSet.has(fingerprint) )) {
            isDuplicate = true;
            duplicateReason = `檔案中出現重複的多筆相同資料列，自動保留首筆並略過後續重複列。`;
          }

          if (isDuplicate) {
            duplicates.push({
              rowNumber,
              reason: duplicateReason,
              date: formattedDate,
              subItem: rawSubItem,
              amount: parsedAmount,
              type: transType === 'expense' ? '支出' : '撥補',
              claimant: finalClaimant
            });
            return;
          }

          // 通過防重複檢驗，準備寫入新資料！
          const newId = rawId || `tx-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          inBatchIdSet.add(newId.toLowerCase());
          inBatchFingerprintSet.add(fingerprint);

          newTransactions.push({
            id: newId,
            date: formattedDate,
            type: transType,
            categoryId,
            categoryName,
            subItem: rawSubItem,
            amount: parsedAmount,
            claimant: finalClaimant,
            receiptType,
            invoiceNumber: rawInvoice || undefined,
            peopleCount: peopleCountNum,
            note: rawNote,
            createdAt: Date.now()
          });
        });

        resolve({
          success: true,
          totalRows: rawRows.length,
          newTransactions,
          duplicates,
          invalidRows
        });
      } catch (err: any) {
        resolve({
          success: false,
          totalRows: 0,
          newTransactions: [],
          duplicates: [],
          invalidRows: [],
          errorMessage: `解析試算表檔案時發生錯誤：${err?.message || String(err)}`
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        totalRows: 0,
        newTransactions: [],
        duplicates: [],
        invalidRows: [],
        errorMessage: '讀取檔案失敗，請確認檔案格式是否受損。'
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * 匯出合作廠商通訊錄與銀行付款資料表至 Excel (.xlsx)：
 * 支援多工作表：
 * 1. 廠商通訊錄與付款帳號總表 (含統編、負責人、電話、付款條件、銀行帳戶、供應品項)
 * 2. 廠商聯絡人通訊明細清單 (各家廠商之主要與次要聯絡窗口、手機、職稱、Email)
 */
export function exportSupplierDirectoryToExcel(
  customers: Customer[],
  options?: {
    isSupplierOnly?: boolean;
    companyTitle?: string;
    fileNamePrefix?: string;
  }
): void {
  const isSupplierOnly = options?.isSupplierOnly ?? true;
  const list = isSupplierOnly ? customers.filter((c) => c.isSupplier) : customers;
  const printDateStr = new Date().toLocaleString('zh-TW', { hour12: false });
  const printDateOnly = new Date().toISOString().slice(0, 10);
  const title = options?.companyTitle ? `${options.companyTitle} - ` : '';

  // 1. 廠商通訊錄主工作表
  const mainRows: any[] = list.map((c, index) => {
    // 彙整聯絡人字串
    const contactsSummary = (c.contacts || [])
      .map((p) => `${p.name}${p.title ? `(${p.title})` : ''} ${p.mobile || p.phone || ''}`.trim())
      .filter(Boolean)
      .join('； ');

    // 禮金往來加總
    const evts = c.events || [];
    const giftTotal = evts.reduce((sum, e) => (e.hasAmount && e.amount ? sum + (e.direction === 'incoming' ? -e.amount : e.amount) : sum), 0);

    return {
      '編號': index + 1,
      '廠商全名': c.name,
      '所屬業務分類': c.supplierCategory || '未分類',
      '簡稱/別名': c.shortName || '',
      '身分類別': c.isIndividual ? '個人工班/師傅' : '公司法人/行號',
      '統一編號': c.taxId ? String(c.taxId) : '',
      '負責人/代表人': c.representative || '',
      '負責人手機': c.representativeMobile || '',
      '現場主管/副主管': c.secondaryRepresentative || '',
      '公司代表電話': c.phone1 || '',
      '備用電話/專線': c.phone2 || '',
      '傳真號碼': c.fax || '',
      '電子信箱': c.email || '',
      'LINE ID': c.lineId || '',
      '郵遞區號': c.postalCode || '',
      '通訊/營業地址': c.address || '',
      '送貨/工程地址': c.shippingAddress || '',
      '配合收款方式/票期': c.paymentTerm || '',
      '往來銀行': c.bankName || '',
      '分行名稱': c.bankBranch || '',
      '匯款帳號': c.bankAccount ? `'${c.bankAccount}` : '', // 加單引號避免 Excel 遺失前導零
      '匯款戶名': c.accountName || '',
      '營業項目/供應內容': c.businessItems || '',
      '主要聯絡人總覽': contactsSummary || '無個別窗口紀錄',
      '交際禮金往來筆數': evts.length > 0 ? `${evts.length} 筆` : '無',
      '禮金累計結算 (NT$)': giftTotal !== 0 ? giftTotal : 0,
      '兼具客戶身分': c.isCustomer ? '是' : '否',
      '備註說明': c.note || '',
      '資料產出日期': printDateOnly
    };
  });

  const mainSheet = XLSX.utils.json_to_sheet(mainRows);
  mainSheet['!cols'] = [
    { wch: 8 },  // 編號
    { wch: 24 }, // 廠商全名
    { wch: 14 }, // 簡稱
    { wch: 16 }, // 身分類別
    { wch: 14 }, // 統一編號
    { wch: 14 }, // 負責人
    { wch: 15 }, // 負責人手機
    { wch: 16 }, // 現場主管
    { wch: 16 }, // 公司電話
    { wch: 16 }, // 備用電話
    { wch: 14 }, // 傳真
    { wch: 22 }, // Email
    { wch: 14 }, // LINE
    { wch: 10 }, // 郵遞區號
    { wch: 32 }, // 地址
    { wch: 30 }, // 送貨地址
    { wch: 24 }, // 付款方式
    { wch: 18 }, // 往來銀行
    { wch: 14 }, // 分行名稱
    { wch: 22 }, // 匯款帳號
    { wch: 20 }, // 匯款戶名
    { wch: 26 }, // 營業項目
    { wch: 35 }, // 聯絡人
    { wch: 16 }, // 禮金筆數
    { wch: 18 }, // 禮金累計
    { wch: 14 }, // 兼客戶
    { wch: 28 }, // 備註
    { wch: 14 }  // 產出日期
  ];

  // 2. 聯絡人詳細窗口工作表
  const contactRows: any[] = [];
  list.forEach((c) => {
    if (c.contacts && c.contacts.length > 0) {
      c.contacts.forEach((p, idx) => {
        contactRows.push({
          '廠商/公司名稱': c.name,
          '統一編號': c.taxId || '',
          '窗口順序': idx + 1,
          '聯絡人姓名': p.name,
          '職稱': p.title || '',
          '行動電話': p.mobile || '',
          '市話/分機': p.phone || '',
          '電子郵件': p.email || '',
          'LINE ID': p.lineId || '',
          '窗口備註': p.note || ''
        });
      });
    }
  });

  const contactSheet = XLSX.utils.json_to_sheet(contactRows);
  contactSheet['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 16 },
    { wch: 24 }
  ];

  // 組合工作表
  const workbook = XLSX.utils.book_new();
  const mainTabName = isSupplierOnly ? '合作廠商通訊錄與銀行帳號' : '全客戶與廠商通訊名錄';
  XLSX.utils.book_append_sheet(workbook, mainSheet, mainTabName);
  if (contactRows.length > 0) {
    XLSX.utils.book_append_sheet(workbook, contactSheet, '聯絡人窗口名單');
  }

  // 檔名設定
  const dateStr = printDateOnly.replace(/-/g, '');
  const prefix = options?.fileNamePrefix || (isSupplierOnly ? '合作廠商通訊錄與付款資料表' : '全客戶與廠商通訊名冊');
  const fileName = `${title}${dateStr}_${prefix}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * 匯出合作廠商通訊錄為標準 CSV 格式 (附 UTF-8 BOM，Excel 直接點擊開啟不亂碼)
 */
export function exportSupplierDirectoryToCsv(
  customers: Customer[],
  options?: {
    isSupplierOnly?: boolean;
    companyTitle?: string;
  }
): void {
  const isSupplierOnly = options?.isSupplierOnly ?? true;
  const list = isSupplierOnly ? customers.filter((c) => c.isSupplier) : customers;
  const printDateOnly = new Date().toISOString().slice(0, 10);
  const title = options?.companyTitle ? `${options.companyTitle}_` : '';

  const headers = [
    '編號',
    '廠商全名',
    '所屬業務分類',
    '簡稱',
    '身分類別',
    '統一編號',
    '負責人',
    '負責人手機',
    '主要電話',
    '傳真號碼',
    '電子信箱',
    '營業地址',
    '收款方式與票期',
    '往來銀行',
    '分行名稱',
    '匯款帳號',
    '匯款戶名',
    '營業項目與供應物料',
    '聯絡窗口名單',
    '備註'
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = list.map((c, index) => {
    const contactsSummary = (c.contacts || [])
      .map((p) => `${p.name}${p.title ? `(${p.title})` : ''} ${p.mobile || ''}`.trim())
      .filter(Boolean)
      .join('; ');

    return [
      escapeCsv(index + 1),
      escapeCsv(c.name),
      escapeCsv(c.supplierCategory || '未分類'),
      escapeCsv(c.shortName || ''),
      escapeCsv(c.isIndividual ? '個人工班' : '公司法人'),
      escapeCsv(c.taxId || ''),
      escapeCsv(c.representative || ''),
      escapeCsv(c.representativeMobile || ''),
      escapeCsv(c.phone1 || c.phone2 || ''),
      escapeCsv(c.fax || ''),
      escapeCsv(c.email || ''),
      escapeCsv(c.address || ''),
      escapeCsv(c.paymentTerm || ''),
      escapeCsv(c.bankName || ''),
      escapeCsv(c.bankBranch || ''),
      escapeCsv(c.bankAccount ? `\t${c.bankAccount}` : ''), // 帶 tab 防止 excel 轉科學符號
      escapeCsv(c.accountName || ''),
      escapeCsv(c.businessItems || ''),
      escapeCsv(contactsSummary),
      escapeCsv(c.note || '')
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = printDateOnly.replace(/-/g, '');
  link.download = `${title}${dateStr}_${isSupplierOnly ? '合作廠商通訊錄' : '通訊名冊'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

