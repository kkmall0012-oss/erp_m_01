import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Coins, 
  TrendingDown, 
  Calendar, 
  Users, 
  Receipt, 
  Check, 
  Plus, 
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
  Utensils,
  Fuel,
  HandCoins,
  Car,
  PackageCheck
} from 'lucide-react';
import { CategoryConfig, Transaction, TransactionType, ReceiptType } from '../types';
import { getTodayDateStr } from '../utils/storage';
import { SearchableOptionPicker } from './SearchableOptionPicker';

interface TransactionCreateModalProps {
  isOpen: boolean;
  type: TransactionType;
  defaultCategoryId?: string;
  onClose: () => void;
  categories: CategoryConfig[];
  claimants: string[];
  transactions?: Transaction[];
  currentYearMonth?: string;
  onAddTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onQuickAddSubItem?: (categoryId: string, newItem: string) => void;
  onQuickAddClaimant?: (newClaimant: string) => void;
  onOpenSettings?: (tab?: 'categories' | 'claimants') => void;
}

export const TransactionCreateModal: React.FC<TransactionCreateModalProps> = ({
  isOpen,
  type,
  defaultCategoryId,
  onClose,
  categories,
  claimants,
  transactions = [],
  currentYearMonth,
  onAddTransaction,
  onQuickAddSubItem,
  onQuickAddClaimant,
  onOpenSettings
}) => {
  // 1. 日期與分類
  const [date, setDate] = useState<string>(getTodayDateStr());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('dining');

  // 2. 支出第二層細項 (店家/品項/站點)
  const [selectedSubItem, setSelectedSubItem] = useState<string>('');
  const [customSubItemInput, setCustomSubItemInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [saveToMenu, setSaveToMenu] = useState<boolean>(true);

  // 3. 收入第二層細項 (撥補來源)
  const [incomeSource, setIncomeSource] = useState<string>('公司銀行帳戶提領');
  const [customIncomeSource, setCustomIncomeSource] = useState<string>('');
  const [isCustomIncomeSource, setIsCustomIncomeSource] = useState<boolean>(false);

  // 4. 請領人 / 經手人
  const [selectedClaimant, setSelectedClaimant] = useState<string>(claimants[0] || '自己 / 零用金管理員');
  const [customClaimantInput, setCustomClaimantInput] = useState<string>('');
  const [isCustomClaimantMode, setIsCustomClaimantMode] = useState<boolean>(false);
  const [saveClaimantToMenu, setSaveClaimantToMenu] = useState<boolean>(true);

  // 5. 其他開支欄位
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [receiptType, setReceiptType] = useState<ReceiptType>('invoice');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 常用撥補來源預設清單
  const defaultIncomeSources = [
    '公司銀行帳戶提領',
    '主管現金提撥',
    '採買結算剩餘款繳回',
    '同仁退還預支代墊款',
    '其他現金收入'
  ];

  // 支出大類：排除零用金撥補（撥補屬收入類別，支出登記頁面嚴禁出現撥補選項）
  const expenseCategories = useMemo(() => {
    return categories.filter(
      (c) => c.type === 'expense' && c.id !== 'replenishment' && !c.name.includes('撥補')
    );
  }, [categories]);

  // 計算查詢月份項目的統計頻率
  const queryMonth = currentYearMonth || date.slice(0, 7);

  const subItemUsageMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.date && t.date.startsWith(queryMonth)) {
        if (t.subItem && (!t.categoryId || t.categoryId === selectedCategoryId)) {
          map[t.subItem] = (map[t.subItem] || 0) + 1;
        }
      }
    });
    return map;
  }, [transactions, selectedCategoryId, queryMonth]);

  const claimantUsageMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.date && t.date.startsWith(queryMonth)) {
        if (t.claimant) {
          map[t.claimant] = (map[t.claimant] || 0) + 1;
        }
      }
    });
    return map;
  }, [transactions, queryMonth]);

  // 當開啟時重設表單與監聽 Esc 鍵
  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDateStr());
      setAmount('');
      setNote('');
      setErrorMessage('');
      setInvoiceNumber('');
      setReceiptType('invoice');
      setPeopleCount(1);
      setIsCustomMode(false);
      setCustomSubItemInput('');
      setIsCustomClaimantMode(false);
      setCustomClaimantInput('');
      setIsCustomIncomeSource(false);
      setCustomIncomeSource('');

      if (type === 'expense') {
        const targetCat = (defaultCategoryId && expenseCategories.find((c) => c.id === defaultCategoryId)) ||
          expenseCategories.find((c) => c.id === 'dining') ||
          expenseCategories[0];
        if (targetCat) {
          setSelectedCategoryId(targetCat.id);
          setSelectedSubItem(targetCat.defaultSubItems[0] || '');
        }
      } else {
        setIncomeSource(defaultIncomeSources[0]);
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, type, categories, onClose]);

  // 當分類切換時更新預設細項
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.defaultSubItems.length > 0) {
      setSelectedSubItem(cat.defaultSubItems[0]);
      setIsCustomMode(false);
    } else {
      setSelectedSubItem('');
      setIsCustomMode(true);
    }
  };

  if (!isOpen) return null;

  // 處理送出
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('請輸入正確的金額（必須大於 0）');
      return;
    }

    if (type === 'income') {
      const finalSource = isCustomIncomeSource ? customIncomeSource.trim() : incomeSource;
      if (!finalSource) {
        setErrorMessage('請填寫撥補來源');
        return;
      }

      onAddTransaction({
        type: 'income',
        date,
        amount: parsedAmount,
        categoryId: 'replenish',
        categoryName: '撥補收入',
        subItem: finalSource,
        claimant: selectedClaimant.trim() || '零用金管理員',
        note: note.trim()
      });

      onClose();
      return;
    }

    // 支出驗證
    const finalSubItem = isCustomMode ? customSubItemInput.trim() : selectedSubItem.trim();
    if (!finalSubItem) {
      setErrorMessage('請選擇或填入店家、品項或用途名稱');
      return;
    }

    // 單據發票強制填寫驗證 (選擇發票時，發票號碼為強制輸入選項)
    if (receiptType === 'invoice' && !invoiceNumber.trim()) {
      setErrorMessage('選擇「發票」時，發票號碼為強制輸入選項，請填寫發票號碼');
      return;
    }

    // 若為自訂並勾選儲存至下拉選單
    if (isCustomMode && saveToMenu && onQuickAddSubItem && finalSubItem) {
      onQuickAddSubItem(selectedCategoryId, finalSubItem);
    }

    // 請領人處理
    const finalClaimant = isCustomClaimantMode ? customClaimantInput.trim() : selectedClaimant.trim();
    if (!finalClaimant) {
      setErrorMessage('請選擇或輸入請領同仁姓名');
      return;
    }

    if (isCustomClaimantMode && saveClaimantToMenu && onQuickAddClaimant && finalClaimant) {
      onQuickAddClaimant(finalClaimant);
    }

    onAddTransaction({
      type: 'expense',
      date,
      amount: parsedAmount,
      categoryId: selectedCategoryId,
      categoryName: currentCategory?.name || '日常開支',
      subItem: finalSubItem,
      claimant: finalClaimant,
      peopleCount: currentCategory?.hasPeopleCount ? Math.max(1, peopleCount) : undefined,
      receiptType,
      invoiceNumber: receiptType === 'invoice' ? invoiceNumber.trim().toUpperCase() : undefined,
      note: note.trim()
    });

    onClose();
  };

  // 確保分類圖示使用乾淨圖標，絕不顯示資料庫原始英文欄位名稱
  const renderCategoryIcon = (cat: CategoryConfig, isSelected: boolean) => {
    const iconKey = (cat.icon || '').toLowerCase();
    const idKey = (cat.id || '').toLowerCase();
    const nameKey = (cat.name || '').toLowerCase();
    const iconClass = isSelected ? 'w-4 h-4 text-amber-300 shrink-0' : 'w-4 h-4 text-stone-600 shrink-0';

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
        {/* Modal 頂部 Header - 固定頂部，絕不跑位 */}
        <div className={`shrink-0 px-5 py-3.5 flex items-center justify-between border-b ${
          type === 'income' ? 'bg-emerald-700 text-white' : 'bg-stone-900 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              type === 'income' ? 'bg-white/20 text-white' : 'bg-rose-500/25 text-rose-300'
            }`}>
              {type === 'income' ? <Coins className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">
                {type === 'income' ? '＋ 登記零用金撥補 (收入)' : '－ 登記零用金支出 (開銷)'}
              </h3>
              <p className={`text-[11px] ${type === 'income' ? 'text-emerald-100' : 'text-stone-400'}`}>
                {type === 'income' ? '記錄公司撥款補足手頭現金水位' : '填寫金額與項目，快速完成記帳'}
              </p>
            </div>
          </div>
          
          {/* 明顯頂部關閉按鍵：一眼看懂、一鍵點擊關閉 */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
            title="關閉視窗"
          >
            <X className="w-4 h-4" />
            <span>關閉</span>
          </button>
        </div>

        {/* 表單內容 - 獨立滾動區塊，保持流暢操作 */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs grow">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* 支出專用表單：以人性出發，金額與類別優先，直覺好填 */}
          {/* ======================================================== */}
          {type === 'expense' ? (
            <>
              {/* 1. 金額 (核心最大最明顯) 與 記帳日期 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7">
                  <label className="block font-bold text-stone-800 mb-1">
                    開支金額 <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 font-bold text-xs">
                      NT$
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      autoFocus
                      placeholder="例：250"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-11 pr-3 py-2.5 rounded-xl border-2 border-stone-200 bg-stone-50/50 focus:bg-white focus:border-rose-500 focus:outline-hidden font-mono font-bold text-lg text-rose-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="block font-bold text-stone-700 mb-1">記帳日期</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-stone-900 focus:outline-hidden font-medium text-xs text-stone-800"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 支出大類 (大圖標按鈕，一目了然) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-stone-800">
                    選擇支出大類 <span className="text-stone-400 font-normal">(點選即切換)</span>
                  </label>
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings('categories');
                      }}
                      className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>自訂大類選單</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {expenseCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`p-2 sm:p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white shadow-xs font-bold'
                            : 'border-stone-200 bg-stone-50/80 hover:bg-stone-100 text-stone-700 font-medium'
                        }`}
                      >
                        {renderCategoryIcon(cat, isSelected)}
                        <span className="text-xs truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. 店家 / 品項 / 細項 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-stone-800">
                    {currentCategory?.subLabel || '店家 / 品項細項'} <span className="text-rose-600 font-bold">*</span>
                  </label>
                  {!isCustomMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMode(true);
                        setCustomSubItemInput('');
                      }}
                      className="text-[11px] text-orange-700 hover:text-orange-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>直接手動輸入</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="text-[11px] text-stone-500 hover:text-stone-800 font-medium underline cursor-pointer"
                    >
                      回到選單快選
                    </button>
                  )}
                </div>

                {!isCustomMode ? (
                  <SearchableOptionPicker
                    id="modal-subitem-picker"
                    options={currentCategory?.defaultSubItems || []}
                    value={selectedSubItem}
                    onChange={(val) => setSelectedSubItem(val)}
                    usageCounts={subItemUsageMap}
                    monthLabel={queryMonth}
                    placeholder={`搜尋或點選 ${currentCategory?.name || '品項'}...`}
                    itemTypeLabel={currentCategory?.name || '品項'}
                  />
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder={`請輸入${currentCategory?.subLabel || '店家或細項名稱'}`}
                      value={customSubItemInput}
                      onChange={(e) => setCustomSubItemInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-orange-300 bg-orange-50/30 focus:bg-white focus:border-stone-900 focus:outline-hidden text-xs text-stone-800 font-medium"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-stone-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToMenu}
                        onChange={(e) => setSaveToMenu(e.target.checked)}
                        className="rounded-sm border-stone-300 text-stone-900 focus:ring-0"
                      />
                      <span>記住此店家/品項，同步儲存至「{currentCategory?.name}」常用清單</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 餐飲人數 (若為餐飲類別) */}
              {currentCategory?.hasPeopleCount && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/60 border border-orange-200/80">
                  <div>
                    <span className="font-bold text-orange-950">用餐人數 (均攤計算)</span>
                    <p className="text-[10px] text-orange-700">自動計算當月人均餐費</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1.5 rounded-lg border border-orange-300 bg-white text-center font-bold text-xs"
                    />
                    <span className="text-orange-900 font-bold">人</span>
                  </div>
                </div>
              )}

              {/* 4. 單據憑證類型 (三選一，傻瓜式直覺選擇) */}
              <div>
                <label className="block font-bold text-stone-800 mb-1.5">支出憑證單據</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptType('invoice')}
                    className={`p-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      receiptType === 'invoice'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
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
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
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
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span>❌ 無單據</span>
                  </button>
                </div>

                {receiptType === 'invoice' && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                        <span>發票號碼</span>
                        <span className="text-rose-600 font-bold">*必填（未輸入無法建檔）</span>
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="請輸入發票號碼（例：AB-12345678）"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/20 focus:border-indigo-600 focus:outline-hidden font-mono font-bold text-xs text-indigo-900 uppercase"
                    />
                  </div>
                )}
              </div>

              {/* 5. 請領同仁 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-stone-800">
                    請領同仁 / 經手人 <span className="text-rose-600 font-bold">*</span>
                  </label>
                  {!isCustomClaimantMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomClaimantMode(true);
                        setCustomClaimantInput('');
                      }}
                      className="text-[11px] text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>新增同仁</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCustomClaimantMode(false)}
                      className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      選單選擇
                    </button>
                  )}
                </div>

                {!isCustomClaimantMode ? (
                  <SearchableOptionPicker
                    id="modal-claimant-picker"
                    options={claimants}
                    value={selectedClaimant}
                    onChange={(val) => setSelectedClaimant(val)}
                    usageCounts={claimantUsageMap}
                    monthLabel={queryMonth}
                    placeholder="搜尋或選擇經手同仁..."
                    itemTypeLabel="請款同仁"
                  />
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="請輸入同仁姓名"
                      value={customClaimantInput}
                      onChange={(e) => setCustomClaimantInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-stone-900 focus:outline-hidden text-xs text-stone-800 font-medium"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-stone-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveClaimantToMenu}
                        onChange={(e) => setSaveClaimantToMenu(e.target.checked)}
                        className="rounded-sm border-stone-300 text-stone-900 focus:ring-0"
                      />
                      <span>記住此姓名，加入常用同仁清單</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 6. 備註說明 */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">備註說明 (選填)</label>
                <input
                  type="text"
                  placeholder="例如：跨區客戶會議、總務採買"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-stone-900 focus:outline-hidden text-xs text-stone-800"
                />
              </div>
            </>
          ) : (
            /* ======================================================== */
            /* 收入 (撥補) 專用表單：傻瓜式快速登記入帳 */
            /* ======================================================== */
            <>
              {/* 撥入金額 與 日期 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7">
                  <label className="block font-bold text-stone-800 mb-1">
                    撥入金額 (NT$) <span className="text-emerald-700 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-base">
                      $
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      autoFocus
                      placeholder="例：10000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/20 focus:bg-white focus:border-emerald-600 focus:outline-hidden font-mono font-bold text-lg text-emerald-700"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="block font-bold text-stone-700 mb-1">入帳日期</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium text-xs text-stone-800"
                    />
                  </div>
                </div>
              </div>

              {/* 撥補來源快捷按鈕 */}
              <div>
                <label className="block font-bold text-stone-800 mb-1.5">撥補來源 / 方式</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {defaultIncomeSources.map((source) => {
                    const isSelected = !isCustomIncomeSource && incomeSource === source;
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => {
                          setIsCustomIncomeSource(false);
                          setIncomeSource(source);
                        }}
                        className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600'
                            : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                        }`}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>

                {isCustomIncomeSource ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      autoFocus
                      placeholder="請輸入其他撥補來源或款項名稱"
                      value={customIncomeSource}
                      onChange={(e) => setCustomIncomeSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/30 focus:outline-hidden text-xs font-medium text-stone-800"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomIncomeSource(false)}
                      className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      回到預設來源
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomIncomeSource(true);
                      setCustomIncomeSource('');
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>自訂其他來源名稱</span>
                  </button>
                )}
              </div>

              {/* 入帳經辦人 */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">入帳經辦人</label>
                <input
                  type="text"
                  value={selectedClaimant}
                  onChange={(e) => setSelectedClaimant(e.target.value)}
                  placeholder="經手同仁"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs text-stone-800"
                />
              </div>

              {/* 備註說明 */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">備註說明 (選填)</label>
                <input
                  type="text"
                  placeholder="例：補充零用金現鈔、補足金庫水位"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs text-stone-800"
                />
              </div>
            </>
          )}

          {/* 底部按鈕 - 固定在 Modal 底部 */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              點選右上角關閉或取消按鍵可隨時退出
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl font-bold text-white shadow-xs transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900'
                    : 'bg-stone-900 hover:bg-black active:bg-stone-950'
                }`}
              >
                {type === 'income' ? '✓ 確認撥補入帳' : '✓ 確認登記支出'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
