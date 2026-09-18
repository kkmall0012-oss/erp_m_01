import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Receipt, 
  AlertCircle, 
  Plus, 
  ShoppingBag,
  Users,
  Utensils,
  Fuel,
  HandCoins,
  Car,
  Coins,
  PackageCheck
} from 'lucide-react';
import { CategoryConfig, SubAccountItem, ReceiptType } from '../types';
import { getTodayDateStr } from '../utils/storage';
import { SearchableOptionPicker } from './SearchableOptionPicker';

interface SubAccountItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  subAccountName: string;
  defaultCustodian: string;
  categories: CategoryConfig[];
  claimants: string[];
  onAddItem: (itemData: Omit<SubAccountItem, 'id' | 'createdAt' | 'isImportedToGeneral'>) => void;
}

export const SubAccountItemModal: React.FC<SubAccountItemModalProps> = ({
  isOpen,
  onClose,
  subAccountName,
  defaultCustodian,
  categories,
  claimants,
  onAddItem
}) => {
  // 1. 基本欄位狀態
  const [date, setDate] = useState<string>(getTodayDateStr());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('dining');
  const [subItem, setSubItem] = useState<string>('');
  const [isCustomSubItem, setIsCustomSubItem] = useState<boolean>(false);
  const [customSubItem, setCustomSubItem] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [receiptType, setReceiptType] = useState<ReceiptType>('invoice');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [claimant, setClaimant] = useState<string>(defaultCustodian || '採買人員');
  const [note, setNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 當開啟時初始化
  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDateStr());
      setAmount('');
      setNote('');
      setErrorMessage('');
      setInvoiceNumber('');
      setReceiptType('invoice');
      setClaimant(defaultCustodian || '採買人員');
      setIsCustomSubItem(false);
      setCustomSubItem('');

      const firstExpenseCat = categories.find((c) => c.type === 'expense') || categories[0];
      if (firstExpenseCat) {
        setSelectedCategoryId(firstExpenseCat.id);
        setSubItem(firstExpenseCat.defaultSubItems[0] || '');
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, defaultCustodian, categories, onClose]);

  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.defaultSubItems.length > 0) {
      setSubItem(cat.defaultSubItems[0]);
      setIsCustomSubItem(false);
    } else {
      setSubItem('');
      setIsCustomSubItem(true);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('請輸入正確的大於 0 開銷金額');
      return;
    }

    const finalSubItem = isCustomSubItem ? customSubItem.trim() : subItem.trim();
    if (!finalSubItem) {
      setErrorMessage('請選擇或填入採買店家或品項名稱');
      return;
    }

    if (receiptType === 'invoice' && invoiceNumber.trim()) {
      const formattedInv = invoiceNumber.trim().toUpperCase();
      const invoiceRegex = /^[A-Z]{2}-?\d{8}$/;
      if (!invoiceRegex.test(formattedInv)) {
        setErrorMessage('發票號碼格式建議為 2 碼英文 + 8 碼數字（例：AB-12345678）');
        return;
      }
    }

    onAddItem({
      type: 'expense',
      date,
      categoryId: selectedCategoryId,
      categoryName: currentCategory?.name || '採買支出',
      subItem: finalSubItem,
      amount: parsedAmount,
      receiptType,
      invoiceNumber: receiptType === 'invoice' ? invoiceNumber.trim().toUpperCase() : undefined,
      claimant: claimant.trim() || defaultCustodian,
      note: note.trim()
    });

    onClose();
  };

  // 確保分類圖示使用乾淨圖標，絕不顯示資料庫原始英文欄位名稱
  const renderCategoryIcon = (cat: CategoryConfig, isSelected: boolean) => {
    const iconKey = (cat.icon || '').toLowerCase();
    const idKey = (cat.id || '').toLowerCase();
    const nameKey = (cat.name || '').toLowerCase();
    const iconClass = isSelected ? 'w-4 h-4 text-white shrink-0' : 'w-4 h-4 text-stone-600 shrink-0';

    if (iconKey.includes('utensils') || idKey === 'dining' || nameKey.includes('餐') || nameKey.includes('食') || nameKey.includes('便當')) {
      return <Utensils className={iconClass} />;
    }
    if (iconKey.includes('fuel') || idKey === 'fuel' || nameKey.includes('油') || nameKey.includes('車')) {
      return <Fuel className={iconClass} />;
    }
    if (iconKey.includes('handcoins') || idKey === 'advance' || nameKey.includes('代墊') || nameKey.includes('預支')) {
      return <HandCoins className={iconClass} />;
    }
    if (iconKey.includes('car') || idKey === 'transport' || nameKey.includes('交通') || nameKey.includes('差旅')) {
      return <Car className={iconClass} />;
    }
    if (iconKey.includes('coins') || idKey === 'replenishment' || nameKey.includes('撥補') || nameKey.includes('收入')) {
      return <Coins className={iconClass} />;
    }
    return <PackageCheck className={iconClass} />;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-hidden"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal 頂部 Header - 固定頂部 */}
        <div className="shrink-0 px-5 py-3.5 bg-sky-900 text-white flex items-center justify-between border-b border-sky-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-800 text-sky-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">＋ 新增採買支出明細</h3>
              <p className="text-[11px] text-sky-200">子帳號：{subAccountName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
            title="關閉視窗 (Esc)"
          >
            <X className="w-4 h-4" />
            <span>關閉</span>
          </button>
        </div>

        {/* 表單內容 - 獨立滾動區 */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs grow">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. 日期 */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">採買日期</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-sky-600 focus:outline-hidden font-medium text-xs text-stone-800"
              />
            </div>
          </div>

          {/* 2. 支出大類 */}
          <div>
            <label className="block font-bold text-stone-700 mb-1.5">支出大類</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories
                .filter((c) => c.type === 'expense' && c.id !== 'replenishment' && !c.name.includes('撥補'))
                .map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-900 bg-sky-900 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    {renderCategoryIcon(cat, isSelected)}
                    <span className="font-bold text-xs truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 店家 / 品項名稱 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-stone-700">店家 / 品項名稱</label>
              {!isCustomSubItem ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomSubItem(true);
                    setCustomSubItem('');
                  }}
                  className="text-[11px] text-sky-700 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>手動輸入品項</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCustomSubItem(false)}
                  className="text-[11px] text-stone-500 hover:text-stone-700 underline cursor-pointer"
                >
                  返回選單選擇
                </button>
              )}
            </div>

            {!isCustomSubItem ? (
              <SearchableOptionPicker
                id="subitem-modal-picker"
                options={currentCategory?.defaultSubItems || []}
                value={subItem}
                onChange={(val) => setSubItem(val)}
                placeholder={`選擇 ${currentCategory?.name || '店家/品項'}...`}
              />
            ) : (
              <input
                type="text"
                placeholder="例如：池上便當、全聯實業、中油加油站"
                value={customSubItem}
                onChange={(e) => setCustomSubItem(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-sky-300 bg-sky-50/40 focus:bg-white focus:border-sky-600 focus:outline-hidden text-xs text-stone-800 font-medium"
              />
            )}
          </div>

          {/* 4. 開銷金額 */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">支出金額 (NT$ 新台幣)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="例：450"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-sky-600 focus:outline-hidden font-mono font-bold text-base text-stone-900"
              />
            </div>
          </div>

          {/* 5. 單據憑證類型 (收據、發票、無) 與 發票號碼 */}
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div>
              <label className="block font-bold text-stone-700 mb-1.5">支出憑證單據</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptType('invoice')}
                  className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    receiptType === 'invoice'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  <span>🧾 統一發票</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptType('receipt')}
                  className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    receiptType === 'receipt'
                      ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span>📄 收據</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptType('none')}
                  className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    receiptType === 'none'
                      ? 'border-stone-400 bg-stone-200 text-stone-800 ring-1 ring-stone-400'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span>❌ 無憑證</span>
                </button>
              </div>
            </div>

            {receiptType === 'invoice' && (
              <div className="pt-2 border-t border-stone-200/80">
                <label className="block font-bold text-stone-700 mb-1">
                  發票號碼 <span className="font-normal text-stone-400">(格式例：AB-12345678)</span>
                </label>
                <input
                  type="text"
                  placeholder="請輸入發票號碼"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white focus:border-indigo-600 focus:outline-hidden font-mono font-bold text-xs text-indigo-900 tracking-wide uppercase"
                />
              </div>
            )}
          </div>

          {/* 6. 採買經手人 / 請領人 (與零用金請款人相同，由內部人員名冊中選擇) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-stone-700">採買經手人 / 請領人</label>
              <span className="text-[10px] text-stone-400">限內部請款同仁名單</span>
            </div>
            <select
              value={claimant}
              onChange={(e) => setClaimant(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-sky-600 focus:outline-hidden text-xs text-stone-800 font-medium"
            >
              {claimants.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {defaultCustodian && !claimants.includes(defaultCustodian) && (
                <option value={defaultCustodian}>{defaultCustodian} (預設經手人)</option>
              )}
              {claimant && !claimants.includes(claimant) && claimant !== defaultCustodian && (
                <option value={claimant}>{claimant} (現有)</option>
              )}
            </select>
          </div>

          {/* 7. 備註說明 */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">備註說明 (選填)</label>
            <input
              type="text"
              placeholder="例如：週二部門午餐便當 10 個"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-sky-600 focus:outline-hidden text-xs text-stone-800"
            />
          </div>

          {/* 底部按鈕 */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-bold shadow-sm transition-all cursor-pointer"
            >
              確認加入採買明細
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
