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
  ChevronDown,
  ChevronsUpDown,
  Eye,
  AlertCircle, 
  CheckCircle2, 
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Sparkles,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { Transaction, CategoryConfig, MonthBudget, SubAccount, DirectorWithdrawal, CompanyProfile } from '../types';
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
  companyProfile?: CompanyProfile;
  companies?: CompanyProfile[];
  activeCompanyId?: string;
}

export const ReportCenterView: React.FC<ReportCenterViewProps> = ({
  transactions,
  categories,
  currentYearMonth,
  budgets = {},
  subAccounts = [],
  directorWithdrawals = [],
  companyProfile,
  companies = [],
  activeCompanyId = 'all'
}) => {
  // 目前選取的報表 ID
  const [activeReportId, setActiveReportId] = useState<string>('tx_details');

  // 關係企業共用零用金金庫判斷與法定掛名公司
  const isSharedView = activeCompanyId === 'all';
  const nominalCompany = useMemo(() => {
    return companies.find(c => c.isNominalPettyCashHolder) || companies.find(c => c.isDefault) || companies[0] || companyProfile;
  }, [companies, companyProfile]);
  const effectiveCompany = isSharedView ? nominalCompany : (companyProfile || nominalCompany);

  // 關係企業公司名稱清單 (以 / 隔開)
  const combinedCompaniesTitle = useMemo(() => {
    if (companies && companies.length > 0) {
      return companies.map(c => c.name).join(' / ');
    }
    return '田頭工程有限公司 / 田頭工業有限公司 / 第三關係商行';
  }, [companies]);

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
    'yearly_summary',
    'yearly_matrix'
  ]);

  // 列印與另存 PDF 對話框狀態
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [printStatusNotice, setPrintStatusNotice] = useState<string | null>(null);

  // 報表篩選設定 (分類統計表、年度表等自動保留全部科目，無需也不受單一科目限制)
  const filterOptions: ReportFilterOptions = useMemo(() => ({
    periodType,
    yearMonth: selectedYearMonth,
    year: selectedYear,
    startDate,
    endDate,
    categoryId: ['tx_details', 'daily_summary'].includes(activeReportId) ? selectedCategory : 'all'
  }), [periodType, selectedYearMonth, selectedYear, startDate, endDate, selectedCategory, activeReportId]);

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

  // 產生純淨的 A4 專用列印 HTML
  const generatePrintableHtml = () => {
    const printNode = printAreaRef.current;
    const bodyContent = printNode ? printNode.innerHTML : '';
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${currentReportDef.name} - ${periodDesc}</title>
    <style>
      @page { size: A4 portrait; margin: 10mm 8mm 12mm 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 11px;
        color: #1c1917;
        background: #ffffff;
        margin: 0;
        padding: 8px;
      }
      .print-doc-table { width: 100% !important; border-collapse: collapse !important; border: none !important; }
      .print-doc-thead { display: table-header-group !important; }
      .print-doc-table > thead > tr > th { border: none !important; background: #ffffff !important; padding: 0 0 6px 0 !important; }
      .print-doc-table > tbody > tr > td { border: none !important; padding: 0 !important; background: transparent !important; }
      .report-header-banner { background: #ffffff !important; }
      .summary-cards-row {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 6px !important;
        margin-bottom: 10px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        width: 100% !important;
      }
      .summary-cards-row > div {
        padding: 5px 8px !important;
        background-color: #fafaf9 !important;
        border: 1px solid #d6d3d1 !important;
        border-radius: 6px !important;
      }
      table { width: 100% !important; min-width: 0 !important; border-collapse: collapse; margin-top: 4px; margin-bottom: 4px; }
      th, td { border: 1px solid #d6d3d1; padding: 5px 6px; text-align: left; vertical-align: middle; }
      th { background-color: #f5f5f4 !important; font-weight: bold; color: #292524; }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      .print-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-bold { font-weight: bold; }
      .font-semibold { font-weight: 600; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .text-rose-600 { color: #e11d48 !important; }
      .text-emerald-600 { color: #059669 !important; }
      .text-emerald-700 { color: #047857 !important; }
      .text-amber-800 { color: #92400e !important; }
      .text-amber-900 { color: #78350f !important; }
      .text-stone-400 { color: #a8a29e !important; }
      .text-stone-500 { color: #78716c !important; }
      .text-stone-600 { color: #57534e !important; }
      .text-stone-700 { color: #44403c !important; }
      .text-stone-800 { color: #292524 !important; }
      .text-stone-900 { color: #1c1917 !important; }
      .bg-stone-50 { background-color: #fafaf9 !important; }
      .bg-stone-100 { background-color: #f5f5f4 !important; }
      .bg-amber-50 { background-color: #fffbeb !important; }
      .bg-emerald-50 { background-color: #ecfdf5 !important; }
      .bg-indigo-50 { background-color: #eef2ff !important; }
      .text-indigo-700 { color: #4338ca !important; }
      .rounded-xl, .rounded-2xl { border-radius: 6px; }
      .border { border: 1px solid #e7e5e4; }
      .border-b { border-bottom: 1px solid #e7e5e4; }
      .border-b-2 { border-bottom: 2px solid #1c1917; }
      .border-t-2 { border-top: 2px solid #1c1917; }
      .no-print { display: none !important; }
    </style>
  </head>
  <body>
    ${bodyContent}
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 300);
      });
    </script>
  </body>
</html>`;
  };

  // 方式 1：直接呼叫系統列印對話框 (選取印表機或另存為 PDF)
  const handleDirectPrint = () => {
    setIsPrintModalOpen(false);
    setPrintStatusNotice('正在啟動系統列印視窗，請選取印表機或選擇「另存為 PDF」...');
    setTimeout(() => {
      window.focus();
      window.print();
      setTimeout(() => setPrintStatusNotice(null), 3000);
    }, 150);
  };

  // 方式 2：在新分頁開啟完整列印檔 (100% 呼叫瀏覽器原生列印視窗，保證不被 iframe 沙盒阻擋)
  const handleOpenNewTabPrint = () => {
    setIsPrintModalOpen(false);
    try {
      const html = generatePrintableHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const newWin = window.open(url, '_blank');
      if (newWin) {
        setPrintStatusNotice('已於新分頁開啟列印視窗，系統將自動開啟印表機/另存 PDF 對話框！');
      } else {
        handleDownloadPrintHtml();
      }
      setTimeout(() => setPrintStatusNotice(null), 4000);
    } catch (e) {
      console.warn('Fallback to direct print', e);
      handleDirectPrint();
    }
  };

  // 方式 3：下載 A4 離線標準列印檔
  const handleDownloadPrintHtml = () => {
    setIsPrintModalOpen(false);
    const html = generatePrintableHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `零用金報表_${currentReportDef.name}_${periodDesc}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setPrintStatusNotice('已下載 A4 離線報表檔，直接以瀏覽器開啟即可按 Ctrl+P 列印或另存 PDF！');
    setTimeout(() => setPrintStatusNotice(null), 4000);
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
      '項目分類統計類': []
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
                5 種核心專業報表
              </span>
            </div>
            <p className="text-xs text-stone-500">
              支援單獨產出流水帳明細、收支日報、項目分類統計、全年度收支趨勢與年度交叉樞紐總表，具備即時預覽、單獨匯出與列印另存 PDF
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
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-all cursor-pointer shadow-2xs active:scale-95"
            title="開啟列印視窗、選取印表機或另存為高解析 PDF"
          >
            <Printer className="w-4 h-4 text-stone-300" />
            <span>列印 / 另存 PDF</span>
          </button>
        </div>
      </div>

      {/* 列印提示訊息 */}
      {printStatusNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 no-print shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{printStatusNotice}</span>
        </div>
      )}

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
        <div className="lg:col-span-9 space-y-4 min-w-0 max-w-full">
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

            {/* 次要篩選：關鍵字搜尋與分類 (項目分類統計表等報表無須單一科目篩選，自動隱藏以保持簡潔) */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {['tx_details', 'daily_summary'].includes(activeReportId) ? (
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
              ) : (
                <div className="text-xs text-stone-500 flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 px-2.5 py-1 rounded-xl">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-medium text-stone-700">自動彙總對比全科目支出數據</span>
                </div>
              )}

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
            id="printable-report-card"
            ref={printAreaRef}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-6 print:border-none print:shadow-none print:p-0 min-w-0 max-w-full overflow-hidden print:overflow-visible"
          >
            <table className="w-full border-none border-collapse print-doc-table table-fixed print:table-auto">
              <thead className="print-doc-thead">
                <tr className="border-none bg-transparent">
                  <th className="p-0 border-none bg-white font-normal text-left">
                    {/* 1. 報表表頭 (Header) - 跨頁列印時每頁頂端皆自動重複出現 */}
                    <div className="report-header-banner border-b-2 border-stone-900 pb-3 mb-4 bg-white">
                      <div className="text-center space-y-1">
                        <div className="inline-flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-stone-600 tracking-wider">
                            {isSharedView ? (
                              combinedCompaniesTitle
                            ) : (
                              `${effectiveCompany?.name || '公司'} 零用金報銷帳務`
                            )}
                          </span>
                          {isSharedView && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0066cc] border border-blue-200">
                              田頭關係企業
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-stone-900 tracking-tight">
                          {isSharedView ? (
                            `【${combinedCompaniesTitle} ${currentReportDef.name}】`
                          ) : (
                            `【${effectiveCompany?.name || ''} ${currentReportDef.name}】`
                          )}
                        </h3>
                        <p className="text-xs text-stone-600 font-medium">
                          {isSharedView ? (
                            `田頭關係企業共用現金庫 ｜ 法定掛名主管：${nominalCompany?.name || '田頭工程有限公司'}（統編：${nominalCompany?.taxId || '—'}）`
                          ) : (
                            currentReportDef.shortDesc
                          )}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-stone-600 gap-2 pt-2 border-t border-stone-200">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-stone-400">統計期間：</span>
                            <span className="font-bold text-stone-800">{periodDesc}</span>
                          </div>
                          {effectiveCompany?.taxId && (
                            <div>
                              <span className="text-stone-400">{isSharedView ? '掛名統編：' : '統一編號：'}</span>
                              <span className="font-mono font-bold text-stone-800">{effectiveCompany.taxId}</span>
                              {isSharedView && (
                                <span className="text-stone-400 text-[10px] ml-1">({effectiveCompany.name})</span>
                              )}
                            </div>
                          )}
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
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-none bg-transparent">
                  <td className="p-0 border-none align-top bg-transparent w-full max-w-full overflow-hidden print:overflow-visible space-y-6">
                    {/* 2. 報表內容呈現 (依選取的報表類型動態計算與渲染) */}
                    <div>
                      {/* (1) 帳務記錄明細表 (流水帳明細表) */}
                      {activeReportId === 'tx_details' && (
                        <TxDetailsTable 
                          transactions={filteredTransactions} 
                          companies={companies}
                          isSharedView={isSharedView}
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
                    </div>

                    {/* 3. 報表審核簽核欄 (回復原狀，去除預設審核人名，供紙本實體簽章蓋印) */}
                    <div className="pt-8 border-t border-stone-200 grid grid-cols-4 gap-4 text-xs text-stone-600 print-avoid-break">
                      <div className="border-b border-stone-300 pb-2">
                        <span className="font-semibold text-stone-600">經辦請領人：</span>
                      </div>
                      <div className="border-b border-stone-300 pb-2">
                        <span className="font-semibold text-stone-600">出納經管：</span>
                      </div>
                      <div className="border-b border-stone-300 pb-2">
                        <span className="font-semibold text-stone-600">主辦會計：</span>
                      </div>
                      <div className="border-b border-stone-300 pb-2">
                        <span className="font-semibold text-stone-600">總經理 / 負責人：</span>
                      </div>
                    </div>

                    {effectiveCompany?.taxInvoiceNote && (
                      <div className="pt-2 text-[10px] text-stone-400 text-center font-normal">
                        {effectiveCompany.taxInvoiceNote}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
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

      {/* ========================================================= */}
      {/* 列印與另存 PDF 對話框 (保證 100% 彈出列印或另存 PDF) */}
      {/* ========================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-stone-900 text-white rounded-xl shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    報表列印與另存 PDF
                  </h3>
                  <p className="text-xs text-stone-500">
                    選取您的實體印表機進行列印，或直接另存為高解析 PDF 電子檔
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* 報表資訊卡片 */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">目標報表：</span>
                <span className="font-bold text-stone-900 text-sm">{currentReportDef.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">報表統計期間：</span>
                <span className="font-semibold text-stone-800">{periodDesc}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">排版紙張規格：</span>
                <span className="font-mono text-stone-800">A4 縱向標準格式 (含正式審核簽核欄)</span>
              </div>
            </div>

            {/* 三種操作管道 */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleDirectPrint}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-stone-900 bg-stone-900 text-white hover:bg-stone-800 transition-all cursor-pointer shadow-xs active:scale-[0.99] group text-left"
              >
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-amber-300 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">呼叫系統列印視窗</div>
                    <div className="text-[11px] text-stone-300">直接喚醒瀏覽器列印視窗，選取印表機或選擇「另存為 PDF」</div>
                  </div>
                </div>
                <span className="text-xs text-amber-300 font-semibold group-hover:translate-x-0.5 transition-transform">立即啟動 →</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTabPrint}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 transition-all cursor-pointer shadow-2xs active:scale-[0.99] group text-left"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">開啟獨立列印視窗 (新分頁)</div>
                    <div className="text-[11px] text-stone-500">在新分頁開啟純淨紙本版並自動喚醒系統列印，100% 避免彈出視窗限制</div>
                  </div>
                </div>
                <span className="text-xs text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">開啟分頁 →</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPrintHtml}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">下載 A4 離線列印專用檔 (.html)</div>
                    <div className="text-[10px] text-stone-400">永久保存於本機，隨時以 Edge/Chrome 開啟並按 Ctrl+P 列印或存為 PDF</div>
                  </div>
                </div>
                <span className="text-xs text-emerald-700 font-semibold">下載檔案</span>
              </button>
            </div>

            <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0">💡</span>
              <p>在瀏覽器跳出的列印視窗中，將「目的地」選為實體印表機即可列印；若選為「另存為 PDF」，即可直接產生標準正式報表電子檔！</p>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 text-xs text-stone-500 hover:text-stone-800 rounded-xl font-medium cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// 子表格組件 1：帳務記錄明細表 (收支分開列示)
// =========================================================================
const TxDetailsTable: React.FC<{ 
  transactions: Transaction[];
  companies?: CompanyProfile[];
  isSharedView?: boolean;
}> = ({ transactions, companies = [], isSharedView = false }) => {
  const [viewMode, setViewMode] = useState<'all' | 'expense' | 'income'>('all');
  const data = useMemo(() => buildTxDetailsReport(transactions), [transactions]);

  const displayedRows = useMemo(() => {
    if (viewMode === 'expense') return data.rows.filter((t) => t.type === 'expense');
    if (viewMode === 'income') return data.rows.filter((t) => t.type === 'income');
    return data.rows;
  }, [data.rows, viewMode]);

  const currentTotalIncome = useMemo(() => {
    return displayedRows
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayedRows]);

  const currentTotalExpense = useMemo(() => {
    return displayedRows
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [displayedRows]);

  return (
    <div className="space-y-4">
      {/* 摘要數據小卡 (螢幕與列印皆強制 4 格同列並排) */}
      <div className="summary-cards-row grid grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500 text-[11px] font-medium block whitespace-nowrap">零用金總支出</span>
          <p className="text-sm sm:text-base font-bold font-mono text-rose-600 mt-0.5 whitespace-nowrap">
            NT$ {data.totalExpense.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400 block mt-0.5 whitespace-nowrap">{data.expenseCount} 筆開支</span>
        </div>
        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500 text-[11px] font-medium block whitespace-nowrap">撥補入帳總額</span>
          <p className="text-sm sm:text-base font-bold font-mono text-emerald-600 mt-0.5 whitespace-nowrap">
            NT$ {data.totalIncome.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400 block mt-0.5 whitespace-nowrap">{data.incomeCount} 筆撥補</span>
        </div>
        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500 text-[11px] font-medium block whitespace-nowrap">收支結算淨額</span>
          <p className={`text-sm sm:text-base font-bold font-mono mt-0.5 whitespace-nowrap ${data.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            NT$ {data.netBalance.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400 block mt-0.5 whitespace-nowrap">
            {data.netBalance >= 0 ? '資金結存盈餘' : '支出大於撥補'}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <span className="text-stone-500 text-[11px] font-medium block whitespace-nowrap">單據合規統計</span>
          <p className="text-[11px] sm:text-xs font-semibold text-stone-800 mt-1 whitespace-nowrap">
            發票 {data.invoiceCount} · 收據 {data.receiptCount}
          </p>
          <span className="text-[10px] text-stone-400 block mt-0.5 whitespace-nowrap">無證 {data.noDocCount} 筆</span>
        </div>
      </div>

      {/* 檢視切換籤頁 (列印時隱藏) */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'all'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            全部收支明細 ({data.count})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('expense')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'expense'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            僅看支出 ({data.expenseCount})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('income')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'income'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            僅看收入撥補 ({data.incomeCount})
          </button>
        </div>

        <span className="text-xs text-stone-500">
          收支分開獨立欄位，檢視對帳更直觀清晰
        </span>
      </div>

      {/* 明細清單表格 (收入與支出分開獨立兩欄) */}
      <div className="w-full overflow-x-auto border border-stone-200 rounded-xl shadow-2xs bg-white">
        <table className="w-full text-left text-xs border-collapse print:min-w-0 print:w-full">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-2.5 w-12 text-center whitespace-nowrap">序</th>
              <th className="py-2.5 px-3 w-32 whitespace-nowrap">記帳日期 / 傳票</th>
              {isSharedView && (
                <th className="py-2.5 px-3 w-28 text-center whitespace-nowrap bg-blue-50/70 text-blue-900">報銷公司</th>
              )}
              <th className="py-2.5 px-3 w-28 text-center whitespace-nowrap">收支類型</th>
              <th className="py-2.5 px-3 w-28 whitespace-nowrap">科目分類</th>
              <th className="py-2.5 px-3 min-w-[200px]">品名店家 / 開銷細項</th>
              <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap bg-emerald-50/70 text-emerald-900 border-x border-emerald-100/60">
                收入金額 (NT$)
              </th>
              <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap bg-rose-50/70 text-rose-900 border-r border-rose-100/60">
                支出金額 (NT$)
              </th>
              <th className="py-2.5 px-3 w-24 whitespace-nowrap">經辦同仁</th>
              <th className="py-2.5 px-3 w-36 whitespace-nowrap">憑證發票</th>
              <th className="py-2.5 px-3 min-w-[130px]">備註說明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-700">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={isSharedView ? 11 : 10} className="py-10 text-center text-stone-400">
                  此期間無符合條件的收支流水紀錄
                </td>
              </tr>
            ) : (
              displayedRows.map((t, idx) => (
                <tr key={t.id} className="hover:bg-stone-50/90 transition-colors">
                  <td className="py-2.5 px-2.5 text-center text-stone-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-mono text-stone-800 font-medium">{t.date}</span>
                      <span className="font-mono text-[10px] text-stone-400 tracking-tight">{t.voucherNo || t.id}</span>
                    </div>
                  </td>
                  {isSharedView && (
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {t.companyId === 'shared' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          🏛️ 共用大水池
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0066cc] border border-blue-200">
                          {companies.find(c => c.id === t.companyId)?.shortName || companies.find(c => c.id === t.companyId)?.name || '田頭工程'}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                      t.type === 'income'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-300 ring-1 ring-rose-200'
                    }`}>
                      {t.type === 'income' ? '🟢 撥補入帳' : '🔴 零用支出'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-stone-900 whitespace-nowrap">
                    {t.categoryName}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-950 text-xs">
                          {t.subItem || '未載明細項'}
                        </span>
                        {t.peopleCount && t.peopleCount > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold inline-flex items-center gap-0.5">
                            👥 {t.peopleCount}人
                          </span>
                        ) : null}
                        {t.subAccountSourceName && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200">
                            專款: {t.subAccountSourceName}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* 收入金額欄位 */}
                  <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap bg-emerald-50/30 border-x border-emerald-100/40">
                    {t.type === 'income' ? (
                      <span className="font-bold text-emerald-700">
                        +NT$ {t.amount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                  {/* 支出金額欄位 */}
                  <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap bg-rose-50/30 border-r border-rose-100/40">
                    {t.type === 'expense' ? (
                      <span className="font-bold text-stone-900">
                        NT$ {t.amount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-stone-700 whitespace-nowrap">
                    {t.claimant ? (
                      <span className="font-medium text-stone-800">{t.claimant}</span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          t.receiptType === 'invoice' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          t.receiptType === 'receipt' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          'bg-stone-100 text-stone-500'
                        }`}>
                          {t.receiptType === 'invoice' ? '發票' : t.receiptType === 'receipt' ? '收據' : '無憑證'}
                        </span>
                        {t.invoiceNumber ? (
                          <span className="font-mono text-stone-800 font-bold text-[11px]">{t.invoiceNumber}</span>
                        ) : null}
                      </div>
                      {t.receiptType === 'invoice' && t.taxAmount !== undefined && t.taxAmount > 0 ? (
                        <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                          <span>未稅 ${t.netAmount?.toLocaleString() || '-'}</span>
                          <span className="text-emerald-700 font-bold">稅 ${t.taxAmount?.toLocaleString()}</span>
                          {t.sellerTaxId && <span className="text-stone-400">({t.sellerTaxId})</span>}
                        </div>
                      ) : t.receiptType === 'invoice' && t.taxDeductible === false ? (
                        <span className="text-[9px] text-amber-700">不得扣抵營業稅</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 text-xs">
                    {t.note ? (
                      <span className="text-stone-600">{t.note}</span>
                    ) : (
                      <span className="text-stone-300">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {displayedRows.length > 0 && (
            <tfoot>
              <tr className="bg-stone-100/95 font-bold text-stone-900 border-t-2 border-stone-300">
                <td colSpan={isSharedView ? 6 : 5} className="py-2.5 px-4 text-right">
                  清單合計 (共 {displayedRows.length} 筆)：
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-xs sm:text-sm bg-emerald-50/50 border-x border-emerald-100/60">
                  {currentTotalIncome > 0 ? `+NT$ ${currentTotalIncome.toLocaleString()}` : '-'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-600 text-xs sm:text-sm bg-rose-50/50 border-r border-rose-100/60">
                  {currentTotalExpense > 0 ? `-NT$ ${currentTotalExpense.toLocaleString()}` : '-'}
                </td>
                <td colSpan={3} className="py-2.5 px-3 text-stone-600 text-xs">
                  淨差額 NT$ {(currentTotalIncome - currentTotalExpense).toLocaleString()}
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
// 子表格組件 2：收支日報表 (支援點擊展開查看當日交易明細細項)
// =========================================================================
const DailySummaryTable: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const data = useMemo(() => buildDailySummaryReport(transactions), [transactions]);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const expandAll = () => {
    setExpandedDates(data.rows.map((r) => r.date));
  };

  const collapseAll = () => {
    setExpandedDates([]);
  };

  return (
    <div className="space-y-4">
      {/* 提示與展開/收合控制列 (列印時隱藏控制鈕) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-amber-100 text-amber-800 rounded-md">
            <Eye className="w-3.5 h-3.5" />
          </span>
          <span className="text-stone-700 font-medium">
            點擊任一日報記錄列，可展開/收合查看當日流水開銷與撥補細項
          </span>
          <span className="text-[11px] text-stone-400">
            (已展開 {expandedDates.length} / {data.rows.length} 天)
          </span>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 text-xs bg-white border border-stone-200 hover:bg-stone-100 hover:text-stone-900 rounded-lg text-stone-600 transition-colors font-medium cursor-pointer"
          >
            全部展開細項
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 text-xs bg-white border border-stone-200 hover:bg-stone-100 hover:text-stone-900 rounded-lg text-stone-600 transition-colors font-medium cursor-pointer"
          >
            全部收合
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto border border-stone-200 rounded-xl shadow-2xs bg-white">
        <table className="w-full text-left text-xs border-collapse print:min-w-0 print:w-full">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-36 whitespace-nowrap">記帳日期 / 展開</th>
              <th className="py-2.5 px-2 w-14 text-center whitespace-nowrap">星期</th>
              <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap">本日撥入 (NT$)</th>
              <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap">本日支出 (NT$)</th>
              <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap">本日淨差額</th>
              <th className="py-2.5 px-3 text-right w-28 whitespace-nowrap">累計結餘</th>
              <th className="py-2.5 px-2 w-16 text-center whitespace-nowrap">筆數</th>
              <th className="py-2.5 px-3 min-w-[160px]">主要開銷備註摘要</th>
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
              data.rows.map((r) => {
                const isExpanded = expandedDates.includes(r.date);
                return (
                  <React.Fragment key={r.date}>
                    <tr 
                      onClick={() => toggleDate(r.date)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? 'bg-amber-50/60 font-medium' : 'hover:bg-stone-50/80'
                      }`}
                      title="點擊展開/收合當日明細細項"
                    >
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-stone-400 no-print">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                            )}
                          </span>
                          <span className="font-semibold text-stone-900">{r.date}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-stone-500 whitespace-nowrap">{r.dayOfWeek}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold whitespace-nowrap">
                        {r.income > 0 ? `+$${r.income.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold whitespace-nowrap">
                        {r.expense > 0 ? `-$${r.expense.toLocaleString()}` : '-'}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                        r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {r.net >= 0 ? '+' : ''}${r.net.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-900 font-medium whitespace-nowrap">
                        ${r.cumulativeBalance.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          {r.txCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 text-xs">
                        {r.notes || '-'}
                      </td>
                    </tr>

                    {/* 展開當日詳細交易細項清單 */}
                    {isExpanded && (
                      <tr className="bg-stone-50/70 border-b border-stone-200">
                        <td colSpan={8} className="p-3 pl-6 sm:pl-8">
                          <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-x-auto">
                            <div className="px-3.5 py-2 bg-stone-100/80 border-b border-stone-200 flex flex-wrap items-center justify-between text-xs">
                              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                                <span>📅</span>
                                <span>{r.date} ({r.dayOfWeek}) 交易流水細項（共 {r.items.length} 筆）</span>
                              </span>
                              <div className="flex items-center gap-3 text-[11px] font-mono">
                                {r.income > 0 && (
                                  <span className="text-emerald-700 font-semibold">
                                    撥入：+${r.income.toLocaleString()}
                                  </span>
                                )}
                                {r.expense > 0 && (
                                  <span className="text-rose-600 font-semibold">
                                    支出：-${r.expense.toLocaleString()}
                                  </span>
                                )}
                                <span className={`font-bold ${r.net >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                                  當日淨額：${r.net.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-stone-50 text-stone-600 border-b border-stone-200 text-[11px]">
                                  <th className="py-2 px-2.5 w-10 text-center whitespace-nowrap">序</th>
                                  <th className="py-2 px-3 w-28 text-center whitespace-nowrap">收支類型</th>
                                  <th className="py-2 px-3 w-28 whitespace-nowrap">科目分類</th>
                                  <th className="py-2 px-3 min-w-[180px]">品名店家 / 開銷細項</th>
                                  <th className="py-2 px-3 text-right w-28 whitespace-nowrap">金額 (NT$)</th>
                                  <th className="py-2 px-3 w-24 whitespace-nowrap">經辦同仁</th>
                                  <th className="py-2 px-3 w-36 whitespace-nowrap">憑證發票</th>
                                  <th className="py-2 px-3 min-w-[120px]">備註說明</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 text-stone-700 text-[11px]">
                                {r.items.map((it, idx) => (
                                  <tr key={it.id} className="hover:bg-stone-50/80">
                                    <td className="py-2 px-2.5 text-center text-stone-400 font-mono">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 px-3 text-center whitespace-nowrap">
                                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                                        it.type === 'income'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                          : 'bg-rose-50 text-rose-700 border border-rose-300'
                                      }`}>
                                        {it.type === 'income' ? '🟢 撥補入帳' : '🔴 零用支出'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-stone-900 whitespace-nowrap">
                                      {it.categoryName}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-medium text-stone-900">
                                          {it.subItem || '未載明細項'}
                                        </span>
                                        {it.peopleCount && it.peopleCount > 0 ? (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                                            👥 {it.peopleCount}人
                                          </span>
                                        ) : null}
                                        {it.subAccountSourceName && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200">
                                            專款: {it.subAccountSourceName}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className={`py-2 px-3 text-right font-bold font-mono whitespace-nowrap ${
                                      it.type === 'income' ? 'text-emerald-600' : 'text-stone-900'
                                    }`}>
                                      {it.type === 'income' ? '+' : '-'}${it.amount.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3 text-stone-700 whitespace-nowrap">
                                      {it.claimant || '-'}
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <div className="flex items-center gap-1">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                          it.receiptType === 'invoice' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                          it.receiptType === 'receipt' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                          'bg-stone-100 text-stone-500'
                                        }`}>
                                          {it.receiptType === 'invoice' ? '發票' : it.receiptType === 'receipt' ? '收據' : '無憑證'}
                                        </span>
                                        {it.invoiceNumber && (
                                          <span className="font-mono text-stone-800 font-bold text-[10px]">
                                            {it.invoiceNumber}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-stone-500 text-[10px]">
                                      {it.note || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
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
                <td className="py-2.5 px-2 text-center font-mono">
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
// 子表格組件 3：項目分類統計表 (支援點擊下鑽展開各科目明細與總和)
// =========================================================================
const CategoryStatsTable: React.FC<{ transactions: Transaction[]; categories: CategoryConfig[] }> = ({
  transactions,
  categories
}) => {
  const data = useMemo(() => buildCategoryStatsReport(transactions, categories), [transactions, categories]);
  const [expandedCatIds, setExpandedCatIds] = useState<string[]>([]);

  const toggleCat = (id: string) => {
    setExpandedCatIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpandedCatIds(data.rows.map((r) => r.id));
  };

  const collapseAll = () => {
    setExpandedCatIds([]);
  };

  return (
    <div className="space-y-3">
      {/* 展開/收合控制列 */}
      <div className="flex items-center justify-between px-1 text-xs text-stone-600">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-semibold text-stone-800">
            點擊任一科目即可展開完整交易流水明細與合計總額 (支援預支、餐飲等各項目)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer text-[11px]"
          >
            展開全部明細
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer text-[11px]"
          >
            收合全部
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-stone-200 rounded-xl shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-12 text-center">名次</th>
              <th className="py-2.5 px-3 w-36">支出科目名稱</th>
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
              data.rows.map((r, idx) => {
                const isExpanded = expandedCatIds.includes(r.id);
                const subTotal = (r.transactions || []).reduce((sum, t) => sum + t.amount, 0);

                return (
                  <React.Fragment key={r.id}>
                    <tr
                      onClick={() => toggleCat(r.id)}
                      className={`hover:bg-amber-50/60 cursor-pointer transition-colors select-none ${
                        isExpanded ? 'bg-amber-50/40' : ''
                      }`}
                      title="點擊展開或收合此科目的全部交易明細"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-900">
                        <div className="flex items-center gap-1.5">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          )}
                          <span>{r.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            isExpanded ? 'bg-amber-200 text-amber-900' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {isExpanded ? '收合' : '明細'}
                          </span>
                        </div>
                      </td>
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
                      <td className="py-2.5 px-3 text-center font-mono text-stone-600 font-semibold">
                        {r.count}
                      </td>
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

                    {/* 展開之細項明細抽屜表格 */}
                    {isExpanded && (
                      <tr className="bg-stone-50/70 border-b border-amber-200/60">
                        <td colSpan={8} className="p-3 pl-8">
                          <div className="bg-white rounded-xl border border-amber-200/80 shadow-xs overflow-hidden">
                            <div className="bg-amber-100/50 px-3.5 py-2 border-b border-amber-200 flex items-center justify-between text-xs">
                              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                【{r.name}】開銷明細清單 (共 {r.count} 筆)
                              </span>
                              <span className="font-mono font-bold text-stone-800">
                                科目小計總和：NT$ {subTotal.toLocaleString()}
                              </span>
                            </div>

                            {(!r.transactions || r.transactions.length === 0) ? (
                              <div className="p-4 text-center text-xs text-stone-400">
                                此科目在此期間暫無交易細項
                              </div>
                            ) : (
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                                    <th className="py-2 px-3 w-10 text-center">序</th>
                                    <th className="py-2 px-3 w-24">日期</th>
                                    <th className="py-2 px-3">品名店家 / 細項內容</th>
                                    <th className="py-2 px-3 w-24">經辦同仁</th>
                                    <th className="py-2 px-3 w-32">憑證發票</th>
                                    <th className="py-2 px-3 w-40">備註說明</th>
                                    <th className="py-2 px-3 text-right w-28">金額 (NT$)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-stone-700">
                                  {r.transactions.map((tx, txIdx) => (
                                    <tr key={tx.id} className="hover:bg-amber-50/30 transition-colors">
                                      <td className="py-2 px-3 text-center font-mono text-stone-400">
                                        {txIdx + 1}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-stone-700">{tx.date}</td>
                                      <td className="py-2 px-3 font-semibold text-stone-900">
                                        <div className="flex items-center gap-2">
                                          <span>{tx.subItem || '未載明細項'}</span>
                                          {tx.peopleCount && tx.peopleCount > 0 ? (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                                              👥 {tx.peopleCount}人
                                            </span>
                                          ) : null}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-stone-600">{tx.claimant || '-'}</td>
                                      <td className="py-2 px-3">
                                        <div className="flex items-center gap-1 text-[11px]">
                                          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                            tx.receiptType === 'invoice' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                            tx.receiptType === 'receipt' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                            'bg-stone-100 text-stone-500'
                                          }`}>
                                            {tx.receiptType === 'invoice' ? '發票' : tx.receiptType === 'receipt' ? '收據' : '無'}
                                          </span>
                                          {tx.invoiceNumber && <span className="font-mono text-stone-600">{tx.invoiceNumber}</span>}
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-stone-500 text-xs truncate max-w-xs">{tx.note || '-'}</td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                                        -${tx.amount.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-stone-50/90 font-bold border-t border-stone-200 text-stone-900">
                                    <td colSpan={6} className="py-2 px-3 text-right text-stone-600">
                                      【{r.name}】開銷小計總和 (共 {r.count} 筆)：
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-rose-600 font-bold">
                                      -${subTotal.toLocaleString()}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
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
                  依開支金額高低排序 · 點擊項目可展開全部各項明細
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
// 子表格組件 6：年度收支統計表 (1~12月，支援點擊月份展開當月全部收支明細與總和)
// =========================================================================
const YearlySummaryTable: React.FC<{ transactions: Transaction[]; year: string }> = ({
  transactions,
  year
}) => {
  const data = useMemo(() => buildYearlySummaryReport(transactions, year), [transactions, year]);
  const [expandedMonthStrs, setExpandedMonthStrs] = useState<string[]>([]);

  const toggleMonth = (mStr: string) => {
    setExpandedMonthStrs((prev) =>
      prev.includes(mStr) ? prev.filter((x) => x !== mStr) : [...prev, mStr]
    );
  };

  const expandAll = () => {
    setExpandedMonthStrs(data.rows.map((r) => r.monthStr));
  };

  const collapseAll = () => {
    setExpandedMonthStrs([]);
  };

  return (
    <div className="space-y-3">
      {/* 展開/收合控制列 */}
      <div className="flex items-center justify-between px-1 text-xs text-stone-600">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-rose-600" />
          <span className="font-semibold text-stone-800">
            點擊任一月份即可展開當月完整收支流水明細、撥補入帳與淨額結算
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer text-[11px]"
          >
            展開全年度月份明細
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer text-[11px]"
          >
            收合全部
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-stone-200 rounded-xl shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 border-b border-stone-200 font-bold">
              <th className="py-2.5 px-3 w-28">月份</th>
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
              const isExpanded = expandedMonthStrs.includes(r.monthStr);
              const txs = r.transactions || [];
              const monthIncomes = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
              const monthExpenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              const monthNet = monthIncomes - monthExpenses;

              return (
                <React.Fragment key={r.monthStr}>
                  <tr
                    onClick={() => toggleMonth(r.monthStr)}
                    className={`hover:bg-rose-50/50 cursor-pointer transition-colors select-none ${
                      isExpanded ? 'bg-rose-50/30' : ''
                    }`}
                    title="點擊展開或收合此月份的全部收支明細"
                  >
                    <td className="py-2.5 px-3 font-bold text-stone-900">
                      <div className="flex items-center gap-1.5">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        )}
                        <span>{r.monthName}</span>
                        {r.txCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            isExpanded ? 'bg-rose-200 text-rose-900' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {isExpanded ? '收合' : `${r.txCount}筆`}
                          </span>
                        )}
                      </div>
                    </td>
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
                    <td className="py-2.5 px-3 text-center font-mono text-stone-600 font-semibold">{r.txCount}</td>
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

                  {/* 展開之當月明細抽屜表格 */}
                  {isExpanded && (
                    <tr className="bg-stone-50/70 border-b border-rose-200/60">
                      <td colSpan={7} className="p-3 pl-8">
                        <div className="bg-white rounded-xl border border-rose-200/80 shadow-xs overflow-hidden">
                          <div className="bg-rose-50/70 px-3.5 py-2 border-b border-rose-200 flex items-center justify-between text-xs">
                            <span className="font-bold text-rose-950 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              【{r.monthName}】當月收支交易明細 (共 {r.txCount} 筆)
                            </span>
                            <div className="flex items-center gap-3 font-mono font-bold text-stone-800">
                              <span className="text-emerald-700">撥補: +${monthIncomes.toLocaleString()}</span>
                              <span className="text-rose-600">支出: -${monthExpenses.toLocaleString()}</span>
                              <span className={monthNet >= 0 ? 'text-emerald-800' : 'text-rose-700'}>
                                當月差額: {monthNet >= 0 ? '+' : ''}${monthNet.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {txs.length === 0 ? (
                            <div className="p-4 text-center text-xs text-stone-400">
                              此月份暫無任何撥補或支出交易
                            </div>
                          ) : (
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                                  <th className="py-2 px-3 w-10 text-center">序</th>
                                  <th className="py-2 px-3 w-24">日期</th>
                                  <th className="py-2 px-3 w-20 text-center">類型</th>
                                  <th className="py-2 px-3 w-28">科目分類</th>
                                  <th className="py-2 px-3">品名店家 / 細項內容</th>
                                  <th className="py-2 px-3 w-24">經辦同仁</th>
                                  <th className="py-2 px-3 w-28">憑證發票</th>
                                  <th className="py-2 px-3 w-36">備註說明</th>
                                  <th className="py-2 px-3 text-right w-28">金額 (NT$)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 text-stone-700">
                                {txs.map((tx, txIdx) => (
                                  <tr key={tx.id} className="hover:bg-rose-50/30 transition-colors">
                                    <td className="py-2 px-3 text-center font-mono text-stone-400">
                                      {txIdx + 1}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-stone-700">{tx.date}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                        tx.type === 'income'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-stone-100 text-stone-700'
                                      }`}>
                                        {tx.type === 'income' ? '撥補' : '支出'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-stone-900">{tx.categoryName}</td>
                                    <td className="py-2 px-3 font-medium text-stone-800">
                                      <div className="flex items-center gap-1.5">
                                        <span>{tx.subItem || '未載明細項'}</span>
                                        {tx.peopleCount && tx.peopleCount > 0 ? (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                                            👥 {tx.peopleCount}人
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-stone-600">{tx.claimant || '-'}</td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1 text-[11px]">
                                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                          tx.receiptType === 'invoice' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                          tx.receiptType === 'receipt' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                          'bg-stone-100 text-stone-500'
                                        }`}>
                                          {tx.receiptType === 'invoice' ? '發票' : tx.receiptType === 'receipt' ? '收據' : '無'}
                                        </span>
                                        {tx.invoiceNumber && <span className="font-mono text-stone-600">{tx.invoiceNumber}</span>}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-stone-500 text-xs truncate max-w-xs">{tx.note || '-'}</td>
                                    <td className={`py-2 px-3 text-right font-mono font-bold ${
                                      tx.type === 'income' ? 'text-emerald-600' : 'text-stone-900'
                                    }`}>
                                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-stone-50/90 font-bold border-t border-stone-200 text-stone-900">
                                  <td colSpan={8} className="py-2 px-3 text-right text-stone-600">
                                    【{r.monthName}】當月結算合計：撥補 +${monthIncomes.toLocaleString()} · 支出 -${monthExpenses.toLocaleString()} · 淨差額：
                                  </td>
                                  <td className={`py-2 px-3 text-right font-mono font-bold ${
                                    monthNet >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                  }`}>
                                    {monthNet >= 0 ? '+' : ''}${monthNet.toLocaleString()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
              <td className="py-2.5 px-3 text-xs text-stone-400">1~12月完整走勢 · 點擊月份可展開當月收支明細</td>
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

