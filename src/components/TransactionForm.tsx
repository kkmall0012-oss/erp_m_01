import React, { useState, useEffect, useMemo } from 'react';
import { 
  Utensils, 
  Fuel, 
  HandCoins, 
  PackageCheck, 
  Plus, 
  Users, 
  Check, 
  Sparkles, 
  Calendar, 
  AlertCircle, 
  Coins, 
  Settings, 
  UserCheck, 
  Building2, 
  FolderPlus,
  Receipt
} from 'lucide-react';
import { CategoryConfig, Transaction, TransactionType, ReceiptType } from '../types';
import { getTodayDateStr } from '../utils/storage';
import { SearchableOptionPicker } from './SearchableOptionPicker';

interface TransactionFormProps {
  categories: CategoryConfig[];
  claimants: string[];
  transactions?: Transaction[];
  currentYearMonth?: string;
  onAddTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onQuickAddSubItem?: (categoryId: string, newItem: string) => void;
  onQuickAddClaimant?: (newClaimant: string) => void;
  onOpenSettings?: (tab?: 'categories' | 'claimants') => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  categories,
  claimants,
  transactions = [],
  currentYearMonth,
  onAddTransaction,
  onQuickAddSubItem,
  onQuickAddClaimant,
  onOpenSettings
}) => {
  // 1. 基本狀態
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState<string>(getTodayDateStr());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('dining');
  
  // 2. 階層式第二層選單狀態 (店家/站點/來源)
  const [selectedSubItem, setSelectedSubItem] = useState<string>('');
  const [customSubItemInput, setCustomSubItemInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [saveToMenu, setSaveToMenu] = useState<boolean>(true); // 是否同步存入下拉選單
  
  // 3. 請領人狀態 (支出時紀錄是誰領的)
  const [selectedClaimant, setSelectedClaimant] = useState<string>('自己 / 零用金管理員');
  const [customClaimantInput, setCustomClaimantInput] = useState<string>('');
  const [isCustomClaimantMode, setIsCustomClaimantMode] = useState<boolean>(false);
  const [saveClaimantToMenu, setSaveClaimantToMenu] = useState<boolean>(true);

  // 計算各分類下項目在「查詢月份」（依使用者指示：必須嚴格依據當前所選查詢月份，例如 2026-07，而非現在電腦系統時間月份）
  const queryMonth = currentYearMonth || date.slice(0, 7);
  const queryMonthLabel = queryMonth ? `${queryMonth.replace('-', '/')} ` : '';

  const subItemUsageMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      // 僅計算查詢月份紀錄
      if (t.date && t.date.startsWith(queryMonth)) {
        if (t.subItem && (!t.categoryId || t.categoryId === selectedCategoryId)) {
          map[t.subItem] = (map[t.subItem] || 0) + 1;
        }
      }
    });
    return map;
  }, [transactions, selectedCategoryId, queryMonth]);

  // 計算請領人在「查詢月份」的實際請領頻率
  const claimantUsageMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      // 僅計算查詢月份紀錄
      if (t.date && t.date.startsWith(queryMonth)) {
        if (t.claimant) {
          map[t.claimant] = (map[t.claimant] || 0) + 1;
        }
      }
    });
    return map;
  }, [transactions, queryMonth]);

  // 4. 餐飲人數
  const [peopleCount, setPeopleCount] = useState<number>(1);
  
  // 5. 支出憑證 (收據、發票、無) 與發票號碼
  const [receiptType, setReceiptType] = useState<ReceiptType>('receipt');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // 6. 金額
  const [amount, setAmount] = useState<string>('');
  
  // 7. 備註
  const [note, setNote] = useState<string>('');

  // 8. 送出狀態
  const [justSubmitted, setJustSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 取得當前選中的主分類物件
  const currentCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];
  const isDining = type === 'expense' && (currentCategory?.id === 'dining' || currentCategory?.hasPeopleCount);

  // 切換收支類型時自動選取合適的分類
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const availableCategories = categories.filter((c) => c.type === newType);
    if (availableCategories.length > 0) {
      const firstCat = availableCategories[0];
      setSelectedCategoryId(firstCat.id);
      if (firstCat.defaultSubItems && firstCat.defaultSubItems.length > 0) {
        setSelectedSubItem(firstCat.defaultSubItems[0]);
      } else {
        setSelectedSubItem('');
      }
    }
    setIsCustomMode(false);
    setCustomSubItemInput('');
    setErrorMessage('');
  };

  // 當主分類改變時，自動載入第一個子項目
  useEffect(() => {
    if (currentCategory) {
      if (currentCategory.defaultSubItems && currentCategory.defaultSubItems.length > 0) {
        setSelectedSubItem(currentCategory.defaultSubItems[0]);
      } else {
        setSelectedSubItem('');
      }
      setIsCustomMode(false);
      setCustomSubItemInput('');
    }
  }, [selectedCategoryId, categories]);

  // 快捷金額增減
  const handleAddQuickAmount = (val: number) => {
    const current = parseInt(amount, 10) || 0;
    setAmount(String(current + val));
  };

  // 快捷日期設定
  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
  };

  // 送出表單
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage('請輸入有效金額 (須大於 0)');
      return;
    }

    const finalSubItem = isCustomMode ? customSubItemInput.trim() : selectedSubItem;
    if (!finalSubItem) {
      setErrorMessage(
        type === 'income'
          ? '請選擇或輸入「撥補來源」'
          : `請選擇或輸入「${currentCategory?.subLabel || '項目'}」`
      );
      return;
    }

    // 計算請領人
    let finalClaimant: string | undefined = undefined;
    if (type === 'expense') {
      finalClaimant = isCustomClaimantMode ? customClaimantInput.trim() : selectedClaimant;
      if (!finalClaimant) {
        setErrorMessage('請選擇或輸入零用金「請領同仁姓名」');
        return;
      }
      // 若手動輸入新請領人且勾選加入名冊
      if (isCustomClaimantMode && customClaimantInput.trim() && saveClaimantToMenu && onQuickAddClaimant) {
        onQuickAddClaimant(customClaimantInput.trim());
      }

      // 單據發票強制填寫驗證 (選擇發票時，發票號碼為強制輸入選項)
      if (receiptType === 'invoice' && !invoiceNumber.trim()) {
        setErrorMessage('選擇「發票」時，發票號碼為強制輸入選項，請填寫發票號碼');
        return;
      }
    }

    // 若手動輸入新子項目且勾選存入選單
    if (isCustomMode && customSubItemInput.trim() && saveToMenu && onQuickAddSubItem) {
      onQuickAddSubItem(selectedCategoryId, customSubItemInput.trim());
    }

    onAddTransaction({
      date,
      type,
      categoryId: selectedCategoryId,
      categoryName: currentCategory?.name || (type === 'income' ? '零用金撥補' : '其他'),
      subItem: finalSubItem,
      claimant: finalClaimant,
      peopleCount: isDining ? Math.max(1, peopleCount) : undefined,
      receiptType: type === 'expense' ? receiptType : undefined,
      invoiceNumber: type === 'expense' && receiptType === 'invoice' ? (invoiceNumber.trim() ? invoiceNumber.trim().toUpperCase() : undefined) : undefined,
      amount: numAmount,
      note: note.trim()
    });

    // 成功提示與重設
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 2000);

    setAmount('');
    setNote('');
    setIsCustomMode(false);
    setCustomSubItemInput('');
    setIsCustomClaimantMode(false);
    setCustomClaimantInput('');
    setPeopleCount(1);
    setInvoiceNumber('');
  };

  // 圖示渲染
  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'dining':
        return <Utensils className="w-4 h-4" />;
      case 'fuel':
        return <Fuel className="w-4 h-4" />;
      case 'advance':
        return <HandCoins className="w-4 h-4" />;
      case 'misc':
        return <PackageCheck className="w-4 h-4" />;
      case 'replenishment':
        return <Coins className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  // 計算平均每人金額
  const calculatedAmount = parseInt(amount, 10) || 0;
  const perPersonAmount = isDining && peopleCount > 1 && calculatedAmount > 0 
    ? Math.round(calculatedAmount / peopleCount) 
    : calculatedAmount;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* 頂部 Header 與 類型切換 */}
      <div className="px-5 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
        <div>
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>零用金收支登記</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {type === 'expense'
              ? '支出登記：選擇請領人、主分類、細項店家與金額'
              : '撥補登記：記錄銀行提領、主管撥款或同仁款項繳回'}
          </p>
        </div>

        {/* 類型切換選單 */}
        <div className="inline-flex p-1 bg-stone-200/70 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              type === 'expense'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            零用金支出
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              type === 'income'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            零用金撥補 (收入)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* 錯誤提示 */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. 日期選單 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>交易日期 (必填)</span>
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleQuickDate(0)}
                className={`text-[11px] px-2 py-0.5 rounded-md border ${
                  date === getTodayDateStr()
                    ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(1)}
                className="text-[11px] px-2 py-0.5 rounded-md border bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
              >
                昨天
              </button>
            </div>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
          />
        </div>

        {/* ========================================================= */}
        {/* 若為「零用金支出」：顯示 請領人、主分類、第二層店家/項目細項 */}
        {/* ========================================================= */}
        {type === 'expense' && (
          <>
            {/* 請領人 (經辦同仁) 選單 */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>零用金請領人 (經辦同仁 · 必選)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomClaimantMode(!isCustomClaimantMode)}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-medium underline"
                  >
                    {isCustomClaimantMode ? '返回名冊快選' : '+ 手動填寫新同仁'}
                  </button>
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => onOpenSettings('claimants')}
                      className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-0.5 ml-1"
                      title="開啟請領人名冊管理"
                    >
                      <Settings className="w-3 h-3" />
                      <span>管理名冊</span>
                    </button>
                  )}
                </div>
              </div>

              {!isCustomClaimantMode ? (
                <SearchableOptionPicker
                  options={claimants}
                  value={selectedClaimant}
                  onChange={(val) => setSelectedClaimant(val)}
                  label="請領同仁"
                  itemTypeLabel="同仁"
                  placeholder="快速搜尋請領同仁姓名..."
                  usageCounts={claimantUsageMap}
                  monthLabel={queryMonthLabel}
                  colorTheme="amber"
                  icon="user"
                />
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="輸入請領同仁姓名或職稱 (例如：張副理、陳工務)"
                    value={customClaimantInput}
                    onChange={(e) => setCustomClaimantInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 select-none">
                    <input
                      type="checkbox"
                      checked={saveClaimantToMenu}
                      onChange={(e) => setSaveClaimantToMenu(e.target.checked)}
                      className="rounded-sm border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>同時將此同仁加入常用請領人名冊</span>
                  </label>
                </div>
              )}
            </div>

            {/* 1. 選擇支出主分類 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-700">
                  1. 選擇支出主分類 (必選)
                </label>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => onOpenSettings('categories')}
                    className="text-xs text-amber-700 hover:text-amber-800 font-medium underline flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>管理/新增主分類</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {categories
                  .filter((c) => c.type === 'expense' && c.id !== 'replenishment' && !c.name.includes('撥補'))
                  .map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-stone-900 ring-1 ring-amber-500 font-semibold'
                            : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-700'
                        }`}
                      >
                        <span 
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ 
                            backgroundColor: isSelected ? cat.color : '#f1f5f9',
                            color: isSelected ? '#ffffff' : cat.color
                          }}
                        >
                          {getCategoryIcon(cat.id)}
                        </span>
                        <span className="text-xs truncate">{cat.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* 2. 第二層：細項選單 (店家/站點/預支同仁/雜支項目) */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span>2. {currentCategory?.subLabel || '細項選單'} (必填/必選)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-medium underline"
                  >
                    {isCustomMode ? '返回選單挑選' : '+ 自訂/手動輸入'}
                  </button>
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => onOpenSettings('categories')}
                      className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-0.5 ml-1"
                      title="編輯此分類的下拉選項"
                    >
                      <Settings className="w-3 h-3" />
                      <span>編輯選單項目</span>
                    </button>
                  )}
                </div>
              </div>

              {!isCustomMode ? (
                <SearchableOptionPicker
                  options={currentCategory?.defaultSubItems || []}
                  value={selectedSubItem}
                  onChange={(val) => setSelectedSubItem(val)}
                  label={currentCategory?.subLabel || '項目'}
                  itemTypeLabel={currentCategory?.subLabel || '項目'}
                  placeholder={`搜尋${currentCategory?.subLabel || '店家/項目'}...`}
                  usageCounts={subItemUsageMap}
                  monthLabel={queryMonthLabel}
                  colorTheme="amber"
                  icon={isDining ? 'utensils' : selectedCategoryId === 'fuel' ? 'fuel' : 'sparkles'}
                  emptyMessage="尚未設定選項，可點擊上方「+自訂/手動輸入」新增"
                />
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={`輸入${currentCategory?.subLabel || '項目'} (例如：新店家、新站點、新項目)`}
                    value={customSubItemInput}
                    onChange={(e) => setCustomSubItemInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 select-none">
                    <input
                      type="checkbox"
                      checked={saveToMenu}
                      onChange={(e) => setSaveToMenu(e.target.checked)}
                      className="rounded-sm border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>同時加入「{currentCategory?.subLabel}」常用下拉選單</span>
                  </label>
                  {!saveToMenu && (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                      ✓ 僅作本次靜態快照存檔，不會留在未來選單中，維持選單乾淨。
                    </p>
                  )}
                </div>
              )}

              {/* 若為餐飲類別，階層中必須出現「人數」打選單或輸入 */}
              {isDining && (
                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-orange-500" />
                      <span>3. 用餐人數選單</span>
                    </label>
                    <span className="text-[11px] text-stone-400">自動計算每人均攤費用</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 active:scale-95 flex items-center justify-center text-xs"
                    >
                      -
                    </button>
                    <select
                      value={peopleCount}
                      onChange={(e) => setPeopleCount(parseInt(e.target.value, 10) || 1)}
                      className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-hidden cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} 人
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setPeopleCount(peopleCount + 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 active:scale-95 flex items-center justify-center text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 憑證與發票選項 (依需求：方便填入收據、發票、無，有發票可填發票號碼) */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>3. 單據憑證類型 (收據 / 發票 / 無)</span>
                </label>
                <span className="text-[11px] text-stone-400">
                  {receiptType === 'invoice' ? '統一發票' : receiptType === 'receipt' ? '收據' : '無單據'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReceiptType('receipt')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    receiptType === 'receipt'
                      ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>📄 收據</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptType('invoice')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
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
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    receiptType === 'none'
                      ? 'bg-white text-stone-700 shadow-2xs font-extrabold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span>❌ 無憑證</span>
                </button>
              </div>

              {receiptType === 'invoice' && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                      <span>發票號碼</span>
                      <span className="text-rose-600 font-bold">*必填（未輸入無法建檔）</span>
                    </label>
                    <span className="text-[10px] text-stone-400">例如：AB-12345678</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                    placeholder="輸入發票號碼 (例：AB-12345678)"
                    maxLength={14}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase text-stone-800 placeholder:text-stone-300 placeholder:font-normal"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* 若為「零用金撥補」：只顯示 撥補來源、金額、備註 (不出現用餐/人數) */}
        {/* ========================================================= */}
        {type === 'income' && (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-700" />
                <span>零用金撥補來源 (必選/必填)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomMode(!isCustomMode)}
                className="text-[11px] text-emerald-800 hover:underline font-medium"
              >
                {isCustomMode ? '返回常用來源選單' : '+ 手動輸入其他來源'}
              </button>
            </div>

            {!isCustomMode ? (
              <SearchableOptionPicker
                options={
                  currentCategory?.defaultSubItems?.length
                    ? currentCategory.defaultSubItems
                    : [
                        '銀行提領補充',
                        '主管交付撥款',
                        '會計請款核銷歸墊',
                        '同仁預支款繳回'
                      ]
                }
                value={selectedSubItem}
                onChange={(val) => setSelectedSubItem(val)}
                label="撥補來源"
                itemTypeLabel="來源"
                placeholder="搜尋撥補來源..."
                usageCounts={subItemUsageMap}
                monthLabel={queryMonthLabel}
                colorTheme="emerald"
                icon="coins"
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="輸入撥補來源 (例如：股東臨時注資、廢料變賣繳回)"
                  value={customSubItemInput}
                  onChange={(e) => setCustomSubItemInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
                <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-800 select-none">
                  <input
                    type="checkbox"
                    checked={saveToMenu}
                    onChange={(e) => setSaveToMenu(e.target.checked)}
                    className="rounded-sm border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>同時加入撥補來源常用下拉選單</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* 3. 金額輸入與快捷面額選單 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-stone-700">
              {type === 'expense' ? '支出金額 (NT$ 新台幣 · 必填)' : '撥補金額 (NT$ 新台幣 · 必填)'}
            </label>
            {isDining && peopleCount > 1 && calculatedAmount > 0 && (
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                每人平均: NT$ {perPersonAmount.toLocaleString()}
              </span>
            )}
          </div>

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
              className="w-full pl-12 pr-4 py-2.5 text-lg font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* 快捷金額增額標籤選單 */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
            <span className="text-[11px] text-stone-400 shrink-0">快選:</span>
            {[
              { label: '50', val: 50 },
              { label: '100', val: 100 },
              { label: '200', val: 200 },
              { label: '500', val: 500 },
              { label: '1,000', val: 1000 },
              { label: '2,000', val: 2000 },
              { label: '5,000', val: 5000 }
            ].map((btn) => (
              <button
                key={btn.val}
                type="button"
                onClick={() => handleAddQuickAmount(btn.val)}
                className="text-[11px] px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors shrink-0"
              >
                +{btn.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount('')}
              className="text-[11px] px-2 py-1 rounded-md bg-stone-50 hover:bg-stone-200 text-stone-500 transition-colors shrink-0 ml-auto"
            >
              清除
            </button>
          </div>
        </div>

        {/* 4. 備註說明 */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            備註說明 (選填)
          </label>
          <input
            type="text"
            placeholder={
              type === 'income'
                ? '例如：提領收據號碼、核銷單號、或撥款備註...'
                : selectedCategoryId === 'fuel'
                ? '例如：95無鉛 42公升、公務貨車'
                : selectedCategoryId === 'advance'
                ? '例如：採購五金、代墊耗材、專案差旅'
                : '備註細節、發票號碼...'
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* 5. 送出操作按鈕 */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            className={`w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide text-white transition-all shadow-sm active:scale-98 cursor-pointer ${
              justSubmitted
                ? 'bg-emerald-600'
                : type === 'expense'
                ? 'bg-stone-900 hover:bg-stone-800'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {justSubmitted ? (
              <>
                <Check className="w-4 h-4" />
                <span>記錄成功！已完成靜態快照存檔</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>
                  {type === 'expense'
                    ? `確認登記支出 (NT$ ${calculatedAmount.toLocaleString()})`
                    : `確認登記撥補 (NT$ ${calculatedAmount.toLocaleString()})`}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
