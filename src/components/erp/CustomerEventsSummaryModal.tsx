import React, { useState, useMemo } from 'react';
import {
  X,
  HeartHandshake,
  Gift,
  FileText,
  DollarSign,
  Search,
  Filter,
  Receipt,
  Calendar,
  Building2,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Printer
} from 'lucide-react';
import {
  Customer,
  CustomerEventRecord,
  CustomerEventCategory,
  EVENT_CATEGORY_CONFIG
} from '../../types';

interface FlattenedEvent extends CustomerEventRecord {
  customerId: string;
  customerName: string;
  isSupplier: boolean;
  customerTaxId?: string;
}

interface CustomerEventsSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  activeCompanyName?: string;
  onSelectCustomer?: (customerId: string) => void;
}

export const CustomerEventsSummaryModal: React.FC<CustomerEventsSummaryModalProps> = ({
  isOpen,
  onClose,
  customers,
  activeCompanyName,
  onSelectCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [onlyMoney, setOnlyMoney] = useState<boolean>(false);

  // Flatten all events across all customers
  const allEvents: FlattenedEvent[] = useMemo(() => {
    const list: FlattenedEvent[] = [];
    customers.forEach(cust => {
      if (cust.events && cust.events.length > 0) {
        cust.events.forEach(evt => {
          list.push({
            ...evt,
            customerId: cust.id,
            customerName: cust.name,
            isSupplier: cust.isSupplier,
            customerTaxId: cust.taxId
          });
        });
      }
    });
    // Sort by date descending
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [customers]);

  // Extract available years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allEvents.forEach(evt => {
      if (evt.date && evt.date.length >= 4) {
        years.add(evt.date.substring(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [allEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter(evt => {
      if (selectedCategory !== 'all' && evt.category !== selectedCategory) {
        return false;
      }
      if (selectedYear !== 'all' && !evt.date.startsWith(selectedYear)) {
        return false;
      }
      if (onlyMoney && !evt.hasAmount) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inCustomer = evt.customerName.toLowerCase().includes(q);
        const inTitle = evt.title.toLowerCase().includes(q);
        const inTarget = evt.targetPerson?.toLowerCase().includes(q) || false;
        const inRep = evt.ourRepresentative?.toLowerCase().includes(q) || false;
        const inVoucher = evt.voucherNo?.toLowerCase().includes(q) || false;
        const inNote = evt.note?.toLowerCase().includes(q) || false;
        if (!inCustomer && !inTitle && !inTarget && !inRep && !inVoucher && !inNote) {
          return false;
        }
      }
      return true;
    });
  }, [allEvents, selectedCategory, selectedYear, onlyMoney, searchTerm]);

  // Aggregation statistics
  const stats = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let weddingFuneralTotal = 0;
    let weddingFuneralCount = 0;
    let businessGiftTotal = 0;
    let businessGiftCount = 0;
    let importantMatterCount = 0;
    let pettyCashLinkedTotal = 0;
    let pettyCashLinkedCount = 0;

    filteredEvents.forEach(evt => {
      const amt = evt.amount || 0;
      if (evt.hasAmount && amt > 0) {
        if (evt.direction === 'incoming') {
          totalIncome += amt;
        } else {
          totalExpense += amt;
        }

        if (evt.isPettyCashLinked) {
          pettyCashLinkedTotal += amt;
          pettyCashLinkedCount += 1;
        }
      }

      if (evt.category === 'wedding_funeral') {
        weddingFuneralCount += 1;
        if (evt.direction !== 'incoming') weddingFuneralTotal += amt;
      } else if (evt.category === 'business_gift') {
        businessGiftCount += 1;
        if (evt.direction !== 'incoming') businessGiftTotal += amt;
      } else if (evt.category === 'important_matter') {
        importantMatterCount += 1;
      }
    });

    return {
      totalExpense,
      totalIncome,
      netExpense: totalExpense - totalIncome,
      weddingFuneralTotal,
      weddingFuneralCount,
      businessGiftTotal,
      businessGiftCount,
      importantMatterCount,
      pettyCashLinkedTotal,
      pettyCashLinkedCount,
      totalRecords: filteredEvents.length
    };
  }, [filteredEvents]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <HeartHandshake className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  全名冊禮金往來與重要事項加總分析總表
                </h3>
                <p className="text-xs text-stone-500">
                  收錄各客戶與廠商之婚喪喜慶（紅包/白包）、商務公關送禮與重大協議備查
                  {activeCompanyName && <span className="ml-2 font-medium text-stone-700">| 當前檢視：{activeCompanyName}</span>}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 頂部重要金錢統計卡片 (加總分析) */}
        <div className="p-4 bg-stone-100/60 border-b border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-2xs">
            <span className="text-[11px] text-stone-500 font-medium block">
              禮金與交際支出總額
            </span>
            <div className="text-lg font-mono font-bold text-rose-600 mt-0.5">
              NT$ {stats.totalExpense.toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              共 {stats.totalRecords} 筆交際或協議紀錄
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-rose-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-rose-700 font-medium block">
                婚喪喜慶 (紅白包)
              </span>
              <span className="px-1.5 py-0.2 bg-rose-50 text-rose-600 rounded text-[10px] font-bold">
                {stats.weddingFuneralCount} 筆
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-rose-700 mt-0.5">
              NT$ {stats.weddingFuneralTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              結婚賀禮、奠儀花籃等
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-800 font-medium block">
                商務交際 (年節禮盒)
              </span>
              <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">
                {stats.businessGiftCount} 筆
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-amber-800 mt-0.5">
              NT$ {stats.businessGiftTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              三節禮盒、公關餐敘
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-blue-800 font-medium block">
                零用金已列支出款
              </span>
              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                {stats.pettyCashLinkedCount} 筆
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-blue-900 mt-0.5">
              NT$ {stats.pettyCashLinkedTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              重大記事共 {stats.importantMatterCount} 件
            </div>
          </div>
        </div>

        {/* 篩選與搜尋列 */}
        <div className="p-3 px-6 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="搜尋公司、事由、對象、經手人或傳票號碼..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* 大分類篩選 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部分類</option>
              <option value="wedding_funeral">婚喪喜慶 (紅白包)</option>
              <option value="business_gift">商務交際 (禮盒)</option>
              <option value="important_matter">重大協議 (記事)</option>
              <option value="other">其他備忘</option>
            </select>

            {/* 年度篩選 */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-1.5 border border-stone-200 rounded-lg bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有年度</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr} 年</option>
              ))}
            </select>

            {/* 僅看金額勾選 */}
            <label className="flex items-center gap-1.5 cursor-pointer text-stone-600 hover:text-stone-900 select-none">
              <input
                type="checkbox"
                checked={onlyMoney}
                onChange={(e) => setOnlyMoney(e.target.checked)}
                className="rounded text-[#0066cc] focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>僅看金錢禮金</span>
            </label>
          </div>
        </div>

        {/* 明細清單 (Table) */}
        <div className="flex-1 overflow-y-auto">
          {filteredEvents.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {filteredEvents.map(evt => {
                const conf = EVENT_CATEGORY_CONFIG[evt.category];
                return (
                  <div
                    key={evt.id}
                    className="p-3.5 px-6 hover:bg-stone-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Date, Category badge, Company name, Event title */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-stone-500 text-[11px] font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{evt.date}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${conf.badgeBg} ${conf.badgeText}`}>
                          {evt.eventType || conf.shortLabel}
                        </span>

                        {evt.isSupplier && (
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                            廠商
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectCustomer && onSelectCustomer(evt.customerId)}
                          className="font-bold text-stone-900 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-stone-400" />
                          <span>{evt.customerName}</span>
                        </button>
                      </div>

                      <div className="font-bold text-stone-900 text-sm">
                        {evt.title}
                      </div>

                      {/* Detail metadata: Target Person, Representative, Proof, Note */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-500 text-[11px]">
                        {evt.targetPerson && (
                          <span className="flex items-center gap-1">
                            <span className="text-stone-400">對象:</span>
                            <span className="text-stone-700 font-medium">{evt.targetPerson}</span>
                          </span>
                        )}
                        {evt.ourRepresentative && (
                          <span className="flex items-center gap-1">
                            <span className="text-stone-400">我方出席:</span>
                            <span className="text-stone-700 font-medium">{evt.ourRepresentative}</span>
                          </span>
                        )}
                        {evt.proofNote && (
                          <span className="flex items-center gap-1">
                            <Receipt className="w-3 h-3 text-stone-400" />
                            <span className="text-stone-600">{evt.proofNote}</span>
                          </span>
                        )}
                        {evt.note && (
                          <span className="text-stone-500 italic">
                            「{evt.note}」
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Petty Cash Link badge */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                      {evt.hasAmount && evt.amount !== undefined ? (
                        <div className="text-right">
                          <div className={`font-mono text-sm font-bold flex items-center justify-end gap-1 ${
                            evt.direction === 'incoming' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {evt.direction === 'incoming' ? (
                              <>
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>收 +NT$ {evt.amount.toLocaleString()}</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>NT$ {evt.amount.toLocaleString()}</span>
                              </>
                            )}
                          </div>
                          {evt.isPettyCashLinked && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">
                              {evt.voucherNo ? `零用金 ${evt.voucherNo}` : '零用金已列支'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                          純記事備忘 (無金錢)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-stone-400">
              <HeartHandshake className="w-10 h-10 mx-auto mb-2 text-stone-300" />
              <p className="text-sm font-medium text-stone-600">目前尚無符合篩選條件的禮金或重要事項紀錄</p>
              <p className="text-xs text-stone-400 mt-1">
                您可以在客戶名冊中的任一客戶資料編輯畫面下方，點擊「新增相關資訊」登記紅包、白包、禮盒或合約記事。
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>共 {filteredEvents.length} 筆紀錄 (顯示符合條件者)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
