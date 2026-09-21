import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  HelpCircle,
  FileText,
  Phone,
  Landmark,
  ChevronRight,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  Layers,
  ArrowRight,
  BookmarkCheck
} from 'lucide-react';
import { CompanyProfile, DEFAULT_COMPANIES } from '../../types';
import { saveCompaniesApi, saveCompanyProfileApi, deleteCompanyApi } from '../../services/api';
import { ConfirmDialog } from '../ConfirmDialog';

interface CompanySettingsViewProps {
  companies?: CompanyProfile[];
  activeCompanyId?: string;
  onUpdateCompanies: (updated: CompanyProfile[]) => void;
}

const COMPANY_COLORS = [
  { label: '海軍藍 (經典)', value: '#0066cc' },
  { label: '翡翠綠 (專業)', value: '#059669' },
  { label: '琥珀橙 (熱力)', value: '#d97706' },
  { label: '深紫羅蘭 (穩重)', value: '#7c3aed' },
  { label: '玫瑰洋紅 (活力)', value: '#e11d48' },
  { label: '石墨深青 (現代)', value: '#0891b2' },
];

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  companies = DEFAULT_COMPANIES,
  activeCompanyId = 'comp_1',
  onUpdateCompanies
}) => {
  // 目前正在維護檢視的公司 ID
  const [editingCompanyId, setEditingCompanyId] = useState<string>(activeCompanyId === 'all' ? (companies[0]?.id || 'comp_1') : activeCompanyId);
  
  // 本地公司清單副本
  const [companyList, setCompanyList] = useState<CompanyProfile[]>(companies.length > 0 ? companies : DEFAULT_COMPANIES);

  // 當前編輯中的公司物件
  const currentCompany = companyList.find(c => c.id === editingCompanyId) || companyList[0] || DEFAULT_COMPANIES[0];

  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'contact' | 'finance' | 'preview'>('basic');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // 刪除公司彈窗狀態 (避免 iframe 阻擋原生 window.confirm)
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 當外部 companies 更新時同步本地清單
  useEffect(() => {
    if (companies && companies.length > 0) {
      setCompanyList(companies);
      // 如果目前正在編輯的 ID 不在新的清單中，自動指向第一個
      if (!companies.some(c => c.id === editingCompanyId)) {
        setEditingCompanyId(companies[0].id);
      }
    }
  }, [companies]);

  // 修改目前編輯之公司的欄位
  const handleChange = (field: keyof CompanyProfile, value: any) => {
    setCompanyList(prev => prev.map(c => {
      if (c.id === editingCompanyId) {
        return {
          ...c,
          [field]: value
        };
      }
      return c;
    }));
    setSaveSuccess(false);
  };

  // 設為主要預設行號
  const handleSetDefault = (id: string) => {
    setCompanyList(prev => prev.map(c => ({
      ...c,
      isDefault: c.id === id
    })));
  };

  // 新增關係企業行號
  const handleAddCompany = () => {
    const nextIdx = companyList.length + 1;
    const newId = `comp_${Date.now()}`;
    const newCompany: CompanyProfile = {
      id: newId,
      name: `新關係企業行號 ${nextIdx}`,
      shortName: `行號 ${nextIdx}`,
      taxId: '',
      representative: currentCompany?.representative || '',
      phone: currentCompany?.phone || '',
      fax: '',
      email: '',
      website: '',
      postalCode: '',
      address: '',
      bankName: '',
      bankBranch: '',
      bankCode: '',
      bankAccount: '',
      accountName: '',
      chiefAccountant: currentCompany?.chiefAccountant || '',
      cashier: currentCompany?.cashier || '',
      reportHeader: `新關係企業行號 ${nextIdx} 財務零用金月報表`,
      invoiceBuyerName: '',
      taxInvoiceNote: '本單據符合所得稅法各項規定憑證，經辦與權責長官已核訖。',
      color: COMPANY_COLORS[(nextIdx - 1) % COMPANY_COLORS.length].value,
      isDefault: false,
      sortOrder: nextIdx,
      updatedAt: Date.now()
    };

    const updated = [...companyList, newCompany];
    setCompanyList(updated);
    setEditingCompanyId(newId);
    setSaveMessage(`已新增第 ${nextIdx} 間公司行號，請填寫統編與完整名稱後點擊「儲存全部設定」！`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // 開啟刪除公司行號確認對話框 (支援在 iframe / 任何瀏覽器中無阻擋執行)
  const handleDeleteCompany = (id: string, name: string) => {
    if (companyList.length <= 1) {
      setSaveError('系統至少必須保留一間公司行號，無法刪除最後一筆主檔。');
      setTimeout(() => setSaveError(null), 4000);
      return;
    }
    setCompanyToDelete({ id, name });
  };

  // 執行刪除公司行號
  const handleConfirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    const { id, name } = companyToDelete;
    setIsDeleting(true);
    setSaveError(null);

    try {
      // 1. 同步從後端 SQLite 資料庫中刪除
      await deleteCompanyApi(id);

      // 2. 更新本地與全域狀態
      const updated = companyList.filter(c => c.id !== id);
      
      // 若被刪除的公司原本是 default，將第一間指定為 default
      if (!updated.some(c => c.isDefault) && updated.length > 0) {
        updated[0].isDefault = true;
      }

      setCompanyList(updated);

      // 若目前正在檢視該公司，自動切換至其他存在的公司
      if (editingCompanyId === id) {
        setEditingCompanyId(updated[0]?.id || 'comp_1');
      }

      onUpdateCompanies(updated);
      setCompanyToDelete(null);
      setSaveMessage(`公司主檔「${name}」已成功自資料庫中刪除！`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('刪除公司失敗:', err);
      setSaveError(err.message || '刪除公司失敗，請檢查資料庫連線');
    } finally {
      setIsDeleting(false);
    }
  };

  // 儲存全部公司主檔至 SQLite
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      // 驗證是否有空白名稱
      const emptyNameCompany = companyList.find(c => !c.name || !c.name.trim());
      if (emptyNameCompany) {
        setSaveError('請為每間公司填寫「公司/行號正式全名」，名稱不可為空白。');
        setIsSaving(false);
        return;
      }

      // 確保至少有一間為 default
      let toSave = [...companyList];
      if (!toSave.some(c => c.isDefault) && toSave.length > 0) {
        toSave[0].isDefault = true;
      }
      
      const saved = await saveCompaniesApi(toSave);
      setCompanyList(saved);
      onUpdateCompanies(saved);
      setSaveMessage(`全部 ${saved.length} 間公司主檔設定已成功儲存至 SQLite 資料庫！`);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: any) {
      setSaveError(err.message || '儲存失敗，請檢查後端連線');
    } finally {
      setIsSaving(false);
    }
  };

  // 統一編號簡易驗證 (台灣 8 碼)
  const isTaxIdValid = !currentCompany.taxId || /^\d{8}$/.test(currentCompany.taxId.trim());

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 頂部標題與說明卡片 */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold shadow-2xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">
                公司主檔基本設定
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0066cc] border border-blue-200">
                企業基礎主檔庫 (Master Data)
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              維護各公司的法定登記資料、統一編號、發票抬頭、通訊地址與金融往來帳戶，專供未來會計、出納及行政模組自動取用。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddCompany}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="新增公司行號主檔"
          >
            <Plus className="w-3.5 h-3.5 text-[#0066cc]" />
            <span>新增公司主檔</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-[#0066cc] hover:bg-[#005bb5] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? '儲存中...' : '儲存公司主檔設定'}</span>
          </button>
        </div>
      </div>

      {/* 🏢 公司主檔清單選擇 (單純選取欲維護之公司) */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#0066cc]" />
            <span>選擇欲維護的公司主檔（共 {companyList.length} 間公司）：</span>
          </span>
          <span className="text-[11px] text-stone-400">
            點選卡片即可在下方檢視與修改該公司的完整基本資料
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {companyList.map((comp, idx) => {
            const isEditing = comp.id === editingCompanyId;

            return (
              <div
                key={comp.id}
                onClick={() => setEditingCompanyId(comp.id)}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isEditing 
                    ? 'border-[#0066cc] bg-sky-50/40 shadow-sm ring-2 ring-[#0066cc]/10' 
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-white"
                        style={{ backgroundColor: comp.color || '#0066cc' }}
                      />
                      <span className="font-bold text-xs text-stone-800 truncate">
                        公司 {idx + 1}：{comp.shortName || comp.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {comp.isDefault && (
                        <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                          ★預設主要公司
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-600 truncate font-medium">
                    {comp.name}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span>統編：{comp.taxId || '未設定統編'}</span>
                    {comp.representative && <span>負責人：{comp.representative}</span>}
                  </div>
                </div>

                {/* 卡片輔助操作 */}
                <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {!comp.isDefault ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(comp.id);
                        }}
                        className="text-[11px] text-stone-500 hover:text-amber-700 cursor-pointer font-medium"
                        title="設為主要預設公司"
                      >
                        設為主要公司
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400">主要公司</span>
                    )}
                  </div>

                  {companyList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCompany(comp.id, comp.name);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="刪除此公司主檔"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>刪除</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 儲存反饋訊息 */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2 shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage || '設定已成功儲存至實體 SQLite 資料庫！'}</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 正在維護的公司標籤提示 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-100/90 px-4 py-2.5 rounded-xl text-xs text-stone-600 border border-stone-200">
        <div className="flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full shrink-0" 
            style={{ backgroundColor: currentCompany.color || '#0066cc' }}
          />
          <span className="font-semibold text-stone-800">
            目前維護主檔：【{currentCompany.shortName || currentCompany.name}】
          </span>
          <span className="font-mono text-stone-500">
            (統編：{currentCompany.taxId || '未填'})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-stone-500 hidden md:inline">
            此資料將作為全系統會計對帳、出納撥付與報表之主檔數據源
          </span>
          {companyList.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteCompany(currentCompany.id, currentCompany.name)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs shrink-0"
              title="刪除目前檢視的公司主檔"
            >
              <Trash2 className="w-3 h-3 text-rose-500" />
              <span>刪除此公司主檔</span>
            </button>
          )}
        </div>
      </div>

      {/* 頁籤分組 */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 pb-2 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('basic')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'basic'
              ? 'bg-[#0066cc] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>1. 法定基本資料與代表色</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('contact')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'contact'
              ? 'bg-[#0066cc] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>2. 聯絡方式與通訊地址</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('finance')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'finance'
              ? 'bg-[#0066cc] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>3. 金融往來銀行帳戶 (出納撥付款主檔)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('preview')}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'preview'
              ? 'bg-[#0066cc] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>4. 報表套印即時預覽</span>
        </button>
      </div>

      {/* 表單內容 */}
      <form onSubmit={handleSaveAll} noValidate className="space-y-6">
        {/* ========================================================= */}
        {/* 分頁 1：法定基本資料 */}
        {/* ========================================================= */}
        {activeSubTab === 'basic' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 animate-fade-in">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-800">
                公司法定登記資料（供報表抬頭、統一發票開立與扣繳填報）
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                此處為「{currentCompany.shortName || currentCompany.name}」之法定名稱與 8 碼統一編號。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 公司代表色 */}
              <div className="md:col-span-2 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  行號專屬辨識色彩（在頂欄切換選單、流水清單中直觀辨識）：
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {COMPANY_COLORS.map(c => {
                    const isSelected = currentCompany.color === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handleChange('color', c.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-stone-800 bg-white shadow-xs ring-2 ring-stone-900/10' 
                            : 'border-stone-200 bg-white hover:bg-stone-100'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.value }} />
                        <span>{c.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 公司完整登記名稱 */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  公司/行號正式全名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={currentCompany.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="例如：宏揚精密工業股份有限公司、宏揚科技有限公司、弘揚商行"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent font-medium"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  將印於正式請款單、支出證明單、零用金報表之大抬頭。
                </span>
              </div>

              {/* 公司簡稱 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  公司/行號簡稱
                </label>
                <input
                  type="text"
                  value={currentCompany.shortName || ''}
                  onChange={(e) => handleChange('shortName', e.target.value)}
                  placeholder="例如：宏揚精密、宏揚科技、弘揚商行"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  用於頂欄即時切換下拉選單與各類清單緊湊顯示。
                </span>
              </div>

              {/* 統一編號 (統編 8 碼) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                  <span>統一編號 (統編)</span>
                  {!isTaxIdValid && (
                    <span className="text-rose-600 font-normal text-[11px]">
                      統編格式應為 8 碼純數字
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={currentCompany.taxId || ''}
                  onChange={(e) => handleChange('taxId', e.target.value.replace(/\D/g, ''))}
                  placeholder="例如：84920193"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent ${
                    !isTaxIdValid ? 'border-rose-400 bg-rose-50/40 text-rose-900' : 'border-stone-300'
                  }`}
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  台灣營利事業登記 8 碼，報銷或開立統一發票驗證用。
                </span>
              </div>

              {/* 代表人 / 負責人 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  負責人 / 代表人姓名
                </label>
                <input
                  type="text"
                  value={currentCompany.representative || ''}
                  onChange={(e) => handleChange('representative', e.target.value)}
                  placeholder="例如：林宏遠"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>

              {/* 是否為預設行號 */}
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(currentCompany.isDefault)}
                    onChange={(e) => handleSetDefault(currentCompany.id)}
                    className="w-4 h-4 rounded text-[#0066cc] focus:ring-[#0066cc]"
                  />
                  <span>設為系統預設登入行號</span>
                </label>
              </div>

              {/* 報表頁尾附註 (選填) */}
              <div className="md:col-span-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  報表頁尾備註 (選填)
                </label>
                <input
                  type="text"
                  value={currentCompany.taxInvoiceNote || ''}
                  onChange={(e) => handleChange('taxInvoiceNote', e.target.value)}
                  placeholder="例如：本單據符合各項稅法規定之合法憑證，經辦同仁與長官已核訖備查。"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent text-stone-700"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  列印此公司報表時，印製於單據最底部的統一備註說明。
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 分頁 2：聯絡方式與通訊地址 */}
        {/* ========================================================= */}
        {activeSubTab === 'contact' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 animate-fade-in">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-800">
                行號通訊聯絡與登記地址
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                用於列印憑證簽收回條、報表抬頭附註及廠商聯繫通知。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  代表號電話
                </label>
                <input
                  type="text"
                  value={currentCompany.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="例如：02-2798-8888"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  傳真號碼
                </label>
                <input
                  type="text"
                  value={currentCompany.fax || ''}
                  onChange={(e) => handleChange('fax', e.target.value)}
                  placeholder="例如：02-2798-8889"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  財務聯絡 Email
                </label>
                <input
                  type="email"
                  value={currentCompany.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="例如：finance@hongyang.com.tw"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  公司官方網站
                </label>
                <input
                  type="text"
                  value={currentCompany.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="例如：www.hongyang.com.tw"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700">
                    營業地址 / 登記地址
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-400">郵遞區號：</span>
                    <input
                      type="text"
                      maxLength={5}
                      value={currentCompany.postalCode || ''}
                      onChange={(e) => handleChange('postalCode', e.target.value)}
                      placeholder="例如：114"
                      className="w-16 px-2 py-0.5 rounded border border-stone-300 text-xs font-mono text-center"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={currentCompany.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="例如：台北市內湖區行愛路 168 號 5 樓"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 分頁 3：金融往來銀行帳戶 */}
        {/* ========================================================= */}
        {activeSubTab === 'finance' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 animate-fade-in">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-800">
                公司往來金融機構與銀行帳戶主檔
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                記載本公司主要金融機構、分行代碼與銀行帳號，供未來出納收付功能識別從何家公司帳戶扣款出帳。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  往來金融機構名稱
                </label>
                <input
                  type="text"
                  value={currentCompany.bankName || ''}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="例如：臺灣銀行、玉山銀行"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  分行名稱
                </label>
                <input
                  type="text"
                  value={currentCompany.bankBranch || ''}
                  onChange={(e) => handleChange('bankBranch', e.target.value)}
                  placeholder="例如：南港軟體園區分行"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  銀行總代碼 (3 碼)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={currentCompany.bankCode || ''}
                  onChange={(e) => handleChange('bankCode', e.target.value.replace(/\D/g, ''))}
                  placeholder="例如：004、808"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  銀行帳號
                </label>
                <input
                  type="text"
                  value={currentCompany.bankAccount || ''}
                  onChange={(e) => handleChange('bankAccount', e.target.value)}
                  placeholder="例如：128-001-987654"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent font-bold text-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  帳戶戶名
                </label>
                <input
                  type="text"
                  value={currentCompany.accountName || ''}
                  onChange={(e) => handleChange('accountName', e.target.value)}
                  placeholder={currentCompany.name || '例如：公司名稱'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 分頁 4：報表套印即時預覽 */}
        {/* ========================================================= */}
        {activeSubTab === 'preview' && (
          <div className="bg-stone-100 p-6 rounded-2xl border border-stone-300 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span className="font-bold flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#0066cc]" />
                <span>【{currentCompany.shortName || currentCompany.name}】A4 正式報表自動套印預覽</span>
              </span>
              <span className="text-stone-400">實際產出將依據目前填寫資料自動套印</span>
            </div>

            {/* 模擬 A4 報表抬頭紙張 */}
            <div className="bg-white p-8 rounded-lg shadow-md border border-stone-200 max-w-3xl mx-auto font-sans text-stone-800">
              {/* 報表大抬頭 */}
              <div className="text-center border-b-2 border-stone-900 pb-4">
                <div className="text-xs tracking-widest text-stone-500 font-semibold mb-1">
                  {currentCompany.name}
                </div>
                <h1 className="text-xl font-extrabold tracking-wider text-stone-900">
                  {currentCompany.reportHeader || `${currentCompany.name} 零用金收支月報表`}
                </h1>
                <div className="mt-2 flex items-center justify-center gap-6 text-xs text-stone-600 font-mono">
                  <span>統一編號：<strong className="text-stone-900">{currentCompany.taxId || '84920193'}</strong></span>
                  <span>電話：{currentCompany.phone || '02-2798-8888'}</span>
                  <span>會計年度：115 年 09 月</span>
                </div>
                {currentCompany.address && (
                  <div className="text-[11px] text-stone-400 mt-1">
                    營業地址：{currentCompany.postalCode ? `(${currentCompany.postalCode}) ` : ''}{currentCompany.address}
                  </div>
                )}
              </div>

              {/* 範例流水表格 */}
              <div className="mt-6">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 bg-stone-50 text-stone-600">
                      <th className="p-2 text-left">傳票編號</th>
                      <th className="p-2 text-left">日期</th>
                      <th className="p-2 text-left">會計科目</th>
                      <th className="p-2 text-left">摘要/品項</th>
                      <th className="p-2 text-left">經辦人</th>
                      <th className="p-2 text-right">支出金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr>
                      <td className="p-2 font-mono text-stone-500">P20260901-001</td>
                      <td className="p-2 font-mono">2026-09-01</td>
                      <td className="p-2 font-medium text-stone-800">誤餐費</td>
                      <td className="p-2 text-stone-600">廠區加班便當 (發票: AB-12345678)</td>
                      <td className="p-2">林志明</td>
                      <td className="p-2 text-right font-mono text-stone-900">NT$ 1,200</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-stone-500">P20260905-002</td>
                      <td className="p-2 font-mono">2026-09-05</td>
                      <td className="p-2 font-medium text-stone-800">文具用品</td>
                      <td className="p-2 text-stone-600">採購傳票夾與印泥 (收據)</td>
                      <td className="p-2">張美玲</td>
                      <td className="p-2 text-right font-mono text-stone-900">NT$ 630</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 匯款帳號提示 */}
              {currentCompany.bankAccount && (
                <div className="mt-4 p-3 bg-stone-50 rounded border border-stone-200 text-[11px] text-stone-600">
                  <span className="font-bold text-stone-800">撥款/匯款資訊：</span>
                  <span>{currentCompany.bankName} {currentCompany.bankBranch} ({currentCompany.bankCode || '—'}) 帳號：</span>
                  <span className="font-mono font-bold text-stone-900">{currentCompany.bankAccount}</span>
                  <span className="ml-2">戶名：{currentCompany.accountName || currentCompany.name}</span>
                </div>
              )}

              {/* 簽核簽章欄 */}
              <div className="mt-6 pt-4 border-t border-stone-300 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">總經理 / 負責人</div>
                  <div className="h-9 flex items-center justify-center font-bold text-stone-800">
                    {currentCompany.representative || '（簽章核決）'}
                  </div>
                </div>

                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">主辦會計</div>
                  <div className="h-9 flex items-center justify-center text-stone-400">
                    （會計覆核）
                  </div>
                </div>

                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">出納 / 經管人</div>
                  <div className="h-9 flex items-center justify-center text-stone-400">
                    （出納放款）
                  </div>
                </div>

                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">經辦請領人</div>
                  <div className="h-9 flex items-center justify-center text-stone-400">
                    （經辦同仁）
                  </div>
                </div>
              </div>

              {/* 頁尾附註 */}
              {currentCompany.taxInvoiceNote && (
                <div className="mt-4 pt-2 border-t border-stone-200 text-[10px] text-stone-400 text-center">
                  {currentCompany.taxInvoiceNote}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部儲存按鈕列 */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>資料即時存入本機實體 SQLite 資料庫 (data/petty_cash.sqlite)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCompanyList(companies);
                setSaveSuccess(false);
              }}
              className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重設回儲存值</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-[#0066cc] hover:bg-[#005bb5] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '儲存中...' : '儲存全部公司設定'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 刪除公司行號確認對話框 (純前端 Modal，100% 兼容 iframe 與所有瀏覽器) */}
      <ConfirmDialog
        isOpen={Boolean(companyToDelete)}
        title="確認刪除公司主檔"
        description={
          <div className="space-y-2">
            <p>
              確定要刪除「<span className="font-bold text-stone-900">{companyToDelete?.name}</span>」這筆公司主檔嗎？
            </p>
            <p className="text-stone-500 text-[11px] leading-relaxed">
              此操作將從公司名冊中移除該行號資料。該公司既有的歷史開支流水帳不會遺失，仍安全妥善保存在資料庫中。
            </p>
          </div>
        }
        confirmText={isDeleting ? '正在刪除...' : '確認刪除此公司'}
        cancelText="保留不刪除"
        variant="danger"
        onConfirm={handleConfirmDeleteCompany}
        onClose={() => {
          if (!isDeleting) setCompanyToDelete(null);
        }}
      />
    </div>
  );
};
