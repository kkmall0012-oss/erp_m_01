import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  User, 
  Star, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Briefcase, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  Link2,
  FileSpreadsheet,
  HeartHandshake,
  Gift,
  FileText,
  StickyNote,
  LayoutGrid,
  List,
  Printer,
  Copy,
  Landmark,
  Tag,
  Factory
} from 'lucide-react';
import { 
  Customer, 
  CustomerContactPerson, 
  CustomerEventRecord,
  CompanyProfile, 
  CategoryConfig,
  Transaction,
  TAIWAN_BANKS, 
  PAYMENT_TERMS_OPTIONS, 
  PAYMENT_METHOD_OPTIONS,
  SETTLEMENT_CYCLE_OPTIONS,
  SUPPLIER_CATEGORY_OPTIONS,
  EVENT_CATEGORY_CONFIG,
  validateTaiwanTaxId 
} from '../../types';
import { 
  createCustomerApi, 
  updateCustomerApi, 
  deleteCustomerApi 
} from '../../services/api';
import { ConfirmDialog } from '../ConfirmDialog';
import { CustomerEventModal, PettyCashLinkPayload } from './CustomerEventModal';
import { CustomerEventsSummaryModal } from './CustomerEventsSummaryModal';
import { SupplierDirectoryModal } from './SupplierDirectoryModal';
import { exportSupplierDirectoryToExcel, exportSupplierDirectoryToCsv } from '../../utils/excel';

interface SupplierManagementViewProps {
  customers: Customer[];
  companies: CompanyProfile[];
  activeCompanyId: string;
  transactions?: Transaction[];
  categories?: CategoryConfig[];
  claimants?: string[];
  onAddTransaction?: (data: Omit<Transaction, 'id' | 'createdAt'>) => Transaction;
  onUpdateTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onRefreshCustomers: () => void;
  onSwitchToCustomers?: () => void;
}

