import * as XLSX from 'xlsx';
import { Transaction, MonthBudget, CategoryConfig, ReceiptType, TransactionType } from '../types';

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
  // 4. 【收支流水明細表】(含系統 ID 供回溯防重複比對)
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
      '資料識別碼(系統ID)': t.id,
      '交易日期': t.date,
      '收支屬性': isExpense ? '零用金支出' : '零用金撥補',
      '請領人/經辦人': t.claimant || '-',
      '主分類': t.categoryName || (isExpense ? '支出' : '撥補'),
      '項目(店家/品項/來源)': t.subItem,
      '金額 (NT$)': t.amount,
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
    '資料識別碼(系統ID)': `總計 ${filtered.length} 筆資料`,
    '交易日期': printDateOnly,
    '收支屬性': `支出 ${expensesOnly.length} 筆 / 撥補 ${incomesOnly.length} 筆`,
    '請領人/經辦人': '-',
    '主分類': '-',
    '項目(店家/品項/來源)': `總支出 NT$ ${totalExpense.toLocaleString()}，總撥入 NT$ ${totalIncome.toLocaleString()}`,
    '金額 (NT$)': totalExpense,
    '單據憑證類型': `發票 ${invoiceCount} 張 / 收據 ${receiptCount} 張`,
    '發票號碼': '-',
    '用餐人數': `${totalDiningPeople} 人次`,
    '每人均攤 (NT$)': '-',
    '備註說明': `淨差額結餘 NT$ ${netPettyCash.toLocaleString()} 元`,
    '報表產出日期': printDateStr
  });

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 13 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 26 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
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

  // 組合活頁簿 (五大核心財務分析報表)
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reportSheet, '零用金財務綜合指標');
  XLSX.utils.book_append_sheet(workbook, dailySheet, '收支日報表');
  XLSX.utils.book_append_sheet(workbook, categorySheet, '支出分類統計表');
  XLSX.utils.book_append_sheet(workbook, detailSheet, '收支流水明細表');
  XLSX.utils.book_append_sheet(workbook, complianceSheet, '憑證與同仁統計表');

  // 檔名設定
  const filePrefix = yearMonthFilter ? `${yearMonthFilter}_公司零用金綜合帳務報表` : '全歷史_公司零用金綜合帳務報表';
  const fileName = `${filePrefix}_${printDateOnly}.xlsx`;

  // 觸發下載
  XLSX.writeFile(workbook, fileName);
}

/**
 * 產生並下載「空白記帳匯入範本 (Excel)」
 * 提供標準表頭欄位、填寫範例以及防重複匯入機制說明
 */
