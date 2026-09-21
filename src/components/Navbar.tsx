import React from 'react';
import { 
  FileSpreadsheet, 
  Upload,
  Database, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  WalletCards
} from 'lucide-react';

interface NavbarProps {
  currentYearMonth: string;
  onMonthChange: (ym: string) => void;
  onExportExcel: () => void;
  onOpenImport: () => void;
  onOpenBackup: () => void;
  onOpenSettings: () => void;
  onOpenBudget: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentYearMonth,
  onMonthChange,
  onExportExcel,
  onOpenImport,
  onOpenBackup,
  onOpenSettings,
  onOpenBudget,
}) => {
  // 切換月份計算
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = currentYearMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    onMonthChange(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = currentYearMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    onMonthChange(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleTodayMonth = () => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(ym);
  };

  const [year, month] = currentYearMonth.split('-');

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <WalletCards className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-stone-900">
                  公司零用金管理與開支分析
                </h1>
                <button
                  type="button"
                  onClick={onOpenBackup}
                  title="🟢 已連線後端 SQLite 實體資料庫 (data/petty_cash.sqlite)，不依賴瀏覽器暫存，點擊可管理或下載資料庫檔案帶著走"
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 hover:bg-emerald-200 transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>SQLite 資料庫 (帶著走)</span>
                </button>
              </div>
              <p className="text-xs text-stone-500">
                階層式選單 · 水位與撥補警示 · 靜態快照存檔 · Excel 匯出
              </p>
            </div>
          </div>

          {/* 月份切換控制器 */}
          <div className="flex items-center justify-between sm:justify-center bg-stone-100/80 p-1 rounded-xl border border-stone-200">
            <button
              id="prev-month-btn"
              onClick={handlePrevMonth}
              title="上個月"
              className="p-1.5 rounded-lg hover:bg-white text-stone-600 hover:text-stone-900 transition-colors shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center px-2.5 gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <input
                type="month"
                value={currentYearMonth}
                onChange={(e) => e.target.value && onMonthChange(e.target.value)}
                className="text-xs font-semibold text-stone-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
              />
              <span className="text-xs font-bold text-stone-700 hidden sm:inline">
                {year} 年 {parseInt(month, 10)} 月
              </span>
            </div>

            <button
              id="next-month-btn"
              onClick={handleNextMonth}
              title="下個月"
              className="p-1.5 rounded-lg hover:bg-white text-stone-600 hover:text-stone-900 transition-colors shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              id="today-month-btn"
              onClick={handleTodayMonth}
              className="ml-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 transition-colors"
            >
              本月
            </button>
          </div>

          {/* 快捷操作按鈕群 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              id="export-excel-btn"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95 transition-all shadow-xs cursor-pointer"
              title="自由選擇欲產出的專業統計報表（流水帳明細、收支日報、項目分類、損益表、平衡表、資金預估）"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>P. 統計報表 (產出)</span>
            </button>

            <button
              id="import-data-btn"
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 active:scale-95 transition-all shadow-xs cursor-pointer"
              title="下載空白範本或上傳 Excel 帳務匯入（具備智慧防重複檢視）"
            >
              <Upload className="w-4 h-4" />
              <span>資料匯入</span>
            </button>

            <button
              id="backup-btn"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300/80 active:scale-95 transition-all"
              title="完整資料庫備份與還原（全歷史紀錄無期限保存、換機無損遷移）"
            >
              <Database className="w-4 h-4 text-stone-600" />
              <span>資料備份與還原</span>
            </button>

            <button
              id="settings-btn"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300/80 active:scale-95 transition-all"
              title="自訂店家、加油站、同仁名冊與撥補項目管理"
            >
              <Settings className="w-4 h-4 text-stone-600" />
              <span>選單項目管理</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
