import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Plus, 
  Trash2, 
  TrendingDown, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  Coins,
  History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DirectorWithdrawal } from '../types';
import { getTodayDateStr } from '../utils/storage';
import { ConfirmDialog } from './ConfirmDialog';

interface DirectorWithdrawalSectionProps {
  records: DirectorWithdrawal[];
  currentYearMonth: string;
  onAddRecord: (record: Omit<DirectorWithdrawal, 'id' | 'createdAt'>) => void;
  onDeleteRecord: (id: string) => void;
}

export const DirectorWithdrawalSection: React.FC<DirectorWithdrawalSectionProps> = ({
  records,
  currentYearMonth,
  onAddRecord,
  onDeleteRecord
}) => {
  const [date, setDate] = useState<string>(getTodayDateStr());
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('廠長零用金領取');
  const [justAdded, setJustAdded] = useState<boolean>(false);
  const [filterMonth, setFilterMonth] = useState<string>(currentYearMonth);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recordToDelete, setRecordToDelete] = useState<DirectorWithdrawal | null>(null);

  // 篩選當月或全部資料
  const filteredRecords = filterMonth === 'all'
    ? [...records]
    : records.filter((r) => r.date.startsWith(filterMonth));

  // 排序由近至遠
  filteredRecords.sort((a, b) => (b.date > a.date ? 1 : -1));

  // 統計數據
  const currentMonthTotal = records
    .filter((r) => r.date.startsWith(currentYearMonth))
    .reduce((sum, r) => sum + r.amount, 0);

  const currentMonthCount = records.filter((r) => r.date.startsWith(currentYearMonth)).length;

  const totalAllTime = records.reduce((sum, r) => sum + r.amount, 0);

  // 快捷金額設定
  const handleSetQuickAmount = (val: number) => {
    setAmount(String(val));
  };

  const handleAddQuickAmount = (val: number) => {
    const cur = parseInt(amount, 10) || 0;
    setAmount(String(cur + val));
  };

  // 送出登記
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('請輸入有效的領取金額 (大於 0)');
      return;
    }

    onAddRecord({
      date,
      amount: numAmount,
      note: note.trim()
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
    setAmount('');
    setNote('廠長零用金領取');
  };

  // 匯出廠長專用 Excel 報表
  const handleExportExcel = () => {
    const rows = filteredRecords.map((r, idx) => ({
      '序號': idx + 1,
      '領取日期': r.date,
      '領取人員': '廠長',
      '提領金額 (NT$)': r.amount,
      '備註說明': r.note || '無'
    }));

    const totalFiltered = filteredRecords.reduce((sum, r) => sum + r.amount, 0);
    rows.push({
      '序號': '合計',
      '領取日期': '-',
      '領取人員': '廠長',
      '提領金額 (NT$)': totalFiltered,
      '備註說明': `共 ${filteredRecords.length} 筆`
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 28 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '廠長零用金提領明細');

    const fileName = `廠長專用零用金領取明細_${filterMonth === 'all' ? '全歷史' : filterMonth}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* 廠長專用標題與說明 */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">廠長領取記錄</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                專屬精簡帳冊
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              專門記錄廠長何時領了多少零用金，簡單明瞭，不記錄繁瑣細節，方便隨時查核結算。
            </p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 transition-all shadow-sm shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>匯出廠長領取明細 (Excel)</span>
        </button>
      </div>

      {/* 統計摘要卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-stone-500">本月廠長累計提領</span>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-amber-700">
              <span className="text-sm font-normal text-stone-400 mr-1">NT$</span>
              {currentMonthTotal.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              {currentYearMonth} 月度共提領 {currentMonthCount} 次
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-stone-500">廠長全歷史累計領取</span>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-stone-900">
              <span className="text-sm font-normal text-stone-400 mr-1">NT$</span>
              {totalAllTime.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              歷史紀錄共 {records.length} 筆
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-stone-500">最近一次提領紀錄</span>
          <div className="mt-2">
            {records.length > 0 ? (
              <>
                <div className="text-lg font-bold tracking-tight text-stone-800">
                  {records[0].date}
                </div>
                <div className="mt-1 text-xs text-amber-700 font-semibold">
                  提領 NT$ {records[0].amount.toLocaleString()}
                </div>
              </>
            ) : (
              <div className="text-sm text-stone-400 font-normal mt-1">尚無提領紀錄</div>
            )}
          </div>
        </div>
      </div>

      {/* 廠長領取快速登記表單 */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-stone-900">快速登記廠長領取</h3>
          <span className="text-xs text-stone-400">(只需輸入日期與金額)</span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 領取日期 */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                <span>領取日期 (必填)</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
            </div>

            {/* 領取金額 */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                領取金額 (NT$ 新台幣 · 必填)
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-stone-400 font-bold text-sm">NT$</span>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-2 text-sm font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* 簡短備註 (選填) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                簡短用途/備註 (選填)
              </label>
              <input
                type="text"
                placeholder="例如：廠長公務備用金"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* 快捷金額按鈕 */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-stone-400 mr-1">快捷面額:</span>
            {[1000, 2000, 3000, 5000, 10000, 20000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSetQuickAmount(val)}
                className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors"
              >
                ${val.toLocaleString()}
              </button>
            ))}
            <div className="h-4 w-px bg-stone-200 mx-1" />
            {[1000, 2000, 5000].map((val) => (
              <button
                key={`add-${val}`}
                type="button"
                onClick={() => handleAddQuickAmount(val)}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium transition-colors"
              >
                +{val.toLocaleString()}
              </button>
            ))}
          </div>

          {/* 送出按鈕 */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide text-white transition-all shadow-sm active:scale-98 ${
                justAdded ? 'bg-emerald-600' : 'bg-stone-900 hover:bg-stone-800'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>已記錄廠長領取！</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>確認登記「廠長領取」</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 廠長領取歷史明細表 */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-600" />
            <h3 className="text-sm font-bold text-stone-900">廠長領取流水帳清單</h3>
            <span className="text-xs text-stone-400">({filteredRecords.length} 筆)</span>
          </div>

          {/* 月份篩選 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">篩選月份:</span>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 font-medium cursor-pointer"
            >
              <option value={currentYearMonth}>{currentYearMonth} 當月</option>
              <option value="all">全歷史紀錄</option>
            </select>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {filterMonth === 'all' ? '目前尚無任何廠長領取紀錄' : `${filterMonth} 當月尚無廠長領取紀錄`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60 text-stone-500 font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">領取日期</th>
                  <th className="py-3 px-4">人員</th>
                  <th className="py-3 px-4 text-right">提領金額 (NT$)</th>
                  <th className="py-3 px-4">備註</th>
                  <th className="py-3 px-4 text-center w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-stone-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900 font-mono">
                      {r.date}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        廠長
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-stone-900 text-sm">
                      NT$ {r.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                      {r.note || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(r)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="刪除此筆提領"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 廠長提領紀錄刪除確認彈窗 */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        title="確定要刪除這筆廠長提領紀錄？"
        description={
          recordToDelete ? (
            <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200 mt-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400 font-sans">提領日期:</span>
                <span className="font-semibold text-stone-800">{recordToDelete.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 font-sans">領取人員:</span>
                <span className="font-semibold text-amber-900">廠長</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-1.5 mt-1">
                <span className="text-stone-500 font-sans font-bold">提領金額:</span>
                <span className="font-bold text-rose-600 text-sm">
                  NT$ {recordToDelete.amount.toLocaleString()}
                </span>
              </div>
              {recordToDelete.note && (
                <div className="text-[11px] text-stone-400 pt-1 font-sans">
                  備註: {recordToDelete.note}
                </div>
              )}
            </div>
          ) : null
        }
        confirmText="確認刪除提領"
        cancelText="取消保留"
        variant="danger"
        onConfirm={() => {
          if (recordToDelete) {
            onDeleteRecord(recordToDelete.id);
            setRecordToDelete(null);
          }
        }}
        onClose={() => setRecordToDelete(null)}
      />
    </div>
  );
};
