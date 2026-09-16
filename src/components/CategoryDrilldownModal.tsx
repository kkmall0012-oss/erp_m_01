import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  HandCoins, 
  Utensils, 
  Fuel, 
  PackageCheck, 
  Sparkles,
  Calendar,
  Users,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { Transaction } from '../types';
import * as XLSX from 'xlsx';

interface CategoryDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryId?: string;
  currentYearMonth: string;
  transactions: Transaction[];
}

export const CategoryDrilldownModal: React.FC<CategoryDrilldownModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  categoryId,
  currentYearMonth,
  transactions
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 1. 篩選此分類的資料
  const matchedTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 必須為支出且分類符合 (比對 categoryName 或 categoryId)
      const isMatchCategory = 
        (categoryId && t.categoryId === categoryId) ||
        t.categoryName === categoryName;
      if (!isMatchCategory) return false;

      // 日期範圍篩選
      if (scope === 'month' && !t.date.startsWith(currentYearMonth)) {
        return false;
      }

      // 關鍵字搜尋 (項目店家、請領同仁、備註、金額)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const subItemMatch = t.subItem?.toLowerCase().includes(query) || false;
        const claimantMatch = t.claimant?.toLowerCase().includes(query) || false;
        const noteMatch = t.note?.toLowerCase().includes(query) || false;
        const amountMatch = t.amount.toString().includes(query);
        const dateMatch = t.date.includes(query);
        if (!subItemMatch && !claimantMatch && !noteMatch && !amountMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, categoryName, categoryId, currentYearMonth, scope, searchTerm]);

  // 排序
  const sortedTransactions = useMemo(() => {
    return [...matchedTransactions].sort((a, b) => {
      if (sortField === 'date') {
        const cmp = a.date.localeCompare(b.date);
        return sortOrder === 'desc' ? -cmp : cmp;
      } else {
        const cmp = a.amount - b.amount;
        return sortOrder === 'desc' ? -cmp : cmp;
      }
    });
  }, [matchedTransactions, sortField, sortOrder]);

  // 統計加總
  const totalAmount = useMemo(() => {
    return matchedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [matchedTransactions]);

  const avgAmount = matchedTransactions.length > 0 
    ? Math.round(totalAmount / matchedTransactions.length) 
    : 0;

  // 匯出 Excel
  const handleExportExcel = () => {
    const rows = sortedTransactions.map((t, idx) => ({
      '序號': idx + 1,
      '交易日期': t.date,
      '主分類': t.categoryName,
      '細項 (店家/站點/事由)': t.subItem,
      '請領同仁': t.claimant || '未填寫',
      '用餐人數': t.peopleCount ? `${t.peopleCount} 人` : '-',
      '每人均攤 (NT$)': t.peopleCount && t.peopleCount > 1 ? Math.round(t.amount / t.peopleCount) : '-',
      '支出金額 (NT$)': t.amount,
      '備註說明': t.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${categoryName}明細`);
    XLSX.writeFile(workbook, `${categoryName}_細項分析報表_${scope === 'month' ? currentYearMonth : '全歷史'}.xlsx`);
  };

  const getCategoryIcon = () => {
    switch (categoryId) {
      case 'dining':
        return <Utensils className="w-5 h-5 text-orange-600" />;
      case 'fuel':
        return <Fuel className="w-5 h-5 text-sky-600" />;
      case 'advance':
        return <HandCoins className="w-5 h-5 text-purple-600" />;
      case 'misc':
        return <PackageCheck className="w-5 h-5 text-amber-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal 頂部 Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 shadow-2xs flex items-center justify-center shrink-0">
              {getCategoryIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  【{categoryName}】細項分析與流水明細
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700 font-medium">
                  {scope === 'month' ? `${currentYearMonth} 當月` : '全歷史所有紀錄'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                點擊各筆紀錄可即時查看店家、站點、請領同仁與金額細目
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. 統計指標列與控制列 */}
        <div className="p-4 sm:p-5 border-b border-stone-100 space-y-3 bg-white">
          {/* 指標卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
              <span className="text-[11px] font-semibold text-stone-500">項目開支筆數</span>
              <div className="text-base font-bold text-stone-900 mt-0.5 font-mono">
                {matchedTransactions.length} <span className="text-xs font-normal text-stone-500 font-sans">筆</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200/60">
              <span className="text-[11px] font-semibold text-rose-700">累計開支總額</span>
              <div className="text-base font-bold text-rose-600 mt-0.5 font-mono">
                NT$ {totalAmount.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60">
              <span className="text-[11px] font-semibold text-amber-800">單筆平均花費</span>
              <div className="text-base font-bold text-amber-700 mt-0.5 font-mono">
                NT$ {avgAmount.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-stone-500">快速匯出報表</span>
                <div className="text-xs text-stone-400 mt-0.5">匯出此分類 Excel</div>
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={matchedTransactions.length === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>匯出</span>
              </button>
            </div>
          </div>

          {/* 篩選與搜尋列 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* 範圍切換 */}
            <div className="inline-flex p-1 bg-stone-100 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setScope('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  scope === 'month'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {currentYearMonth} 當月
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                全歷史所有紀錄
              </button>
            </div>

            {/* 關鍵字搜尋 */}
            <div className="relative grow sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`搜尋同仁、店家或項目...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 排序按鈕 */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'date') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortField('date');
                    setSortOrder('desc');
                  }
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border cursor-pointer ${
                  sortField === 'date'
                    ? 'border-amber-300 bg-amber-50 text-amber-800 font-bold'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>日期 {sortField === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sortField === 'amount') {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortField('amount');
                    setSortOrder('desc');
                  }
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border cursor-pointer ${
                  sortField === 'amount'
                    ? 'border-amber-300 bg-amber-50 text-amber-800 font-bold'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>金額 {sortField === 'amount' ? (sortOrder === 'desc' ? '大至小' : '小至大') : ''}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. 清單明細內容 */}
        <div className="overflow-y-auto grow p-4 sm:p-5">
          {sortedTransactions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400 mb-2">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-stone-600">查無任何符合條件的紀錄</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {searchTerm ? '請嘗試調整搜尋關鍵字' : `本分類在${scope === 'month' ? '當月份' : ''}尚無支出記帳`}
              </p>
            </div>
          ) : (
            <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                    <th className="py-2.5 px-3 whitespace-nowrap">交易日期</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">請領同仁</th>
                    <th className="py-2.5 px-3">項目 / 店家 / 事由</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">開支金額</th>
                    <th className="py-2.5 px-3">備註說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  {sortedTransactions.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap text-stone-900">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.claimant ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[11px]">
                            <Users className="w-3 h-3 text-stone-500" />
                            <span>{item.claimant}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <span>{item.subItem}</span>
                          {item.peopleCount && item.peopleCount > 1 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-normal">
                              {item.peopleCount}人均攤 NT$ {Math.round(item.amount / item.peopleCount).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        NT$ {item.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-stone-500 text-[11px] max-w-xs truncate">
                        {item.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. 底部關閉 */}
        <div className="p-3 sm:p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="text-xs text-stone-500">
            顯示 {sortedTransactions.length} 筆明細，總計 NT$ {totalAmount.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
