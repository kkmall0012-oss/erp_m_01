import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  Utensils, 
  Fuel, 
  HandCoins, 
  PackageCheck, 
  Calendar, 
  Users, 
  Coins, 
  Car 
} from 'lucide-react';
import { Transaction, CategoryConfig } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface TransactionListProps {
  transactions: Transaction[];
  categories: CategoryConfig[];
  currentYearMonth: string;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  currentYearMonth,
  onDeleteTransaction,
  onEditTransaction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);

  // 1. 篩選月份或全歷史
  const baseList = scope === 'month'
    ? transactions.filter((t) => t.date.startsWith(currentYearMonth))
    : [...transactions];

  // 2. 篩選分類與搜尋詞
  const filteredList = baseList.filter((t) => {
    const matchCategory = selectedFilterCategory === 'all' || t.categoryId === selectedFilterCategory || t.categoryName === selectedFilterCategory;
    const matchSearch =
      searchTerm === '' ||
      t.subItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.claimant && t.claimant.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.note && t.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.amount.toString().includes(searchTerm);

    return matchCategory && matchSearch;
  });

  // 依照日期由近至遠排序
  filteredList.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.createdAt - a.createdAt));

  const getCategoryColor = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat?.color || '#64748b';
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'dining':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'fuel':
        return <Fuel className="w-3.5 h-3.5" />;
      case 'advance':
        return <HandCoins className="w-3.5 h-3.5" />;
      case 'misc':
        return <PackageCheck className="w-3.5 h-3.5" />;
      case 'transport':
        return <Car className="w-3.5 h-3.5" />;
      case 'replenishment':
      case 'replenish':
        return <Coins className="w-3.5 h-3.5" />;
      default:
        return <Filter className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* 頂部控制面板 */}
      <div className="p-5 border-b border-stone-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-stone-50/50">
        <div>
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <span>收支明細清單</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-semibold">
              {filteredList.length} 筆
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            點擊可快速編輯或刪除記錄，並支援即時關鍵字檢索
          </p>
        </div>

        {/* 篩選控制器 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 區間切換 */}
          <div className="inline-flex p-1 bg-stone-200/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setScope('month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                scope === 'month' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              當月明細
            </button>
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                scope === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              全部歷史
            </button>
          </div>

          {/* 關鍵字搜尋 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="搜尋店家/姓名/備註..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 分類快速過濾標籤 */}
      <div className="px-5 py-2.5 border-b border-stone-100 flex items-center gap-1.5 overflow-x-auto bg-stone-50/20">
        <span className="text-xs text-stone-400 shrink-0 mr-1">分類過濾:</span>
        <button
          onClick={() => setSelectedFilterCategory('all')}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
            selectedFilterCategory === 'all'
              ? 'bg-stone-900 text-white'
              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          全部類別
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedFilterCategory(cat.id)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 border ${
              selectedFilterCategory === cat.id
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* 明細表格清單 */}
      <div className="overflow-x-auto">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-stone-400">
            <p className="text-xs">查無符合條件的記帳明細</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60 text-stone-500 font-semibold">
                <th className="py-3 px-4">日期</th>
                <th className="py-3 px-4">請領同仁</th>
                <th className="py-3 px-4">主分類</th>
                <th className="py-3 px-3 text-center">憑證</th>
                <th className="py-3 px-4">項目 (店家 / 站點 / 細項 / 來源)</th>
                <th className="py-3 px-4 text-center">人數 (餐飲)</th>
                <th className="py-3 px-4 text-right">金額 (NT$)</th>
                <th className="py-3 px-4">備註</th>
                <th className="py-3 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredList.map((item) => {
                const isExpense = item.type === 'expense';
                const isDining = item.categoryId === 'dining' || item.peopleCount;
                const perPerson = isDining && item.peopleCount && item.peopleCount > 1
                  ? Math.round(item.amount / item.peopleCount)
                  : null;

                return (
                  <tr key={item.id} className="hover:bg-stone-50/80 transition-colors group">
                    {/* 日期與系統傳票號 */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-stone-700">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>{item.date}</span>
                      </div>
                      {(item.voucherNo || (item.id && item.id.startsWith('P'))) && (
                        <div 
                          className="text-[10px] font-mono font-semibold text-amber-700 mt-0.5 tracking-tight"
                          title={item.rawVoucherId ? `【系統傳票編號】：${item.voucherNo || item.id}\n【帳務小管家建檔模式編號】：${item.rawVoucherId}` : `系統傳票號：${item.voucherNo || item.id}`}
                        >
                          {item.voucherNo || item.id}
                        </div>
                      )}
                    </td>

                    {/* 請領同仁 */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isExpense ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-amber-50 text-amber-900 border border-amber-200">
                          <Users className="w-3 h-3 text-amber-600" />
                          <span>{item.claimant || '未指定'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Coins className="w-3 h-3 text-emerald-600" />
                          <span>撥補入帳</span>
                        </span>
                      )}
                    </td>

                    {/* 主分類 */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px]"
                        style={{
                          backgroundColor: `${getCategoryColor(item.categoryId)}15`,
                          color: getCategoryColor(item.categoryId)
                        }}
                      >
                        {getCategoryIcon(item.categoryId)}
                        <span>{item.categoryName}</span>
                      </span>
                    </td>

                    {/* 憑證/發票 */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isExpense ? (
                        item.receiptType === 'invoice' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                              🧾 發票
                            </span>
                            {item.invoiceNumber && (
                              <span className="text-[9px] font-mono text-purple-700 mt-0.5 max-w-[90px] truncate" title={item.invoiceNumber}>
                                {item.invoiceNumber}
                              </span>
                            )}
                          </div>
                        ) : item.receiptType === 'receipt' ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-medium text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                            📄 收據
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-normal text-[10px] bg-stone-100 text-stone-400">
                            無
                          </span>
                        )
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>

                    {/* 第二層細項 */}
                    <td className="py-3 px-4 font-bold text-stone-800 whitespace-nowrap">
                      {item.subItem}
                    </td>

                    {/* 用餐人數 */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {item.peopleCount ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/60 font-semibold text-[10px]">
                            <Users className="w-2.5 h-2.5" />
                            {item.peopleCount} 人
                          </span>
                          {perPerson && (
                            <span className="text-[10px] text-stone-400 mt-0.5 font-mono">
                              均 NT${perPerson.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>

                    {/* 金額 */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isExpense ? 'text-stone-900' : 'text-emerald-700'
                        }`}
                      >
                        {isExpense ? '- ' : '+ '}
                        <span className="text-[11px] font-normal mr-0.5">NT$</span>
                        {item.amount.toLocaleString()}
                      </span>
                    </td>

                    {/* 備註 */}
                    <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                      {item.note || <span className="text-stone-300 italic">無備註</span>}
                    </td>

                    {/* 操作 */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(item)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          title="修改此筆記錄"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="刪除此筆記錄"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 刪除確認彈窗 (避免 iframe 阻擋 window.confirm) */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="確定要刪除此筆零用金記錄？"
        description={
          itemToDelete ? (
            <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200 mt-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400 font-sans">交易日期:</span>
                <span className="font-semibold text-stone-800">{itemToDelete.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 font-sans">主分類:</span>
                <span className="font-semibold text-stone-800">{itemToDelete.categoryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 font-sans">項目/來源:</span>
                <span className="font-semibold text-stone-800">{itemToDelete.subItem}</span>
              </div>
              {itemToDelete.claimant && (
                <div className="flex justify-between">
                  <span className="text-stone-400 font-sans">請領同仁:</span>
                  <span className="font-semibold text-amber-900">{itemToDelete.claimant}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-stone-200 pt-1.5 mt-1">
                <span className="text-stone-500 font-sans font-bold">金額:</span>
                <span className="font-bold text-rose-600 text-sm">
                  {itemToDelete.type === 'expense' ? '- ' : '+ '}NT$ {itemToDelete.amount.toLocaleString()}
                </span>
              </div>
              {itemToDelete.note && (
                <div className="text-[11px] text-stone-400 pt-1">
                  備註: {itemToDelete.note}
                </div>
              )}
            </div>
          ) : null
        }
        confirmText="確認刪除記錄"
        cancelText="取消保留"
        variant="danger"
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteTransaction(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  );
};
