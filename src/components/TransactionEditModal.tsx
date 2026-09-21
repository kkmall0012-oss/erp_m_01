import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Users, 
  Calendar, 
  AlertCircle,
  Clock,
  ShieldCheck,
  Receipt,
  Building2,
  Check
} from 'lucide-react';
import { CategoryConfig, Transaction, ReceiptType, CompanyProfile } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: CategoryConfig[];
  claimants: string[];
  companies?: CompanyProfile[];
  onSave: (updatedTransaction: Transaction) => void;
  onDelete?: (id: string) => void;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories,
  claimants,
  companies = [],
  onSave,
  onDelete
}) => {
  // 注意：所有 Hook 必須無條件置於組件頂部，不可在 if (!isOpen || !transaction) 之後呼叫
  // 避免 React 19 拋出 "Expected static flag was missing" 內部錯誤
  const [date, setDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('dining');
  const [subItem, setSubItem] = useState<string>('');
  const [claimant, setClaimant] = useState<string>('自己 / 零用金管理員');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [receiptType, setReceiptType] = useState<ReceiptType>('receipt');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('comp_1');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // 當 transaction 切換時重設狀態
  useEffect(() => {
    if (transaction) {
      setDate(transaction.date);
      setCategoryId(transaction.categoryId);
      setSubItem(transaction.subItem || '');
      setClaimant(transaction.claimant || '自己 / 零用金管理員');
      setPeopleCount(transaction.peopleCount || 1);
      setReceiptType(transaction.receiptType || (transaction.type === 'expense' ? 'receipt' : 'none'));
      setInvoiceNumber(transaction.invoiceNumber || '');
      setAmount(String(transaction.amount));
      setNote(transaction.note || '');
      setCompanyId(transaction.companyId || (companies[0]?.id || 'comp_1'));
      setErrorMessage('');
      setShowDeleteConfirm(false);
    }
  }, [transaction, companies]);

  // 取得所屬分類物件 (若為收入，優先匹配收入大類，確保自訂細項正確掛鉤)
  const currentCategory = useMemo(() => {
    const found = categories.find((c) => c.id === categoryId);
    if (found) return found;
    if (transaction?.type === 'income') {
      return (
        categories.find((c) => c.type === 'income') ||
        categories.find((c) => c.id === 'replenishment' || c.id === 'replenish' || c.name.includes('撥補')) ||
        categories[0]
      );
    }
    return (
      categories.find((c) => c.type === 'expense') ||
      categories[0]
    );
  }, [categories, categoryId, transaction]);

  const isExpense = transaction ? transaction.type === 'expense' : true;
  const isDining = isExpense && (currentCategory?.id === 'dining' || currentCategory?.hasPeopleCount);

  // Hook 執行完成後才做條件回傳
  if (!isOpen || !transaction) return null;

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

    if (isExpense && receiptType === 'invoice' && !invoiceNumber.trim()) {
      setErrorMessage('選擇「發票」時，發票號碼為強制輸入選項，請填寫發票號碼');
      return;
    }

    // 依使用者指示：嚴格維持原始收支性質，不可將支出變收入，亦不可將收入變支出
    const updated: Transaction = {
      ...transaction,
      type: transaction.type,
      date,
      categoryId,
      categoryName: currentCategory?.name || transaction.categoryName,
      subItem: subItem.trim(),
      amount: numAmount,
      note: note.trim(),
      peopleCount: isDining ? (peopleCount > 0 ? peopleCount : 1) : undefined,
      claimant: isExpense ? claimant : undefined,
      receiptType: isExpense ? receiptType : undefined,
      invoiceNumber: isExpense && receiptType === 'invoice' ? (invoiceNumber.trim() ? invoiceNumber.trim().toUpperCase() : undefined) : undefined,
      companyId: companyId
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
              isExpense ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                <span>修改記帳明細</span>
                {(transaction.voucherNo || (transaction.id && transaction.id.startsWith('P'))) && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                    {transaction.voucherNo || transaction.id}
                  </span>
                )}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {transaction.rawVoucherId
                  ? `小管家建檔編號：${transaction.rawVoucherId}`
                  : '單獨彈窗修改，不會動到左側專用的日常登記表單'}
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

          {/* 收支類型展示（依指示：收支性質固定，不可將支出改為收入或收入改為支出） */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isExpense 
              ? 'bg-amber-500/10 border-amber-200' 
              : 'bg-emerald-500/10 border-emerald-200'
          }`}>
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className={`w-4 h-4 ${isExpense ? 'text-amber-700' : 'text-emerald-700'}`} />
                <span className="text-xs font-bold text-stone-800">
                  收支類型：{isExpense ? '支出開銷' : '撥補補充 (收入)'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {isExpense 
                  ? '此筆記錄為支出開銷，性質固定，不可改為撥補收入' 
                  : '此筆記錄為撥補補充，性質固定，不可改為支出開銷'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white shadow-2xs shrink-0 ${
              isExpense ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              {isExpense ? '🔴 支出開銷' : '🟢 撥補補充'}
            </span>
          </div>

          {/* 🏢 帳單歸屬公司行號 (三間關係企業切換) */}
          {companies.length > 0 && (
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0066cc]" />
                  <span>歸屬關係企業/行號：</span>
                </label>
                <span className="text-[10px] text-stone-400 font-mono">
                  統編：{companies.find(c => c.id === companyId)?.taxId || '未設定'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {companies.map(c => {
                  const isSelected = companyId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCompanyId(c.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0066cc] bg-white text-[#0066cc] shadow-2xs ring-2 ring-[#0066cc]/15'
                          : 'border-stone-200 bg-white/60 text-stone-600 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || '#0066cc' }} />
                        <span className="truncate">{c.shortName || c.name}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-[#0066cc] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  .filter((c) => c.type === transaction.type && (transaction.type === 'expense' ? c.id !== 'replenishment' && !c.name.includes('撥補') : true))
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 請領人 (僅支出開銷時顯示) */}
          {isExpense && (
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
              {currentCategory?.subLabel || (isExpense ? '店家 / 項目名稱' : '撥補來源說明')}
            </label>
            <div className="space-y-2">
              <input
                type="text"
                required
                value={subItem}
                onChange={(e) => setSubItem(e.target.value)}
                placeholder={isExpense ? '請輸入店家或開銷項目名稱...' : '請輸入撥補來源名稱...'}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
              {/* 常用預設標籤快速代入 */}
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

          {/* 支出單據憑證類型 (收據 / 發票 / 無) */}
          {isExpense && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>單據憑證類型</span>
                </label>
                <span className="text-[11px] text-stone-500">
                  {receiptType === 'invoice' ? '統一發票' : receiptType === 'receipt' ? '收據' : '無單據'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReceiptType('receipt')}
                  className={`py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    receiptType === 'receipt'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>📄 收據</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptType('invoice')}
                  className={`py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    receiptType === 'invoice'
                      ? 'bg-white text-amber-900 shadow-2xs font-extrabold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>🧾 發票</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptType('none')}
                  className={`py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    receiptType === 'none'
                      ? 'bg-white text-stone-700 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span>❌ 無憑證</span>
                </button>
              </div>

              {receiptType === 'invoice' && (
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    <span>發票號碼</span> <span className="text-rose-600 font-bold">*必填</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                    placeholder="輸入發票號碼 (例：AB-12345678)"
                    maxLength={14}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 uppercase text-stone-800"
                  />
                </div>
              )}
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
