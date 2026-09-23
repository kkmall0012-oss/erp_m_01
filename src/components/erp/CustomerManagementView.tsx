import React, { useState, useMemo } from 'react';
import { 
  Users2, 
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
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  LayoutGrid,
  List,
  Printer,
  Truck,
  Store,
  Tag
} from 'lucide-react';
import { 
  Customer, 
  CustomerContactPerson, 
  CustomerEventRecord,
  CustomerEventCategory,
  EVENT_CATEGORY_CONFIG,
  CompanyProfile, 
  TAIWAN_BANKS, 
  PAYMENT_TERMS_OPTIONS, 
  CUSTOMER_CATEGORY_OPTIONS,
  SUPPLIER_CATEGORY_OPTIONS,
  validateTaiwanTaxId 
} from '../../types';
import { 
  createCustomerApi, 
  updateCustomerApi, 
  deleteCustomerApi 
} from '../../services/api';
import { ConfirmDialog } from '../ConfirmDialog';
import { CustomerEventModal } from './CustomerEventModal';
import { CustomerEventsSummaryModal } from './CustomerEventsSummaryModal';
import { SupplierDirectoryModal } from './SupplierDirectoryModal';

interface CustomerManagementViewProps {
  customers: Customer[];
  companies: CompanyProfile[];
  activeCompanyId: string;
  onRefreshCustomers: () => void;
  onSelectCustomer?: (customer: Customer) => void;
  onSwitchToSuppliers?: () => void;
}