export const SupplierManagementView: React.FC<SupplierManagementViewProps> = ({
  customers,
  companies,
  activeCompanyId,
  transactions = [],
  categories = [],
  claimants = [],
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onRefreshCustomers,
  onSwitchToCustomers
}) => {
  // 僅取得廠商身分資料
  const suppliers = useMemo(() => {
    return customers.filter(c => c.isSupplier);
  }, [customers]);

  // 取得所有目前已存在於資料庫中的業務分類（動態合併預設與自訂）
  const allSupplierCategories = useMemo(() => {
    const set = new Set<string>(SUPPLIER_CATEGORY_OPTIONS as readonly string[]);
    suppliers.forEach(s => {
      if (s.supplierCategory && s.supplierCategory.trim()) {
        set.add(s.supplierCategory.trim());
      }
    });
    return Array.from(set);
  }, [suppliers]);

  // 搜尋與業務分類篩選狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyHasBank, setOnlyHasBank] = useState<boolean>(false);
  const [onlyFavorite, setOnlyFavorite] = useState<boolean>(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // 檢視模式切換：列表 (list) 或 卡片 (grid)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      return (localStorage.getItem('supplier_view_mode') as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleToggleViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('supplier_view_mode', mode);
    } catch {}
  };

  // 彈跳視窗狀態
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [taxIdError, setTaxIdError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // 刪除確認
  const [supplierToDelete, setSupplierToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 通訊錄名冊產出彈窗
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);

  // 重要事項/禮金事件彈窗
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CustomerEventRecord | null>(null);
  const [eventTargetSupplier, setEventTargetSupplier] = useState<{ id?: string; name: string; isInsideMainForm: boolean }>({
    name: '',
    isInsideMainForm: true
  });

  // 全廠商禮金與大事紀總表彈窗
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // 獨立快速大事紀檢視彈窗 (指定廠商)
  const [quickEventsSupplier, setQuickEventsSupplier] = useState<Customer | null>(null);

  // 合作廠商預設資料結構
  const [eventToDeleteWithPettyCash, setEventToDeleteWithPettyCash] = useState<{
    event: CustomerEventRecord;
    supplier?: Customer;
    isInsideMainForm: boolean;
  } | null>(null);

  const initialFormData: Customer = {
    id: '',
    name: '',
    shortName: '',
    isIndividual: false,
    supplierCategory: '瀝青砂石 / 建材原料',
    taxId: '',
    representative: '',
    representativeMobile: '',
    secondaryRepresentative: '',
    phone1: '',
    phone2: '',
    fax: '',
    email: '',
    website: '',
    lineId: '',
    postalCode: '',
    address: '',
    shippingAddress: '',
    contacts: [],
    paymentTerm: '銀行匯款 (月結 30 天)',
    bankName: '',
    bankBranch: '',
    bankAccount: '',
    accountName: '',
    businessItems: '',
    isCustomer: false,
    isSupplier: true, // 專屬廠商身分
    favoriteCompanyIds: activeCompanyId !== 'all' ? [activeCompanyId] : [],
    events: [],
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const [formData, setFormData] = useState<Customer>(initialFormData);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // 打開新增合作廠商
  const handleOpenCreateForm = () => {
    const newId = `supp_${Date.now()}`;
    setEditingSupplier(null);
    setFormData({
      ...initialFormData,
      id: newId,
      favoriteCompanyIds: activeCompanyId !== 'all' ? [activeCompanyId] : []
    });
    setCustomCategoryInput('');
    setFormError(null);
    setTaxIdError(null);
    setIsFormOpen(true);
  };

  // 打開編輯合作廠商
  const handleOpenEditForm = (supplier: Customer) => {
    setEditingSupplier(supplier);
    setFormData({
      ...supplier,
      isSupplier: true,
      contacts: supplier.contacts ? [...supplier.contacts] : [],
      favoriteCompanyIds: supplier.favoriteCompanyIds ? [...supplier.favoriteCompanyIds] : [],
      events: supplier.events ? [...supplier.events] : []
    });
    setCustomCategoryInput(
      supplier.supplierCategory && !(SUPPLIER_CATEGORY_OPTIONS as readonly string[]).includes(supplier.supplierCategory)
        ? supplier.supplierCategory
        : ''
    );
    setFormError(null);
    setTaxIdError(null);
    setIsFormOpen(true);
  };

  // 統編檢核
  const handleTaxIdChange = (val: string) => {
    setFormData(prev => ({ ...prev, taxId: val }));
    if (!val.trim()) {
      setTaxIdError(null);
    } else {
      const check = validateTaiwanTaxId(val);
      if (!check.isValid) {
        setTaxIdError(check.error || '統一編號格式不符');
      } else {
        setTaxIdError(null);
      }
    }
  };

  // 常用廠商切換
  const handleToggleFavoriteCompany = async (supplier: Customer, compId: string) => {
    const exists = supplier.favoriteCompanyIds?.includes(compId);
    const newFavs = exists
      ? supplier.favoriteCompanyIds.filter(id => id !== compId)
      : [...(supplier.favoriteCompanyIds || []), compId];

    const updated: Customer = {
      ...supplier,
      favoriteCompanyIds: newFavs,
      updatedAt: Date.now()
    };

    try {
      await updateCustomerApi(updated);
      onRefreshCustomers();
    } catch (err: any) {
      console.error('更新常用標記失敗', err);
    }
  };

  // 複製銀行帳號
  const handleCopyBankAccount = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankId(id);
    showTemporaryFeedback(`已複製匯款帳號：${text}`);
    setTimeout(() => setCopiedBankId(null), 2500);
  };

  const showTemporaryFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // 儲存表單
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('請輸入廠商名稱');
      return;
    }

    if (formData.taxId && formData.taxId.trim()) {
      const check = validateTaiwanTaxId(formData.taxId.trim());
      if (!check.isValid) {
        setTaxIdError(check.error || '統一編號格式不符');
        setFormError('統一編號檢查未通過，請修正後再儲存');
        return;
      }
    }

    // 業務分類處理（若選自訂則帶入輸入框內容）
    const finalCategory = customCategoryInput.trim() || formData.supplierCategory || '其他協力業務';

    setIsSubmitting(true);
    try {
      const payload: Customer = {
        ...formData,
        name: formData.name.trim(),
        shortName: formData.shortName?.trim() || undefined,
        supplierCategory: finalCategory,
        taxId: formData.taxId?.trim() || undefined,
        representative: formData.representative?.trim() || undefined,
        representativeMobile: formData.representativeMobile?.trim() || undefined,
        secondaryRepresentative: formData.secondaryRepresentative?.trim() || undefined,
        phone1: formData.phone1?.trim() || undefined,
        phone2: formData.phone2?.trim() || undefined,
        fax: formData.fax?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        postalCode: formData.postalCode?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        shippingAddress: formData.shippingAddress?.trim() || undefined,
        bankAccount: formData.bankAccount?.trim() || undefined,
        accountName: formData.accountName?.trim() || undefined,
        businessItems: formData.businessItems?.trim() || undefined,
        isSupplier: true, // 確保廠商身分始終為 true
        note: formData.note?.trim() || undefined,
        updatedAt: Date.now()
      };

      if (editingSupplier) {
        await updateCustomerApi(payload);
        showTemporaryFeedback(`合作廠商「${payload.name}」已更新完成！`);
      } else {
        await createCustomerApi(payload);
        showTemporaryFeedback(`合作廠商「${payload.name}」已成功新增！`);
      }

      setIsFormOpen(false);
      onRefreshCustomers();
    } catch (err: any) {
      setFormError(err.message || '儲存失敗，請檢查資料後重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 執行刪除
  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomerApi(supplierToDelete.id);
      showTemporaryFeedback(`合作廠商「${supplierToDelete.name}」已刪除`);
      setSupplierToDelete(null);
      onRefreshCustomers();
    } catch (err: any) {
      alert(`刪除失敗：${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // 表單內新增與編輯重要事項/年節禮盒/禮金
  const handleOpenAddEventInForm = () => {
    setEditingEvent(null);
    setEventTargetSupplier({
      name: formData.name || '此合作廠商',
      isInsideMainForm: true
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventInForm = (evt: CustomerEventRecord) => {
    setEditingEvent(evt);
    setEventTargetSupplier({
      name: formData.name || '此合作廠商',
      isInsideMainForm: true
    });
    setIsEventModalOpen(true);
  };

  const executeDeleteEvent = async (eventId: string, targetSupp?: Customer, isInsideForm?: boolean) => {
    if (isInsideForm) {
      setFormData(prev => ({
        ...prev,
        events: (prev.events || []).filter(e => e.id !== eventId)
      }));
    } else if (targetSupp) {
      const updatedEvents = (targetSupp.events || []).filter(e => e.id !== eventId);
      const updatedSupp: Customer = {
        ...targetSupp,
        events: updatedEvents,
        updatedAt: Date.now()
      };
      try {
        await updateCustomerApi(updatedSupp);
        onRefreshCustomers();
        setQuickEventsSupplier(updatedSupp);
      } catch (err: any) {
        console.error('刪除大事紀失敗', err);
      }
    }
  };

  const handleDeleteEventInForm = (evt: CustomerEventRecord) => {
    if (evt.isPettyCashLinked && evt.voucherNo && onDeleteTransaction) {
      setEventToDeleteWithPettyCash({
        event: evt,
        isInsideMainForm: true
      });
    } else {
      executeDeleteEvent(evt.id, undefined, true);
      showTemporaryFeedback('已刪除該筆重要事項紀錄');
    }
  };

  // 卡片與清單快捷大事紀開啟
  const handleOpenQuickEvents = (s: Customer) => {
    setQuickEventsSupplier(s);
  };

  const handleOpenAddEventForSupplier = (supp: Customer) => {
    setEditingEvent(null);
    setEventTargetSupplier({
      id: supp.id,
      name: supp.name,
      isInsideMainForm: false
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventForSupplier = (supp: Customer, evt: CustomerEventRecord) => {
    setEditingEvent(evt);
    setEventTargetSupplier({
      id: supp.id,
      name: supp.name,
      isInsideMainForm: false
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEventForSupplier = async (supp: Customer, evt: CustomerEventRecord) => {
    if (evt.isPettyCashLinked && evt.voucherNo && onDeleteTransaction) {
      setEventToDeleteWithPettyCash({
        event: evt,
        supplier: supp,
        isInsideMainForm: false
      });
    } else {
      executeDeleteEvent(evt.id, supp, false);
      showTemporaryFeedback(`已刪除「${supp.name}」的該筆重要事項紀錄`);
    }
  };

  // 儲存大事紀 (由 CustomerEventModal 回傳，支援自動建立或連動零用金支出傳票)
  const handleSaveEvent = async (savedEvent: CustomerEventRecord, pettyCashAction?: PettyCashLinkPayload) => {
    let createdVoucherNo: string | undefined = undefined;

    // 1. 若設定為自動由零用金出款，且金額 > 0，且有 onAddTransaction
    if (pettyCashAction?.mode === 'auto_create' && onAddTransaction && savedEvent.hasAmount && savedEvent.amount && savedEvent.amount > 0) {
      const targetName = eventTargetSupplier.name || formData.name || '合作廠商';
      const descItem = `${targetName} - ${savedEvent.eventType || savedEvent.title}`;
      const newTx = onAddTransaction({
        date: savedEvent.date,
        type: 'expense',
        categoryId: pettyCashAction.categoryId,
        categoryName: pettyCashAction.categoryName,
        subItem: descItem,
        amount: savedEvent.amount,
        claimant: pettyCashAction.claimant || savedEvent.ourRepresentative || '廠長',
        receiptType: pettyCashAction.receiptType,
        companyId: pettyCashAction.companyId,
        note: `【系統自動出款 - 廠商大事紀】對象: ${targetName}${savedEvent.targetPerson ? ` (${savedEvent.targetPerson})` : ''} | 事由: ${savedEvent.title}${savedEvent.proofNote ? ` | 憑證: ${savedEvent.proofNote}` : ''}${savedEvent.note ? ` | 備註: ${savedEvent.note}` : ''}`
      });
      createdVoucherNo = newTx.voucherNo;
      savedEvent.isPettyCashLinked = true;
      savedEvent.voucherNo = newTx.voucherNo;
      savedEvent.linkedTransactionId = newTx.id;
      savedEvent.companyId = pettyCashAction.companyId;
    } else if (pettyCashAction?.mode === 'update_linked' && onUpdateTransaction && savedEvent.voucherNo && transactions) {
      if (pettyCashAction.shouldUpdateLinkedTx) {
        const existingTx = transactions.find(t => t.voucherNo === savedEvent.voucherNo || t.id === savedEvent.voucherNo);
        if (existingTx) {
          onUpdateTransaction({
            ...existingTx,
            amount: savedEvent.amount || existingTx.amount,
            date: savedEvent.date || existingTx.date,
            claimant: savedEvent.ourRepresentative || existingTx.claimant,
            companyId: savedEvent.companyId || existingTx.companyId,
            note: `【系統同步更新 - 廠商大事紀】對象: ${eventTargetSupplier.name || formData.name || '合作廠商'}${savedEvent.targetPerson ? ` (${savedEvent.targetPerson})` : ''} | 事由: ${savedEvent.title}${savedEvent.proofNote ? ` | 憑證: ${savedEvent.proofNote}` : ''}${savedEvent.note ? ` | 備註: ${savedEvent.note}` : ''}`
          });
        }
      }
    } else if (pettyCashAction?.mode === 'none') {
      savedEvent.isPettyCashLinked = false;
      savedEvent.voucherNo = undefined;
    }

    if (eventTargetSupplier.isInsideMainForm) {
      setFormData(prev => {
        const currentEvents = prev.events || [];
        const idx = currentEvents.findIndex(e => e.id === savedEvent.id);
        let updatedEvents: CustomerEventRecord[];
        if (idx >= 0) {
          updatedEvents = [...currentEvents];
          updatedEvents[idx] = savedEvent;
        } else {
          updatedEvents = [savedEvent, ...currentEvents];
        }
        updatedEvents.sort((a, b) => b.date.localeCompare(a.date));
        return { ...prev, events: updatedEvents };
      });
      if (createdVoucherNo) {
        showTemporaryFeedback(`🎉 已儲存大事紀，並於公司零用金總帳自動開立支出傳票【${createdVoucherNo}】(NT$ ${savedEvent.amount?.toLocaleString()})！`);
      }
    } else if (eventTargetSupplier.id) {
      const targetSupp = suppliers.find(s => s.id === eventTargetSupplier.id) || quickEventsSupplier;
      if (targetSupp) {
        const currentEvents = targetSupp.events || [];
        const idx = currentEvents.findIndex(e => e.id === savedEvent.id);
        let updatedEvents: CustomerEventRecord[];
        if (idx >= 0) {
          updatedEvents = [...currentEvents];
          updatedEvents[idx] = savedEvent;
        } else {
          updatedEvents = [savedEvent, ...currentEvents];
        }
        updatedEvents.sort((a, b) => b.date.localeCompare(a.date));

        const updatedSupp: Customer = {
          ...targetSupp,
          events: updatedEvents,
          updatedAt: Date.now()
        };

        try {
          await updateCustomerApi(updatedSupp);
          onRefreshCustomers();
          setQuickEventsSupplier(updatedSupp);
          if (createdVoucherNo) {
            showTemporaryFeedback(`🎉 已儲存「${targetSupp.name}」大事紀，並於公司零用金總帳自動開立支出傳票【${createdVoucherNo}】(NT$ ${savedEvent.amount?.toLocaleString()})！`);
          } else {
            showTemporaryFeedback(`已儲存「${targetSupp.name}」的重要事項紀錄！`);
          }
        } catch (err: any) {
          console.error('儲存失敗', err);
        }
      }
    }
  };

  // 篩選廠商名單
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      // 1. 業務分類篩選
      if (selectedCategory !== 'all') {
        if ((s.supplierCategory || '其他協力業務') !== selectedCategory) {
          return false;
        }
      }

      // 2. 僅有銀行帳號篩選
      if (onlyHasBank) {
        if (!s.bankAccount || !s.bankAccount.trim()) return false;
      }

      // 3. 常用廠商篩選
      if (onlyFavorite) {
        if (activeCompanyId !== 'all') {
          if (!s.favoriteCompanyIds?.includes(activeCompanyId)) return false;
        } else {
          if (!s.favoriteCompanyIds || s.favoriteCompanyIds.length === 0) return false;
        }
      }

      // 4. 關鍵字搜尋
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchShort = s.shortName?.toLowerCase().includes(q);
        const matchCategory = s.supplierCategory?.toLowerCase().includes(q);
        const matchTax = s.taxId?.includes(q);
        const matchRep = s.representative?.toLowerCase().includes(q) || s.secondaryRepresentative?.toLowerCase().includes(q);
        const matchPhone = s.phone1?.includes(q) || s.phone2?.includes(q) || s.representativeMobile?.includes(q);
        const matchAddr = s.address?.toLowerCase().includes(q);
        const matchBank = s.bankAccount?.includes(q) || s.bankName?.toLowerCase().includes(q) || s.accountName?.toLowerCase().includes(q);
        const matchContacts = s.contacts?.some(p => p.name?.toLowerCase().includes(q) || p.mobile?.includes(q) || p.title?.toLowerCase().includes(q));
        const matchItems = s.businessItems?.toLowerCase().includes(q);

        if (!matchName && !matchShort && !matchCategory && !matchTax && !matchRep && !matchPhone && !matchAddr && !matchBank && !matchContacts && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [suppliers, selectedCategory, onlyHasBank, onlyFavorite, searchQuery, activeCompanyId]);

  // 業務分類色彩標籤輔助
  const getCategoryColorClass = (cat?: string) => {
    if (!cat) return 'bg-stone-100 text-stone-700 border-stone-200';
    if (cat.includes('瀝青') || cat.includes('砂石') || cat.includes('建材')) {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    if (cat.includes('工程') || cat.includes('發包') || cat.includes('工班')) {
      return 'bg-blue-50 text-blue-800 border-blue-300';
    }
    if (cat.includes('機具') || cat.includes('車輛') || cat.includes('租賃')) {
      return 'bg-orange-50 text-orange-800 border-orange-300';
    }
    if (cat.includes('五金') || cat.includes('材料') || cat.includes('水電')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
    if (cat.includes('運輸') || cat.includes('物流') || cat.includes('吊卡')) {
      return 'bg-indigo-50 text-indigo-800 border-indigo-300';
    }
    if (cat.includes('環保') || cat.includes('安全') || cat.includes('工安')) {
      return 'bg-teal-50 text-teal-800 border-teal-300';
    }
    if (cat.includes('資訊') || cat.includes('事務') || cat.includes('辦公')) {
      return 'bg-slate-50 text-slate-800 border-slate-300';
    }
    if (cat.includes('專業') || cat.includes('委外') || cat.includes('顧問')) {
      return 'bg-purple-50 text-purple-800 border-purple-300';
    }
    return 'bg-stone-100 text-stone-800 border-stone-200';
  };

  // 統計數據
  const totalSuppliersCount = suppliers.length;
  const withBankCount = suppliers.filter(s => s.bankAccount && s.bankAccount.trim()).length;
  const currentFavCount = suppliers.filter(s => 
    activeCompanyId !== 'all' ? s.favoriteCompanyIds?.includes(activeCompanyId) : s.favoriteCompanyIds?.length > 0
  ).length;
  const totalEventsCount = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.events?.length || 0), 0);
  }, [suppliers]);

  return (
    <div className="space-y-6">
      {/* 頂部操作與導覽橫幅 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                <Truck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
                  合作廠商管理
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    業務分類與付款資料
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  協力廠商、供料商與工程外包商專屬名冊，依「建材原料、外包工班、機具租賃、五金水電」等業務分類，掌握銀行匯款帳號及即時產出名冊
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSwitchToCustomers && (
              <button
                type="button"
                onClick={onSwitchToCustomers}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                title="切換至一般客戶名冊管理 (個人/店家屬性)"
              >
                <User className="w-4 h-4 text-indigo-600" />
                <span>切換至客戶名冊</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="檢視所有廠商年節送禮、紅白包禮金與大事紀往來明細"
            >
              <HeartHandshake className="w-4 h-4 text-rose-600" />
              <span>人情禮金總表</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDirectoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="一鍵產出合作廠商通訊名冊 (含銀行帳號、Excel/CSV/列印)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>產出廠商通訊錄</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066cc] text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>新增合作廠商</span>
            </button>
          </div>
        </div>

        {/* 提示回饋 */}
        {feedbackMessage && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center justify-between animate-fade-in font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button 
              onClick={() => setFeedbackMessage(null)} 
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 統計指標看板 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-stone-100">
          <div 
            onClick={() => { setSelectedCategory('all'); setOnlyHasBank(false); setOnlyFavorite(false); }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedCategory === 'all' && !onlyHasBank && !onlyFavorite
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20' 
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
            }`}
          >
            <div className="text-[11px] text-stone-500 font-medium">合作廠商總數</div>
            <div className="text-xl font-bold text-stone-900 mt-0.5">{totalSuppliersCount} <span className="text-xs font-normal text-stone-500">家</span></div>
          </div>

          <div 
            onClick={() => setOnlyHasBank(!onlyHasBank)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              onlyHasBank 
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' 
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
            }`}
          >
            <div className="text-[11px] text-stone-500 font-medium flex items-center justify-between">
              <span>已建立匯款帳號</span>
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-700 mt-0.5">{withBankCount} <span className="text-xs font-normal text-stone-500">家 (可電匯)</span></div>
          </div>

          <div 
            onClick={() => setOnlyFavorite(!onlyFavorite)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              onlyFavorite 
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' 
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100/70'
            }`}
          >
            <div className="text-[11px] text-stone-500 font-medium flex items-center justify-between">
              <span>常用配合廠商</span>
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-0.5">{currentFavCount} <span className="text-xs font-normal text-stone-500">家</span></div>
          </div>

          <div 
            onClick={() => setIsSummaryModalOpen(true)}
            className="p-3 rounded-xl border bg-rose-50/50 border-rose-200 hover:bg-rose-100/60 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="text-[11px] text-rose-800 font-medium flex items-center justify-between">
              <span>年節送禮與禮金</span>
              <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-700 mt-0.5">{totalEventsCount} <span className="text-xs font-normal text-stone-500">筆往來</span></div>
          </div>

          <div 
            onClick={() => setIsDirectoryModalOpen(true)}
            className="p-3 rounded-xl border bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100/60 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-between">
              <span>通訊名冊與付款表</span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
              <span>一鍵產出報表</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 搜尋與所屬業務分類標籤列 (依照業務做分類方便尋找) */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-3">
        {/* 搜尋列與檢視切換 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋廠商全名、統編、負責人、電話、銀行帳號、主要供應原料工法..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* 檢視模式切換 */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex p-1 bg-stone-100 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => handleToggleViewMode('list')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="高密度列表式檢視"
              >
                <List className="w-3.5 h-3.5" />
                <span>列表</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'grid'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="現代卡片式檢視"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>卡片</span>
              </button>
            </div>
          </div>
        </div>

        {/* 業務分類篩選標籤 (核心分類功能) */}
        <div>
          <div className="text-[11px] font-bold text-stone-500 mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>依照所屬業務分類篩選：</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              全部業務類別 ({totalSuppliersCount})
            </button>

            {allSupplierCategories.map(cat => {
              const count = suppliers.filter(s => (s.supplierCategory || '其他協力業務') === cat).length;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : `${getCategoryColorClass(cat)} hover:opacity-90`
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/25 text-white' : 'bg-black/5 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 合作廠商清單展示區 */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <Truck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">查無符合條件的合作廠商</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'all' || onlyHasBank || onlyFavorite
              ? '找不到符合篩選條件的廠商，請嘗試清除關鍵字或切換其他業務分類。'
              : '目前尚未建立合作廠商資料，請點擊上方「新增合作廠商」開始建檔。'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {(searchQuery || selectedCategory !== 'all' || onlyHasBank || onlyFavorite) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setOnlyHasBank(false);
                  setOnlyFavorite(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 transition-colors cursor-pointer"
              >
                重設所有篩選
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              + 新增第一家廠商
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ================= 模式 1：高密度列表模式 ================= */
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/90 text-stone-600 border-b border-stone-200 select-none">
                <tr>
                  <th className="py-3 px-3.5 font-bold w-12 text-center">常用</th>
                  <th className="py-3 px-3 font-bold w-36">所屬業務分類</th>
                  <th className="py-3 px-3 font-bold">廠商全名 / 簡稱</th>
                  <th className="py-3 px-3 font-bold w-28">統一編號</th>
                  <th className="py-3 px-3 font-bold w-32">負責人 / 主管</th>
                  <th className="py-3 px-3 font-bold w-36">電話 / 手機</th>
                  <th className="py-3 px-3 font-bold w-44">付款條件 / 票期</th>
                  <th className="py-3 px-3 font-bold w-48">往來銀行 / 匯款帳號</th>
                  <th className="py-3 px-3 font-bold text-center w-36">大事紀 / 禮金</th>
                  <th className="py-3 px-3 font-bold text-center w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {filteredSuppliers.map((supplier) => {
                  const isFav = activeCompanyId !== 'all' 
                    ? supplier.favoriteCompanyIds?.includes(activeCompanyId)
                    : supplier.favoriteCompanyIds?.length > 0;
                  const catClass = getCategoryColorClass(supplier.supplierCategory);

                  return (
                    <tr 
                      key={supplier.id}
                      className="hover:bg-emerald-50/30 transition-colors group"
                    >
                      {/* 常用標記 */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFavoriteCompany(
                            supplier, 
                            activeCompanyId !== 'all' ? activeCompanyId : 'comp_1'
                          )}
                          className="text-stone-300 hover:text-amber-400 cursor-pointer p-0.5 transition-colors"
                          title={isFav ? '點擊取消常用' : '設為常用配合廠商'}
                        >
                          <Star className={`w-4 h-4 ${isFav ? 'text-amber-500 fill-amber-400' : ''}`} />
                        </button>
                      </td>

                      {/* 業務分類標籤 */}
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${catClass}`}>
                          {supplier.supplierCategory || '其他協力業務'}
                        </span>
                      </td>

                      {/* 廠商名稱 */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900 group-hover:text-emerald-800 transition-colors flex items-center gap-1.5">
                          <span>{supplier.name}</span>
                          {supplier.isCustomer && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium" title="該廠商同時也是我方客戶">
                              兼客戶
                            </span>
                          )}
                        </div>
                        {supplier.shortName && (
                          <div className="text-[11px] text-stone-500 font-medium">簡稱：{supplier.shortName}</div>
                        )}
                        {supplier.businessItems && (
                          <div className="text-[11px] text-stone-500 truncate max-w-xs mt-0.5">
                            品項：{supplier.businessItems}
                          </div>
                        )}
                      </td>

                      {/* 統一編號 */}
                      <td className="py-3 px-3 font-mono">
                        {supplier.taxId ? (
                          <span className="font-bold text-stone-800">{supplier.taxId}</span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">無統編</span>
                        )}
                      </td>

                      {/* 負責人 / 主管 */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-stone-900">{supplier.representative || '—'}</div>
                        {supplier.secondaryRepresentative && (
                          <div className="text-[11px] text-stone-500">副/工務：{supplier.secondaryRepresentative}</div>
                        )}
                      </td>

                      {/* 電話 */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {supplier.representativeMobile && (
                          <div className="font-medium text-stone-900">{supplier.representativeMobile}</div>
                        )}
                        {supplier.phone1 && (
                          <div className="text-stone-500">{supplier.phone1}</div>
                        )}
                        {!supplier.representativeMobile && !supplier.phone1 && (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* 付款條件 */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] border border-stone-200">
                          {supplier.paymentTerm || '一般請款'}
                        </span>
                      </td>

                      {/* 銀行帳號 */}
                      <td className="py-3 px-3">
                        {supplier.bankAccount ? (
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-medium text-stone-700">
                              {supplier.bankName} {supplier.bankBranch}
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700">
                              <span>{supplier.bankAccount}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyBankAccount(supplier.bankAccount!, supplier.id)}
                                className="p-0.5 text-stone-400 hover:text-blue-700 cursor-pointer"
                                title="一鍵複製匯款帳號"
                              >
                                {copiedBankId === supplier.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {supplier.accountName && (
                              <div className="text-[10px] text-stone-500">戶名：{supplier.accountName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">未設定帳號</span>
                        )}
                      </td>

                      {/* 大事紀 / 人情禮金 */}
                      <td className="py-3 px-3 text-center">
                        {supplier.events && supplier.events.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenQuickEvents(supplier)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold transition-colors cursor-pointer"
                              title="點擊查看所有送禮與人情往來紀錄"
                            >
                              <HeartHandshake className="w-3.5 h-3.5" />
                              <span>{supplier.events.length} 筆</span>
                            </button>
                            <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                              {supplier.events[0]?.title}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAddEventForSupplier(supplier)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="登記年節送禮或人情禮金"
                          >
                            <Plus className="w-3 h-3" />
                            <span>登記禮金</span>
                          </button>
                        )}
                      </td>

                      {/* 操作 */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(supplier)}
                            className="p-1.5 text-stone-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="編輯合作廠商"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSupplierToDelete({ id: supplier.id, name: supplier.name })}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="刪除廠商資料"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= 模式 2：現代卡片模式 ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const isFav = activeCompanyId !== 'all' 
              ? supplier.favoriteCompanyIds?.includes(activeCompanyId)
              : supplier.favoriteCompanyIds?.length > 0;
            const catClass = getCategoryColorClass(supplier.supplierCategory);

            return (
              <div 
                key={supplier.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* 卡片頂部：分類標籤與常用星號 */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${catClass}`}>
                      {supplier.supplierCategory || '其他協力業務'}
                    </span>

                    <div className="flex items-center gap-1">
                      {supplier.isCustomer && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                          兼客戶
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleFavoriteCompany(
                          supplier, 
                          activeCompanyId !== 'all' ? activeCompanyId : 'comp_1'
                        )}
                        className="text-stone-300 hover:text-amber-400 cursor-pointer p-0.5 transition-colors"
                        title={isFav ? '點擊取消常用' : '設為常用配合廠商'}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'text-amber-500 fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* 廠商全名 */}
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                    {supplier.name}
                  </h3>

                  {/* 統一編號與負責人 */}
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                    {supplier.taxId && (
                      <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-700 font-medium">
                        統編: {supplier.taxId}
                      </span>
                    )}
                    {supplier.representative && (
                      <span>負責人: <span className="font-semibold text-stone-800">{supplier.representative}</span></span>
                    )}
                  </div>

                  {/* 營業項目/供應內容 */}
                  {supplier.businessItems && (
                    <div className="mt-2.5 p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs text-stone-600 line-clamp-2">
                      <span className="font-bold text-stone-700">供應品項：</span>
                      {supplier.businessItems}
                    </div>
                  )}

                  {/* 聯絡電話與地址 */}
                  <div className="mt-3 space-y-1 text-xs text-stone-600">
                    {(supplier.phone1 || supplier.representativeMobile) && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-mono">{supplier.representativeMobile || supplier.phone1}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-stone-500">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{supplier.address}</span>
                      </div>
                    )}
                  </div>

                  {/* 銀行帳號與付款條件區塊 */}
                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">付款條件：</span>
                      <span className="font-medium text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                        {supplier.paymentTerm || '一般請款'}
                      </span>
                    </div>

                    {supplier.bankAccount ? (
                      <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
                        <div className="text-[11px] text-blue-900 font-medium">
                          {supplier.bankName} {supplier.bankBranch}
                        </div>
                        <div className="flex items-center justify-between font-mono font-bold text-blue-800 mt-0.5">
                          <span>{supplier.bankAccount}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyBankAccount(supplier.bankAccount!, supplier.id)}
                            className="p-1 hover:bg-blue-100 rounded text-blue-700 cursor-pointer"
                            title="複製帳號"
                          >
                            {copiedBankId === supplier.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {supplier.accountName && (
                          <div className="text-[10px] text-blue-700/80 mt-0.5">戶名：{supplier.accountName}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-stone-400 italic">尚未填寫銀行匯款資料</div>
                    )}
                  </div>

                  {/* 大事紀與年節送禮預覽 */}
                  {supplier.events && supplier.events.length > 0 && (() => {
                    const evts = supplier.events;
                    const moneyTotal = evts.reduce((sum, e) => (e.hasAmount && e.amount ? sum + (e.direction === 'incoming' ? e.amount : -e.amount) : sum), 0);
                    return (
                      <div className="mt-3 pt-2.5 border-t border-stone-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEvents(supplier)}
                            className="text-[11px] font-bold text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
                            <span>大事紀與禮金 ({evts.length} 筆)</span>
                          </button>
                          {moneyTotal !== 0 && (
                            <span className="text-[10px] font-mono font-bold text-stone-600">
                              淨額: NT$ {moneyTotal.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {evts.slice(0, 2).map((ev, i) => (
                            <span key={ev.id || i} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50/70 border border-rose-100 text-stone-700 flex items-center gap-1">
                              <span className="text-stone-400 font-mono">{ev.date.substring(5)}</span>
                              <span className="font-medium text-stone-800 truncate max-w-[120px]">{ev.title}</span>
                              {ev.amount ? <span className="font-mono text-rose-600 font-bold">${ev.amount}</span> : null}
                            </span>
                          ))}
                          {evts.length > 2 && (
                            <span className="text-[10px] text-stone-400 self-center">
                              +{evts.length - 2} 筆
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 卡片底部操作列 */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-[11px] text-stone-500">
                    {supplier.contacts?.length > 0 ? (
                      <span>{supplier.contacts.length} 位聯絡窗口</span>
                    ) : (
                      <span>無聯絡窗口</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickEvents(supplier)}
                      className="px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer flex items-center gap-1"
                      title="檢視/登記此廠商之大事紀與送禮紀錄"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>大事紀 ({supplier.events?.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditForm(supplier)}
                      className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupplierToDelete({ id: supplier.id, name: supplier.name })}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="刪除"
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

      {/* ========================================================================= */}
      {/* 新增 / 編輯合作廠商 Modal */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-3xl overflow-hidden animate-scale-in">
            {/* Modal 頂部標題 */}
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    {editingSupplier ? '編輯合作廠商資料' : '新增合作廠商'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    協力廠商與外包商專屬主檔，包含業務分類、台灣統編、付款條件及銀行電匯帳戶
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal 表單內容 */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. 所屬業務分類 (核心欄位) */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-700" />
                  <span>廠商所屬業務分類 (依業務性質歸類，方便即時尋找) *</span>
                </label>

                {/* 快速推薦分類標籤 */}
                <div className="flex flex-wrap gap-1.5">
                  {SUPPLIER_CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, supplierCategory: opt }));
                        setCustomCategoryInput('');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer border ${
                        formData.supplierCategory === opt && !customCategoryInput
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* 或手動輸入其他自訂分類 */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-stone-500 font-medium shrink-0">或自訂業務類別：</span>
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => {
                      setCustomCategoryInput(e.target.value);
                      if (e.target.value.trim()) {
                        setFormData(prev => ({ ...prev, supplierCategory: e.target.value.trim() }));
                      }
                    }}
                    placeholder="例如：高空吊掛作業、特殊防腐漆施作..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 2. 廠商基本資訊 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    廠商全名 / 公司行號名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如：三興瀝青柏油實業股份有限公司"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    廠商簡稱 / 代號 (選填)
                  </label>
                  <input
                    type="text"
                    value={formData.shortName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                    placeholder="例如：三興瀝青"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                    <span>統一編號 (8 碼，選填)</span>
                    {taxIdError && <span className="text-rose-600 font-normal">{taxIdError}</span>}
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={formData.taxId || ''}
                    onChange={(e) => handleTaxIdChange(e.target.value)}
                    placeholder="例如：84561234"
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono focus:ring-2 focus:ring-emerald-500 ${
                      taxIdError ? 'border-rose-400 bg-rose-50/40' : 'border-stone-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    負責人 / 代表人姓名
                  </label>
                  <input
                    type="text"
                    value={formData.representative || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, representative: e.target.value }))}
                    placeholder="例如：王興發"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    負責人手機
                  </label>
                  <input
                    type="text"
                    value={formData.representativeMobile || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, representativeMobile: e.target.value }))}
                    placeholder="例如：0932-888-999"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    公司代表電話 / 市話
                  </label>
                  <input
                    type="text"
                    value={formData.phone1 || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone1: e.target.value }))}
                    placeholder="例如：03-386-7788"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    傳真號碼 (選填)
                  </label>
                  <input
                    type="text"
                    value={formData.fax || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value }))}
                    placeholder="例如：03-386-7799"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    電子信箱 (選填)
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="例如：service@sanxing.com.tw"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 3. 地址資訊 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  營業 / 通訊地址
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="例如：桃園市大園區中正東路三段500號"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* 4. 主要營業項目與供應物料 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  主要供應品項 / 施作工法說明
                </label>
                <textarea
                  rows={2}
                  value={formData.businessItems || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessItems: e.target.value }))}
                  placeholder="例如：熱拌瀝青混凝土、再生瀝青配比、乳化瀝青、粗細級配骨材直送案場"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* 5. 配合付款途徑與銀行匯款資料 (出納付款依據) */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <span>配合付款方式與銀行帳戶 (出納核銷付款依據)</span>
                  </h4>
                  <span className="text-[11px] text-stone-500">
                    主要支付途徑 (電匯/現金/支票) 與結算票期
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-stone-700">
                    主要付款途徑 (點擊快速切換)：
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: '銀行匯款', label: '銀行電匯', icon: '🏦' },
                      { key: '現金支付', label: '現金結清', icon: '💵' },
                      { key: '開立支票', label: '開立支票', icon: '📝' },
                      { key: '其他 / 依合約', label: '其他 / 依合約', icon: '📋' }
                    ].map(method => {
                      const currentTerm = formData.paymentTerm || '';
                      const isSelected = method.key === '其他 / 依合約'
                        ? (!currentTerm.includes('匯款') && !currentTerm.includes('現金') && !currentTerm.includes('支票') && !currentTerm.includes('票') && currentTerm.length > 0)
                        : currentTerm.includes(method.key.substring(0, 2));
                      return (
                        <button
                          key={method.key}
                          type="button"
                          onClick={() => {
                            const match = currentTerm.match(/\((.+)\)/);
                            const existingCycle = match ? match[1] : '';
                            if (method.key === '現金支付') {
                              setFormData(prev => ({
                                ...prev,
                                paymentTerm: existingCycle ? `現金支付 (${existingCycle})` : '現金支付 (現場付現)'
                              }));
                            } else if (method.key === '開立支票') {
                              setFormData(prev => ({
                                ...prev,
                                paymentTerm: existingCycle ? `開立支票 (${existingCycle})` : '開立支票 (月結 60 天期票)'
                              }));
                            } else if (method.key === '銀行匯款') {
                              setFormData(prev => ({
                                ...prev,
                                paymentTerm: existingCycle ? `銀行匯款 (${existingCycle})` : '銀行匯款 (次月 25 號電匯)'
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                paymentTerm: existingCycle ? `其他 (${existingCycle})` : '其他 / 依合約進度'
                              }));
                            }
                          }}
                          className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span>{method.icon}</span>
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 快捷結算週期標籤 */}
                  <div className="pt-1">
                    <span className="text-[11px] text-stone-500 font-medium mr-1.5">快捷結算週期：</span>
                    <div className="inline-flex flex-wrap gap-1.5 mt-1">
                      {[
                        '次月 25 號電匯',
                        '次月 15 號放款',
                        '月結 30 天期票',
                        '月結 60 天期票',
                        '貨到現結 / 現場付現',
                        '驗收合格付款',
                        '依工程合約'
                      ].map(cycle => (
                        <button
                          key={cycle}
                          type="button"
                          onClick={() => {
                            let prefix = '銀行匯款';
                            const current = formData.paymentTerm || '';
                            if (current.includes('現金')) prefix = '現金支付';
                            else if (current.includes('支票') || current.includes('票')) prefix = '開立支票';
                            else if (current.includes('其他')) prefix = '其他';
                            setFormData(prev => ({
                              ...prev,
                              paymentTerm: `${prefix} (${cycle})`
                            }));
                          }}
                          className="px-2 py-0.5 rounded text-[11px] bg-white border border-stone-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-stone-600 transition-colors cursor-pointer"
                        >
                          {cycle}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 自訂/確認的付款條件說明 */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      付款方式與結算說明 (可自由修改或填寫備註)：
                    </label>
                    <input
                      type="text"
                      value={formData.paymentTerm || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentTerm: e.target.value }))}
                      placeholder="例如：銀行匯款 (次月 25 號電匯) 或 開立支票 (月結 60 天期票)"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white font-medium text-stone-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* 銀行帳號資料 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-200/80">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      往來銀行名稱
                    </label>
                    <input
                      type="text"
                      list="taiwan_banks_list"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="例如：005 臺灣土地銀行"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <datalist id="taiwan_banks_list">
                      {TAIWAN_BANKS.map(b => (
                        <option key={b.code} value={`${b.code} ${b.name}`} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      分行名稱
                    </label>
                    <input
                      type="text"
                      value={formData.bankBranch || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                      placeholder="例如：大園分行"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      匯款帳號 (可加分行代碼)
                    </label>
                    <input
                      type="text"
                      value={formData.bankAccount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                      placeholder="例如：005-098-7654321"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      匯款戶名 (請填寫存摺一致戶名)
                    </label>
                    <input
                      type="text"
                      value={formData.accountName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="例如：三興瀝青柏油實業股份有限公司"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 6. 重要事項與交際禮金紀錄 (大事紀) */}
              <div className="p-4 bg-stone-50/70 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-stone-900 text-xs">
                      大事紀與交際禮金紀錄 (送禮/年節/紅白包/重大備忘)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddEventInForm}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] transition-colors cursor-pointer border border-rose-200"
                  >
                    <Plus className="w-3 h-3" />
                    <span>新增大事紀 / 禮金</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  記錄廠商年節送來之禮盒（收禮）、我方致贈禮品、負責人紅白包禮金或重大合作協議，人情往來帳目清楚備查。
                </p>

                {formData.events && formData.events.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {formData.events.map((evt, idx) => {
                      const conf = EVENT_CATEGORY_CONFIG[evt.category] || EVENT_CATEGORY_CONFIG.other;
                      return (
                        <div
                          key={evt.id || idx}
                          className="p-3 bg-white rounded-lg border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] font-semibold text-stone-500">
                                {evt.date}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${conf.badgeBg} ${conf.badgeText}`}>
                                {evt.eventType || conf.shortLabel}
                              </span>
                              <span className="font-bold text-stone-900">
                                {evt.title}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                              {evt.targetPerson && (
                                <span>對象: <strong className="text-stone-700">{evt.targetPerson}</strong></span>
                              )}
                              {evt.ourRepresentative && (
                                <span>我方窗口: <strong className="text-stone-700">{evt.ourRepresentative}</strong></span>
                              )}
                              {evt.proofNote && (
                                <span className="text-stone-600 bg-stone-100 px-1.5 py-0.2 rounded text-[10px]">
                                  {evt.proofNote}
                                </span>
                              )}
                              {evt.note && (
                                <span className="italic text-stone-500">「{evt.note}」</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                            {evt.hasAmount && evt.amount !== undefined ? (
                              <div className="text-left sm:text-right">
                                <span className={`font-mono font-bold text-xs ${
                                  evt.direction === 'incoming' ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {evt.direction === 'incoming' ? '+NT$ (收) ' : 'NT$ (付) '}
                                  {evt.amount.toLocaleString()}
                                </span>
                                {evt.isPettyCashLinked && (
                                  <span className="block text-[9px] text-blue-700 font-medium bg-blue-50 px-1 rounded border border-blue-200 mt-0.5">
                                    {evt.voucherNo ? `零用金 ${evt.voucherNo}` : '零用金已列支'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                純記事
                              </span>
                            )}

                            <div className="flex items-center gap-1 border-l border-stone-200 pl-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditEventInForm(evt)}
                                className="p-1 text-stone-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                title="編輯"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEventInForm(evt)}
                                className="p-1 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                title="刪除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-white border border-dashed border-stone-200 text-center text-stone-400 text-xs">
                    尚無重要事項或年節送禮紀錄，點擊上方「+ 新增大事紀 / 禮金」可登記年節禮盒或人情往來。
                  </div>
                )}
              </div>

              {/* 7. 客戶雙重身分核取 */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900">雙向商業合作標記</span>
                  <p className="text-[11px] text-indigo-700">此合作廠商同時也是我方工程或材料客戶（兼具客戶身分）</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCustomer}
                    onChange={(e) => setFormData(prev => ({ ...prev, isCustomer: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* 7. 補充備註 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  廠商備註說明
                </label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="補充合作備忘、叫料調度窗口、假日配合度等紀錄"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Modal 底部按鈕 */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>儲存中...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingSupplier ? '儲存變更' : '建立合作廠商'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 刪除確認彈窗 */}
      <ConfirmDialog
        isOpen={!!supplierToDelete}
        title="確認刪除合作廠商資料？"
        message={`確定要永久刪除合作廠商「${supplierToDelete?.name}」嗎？此操作將同步移除該廠商所有的銀行與聯絡人資料。`}
        confirmText={isDeleting ? '刪除中...' : '確認刪除'}
        confirmButtonColor="bg-rose-600 hover:bg-rose-700"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSupplierToDelete(null)}
      />

      {/* 合作廠商通訊錄產出彈窗 (Excel / CSV / 列印) */}
      <SupplierDirectoryModal
        isOpen={isDirectoryModalOpen}
        onClose={() => setIsDirectoryModalOpen(false)}
        customers={customers}
        companies={companies}
        activeCompanyId={activeCompanyId}
      />

      {/* 獨立快速大事紀檢視/新增彈窗 (從廠商卡片或清單一鍵開啟) */}
      {quickEventsSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <HeartHandshake className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {quickEventsSupplier.name} - 大事紀與年節送禮往來
                  </h3>
                  <p className="text-xs text-stone-500">
                    {quickEventsSupplier.taxId ? `統編: ${quickEventsSupplier.taxId} | ` : ''}
                    業務分類: {quickEventsSupplier.supplierCategory || '其他'} | 負責人: {quickEventsSupplier.representative || '未填'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEventsSupplier(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">送禮與人情往來紀錄清單</span>
                <button
                  type="button"
                  onClick={() => handleOpenAddEventForSupplier(quickEventsSupplier)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增大事紀 / 禮金</span>
                </button>
              </div>

              {/* 列表 */}
              {quickEventsSupplier.events && quickEventsSupplier.events.length > 0 ? (
                <div className="space-y-2.5">
                  {quickEventsSupplier.events.map((evt) => {
                    const conf = EVENT_CATEGORY_CONFIG[evt.category] || EVENT_CATEGORY_CONFIG.other;
                    return (
                      <div
                        key={evt.id}
                        className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-semibold text-stone-500">
                              {evt.date}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full border text-[10px] font-bold ${conf.badgeBg} ${conf.badgeText}`}>
                              {evt.eventType || conf.shortLabel}
                            </span>
                            <span className="font-bold text-stone-900 text-xs">
                              {evt.title}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                            {evt.targetPerson && (
                              <span>對象: <strong className="text-stone-700">{evt.targetPerson}</strong></span>
                            )}
                            {evt.ourRepresentative && (
                              <span>我方出席: <strong className="text-stone-700">{evt.ourRepresentative}</strong></span>
                            )}
                            {evt.proofNote && (
                              <span className="text-stone-600 bg-white px-1.5 py-0.2 rounded border border-stone-200 text-[10px]">
                                {evt.proofNote}
                              </span>
                            )}
                            {evt.note && (
                              <span className="italic text-stone-500">「{evt.note}」</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/50">
                          {evt.hasAmount && evt.amount !== undefined ? (
                            <div className="text-left sm:text-right">
                              <span className={`font-mono font-bold text-xs ${
                                evt.direction === 'incoming' ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {evt.direction === 'incoming' ? '+NT$ (收) ' : 'NT$ (付) '}
                                {evt.amount.toLocaleString()}
                              </span>
                              {evt.isPettyCashLinked && (
                                <span className="block text-[9px] text-blue-700 font-medium bg-blue-50 px-1 rounded border border-blue-200 mt-0.5">
                                  {evt.voucherNo ? `零用金 ${evt.voucherNo}` : '零用金已列支'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                              純記事
                            </span>
                          )}

                          <div className="flex items-center gap-1 border-l border-stone-200 pl-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditEventForSupplier(quickEventsSupplier, evt)}
                              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="編輯此筆"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEventForSupplier(quickEventsSupplier, evt)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="刪除此筆"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-stone-400 border border-dashed border-stone-200 rounded-xl space-y-2">
                  <HeartHandshake className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs">尚無任何大事紀或送禮/紅包紀錄</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddEventForSupplier(quickEventsSupplier)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
                  >
                    + 立即為「{quickEventsSupplier.name}」登記一筆
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-stone-200 bg-stone-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setQuickEventsSupplier(null)}
                className="px-4 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯個別大事紀/禮金彈窗 (支援由零用金自動開立支出傳票) */}
      <CustomerEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        editingEvent={editingEvent}
        customerName={eventTargetSupplier.name}
        companies={companies}
        activeCompanyId={activeCompanyId}
        categories={categories}
        claimants={claimants}
        transactions={transactions}
      />

      {/* 刪除含零用金傳票連動大事紀確認對話框 */}
      {eventToDeleteWithPettyCash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3 text-amber-600">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-stone-900">大事紀與零用金連動提示</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              此紀錄「<strong className="text-stone-900">{eventToDeleteWithPettyCash.event.title}</strong>」已關聯公司零用金支出傳票【<strong className="text-blue-700 font-mono">{eventToDeleteWithPettyCash.event.voucherNo}</strong>】(金額 NT$ {eventToDeleteWithPettyCash.event.amount?.toLocaleString()})。
              <br /><br />
              請問您希望如何處理這筆零用金帳本中的支出傳票？
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTransaction && eventToDeleteWithPettyCash.event.voucherNo) {
                    onDeleteTransaction(eventToDeleteWithPettyCash.event.voucherNo);
                  }
                  executeDeleteEvent(
                    eventToDeleteWithPettyCash.event.id,
                    eventToDeleteWithPettyCash.supplier,
                    eventToDeleteWithPettyCash.isInsideMainForm
                  );
                  const voucher = eventToDeleteWithPettyCash.event.voucherNo;
                  setEventToDeleteWithPettyCash(null);
                  showTemporaryFeedback(`已刪除大事紀，並同步自零用金帳本刪除傳票 ${voucher}`);
                }}
                className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>🗑️ 同步刪除零用金帳本支出傳票 (推薦)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  executeDeleteEvent(
                    eventToDeleteWithPettyCash.event.id,
                    eventToDeleteWithPettyCash.supplier,
                    eventToDeleteWithPettyCash.isInsideMainForm
                  );
                  setEventToDeleteWithPettyCash(null);
                  showTemporaryFeedback(`已刪除大事紀（零用金傳票仍保留於帳本中）`);
                }}
                className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                📄 僅刪除大事紀 (保留零用金傳票)
              </button>
              <button
                type="button"
                onClick={() => setEventToDeleteWithPettyCash(null)}
                className="w-full py-2 px-3 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-xs transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全廠商年節禮盒與人情往來總表 */}
      <CustomerEventsSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        customers={suppliers}
        activeCompanyName="合作廠商專區"
      />
    </div>
  );
};
