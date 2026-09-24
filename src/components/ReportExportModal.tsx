import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  ChevronRight, 
  CheckSquare, 
  Layers, 
  Calendar,
  Eye,
  FileText,
  EyeOff,
  Lock
} from 'lucide-react';
import { Transaction, CategoryConfig, MonthBudget, SubAccount, DirectorWithdrawal, CompanyProfile } from '../types';
import { 
  REPORT_CATALOG, 
  exportSingleReportExcel, 
  exportMultipleSelectedReportsExcel,
  ReportFilterOptions 
} from '../utils/reportGenerators';
import { exportToMyMoneyCsv } from '../utils/excel';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToReportCenter: (reportId?: string) => void;
  transactions: Transaction[];
  categories: CategoryConfig[];
  currentYearMonth: string;
  budgets?: Record<string, MonthBudget>;
  subAccounts?: SubAccount[];
  directorWithdrawals?: DirectorWithdrawal[];
  companyProfile?: CompanyProfile;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  onNavigateToReportCenter,
  transactions,
  categories,
  currentYearMonth,
  budgets = {},
  subAccounts = [],
  directorWithdrawals = [],
  companyProfile
}) => {
  if (!isOpen) return null;

  const [selectedReportId, setSelectedReportId] = useState<string>('tx_details');
  const [periodType, setPeriodType] = useState<'month' | 'year' | 'all'>('month');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYearMonth);
  const curYear = currentYearMonth.split('-')[0] || new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(curYear);

  // 批次選擇
  const [isMultiMode, setIsMultiMode] = useState<boolean>(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([
    'tx_details',
    'daily_summary',
    'category_stats',
    'yearly_summary',
    'yearly_matrix'
  ]);

  // 查帳審計與機密遮蔽狀態 ('all' 全部 | 'public_only' 查帳防護，排除敏感私帳)
  const [confidentialFilter, setConfidentialFilter] = useState<'all' | 'public_only'>('all');

  const filterOptions: ReportFilterOptions = {
    periodType,
    yearMonth: selectedYearMonth,
    year: selectedYear
  };

  // 依查帳防護篩選交易資料
  const effectiveTransactions = confidentialFilter === 'public_only'
    ? transactions.filter(t => !t.isConfidential)
    : transactions;

  const contextData = {
    transactions: effectiveTransactions,
    categories,
    budgets,
    subAccounts,
    directorWithdrawals,
    companyProfile
  };

  const handleExport = () => {
    if (isMultiMode) {
      exportMultipleSelectedReportsExcel(multiSelectedIds, contextData, filterOptions);
    } else {
      exportSingleReportExcel(selectedReportId, contextData, filterOptions);
    }
    onClose();
  };

  const currentDef = REPORT_CATALOG.find((r) => r.id === selectedReportId) || REPORT_CATALOG[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-5">
        {/* 標題欄 */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                P. 統計報表產出中心
              </h3>
              <p className="text-xs text-stone-500">
                自由挑選您想產出的報表類型（流水帳明細、收支日報、項目分類統計、年度收支、年度收支彙總）
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* 期間設定 */}
        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-800">1. 設定產出統計期間：</span>
            <div className="inline-flex bg-white p-0.5 rounded-lg border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setPeriodType('month')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                  periodType === 'month' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600'
                }`}
              >
                當月 ({selectedYearMonth})
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('year')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                  periodType === 'year' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600'
                }`}
              >
                全年度 ({selectedYear}年)
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('all')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                  periodType === 'all' ? 'bg-stone-900 text-white font-bold' : 'text-stone-600'
                }`}
              >
                全部歷史
              </button>
            </div>
          </div>

          {/* 查帳防護切換 */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200/60">
            <span className="text-stone-500 font-medium">查帳保護篩選：</span>
            <button
              type="button"
              onClick={() => setConfidentialFilter(prev => prev === 'all' ? 'public_only' : 'all')}
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                confidentialFilter === 'public_only'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs ring-1 ring-rose-400/20'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              {confidentialFilter === 'public_only' ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>查帳防護模式 (已排除敏感機密私帳)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>包含全部私帳 (點擊啟用查帳防護)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 模式切換：單一報表 vs 多選批次 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-800">2. 選擇想要產出的報表：</span>
            <button
              type="button"
              onClick={() => setIsMultiMode(!isMultiMode)}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isMultiMode ? '切換為「單獨產出單一報表」' : '切換為「勾選多張合併打包」'}</span>
            </button>
          </div>

          {/* 報表網格清單 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {REPORT_CATALOG.map((r) => {
              const isSelected = isMultiMode
                ? multiSelectedIds.includes(r.id)
                : selectedReportId === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    if (isMultiMode) {
                      setMultiSelectedIds((prev) =>
                        prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                      );
                    } else {
                      setSelectedReportId(r.id);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-bold shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>{r.name}</span>
                    </div>
                    <p className="text-[10px] text-stone-500 line-clamp-1 font-normal">
                      {r.shortDesc}
                    </p>
                  </div>
                  {isMultiMode ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="mt-1 rounded text-emerald-600 pointer-events-none"
                    />
                  ) : (
                    <span className={`text-xs ${isSelected ? 'text-amber-700' : 'text-stone-300'}`}>
                      ●
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部操作按鈕 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToReportCenter(selectedReportId);
            }}
            className="text-stone-600 hover:text-stone-900 font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-stone-500" />
            <span>前往「P. 統計報表中心」完整預覽與列印</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                exportToMyMoneyCsv(transactions);
                onClose();
              }}
              className="px-3 py-2 text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
              title="將零用金帳務明細匯出為帳務小管家相容的 CSV 檔案，可直接回匯備份"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>匯出帳務小管家相容 CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-medium cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>
                {isMultiMode
                  ? `確認匯出打包 (${multiSelectedIds.length} 份報表)`
                  : `匯出「${currentDef.name}」`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