export const CustomerManagementView: React.FC<CustomerManagementViewProps> = ({
  customers,
  companies,
  activeCompanyId,
  onRefreshCustomers,
  onSwitchToSuppliers
}) => {
  // 僅取得客戶身分之資料（若被設為純廠商 isCustomer === false 則由廠商管理模組專責）
  const customerList = useMemo(() => {
    return customers.filter(c => c.isCustomer !== false);
  }, [customers]);

  // 篩選與搜尋狀態 - 區分個人客戶、店家行號、公司企業法人
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'store' | 'corporate' | 'supplier' | 'favorite'>('all');
  const [favoriteFilterCompanyId, setFavoriteFilterCompanyId] = useState<string>(
    activeCompanyId !== 'all' ? activeCompanyId : 'all'
  );
  // 檢視模式切換：卡片 (grid) 或 列表 (list)，預設記住使用者偏好
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('customer_view_mode') as 'grid' | 'list') || 'list';
    } catch {
      return 'list';
    }
  });

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('customer_view_mode', mode);
    } catch {}
  };

  // 編輯/新增表單狀態
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [taxIdError, setTaxIdError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // 刪除確認彈窗
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 禮金與重要事項加總分析總表彈窗
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // 合作廠商通訊錄產出與預覽彈窗
  const [isSupplierDirectoryModalOpen, setIsSupplierDirectoryModalOpen] = useState(false);

  // 個別重要事項/禮金新增與編輯彈窗
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CustomerEventRecord | null>(null);
  const [eventTargetCustomer, setEventTargetCustomer] = useState<{ id?: string; name: string; isInsideMainForm: boolean }>({
    name: '',
    isInsideMainForm: true
  });

  // 卡片上的快速重要大事對話框
  const [quickEventsCustomer, setQuickEventsCustomer] = useState<Customer | null>(null);

  // 表單資料初始預設值
  const initialFormData: Customer = {
    id: '',
    name: '',
    shortName: '',
    isIndividual: false,
    customerCategory: '公司企業法人',
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
    isCustomer: true,
    isSupplier: false,
    favoriteCompanyIds: activeCompanyId !== 'all' ? [activeCompanyId] : [],
    events: [],
    note: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const [formData, setFormData] = useState<Customer>(initialFormData);

  // 打開新增表單
  const handleOpenCreateForm = () => {
    const newId = `cust_${Date.now()}`;
    setEditingCustomer(null);
    setFormData({
      ...initialFormData,
      id: newId,
      favoriteCompanyIds: activeCompanyId !== 'all' ? [activeCompanyId] : [],
      events: []
    });
    setFormError(null);
    setTaxIdError(null);
    setIsFormOpen(true);
  };

  // 打開編輯表單
  const handleOpenEditForm = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      ...c,
      customerCategory: c.customerCategory || (c.isIndividual ? '個人客戶' : '公司企業法人'),
      supplierCategory: c.supplierCategory || '瀝青砂石 / 建材原料',
      contacts: c.contacts ? [...c.contacts] : [],
      favoriteCompanyIds: c.favoriteCompanyIds ? [...c.favoriteCompanyIds] : [],
      events: c.events ? [...c.events] : []
    });
    setFormError(null);
    setTaxIdError(null);
    setIsFormOpen(true);
  };

  // 統一編號欄位變更時進行加權檢查
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

  // 聯絡人增減管理
  const handleAddContact = () => {
    const newPerson: CustomerContactPerson = {
      id: `ct_${Date.now()}`,
      name: '',
      title: '',
      mobile: '',
      phone: '',
      email: '',
      lineId: '',
      note: ''
    };
    setFormData(prev => ({
      ...prev,
      contacts: [...(prev.contacts || []), newPerson]
    }));
  };

  const handleUpdateContact = (index: number, field: keyof CustomerContactPerson, val: string) => {
    setFormData(prev => {
      const updated = [...(prev.contacts || [])];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, contacts: updated };
    });
  };

  const handleRemoveContact = (index: number) => {
    setFormData(prev => {
      const updated = [...(prev.contacts || [])];
      updated.splice(index, 1);
      return { ...prev, contacts: updated };
    });
  };

  // 快速切換特定公司的常用客戶 (在名單上一鍵點擊星號)
  const handleToggleFavoriteCompany = async (customer: Customer, compId: string) => {
    const exists = customer.favoriteCompanyIds?.includes(compId);
    const newFavs = exists
      ? customer.favoriteCompanyIds.filter(id => id !== compId)
      : [...(customer.favoriteCompanyIds || []), compId];

    const updatedCustomer: Customer = {
      ...customer,
      favoriteCompanyIds: newFavs,
      updatedAt: Date.now()
    };

    try {
      await updateCustomerApi(updatedCustomer);
      onRefreshCustomers();
    } catch (err: any) {
      console.error('更新常用標記失敗', err);
    }
  };

  // 一鍵切換/綁定合作廠商身分
  const handleToggleSupplierStatus = async (customer: Customer) => {
    const willBeSupplier = !customer.isSupplier;
    const updatedCustomer: Customer = {
      ...customer,
      isSupplier: willBeSupplier,
      supplierCategory: willBeSupplier ? (customer.supplierCategory || '瀝青砂石 / 建材原料') : customer.supplierCategory,
      updatedAt: Date.now()
    };

    try {
      await updateCustomerApi(updatedCustomer);
      onRefreshCustomers();
      showTemporaryFeedback(
        willBeSupplier
          ? `已將「${customer.name}」一鍵同時綁定為【合作廠商】身分（可在合作廠商管理查看與分類）！`
          : `已取消「${customer.name}」的合作廠商身分標籤。`
      );
    } catch (err: any) {
      console.error('身分變更失敗', err);
    }
  };

  const showTemporaryFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // 提交儲存表單
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('請輸入客戶名稱或個人姓名');
      return;
    }

    // 檢查統一編號 (選填，若有輸入則必須合法)
    if (formData.taxId && formData.taxId.trim()) {
      const check = validateTaiwanTaxId(formData.taxId);
      if (!check.isValid) {
        setFormError(`統一編號檢查未通過：${check.error}`);
        setTaxIdError(check.error || '統編邏輯有誤');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomerApi({ ...formData, updatedAt: Date.now() });
        showTemporaryFeedback(`客戶「${formData.name}」聯絡資料已更新！`);
      } else {
        await createCustomerApi({ ...formData, createdAt: Date.now(), updatedAt: Date.now() });
        showTemporaryFeedback(`新客戶「${formData.name}」已順利新增至系統！`);
      }
      setIsFormOpen(false);
      onRefreshCustomers();
    } catch (err: any) {
      setFormError(err.message || '儲存失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 執行刪除
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomerApi(customerToDelete.id);
      showTemporaryFeedback(`已成功刪除客戶「${customerToDelete.name}」！`);
      setCustomerToDelete(null);
      onRefreshCustomers();
    } catch (err: any) {
      alert(`刪除失敗：${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // 表單內新增與編輯重要事項/禮金
  const handleOpenAddEventInForm = () => {
    setEditingEvent(null);
    setEventTargetCustomer({
      name: formData.name || '此公司/客戶',
      isInsideMainForm: true
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventInForm = (evt: CustomerEventRecord) => {
    setEditingEvent(evt);
    setEventTargetCustomer({
      name: formData.name || '此公司/客戶',
      isInsideMainForm: true
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEventInForm = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: (prev.events || []).filter(e => e.id !== eventId)
    }));
  };

  // 卡片快捷大事紀
  const handleOpenQuickEvents = (c: Customer) => {
    setQuickEventsCustomer(c);
  };

  const handleOpenAddEventForCustomer = (cust: Customer) => {
    setEditingEvent(null);
    setEventTargetCustomer({
      id: cust.id,
      name: cust.name,
      isInsideMainForm: false
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventForCustomer = (cust: Customer, evt: CustomerEventRecord) => {
    setEditingEvent(evt);
    setEventTargetCustomer({
      id: cust.id,
      name: cust.name,
      isInsideMainForm: false
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEventForCustomer = async (cust: Customer, eventId: string) => {
    const updatedEvents = (cust.events || []).filter(e => e.id !== eventId);
    const updatedCust: Customer = {
      ...cust,
      events: updatedEvents,
      updatedAt: Date.now()
    };
    try {
      await updateCustomerApi(updatedCust);
      onRefreshCustomers();
      setQuickEventsCustomer(updatedCust);
      showTemporaryFeedback(`已刪除「${cust.name}」的該筆重要事項紀錄`);
    } catch (err: any) {
      console.error('刪除失敗', err);
    }
  };

  // 儲存大事紀 (由 CustomerEventModal 回傳)
  const handleSaveEvent = async (savedEvent: CustomerEventRecord) => {
    if (eventTargetCustomer.isInsideMainForm) {
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
    } else if (eventTargetCustomer.id) {
      const targetCust = customers.find(c => c.id === eventTargetCustomer.id) || quickEventsCustomer;
      if (targetCust) {
        const currentEvents = targetCust.events || [];
        const idx = currentEvents.findIndex(e => e.id === savedEvent.id);
        let updatedEvents: CustomerEventRecord[];
        if (idx >= 0) {
          updatedEvents = [...currentEvents];
          updatedEvents[idx] = savedEvent;
        } else {
          updatedEvents = [savedEvent, ...currentEvents];
        }
        updatedEvents.sort((a, b) => b.date.localeCompare(a.date));
        const updatedCust: Customer = {
          ...targetCust,
          events: updatedEvents,
          updatedAt: Date.now()
        };
        try {
          await updateCustomerApi(updatedCust);
          onRefreshCustomers();
          setQuickEventsCustomer(updatedCust);
          showTemporaryFeedback(`已儲存「${targetCust.name}」的重要事項紀錄！`);
        } catch (err: any) {
          console.error('儲存失敗', err);
        }
      }
    }
  };

  // 篩選客戶列表 (專注於客戶名冊，純廠商身分於合作廠商模組專責管理)
  const filteredCustomers = useMemo(() => {
    return customerList.filter(c => {
      // 搜尋關鍵字匹配 (名稱、統編、負責人、電話、聯絡人、地址)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchShort = c.shortName?.toLowerCase().includes(q);
        const matchCategory = c.customerCategory?.toLowerCase().includes(q);
        const matchTax = c.taxId?.includes(q);
        const matchRep = c.representative?.toLowerCase().includes(q) || c.secondaryRepresentative?.toLowerCase().includes(q);
        const matchPhone = c.phone1?.includes(q) || c.phone2?.includes(q) || c.representativeMobile?.includes(q);
        const matchAddr = c.address?.toLowerCase().includes(q);
        const matchBank = c.bankAccount?.includes(q) || c.bankName?.toLowerCase().includes(q);
        const matchContacts = c.contacts?.some(p => p.name?.toLowerCase().includes(q) || p.mobile?.includes(q) || p.title?.toLowerCase().includes(q));
        const matchItems = c.businessItems?.toLowerCase().includes(q);

        if (!matchName && !matchShort && !matchCategory && !matchTax && !matchRep && !matchPhone && !matchAddr && !matchBank && !matchContacts && !matchItems) {
          return false;
        }
      }

      // 客戶屬性篩選 (個人客戶、店家行號、公司企業法人)
      if (filterType === 'individual') {
        const isInd = c.customerCategory === '個人客戶' || c.isIndividual;
        if (!isInd) return false;
      }
      if (filterType === 'store') {
        const isStore = c.customerCategory === '店家 / 門市行號';
        if (!isStore) return false;
      }
      if (filterType === 'corporate') {
        const isCorp = c.customerCategory === '公司企業法人' || (!c.isIndividual && !c.customerCategory);
        if (!isCorp) return false;
      }
      if (filterType === 'supplier' && !c.isSupplier) return false;
      if (filterType === 'favorite') {
        if (favoriteFilterCompanyId !== 'all') {
          if (!c.favoriteCompanyIds?.includes(favoriteFilterCompanyId)) return false;
        } else {
          if (!c.favoriteCompanyIds || c.favoriteCompanyIds.length === 0) return false;
        }
      }

      return true;
    });
  }, [customerList, searchQuery, filterType, favoriteFilterCompanyId]);

  // 當前作帳公司的名稱
  const currentCompany = companies.find(c => c.id === activeCompanyId);

  // 屬性數量統計
  const individualCount = useMemo(() => customerList.filter(c => c.customerCategory === '個人客戶' || c.isIndividual).length, [customerList]);
  const storeCount = useMemo(() => customerList.filter(c => c.customerCategory === '店家 / 門市行號').length, [customerList]);
  const corporateCount = useMemo(() => customerList.filter(c => c.customerCategory === '公司企業法人' || (!c.isIndividual && !c.customerCategory)).length, [customerList]);
  const dualSupplierCount = useMemo(() => customerList.filter(c => c.isSupplier).length, [customerList]);

  return (
    <div className="space-y-6">
      {/* 頂部操作與導覽橫幅 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Users2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
                  客戶名冊管理
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">
                    區分個人與店家/企業
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  專屬客戶聯絡資訊主檔，分類管理「個人自用業主」、「店家/門市行號」與「公司企業法人」，掌握客戶屬性與商務往來
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSwitchToSuppliers && (
              <button
                type="button"
                onClick={onSwitchToSuppliers}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                title="切換至專屬合作廠商管理 (業務分類、銀行匯款帳號)"
              >
                <Truck className="w-4 h-4 text-emerald-700" />
                <span>切換至合作廠商管理</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="檢視全集團所有客戶與廠商之紅白包、交際禮金與重大事項加總分析總表"
            >
              <HeartHandshake className="w-4 h-4 text-rose-600" />
              <span>紅白包與大事紀總表</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066cc] text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>新增客戶資料</span>
            </button>
          </div>
        </div>

        {/* 提示回饋標籤 */}
        {feedbackMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
        )}

        {/* 統計與現況看板 (依照客戶屬性分類呈現) */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-stone-100">
          <div 
            onClick={() => setFilterType('all')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-stone-50 border-stone-200/70 hover:bg-stone-100/70'
            }`}
          >
            <span className="text-xs text-stone-500 block font-medium">總客戶數</span>
            <span className="text-xl font-bold font-mono text-stone-800 mt-0.5 block">
              {customerList.length} <span className="text-xs font-normal text-stone-500">家/位</span>
            </span>
          </div>

          <div 
            onClick={() => setFilterType('individual')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              filterType === 'individual' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-stone-50 border-stone-200/70 hover:bg-stone-100/70'
            }`}
          >
            <span className="text-xs text-amber-800 block font-medium">個人客戶</span>
            <span className="text-xl font-bold font-mono text-amber-700 mt-0.5 block">
              {individualCount} <span className="text-xs font-normal text-stone-500">位 (自用/業主)</span>
            </span>
          </div>

          <div 
            onClick={() => setFilterType('store')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              filterType === 'store' ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20' : 'bg-stone-50 border-stone-200/70 hover:bg-stone-100/70'
            }`}
          >
            <span className="text-xs text-sky-800 block font-medium">店家 / 門市行號</span>
            <span className="text-xl font-bold font-mono text-sky-700 mt-0.5 block">
              {storeCount} <span className="text-xs font-normal text-stone-500">家 (實體/門市)</span>
            </span>
          </div>

          <div 
            onClick={() => setFilterType('corporate')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              filterType === 'corporate' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' : 'bg-stone-50 border-stone-200/70 hover:bg-stone-100/70'
            }`}
          >
            <span className="text-xs text-blue-800 block font-medium">公司企業法人</span>
            <span className="text-xl font-bold font-mono text-blue-700 mt-0.5 block">
              {corporateCount} <span className="text-xs font-normal text-stone-500">家 (營造/工廠)</span>
            </span>
          </div>

          <div 
            onClick={() => setFilterType('supplier')}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              filterType === 'supplier' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-stone-50 border-stone-200/70 hover:bg-stone-100/70'
            }`}
            title="兼具廠商身分的客戶"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-semibold block">兼合作廠商</span>
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">
              {dualSupplierCount} <span className="text-xs font-normal text-emerald-600">家</span>
            </span>
          </div>
        </div>
      </div>

      {/* 搜尋、分類與常用篩選列 */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* 搜尋框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋客戶名稱、簡稱、客戶屬性、統編、電話、負責人..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 篩選標籤群 (區分個人客戶及店家/企業) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="flex flex-wrap items-center rounded-lg border border-stone-200 p-0.5 bg-stone-50 gap-0.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              全部 ({customerList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('individual')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'individual'
                  ? 'bg-white text-amber-700 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              個人客戶 ({individualCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('store')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'store'
                  ? 'bg-white text-sky-700 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              店家 / 門市 ({storeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('corporate')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'corporate'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              公司企業 ({corporateCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('supplier')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'supplier'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              兼廠商 ({dualSupplierCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('favorite')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                filterType === 'favorite'
                  ? 'bg-white text-amber-600 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>常用標記</span>
            </button>
          </div>

          {/* 若選擇常用標記，可進一步選擇是哪一間公司的常用客戶 */}
          {filterType === 'favorite' && (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-stone-400 text-[11px]">指定常用公司：</span>
              <select
                value={favoriteFilterCompanyId}
                onChange={(e) => setFavoriteFilterCompanyId(e.target.value)}
                className="text-xs bg-white border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="all">所有公司有標星號者</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    僅 {c.shortName || c.name} 的常用客戶
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 檢視模式切換：列表清單 / 卡片方格 */}
          <div className="ml-auto flex items-center gap-1 bg-stone-100/90 p-0.5 rounded-lg border border-stone-200">
            <button
              type="button"
              onClick={() => handleToggleViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="以精簡列表表格檢視，快速掃描比對與編輯"
            >
              <List className="w-3.5 h-3.5" />
              <span>列表檢視</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="以詳細卡片檢視"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>卡片檢視</span>
            </button>
          </div>
        </div>
      </div>

      {/* 合作廠商篩選模式提示與即時產出橫幅 */}
      {filterType === 'supplier' && (
        <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              目前正以【合作廠商】身分檢視，全庫共有 <strong>{filteredCustomers.length}</strong> 家合作廠商資料。
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSupplierDirectoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>一鍵產出通訊錄 (Excel / 列印)</span>
          </button>
        </div>
      )}

      {/* 客戶卡片 / 列表展示區 */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
            <Users2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-700">查無符合條件的客戶聯絡資訊</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `找不到包含「${searchQuery}」的紀錄，請嘗試其他關鍵字。`
              : '目前尚未建立任何客戶聯絡資料，請點擊上方按鈕建立第一筆資料。'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#0066cc] font-semibold text-xs hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>立即新增客戶</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* 列表表格檢視模式 (List View)：高資訊密度、易比對、快速編輯與刪除 */
        <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold">
                  <th className="py-3 px-3.5 w-10 text-center">常用</th>
                  <th className="py-3 px-3 min-w-[180px]">客戶 / 公司名稱</th>
                  <th className="py-3 px-3 w-28">統一編號</th>
                  <th className="py-3 px-3 min-w-[120px]">負責人 / 主管</th>
                  <th className="py-3 px-3 min-w-[140px]">電話 / 手機</th>
                  <th className="py-3 px-3 min-w-[150px]">聯絡窗口</th>
                  <th className="py-3 px-3 min-w-[140px]">往來收款 / 帳號</th>
                  <th className="py-3 px-3 min-w-[100px]">大事紀/禮金</th>
                  <th className="py-3 px-3.5 w-28 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((customer) => {
                  const isFavForCurrentCompany = activeCompanyId !== 'all' 
                    ? customer.favoriteCompanyIds?.includes(activeCompanyId)
                    : (customer.favoriteCompanyIds && customer.favoriteCompanyIds.length > 0);

                  const evts = customer.events || [];
                  const moneyTotal = evts.reduce((sum, e) => (e.hasAmount && e.amount ? sum + (e.direction === 'incoming' ? -e.amount : e.amount) : sum), 0);

                  return (
                    <tr 
                      key={customer.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* 常用星號 */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            const targetCompId = activeCompanyId !== 'all' ? activeCompanyId : (companies[0]?.id || 'comp_1');
                            handleToggleFavoriteCompany(customer, targetCompId);
                          }}
                          title={isFavForCurrentCompany ? '點擊取消常用客戶' : '點擊設為常用客戶'}
                          className={`p-1 rounded transition-colors cursor-pointer inline-flex items-center justify-center ${
                            isFavForCurrentCompany 
                              ? 'text-amber-500 hover:bg-amber-50' 
                              : 'text-stone-300 hover:text-amber-400 hover:bg-stone-100'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFavForCurrentCompany ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>

                      {/* 客戶名稱與屬性標籤 */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded shrink-0 ${
                            customer.isIndividual ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {customer.isIndividual ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-stone-900 text-xs truncate" title={customer.name}>
                                {customer.name}
                              </span>
                              {customer.shortName && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-mono">
                                  {customer.shortName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                                (customer.customerCategory === '個人客戶' || customer.isIndividual)
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : customer.customerCategory === '店家 / 門市行號' 
                                  ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {customer.customerCategory || (customer.isIndividual ? '個人客戶' : '公司法人')}
                              </span>
                              {customer.isSupplier && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-0.5" title={customer.supplierCategory ? `兼廠商 (${customer.supplierCategory})` : '兼廠商身分'}>
                                  <Truck className="w-2.5 h-2.5" />
                                  <span>兼廠商</span>
                                </span>
                              )}
                              {customer.address && (
                                <span className="text-[10px] text-stone-400 truncate max-w-[180px]" title={customer.address}>
                                  · {customer.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 統一編號 */}
                      <td className="py-2.5 px-3 align-middle font-mono text-stone-700">
                        {customer.taxId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded">
                            {customer.taxId}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* 負責人 / 主管 */}
                      <td className="py-2.5 px-3 align-middle text-stone-700">
                        {customer.representative ? (
                          <div>
                            <span className="font-semibold text-stone-800">{customer.representative}</span>
                            {customer.representativeMobile && (
                              <span className="block font-mono text-[10px] text-stone-500">
                                {customer.representativeMobile}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* 主要電話 / 手機 */}
                      <td className="py-2.5 px-3 align-middle font-mono text-stone-700">
                        {customer.phone1 || customer.phone2 ? (
                          <div>
                            <span>{customer.phone1 || customer.phone2}</span>
                            {customer.phone1 && customer.phone2 && (
                              <span className="block text-[10px] text-stone-400">{customer.phone2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* 聯絡窗口名冊 */}
                      <td className="py-2.5 px-3 align-middle text-stone-600">
                        {customer.contacts && customer.contacts.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {customer.contacts.slice(0, 2).map((c, i) => (
                              <span key={c.id || i} className="text-[11px] truncate max-w-[160px]" title={`${c.name} ${c.title || ''} ${c.mobile || ''}`}>
                                <span className="font-medium text-stone-800">{c.name}</span>
                                {c.title && <span className="text-stone-400"> ({c.title})</span>}
                                {c.mobile && <span className="font-mono text-stone-500 ml-1">{c.mobile}</span>}
                              </span>
                            ))}
                            {customer.contacts.length > 2 && (
                              <span className="text-[10px] text-stone-400">
                                +{customer.contacts.length - 2} 位窗口
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* 收款方式與銀行帳號 */}
                      <td className="py-2.5 px-3 align-middle text-stone-600">
                        {customer.paymentTerm || customer.bankAccount ? (
                          <div className="text-[11px]">
                            {customer.paymentTerm && (
                              <span className="font-medium text-stone-800 block truncate max-w-[140px]" title={customer.paymentTerm}>
                                {customer.paymentTerm}
                              </span>
                            )}
                            {customer.bankAccount && (
                              <span className="font-mono text-[10px] text-stone-500 block truncate max-w-[140px]" title={`${customer.bankName || ''} ${customer.bankAccount}`}>
                                {customer.bankName ? `${customer.bankName} ` : ''}{customer.bankAccount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* 大事紀與禮金 */}
                      <td className="py-2.5 px-3 align-middle">
                        {evts.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEvents(customer)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-semibold transition-colors cursor-pointer"
                            title="查看大事紀與禮金明細"
                          >
                            <HeartHandshake className="w-3 h-3 text-rose-500" />
                            <span>{evts.length} 筆</span>
                            {moneyTotal !== 0 && (
                              <span className="font-mono font-bold">${moneyTotal.toLocaleString()}</span>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEvents(customer)}
                            className="text-stone-300 hover:text-stone-500 text-[11px] transition-colors cursor-pointer"
                            title="登記婚喪喜慶或重大事項"
                          >
                            +大事紀
                          </button>
                        )}
                      </td>

                      {/* 動作操作按鈕 */}
                      <td className="py-2.5 px-3.5 text-right align-middle">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(customer)}
                            className="p-1.5 text-stone-500 hover:text-blue-700 hover:bg-white rounded transition-colors cursor-pointer"
                            title="編輯客戶資料"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete({ id: customer.id, name: customer.name })}
                            className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-white rounded transition-colors cursor-pointer"
                            title="刪除客戶"
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
          <div className="py-2.5 px-4 bg-stone-50/80 border-t border-stone-200 text-stone-500 text-[11px] flex items-center justify-between">
            <span>共顯示 {filteredCustomers.length} 筆客戶聯絡紀錄</span>
            <span>點擊右側鉛筆圖示即可修改或擴充欄位</span>
          </div>
        </div>
      ) : (
        /* 卡片方格檢視模式 (Grid View) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const isFavForCurrentCompany = activeCompanyId !== 'all' 
              ? customer.favoriteCompanyIds?.includes(activeCompanyId)
              : (customer.favoriteCompanyIds && customer.favoriteCompanyIds.length > 0);

            return (
              <div
                key={customer.id}
                className="bg-white rounded-xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* 卡片標題與主身分區 */}
                <div className="p-4 border-b border-stone-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        customer.isIndividual 
                          ? 'bg-amber-50 text-amber-700' 
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {customer.isIndividual ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-stone-900 text-sm truncate" title={customer.name}>
                            {customer.name}
                          </h4>
                          {customer.shortName && (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-mono">
                              {customer.shortName}
                            </span>
                          )}
                        </div>

                        {/* 身分標籤 */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                            (customer.customerCategory === '個人客戶' || customer.isIndividual)
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : customer.customerCategory === '店家 / 門市行號' 
                              ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {customer.customerCategory || (customer.isIndividual ? '個人客戶' : '公司企業法人')}
                          </span>

                          {customer.taxId && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono flex items-center gap-1" title="已通過台灣 8 碼統編檢查">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              統編: {customer.taxId}
                            </span>
                          )}

                          {customer.isSupplier ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              <span>兼合作廠商</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSupplierStatus(customer)}
                              title="點擊一鍵直接讓此客戶擁有廠商身分"
                              className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-stone-300 text-stone-500 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
                            >
                              +綁定廠商身分
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 常用星號標籤按鈕 (依各公司切換或共用) */}
                    <button
                      type="button"
                      onClick={() => {
                        const targetCompId = activeCompanyId !== 'all' ? activeCompanyId : (companies[0]?.id || 'comp_1');
                        handleToggleFavoriteCompany(customer, targetCompId);
                      }}
                      title={isFavForCurrentCompany ? '點擊取消常用客戶標記' : '點擊設為常用客戶'}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isFavForCurrentCompany 
                          ? 'text-amber-500 hover:bg-amber-50' 
                          : 'text-stone-300 hover:text-amber-400 hover:bg-stone-50'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFavForCurrentCompany ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* 卡片內容明細 */}
                <div className="p-4 space-y-2.5 text-xs text-stone-600 flex-1">
                  {/* 負責人與主窗口 */}
                  {(customer.representative || customer.secondaryRepresentative) && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <span className="text-stone-400 shrink-0">負責/主管：</span>
                      <span className="font-medium">
                        {customer.representative || '—'}
                        {customer.representativeMobile && ` (${customer.representativeMobile})`}
                        {customer.secondaryRepresentative && ` / ${customer.secondaryRepresentative}`}
                      </span>
                    </div>
                  )}

                  {/* 電話與傳真 */}
                  {(customer.phone1 || customer.phone2 || customer.fax) && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-mono">
                        {customer.phone1 || customer.phone2}
                        {customer.phone1 && customer.phone2 && ` / ${customer.phone2}`}
                        {customer.fax && ` (傳真: ${customer.fax})`}
                      </span>
                    </div>
                  )}

                  {/* 地址 */}
                  {customer.address && (
                    <div className="flex items-start gap-2 text-stone-700">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {customer.postalCode && `[${customer.postalCode}] `}
                        {customer.address}
                      </span>
                    </div>
                  )}

                  {/* 配合收款方式與銀行帳戶 */}
                  {(customer.paymentTerm || customer.bankAccount) && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex flex-col gap-1 bg-stone-50/80 -mx-4 -mb-1 px-4 py-2">
                      {customer.paymentTerm && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">主要配合收款：</span>
                          <span className="font-semibold text-stone-800">{customer.paymentTerm}</span>
                        </div>
                      )}
                      {customer.bankAccount && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-500">往來匯款帳戶：</span>
                          <span className="font-mono text-stone-800 truncate max-w-[200px]" title={`${customer.bankName || ''} ${customer.bankAccount} (${customer.accountName || ''})`}>
                            {customer.bankName ? `${customer.bankName} ` : ''}{customer.bankAccount}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 多聯絡人視圖 */}
                  {customer.contacts && customer.contacts.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-stone-100">
                      <span className="text-[11px] font-bold text-stone-500 block mb-1">
                        聯絡窗口 ({customer.contacts.length}位)：
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {customer.contacts.slice(0, 3).map((p, idx) => (
                          <span key={p.id || idx} className="text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {p.name}{p.title ? ` (${p.title})` : ''}{p.mobile ? ` : ${p.mobile}` : ''}
                          </span>
                        ))}
                        {customer.contacts.length > 3 && (
                          <span className="text-[10px] text-stone-400 self-center">
                            +{customer.contacts.length - 3} 位
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 營業項目/專長 */}
                  {customer.businessItems && (
                    <div className="text-[11px] text-stone-500 mt-1">
                      <span className="font-medium text-stone-600">專營/營業項目：</span>
                      <span>{customer.businessItems}</span>
                    </div>
                  )}

                  {/* 關於該公司之重要事項與禮金往來摘要 */}
                  {customer.events && customer.events.length > 0 && (() => {
                    const evts = customer.events;
                    const moneyTotal = evts.reduce((sum, e) => (e.hasAmount && e.amount ? sum + (e.direction === 'incoming' ? -e.amount : e.amount) : sum), 0);
                    return (
                      <div className="mt-2 pt-2 border-t border-stone-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                            <HeartHandshake className="w-3 h-3 text-rose-500" />
                            <span>大事紀與禮金 ({evts.length}筆)</span>
                          </span>
                          {moneyTotal !== 0 && (
                            <span className="text-[11px] font-mono font-bold text-rose-600">
                              累計 NT$ {moneyTotal.toLocaleString()}
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

                {/* 卡片底端操作按鈕列 */}
                <div className="px-4 py-2.5 bg-stone-50/70 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-[10px] text-stone-400 font-mono">
                    ID: {customer.id.replace('cust_', '')}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickEvents(customer)}
                      className="px-2 py-1 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      title="檢視/登記此客戶之婚喪喜慶或重大事項"
                    >
                      <HeartHandshake className="w-3.5 h-3.5" />
                      <span>大事紀 ({customer.events?.length || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditForm(customer)}
                      className="p-1.5 text-stone-500 hover:text-blue-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                      title="編輯客戶資料"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerToDelete({ id: customer.id, name: customer.name })}
                      className="p-1.5 text-stone-500 hover:text-red-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                      title="刪除客戶"
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

      {/* 新增 / 編輯客戶 Modal 彈出視窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-stone-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-[#0066cc]">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {editingCustomer ? `編輯客戶聯絡資料：${editingCustomer.name}` : '建立新客戶聯絡資訊'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    跨行號共用名冊，支援台灣統一編號自動驗證、銀行付款帳戶及未來廠商雙重身分
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / 表單主體 */}
            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* 1. 基本屬性 (個人/公司、名稱、簡稱、統編) */}
              <div className="space-y-4">
                <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>基本身分屬性</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 客戶屬性類別分類 (區分個人客戶、店家行號或公司法人) */}
                  <div className="sm:col-span-2 p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <span>客戶屬性分類 (區分個人客戶、店家門市或公司企業) *</span>
                      </span>
                      <span className="text-[11px] text-stone-500">掌握客戶屬性，便於精準維護與報價</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CUSTOMER_CATEGORY_OPTIONS.map(opt => {
                        const currentCat = formData.customerCategory || (formData.isIndividual ? '個人客戶' : '公司企業法人');
                        const isSelected = currentCat === opt;
                        const isInd = opt === '個人客戶';
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                customerCategory: opt,
                                isIndividual: isInd
                              }));
                            }}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs ring-1 ring-blue-500/20'
                                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100/70'
                            }`}
                          >
                            <span className="text-xs">{opt}</span>
                            <span className="text-[10px] text-stone-400 font-normal mt-0.5">
                              {opt === '個人客戶' ? '自用住宅、業主本人、散客' : opt.includes('店家') ? '實體店鋪、地區五金門市行號' : opt.includes('企業') ? '營造公司、工廠、實業企業' : '政府學校公營通路'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 客戶名稱 (必填) */}
                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-bold mb-1">
                      {formData.isIndividual ? '個人姓名 *' : '公司/行號全名 *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={formData.isIndividual ? '例如：林政輝、陳先生' : '例如：華碩電腦股份有限公司、億豐工程行'}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* 簡稱 */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">簡稱 / 業務代號 (選填)</label>
                    <input
                      type="text"
                      value={formData.shortName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                      placeholder="例如：華碩、億豐"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* 統一編號 (選填，自動加權檢查) */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1 flex items-center justify-between">
                      <span>統一編號 (選填，需檢核8碼)</span>
                      {formData.isIndividual && (
                        <span className="text-[10px] text-amber-700">個人客戶可留空</span>
                      )}
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={formData.taxId || ''}
                      onChange={(e) => handleTaxIdChange(e.target.value)}
                      placeholder="例如：84920193 (8碼半形數字)"
                      className={`w-full px-3 py-2 font-mono border rounded-lg focus:outline-none text-xs ${
                        taxIdError 
                          ? 'border-red-400 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-400' 
                          : 'border-stone-200 focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                    {taxIdError && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{taxIdError}</span>
                      </p>
                    )}
                  </div>

                  {/* 負責人 / 代表人 */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">
                      {formData.isIndividual ? '聯絡尊稱 / 身分' : '公司負責人 / 代表人'}
                    </label>
                    <input
                      type="text"
                      value={formData.representative || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, representative: e.target.value }))}
                      placeholder="例如：陳大為、張董"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* 負責人行動電話 */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">負責人行動電話 (選填)</label>
                    <input
                      type="text"
                      value={formData.representativeMobile || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, representativeMobile: e.target.value }))}
                      placeholder="例如：0912-345-678"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  {/* 副負責人 / 現場主管 */}
                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-medium mb-1">副負責人 / 工地現場主管 (選填)</label>
                    <input
                      type="text"
                      value={formData.secondaryRepresentative || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, secondaryRepresentative: e.target.value }))}
                      placeholder="例如：林主任、謝帝旺 (原舊資料主管)"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 通訊與地址 */}
              <div className="space-y-4">
                <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>電話通訊與地址</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">公司電話 1 (代表號)</label>
                    <input
                      type="text"
                      value={formData.phone1 || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone1: e.target.value }))}
                      placeholder="例如：02-2345-6789"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">公司電話 2 (備用/專線)</label>
                    <input
                      type="text"
                      value={formData.phone2 || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone2: e.target.value }))}
                      placeholder="例如：02-2345-6780"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">傳真號碼</label>
                    <input
                      type="text"
                      value={formData.fax || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value }))}
                      placeholder="例如：02-2345-6799"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">電子信箱 Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="例如：contact@company.com"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">LINE ID (公務/官方)</label>
                    <input
                      type="text"
                      value={formData.lineId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, lineId: e.target.value }))}
                      placeholder="例如：@company_line"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">郵遞區號</label>
                    <input
                      type="text"
                      value={formData.postalCode || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="例如：221, 640"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-stone-700 font-medium mb-1">通訊 / 營業地址</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="例如：新北市汐止區新台五路一段100號"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. 主要收款方式與銀行帳戶資訊 (選單式選填) */}
              <div className="space-y-4">
                <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>收款條件與銀行帳戶 (選單式選填)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 主要配合收款途徑方式與票期週期 */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-stone-700 font-medium mb-1">
                      主要配合收款途徑 (點擊快速切換)：
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
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
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
                            className="px-2 py-0.5 rounded text-[11px] bg-white border border-stone-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-stone-600 transition-colors cursor-pointer"
                          >
                            {cycle}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 自訂/確認的付款條件說明 */}
                    <div className="pt-1">
                      <label className="block text-[11px] font-medium text-stone-700 mb-1">
                        配合收款條件說明 (可自由修改或填寫特殊約定)：
                      </label>
                      <input
                        type="text"
                        value={formData.paymentTerm || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentTerm: e.target.value }))}
                        placeholder="例如：銀行匯款 (次月 25 號電匯) 或 開立支票 (月結 60 天期票)"
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* 銀行名稱 (台灣常見銀行選單 + 手動填寫) */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">往來金融機構 (選單式)</label>
                    <select
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-xs"
                    >
                      <option value="">-- 請選擇台灣銀行代碼 --</option>
                      {TAIWAN_BANKS.map(b => (
                        <option key={b.code} value={`${b.code} ${b.name}`}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 分行名稱 */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">分行名稱 (選填)</label>
                    <input
                      type="text"
                      value={formData.bankBranch || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                      placeholder="例如：南港分行、汐止分行"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  {/* 銀行匯款帳號 */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">銀行匯款帳號 (選填)</label>
                    <input
                      type="text"
                      value={formData.bankAccount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                      placeholder="例如：004-012-3456789"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>

                  {/* 戶名 */}
                  <div>
                    <label className="block text-stone-700 font-medium mb-1">匯款戶名 (選填)</label>
                    <input
                      type="text"
                      value={formData.accountName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="例如：同客戶名稱或負責人姓名"
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. 多聯絡人窗口清單 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-600" />
                    <span>各部門聯絡人名冊 (支援多窗口)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>新增一位聯絡窗口</span>
                  </button>
                </div>

                {formData.contacts && formData.contacts.length > 0 ? (
                  <div className="space-y-2.5">
                    {formData.contacts.map((contact, idx) => (
                      <div key={contact.id || idx} className="p-3 bg-stone-50 rounded-lg border border-stone-200 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                        <div>
                          <input
                            type="text"
                            placeholder="姓名 (如李如榮)"
                            value={contact.name}
                            onChange={(e) => handleUpdateContact(idx, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded text-xs"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="職稱 (如業務主任)"
                            value={contact.title || ''}
                            onChange={(e) => handleUpdateContact(idx, 'title', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded text-xs"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="手機 (09xx...)"
                            value={contact.mobile || ''}
                            onChange={(e) => handleUpdateContact(idx, 'mobile', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded font-mono text-xs"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="市話 / 分機 / 備註"
                            value={contact.phone || ''}
                            onChange={(e) => handleUpdateContact(idx, 'phone', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(idx)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                            title="移除此聯絡人"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-stone-50 border border-dashed border-stone-200 text-center text-stone-400">
                    尚無建立副聯絡人窗口，如有多位專案工程師、採購或會計窗口，可點擊上方按鈕新增。
                  </div>
                )}
              </div>

              {/* 5. 專營項目、廠商雙重身分與常用公司設定 */}
              <div className="space-y-4">
                <h4 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>專營項目與常用關係企業設定</span>
                </h4>

                {/* 營業項目 / 專營分類 */}
                <div>
                  <label className="block text-stone-700 font-medium mb-1">
                    營業項目 / 專案備註 (供業務與廠商配對)
                  </label>
                  <input
                    type="text"
                    value={formData.businessItems || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessItems: e.target.value }))}
                    placeholder="例如：電機設備、AC瀝青路面維護、空調機電、建築五金"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                {/* 廠商身分雙重綁定 */}
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-900 block text-xs">
                        合作廠商 (Supplier) 雙重身分預留
                      </span>
                      <span className="text-[11px] text-emerald-700 block mt-0.5">
                        勾選後此客戶亦會同步顯示於【合作廠商管理】模組，無須重複建立基本資料
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-800">
                      <input
                        type="checkbox"
                        checked={formData.isSupplier}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          isSupplier: e.target.checked,
                          supplierCategory: e.target.checked ? (prev.supplierCategory || '瀝青砂石 / 建材原料') : prev.supplierCategory
                        }))}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>同時具備合作廠商身分</span>
                    </label>
                  </div>

                  {formData.isSupplier && (
                    <div className="pt-2.5 border-t border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-emerald-900 shrink-0 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>廠商業務所屬分類：</span>
                      </label>
                      <select
                        value={formData.supplierCategory || '瀝青砂石 / 建材原料'}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplierCategory: e.target.value }))}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs text-stone-800 focus:ring-2 focus:ring-emerald-500"
                      >
                        {SUPPLIER_CATEGORY_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 哪一間公司的常用客戶 (勾選) */}
                <div>
                  <label className="block text-stone-700 font-medium mb-1.5">
                    設定為哪一間關係企業的「常用客戶」：
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {companies.map(comp => {
                      const isChecked = formData.favoriteCompanyIds?.includes(comp.id);
                      return (
                        <label
                          key={comp.id}
                          className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold'
                              : 'bg-stone-50 border-stone-200 text-stone-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => {
                                const currentFavs = prev.favoriteCompanyIds || [];
                                const updated = checked
                                  ? [...currentFavs, comp.id]
                                  : currentFavs.filter(id => id !== comp.id);
                                return { ...prev, favoriteCompanyIds: updated };
                              });
                            }}
                            className="rounded text-[#0066cc] focus:ring-blue-500"
                          />
                          <span className="truncate">{comp.shortName || comp.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 備註說明 */}
                <div>
                  <label className="block text-stone-700 font-medium mb-1">備註說明 (選填)</label>
                  <textarea
                    rows={2}
                    value={formData.note || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="例如：特定專案請款聯絡管道、出貨注意細節..."
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                {/* 6. 關於該公司之重要事項與交際禮金紀錄 (婚喪喜慶 / 紅白包 / 重大協議) */}
                <div className="space-y-3 pt-4 border-t border-stone-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                        <HeartHandshake className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-stone-900 text-xs">
                          6. 關於該公司之重要事項與交際禮金紀錄 (婚喪喜慶 / 紅白包 / 重大協議)
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          登記紅包白包禮金、三節禮盒與重大簽約記事，支援金額收支加總分析
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddEventInForm}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增相關資訊</span>
                    </button>
                  </div>

                  {/* 統計數值摘要 */}
                  {formData.events && formData.events.length > 0 && (() => {
                    const evts = formData.events;
                    const totalOut = evts.reduce((sum, e) => (e.hasAmount && e.amount && e.direction !== 'incoming' ? sum + e.amount : sum), 0);
                    const totalIn = evts.reduce((sum, e) => (e.hasAmount && e.amount && e.direction === 'incoming' ? sum + e.amount : sum), 0);
                    const weddingCount = evts.filter(e => e.category === 'wedding_funeral').length;
                    const giftCount = evts.filter(e => e.category === 'business_gift').length;
                    const matterCount = evts.filter(e => e.category === 'important_matter').length;

                    return (
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-[10px] text-stone-400 block">累計禮金支出</span>
                            <span className="font-mono font-bold text-rose-600 text-sm">
                              NT$ {totalOut.toLocaleString()}
                            </span>
                          </div>
                          {totalIn > 0 && (
                            <div>
                              <span className="text-[10px] text-stone-400 block">收受禮金/回禮</span>
                              <span className="font-mono font-bold text-emerald-600 text-sm">
                                +NT$ {totalIn.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-600 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-medium">
                            婚喪喜慶 {weddingCount} 筆
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-medium">
                            商務交際 {giftCount} 筆
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium">
                            重大協議 {matterCount} 件
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 列表清單 */}
                  {formData.events && formData.events.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {formData.events.map((evt, idx) => {
                        const conf = EVENT_CATEGORY_CONFIG[evt.category];
                        return (
                          <div
                            key={evt.id || idx}
                            className="p-3 bg-stone-50 hover:bg-stone-100/70 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors text-xs"
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
                                    {evt.direction === 'incoming' ? '+NT$ ' : 'NT$ '}
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
                                  className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                                  title="編輯此筆紀錄"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEventInForm(evt.id)}
                                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                                  title="刪除此筆紀錄"
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
                    <div className="p-4 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center text-stone-400 text-xs">
                      尚無重要事項或禮金紀錄。如該公司有婚喪喜慶（紅包/白包）、年節禮盒送禮、或重大協議合約，可點擊上方按鈕建立紀錄與金錢統計。
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer / 儲存按鈕 */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0066cc] hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? '儲存中...' : (editingCustomer ? '更新儲存' : '確認建立客戶')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 獨立快速大事紀檢視/新增彈窗 (從卡片一鍵開啟) */}
      {quickEventsCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <HeartHandshake className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {quickEventsCustomer.name} - 大事紀與禮金往來
                  </h3>
                  <p className="text-xs text-stone-500">
                    {quickEventsCustomer.taxId ? `統編: ${quickEventsCustomer.taxId} | ` : ''}
                    負責人: {quickEventsCustomer.representative || '未填'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEventsCustomer(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">紀錄清單</span>
                <button
                  type="button"
                  onClick={() => handleOpenAddEventForCustomer(quickEventsCustomer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增相關資訊</span>
                </button>
              </div>

              {/* 列表 */}
              {quickEventsCustomer.events && quickEventsCustomer.events.length > 0 ? (
                <div className="space-y-2.5">
                  {quickEventsCustomer.events.map((evt) => {
                    const conf = EVENT_CATEGORY_CONFIG[evt.category];
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
                                {evt.direction === 'incoming' ? '+NT$ ' : 'NT$ '}
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
                              onClick={() => handleOpenEditEventForCustomer(quickEventsCustomer, evt)}
                              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="編輯此筆紀錄"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEventForCustomer(quickEventsCustomer, evt.id)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                              title="刪除此筆紀錄"
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
                <div className="p-8 text-center text-stone-400 text-xs">
                  目前尚無登記的重要事項或禮金紀錄，點擊上方「新增相關資訊」建立。
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end">
              <button
                type="button"
                onClick={() => setQuickEventsCustomer(null)}
                className="px-4 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯個別大事紀/禮金彈窗 */}
      <CustomerEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        editingEvent={editingEvent}
        customerName={eventTargetCustomer.name}
      />

      {/* 全集團紅白包與大事紀加總分析總表 */}
      <CustomerEventsSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        customers={customers}
        activeCompanyName={currentCompany?.shortName || currentCompany?.name}
        onSelectCustomer={(cId) => {
          const target = customers.find(c => c.id === cId);
          if (target) {
            setIsSummaryModalOpen(false);
            handleOpenEditForm(target);
          }
        }}
      />

      {/* 合作廠商通訊錄產出與列印預覽彈窗 */}
      <SupplierDirectoryModal
        isOpen={isSupplierDirectoryModalOpen}
        onClose={() => setIsSupplierDirectoryModalOpen(false)}
        customers={customers}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onToggleSupplierStatus={handleToggleSupplierStatus}
      />

      {/* 刪除確認對話框 (修復取消與按X完全正常動作) */}
      <ConfirmDialog
        isOpen={!!customerToDelete}
        title="確認刪除客戶資料"
        description={`您確定要刪除「${customerToDelete?.name}」的聯絡資料嗎？此動作將同步從 SQLite 資料庫中移除。`}
        confirmText={isDeleting ? '刪除中...' : '確認刪除'}
        cancelText="取消"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => setCustomerToDelete(null)}
      />
    </div>
  );
};
