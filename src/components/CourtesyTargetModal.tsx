import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Building2,
  Users,
  Check,
  HeartHandshake,
  User,
  Sparkles,
  ChevronRight,
  Gift,
  FileText,
  BadgeAlert,
  ArrowRight
} from 'lucide-react';
import { Customer, CustomerContactPerson, CompanyProfile } from '../types';

export interface CourtesyTargetSelection {
  customerId: string;
  customerName: string;
  isSupplier: boolean;
  targetPerson?: string; // 對方收禮人員
  eventTitle: string; // 事由標題 (如：陳董令嬡喜宴賀禮)
  eventType: string; // 細分事由標籤 (如：結婚紅包、公祭奠儀、年節禮盒)
  eventCategory: 'wedding_funeral' | 'business_gift' | 'other';
  suggestedAmount?: number;
  proofNote?: string; // 憑證形式 (喜帖、訃聞、送禮簽收謝卡、免用發票收據、統一發票)
  ourRepresentative?: string; // 我方致贈/出席代表
  note?: string; // 補充備註
}

interface CourtesyTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selection: CourtesyTargetSelection) => void;
  customers: Customer[];
  defaultClaimant?: string;
  currentAmount?: number;
}

// 常見禮金事由預設選項
const PRESET_EVENT_TYPES = [
  { label: '喜慶賀禮 (紅包禮金)', category: 'wedding_funeral' as const, type: '結婚紅包', proof: '已留喜帖存查', suggested: 3600 },
  { label: '喪事公祭 (白包奠儀)', category: 'wedding_funeral' as const, type: '公祭奠儀', proof: '謝卡已收存', suggested: 2100 },
  { label: '喬遷誌慶 / 新廠落成花籃', category: 'wedding_funeral' as const, type: '花籃盆栽', proof: '花店簽單', suggested: 3000 },
  { label: '中秋年節公關禮盒', category: 'business_gift' as const, type: '中秋禮盒', proof: '採買發票', suggested: 2400 },
  { label: '春節伴手年禮致意', category: 'business_gift' as const, type: '春節年禮', proof: '採買發票', suggested: 2600 },
  { label: '端午佳節香粽禮盒', category: 'business_gift' as const, type: '端午禮盒', proof: '採買發票', suggested: 2000 },
  { label: '廠商尾牙摸彩贊助款', category: 'business_gift' as const, type: '尾牙贊助', proof: '贊助收據/感謝狀', suggested: 6000 },
  { label: '業務拜訪公關伴手禮', category: 'business_gift' as const, type: '公關伴手禮', proof: '發票/收據', suggested: 1200 },
  { label: '同業公會/協進會活動贊助', category: 'business_gift' as const, type: '活動贊助', proof: '公會收據', suggested: 5000 },
  { label: '其他交際應酬款項', category: 'other' as const, type: '交際款項', proof: '收據/發票', suggested: 0 }
];

