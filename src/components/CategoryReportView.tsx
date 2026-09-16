import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  FileSpreadsheet, 
  TrendingUp, 
  Coins, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  PieChart,
  BarChart3,
  Utensils,
  Fuel,
  HandCoins,
  PackageCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Transaction, CategoryConfig, MonthBudget } from '../types';
import * as XLSX from 'xlsx';
import { CategoryDrilldownModal } from './CategoryDrilldownModal';

interface CategoryReportViewProps {
  transactions: Transaction[];
  categories: CategoryConfig[];
  currentYearMonth: string;
  budgets?: Record<string, MonthBudget>;
}

export const CategoryReportView: React.FC<CategoryReportViewProps> = ({
  transactions,
  categories,
  currentYearMonth,
  budgets = {}
}) => {
  // 報表模式：'month' (分類月報表) 或 'year' (分類年報表)
  const [reportMode, setReportMode] = useState<'month' | 'year'>('month');

  // 目前選擇的年月（月報表使用，例如 "2026-09"）
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // 目前選擇的年份（年報表使用，例如 "2026"）
  const initialYear = currentYearMonth.split('-')[0] || new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);

  // 鑽取彈窗狀態
  const [drilldownCategory, setDrilldownCategory] = useState<{
    isOpen: boolean;
    name: string;
    id?: string;
  }>({
    isOpen: false,
    name: '',
    id: undefined
  });

  // 計算所有出現在交易中的年份清單
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(initialYear);
    transactions.forEach((t) => {
      const y = t.date.split('-')[0];
      if (y) years.add(y);
    });
    return Array.from(years).sort().reverse();
  }, [transactions, initialYear]);

  // 計算所有出現在交易中的月份清單
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentYearMonth);
    transactions.forEach((t) => {
      const ym = t.date.slice(0, 7);
      if (ym) months.add(ym);
    });
    return Array.from(months).sort().reverse();
  }, [transactions, currentYearMonth]);

  // ==========================================
  // 1. 月報表計算
  // ==========================================
  const monthlyData = useMemo(() => {
    const monthTx = transactions.filter((t) => t.date.startsWith(selectedMonth));
    const expenses = monthTx.filter((t) => t.type === 'expense');
    const incomes = monthTx.filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // 依分類彙整
    const categoryStats: Record<string, {
      name: string;
      id: string;
      color: string;
      amount: number;
      count: number;
      percentage: number;
      items: Record<string, number>;
      claimants: Record<string, number>;
    }> = {};

    // 預設將現有分類建立底層 map
    categories.forEach((cat) => {
      categoryStats[cat.id] = {
        name: cat.name,
        id: cat.id,
        color: cat.color,
        amount: 0,
        count: 0,
        percentage: 0,
        items: {},
        claimants: {}
      };
    });

    // 彙整交易
    expenses.forEach((t) => {
      const catId = t.categoryId || 'misc';
      const catName = t.categoryName || '其他';
      if (!categoryStats[catId]) {
        categoryStats[catId] = {
          name: catName,
          id: catId,
          color: '#78716c',
          amount: 0,
          count: 0,
          percentage: 0,
          items: {},
          claimants: {}
        };
      }
      categoryStats[catId].amount += t.amount;
      categoryStats[catId].count += 1;

      // 項目統計
      const item = t.subItem || '未分類';
      categoryStats[catId].items[item] = (categoryStats[catId].items[item] || 0) + t.amount;

      // 請領人統計
      if (t.claimant) {
        categoryStats[catId].claimants[t.claimant] = (categoryStats[catId].claimants[t.claimant] || 0) + t.amount;
      }
    });

    // 計算佔比與排序
    const list = Object.values(categoryStats)
      .filter((c) => c.amount > 0 || categories.some((orig) => orig.id === c.id))
      .map((c) => ({
        ...c,
        percentage: totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // TOP 請領人統計
    const claimantTotals: Record<string, number> = {};
    expenses.forEach((t) => {
      if (t.claimant) {
        claimantTotals[t.claimant] = (claimantTotals[t.claimant] || 0) + t.amount;
      }
    });
    const topClaimants = Object.entries(claimantTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // TOP 店家項目
    const itemTotals: Record<string, { amount: number; cat: string }> = {};
    expenses.forEach((t) => {
      if (t.subItem) {
        if (!itemTotals[t.subItem]) {
          itemTotals[t.subItem] = { amount: 0, cat: t.categoryName };
        }
        itemTotals[t.subItem].amount += t.amount;
      }
    });
    const topItems = Object.entries(itemTotals)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);

    return {
      monthTx,
      totalExpense,
      totalIncome,
      netBalance,
      expenseCount: expenses.length,
      categoryList: list,
      topClaimants,
      topItems
    };
  }, [transactions, categories, selectedMonth]);

  // ==========================================
  // 2. 年報表計算 (1~12 月交叉分析)
  // ==========================================
  const yearlyData = useMemo(() => {
    const yearPrefix = `${selectedYear}-`;
    const yearTx = transactions.filter((t) => t.date.startsWith(yearPrefix));
    const yearExpenses = yearTx.filter((t) => t.type === 'expense');
    const yearIncomes = yearTx.filter((t) => t.type === 'income');

    const totalExpense = yearExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = yearIncomes.reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return `${selectedYear}-${m}`;
    });

    // 矩陣結構：每個分類在 1~12 月的支出
    // map: categoryId -> { name, color, months: [m1...m12], total, percentage }
    const matrix: Record<string, {
      id: string;
      name: string;
      color: string;
      monthlyAmounts: number[];
      total: number;
      percentage: number;
    }> = {};

    categories.forEach((cat) => {
      matrix[cat.id] = {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        monthlyAmounts: Array(12).fill(0),
        total: 0,
        percentage: 0
      };
    });

    yearExpenses.forEach((t) => {
      const catId = t.categoryId || 'misc';
      const catName = t.categoryName || '其他';
      if (!matrix[catId]) {
        matrix[catId] = {
          id: catId,
          name: catName,
          color: '#78716c',
          monthlyAmounts: Array(12).fill(0),
          total: 0,
          percentage: 0
        };
      }
      const monthIdx = parseInt(t.date.split('-')[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        matrix[catId].monthlyAmounts[monthIdx] += t.amount;
        matrix[catId].total += t.amount;
      }
    });

    // 每月支出總和
    const monthlyTotalExpenses = Array(12).fill(0);
    const monthlyTotalIncomes = Array(12).fill(0);

    yearExpenses.forEach((t) => {
      const monthIdx = parseInt(t.date.split('-')[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyTotalExpenses[monthIdx] += t.amount;
      }
    });

    yearIncomes.forEach((t) => {
      const monthIdx = parseInt(t.date.split('-')[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyTotalIncomes[monthIdx] += t.amount;
      }
    });

    const categoryRows = Object.values(matrix)
      .map((row) => ({
        ...row,
        percentage: totalExpense > 0 ? (row.total / totalExpense) * 100 : 0
      }))
      .filter((row) => row.total > 0 || categories.some((c) => c.id === row.id))
      .sort((a, b) => b.total - a.total);

    return {
      months,
      totalExpense,
      totalIncome,
      netBalance,
      categoryRows,
      monthlyTotalExpenses,
      monthlyTotalIncomes
    };
  }, [transactions, categories, selectedYear]);

  // ==========================================
  // 3. 匯出 Excel
  // ==========================================
  // 匯出月報表
  const handleExportMonthExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: 分類支出彙整
    const catRows = monthlyData.categoryList.map((c, idx) => ({
      '排名': idx + 1,
      '支出分類': c.name,
      '支出總額 (NT$)': c.amount,
      '開支筆數': c.count,
      '平均每筆 (NT$)': c.count > 0 ? Math.round(c.amount / c.count) : 0,
      '佔比': `${c.percentage.toFixed(1)}%`
    }));
    catRows.push({
      '排名': '-' as any,
      '支出分類': '【當月支出合計】',
      '支出總額 (NT$)': monthlyData.totalExpense,
      '開支筆數': monthlyData.expenseCount,
      '平均每筆 (NT$)': monthlyData.expenseCount > 0 ? Math.round(monthlyData.totalExpense / monthlyData.expenseCount) : 0,
      '佔比': '100.0%'
    });
    const ws1 = XLSX.utils.json_to_sheet(catRows);
    XLSX.utils.book_append_sheet(wb, ws1, `${selectedMonth}_分類彙整`);

    // Sheet 2: 請領人與 TOP 店家
    const topClaimantRows = monthlyData.topClaimants.map(([name, amt]) => ({
      '請領同仁': name,
      '請領總金額 (NT$)': amt,
      '佔總支出比例': `${monthlyData.totalExpense > 0 ? ((amt / monthlyData.totalExpense) * 100).toFixed(1) : 0}%`
    }));
    const ws2 = XLSX.utils.json_to_sheet(topClaimantRows);
    XLSX.utils.book_append_sheet(wb, ws2, `同仁請領排行`);

    XLSX.writeFile(wb, `零用金分類月報表_${selectedMonth}.xlsx`);
  };

  // 匯出年報表 (年度交叉分析表)
  const handleExportYearExcel = () => {
    const wb = XLSX.utils.book_new();

    // 建立交叉矩陣列
    const matrixRows: any[] = [];
    yearlyData.categoryRows.forEach((row) => {
      const obj: any = {
        '支出主分類': row.name
      };
      row.monthlyAmounts.forEach((amt, idx) => {
        obj[`${idx + 1}月 (NT$)`] = amt;
      });
      obj['年度總計 (NT$)'] = row.total;
      obj['月均支出 (NT$)'] = Math.round(row.total / 12);
      obj['年度佔比'] = `${row.percentage.toFixed(1)}%`;
      matrixRows.push(obj);
    });

    // 每月支出總和列
    const totalExpRow: any = { '支出主分類': '【每月總支出】' };
    yearlyData.monthlyTotalExpenses.forEach((amt, idx) => {
      totalExpRow[`${idx + 1}月 (NT$)`] = amt;
    });
    totalExpRow['年度總計 (NT$)'] = yearlyData.totalExpense;
    totalExpRow['月均支出 (NT$)'] = Math.round(yearlyData.totalExpense / 12);
    totalExpRow['年度佔比'] = '100.0%';
    matrixRows.push(totalExpRow);

    // 每月撥補總和列
    const totalIncRow: any = { '支出主分類': '【每月總撥補】' };
    yearlyData.monthlyTotalIncomes.forEach((amt, idx) => {
      totalIncRow[`${idx + 1}月 (NT$)`] = amt;
    });
    totalIncRow['年度總計 (NT$)'] = yearlyData.totalIncome;
    totalIncRow['月均支出 (NT$)'] = Math.round(yearlyData.totalIncome / 12);
    totalIncRow['年度佔比'] = '-';
    matrixRows.push(totalIncRow);

    const ws = XLSX.utils.json_to_sheet(matrixRows);
    XLSX.utils.book_append_sheet(wb, ws, `${selectedYear}年度交叉分析表`);
    XLSX.writeFile(wb, `零用金年度分類交叉分析表_${selectedYear}.xlsx`);
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'dining':
        return <Utensils className="w-4 h-4 text-orange-600" />;
      case 'fuel':
        return <Fuel className="w-4 h-4 text-sky-600" />;
      case 'advance':
        return <HandCoins className="w-4 h-4 text-purple-600" />;
      case 'misc':
        return <PackageCheck className="w-4 h-4 text-amber-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 報表頂部工具列 */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                零用金分類財務報表（月報表 & 年報表）
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                完整統計各項分類的支出比重、月度損益與 1~12 月年度交叉分析矩陣
              </p>
            </div>
          </div>
        </div>

        {/* 控制按鈕區：切換月報/年報、選擇年月、匯出 Excel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 模式切換 */}
          <div className="inline-flex p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setReportMode('month')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportMode === 'month'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📅 分類月報表
            </button>
            <button
              type="button"
              onClick={() => setReportMode('year')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportMode === 'year'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📊 1~12月交叉年報表
            </button>
          </div>

          {/* 月份或年份選擇下拉選單 */}
          {reportMode === 'month' ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-stone-800 cursor-pointer shadow-2xs"
              >
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {ym} 報表
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-stone-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 text-stone-800 cursor-pointer shadow-2xs"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y} 年度交叉表
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 匯出 Excel 按鈕 */}
          <button
            type="button"
            onClick={reportMode === 'month' ? handleExportMonthExcel : handleExportYearExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer ml-auto sm:ml-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>匯出 {reportMode === 'month' ? '月度報表' : '年度交叉表'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 視圖 A：分類月報表 */}
      {/* ========================================================================= */}
      {reportMode === 'month' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 當月核心財務摘要指標 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">當月總支出</span>
              <div className="text-xl font-bold text-rose-600 mt-1 font-mono">
                NT$ {monthlyData.totalExpense.toLocaleString()}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                累計 {monthlyData.expenseCount} 筆支出開銷
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">當月總撥補 (收入)</span>
              <div className="text-xl font-bold text-emerald-600 mt-1 font-mono">
                NT$ {monthlyData.totalIncome.toLocaleString()}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                銀行提領 / 款項繳回
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">本月零用金淨額 (收-支)</span>
              <div className={`text-xl font-bold mt-1 font-mono ${
                monthlyData.netBalance >= 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {monthlyData.netBalance >= 0 ? '+' : ''}NT$ {monthlyData.netBalance.toLocaleString()}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                {monthlyData.netBalance >= 0 ? '水位充足' : '支出大於撥補'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">單筆平均支出</span>
              <div className="text-xl font-bold text-stone-900 mt-1 font-mono">
                NT$ {monthlyData.expenseCount > 0 ? Math.round(monthlyData.totalExpense / monthlyData.expenseCount).toLocaleString() : 0}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                平均單筆零用金請領額
              </span>
            </div>
          </div>

          {/* 主要表格：各主分類明細與佔比 */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  {selectedMonth} 主分類支出統計清單
                </h3>
              </div>
              <span className="text-xs text-stone-400">
                點擊任一分類即可開啟「細項流水帳視窗」
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold">
                    <th className="py-3 px-4">主分類名稱</th>
                    <th className="py-3 px-4 text-right">開支筆數</th>
                    <th className="py-3 px-4 text-right">支出總金額</th>
                    <th className="py-3 px-4 text-right">單筆平均</th>
                    <th className="py-3 px-4">支出佔比分布</th>
                    <th className="py-3 px-4 text-center">細項分析</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  {monthlyData.categoryList.map((cat) => (
                    <tr 
                      key={cat.id} 
                      onClick={() => setDrilldownCategory({ isOpen: true, name: cat.name, id: cat.id })}
                      className="hover:bg-amber-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span 
                            className="w-3.5 h-3.5 rounded-full shrink-0" 
                            style={{ backgroundColor: cat.color }} 
                          />
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            {getCategoryIcon(cat.id)}
                            <span>{cat.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {cat.count} 筆
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                        NT$ {cat.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-600">
                        NT$ {cat.count > 0 ? Math.round(cat.amount / cat.count).toLocaleString() : 0}
                      </td>
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="grow bg-stone-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${cat.percentage}%`,
                                backgroundColor: cat.color
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-stone-700 w-12 text-right">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold group-hover:underline">
                          <span>查看細項</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {monthlyData.categoryList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-400">
                        本月份尚無任何支出記錄
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100/70 border-t-2 border-stone-200 font-bold text-stone-900">
                    <td className="py-3 px-4">當月支出合計</td>
                    <td className="py-3 px-4 text-right font-mono">{monthlyData.expenseCount} 筆</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">
                      NT$ {monthlyData.totalExpense.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      NT$ {monthlyData.expenseCount > 0 ? Math.round(monthlyData.totalExpense / monthlyData.expenseCount).toLocaleString() : 0}
                    </td>
                    <td className="py-3 px-4 font-mono">100.0%</td>
                    <td className="py-3 px-4 text-center">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 輔助分析：TOP 請領同仁與 TOP 店家 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TOP 請領同仁 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <Users className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-stone-900">
                  {selectedMonth} 常用請領同仁金額排行
                </h4>
              </div>

              {monthlyData.topClaimants.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">本月無請領人紀錄</p>
              ) : (
                <div className="space-y-2">
                  {monthlyData.topClaimants.map(([name, amt], idx) => {
                    const pct = monthlyData.totalExpense > 0 ? (amt / monthlyData.totalExpense) * 100 : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            idx === 0 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-stone-800">{name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-rose-600 font-mono">NT$ {amt.toLocaleString()}</span>
                          <span className="text-[10px] text-stone-400 ml-2">({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TOP 店家項目 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-stone-900">
                  {selectedMonth} 開銷最高項目 / 店家
                </h4>
              </div>

              {monthlyData.topItems.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">本月無項目開銷紀錄</p>
              ) : (
                <div className="space-y-2">
                  {monthlyData.topItems.map(([item, info], idx) => {
                    const pct = monthlyData.totalExpense > 0 ? (info.amount / monthlyData.totalExpense) * 100 : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            idx === 0 ? 'bg-rose-500 text-white' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-stone-800">{item}</span>
                            <span className="text-[10px] text-stone-400 ml-1.5">[{info.cat}]</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-rose-600 font-mono">NT$ {info.amount.toLocaleString()}</span>
                          <span className="text-[10px] text-stone-400 ml-2">({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 視圖 B：1~12 月分類交叉年報表 (樞紐分析表) */}
      {/* ========================================================================= */}
      {reportMode === 'year' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 年度摘要指標 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">{selectedYear} 年度總支出</span>
              <div className="text-xl font-bold text-rose-600 mt-1 font-mono">
                NT$ {yearlyData.totalExpense.toLocaleString()}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                平均每月開支 NT$ {Math.round(yearlyData.totalExpense / 12).toLocaleString()}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">{selectedYear} 年度總撥補 (收入)</span>
              <div className="text-xl font-bold text-emerald-600 mt-1 font-mono">
                NT$ {yearlyData.totalIncome.toLocaleString()}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                累計撥入公司零用金額
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">{selectedYear} 年度結餘水位</span>
              <div className={`text-xl font-bold mt-1 font-mono ${
                yearlyData.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {yearlyData.netBalance >= 0 ? '+' : ''}NT$ {yearlyData.netBalance.toLocaleString()}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">
                全年度總撥補扣除總支出
              </span>
            </div>
          </div>

          {/* 1~12 月交叉分析矩陣表 (樞紐分析表) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  {selectedYear} 年度 1 ~ 12 月主分類交叉分析樞紐表 (NT$)
                </h3>
              </div>
              <span className="text-xs text-stone-400">
                橫軸為月份，縱軸為支出分類
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold font-sans">
                    <th className="py-3 px-3 text-left sticky left-0 bg-stone-50 z-10 whitespace-nowrap min-w-[120px] shadow-2xs">
                      主分類
                    </th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="py-3 px-2 text-right whitespace-nowrap min-w-[70px]">
                        {i + 1}月
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right bg-stone-100/70 whitespace-nowrap min-w-[90px] font-bold text-stone-900">
                      年度合計
                    </th>
                    <th className="py-3 px-3 text-right bg-stone-100/70 whitespace-nowrap min-w-[80px]">
                      月均支出
                    </th>
                    <th className="py-3 px-3 text-right bg-stone-100/70 whitespace-nowrap min-w-[70px]">
                      年度佔比
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {yearlyData.categoryRows.map((row) => (
                    <tr key={row.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2.5 px-3 text-left font-sans font-bold text-stone-900 sticky left-0 bg-white group-hover:bg-amber-50/40 z-10 whitespace-nowrap shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: row.color }} 
                          />
                          <span>{row.name}</span>
                        </div>
                      </td>
                      {row.monthlyAmounts.map((amt, idx) => (
                        <td key={idx} className="py-2.5 px-2">
                          {amt > 0 ? (
                            <span 
                              onClick={() => {
                                const mStr = String(idx + 1).padStart(2, '0');
                                setSelectedMonth(`${selectedYear}-${mStr}`);
                                setDrilldownCategory({
                                  isOpen: true,
                                  name: row.name,
                                  id: row.id
                                });
                              }}
                              className="font-semibold text-stone-800 hover:text-amber-800 hover:underline cursor-pointer"
                              title={`點擊查看 ${selectedYear}-${idx + 1}月 ${row.name} 明細`}
                            >
                              {amt.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 bg-stone-50/50 font-bold text-rose-600">
                        {row.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 bg-stone-50/50 text-stone-600">
                        {Math.round(row.total / 12).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 bg-stone-50/50 font-bold text-stone-800">
                        {row.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}

                  {/* 總支出合計列 */}
                  <tr className="bg-rose-50/60 font-bold text-rose-700 border-t-2 border-stone-200">
                    <td className="py-3 px-3 text-left font-sans sticky left-0 bg-rose-50/80 z-10 whitespace-nowrap shadow-2xs">
                      【每月總支出】
                    </td>
                    {yearlyData.monthlyTotalExpenses.map((amt, idx) => (
                      <td key={idx} className="py-3 px-2">
                        {amt > 0 ? amt.toLocaleString() : '-'}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-rose-800 text-sm">
                      {yearlyData.totalExpense.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      {Math.round(yearlyData.totalExpense / 12).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">100.0%</td>
                  </tr>

                  {/* 總撥補合計列 */}
                  <tr className="bg-emerald-50/60 font-bold text-emerald-700">
                    <td className="py-2.5 px-3 text-left font-sans sticky left-0 bg-emerald-50/80 z-10 whitespace-nowrap shadow-2xs">
                      【每月總撥補】
                    </td>
                    {yearlyData.monthlyTotalIncomes.map((amt, idx) => (
                      <td key={idx} className="py-2.5 px-2">
                        {amt > 0 ? amt.toLocaleString() : '-'}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-emerald-800 text-sm">
                      {yearlyData.totalIncome.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {Math.round(yearlyData.totalIncome / 12).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 細項鑽取視窗 (點選各分類時彈出，純檢視統計與明細，無修改功能) */}
      <CategoryDrilldownModal
        isOpen={drilldownCategory.isOpen}
        onClose={() => setDrilldownCategory({ isOpen: false, name: '' })}
        categoryName={drilldownCategory.name}
        categoryId={drilldownCategory.id}
        currentYearMonth={selectedMonth}
        transactions={transactions}
      />
    </div>
  );
};
