import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Calendar,
  DollarSign,
  HeartHandshake,
  Gift,
  FileText,
  StickyNote,
  Tag,
  User,
  ShieldCheck,
  Receipt,
  Sparkles,
  Link2,
  AlertCircle,
  Building2
} from 'lucide-react';
import {
  CustomerEventRecord,
  CustomerEventCategory,
  EVENT_CATEGORY_CONFIG,
  TAIWAN_COURTESY_AMOUNTS,
  CompanyProfile,
  CategoryConfig,
  Transaction,
  ReceiptType
} from '../../types';

export interface PettyCashLinkPayload {
  mode: 'auto_create' | 'link_existing' | 'update_linked' | 'none';
  companyId: string;
  categoryId: string;
  categoryName: string;
  claimant: string;
  receiptType: ReceiptType;
  voucherNo?: string;
  shouldUpdateLinkedTx?: boolean;
}

interface CustomerEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CustomerEventRecord, pettyCashAction?: PettyCashLinkPayload) => void;
  editingEvent?: CustomerEventRecord | null;
  customerName: string;
  companies?: CompanyProfile[];
  activeCompanyId?: string;
  categories?: CategoryConfig[];
  claimants?: string[];
  transactions?: Transaction[];
}

export const CustomerEventModal: React.FC<CustomerEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEvent,
  customerName,
  companies = [],
  activeCompanyId = 'comp_1',
  categories = [],
  claimants = [],
  transactions = []
}) => {
  const [category, setCategory] = useState<CustomerEventCategory>('wedding_funeral');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState<string>('');
  const [eventType, setEventType] = useState<string>('結婚紅包');
  const [hasAmount, setHasAmount] = useState<boolean>(true);
  const [amount, setAmount] = useState<number | ''>(3600);
  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [targetPerson, setTargetPerson] = useState<string>('');
  const [ourRepresentative, setOurRepresentative] = useState<string>('廠長');
  const [proofNote, setProofNote] = useState<string>('喜帖已存查');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 零用金出款連動設定
  const [pettyCashMode, setPettyCashMode] = useState<'auto_create' | 'link_existing' | 'none'>('auto_create');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('comp_1');
  const [selectedExpenseCatId, setSelectedExpenseCatId] = useState<string>('courtesy');
  const [selectedClaimant, setSelectedClaimant] = useState<string>('廠長');
  const [selectedReceiptType, setSelectedReceiptType] = useState<ReceiptType>('receipt');
  const [existingVoucherInput, setExistingVoucherInput] = useState<string>('');
  const [shouldUpdateLinkedTx, setShouldUpdateLinkedTx] = useState<boolean>(true);

  // 取得有效支出類別（優先預設「交際禮金 / 公關應酬」，其次雜項開銷）
  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense' && c.id !== 'replenishment');
  }, [categories]);

  const defaultCourtesyCat = useMemo(() => {
    return expenseCategories.find(c => c.id === 'courtesy' || c.name.includes('交際') || c.name.includes('禮金')) ||
           expenseCategories.find(c => c.id === 'misc') ||
           expenseCategories[0];
  }, [expenseCategories]);

  // 最近零用金支出清單供快速關聯
  const recentExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'expense').slice(0, 20);
  }, [transactions]);

  useEffect(() => {
    if (editingEvent) {
      setCategory(editingEvent.category);
      setDate(editingEvent.date || new Date().toISOString().split('T')[0]);
      setTitle(editingEvent.title);
      setEventType(editingEvent.eventType || '');
      setHasAmount(editingEvent.hasAmount);
      setAmount(editingEvent.amount !== undefined ? editingEvent.amount : '');
      setDirection(editingEvent.direction || 'outgoing');
      setTargetPerson(editingEvent.targetPerson || '');
      setOurRepresentative(editingEvent.ourRepresentative || '');
      setProofNote(editingEvent.proofNote || '');
      setNote(editingEvent.note || '');

      // 連動既有狀態
      if (editingEvent.isPettyCashLinked && editingEvent.voucherNo) {
        setPettyCashMode('auto_create');
        setExistingVoucherInput(editingEvent.voucherNo);
        setShouldUpdateLinkedTx(true);
      } else if (editingEvent.isPettyCashLinked === false) {
        setPettyCashMode('none');
        setExistingVoucherInput('');
      } else {
        setPettyCashMode('auto_create');
        setExistingVoucherInput('');
      }

      if (editingEvent.companyId) {
        setSelectedCompanyId(editingEvent.companyId);
      } else {
        setSelectedCompanyId(activeCompanyId === 'all' ? (companies[0]?.id || 'comp_1') : activeCompanyId);
      }
      setSelectedClaimant(editingEvent.ourRepresentative || '廠長');
    } else {
      // Default new record
      setCategory('wedding_funeral');
      setDate(new Date().toISOString().split('T')[0]);
      setTitle('結婚賀禮 (紅包禮金)');
      setEventType('結婚紅包');
      setHasAmount(true);
      setAmount(3600);
      setDirection('outgoing');
      setTargetPerson('');
      setOurRepresentative('廠長');
      setProofNote('喜帖已存查');
      setNote('');

      // 新增時預設自動產生支出傳票
      setPettyCashMode('auto_create');
      setSelectedCompanyId(activeCompanyId === 'all' ? (companies[0]?.id || 'comp_1') : activeCompanyId);
      if (defaultCourtesyCat) {
        setSelectedExpenseCatId(defaultCourtesyCat.id);
      }
      setSelectedClaimant(claimants[0] || '廠長');
      setSelectedReceiptType('receipt');
      setExistingVoucherInput('');
      setShouldUpdateLinkedTx(true);
    }
    setErrorMsg('');
  }, [editingEvent, isOpen, activeCompanyId, companies, defaultCourtesyCat, claimants]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: CustomerEventCategory) => {
    setCategory(newCat);
    const config = EVENT_CATEGORY_CONFIG[newCat];
    setHasAmount(config.defaultHasAmount);
    if (config.quickPresets.length > 0) {
      const firstPreset = config.quickPresets[0];
      setTitle(firstPreset.title);
      setEventType(firstPreset.eventType);
      if (firstPreset.suggestedAmount !== undefined) {
        setAmount(firstPreset.suggestedAmount);
      }
      if (firstPreset.proofPlaceholder) {
        setProofNote(firstPreset.proofPlaceholder);
      }
    }
  };

  const handleApplyPreset = (preset: {
    title: string;
    eventType: string;
    suggestedAmount?: number;
    proofPlaceholder?: string;
  }) => {
    setTitle(preset.title);
    setEventType(preset.eventType);
    if (preset.suggestedAmount !== undefined) {
      setHasAmount(preset.suggestedAmount > 0);
      setAmount(preset.suggestedAmount > 0 ? preset.suggestedAmount : '');
    }
    if (preset.proofPlaceholder) {
      setProofNote(preset.proofPlaceholder);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('請輸入事項名稱或禮金事由');
      return;
    }

    const finalAmount = hasAmount && typeof amount === 'number' && !isNaN(amount) ? amount : undefined;

    let finalIsPettyCashLinked = false;
    let finalVoucherNo: string | undefined = undefined;

    const chosenCat = categories.find(c => c.id === selectedExpenseCatId) || defaultCourtesyCat;
    const catName = chosenCat ? chosenCat.name : '交際禮金 / 公關應酬';

    let pettyCashPayload: PettyCashLinkPayload = {
      mode: 'none',
      companyId: selectedCompanyId,
      categoryId: selectedExpenseCatId,
      categoryName: catName,
      claimant: selectedClaimant.trim() || ourRepresentative.trim() || '廠長',
      receiptType: selectedReceiptType
    };

    if (hasAmount && direction === 'outgoing' && finalAmount && finalAmount > 0) {
      if (pettyCashMode === 'auto_create') {
        if (editingEvent?.voucherNo) {
          // 既有已開立傳票，送出更新通知
          finalIsPettyCashLinked = true;
          finalVoucherNo = editingEvent.voucherNo;
          pettyCashPayload = {
            mode: 'update_linked',
            companyId: selectedCompanyId,
            categoryId: selectedExpenseCatId,
            categoryName: catName,
            claimant: selectedClaimant.trim() || ourRepresentative.trim() || '廠長',
            receiptType: selectedReceiptType,
            voucherNo: editingEvent.voucherNo,
            shouldUpdateLinkedTx
          };
        } else {
          // 全新由零用金出款，觸發系統自動產生傳票
          finalIsPettyCashLinked = true;
          pettyCashPayload = {
            mode: 'auto_create',
            companyId: selectedCompanyId,
            categoryId: selectedExpenseCatId,
            categoryName: catName,
            claimant: selectedClaimant.trim() || ourRepresentative.trim() || '廠長',
            receiptType: selectedReceiptType
          };
        }
      } else if (pettyCashMode === 'link_existing' && existingVoucherInput.trim()) {
        finalIsPettyCashLinked = true;
        finalVoucherNo = existingVoucherInput.trim();
        pettyCashPayload = {
          mode: 'link_existing',
          companyId: selectedCompanyId,
          categoryId: selectedExpenseCatId,
          categoryName: catName,
          claimant: selectedClaimant.trim() || ourRepresentative.trim() || '廠長',
          receiptType: selectedReceiptType,
          voucherNo: existingVoucherInput.trim()
        };
      }
    }

    const record: CustomerEventRecord = {
      id: editingEvent ? editingEvent.id : `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date,
      category,
      categoryLabel: EVENT_CATEGORY_CONFIG[category].shortLabel,
      title: title.trim(),
      eventType: eventType.trim() || undefined,
      hasAmount,
      amount: finalAmount,
      direction: hasAmount ? direction : undefined,
      targetPerson: targetPerson.trim() || undefined,
      ourRepresentative: ourRepresentative.trim() || undefined,
      isPettyCashLinked: finalIsPettyCashLinked,
      voucherNo: finalVoucherNo,
      linkedTransactionId: editingEvent?.linkedTransactionId,
      companyId: selectedCompanyId,
      proofNote: proofNote.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: editingEvent ? editingEvent.createdAt : Date.now()
    };

    onSave(record, pettyCashPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <HeartHandshake className="w-4 h-4" />
              </span>
              <span>{editingEvent ? '編輯重要事項或禮金紀錄' : '新增重要事項或禮金紀錄'}</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              往來對象：<strong className="text-stone-800">{customerName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* 1. 大分類選擇 (Tabs) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              大分類 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['wedding_funeral', 'business_gift', 'important_matter', 'other'] as CustomerEventCategory[]).map(catKey => {
                const conf = EVENT_CATEGORY_CONFIG[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => handleCategoryChange(catKey)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? `${conf.badgeBg} ${conf.badgeText} border-current ring-2 ring-blue-500/20 shadow-2xs font-bold`
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {catKey === 'wedding_funeral' && <HeartHandshake className="w-3.5 h-3.5" />}
                    {catKey === 'business_gift' && <Gift className="w-3.5 h-3.5" />}
                    {catKey === 'important_matter' && <FileText className="w-3.5 h-3.5" />}
                    {catKey === 'other' && <StickyNote className="w-3.5 h-3.5" />}
                    <span>{conf.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 快捷事由標籤 (One-click presets) */}
          <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1 mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>點擊快速帶入常用台灣商務情境：</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_CATEGORY_CONFIG[category].quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-[11px] text-stone-700 transition-colors cursor-pointer"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 發生日期 & 事件細分標籤 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>發生日期</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <span>事件標籤 (如：結婚紅包、公祭白包)</span>
              </label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="例如：結婚紅包、公祭白包、花籃盆栽"
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 3. 事由 / 事件名稱 */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              事由 / 事項名稱 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：陳董令嬡喜宴紅包、工務部黃協理奠儀、續簽年度設備維護合約"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* 4. 金額與收支設定 (Toggle + inputs) */}
          <div className="p-3.5 bg-stone-50/90 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-stone-900">
                <input
                  type="checkbox"
                  checked={hasAmount}
                  onChange={(e) => setHasAmount(e.target.checked)}
                  className="rounded text-[#0066cc] focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>涉及金錢往來 (紅包、白包、禮盒花籃、公關贊助等禮金)</span>
              </label>
              {hasAmount && (
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-stone-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setDirection('outgoing')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      direction === 'outgoing'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    送出 (我方支出)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('incoming')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      direction === 'incoming'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    收受 (對方送禮)
                  </button>
                </div>
              )}
            </div>

            {hasAmount && (
              <div className="space-y-2.5 pt-1 border-t border-stone-200/60">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">
                      NT$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="請輸入金額 (如 3600)"
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 台灣禮金快選金額 (紅包雙數、白包單數) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-stone-500 font-medium">常見喜事紅包：</span>
                    {TAIWAN_COURTESY_AMOUNTS.redLucky.slice(0, 7).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                          amount === val
                            ? 'bg-rose-600 text-white border-rose-600 font-bold'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        ${val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-stone-500 font-medium">常見喪事奠儀：</span>
                    {TAIWAN_COURTESY_AMOUNTS.whiteCondolence.slice(0, 5).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                          amount === val
                            ? 'bg-stone-800 text-white border-stone-800 font-bold'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        ${val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 零用金出款連動智慧模組 (解決自行打傳票、複製傳票號的痛點) */}
                {/* ========================================================= */}
                {direction === 'outgoing' && (
                  <div className="pt-2 border-t border-stone-200">
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/90 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded-md bg-[#0066cc] text-white">
                            <Sparkles className="w-3 h-3" />
                          </span>
                          <span className="text-xs font-bold text-blue-950">
                            公司零用金出款與傳票連動
                          </span>
                        </div>
                        {/* 模式切換按鈕組 */}
                        <div className="inline-flex p-0.5 bg-blue-100/60 rounded-lg text-[11px] gap-1 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setPettyCashMode('auto_create')}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                              pettyCashMode === 'auto_create'
                                ? 'bg-[#0066cc] text-white shadow-2xs'
                                : 'text-blue-900 hover:bg-white/60'
                            }`}
                            title="由系統自動產生傳票並直接寫入零用金總帳，完全免去手動打單"
                          >
                            ⚡ 自動產生支出傳票
                          </button>
                          <button
                            type="button"
                            onClick={() => setPettyCashMode('link_existing')}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                              pettyCashMode === 'link_existing'
                                ? 'bg-[#0066cc] text-white shadow-2xs'
                                : 'text-blue-900 hover:bg-white/60'
                            }`}
                            title="由既有已登記之零用金傳票挑選關聯"
                          >
                            🔗 關聯既有傳票
                          </button>
                          <button
                            type="button"
                            onClick={() => setPettyCashMode('none')}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                              pettyCashMode === 'none'
                                ? 'bg-stone-700 text-white shadow-2xs'
                                : 'text-stone-600 hover:bg-white/60'
                            }`}
                            title="由老闆私人掏腰包或電匯專款支付，不列入零用金流水帳"
                          >
                            ✕ 非零用金出款
                          </button>
                        </div>
                      </div>

                      {/* 模式 1: 系統自動由零用金出款開立傳票 (推薦) */}
                      {pettyCashMode === 'auto_create' && (
                        <div className="space-y-2 pt-1">
                          {editingEvent?.voucherNo ? (
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                <span>已連動零用金傳票：</span>
                                <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                                  {editingEvent.voucherNo}
                                </span>
                              </div>
                              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-emerald-800 font-medium">
                                <input
                                  type="checkbox"
                                  checked={shouldUpdateLinkedTx}
                                  onChange={(e) => setShouldUpdateLinkedTx(e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>同步更新零用金帳本金額與事由</span>
                              </label>
                            </div>
                          ) : (
                            <div className="p-2 bg-white/80 rounded-lg border border-blue-100 text-[11px] text-blue-900 flex items-start gap-1.5 leading-relaxed">
                              <span className="font-bold text-[#0066cc]">💡</span>
                              <div>
                                <strong>免手動打單！</strong>按下儲存後，系統將自動於零用金總帳建立支出並產生正式傳票號碼（如 <span className="font-mono font-bold text-blue-700">P{date.replace(/-/g, '')}-XXXX</span>），自動入帳。
                              </div>
                            </div>
                          )}

                          {/* 出款設定表單項 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                出款公司帳別
                              </label>
                              <select
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                              >
                                {companies.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.taxId ? `(${c.taxId})` : ''}
                                  </option>
                                ))}
                                <option value="shared">🏛️ 田頭共用大水池 (免稅收據費用)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                支出會計科目
                              </label>
                              <select
                                value={selectedExpenseCatId}
                                onChange={(e) => setSelectedExpenseCatId(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium text-stone-800"
                              >
                                {expenseCategories.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.id === 'courtesy' ? '（交際禮金/紅白包推薦）' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                請領經手同仁
                              </label>
                              <input
                                type="text"
                                list="modal-claimants-list"
                                value={selectedClaimant}
                                onChange={(e) => setSelectedClaimant(e.target.value)}
                                placeholder="例：廠長、李業務"
                                className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                              />
                              <datalist id="modal-claimants-list">
                                {claimants.map(name => (
                                  <option key={name} value={name} />
                                ))}
                              </datalist>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                                憑證單據類型
                              </label>
                              <select
                                value={selectedReceiptType}
                                onChange={(e) => setSelectedReceiptType(e.target.value as ReceiptType)}
                                className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="receipt">喜帖 / 訃聞 / 謝卡 / 收據 (普通收據免稅)</option>
                                <option value="invoice">統一發票 (禮盒/花籃，依法不得扣抵)</option>
                                <option value="none">內部借支單 / 無憑證核銷</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 模式 2: 關聯既有已在零用金登記過的傳票 */}
                      {pettyCashMode === 'link_existing' && (
                        <div className="space-y-2 pt-1">
                          <p className="text-[11px] text-stone-600">
                            若您先前已在公司零用金中打過這筆支出，可在此直接點選挑選，無須手動打字複製：
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              value={existingVoucherInput}
                              onChange={(e) => setExistingVoucherInput(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">-- 由最近零用金支出挑選 --</option>
                              {recentExpenses.map(t => (
                                <option key={t.id} value={t.voucherNo || t.id}>
                                  {t.date} | {t.voucherNo || t.id} | NT$ {t.amount.toLocaleString()} | {t.categoryName} - {t.subItem}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={existingVoucherInput}
                              onChange={(e) => setExistingVoucherInput(e.target.value)}
                              placeholder="或手動輸入傳票號碼"
                              className="w-full sm:w-44 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* 模式 3: 非零用金出款 */}
                      {pettyCashMode === 'none' && (
                        <div className="pt-1 text-[11px] text-stone-500">
                          此筆紀錄將僅儲存於大事紀禮金備忘名冊，不扣減公司日常零用金總帳總額。
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. 人員對象與經手人 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>對象 / 收受窗口 (對方人員)</span>
              </label>
              <input
                type="text"
                value={targetPerson}
                onChange={(e) => setTargetPerson(e.target.value)}
                placeholder="例如：陳志明 董事長、工務部黃協理"
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>我方經手人 / 出席代表</span>
              </label>
              <input
                type="text"
                value={ourRepresentative}
                onChange={(e) => {
                  setOurRepresentative(e.target.value);
                  setSelectedClaimant(e.target.value);
                }}
                placeholder="例如：廠長、李業務、林會計"
                className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 6. 憑證附件說明 */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-stone-400" />
              <span>憑證與備忘附件 (選填)</span>
            </label>
            <input
              type="text"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="例如：喜帖已存查、謝卡已收存、合約正本存檔"
              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 7. 備註說明 */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              備註說明 (選填)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="記錄交際細節、席次安排、注意事項等..."
              className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium text-xs transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0066cc] hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{editingEvent ? '更新儲存' : '確認新增'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
