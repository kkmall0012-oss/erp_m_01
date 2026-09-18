import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  CalendarDays, 
  History, 
  Scale, 
  PieChart, 
  TrendingUp, 
  Table as TableIcon, 
  Receipt, 
  ShieldCheck, 
  Activity, 
  Target, 
  Hourglass, 
  Download, 
  Printer, 
  CheckSquare, 
  Square, 
  Search, 
  Filter, 
  Calendar, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction, CategoryConfig, MonthBudget, SubAccount, DirectorWithdrawal } from '../types';
import {
  REPORT_CATALOG,
  ReportDefinition,
  ReportFilterOptions,
  getFilteredTransactions,
  getPeriodDescription,
  getReportGeneratedTimestamp,
  buildTxDetailsReport,
  buildDailySummaryReport,
  buildCategoryStatsReport,
  buildYearlySummaryReport,
  buildYearlyMatrixReport,
  buildIncomeStatementReport,
  buildNetCashFlowReport,
  exportSingleReportExcel,
  exportMultipleSelectedReportsExcel
} from '../utils/reportGenerators';

interface ReportCenterViewProps {
  transactions: Transaction[];
  categories: CategoryConfig[];
  currentYearMonth: string;
  budgets?: Record<string, MonthBudget>;
  subAccounts?: SubAccount[];
  directorWithdrawals?: DirectorWithdrawal[];
}

