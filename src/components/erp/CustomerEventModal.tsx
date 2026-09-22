import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import {
  CustomerEventRecord,
  CustomerEventCategory,
  EVENT_CATEGORY_CONFIG,
  TAIWAN_COURTESY_AMOUNTS
} from '../../types';

interface CustomerEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CustomerEventRecord) => void;
  editingEvent?: CustomerEventRecord | null;
  customerName: string;
}

export const CustomerEventModal: React.FC<CustomerEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEvent,
  customerName
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
  const [isPettyCashLinked, setIsPettyCashLinked] = useState<boolean>(true);
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [proofNote, setProofNote] = useState<string>('喜帖已存查');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

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
      setIsPettyCashLinked(Boolean(editingEvent.isPettyCashLinked));
      setVoucherNo(editingEvent.voucherNo || '');
      setProofNote(editingEvent.proofNote || '');
      setNote(editingEvent.note || '');
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
      setIsPettyCashLinked(true);
      setVoucherNo('');
      setProofNote('喜帖已存查');
      setNote('');
    }
    setErrorMsg('');
  }, [editingEvent, isOpen]);

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
      isPettyCashLinked: hasAmount ? isPettyCashLinked : false,
      voucherNo: hasAmount && isPettyCashLinked ? voucherNo.trim() || undefined : undefined,
      proofNote: proofNote.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: editingEvent ? editingEvent.createdAt : Date.now()
    };

    onSave(record);
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
              對象公司：<strong className="text-stone-800">{customerName}</strong>
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
              <div className="space-y-2 pt-1 border-t border-stone-200/60">
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

                {/* 零用金出款核銷連動 */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-stone-200/50">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-stone-700">
                    <input
                      type="checkbox"
                      checked={isPettyCashLinked}
                      onChange={(e) => setIsPettyCashLinked(e.target.checked)}
                      className="rounded text-[#0066cc] focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>已由公司零用金出款列支</span>
                  </label>
                  {isPettyCashLinked && (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-stone-500 whitespace-nowrap">零用金傳票號：</span>
                      <input
                        type="text"
                        value={voucherNo}
                        onChange={(e) => setVoucherNo(e.target.value)}
                        placeholder="如 P2026090714-0001"
                        className="w-36 px-2 py-1 bg-white border border-stone-200 rounded text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
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
                onChange={(e) => setOurRepresentative(e.target.value)}
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0066cc] hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
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
