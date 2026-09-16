import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Utensils, 
  Fuel, 
  HandCoins, 
  PackageCheck, 
  Coins, 
  Users, 
  Calendar, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { CategoryConfig, Transaction, TransactionType } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: CategoryConfig[];
  claimants: string[];
  onSave: (updatedTransaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories,
  claimants,
  onSave,
  onDelete
}) => {
  if (!isOpen || !transaction) return null;

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [date, setDate] = useState<string>(transaction.date);
  const [categoryId, setCategoryId] = useState<string>(transaction.categoryId);
  const [subItem, setSubItem] = useState<string>(transaction.subItem || '');
  const [claimant, setClaimant] = useState<string>(transaction.claimant || '自己 / 零用金管理員');
  const [peopleCount, setPeopleCount] = useState<number>(transaction.peopleCount || 1);
  const [amount, setAmount] = useState<string>(String(transaction.amount));
  const [note, setNote] = useState<string>(transaction.note || '');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // 當 transaction 切換時重設狀態
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setDate(transaction.date);
      setCategoryId(transaction.categoryId);
      setSubItem(transaction.subItem || '');
      setClaimant(transaction.claimant || '自己 / 零用金管理員');
      setPeopleCount(transaction.peopleCount || 1);
      setAmount(String(transaction.amount));
      setNote(transaction.note || '');
      setErrorMessage('');
    }
  }, [transaction]);

  const currentCategory = categories.find((c) => c.id === categoryId) || categories[0];
  const isDining = type === 'expense' && (currentCategory?.id === 'dining' || currentCategory?.hasPeopleCount);

  // 儲存修改
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('請輸入正確的有效金額（大於 0）');
      return;
    }

    if (!subItem.trim()) {
      setErrorMessage('請選擇或填寫店家/項目名稱');
      return;
    }

    const updated: Transaction = {
      ...transaction,
      type,
      date,
      categoryId,
      categoryName: currentCategory?.name || transaction.categoryName,
      subItem: subItem.trim(),
      amount: numAmount,
      note: note.trim(),
      peopleCount: isDining ? (peopleCount > 0 ? peopleCount : 1) : undefined,
      claimant: type === 'expense' ? claimant : undefined
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題列 */}
        <div className="p-4 sm:px-6 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${
              type === 'expense' ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                修改記帳明細
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                單獨彈窗修改，不會動到左側專用的日常登記表單
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表單內容主體 */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-4 grow">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 收支型態切換 */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">收支類型</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  const firstExp = categories.find((c) => c.type === 'expense');
                  if (firstExp) setCategoryId(firstExp.id);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                🔴 支出開銷
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  const firstInc = categories.find((c) => c.type === 'income');
                  if (firstInc) setCategoryId(firstInc.id);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                🟢 撥補補充
              </button>
            </div>
          </div>

          {/* 日期與主分類 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>交易日期</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">主分類</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  setCategoryId(newCatId);
                  const matched = categories.find((c) => c.id === newCatId);
                  if (matched && matched.defaultSubItems.length > 0 && !matched.defaultSubItems.includes(subItem)) {
                    setSubItem(matched.defaultSubItems[0]);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              >
                {categories
                  .filter((c) => c.type === type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 請領人 (支出開銷時顯示) */}
          {type === 'expense' && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                <span>請領同仁</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={claimant}
                  onChange={(e) => setClaimant(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                >
                  {claimants.map((c, idx) => (
                    <option key={idx} value={c}>
                      {c}
                    </option>
                  ))}
                  {!claimants.includes(claimant) && (
                    <option value={claimant}>{claimant} (現有)</option>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* 店家 / 項目 */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">
              {currentCategory?.subLabel || '店家 / 項目 / 來源名稱'}
            </label>
            <div className="space-y-2">
              <input
                type="text"
                required
                value={subItem}
                onChange={(e) => setSubItem(e.target.value)}
                placeholder="請輸入店家或項目名稱..."
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
              {/* 常用預設標籤點選 */}
              {currentCategory?.defaultSubItems && currentCategory.defaultSubItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[10px] text-stone-400 self-center">快速代入:</span>
                  {currentCategory.defaultSubItems.slice(0, 8).map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSubItem(opt)}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        subItem === opt
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 餐飲人數 */}
          {isDining && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">用餐人數與均攤</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-medium text-center"
                />
                <span className="text-xs text-stone-500">
                  {peopleCount > 1 && parseInt(amount, 10) > 0 ? (
                    <span className="font-semibold text-orange-700">
                      人均約 NT$ {Math.round(parseInt(amount, 10) / peopleCount).toLocaleString()}
                    </span>
                  ) : (
                    '輸入人數可自動統計人均餐費'
                  )}
                </span>
              </div>
            </div>
          )}

          {/* 金額 */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">
              金額 (NT$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                NT$
              </span>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-2 text-lg font-bold font-mono bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-900"
              />
            </div>
          </div>

          {/* 備註說明 */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">備註說明 (選填)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：發票號碼、用途說明、預支原因..."
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-800"
            />
          </div>
        </form>

        {/* 底部操作按鈕 */}
        <div className="p-4 sm:px-6 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>刪除此筆</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>儲存修改</span>
            </button>
          </div>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="確認刪除此筆記帳？"
        description={`確定要刪除「${transaction.date} ${transaction.subItem} NT$ ${transaction.amount.toLocaleString()}」的記帳紀錄嗎？此動作無法復原。`}
        confirmText="確認刪除"
        variant="danger"
        onConfirm={() => {
          if (onDelete) {
            onDelete(transaction.id);
          }
          setShowDeleteConfirm(false);
          onClose();
        }}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