export function generateBlankImportTemplate(): void {
  const sampleRows = [
    {
      '交易日期': '2026-09-15',
      '收支屬性': '支出',
      '支出大類': '餐費',
      '店家/品項/細項': '池上便當 (工廠午餐)',
      '金額': 950,
      '請領同仁': '陳小明',
      '憑證類型': '發票',
      '發票號碼': 'AB-12345678',
      '用餐人數': 10,
      '備註說明': '工廠加班會議便當',
      '資料識別碼(選填)': ''
    },
    {
      '交易日期': '2026-09-16',
      '收支屬性': '支出',
      '支出大類': '油資/交通',
      '店家/品項/細項': '台灣中油加油站',
      '金額': 1200,
      '請領同仁': '李大華',
      '憑證類型': '發票',
      '發票號碼': 'CD-87654321',
      '用餐人數': '',
      '備註說明': '公務車9座加油出勤',
      '資料識別碼(選填)': ''
    },
    {
      '交易日期': '2026-09-17',
      '收支屬性': '支出',
      '支出大類': '其他雜支',
      '店家/品項/細項': '日日新五金行',
      '金額': 450,
      '請領同仁': '王小美',
      '憑證類型': '收據',
      '發票號碼': '',
      '用餐人數': '',
      '備註說明': '廠務修繕水管材料',
      '資料識別碼(選填)': ''
    },
    {
      '交易日期': '2026-09-18',
      '收支屬性': '撥補',
      '支出大類': '零用金撥補',
      '店家/品項/細項': '公司銀行帳戶提領',
      '金額': 20000,
      '請領同仁': '零用金管理員',
      '憑證類型': '無',
      '發票號碼': '',
      '用餐人數': '',
      '備註說明': '月中零用金常態撥補補足水位',
      '資料識別碼(選填)': ''
    }
  ];

  const templateSheet = XLSX.utils.json_to_sheet(sampleRows);
  templateSheet['!cols'] = [
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

  const guideRows = [
    { '欄位名稱': '【重要防重複機制說明】', '必填與格式規範': '本系統具備智慧防重複檢視！即使匯入過程曾經失敗或重複上傳，已存在資料庫的資料會自動略過，只會新增還沒登記的新資料。', '範例說明': '安心重複上傳不重複記帳' },
    { '欄位名稱': '交易日期', '必填與格式規範': '必填。請填寫西元年月日格式，如：2026-09-15 或 2026/09/15', '範例說明': '2026-09-15' },
    { '欄位名稱': '收支屬性', '必填與格式規範': '必填。請填「支出」或「撥補」（或收入）', '範例說明': '支出' },
    { '欄位名稱': '支出大類', '必填與格式規範': '選填。如：餐費、油資/交通、同仁代墊款、文具耗材、其他雜支、零用金撥補', '範例說明': '餐費' },
    { '欄位名稱': '店家/品項/細項', '必填與格式規範': '必填。請填寫消費店家名稱、加油站、或開銷品項', '範例說明': '池上便當、台灣中油' },
    { '欄位名稱': '金額', '必填與格式規範': '必填。請填大於 0 的正整數金額，勿填負數或特殊符號', '範例說明': '950' },
    { '欄位名稱': '請領同仁', '必填與格式規範': '選填。請領款項或代辦採買的同仁姓名', '範例說明': '陳小明、李大華' },
    { '欄位名稱': '憑證類型', '必填與格式規範': '選填。請填「發票」、「收據」或「無」', '範例說明': '發票' },
    { '欄位名稱': '發票號碼', '必填與格式規範': '選填。若憑證為發票可填入8碼或英數字軌號碼', '範例說明': 'AB-12345678' },
    { '欄位名稱': '用餐人數', '必填與格式規範': '選填。若為餐飲用餐請款可填人數，以利人均均攤計算', '範例說明': '5' },
    { '欄位名稱': '備註說明', '必填與格式規範': '選填。開銷事由、專案名稱或特殊備註說明', '範例說明': '工地出勤中餐' },
    { '欄位名稱': '資料識別碼(選填)', '必填與格式規範': '選填。若是由系統「匯出」的 Excel 修改補登，保留此欄可進行 100% 精準唯一比對', '範例說明': 'tx-1726500000' }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guideRows);
  guideSheet['!cols'] = [{ wch: 20 }, { wch: 60 }, { wch: 30 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, templateSheet, '零用金記帳匯入表');
  XLSX.utils.book_append_sheet(workbook, guideSheet, '填寫規範與防重複說明');

  XLSX.writeFile(workbook, `公司零用金記帳匯入空白範本.xlsx`);
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
 * 匯入並檢核 Excel / CSV 檔案：
 * 1. 支援「智慧防重複檢核」
 * 2. 比對資料庫現有 ID 與複合交易特徵
 * 3. 略過重複項目，只加入全新資料
 * 4. 即使多次上傳或斷點續傳，也保證資料庫完全不會有重複登記事項
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
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
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

        rawRows.forEach((row, index) => {
          const rowNumber = index + 2; // 表頭為第 1 列，資料從第 2 列起算

          // 排除合計列或說明列
          const firstVal = String(Object.values(row)[0] || '').trim();
          if (
            firstVal.startsWith('【') ||
            firstVal.includes('合計') ||
            firstVal.includes('總計') ||
            firstVal.startsWith('---')
          ) {
            return;
          }

          // 欄位辨識（相容多種常見表頭名稱）
          const rawId = String(
            row['資料識別碼(系統ID)'] ||
            row['資料識別碼(選填)'] ||
            row['資料識別碼'] ||
            row['系統ID'] ||
            row['ID'] ||
            ''
          ).trim();

          const rawDate = row['交易日期'] || row['日期'] || row['Date'] || '';
          const rawType = String(row['收支屬性'] || row['收支類別'] || row['類型'] || row['Type'] || '支出').trim();
          const rawCategory = String(row['支出大類'] || row['主分類'] || row['分類'] || '').trim();
          const rawSubItem = String(row['店家/品項/細項'] || row['項目(店家/品項/來源)'] || row['店家'] || row['品項'] || row['細項'] || row['項目'] || '').trim();
          const rawAmount = row['金額 (NT$)'] || row['金額'] || row['Amount'] || '';
          const rawClaimant = String(row['請領同仁'] || row['請領人/經辦人'] || row['請領人'] || row['經辦人'] || '').trim();
          const rawReceipt = String(row['單據憑證類型'] || row['憑證類型'] || row['憑證'] || '').trim();
          const rawInvoice = String(row['發票號碼'] || row['發票字軌'] || '').trim();
          const rawPeople = row['用餐人數'] || row['人數'] || '';
          const rawNote = String(row['備註說明'] || row['備註'] || '').trim();

          // 格式化日期
          let formattedDate = '';
          if (rawDate instanceof Date) {
            formattedDate = rawDate.toISOString().slice(0, 10);
          } else if (typeof rawDate === 'number') {
            // Excel serial date format
            const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            if (!isNaN(d.getTime())) {
              formattedDate = d.toISOString().slice(0, 10);
            }
          } else if (typeof rawDate === 'string') {
            const trimmed = rawDate.trim().replace(/\//g, '-');
            const match = trimmed.match(/^\d{4}-\d{1,2}-\d{1,2}/);
            if (match) {
              const parts = match[0].split('-');
              formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }

          if (!formattedDate) {
            // 若整行全是空的則略過
            if (!rawSubItem && !rawAmount) return;
            invalidRows.push({
              rowNumber,
              reason: '日期格式無法辨識（請填寫 YYYY-MM-DD）',
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