export const ReportCenterView: React.FC<ReportCenterViewProps> = ({
  transactions,
  categories,
  currentYearMonth,
  budgets = {},
  subAccounts = [],
  directorWithdrawals = []
}) => {
  // 目前選取的報表 ID
  const [activeReportId, setActiveReportId] = useState<string>('tx_details');

  // 篩選條件
  const [periodType, setPeriodType] = useState<'month' | 'year' | 'custom' | 'all'>('month');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYearMonth);
  const curYear = currentYearMonth.split('-')[0] || new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(curYear);
  const [startDate, setStartDate] = useState<string>(`${curYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 批次匯出 Modal 狀態
  const [isBatchExportModalOpen, setIsBatchExportModalOpen] = useState<boolean>(false);
  const [selectedReportIdsForBatch, setSelectedReportIdsForBatch] = useState<string[]>([
    'tx_details',
    'daily_summary',
    'category_stats',
    'income_statement'
  ]);

  // 列印參照區
  const printAreaRef = useRef<HTMLDivElement>(null);

  // 報表篩選設定
  const filterOptions: ReportFilterOptions = useMemo(() => ({
    periodType,
    yearMonth: selectedYearMonth,
    year: selectedYear,
    startDate,
    endDate,
    categoryId: selectedCategory
  }), [periodType, selectedYearMonth, selectedYear, startDate, endDate, selectedCategory]);

  // 取得篩選後的交易資料
  const filteredTransactions = useMemo(() => {
    let list = getFilteredTransactions(transactions, filterOptions);
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      list = list.filter((t) => 
        (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
        (t.subItem && t.subItem.toLowerCase().includes(q)) ||
        (t.claimant && t.claimant.toLowerCase().includes(q)) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q))
      );
    }
    return list;
  }, [transactions, filterOptions, searchKeyword]);

  // 當前報表定義
  const currentReportDef = useMemo(() => {
    return REPORT_CATALOG.find((r) => r.id === activeReportId) || REPORT_CATALOG[0];
  }, [activeReportId]);

  // 報表期間說明
  const periodDesc = useMemo(() => {
    return getPeriodDescription(filterOptions);
  }, [filterOptions]);

  // 動態產出時間戳記
  const generatedTimestamp = useMemo(() => {
    return getReportGeneratedTimestamp();
  }, [activeReportId, filterOptions, filteredTransactions.length]);

  // 單獨匯出當前報表
  const handleExportCurrent = () => {
    exportSingleReportExcel(activeReportId, {
      transactions,
      categories,
      budgets,
      subAccounts,
      directorWithdrawals
    }, filterOptions);
  };

  // 批次匯出選定的多張報表
  const handleExportBatch = () => {
    exportMultipleSelectedReportsExcel(selectedReportIdsForBatch, {
      transactions,
      categories,
      budgets,
      subAccounts,
      directorWithdrawals
    }, filterOptions);
    setIsBatchExportModalOpen(false);
  };

  // 列印目前報表
  const handlePrint = () => {
    window.print();
  };

  // 圖示選擇器
  const renderIcon = (name: string, className: string = 'w-4 h-4') => {
    switch (name) {
      case 'FileText': return <FileText className={className} />;
      case 'CalendarDays': return <CalendarDays className={className} />;
      case 'History': return <History className={className} />;
      case 'Scale': return <Scale className={className} />;
      case 'PieChart': return <PieChart className={className} />;
      case 'TrendingUp': return <TrendingUp className={className} />;
      case 'Table': return <TableIcon className={className} />;
      case 'Receipt': return <Receipt className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'Target': return <Target className={className} />;
      case 'Hourglass': return <Hourglass className={className} />;
      default: return <FileText className={className} />;
    }
  };

  // 按大類分組的報表目錄
  const groupedCatalog = useMemo(() => {
    const groups: Record<string, ReportDefinition[]> = {
      '明細與流水帳類': [],
      '項目分類統計類': [],
      '損益與財務平衡類': [],
      '預算與預估管理類': []
    };
    REPORT_CATALOG.forEach((item) => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      }
    });
    return groups;
  }, []);

  return (
    <div className="space-y-4">
      {/* 頂部引言與快捷操作欄 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold border border-amber-500/20 shadow-2xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900">
                P. 統計報表中心 (自由選擇報表產出)
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                12 種專業報表
              </span>
            </div>
            <p className="text-xs text-stone-500">
              支援單獨產出流水帳、收支日報、項目分類、損益表、資產負債平衡與資金預估，具備即時預覽、單獨匯出與自選打包
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => setIsBatchExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300/80 transition-all cursor-pointer shadow-2xs"
            title="勾選任意多張報表，合併打包產出單一 Excel 檔"
          >
            <CheckSquare className="w-4 h-4 text-stone-600" />
            <span>自選多張報表打包</span>
          </button>

          <button
            onClick={handleExportCurrent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-all cursor-pointer shadow-xs active:scale-95"
            title="單獨匯出目前選定的這張報表為獨立 Excel 檔"
          >
            <Download className="w-4 h-4" />
            <span>單獨匯出此報表 (Excel)</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="列印或另存為正式呈核 PDF"
          >
            <Printer className="w-4 h-4 text-stone-300" />
            <span>列印 / 另存 PDF</span>
          </button>
        </div>
      </div>

      {/* 主體佈局：左側為選單 (類似會計軟體 P.統計報表)，右側為即時報表預覽 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 左側：統計報表清單選單 */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-stone-50/90 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-stone-700" />
              <span className="text-xs font-bold text-stone-800">
                P. 統計報表目錄選單
              </span>
            </div>
            <span className="text-[10px] text-stone-500">點擊即時切換</span>
          </div>

          <div className="p-2 space-y-4 max-h-[calc(100vh-240px)] overflow-y-auto">
            {(Object.entries(groupedCatalog) as [string, ReportDefinition[]][]).map(([groupTitle, items]) => (
              <div key={groupTitle} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>{groupTitle}</span>
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = activeReportId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveReportId(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-amber-50 text-amber-950 font-bold border border-amber-300/80 shadow-2xs'
                            : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className={`${isActive ? 'text-amber-700' : 'text-stone-400 group-hover:text-stone-600'}`}>
                            {renderIcon(item.iconName, 'w-4 h-4 shrink-0')}
                          </span>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'text-amber-700 translate-x-0.5' : 'text-stone-300'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側：篩選條件欄與報表內容呈現 */}
        <div className="lg:col-span-9 space-y-4">
          {/* 條件篩選工具列 */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-800">報表統計期間：</span>
                <div className="inline-flex bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setPeriodType('month')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      periodType === 'month'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    按月份
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('year')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      periodType === 'year'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    按全年度
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('custom')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      periodType === 'custom'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    自訂區間
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('all')}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      periodType === 'all'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    全部歷史
                  </button>
                </div>
              </div>

              {/* 日期選擇輸入框 */}
              <div className="flex items-center gap-2">
                {periodType === 'month' && (
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    <input
                      type="month"
                      value={selectedYearMonth}
                      onChange={(e) => e.target.value && setSelectedYearMonth(e.target.value)}
                      className="bg-transparent text-stone-800 font-semibold focus:outline-hidden cursor-pointer"
                    />
                  </div>
                )}

                {periodType === 'year' && (
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent text-stone-800 font-semibold focus:outline-hidden cursor-pointer"
                    >
                      {[-2, -1, 0, 1].map((offset) => {
                        const y = (parseInt(curYear, 10) + offset).toString();
                        return <option key={y} value={y}>{y} 年</option>;
                      })}
                    </select>
                  </div>
                )}

                {periodType === 'custom' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-stone-50 border border-stone-200 rounded-xl px-2 py-1 text-stone-800 focus:outline-hidden"
                    />
                    <span className="text-stone-400">至</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-stone-50 border border-stone-200 rounded-xl px-2 py-1 text-stone-800 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 次要篩選：關鍵字搜尋與分類 */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-stone-600 font-medium">科目分類：</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">全部分類科目</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜尋品名、店家、同仁、發票..."
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 報表主紙本預覽 (列印專區) */}
          <div 
            ref={printAreaRef}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6 print:border-none print:shadow-none print:p-0"
          >
            {/* 1. 報表表頭 (Header) */}
            <div className="border-b-2 border-stone-900 pb-4">
              <div className="text-center space-y-1">
                <span className="text-xs font-semibold text-stone-500 tracking-wider">
                  公司內部零用金帳務管理系統
                </span>
                <h3 className="text-xl font-black text-stone-900 tracking-tight">
                  【{currentReportDef.name}】
                </h3>
                <p className="text-xs text-stone-600 font-medium">
                  {currentReportDef.shortDesc}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-stone-600 gap-2 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-stone-400">統計期間：</span>
                    <span className="font-bold text-stone-800">{periodDesc}</span>
                  </div>
                  <div>
                    <span className="text-stone-400">篩選記錄：</span>
                    <span className="font-bold text-stone-800">{filteredTransactions.length} 筆資料</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-stone-400">幣別單位：</span>
                    <span className="font-bold text-stone-800">新台幣 (NT$)</span>
                  </div>
                  <div className="text-stone-500">
                    <span className="text-stone-400">列印產出時間：</span>
                    <span className="font-mono font-medium">{generatedTimestamp}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 報表內容呈現 (依選取的報表類型動態計算與渲染) */}
            <div>
              {/* (1) 帳務記錄明細表 (流水帳明細表) */}
              {activeReportId === 'tx_details' && (
                <TxDetailsTable 
                  transactions={filteredTransactions} 
                />
              )}

              {/* (2) 收支日報表 */}
              {activeReportId === 'daily_summary' && (
                <DailySummaryTable 
                  transactions={filteredTransactions} 
                />
              )}

              {/* (3) 項目分類統計表 */}
              {activeReportId === 'category_stats' && (
                <CategoryStatsTable 
                  transactions={filteredTransactions} 
                  categories={categories}
                />
              )}

              {/* (4) 年度收支統計表 */}
              {activeReportId === 'yearly_summary' && (
                <YearlySummaryTable 
                  transactions={transactions} 
                  year={selectedYear}
                />
              )}

              {/* (5) 年度收支統計彙總表 (交叉樞紐) */}
              {activeReportId === 'yearly_matrix' && (
                <YearlyMatrixTable 
                  transactions={transactions} 
                  categories={categories}
                  year={selectedYear}
                />
              )}

              {/* (6) 損益表 (收支損益) */}
              {activeReportId === 'income_statement' && (
                <IncomeStatementTable 
                  transactions={filteredTransactions} 
                />
              )}

              {/* (7) 收支淨值報表 */}
              {activeReportId === 'net_cash_flow' && (
                <NetCashFlowTable 
                  transactions={transactions} 
                  yearMonth={selectedYearMonth}
                />
              )}
            </div>

            {/* 3. 報表審核簽核欄 (正式會計列印必備) */}
            <div className="pt-8 border-t border-stone-200 grid grid-cols-3 gap-4 text-xs text-stone-600">
              <div className="border-b border-stone-300 pb-2">
                <span className="font-semibold text-stone-500">經辦/製表同仁：</span>
              </div>
              <div className="border-b border-stone-300 pb-2">
                <span className="font-semibold text-stone-500">出納/財務覆核：</span>
              </div>
              <div className="border-b border-stone-300 pb-2">
                <span className="font-semibold text-stone-500">主管/廠長核決：</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 批次自選報表打包匯出 Modal */}
      {/* ========================================================= */}
      {isBatchExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    自選多張報表批次打包 (Excel)
                  </h3>
                  <p className="text-xs text-stone-500">
                    勾選您所需要的報表，系統將合併產出多個工作表於同一 Excel 活頁簿
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchExportModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pb-1">
              <span className="text-stone-500">
                已勾選 <span className="font-bold text-emerald-700">{selectedReportIdsForBatch.length}</span> / {REPORT_CATALOG.length} 張報表
              </span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedReportIdsForBatch(REPORT_CATALOG.map((r) => r.id))}
                  className="text-emerald-700 hover:underline cursor-pointer"
                >
                  全選
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReportIdsForBatch([])}
                  className="text-stone-500 hover:underline cursor-pointer"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {REPORT_CATALOG.map((r) => {
                const isChecked = selectedReportIdsForBatch.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReportIdsForBatch((prev) => [...prev, r.id]);
                        } else {
                          setSelectedReportIdsForBatch((prev) => prev.filter((id) => id !== r.id));
                        }
                      }}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{r.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200/70 text-stone-600 font-normal">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{r.shortDesc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs text-stone-600 space-y-1">
              <div className="flex justify-between">
                <span>匯出期間：</span>
                <span className="font-bold text-stone-800">{periodDesc}</span>
              </div>
              <div className="flex justify-between">
                <span>製表時間：</span>
                <span className="font-mono">{generatedTimestamp}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsBatchExportModalOpen(false)}
                className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl font-medium cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={selectedReportIdsForBatch.length === 0}
                onClick={handleExportBatch}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>確認匯出 ({selectedReportIdsForBatch.length} 份報表)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 子表格組件 1：帳務記錄明細表 (流水帳)
// =========================================================================
const TxDetailsTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const data = useMemo(() => buildTxDetailsReport(transactions), [transactions]);

  return (
    <div className="space-y-4">
      {/* 摘要數據小卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500">零用金總支出</span>
          <p className="text-base font-bold font-mono text-rose-600 mt-1">
            NT$ {data.totalExpense.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400">{data.expenseCount} 筆開支</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500">撥補入帳總額</span>
          <p className="text-base font-bold font-mono text-emerald-600 mt-1">
            NT$ {data.totalIncome.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400">{data.incomeCount} 筆撥補</span>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500">收支結算淨額</span>
          <p className={`text-base font-bold font-mono mt-1 ${data.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            NT$ {data.netBalance.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400">
            {data.netBalance >= 0 ? '資金結存盈餘' : '支出大於撥補'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500">單據合規統計</span>
          <p className="text-xs font-semibold text-stone-800 mt-1.5">
            發票 {data.invoiceCount} · 收據 {data.receiptCount}
          </p>
          <span className="text-[10px] text-stone-400">無證 {data.noDocCount} 筆</span>
        </div>
      </div>

      {/* 明細清單表格 */}
      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-12 text-center">序</th>
              <th className="py-2.5 px-3 w-24">日期</th>
              <th className="py-2.5 px-3 w-20">類型</th>
              <th className="py-2.5 px-3 w-28">科目分類</th>
              <th className="py-2.5 px-3">品名店家 / 細項</th>
              <th className="py-2.5 px-3 text-right w-28">金額 (NT$)</th>
              <th className="py-2.5 px-3 w-24">經辦同仁</th>
              <th className="py-2.5 px-3 w-28">憑證與發票號</th>
              <th className="py-2.5 px-3">備註說明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-stone-400">
                  此期間無符合條件的收支流水紀錄
                </td>
              </tr>
            ) : (
              data.rows.map((t, idx) => (
                <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-2 px-3 text-center text-stone-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 font-mono">{t.date}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      t.type === 'income'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}>
                      {t.type === 'income' ? '撥補' : '支出'}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-stone-900">{t.categoryName}</td>
                  <td className="py-2 px-3 font-medium text-stone-800">{t.subItem}</td>
                  <td className={`py-2 px-3 text-right font-bold font-mono ${
                    t.type === 'income' ? 'text-emerald-600' : 'text-stone-900'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-stone-600">{t.claimant || '-'}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className={`px-1.5 py-0.2 rounded ${
                        t.receiptType === 'invoice' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        t.receiptType === 'receipt' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-stone-100 text-stone-500'
                      }`}>
                        {t.receiptType === 'invoice' ? '發票' : t.receiptType === 'receipt' ? '收據' : '無'}
                      </span>
                      {t.invoiceNumber && <span className="font-mono text-stone-600">{t.invoiceNumber}</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-stone-500 truncate max-w-xs">{t.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot>
              <tr className="bg-stone-100/80 font-bold text-stone-900 border-t-2 border-stone-300">
                <td colSpan={5} className="py-2.5 px-3 text-right">
                  本期收支合計 (共 {data.count} 筆)：
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                  -${data.totalExpense.toLocaleString()}
                </td>
                <td colSpan={3} className="py-2.5 px-3 text-stone-500 text-xs">
                  (另有撥補總入帳 +${data.totalIncome.toLocaleString()}，淨差額 ${data.netBalance.toLocaleString()})
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 子表格組件 2：收支日報表
// =========================================================================
const DailySummaryTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const data = useMemo(() => buildDailySummaryReport(transactions), [transactions]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-28">記帳日期</th>
              <th className="py-2.5 px-3 w-16 text-center">星期</th>
              <th className="py-2.5 px-3 text-right w-28">本日撥入 (NT$)</th>
              <th className="py-2.5 px-3 text-right w-28">本日支出 (NT$)</th>
              <th className="py-2.5 px-3 text-right w-28">本日淨差額</th>
              <th className="py-2.5 px-3 text-right w-28">累計結餘</th>
              <th className="py-2.5 px-3 w-20 text-center">筆數</th>
              <th className="py-2.5 px-3">主要開銷備註摘要</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-stone-400">
                  此期間無收支紀錄
                </td>
              </tr>
            ) : (
              data.rows.map((r) => (
                <tr key={r.date} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-2 px-3 font-mono font-medium">{r.date}</td>
                  <td className="py-2 px-3 text-center text-stone-500">{r.dayOfWeek}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                    {r.income > 0 ? `+$${r.income.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-600 font-semibold">
                    {r.expense > 0 ? `-$${r.expense.toLocaleString()}` : '-'}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${
                    r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {r.net >= 0 ? '+' : ''}${r.net.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-stone-900 font-medium">
                    ${r.cumulativeBalance.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-stone-500">{r.txCount}</td>
                  <td className="py-2 px-3 text-stone-500 text-[11px] truncate max-w-sm">
                    {r.notes || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot>
              <tr className="bg-stone-100/90 font-bold text-stone-900 border-t-2 border-stone-300">
                <td colSpan={2} className="py-2.5 px-3 text-center">
                  合計 ({data.totalDays} 天)：
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                  +${data.totalIncome.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                  -${data.totalExpense.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  ${data.netBalance.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  ${data.netBalance.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center font-mono">
                  {data.rows.reduce((s, r) => s + r.txCount, 0)}
                </td>
                <td className="py-2.5 px-3 text-xs text-stone-400">收支日報平衡</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 子表格組件 3：項目分類統計表
// =========================================================================
const CategoryStatsTable: React.FC<{ transactions: Transaction[]; categories: CategoryConfig[] }> = ({
  transactions,
  categories
}) => {
  const data = useMemo(() => buildCategoryStatsReport(transactions, categories), [transactions, categories]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-12 text-center">名次</th>
              <th className="py-2.5 px-3 w-32">支出科目名稱</th>
              <th className="py-2.5 px-3 text-right w-32">開支總額 (NT$)</th>
              <th className="py-2.5 px-3 text-center w-28">佔比</th>
              <th className="py-2.5 px-3 text-center w-20">筆數</th>
              <th className="py-2.5 px-3 text-right w-28">平均每筆</th>
              <th className="py-2.5 px-3">主要開銷細項 / 店家</th>
              <th className="py-2.5 px-3 w-32">主要經辦同仁</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-stone-400">
                  此期間無分類支出紀錄
                </td>
              </tr>
            ) : (
              data.rows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center font-mono text-stone-400">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-stone-900">{r.name}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                    ${r.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-12 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
                          style={{ width: `${Math.min(100, r.percentage)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-stone-700">
                        {r.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-stone-600">{r.count}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                    ${r.avgPerTx.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-stone-700 font-medium truncate max-w-xs">
                    {r.topSubItem}
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 text-xs">
                    {r.topClaimant}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot>
              <tr className="bg-stone-100/90 font-bold text-stone-900 border-t-2 border-stone-300">
                <td colSpan={2} className="py-2.5 px-3 text-center">
                  全部支出合計：
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                  ${data.totalExpense.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center font-mono">100.0%</td>
                <td className="py-2.5 px-3 text-center font-mono">{data.totalCount}</td>
                <td className="py-2.5 px-3 text-right font-mono">
                  ${data.overallAvg.toLocaleString()}
                </td>
                <td colSpan={2} className="py-2.5 px-3 text-xs text-stone-400">
                  依開支金額高低排序
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 子表格組件 6：年度收支統計表 (1~12月)
// =========================================================================
const YearlySummaryTable: React.FC<{ transactions: Transaction[]; year: string }> = ({
  transactions,
  year
}) => {
  const data = useMemo(() => buildYearlySummaryReport(transactions, year), [transactions, year]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-24">月份</th>
              <th className="py-2.5 px-3 text-right w-32">撥補入帳 (NT$)</th>
              <th className="py-2.5 px-3 text-right w-32">零用金支出 (NT$)</th>
              <th className="py-2.5 px-3 text-right w-32">收支差額</th>
              <th className="py-2.5 px-3 text-right w-32">累計結存</th>
              <th className="py-2.5 px-3 text-center w-24">開支筆數</th>
              <th className="py-2.5 px-3">開銷走勢比率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {data.rows.map((r) => {
              const expenseRate = data.totalExpense > 0 ? (r.expense / data.totalExpense) * 100 : 0;
              return (
                <tr key={r.monthStr} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-stone-900">{r.monthName}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                    {r.income > 0 ? `+$${r.income.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                    {r.expense > 0 ? `-$${r.expense.toLocaleString()}` : '-'}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                    r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {r.net >= 0 ? '+' : ''}${r.net.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-stone-900">
                    ${r.cumulativeBalance.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-stone-600">{r.txCount}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500 rounded-full" 
                          style={{ width: `${Math.min(100, expenseRate)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-stone-500">
                        {expenseRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-stone-100/90 font-bold text-stone-900 border-t-2 border-stone-300">
              <td className="py-2.5 px-3">全年度總計：</td>
              <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                +${data.totalIncome.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                -${data.totalExpense.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 text-right font-mono">
                ${data.netBalance.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 text-right font-mono">
                ${data.netBalance.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 text-center font-mono">
                {data.rows.reduce((s, r) => s + r.txCount, 0)}
              </td>
              <td className="py-2.5 px-3 text-xs text-stone-400">1~12月完整走勢</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 子表格組件 7：年度收支統計彙總表 (交叉樞紐)
// =========================================================================
const YearlyMatrixTable: React.FC<{ transactions: Transaction[]; categories: CategoryConfig[]; year: string }> = ({
  transactions,
  categories,
  year
}) => {
  const data = useMemo(() => buildYearlyMatrixReport(transactions, categories, year), [transactions, categories, year]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-32 sticky left-0 bg-stone-100">支出分類科目</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} className="py-2.5 px-2 text-right w-16">{i + 1}月</th>
              ))}
              <th className="py-2.5 px-3 text-right w-24 bg-stone-200/60">全年合計</th>
              <th className="py-2.5 px-2 text-center w-16">佔比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-stone-50/80 transition-colors">
                <td className="py-2 px-3 font-bold text-stone-900 sticky left-0 bg-white">
                  {r.name}
                </td>
                {r.months.map((amt, idx) => (
                  <td key={idx} className="py-2 px-2 text-right font-mono text-stone-600">
                    {amt > 0 ? amt.toLocaleString() : '-'}
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-mono font-bold text-stone-900 bg-stone-50">
                  ${r.total.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-center font-mono text-stone-500 text-[11px]">
                  {data.grandTotal > 0 ? `${((r.total / data.grandTotal) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-stone-100/90 font-bold text-stone-900 border-t-2 border-stone-300">
              <td className="py-2.5 px-3 sticky left-0 bg-stone-100">每月支出合計：</td>
              {data.monthlyTotals.map((tot, idx) => (
                <td key={idx} className="py-2.5 px-2 text-right font-mono text-rose-600">
                  {tot > 0 ? tot.toLocaleString() : '-'}
                </td>
              ))}
              <td className="py-2.5 px-3 text-right font-mono text-rose-600 bg-stone-200/60">
                ${data.grandTotal.toLocaleString()}
              </td>
              <td className="py-2.5 px-2 text-center font-mono">100%</td>
            </tr>
            <tr className="bg-stone-50 text-stone-800 border-t border-stone-200 font-semibold">
              <td className="py-2 px-3 sticky left-0 bg-stone-50">每月撥補收入：</td>
              {data.monthlyIncomes.map((inc, idx) => (
                <td key={idx} className="py-2 px-2 text-right font-mono text-emerald-600">
                  {inc > 0 ? `+${inc.toLocaleString()}` : '-'}
                </td>
              ))}
              <td className="py-2 px-3 text-right font-mono text-emerald-600 bg-stone-100">
                +${data.grandIncome.toLocaleString()}
              </td>
              <td className="py-2 px-2 text-center font-mono">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 子表格組件 8：損益表 (收支損益)
// =========================================================================
const IncomeStatementTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const data = useMemo(() => buildIncomeStatementReport(transactions), [transactions]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="overflow-x-auto border border-stone-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-4">財務會計損益科目</th>
              <th className="py-2.5 px-4 text-right w-36">金額 (NT$)</th>
              <th className="py-2.5 px-4 text-center w-24">比率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {/* 收入段 */}
            <tr className="bg-emerald-50/40 font-bold text-emerald-950">
              <td className="py-2.5 px-4">【一、營業撥補收入總額】</td>
              <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                +${data.totalIncome.toLocaleString()}
              </td>
              <td className="py-2.5 px-4 text-center font-mono">100.0%</td>
            </tr>

            {/* 費用段 */}
            <tr className="bg-stone-50 font-bold text-stone-800">
              <td colSpan={3} className="py-2 px-4 text-[11px] text-stone-500 uppercase tracking-wider">
                二、各項零用金費用支出科目 (日常營業費用)
              </td>
            </tr>
            {data.expenseItems.map((e) => (
              <tr key={e.name} className="hover:bg-stone-50/80 transition-colors">
                <td className="py-2 px-6 text-stone-800 font-medium">
                  　{e.name}
                </td>
                <td className="py-2 px-4 text-right font-mono text-stone-900 font-semibold">
                  ${e.amount.toLocaleString()}
                </td>
                <td className="py-2 px-4 text-center font-mono text-stone-500 text-[11px]">
                  {e.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
            <tr className="bg-rose-50/40 font-bold text-rose-950">
              <td className="py-2.5 px-4">【各項費用支出總額】</td>
              <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                -${data.totalExpense.toLocaleString()}
              </td>
              <td className="py-2.5 px-4 text-center font-mono">100.0%</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-stone-900 text-white font-bold border-t-2 border-stone-900">
              <td className="py-3 px-4 text-sm">【三、本期收支淨損益 (盈餘/超支)】</td>
              <td className={`py-3 px-4 text-right font-mono text-sm ${
                data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {data.netProfit >= 0 ? '+' : ''}${data.netProfit.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-center text-xs text-stone-300">
                {data.netProfit >= 0 ? '淨結存' : '透支款'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// =========================================================================
// 子表格組件 7：收支淨值報表
// =========================================================================
const NetCashFlowTable: React.FC<{ transactions: Transaction[]; yearMonth: string }> = ({
  transactions,
  yearMonth
}) => {
  const data = useMemo(() => buildNetCashFlowReport(transactions, 'month', yearMonth), [transactions, yearMonth]);

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
        <h4 className="text-xs font-bold text-stone-800">
          {yearMonth} 期間收支淨值流量指標
        </h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="text-stone-500">資金流入總量</span>
            <p className="text-base font-bold font-mono text-emerald-600 mt-1">
              +${data.inflow.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="text-stone-500">資金流出總量</span>
            <p className="text-base font-bold font-mono text-rose-600 mt-1">
              -${data.outflow.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <span className="text-stone-500">淨現金流量</span>
            <p className={`text-base font-bold font-mono mt-1 ${data.netFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              ${data.netFlow.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