export const CourtesyTargetModal: React.FC<CourtesyTargetModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  customers,
  defaultClaimant = '廠長',
  currentAmount
}) => {
  // 頁籤：合作廠商 ｜ 往來客戶
  const [activeTab, setActiveTab] = useState<'supplier' | 'customer'>('supplier');
  // 搜尋關鍵字 (支援名稱、統編、簡稱、負責人、電話)
  const [searchQuery, setSearchQuery] = useState('');
  
  // 目前選中的對象
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // 禮金補充欄位
  const [selectedEventType, setSelectedEventType] = useState(PRESET_EVENT_TYPES[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [targetPerson, setTargetPerson] = useState('');
  const [ourRepresentative, setOurRepresentative] = useState(defaultClaimant);
  const [proofNote, setProofNote] = useState(PRESET_EVENT_TYPES[0].proof);
  const [note, setNote] = useState('');

  // 當開啟時初始化
  React.useEffect(() => {
    if (isOpen) {
      setOurRepresentative(defaultClaimant);
      if (!selectedCustomer && customers.length > 0) {
        // 預設篩選有廠商屬性或客戶
        const first = customers.find(c => activeTab === 'supplier' ? c.isSupplier : c.isCustomer) || customers[0];
        if (first) {
          setSelectedCustomer(first);
          setTargetPerson(first.representative || '');
        }
      }
    }
  }, [isOpen, defaultClaimant]);

  // 當切換對象時，更新收禮對象預設值
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    if (!targetPerson || targetPerson === selectedCustomer?.representative) {
      setTargetPerson(c.representative || (c.contacts?.[0]?.name) || '');
    }
  };

  // 當切換預設事由時連動更新
  const handleSelectPreset = (preset: typeof PRESET_EVENT_TYPES[0]) => {
    setSelectedEventType(preset);
    setProofNote(preset.proof);
    if (!customTitle || PRESET_EVENT_TYPES.some(p => customTitle.includes(p.type))) {
      setCustomTitle(`${preset.type}致贈`);
    }
  };

  // 篩選清單
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. 頁籤過濾
      if (activeTab === 'supplier' && !c.isSupplier) return false;
      if (activeTab === 'customer' && !c.isCustomer) return false;

      // 2. 關鍵字搜尋
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchShort = c.shortName?.toLowerCase().includes(q);
        const matchTaxId = c.taxId?.toLowerCase().includes(q);
        const matchRep = c.representative?.toLowerCase().includes(q);
        const matchPhone = (c.phone1 || c.representativeMobile)?.includes(q);
        const matchContact = c.contacts?.some(ct => ct.name.toLowerCase().includes(q));
        return matchName || matchShort || matchTaxId || matchRep || matchPhone || matchContact;
      }
      return true;
    });
  }, [customers, activeTab, searchQuery]);

  if (!isOpen) return null;

  // 確認送出關聯
  const handleConfirm = () => {
    if (!selectedCustomer) return;

    const finalTitle = customTitle.trim() || `${selectedCustomer.shortName || selectedCustomer.name} - ${selectedEventType.type}`;

    onSelect({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.shortName || selectedCustomer.name,
      isSupplier: selectedCustomer.isSupplier,
      targetPerson: targetPerson.trim() || undefined,
      eventTitle: finalTitle,
      eventType: selectedEventType.type,
      eventCategory: selectedEventType.category,
      suggestedAmount: selectedEventType.suggested,
      proofNote: proofNote.trim() || undefined,
      ourRepresentative: ourRepresentative.trim() || defaultClaimant,
      note: note.trim() || undefined
    });

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部 Header */}
        <div className="shrink-0 px-5 py-3.5 bg-rose-700 text-white flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>選擇交際禮金往來對象</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/50 text-rose-100 font-normal">
                  公款零用金 ➔ 自動連動對象大事紀
                </span>
              </h3>
              <p className="text-[11px] text-rose-100">
                關聯後系統將自動將此支出傳票號碼與禮金事項登錄於廠商/客戶大事紀
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 active:bg-white/30 text-white transition-all cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs grow">
          {/* 1. 頁籤切換：合作廠商 ｜ 往來客戶 */}
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl grow">
              <button
                type="button"
                onClick={() => setActiveTab('supplier')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'supplier'
                    ? 'bg-white text-rose-800 shadow-xs ring-1 ring-rose-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Building2 className="w-4 h-4 text-rose-600" />
                <span>🏢 合作廠商名冊 ({customers.filter(c => c.isSupplier).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'customer'
                    ? 'bg-white text-indigo-800 shadow-xs ring-1 ring-indigo-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>🤝 往來客戶名冊 ({customers.filter(c => c.isCustomer).length})</span>
              </button>
            </div>
          </div>

          {/* 2. 搜尋列 */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`搜尋${activeTab === 'supplier' ? '廠商' : '客戶'}名稱、統一編號、簡稱、負責人或電話...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-rose-600 focus:outline-hidden text-xs"
            />
          </div>

          {/* 3. 對象清單 (水平滾動或精巧卡片清單) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-stone-800">
                點選往來對象 <span className="text-rose-600 font-bold">*必選</span>
              </label>
              <span className="text-[11px] text-stone-400">
                共 {filteredCustomers.length} 筆符合
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-stone-200 rounded-xl bg-stone-50/50">
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full py-6 text-center text-stone-400">
                  查無符合條件的往來對象，請更換關鍵字
                </div>
              ) : (
                filteredCustomers.map(c => {
                  const isSelected = selectedCustomer?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-rose-600 bg-rose-50/80 text-rose-950 shadow-xs ring-2 ring-rose-500/20'
                          : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold truncate">
                          <span className="truncate">{c.name}</span>
                          {c.shortName && c.shortName !== c.name && (
                            <span className="text-[10px] text-stone-400 shrink-0 font-normal">({c.shortName})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-500 flex items-center gap-2">
                          {c.taxId && <span>統編: {c.taxId}</span>}
                          {c.representative && <span>代表: {c.representative}</span>}
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-stone-300 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. 禮金與事由補充設定 */}
          {selectedCustomer && (
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
                    已選對象
                  </span>
                  <span className="font-bold text-stone-900 text-sm">
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.taxId && (
                    <span className="text-[10px] text-stone-500 font-mono">
                      (統編: {selectedCustomer.taxId})
                    </span>
                  )}
                </div>
              </div>

              {/* 常用事由快捷標籤 */}
              <div>
                <label className="block font-bold text-stone-800 mb-1.5">
                  常用事由與禮金性質 <span className="text-stone-400 font-normal">(點選自動帶入)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EVENT_TYPES.map(preset => {
                    const isSelected = selectedEventType.type === preset.type;
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-600 bg-rose-600 text-white shadow-2xs'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {preset.type}
                        {preset.suggested > 0 && (
                          <span className={`ml-1 text-[10px] opacity-80 ${isSelected ? 'text-rose-100' : 'text-stone-400'}`}>
                            (${preset.suggested})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 事由標題與收禮人員 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    大事紀事由名稱 <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    placeholder={`例：${selectedCustomer.shortName || selectedCustomer.name} - ${selectedEventType.type}`}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium focus:border-rose-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-stone-800">
                      對方收禮人員 / 代表
                    </label>
                    {/* 若有聯絡人，快速帶入 */}
                    {selectedCustomer.contacts && selectedCustomer.contacts.length > 0 && (
                      <span className="text-[10px] text-stone-500">
                        點選帶入：
                        {selectedCustomer.contacts.map(ct => (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => setTargetPerson(ct.name)}
                            className="ml-1 text-rose-600 hover:underline cursor-pointer"
                          >
                            {ct.name}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={targetPerson}
                    placeholder="例：陳董事長、林總監、李主任"
                    onChange={(e) => setTargetPerson(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium focus:border-rose-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 我方代表與憑證形式 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    我方出席 / 致贈代表 (預設請領同仁)
                  </label>
                  <input
                    type="text"
                    value={ourRepresentative}
                    placeholder="例：廠長、李業務、陳總經理"
                    onChange={(e) => setOurRepresentative(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium focus:border-rose-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    憑證附件與備忘
                  </label>
                  <input
                    type="text"
                    value={proofNote}
                    placeholder="例：已留喜帖存查、已收公祭謝卡、免用發票收據"
                    onChange={(e) => setProofNote(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium focus:border-rose-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 補充備註 */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  補充備註說明 (選填)
                </label>
                <input
                  type="text"
                  value={note}
                  placeholder="補充細節，如：賀詞內容、包款事由備註..."
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium focus:border-rose-600 focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部功能鍵 */}
        <div className="shrink-0 p-3 sm:px-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition-all cursor-pointer text-xs"
          >
            取消
          </button>

          <button
            type="button"
            disabled={!selectedCustomer}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer shadow-md ${
              selectedCustomer
                ? 'bg-rose-700 hover:bg-rose-800 active:scale-95'
                : 'bg-stone-300 cursor-not-allowed text-stone-500'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>確認關聯並帶入零用金</span>
          </button>
        </div>
      </div>
    </div>
  );
};
