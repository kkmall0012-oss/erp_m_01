import React, { useState, useEffect, useMemo } from 'react';
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
  BookmarkCheck,
  Star,
  Edit2,
  CreditCard,
  PhoneCall,
  Lock,
  Eye,
  EyeOff,
  User,
  X
} from 'lucide-react';
import { CompanyProfile, CompanyPhoneEntry, CompanyBankAccount, DEFAULT_COMPANIES } from '../../types';
import { saveCompaniesApi, saveCompanyProfileApi, deleteCompanyApi } from '../../services/api';
import { ConfirmDialog } from '../ConfirmDialog';

interface CompanySettingsViewProps {
  companies?: CompanyProfile[];
  activeCompanyId?: string;
  onUpdateCompanies: (updated: CompanyProfile[]) => void;
  onGoToReports?: () => void;
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
  onUpdateCompanies,
  onGoToReports
}) => {
  // 目前正在維護檢視的公司 ID
  const [editingCompanyId, setEditingCompanyId] = useState<string>(activeCompanyId === 'all' ? (companies[0]?.id || 'comp_1') : activeCompanyId);
  
  // 本地公司清單副本
  const [companyList, setCompanyList] = useState<CompanyProfile[]>(companies.length > 0 ? companies : DEFAULT_COMPANIES);

  // 當前編輯中的公司物件
  const currentCompany = companyList.find(c => c.id === editingCompanyId) || companyList[0] || DEFAULT_COMPANIES[0];

  const [activeSubTab, setActiveSubTab] = useState<'basic' | 'contact' | 'finance' | 'preview'>('basic');
  const [previewSharedMode, setPreviewSharedMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const nominalCompany = useMemo(() => {
    return companyList.find(c => c.isNominalPettyCashHolder) || companyList.find(c => c.isDefault) || companyList[0] || currentCompany;
  }, [companyList, currentCompany]);

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

  // 設為三社共用零用金之法定掛名主管公司
  const handleSetNominalPettyCashHolder = (id: string) => {
    setCompanyList(prev => prev.map(c => ({
      ...c,
      isNominalPettyCashHolder: c.id === id
    })));
  };

  // 處理多筆電話/傳真清單
  const phonesList: CompanyPhoneEntry[] = useMemo(() => {
    if (Array.isArray(currentCompany.phones) && currentCompany.phones.length > 0) {
      return currentCompany.phones;
    }
    const list: CompanyPhoneEntry[] = [];
    if (currentCompany.phone) {
      list.push({
        id: `${currentCompany.id}_ph_1`,
        type: 'phone',
        number: currentCompany.phone,
        label: '代表號電話',
        isDefault: true,
        sortOrder: 1
      });
    }
    if (currentCompany.fax) {
      list.push({
        id: `${currentCompany.id}_fx_1`,
        type: 'fax',
        number: currentCompany.fax,
        label: '傳真專線',
        isDefault: true,
        sortOrder: 2
      });
    }
    return list;
  }, [currentCompany.phones, currentCompany.phone, currentCompany.fax, currentCompany.id]);

  const handleUpdatePhones = (newPhones: CompanyPhoneEntry[]) => {
    const defaultPhone = newPhones.find(p => p.isDefault && p.type !== 'fax') || newPhones.find(p => p.type !== 'fax');
    const defaultFax = newPhones.find(p => p.isDefault && p.type === 'fax') || newPhones.find(p => p.type === 'fax');

    setCompanyList(prev => prev.map(c => {
      if (c.id === editingCompanyId) {
        return {
          ...c,
          phones: newPhones,
          phone: defaultPhone ? defaultPhone.number : '',
          fax: defaultFax ? defaultFax.number : ''
        };
      }
      return c;
    }));
    setSaveSuccess(false);
  };

  const handleAddPhone = (type: 'phone' | 'fax' | 'mobile' | 'other' = 'phone') => {
    const nextOrder = phonesList.length + 1;
    const isFirstOfType = phonesList.filter(p => p.type === type).length === 0;
    const newEntry: CompanyPhoneEntry = {
      id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      number: '',
      label: type === 'phone' ? '公司電話' : type === 'fax' ? '傳真號碼' : type === 'mobile' ? '行動電話' : '其他分機',
      isDefault: isFirstOfType,
      sortOrder: nextOrder
    };
    handleUpdatePhones([...phonesList, newEntry]);
  };

  const handleRemovePhone = (index: number) => {
    const target = phonesList[index];
    const updated = phonesList.filter((_, idx) => idx !== index);
    if (target?.isDefault && updated.length > 0) {
      const sameType = updated.find(p => p.type === target.type);
      if (sameType) sameType.isDefault = true;
    }
    handleUpdatePhones(updated);
  };

  const handlePhoneFieldChange = (index: number, field: keyof CompanyPhoneEntry, value: any) => {
    const updated = phonesList.map((p, idx) => {
      if (idx === index) {
        return { ...p, [field]: value };
      }
      return p;
    });
    handleUpdatePhones(updated);
  };

  const handleSetDefaultPhone = (index: number) => {
    const target = phonesList[index];
    if (!target) return;
    const isFax = target.type === 'fax';
    const updated = phonesList.map((p, idx) => {
      if (isFax) {
        if (p.type === 'fax') {
          return { ...p, isDefault: idx === index };
        }
      } else {
        if (p.type !== 'fax') {
          return { ...p, isDefault: idx === index };
        }
      }
      return p;
    });
    handleUpdatePhones(updated);
  };

  // 處理多筆銀行帳戶清單
  const bankAccountsList: CompanyBankAccount[] = useMemo(() => {
    if (Array.isArray(currentCompany.bankAccounts) && currentCompany.bankAccounts.length > 0) {
      return currentCompany.bankAccounts;
    }
    if (currentCompany.bankName || currentCompany.bankAccount) {
      return [
        {
          id: `${currentCompany.id}_bk_1`,
          bankName: currentCompany.bankName || '臺灣銀行',
          bankBranch: currentCompany.bankBranch || '',
          bankCode: currentCompany.bankCode || '',
          bankAccount: currentCompany.bankAccount || '',
          accountName: currentCompany.accountName || currentCompany.name || '',
          accountType: 'operating',
          isDefault: true,
          note: '主要往來營運扣款帳戶',
          sortOrder: 1
        }
      ];
    }
    return [];
  }, [currentCompany.bankAccounts, currentCompany.bankName, currentCompany.bankBranch, currentCompany.bankCode, currentCompany.bankAccount, currentCompany.accountName, currentCompany.name, currentCompany.id]);

  const handleUpdateBankAccounts = (newAccounts: CompanyBankAccount[]) => {
    const defaultBank = newAccounts.find(b => b.isDefault) || newAccounts[0];
    setCompanyList(prev => prev.map(c => {
      if (c.id === editingCompanyId) {
        return {
          ...c,
          bankAccounts: newAccounts,
          bankName: defaultBank ? defaultBank.bankName : '',
          bankBranch: defaultBank ? (defaultBank.bankBranch || '') : '',
          bankCode: defaultBank ? (defaultBank.bankCode || '') : '',
          bankAccount: defaultBank ? defaultBank.bankAccount : '',
          accountName: defaultBank ? defaultBank.accountName : ''
        };
      }
      return c;
    }));
    setSaveSuccess(false);
  };

  // 銀行帳戶新增/編輯彈窗狀態
  const [bankModalOpen, setBankModalOpen] = useState<boolean>(false);
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [bankFormData, setBankFormData] = useState<CompanyBankAccount>({
    id: '',
    bankName: '',
    bankBranch: '',
    bankCode: '',
    branchCode: '',
    bankAccount: '',
    accountName: '',
    accountType: 'operating',
    isDefault: false,
    isConfidential: false,
    isPrivateAccount: false,
    note: '',
    sortOrder: 1
  });

  const openAddBankModal = () => {
    setEditingBankIndex(null);
    setBankFormData({
      id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      bankName: '',
      bankBranch: '',
      bankCode: '',
      branchCode: '',
      bankAccount: '',
      accountName: currentCompany.name || '',
      accountType: bankAccountsList.length === 0 ? 'operating' : 'petty_cash',
      isDefault: bankAccountsList.length === 0,
      isConfidential: currentCompany.isConfidential || false,
      isPrivateAccount: currentCompany.entityType === 'individual',
      note: '',
      sortOrder: bankAccountsList.length + 1
    });
    setBankModalOpen(true);
  };

  const openEditBankModal = (index: number) => {
    const acc = bankAccountsList[index];
    if (!acc) return;
    setEditingBankIndex(index);
    setBankFormData({ ...acc });
    setBankModalOpen(true);
  };

  const handleSaveBankModal = () => {
    if (!bankFormData.bankName.trim() && !bankFormData.bankAccount.trim()) {
      alert('請填寫金融機構名稱或帳號');
      return;
    }
    let updated: CompanyBankAccount[];
    if (editingBankIndex === null) {
      // 新增
      if (bankFormData.isDefault || bankAccountsList.length === 0) {
        updated = bankAccountsList.map(b => ({ ...b, isDefault: false }));
        updated.push({ ...bankFormData, isDefault: true });
      } else {
        updated = [...bankAccountsList, bankFormData];
      }
    } else {
      // 編輯
      updated = bankAccountsList.map((b, idx) => {
        if (idx === editingBankIndex) {
          return bankFormData;
        }
        if (bankFormData.isDefault) {
          return { ...b, isDefault: false };
        }
        return b;
      });
    }
    handleUpdateBankAccounts(updated);
    setBankModalOpen(false);
  };

  const handleRemoveBankAccount = (index: number) => {
    const target = bankAccountsList[index];
    const updated = bankAccountsList.filter((_, idx) => idx !== index);
    if (target?.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    handleUpdateBankAccounts(updated);
  };

  const handleSetDefaultBankAccount = (index: number) => {
    const updated = bankAccountsList.map((b, idx) => ({
      ...b,
      isDefault: idx === index
    }));
    handleUpdateBankAccounts(updated);
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
      phones: [
        {
          id: `ph_${Date.now()}_1`,
          type: 'phone',
          number: '',
          label: '公司代表號',
          isDefault: true,
          sortOrder: 1
        }
      ],
      email: '',
      website: '',
      postalCode: '',
      address: '',
      bankName: '臺灣銀行',
      bankBranch: '',
      bankCode: '004',
      bankAccount: '',
      accountName: `新關係企業行號 ${nextIdx}`,
      bankAccounts: [
        {
          id: `bk_${Date.now()}_1`,
          bankName: '臺灣銀行',
          bankBranch: '',
          bankCode: '004',
          bankAccount: '',
          accountName: `新關係企業行號 ${nextIdx}`,
          accountType: 'operating',
          isDefault: true,
          note: '主要營運往來帳戶',
          sortOrder: 1
        }
      ],
      chiefAccountant: currentCompany?.chiefAccountant || '',
      cashier: currentCompany?.cashier || '',
      reportHeader: `新關係企業行號 ${nextIdx} 財務零用金月報表`,
      invoiceBuyerName: '',
      taxInvoiceNote: '本單據符合所得稅法各項規定憑證，經辦與權責長官已核訖。',
      color: COMPANY_COLORS[(nextIdx - 1) % COMPANY_COLORS.length].value,
      entityType: 'corporate',
      isJointHeader: true,
      isConfidential: false,
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

      // 確保至少有一間為 default，至少有一間為 nominal holder
      let toSave = [...companyList];
      if (!toSave.some(c => c.isDefault) && toSave.length > 0) {
        toSave[0].isDefault = true;
      }
      if (!toSave.some(c => c.isNominalPettyCashHolder) && toSave.length > 0) {
        toSave[0].isNominalPettyCashHolder = true;
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

                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {comp.entityType === 'individual' ? (
                        <span className="text-[9px] bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5" />
                          <span>個人/私人戶</span>
                        </span>
                      ) : (
                        <span className="text-[9px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                          法人公司
                        </span>
                      )}
                      {comp.isConfidential && (
                        <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          <span>機密</span>
                        </span>
                      )}
                      {comp.isDefault && (
                        <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                          ★預設主要
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-600 truncate font-medium">
                    {comp.name}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-stone-500">
                    <span>
                      {comp.entityType === 'individual' && !comp.taxId 
                        ? '自然人 (無統編)' 
                        : `統編：${comp.taxId || '未設定'}`}
                    </span>
                    {comp.representative && <span>{comp.entityType === 'individual' ? '姓名' : '負責人'}：{comp.representative}</span>}
                  </div>
                  
                  <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                    {comp.isJointHeader !== false ? (
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        ✓ 列入聯名表單抬頭
                      </span>
                    ) : (
                      <span className="text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                        ✕ 排除於聯名抬頭
                      </span>
                    )}
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
          <span>2. 聯絡方式與多筆電話/傳真</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeSubTab === 'contact' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
          }`}>
            {phonesList.length}
          </span>
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
          <span>3. 金融往來銀行帳戶主檔</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
            activeSubTab === 'finance' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
          }`}>
            {bankAccountsList.length}
          </span>
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
          <span>4. 表頭與簽章樣式預覽</span>
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

              {/* 組織主體性質 (公司法人 vs 個人/私人名義) */}
              <div className="md:col-span-2 bg-gradient-to-r from-stone-50 to-blue-50/40 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-800">
                      組織實體性質 (主體分類)
                    </label>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      區分營利事業登記之正式法人公司，或是無統編之個人私帳戶（接案未開發票、私人匯款等專用）
                    </p>
                  </div>

                  <div className="inline-flex p-1 bg-stone-200/70 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('entityType', 'corporate');
                        handleChange('isJointHeader', true);
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        currentCompany.entityType !== 'individual'
                          ? 'bg-white text-blue-700 shadow-xs font-extrabold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>正式公司 / 行號法人</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleChange('entityType', 'individual');
                        handleChange('isJointHeader', false);
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        currentCompany.entityType === 'individual'
                          ? 'bg-white text-purple-700 shadow-xs font-extrabold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>個人 / 私人名義 (無統編)</span>
                    </button>
                  </div>
                </div>

                {/* 個人/私帳提示區塊 */}
                {currentCompany.entityType === 'individual' && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>💡 個人/無統編主體特點：</span>
                    </div>
                    <p className="text-purple-800/90 leading-relaxed text-[11px]">
                      適用於工程無開發票、匯入負責人私人戶之接案收支。統一編號自動轉為免填，系統會自動將其排除於對外三家公司聯合表單抬頭，避免給客人的請款單或正式報表出現個人姓名突兀問題。
                    </p>
                  </div>
                )}
              </div>

              {/* 公司完整登記名稱 */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {currentCompany.entityType === 'individual' ? '個人名稱 / 私人主體名稱' : '公司/行號正式全名'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={currentCompany.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={currentCompany.entityType === 'individual' ? '例如：李永勝 (私人戶)' : '例如：田頭工程有限公司、田碩工程有限公司、田馨企業社'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent font-medium"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  {currentCompany.entityType === 'individual'
                    ? '內部記帳與私人帳戶出納歸屬使用。'
                    : '將印於正式請款單、支出證明單、零用金報表之大抬頭。'}
                </span>
              </div>

              {/* 公司簡稱 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {currentCompany.entityType === 'individual' ? '個人簡稱 / 顯示代號' : '公司/行號簡稱'}
                </label>
                <input
                  type="text"
                  value={currentCompany.shortName || ''}
                  onChange={(e) => handleChange('shortName', e.target.value)}
                  placeholder={currentCompany.entityType === 'individual' ? '例如：李永勝私帳' : '例如：田頭工程、田碩工程、田馨企業'}
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
                  {currentCompany.entityType === 'individual' ? (
                    <span className="text-stone-400 font-normal text-[11px]">個人主體免填統編</span>
                  ) : !isTaxIdValid ? (
                    <span className="text-rose-600 font-normal text-[11px]">
                      統編格式應為 8 碼純數字
                    </span>
                  ) : null}
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={currentCompany.taxId || ''}
                  onChange={(e) => handleChange('taxId', e.target.value.replace(/\D/g, ''))}
                  placeholder={currentCompany.entityType === 'individual' ? '個人無統編 (可留空)' : '例如：13044353'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent ${
                    !isTaxIdValid && currentCompany.entityType !== 'individual' ? 'border-rose-400 bg-rose-50/40 text-rose-900' : 'border-stone-300'
                  }`}
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  {currentCompany.entityType === 'individual' 
                    ? '若無設立商號或公司稅籍，直接保留空白即可。'
                    : '台灣營利事業登記 8 碼，報銷或開立統一發票驗證用。'}
                </span>
              </div>

              {/* 代表人 / 負責人 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {currentCompany.entityType === 'individual' ? '個人負責人姓名' : '負責人 / 代表人姓名'}
                </label>
                <input
                  type="text"
                  value={currentCompany.representative || ''}
                  onChange={(e) => handleChange('representative', e.target.value)}
                  placeholder="例如：李永勝"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                />
              </div>

              {/* 表單聯名抬頭與查帳機密隱藏進階屬性 */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* 1. 對外表單聯合抬頭 */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentCompany.isJointHeader !== false}
                      onChange={(e) => handleChange('isJointHeader', e.target.checked)}
                      className="w-4 h-4 text-[#0066cc] rounded border-stone-300 focus:ring-[#0066cc]"
                    />
                    <span>納入「對外三間公司聯合表單大抬頭」</span>
                  </label>
                  <p className="text-[11px] text-stone-500 ml-6 leading-relaxed">
                    預設勾選。若取消勾選（如個人私人戶），產出客戶對外請款單或三家公司聯名月報表時，將<strong>自動隱藏此名稱</strong>，絕不會印出個人名字避免突兀。
                  </p>
                </div>

                {/* 2. 查帳機密隱藏屬性 */}
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-rose-950 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(currentCompany.isConfidential)}
                      onChange={(e) => handleChange('isConfidential', e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-stone-300 focus:ring-rose-500"
                    />
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>設定為「機密私帳主體 (隱藏屬性)」</span>
                    </span>
                  </label>
                  <p className="text-[11px] text-rose-900/80 ml-6 leading-relaxed">
                    面對查帳審計或給一般同仁檢視時，此主體與其關聯之私帳收支可一鍵啟動遮蔽隱藏，僅最高管理權限可見。
                  </p>
                </div>
              </div>

              {/* 預設登入行號設定 */}
              <div className="flex items-center pt-2">
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

              {/* 關係企業共用零用金之法定掛名主理行號 (跨公司共享架構) */}
              <div className="md:col-span-2 p-4 rounded-xl border-2 border-blue-200 bg-blue-50/40 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-blue-950 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(currentCompany.isNominalPettyCashHolder)}
                      onChange={() => handleSetNominalPettyCashHolder(currentCompany.id)}
                      className="w-4 h-4 rounded text-[#0066cc] focus:ring-[#0066cc]"
                    />
                    <span className="text-sm">指定此公司為「田頭關係企業共用零用金之法定掛名主管公司」</span>
                  </label>
                  {currentCompany.isNominalPettyCashHolder && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0066cc] text-white">
                      目前法定掛名
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-800/90 leading-relaxed">
                  💡 <strong>業務架構說明</strong>：本系統的零用金為關係企業共用之現金庫（不屬於單一公司獨佔，三間公司的各項開銷皆從此金庫撥付）。然而在依法報稅、工商行政登記與綜合對外報表上，專戶統一掛名於此公司名下（目前由【<strong>{nominalCompany.name}</strong>】統一代表管轄與列印報表）。
                </p>
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
        {/* 分頁 2：聯絡方式與多筆電話/傳真 */}
        {/* ========================================================= */}
        {activeSubTab === 'contact' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0066cc]" />
                  <span>公司電話與傳真通訊清單</span>
                  <span className="text-xs font-normal text-stone-500">（可新增多筆電話、分機或傳真）</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  支援登記多組代表號、辦公室電話、傳真專線、廠區或公務手機，並可設定主要代表號與傳真供單據套印。
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAddPhone('phone')}
                  className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-[#0066cc] hover:bg-blue-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增電話</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPhone('fax')}
                  className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增傳真</span>
                </button>
              </div>
            </div>

            {/* 電話/傳真清單 */}
            <div className="space-y-3">
              {phonesList.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                  <PhoneCall className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">目前尚未填寫電話或傳真資料</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleAddPhone('phone')}
                      className="px-3 py-1.5 bg-[#0066cc] text-white rounded-lg text-xs font-bold hover:bg-[#0052a3]"
                    >
                      ＋ 新增第一筆代表號電話
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {phonesList.map((entry, idx) => {
                    const isFax = entry.type === 'fax';
                    return (
                      <div
                        key={entry.id || idx}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center gap-3 ${
                          entry.isDefault 
                            ? 'bg-blue-50/40 border-blue-200 shadow-2xs' 
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {/* 序號與類型 */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="w-5 text-center text-xs font-mono font-bold text-stone-400">
                            {idx + 1}
                          </span>
                          <select
                            value={entry.type || 'phone'}
                            onChange={(e) => handlePhoneFieldChange(idx, 'type', e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                          >
                            <option value="phone">🏢 代表號 / 市話</option>
                            <option value="fax">📠 傳真專線</option>
                            <option value="mobile">📱 行動電話 / 手機</option>
                            <option value="other">🏗️ 廠區 / 工地 / 其他</option>
                          </select>
                        </div>

                        {/* 號碼輸入框 */}
                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={entry.number}
                            onChange={(e) => handlePhoneFieldChange(idx, 'number', e.target.value)}
                            placeholder={isFax ? '例如：02-2798-8889' : '例如：02-2798-8888 或 0912-345-678'}
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                          />
                        </div>

                        {/* 標籤/說明備註 */}
                        <div className="w-full md:w-48 shrink-0">
                          <input
                            type="text"
                            value={entry.label || ''}
                            onChange={(e) => handlePhoneFieldChange(idx, 'label', e.target.value)}
                            placeholder="用途標籤 (如：總公司代表號)"
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                          />
                        </div>

                        {/* 預設主要開關與操作按鈕 */}
                        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                          {entry.isDefault ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-[#0066cc] font-bold text-[11px]">
                              <Check className="w-3 h-3" />
                              <span>{isFax ? '主要傳真' : '主要代表號'}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultPhone(idx)}
                              className="px-2 py-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 text-[11px] font-medium transition-colors"
                            >
                              設為主要{isFax ? '傳真' : '電話'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemovePhone(idx)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="刪除此電話資料"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 其他基本聯絡通訊資訊 */}
            <div className="pt-4 border-t border-stone-100 space-y-4">
              <h4 className="text-xs font-bold text-stone-700">其他聯絡與地址資訊</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    財務聯絡 Email
                  </label>
                  <input
                    type="email"
                    value={currentCompany.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="例如：service@company.com.tw"
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
                    placeholder="例如：www.company.com.tw"
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
                        placeholder="例如：630"
                        className="w-16 px-2 py-0.5 rounded border border-stone-300 text-xs font-mono text-center"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={currentCompany.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="例如：雲林縣斗南鎮延平路二段 123 號"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 分頁 3：金融往來銀行帳戶主檔 (多筆帳戶) */}
        {/* ========================================================= */}
        {activeSubTab === 'finance' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#0066cc]" />
                  <span>公司往來金融機構與銀行帳戶主檔</span>
                  <span className="text-xs font-normal text-stone-500">（可新增多筆往來銀行帳戶）</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  公司可能不只一個帳戶（如主要營運戶、薪轉戶、零用金撥補專戶等），可指定主要預設帳戶供出納扣款出帳。
                </p>
              </div>

              <button
                type="button"
                onClick={openAddBankModal}
                className="px-3.5 py-2 rounded-xl bg-[#0066cc] text-white hover:bg-[#0052a3] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增往來銀行帳戶</span>
              </button>
            </div>

            {/* 帳戶卡片列表 */}
            {bankAccountsList.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                <Landmark className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-600">目前尚未設定任何往來銀行帳戶</p>
                <p className="text-[11px] text-stone-400 mt-0.5">點擊上方按鈕新增此公司的第一個往來金融機構與帳號</p>
                <button
                  type="button"
                  onClick={openAddBankModal}
                  className="mt-4 px-4 py-2 bg-[#0066cc] text-white rounded-xl text-xs font-bold hover:bg-[#0052a3] shadow-xs cursor-pointer"
                >
                  ＋ 立即新增銀行帳戶
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankAccountsList.map((account, idx) => {
                  const typeLabels: Record<string, { label: string; color: string }> = {
                    operating: { label: '💼 主要營運戶', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                    payroll: { label: '👥 薪資轉帳戶', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                    petty_cash: { label: '💰 零用金專戶', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                    savings: { label: '🏦 一般活期戶', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    other: { label: '🏷️ 其他專案戶', color: 'bg-stone-100 text-stone-700 border-stone-200' },
                  };
                  const typeInfo = typeLabels[account.accountType || 'operating'] || typeLabels.operating;

                  return (
                    <div
                      key={account.id || idx}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        account.isDefault 
                          ? 'border-blue-300 bg-gradient-to-br from-blue-50/50 via-white to-stone-50 shadow-xs ring-1 ring-blue-500/20' 
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* 頂部標籤與狀態 */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="p-1.5 bg-blue-100 text-[#0066cc] rounded-lg">
                              <Landmark className="w-4 h-4" />
                            </span>
                            <span className="font-bold text-sm text-stone-900">
                              {account.bankName} {account.bankBranch}
                            </span>
                            {account.bankCode && (
                              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-mono font-bold">
                                {account.bankCode}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {account.isPrivateAccount && (
                              <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-0.5">
                                <User className="w-2.5 h-2.5" />
                                <span>私人戶</span>
                              </span>
                            )}
                            {account.isConfidential && (
                              <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>機密帳戶</span>
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            {account.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-2xs">
                                <Star className="w-3 h-3 fill-current" />
                                <span>主要帳戶</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 銀行帳號與戶名 */}
                        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-1">
                          <div className="text-[11px] text-stone-500 flex items-center justify-between">
                            <span>銀行帳號</span>
                            <span className="font-mono text-[10px] text-stone-400">
                              戶名：<strong className="text-stone-700">{account.accountName || currentCompany.name}</strong>
                            </span>
                          </div>
                          <div className="text-base font-mono font-bold text-stone-900 tracking-wider">
                            {account.bankAccount || '（未填寫帳號）'}
                          </div>
                        </div>

                        {/* 備註說明 */}
                        {account.note && (
                          <p className="text-xs text-stone-500 italic bg-white/70 px-2.5 py-1 rounded border border-stone-100">
                            備註：{account.note}
                          </p>
                        )}
                      </div>

                      {/* 卡片底端操作按鈕 */}
                      <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-stone-100">
                        <div>
                          {!account.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultBankAccount(idx)}
                              className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 text-xs font-medium transition-colors cursor-pointer"
                            >
                              設為主要扣款帳戶
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditBankModal(idx)}
                            className="p-1.5 text-stone-500 hover:text-[#0066cc] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="編輯帳戶"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveBankAccount(idx)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="刪除此帳戶"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 分頁 4：表頭與簽章樣式預覽 */}
        {/* ========================================================= */}
        {activeSubTab === 'preview' && (
          <div className="bg-stone-100 p-6 rounded-2xl border border-stone-300 space-y-4 animate-fade-in">
            {/* 說明與前往真實報表導引橫條 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
              <div className="space-y-1">
                <div className="font-bold text-sm flex items-center gap-1.5 text-blue-950">
                  <Printer className="w-4 h-4 text-[#0066cc]" />
                  <span>公司表頭與簽核欄套印樣式預覽（非真實交易流水）</span>
                </div>
                <p className="text-blue-700 leading-relaxed">
                  此處僅用於確認公司全名、統編、地址、電話與簽章欄的版面排版。若要產出或列印真實零用金月報表與明細流水帳，請至零用金專屬報表中心。
                </p>
              </div>
              {onGoToReports && (
                <button
                  type="button"
                  onClick={onGoToReports}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066cc] text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>前往「統計報表中心」列印真帳</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 預覽模式切換工具列 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-600 bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <Printer className="w-4 h-4 text-[#0066cc]" />
                <span>切換表頭樣式檢視：</span>
              </div>
              <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setPreviewSharedMode(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    !previewSharedMode 
                      ? 'bg-white text-stone-900 shadow-2xs font-bold' 
                      : 'text-stone-600 hover:text-stone-900 font-medium'
                  }`}
                >
                  【{currentCompany.name}】個別公司表頭
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSharedMode(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewSharedMode 
                      ? 'bg-[#0066cc] text-white shadow-2xs font-bold' 
                      : 'text-stone-600 hover:text-stone-900 font-medium'
                  }`}
                >
                  <span>🏛️ 【田頭】關係企業共用表頭</span>
                  <span className={`text-[10px] ${previewSharedMode ? 'text-blue-100' : 'text-stone-400'}`}>
                    (法定掛名：{nominalCompany.name})
                  </span>
                </button>
              </div>
            </div>

            {/* 模擬 A4 報表抬頭紙張 */}
            <div className="bg-white p-8 rounded-lg shadow-md border border-stone-200 max-w-3xl mx-auto font-sans text-stone-800">
              {/* 報表大抬頭 */}
              <div className="text-center border-b-2 border-stone-900 pb-4">
                <div className="inline-flex items-center gap-2 mb-1">
                  <span className="text-xs tracking-widest text-stone-600 font-semibold">
                    {previewSharedMode 
                      ? companies.map(c => c.name).join(' / ') 
                      : `${currentCompany.name} 零用金帳務`}
                  </span>
                  {previewSharedMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0066cc] border border-blue-200">
                      田頭關係企業
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-extrabold tracking-wider text-stone-900">
                  {previewSharedMode
                    ? `【${companies.map(c => c.name).join(' / ')} 零用金收支月報表】`
                    : `【${currentCompany.name} 零用金收支月報表】`}
                </h1>
                <p className="text-xs text-stone-600 mt-1">
                  {previewSharedMode ? (
                    `田頭關係企業共用現金庫 ｜ 法定掛名主管：${nominalCompany.name}（統編：${nominalCompany.taxId || '—'}）`
                  ) : (
                    `本公司零用金款項統一由共用金庫撥發核銷`
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-600 font-mono">
                  <span>
                    {previewSharedMode ? '主理統編：' : '統一編號：'}
                    <strong className="text-stone-900">
                      {previewSharedMode ? (nominalCompany.taxId || '—') : (currentCompany.taxId || '—')}
                    </strong>
                  </span>
                  <span>電話：{previewSharedMode ? (nominalCompany.phone || '—') : (currentCompany.phone || '—')}</span>
                  <span>會計年度：115 年 09 月</span>
                </div>
                {(previewSharedMode ? nominalCompany.address : currentCompany.address) && (
                  <div className="text-[11px] text-stone-400 mt-1">
                    營業地址：{previewSharedMode 
                      ? `${nominalCompany.postalCode ? `(${nominalCompany.postalCode}) ` : ''}${nominalCompany.address}`
                      : `${currentCompany.postalCode ? `(${currentCompany.postalCode}) ` : ''}${currentCompany.address}`}
                  </div>
                )}
              </div>

              {/* 替代假流水帳的版面區塊：版面示意展示 */}
              <div className="my-8 py-10 px-6 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/70 text-center text-xs text-stone-500 space-y-2">
                <FileText className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="font-semibold text-stone-700">【A4 正式報表真實帳務明細列印區域】</p>
                <p className="text-stone-500 max-w-md mx-auto leading-relaxed">
                  此處於實際列印時將自動帶入「日期、傳票編號、會計科目、品名摘要、經辦同仁、收支結存金額與發票號碼」。
                </p>
              </div>

              {/* 匯款帳號提示 */}
              {(previewSharedMode ? nominalCompany.bankAccount : currentCompany.bankAccount) && (
                <div className="mt-4 p-3 bg-stone-50 rounded border border-stone-200 text-[11px] text-stone-600">
                  <span className="font-bold text-stone-800">
                    {previewSharedMode ? '金庫撥付/受款專戶：' : '撥款/匯款資訊：'}
                  </span>
                  <span>
                    {previewSharedMode 
                      ? `${nominalCompany.bankName} ${nominalCompany.bankBranch} (${nominalCompany.bankCode || '—'}) 帳號：`
                      : `${currentCompany.bankName} ${currentCompany.bankBranch} (${currentCompany.bankCode || '—'}) 帳號：`}
                  </span>
                  <span className="font-mono font-bold text-stone-900">
                    {previewSharedMode ? nominalCompany.bankAccount : currentCompany.bankAccount}
                  </span>
                  <span className="ml-2">
                    戶名：{previewSharedMode 
                      ? (nominalCompany.accountName || nominalCompany.name) 
                      : (currentCompany.accountName || currentCompany.name)}
                  </span>
                </div>
              )}

              {/* 簽核簽章欄 (回復原狀 4 欄版，去除預設審核人名，供紙本實體簽核蓋印) */}
              <div className="mt-6 pt-4 border-t border-stone-300 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">總經理 / 負責人</div>
                  <div className="h-9 flex items-center justify-center text-stone-300">
                    &nbsp;
                  </div>
                </div>

                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">主辦會計</div>
                  <div className="h-9 flex items-center justify-center text-stone-300">
                    &nbsp;
                  </div>
                </div>

                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">出納 / 經管人</div>
                  <div className="h-9 flex items-center justify-center text-stone-300">
                    &nbsp;
                  </div>
                </div>

                <div className="border border-stone-200 p-2 rounded bg-stone-50/50">
                  <div className="text-[10px] text-stone-500 mb-1 font-medium">經辦請領人</div>
                  <div className="h-9 flex items-center justify-center text-stone-300">
                    &nbsp;
                  </div>
                </div>
              </div>

              {/* 頁尾附註 */}
              {(previewSharedMode ? nominalCompany.taxInvoiceNote : currentCompany.taxInvoiceNote) && (
                <div className="mt-4 pt-2 border-t border-stone-200 text-[10px] text-stone-400 text-center">
                  {previewSharedMode ? nominalCompany.taxInvoiceNote : currentCompany.taxInvoiceNote}
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

      {/* 新增/編輯往來銀行帳戶彈窗 */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#0066cc] rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-sm">
                    {editingBankIndex === null ? '新增往來金融機構與銀行帳戶' : '編輯往來銀行帳戶資料'}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    設定此帳戶供出納扣款、金庫管理與對外匯款憑證使用
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-stone-700 mb-1">
                    金融機構名稱 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bankFormData.bankName}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                    placeholder="例如：臺灣銀行、玉山銀行"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-stone-700 mb-1">
                    分行名稱
                  </label>
                  <input
                    type="text"
                    value={bankFormData.bankBranch || ''}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankBranch: e.target.value })}
                    placeholder="例如：斗南分行、營業部"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-stone-700 mb-1">
                    銀行總代碼 (3 碼)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={bankFormData.bankCode || ''}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankCode: e.target.value.replace(/\D/g, '') })}
                    placeholder="例如：004"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    帳戶性質
                  </label>
                  <select
                    value={bankFormData.accountType || 'operating'}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  >
                    <option value="operating">💼 主要營運收付戶</option>
                    <option value="payroll">👥 薪資轉帳專戶</option>
                    <option value="petty_cash">💰 零用金撥補專戶</option>
                    <option value="savings">🏦 一般活期存款戶</option>
                    <option value="other">🏷️ 其他專案/押標金帳戶</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  銀行帳號 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankFormData.bankAccount}
                  onChange={(e) => setBankFormData({ ...bankFormData, bankAccount: e.target.value })}
                  placeholder="例如：004-012-3456789"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  帳戶戶名
                </label>
                <input
                  type="text"
                  value={bankFormData.accountName || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountName: e.target.value })}
                  placeholder={currentCompany.name || '例如：公司全名'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  備註用途說明 (選填)
                </label>
                <input
                  type="text"
                  value={bankFormData.note || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, note: e.target.value })}
                  placeholder="例如：專供斗南廠區零用金撥補、投標押標金專用"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>

              <div className="pt-2 bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bankFormData.isDefault}
                    onChange={(e) => setBankFormData({ ...bankFormData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-[#0066cc] rounded border-stone-300 focus:ring-[#0066cc]"
                  />
                  <span className="font-bold text-stone-800">設為此公司之「主要預設扣款帳戶」</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(bankFormData.isPrivateAccount)}
                    onChange={(e) => setBankFormData({ ...bankFormData, isPrivateAccount: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-stone-300 focus:ring-purple-500"
                  />
                  <span className="font-bold text-purple-900 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>此帳戶為「負責人/個人私人戶頭」(非公司正式公帳戶)</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(bankFormData.isConfidential)}
                    onChange={(e) => setBankFormData({ ...bankFormData, isConfidential: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded border-stone-300 focus:ring-rose-500"
                  />
                  <span className="font-bold text-rose-900 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>設為「機密帳戶 (隱藏屬性)」(查帳或一般權限時自動過濾屏蔽)</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-bold transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveBankModal}
                className="px-4 py-2 rounded-xl bg-[#0066cc] text-white hover:bg-[#0052a3] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {editingBankIndex === null ? '確認新增帳戶' : '儲存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
