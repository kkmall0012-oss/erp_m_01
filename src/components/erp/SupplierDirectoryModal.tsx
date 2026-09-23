import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Building2,
  User,
  Phone,
  Landmark,
  CheckCircle2,
  Filter,
  Download,
  ExternalLink,
  Tag,
  CreditCard,
  Mail,
  MapPin,
  Check,
  AlertCircle
} from 'lucide-react';
import { Customer, CompanyProfile } from '../../types';
import { exportSupplierDirectoryToExcel, exportSupplierDirectoryToCsv } from '../../utils/excel';

interface SupplierDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  companies: CompanyProfile[];
  activeCompanyId: string;
  onToggleSupplierStatus?: (customer: Customer) => Promise<void> | void;
}

export const SupplierDirectoryModal: React.FC<SupplierDirectoryModalProps> = ({
  isOpen,
  onClose,
  customers,
  companies,
  activeCompanyId,
  onToggleSupplierStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'suppliers_only' | 'all' | 'has_bank'>('suppliers_only');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === activeCompanyId) || companies[0];
  }, [companies, activeCompanyId]);

  // 廠商清單過濾
  const displayedList = useMemo(() => {
    return customers.filter((c) => {
      // 範圍篩選
      if (scopeFilter === 'suppliers_only' && !c.isSupplier) return false;
      if (scopeFilter === 'has_bank' && (!c.bankAccount || !c.bankAccount.trim())) return false;

      // 搜尋關鍵字
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchShort = c.shortName?.toLowerCase().includes(q);
        const matchTax = c.taxId?.includes(q);
        const matchRep = c.representative?.toLowerCase().includes(q) || c.secondaryRepresentative?.toLowerCase().includes(q);
        const matchPhone = c.phone1?.includes(q) || c.phone2?.includes(q) || c.representativeMobile?.includes(q);
        const matchBank = c.bankAccount?.includes(q) || c.bankName?.toLowerCase().includes(q) || c.accountName?.toLowerCase().includes(q);
        const matchItems = c.businessItems?.toLowerCase().includes(q);
        const matchContacts = c.contacts?.some(p => p.name?.toLowerCase().includes(q) || p.mobile?.includes(q) || p.title?.toLowerCase().includes(q));

        if (!matchName && !matchShort && !matchTax && !matchRep && !matchPhone && !matchBank && !matchItems && !matchContacts) {
          return false;
        }
      }

      return true;
    });
  }, [customers, scopeFilter, searchQuery]);

  // 統計數據
  const totalSuppliersCount = useMemo(() => customers.filter(c => c.isSupplier).length, [customers]);
  const corporateSuppliersCount = useMemo(() => customers.filter(c => c.isSupplier && !c.isIndividual).length, [customers]);
  const individualSuppliersCount = useMemo(() => customers.filter(c => c.isSupplier && c.isIndividual).length, [customers]);
  const withBankAccountsCount = useMemo(() => customers.filter(c => c.isSupplier && c.bankAccount?.trim()).length, [customers]);

  // 匯出 Excel
  const handleExportExcel = () => {
    exportSupplierDirectoryToExcel(displayedList, {
      isSupplierOnly: scopeFilter === 'suppliers_only',
      companyTitle: activeCompany?.name || '公司集團',
      fileNamePrefix: scopeFilter === 'suppliers_only' ? '合作廠商通訊錄與銀行付款總表' : '全客戶通訊名錄'
    });
  };

  // 匯出 CSV
  const handleExportCsv = () => {
    exportSupplierDirectoryToCsv(displayedList, {
      isSupplierOnly: scopeFilter === 'suppliers_only',
      companyTitle: activeCompany?.name || '公司集團'
    });
  };

  // 紙本列印 / 存為 PDF
  const handlePrint = () => {
    window.print();
  };

  // 複製銀行帳號
  const handleCopyBank = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* 1. 彈窗頂部 (列印時隱藏) */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/90 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                產出合作廠商通訊名冊與付款資料表
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                  即時產出 / 匯出 / 列印
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                整合廠商統一編號、負責人、電話傳真、多窗口聯絡人、銀行匯款帳號及收款方式
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. 統計總覽與三合一產出工具列 (列印時隱藏) */}
        <div className="p-5 border-b border-stone-200 bg-white shrink-0 print:hidden space-y-4">
          {/* 指標卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
              <span className="text-xs text-emerald-800 block font-medium">合作廠商總家數</span>
              <span className="text-xl font-bold font-mono text-emerald-900 mt-0.5 block">
                {totalSuppliersCount} <span className="text-xs font-normal text-emerald-700">家/位</span>
              </span>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
              <span className="text-xs text-blue-800 block font-medium">公司法人/商行</span>
              <span className="text-xl font-bold font-mono text-blue-900 mt-0.5 block">
                {corporateSuppliersCount} <span className="text-xs font-normal text-blue-700">家</span>
              </span>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <span className="text-xs text-amber-800 block font-medium">工班師傅/個人</span>
              <span className="text-xl font-bold font-mono text-amber-900 mt-0.5 block">
                {individualSuppliersCount} <span className="text-xs font-normal text-amber-700">位</span>
              </span>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="text-xs text-stone-600 block font-medium">已建置匯款帳號</span>
              <span className="text-xl font-bold font-mono text-stone-800 mt-0.5 block">
                {withBankAccountsCount} <span className="text-xs font-normal text-stone-500">家 (可直接電匯)</span>
              </span>
            </div>
          </div>

          {/* 搜尋與匯出操作按鈕 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
            {/* 搜尋與篩選 */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋廠商名稱、統編、電話、負責人、銀行帳號..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
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

              {/* 篩選標籤 */}
              <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-xs">
                <button
                  type="button"
                  onClick={() => setScopeFilter('suppliers_only')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    scopeFilter === 'suppliers_only'
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  僅合作廠商 ({totalSuppliersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter('has_bank')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    scopeFilter === 'has_bank'
                      ? 'bg-white text-blue-800 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  有銀行帳號 ({withBankAccountsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    scopeFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  全客戶通訊錄 ({customers.length})
                </button>
              </div>
            </div>

            {/* 三大產出功能按鈕 */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                title="下載完整廠商通訊錄與銀行付款資料至 Excel 活頁簿 (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>匯出 Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-800 text-white font-medium text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                title="下載標準 CSV 格式 (附帶 UTF-8 BOM，無亂碼)"
              >
                <FileText className="w-4 h-4" />
                <span>匯出 CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                title="友善紙本列印或另存為 PDF 文件"
              >
                <Printer className="w-4 h-4" />
                <span>列印 / 存為 PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. 列印專用報表頁首 (僅在列印時顯示，螢幕上隱藏) */}
        <div className="hidden print:block p-6 border-b border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-black tracking-wider">
                {activeCompany?.name || '公司集團'} - 合作廠商通訊名冊與付款資料表
              </h1>
              <p className="text-xs text-stone-600 mt-1">
                製表單位：會計採購部 ｜ 統一編號：{activeCompany?.taxId || '未設定'} ｜ 公司電話：{activeCompany?.phone || '未設定'}
              </p>
            </div>
            <div className="text-right text-xs text-stone-600">
              <p>製表日期：{new Date().toLocaleDateString('zh-TW')} ({new Date().toLocaleTimeString('zh-TW', { hour12: false })})</p>
              <p>總計廠商：{displayedList.length} 家</p>
            </div>
          </div>
        </div>

        {/* 4. 廠商通訊錄清單表格 (滾動區) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          {displayedList.length === 0 ? (
            <div className="text-center py-16 bg-stone-50 rounded-xl border border-dashed border-stone-300">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-stone-700">查無符合條件的廠商資料</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                {scopeFilter === 'suppliers_only' ? (
                  <>
                    目前名冊中尚未將客戶標記為「兼廠商身分」。<br />
                    您可以在下方將名單切換為「全客戶通訊錄」，並點擊【兼廠商】按鈕一鍵將協力廠商綁定！
                  </>
                ) : (
                  '請嘗試清除搜尋關鍵字或調整篩選條件。'
                )}
              </p>
              {scopeFilter === 'suppliers_only' && (
                <button
                  type="button"
                  onClick={() => setScopeFilter('all')}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-semibold hover:bg-stone-900 transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>切換為顯示全客戶名單</span>
                </button>
              )}
            </div>
          ) : (
            <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs print:border-stone-800 print:shadow-none print:rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100/90 text-stone-700 font-semibold border-b border-stone-200 print:bg-stone-200 print:text-black print:border-black">
                      <th className="py-2.5 px-3 w-10 text-center">序號</th>
                      <th className="py-2.5 px-3 min-w-[170px]">廠商 / 公司名稱</th>
                      <th className="py-2.5 px-3 w-24">統一編號</th>
                      <th className="py-2.5 px-3 min-w-[110px]">負責人 / 主管</th>
                      <th className="py-2.5 px-3 min-w-[130px]">電話 / 傳真</th>
                      <th className="py-2.5 px-3 min-w-[150px]">主要聯絡窗口</th>
                      <th className="py-2.5 px-3 min-w-[180px]">付款方式 / 匯款銀行與帳號</th>
                      <th className="py-2.5 px-3 min-w-[130px]">營業項目 / 供應內容</th>
                      <th className="py-2.5 px-3 w-24 text-center print:hidden">身分標籤</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 print:divide-stone-300">
                    {displayedList.map((c, idx) => {
                      return (
                        <tr 
                          key={c.id}
                          className="hover:bg-blue-50/30 transition-colors group print:hover:bg-transparent"
                        >
                          {/* 序號 */}
                          <td className="py-2.5 px-3 text-center align-middle font-mono text-stone-500 print:text-black">
                            {idx + 1}
                          </td>

                          {/* 廠商名稱 */}
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex items-start gap-2">
                              <span className={`p-1 rounded mt-0.5 shrink-0 ${
                                c.isIndividual ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              } print:hidden`}>
                                {c.isIndividual ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-stone-900 text-xs">
                                    {c.name}
                                  </span>
                                  {c.shortName && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-mono">
                                      {c.shortName}
                                    </span>
                                  )}
                                </div>
                                {c.address && (
                                  <span className="text-[10px] text-stone-400 block truncate max-w-[200px] mt-0.5 print:text-stone-600" title={c.address}>
                                    {c.address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 統一編號 */}
                          <td className="py-2.5 px-3 align-middle font-mono">
                            {c.taxId ? (
                              <span className="font-semibold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded print:bg-transparent print:p-0">
                                {c.taxId}
                              </span>
                            ) : (
                              <span className="text-stone-300 print:text-stone-400">—</span>
                            )}
                          </td>

                          {/* 負責人 */}
                          <td className="py-2.5 px-3 align-middle">
                            {c.representative ? (
                              <div>
                                <span className="font-semibold text-stone-800">{c.representative}</span>
                                {c.representativeMobile && (
                                  <span className="block font-mono text-[10px] text-stone-500">
                                    {c.representativeMobile}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* 代表電話與傳真 */}
                          <td className="py-2.5 px-3 align-middle font-mono">
                            {c.phone1 || c.phone2 || c.fax ? (
                              <div>
                                <span>{c.phone1 || c.phone2}</span>
                                {c.fax && (
                                  <span className="block text-[10px] text-stone-400">
                                    傳真: {c.fax}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* 主要聯絡人 */}
                          <td className="py-2.5 px-3 align-middle">
                            {c.contacts && c.contacts.length > 0 ? (
                              <div className="space-y-0.5">
                                {c.contacts.slice(0, 2).map((p, i) => (
                                  <div key={p.id || i} className="text-[11px] truncate max-w-[180px]">
                                    <span className="font-bold text-stone-800">{p.name}</span>
                                    {p.title && <span className="text-stone-500 ml-1">({p.title})</span>}
                                    {p.mobile && <span className="font-mono text-stone-500 ml-1.5">{p.mobile}</span>}
                                  </div>
                                ))}
                                {c.contacts.length > 2 && (
                                  <span className="text-[10px] text-stone-400">
                                    等共 {c.contacts.length} 位聯絡窗口
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* 付款方式與匯款帳號 */}
                          <td className="py-2.5 px-3 align-middle">
                            <div>
                              {c.paymentTerm && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-medium text-[10px] border border-indigo-200 mb-0.5 print:bg-transparent print:border-none print:p-0 print:text-black">
                                  {c.paymentTerm}
                                </span>
                              )}
                              {c.bankAccount ? (
                                <div className="flex items-center gap-1 group/bank">
                                  <span className="font-mono text-stone-800 text-[11px] font-bold">
                                    {c.bankName ? `${c.bankName} ` : ''}
                                    {c.bankBranch ? `${c.bankBranch} ` : ''}
                                    {c.bankAccount}
                                  </span>
                                  {c.accountName && (
                                    <span className="text-[10px] text-stone-500">
                                      ({c.accountName})
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBank(c.bankAccount || '', c.id)}
                                    className="p-0.5 text-stone-400 hover:text-stone-700 opacity-0 group-hover/bank:opacity-100 transition-opacity print:hidden cursor-pointer"
                                    title="複製匯款帳號"
                                  >
                                    {copiedId === c.id ? <Check className="w-3 h-3 text-emerald-600" /> : <CreditCard className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-stone-300 block text-[10px]">未提供匯款帳號</span>
                              )}
                            </div>
                          </td>

                          {/* 營業項目 / 供應物料 */}
                          <td className="py-2.5 px-3 align-middle text-stone-600">
                            {c.businessItems ? (
                              <span className="text-[11px] line-clamp-2" title={c.businessItems}>
                                {c.businessItems}
                              </span>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>

                          {/* 廠商身分切換標籤 (列印時隱藏) */}
                          <td className="py-2.5 px-3 text-center align-middle print:hidden">
                            {onToggleSupplierStatus && (
                              <button
                                type="button"
                                onClick={() => onToggleSupplierStatus(c)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                                  c.isSupplier
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                                    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                }`}
                                title={c.isSupplier ? '點擊解除廠商身分' : '點擊標記為合作廠商'}
                              >
                                {c.isSupplier ? '✓ 合作廠商' : '+ 標記廠商'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 表格底部資訊 */}
              <div className="py-2.5 px-4 bg-stone-50 text-stone-500 text-[11px] flex items-center justify-between border-t border-stone-200 print:hidden">
                <span>共顯示 {displayedList.length} 家合作廠商資料</span>
                <span>點擊上方按鈕可即時匯出 Excel、CSV 或直接列印紙本報表</span>
              </div>
            </div>
          )}

          {/* 列印專用簽章欄 (僅在紙本列印時顯示) */}
          <div className="hidden print:grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-stone-400 text-xs">
            <div>
              <span className="block font-bold">製表經辦：</span>
              <div className="h-10 mt-1 border-b border-dashed border-stone-400"></div>
            </div>
            <div>
              <span className="block font-bold">出納核帳：</span>
              <div className="h-10 mt-1 border-b border-dashed border-stone-400"></div>
            </div>
            <div>
              <span className="block font-bold">主辦會計：</span>
              <div className="h-10 mt-1 border-b border-dashed border-stone-400"></div>
            </div>
            <div>
              <span className="block font-bold">總經理 / 負責人：</span>
              <div className="h-10 mt-1 border-b border-dashed border-stone-400"></div>
            </div>
          </div>
        </div>

        {/* 5. 彈窗底部動作列 (列印時隱藏) */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-stone-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>通訊名冊與付款資料皆與全系統 SQLite 實體資料庫即時同步</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>立即匯出 Excel 檔</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              關閉視窗
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
