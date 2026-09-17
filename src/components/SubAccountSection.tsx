import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Calendar, 
  Trash2, 
  Receipt, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock, 
  Coins, 
  FileSpreadsheet, 
  AlertCircle,
  Sparkles,
  ChevronRight,
  Archive,
  RotateCcw,
  Check,
  ShoppingBag,
  Wallet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SubAccount, SubAccountItem, Transaction, ReceiptType, CategoryConfig, DEFAULT_CATEGORIES } from '../types';
import { getTodayDateStr } from '../utils/storage';
import { ConfirmDialog } from './ConfirmDialog';
import { SubAccountItemModal } from './SubAccountItemModal';

interface SubAccountSectionProps {
  subAccounts: SubAccount[];
  claimants: string[];
  categories?: CategoryConfig[];
  onAddSubAccount?: (account: Omit<SubAccount, 'id' | 'createdAt' | 'items'>) => void;
  onUpdateSubAccount?: (account: SubAccount) => void;
  onDeleteSubAccount?: (id: string) => void;
  onImportItemsToGeneral?: (subAccount: SubAccount, itemsToImport: SubAccountItem[], returnExcessFund?: number) => void;
  onImportToGeneralLedger?: (subAccount: SubAccount, itemsToImport: SubAccountItem[], returnExcessFund?: number) => void;
  onUpdateSubAccounts?: (subAccounts: SubAccount[]) => void;
}

export const SubAccountSection: React.FC<SubAccountSectionProps> = ({
  subAccounts,
  claimants,
  categories = DEFAULT_CATEGORIES,
  onAddSubAccount,
  onUpdateSubAccount,
  onDeleteSubAccount,
  onImportItemsToGeneral,
  onImportToGeneralLedger,
  onUpdateSubAccounts
}) => {
  const importFn = onImportItemsToGeneral || onImportToGeneralLedger;

  // 當前選中的子帳戶 ID
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    subAccounts[0]?.id || ''
  );

  // 子帳戶檢視篩選 (全部、進行中、已結算)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled'>('active');

  // 新增採買子帳號 Modal 狀態
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCustodian, setNewCustodian] = useState<string>(claimants[0] || '陳小明');
  const [newInitialFund, setNewInitialFund] = useState<string>('5000');
  const [newStartDate, setNewStartDate] = useState<string>(getTodayDateStr());
  const [newNote, setNewNote] = useState<string>('');

  // 採買支出明細 Modal 狀態 (按按鍵跳出彈窗填入，與零用金收支登記一樣)
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);

  // 結算與匯入 Confirm 彈窗狀態
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [autoReplenishReturn, setAutoReplenishReturn] = useState<boolean>(true);
  const [subAccountToDelete, setSubAccountToDelete] = useState<SubAccount | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ accountId: string; itemId: string } | null>(null);

  // 篩選子帳戶列表
  const filteredAccounts = subAccounts.filter((acc) => {
    if (statusFilter === 'all') return true;
    return acc.status === statusFilter;
  });

  // 當前選中的子帳戶物件
  const currentAccount = subAccounts.find((acc) => acc.id === selectedAccountId) || filteredAccounts[0] || subAccounts[0];

  // 計算選中子帳戶的統計資訊
  const totalSpent = currentAccount
    ? currentAccount.items.reduce((sum, it) => sum + it.amount, 0)
    : 0;
  const remainingFund = currentAccount
    ? currentAccount.initialFund - totalSpent
    : 0;
  const unimportedItems = currentAccount
    ? currentAccount.items.filter((it) => !it.isImportedToGeneral)
    : [];
  const unimportedTotal = unimportedItems.reduce((sum, it) => sum + it.amount, 0);
  const importedTotal = currentAccount
    ? currentAccount.items.filter((it) => it.isImportedToGeneral).reduce((sum, it) => sum + it.amount, 0)
    : 0;

  // 建立新採買子帳號
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const fund = parseInt(newInitialFund, 10);
    if (!newName.trim()) return;
    if (isNaN(fund) || fund < 0) return;

    if (onAddSubAccount) {
      onAddSubAccount({
        name: newName.trim(),
        custodian: newCustodian.trim() || '未指定',
        initialFund: fund,
        startDate: newStartDate,
        status: 'active',
        note: newNote.trim()
      });
    } else if (onUpdateSubAccounts) {
      const newAcc: SubAccount = {
        id: `sub-acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: newName.trim(),
        custodian: newCustodian.trim() || '未指定',
        initialFund: fund,
        startDate: newStartDate,
        status: 'active',
        note: newNote.trim(),
        createdAt: Date.now(),
        items: []
      };
      onUpdateSubAccounts([newAcc, ...subAccounts]);
    }

    setIsCreateModalOpen(false);
    setNewName('');
    setNewInitialFund('5000');
    setNewNote('');
  };

  // 由 SubAccountItemModal 新增採買明細
  const handleAddItemFromModal = (
    itemData: Omit<SubAccountItem, 'id' | 'createdAt' | 'isImportedToGeneral'>
  ) => {
    if (!currentAccount) return;

    const newItem: SubAccountItem = {
      id: `sub-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: itemData.date,
      type: 'expense',
      categoryId: itemData.categoryId,
      categoryName: itemData.categoryName,
      subItem: itemData.subItem,
      amount: itemData.amount,
      receiptType: itemData.receiptType,
      invoiceNumber: itemData.invoiceNumber,
      claimant: itemData.claimant || currentAccount.custodian,
      note: itemData.note,
      createdAt: Date.now(),
      isImportedToGeneral: false
    };

    const updatedAccount: SubAccount = {
      ...currentAccount,
      items: [newItem, ...currentAccount.items]
    };

    if (onUpdateSubAccount) {
      onUpdateSubAccount(updatedAccount);
    } else if (onUpdateSubAccounts) {
      onUpdateSubAccounts(subAccounts.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
    }
  };

  // 刪除一筆採買消費明細
  const handleDeleteItem = (accountId: string, itemId: string) => {
    const acc = subAccounts.find((a) => a.id === accountId);
    if (!acc) return;
    const updated: SubAccount = {
      ...acc,
      items: acc.items.filter((it) => it.id !== itemId)
    };
    if (onUpdateSubAccount) {
      onUpdateSubAccount(updated);
    } else if (onUpdateSubAccounts) {
      onUpdateSubAccounts(subAccounts.map((a) => (a.id === updated.id ? updated : a)));
    }
    setItemToDelete(null);
  };

  // 批次匯入未匯入項目至零用金總帳
  const handleBatchImport = () => {
    if (!currentAccount || unimportedItems.length === 0) return;
    if (typeof importFn === 'function') {
      importFn(currentAccount, unimportedItems);
    }

    // 標記該子帳戶中所有項目為已匯入
    const updatedAccount: SubAccount = {
      ...currentAccount,
      items: currentAccount.items.map((it) => ({ ...it, isImportedToGeneral: true }))
    };
    if (onUpdateSubAccount) {
      onUpdateSubAccount(updatedAccount);
    } else if (onUpdateSubAccounts) {
      onUpdateSubAccounts(subAccounts.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
    }
  };

  // 執行「結算子帳號」
  const handleSettleAccount = () => {
    if (!currentAccount) return;

    if (typeof importFn === 'function') {
      // 先匯入所有未匯入的項目
      if (unimportedItems.length > 0) {
        importFn(
          currentAccount,
          unimportedItems,
          autoReplenishReturn && remainingFund > 0 ? remainingFund : undefined
        );
      } else if (autoReplenishReturn && remainingFund > 0) {
        // 若項目已匯入過，僅產生剩餘款繳回
        importFn(currentAccount, [], remainingFund);
      }
    }

    // 將子帳號狀態改為 settled (已結算)
    const updatedAccount: SubAccount = {
      ...currentAccount,
      status: 'settled',
      items: currentAccount.items.map((it) => ({ ...it, isImportedToGeneral: true }))
    };
    if (onUpdateSubAccount) {
      onUpdateSubAccount(updatedAccount);
    } else if (onUpdateSubAccounts) {
      onUpdateSubAccounts(subAccounts.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
    }
    setIsSettleModalOpen(false);
  };

  // 重啟子帳號 (由已結算變為進行中)
  const handleReactivateAccount = (account: SubAccount) => {
    const updated: SubAccount = {
      ...account,
      status: 'active'
    };
    if (onUpdateSubAccount) {
      onUpdateSubAccount(updated);
    } else if (onUpdateSubAccounts) {
      onUpdateSubAccounts(subAccounts.map((a) => (a.id === updated.id ? updated : a)));
    }
  };

  // 匯出單一採買子帳號明細 Excel
  const handleExportAccountExcel = () => {
    if (!currentAccount) return;
    const wb = XLSX.utils.book_new();

    const rows: any[] = currentAccount.items.map((it, idx) => ({
      '項次': idx + 1,
      '消費日期': it.date,
      '支出分類': it.categoryName || '採買開支',
      '品項細項 (店家 / 餐點 / 項目)': it.subItem,
      '支出金額 (NT$)': it.amount,
      '憑證種類': it.receiptType === 'invoice' ? '🧾 發票' : it.receiptType === 'receipt' ? '📄 收據' : '無憑證',
      '發票號碼': it.invoiceNumber || '-',
      '採買經手人': it.claimant || currentAccount.custodian,
      '備註說明': it.note || '',
      '總帳匯入狀態': it.isImportedToGeneral ? '已匯入總帳' : '未匯入'
    }));

    // 統計合計列
    rows.push({
      '項次': '【採買結算】',
      '消費日期': `撥款日: ${currentAccount.startDate}`,
      '支出分類': '-',
      '品項細項 (店家 / 餐點 / 項目)': `採買負責人: ${currentAccount.custodian} (撥發備用金: NT$ ${currentAccount.initialFund.toLocaleString()})`,
      '支出金額 (NT$)': totalSpent,
      '憑證種類': `剩餘留存: NT$ ${remainingFund.toLocaleString()}`,
      '發票號碼': currentAccount.status === 'settled' ? '已結算歸檔' : '進行中',
      '採買經手人': '-',
      '備註說明': `已匯入總帳: NT$ ${importedTotal.toLocaleString()} / 待匯: NT$ ${unimportedTotal.toLocaleString()}`,
      '總帳匯入狀態': '-'
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 32 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, '採買子帳流水明細');
    XLSX.writeFile(wb, `${currentAccount.name}_採買明細_${getTodayDateStr()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 1. 頂部資訊列與子帳號切換 */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-700 rounded-xl border border-sky-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">
                  採買子帳管理
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200">
                  定額撥款 · 每日記帳 · 結算匯入總帳
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                適用於同仁定期採買午餐便當、主管交代外勤採買等。一旦撥款，總帳手上現金即時扣減；採買人每日記帳，結束後結算一鍵匯入總帳。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>＋ 建立採買子帳</span>
            </button>
          </div>
        </div>

        {/* 子帳戶切換標籤與狀態篩選 */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-semibold text-stone-500 shrink-0 mr-1">選擇採買子帳:</span>
            {filteredAccounts.map((acc) => {
              const isSelected = currentAccount?.id === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>{acc.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected
                        ? 'bg-sky-400/20 text-sky-300 font-mono'
                        : 'bg-stone-200 text-stone-600 font-mono'
                    }`}
                  >
                    NT${acc.initialFund.toLocaleString()}
                  </span>
                  {acc.status === 'settled' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-700 text-white font-normal">
                      已結算
                    </span>
                  )}
                </button>
              );
            })}

            {filteredAccounts.length === 0 && (
              <span className="text-xs text-stone-400 italic py-1">目前無符合條件的採買子帳</span>
            )}
          </div>

          <div className="inline-flex p-1 bg-stone-100 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'active' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
              }`}
            >
              進行中
            </button>
            <button
              onClick={() => setStatusFilter('settled')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'settled' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
              }`}
            >
              已結算
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
              }`}
            >
              全部
            </button>
          </div>
        </div>
      </div>

      {/* 2. 當前選中的子帳戶核心資訊 */}
      {currentAccount ? (
        <div className="space-y-6">
          {/* 子帳號概要與指標卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">撥發採買備用金</span>
              <div className="text-xl font-bold text-stone-900 mt-1 font-mono">
                NT$ {currentAccount.initialFund.toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-between">
                <span>採買負責人:</span>
                <span className="font-bold text-stone-700">{currentAccount.custodian}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">已記錄採買花費</span>
              <div className="text-xl font-bold text-rose-600 mt-1 font-mono">
                NT$ {totalSpent.toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-between">
                <span>累計明細:</span>
                <span className="font-semibold text-stone-700">{currentAccount.items.length} 筆</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs font-semibold text-stone-500">子帳目前尚存零用金</span>
              <div className={`text-xl font-bold mt-1 font-mono ${
                remainingFund >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                NT$ {remainingFund.toLocaleString()}
              </div>
              <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-between">
                <span>待匯入總帳:</span>
                <span className="font-mono text-amber-700 font-semibold">
                  NT$ {unimportedTotal.toLocaleString()} ({unimportedItems.length} 筆)
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500">帳戶狀態與結算</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  currentAccount.status === 'active'
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  {currentAccount.status === 'active' ? '進行中' : '已完成結算'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-3">
                {unimportedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchImport}
                    className="grow py-1 px-2 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg transition-colors cursor-pointer text-center"
                    title="將未匯入的記錄轉存入主零用金總帳"
                  >
                    匯入總帳 ({unimportedItems.length})
                  </button>
                )}

                {currentAccount.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => setIsSettleModalOpen(true)}
                    className="grow py-1 px-2 text-[11px] font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors cursor-pointer text-center"
                  >
                    結算此帳
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReactivateAccount(currentAccount)}
                    className="grow py-1 px-2 text-[11px] font-bold bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg transition-colors cursor-pointer text-center"
                  >
                    重新開啟
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportAccountExcel}
                  className="p-1 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="匯出此採買子帳專屬 Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. 採買每日記帳按鈕區 (依指示：按按鍵後跳出視窗填入資訊，填入內容跟零用金收支登記一樣) */}
          {currentAccount.status === 'active' && (
            <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-700 text-white rounded-xl shadow-xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-sky-950 flex items-center gap-2">
                    <span>採買每日支出登記</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-sky-200/80 text-sky-900 font-medium">
                      採買經手人：{currentAccount.custodian}
                    </span>
                  </div>
                  <p className="text-xs text-sky-800 mt-0.5">
                    已撥發備用金 NT$ {currentAccount.initialFund.toLocaleString()}，採買人目前留存備用金 NT$ {remainingFund.toLocaleString()}。
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-add-subaccount-item"
                onClick={() => setIsAddItemModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-900 hover:bg-sky-800 active:bg-black text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>＋ 新增採買支出明細</span>
              </button>
            </div>
          )}

          {/* 4. 採買開支流水清單明細表格 */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {currentAccount.name} 採買流水紀錄
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  共計 {currentAccount.items.length} 筆消費紀錄，累計開銷 NT${totalSpent.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentAccount.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增支出</span>
                  </button>
                )}

                {unimportedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchImport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>匯入總帳 ({unimportedItems.length} 筆)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSubAccountToDelete(currentAccount)}
                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="刪除此採買子帳"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold">
                    <th className="py-3 px-4">消費日期</th>
                    <th className="py-3 px-4">支出分類</th>
                    <th className="py-3 px-4">品項細項 (店家 / 項目)</th>
                    <th className="py-3 px-3 text-center">憑證</th>
                    <th className="py-3 px-4 text-right">支出金額 (NT$)</th>
                    <th className="py-3 px-4">採買人</th>
                    <th className="py-3 px-4">備註</th>
                    <th className="py-3 px-3 text-center">總帳匯入狀態</th>
                    <th className="py-3 px-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {currentAccount.items.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-600 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium">
                          {item.categoryName || '採買開支'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900 whitespace-nowrap">
                        {item.subItem}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.receiptType === 'invoice' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-1.5 py-0.5 rounded-md font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                              🧾 發票
                            </span>
                            {item.invoiceNumber && (
                              <span className="text-[9px] font-mono text-purple-700 mt-0.5">
                                {item.invoiceNumber}
                              </span>
                            )}
                          </div>
                        ) : item.receiptType === 'receipt' ? (
                          <span className="px-1.5 py-0.5 rounded-md font-medium text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                            📄 收據
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md font-normal text-[10px] bg-stone-100 text-stone-400">
                            無
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 text-sm whitespace-nowrap">
                        NT$ {item.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-stone-600 whitespace-nowrap">
                        {item.claimant || currentAccount.custodian}
                      </td>
                      <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                        {item.note || '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.isImportedToGeneral ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>已入總帳</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 font-medium">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>待結算匯入</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ accountId: currentAccount.id, itemId: item.id })}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                          title="刪除此筆支出"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {currentAccount.items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-400">
                        <p>此採買子帳尚無消費開銷紀錄。</p>
                        <button
                          type="button"
                          onClick={() => setIsAddItemModalOpen(true)}
                          className="mt-2 text-xs text-sky-800 underline font-bold cursor-pointer"
                        >
                          點此新增第一筆採買支出
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100/70 border-t-2 border-stone-200 font-bold text-stone-900">
                    <td className="py-3 px-4">合計支出</td>
                    <td colSpan={2} className="py-3 px-4 font-normal text-stone-500">
                      撥發備用金: NT${currentAccount.initialFund.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center font-normal text-stone-500">
                      剩餘: NT${remainingFund.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 text-sm">
                      NT$ {totalSpent.toLocaleString()}
                    </td>
                    <td colSpan={4} className="py-3 px-4 text-xs font-normal text-stone-500">
                      {currentAccount.status === 'settled' ? '✓ 此採買子帳已完成結算歸檔' : '進行中，結算時按右上角「結算此帳」可自動帶入總帳'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3">
          <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-700">目前尚無任何採買子帳</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            您可以點擊「建立採買子帳」，為採買同仁撥發定額備用金（如每週5,000元），手上記帳零用金自動扣除該款項。
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-900 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>建立第一個採買子帳</span>
          </button>
        </div>
      )}

      {/* 建立新採買子帳號 Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-sky-800" />
                <span>建立新採買子帳</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  採買子帳名稱 (例如：每週午餐採買金、台北外勤採購備用金)
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：每週午餐採買 (陳小明)"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    採買經手人 / 請領人
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustodian}
                    onChange={(e) => setNewCustodian(e.target.value)}
                    placeholder="例如：陳小明"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    撥發採買備用金 (NT$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newInitialFund}
                    onChange={(e) => setNewInitialFund(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3 py-2 text-xs font-bold font-mono bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    *手上的零用金將即時減少此金額
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  撥款開始日期
                </label>
                <input
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  備註用途說明 (選填)
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="例如：每週一預撥5,000元，週五結算餘額退回或補款"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-900 hover:bg-sky-800 rounded-xl shadow-xs cursor-pointer"
                >
                  建立採買子帳
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 採買每日明細登記 Modal */}
      {isAddItemModalOpen && currentAccount && (
        <SubAccountItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          subAccountName={currentAccount.name}
          defaultCustodian={currentAccount.custodian}
          categories={categories}
          claimants={claimants}
          onAddItem={handleAddItemFromModal}
        />
      )}

      {/* 結算採買子帳 Modal */}
      {isSettleModalOpen && currentAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>結算採買子帳 ({currentAccount.name})</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1.5 border border-stone-200/80">
                <div className="flex justify-between">
                  <span className="text-stone-500">撥發備用金：</span>
                  <span className="font-bold">NT$ {currentAccount.initialFund.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">累計採買總開銷：</span>
                  <span className="font-bold text-rose-600">NT$ {totalSpent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-200 font-bold">
                  <span>結算剩餘款額：</span>
                  <span className={remainingFund >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600'}>
                    NT$ {remainingFund.toLocaleString()}
                  </span>
                </div>
              </div>

              {unimportedItems.length > 0 && (
                <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-xs">
                  ✓ 系統將自動把此帳戶內 <strong>{unimportedItems.length} 筆明細</strong> (總計 NT${unimportedTotal.toLocaleString()}) 同步匯入公司零用金總帳。
                </div>
              )}

              {remainingFund > 0 && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReplenishReturn}
                    onChange={(e) => setAutoReplenishReturn(e.target.checked)}
                    className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-900 block">
                      同時在總帳產生「未用餘額繳回」撥補收入 (NT$ {remainingFund.toLocaleString()})
                    </span>
                    <span className="text-emerald-700 text-[11px] block mt-0.5">
                      採買同仁將剩餘現金繳回主金庫，手上現存零用金相應增加。
                    </span>
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-xl font-medium cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSettleAccount}
                className="px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs cursor-pointer"
              >
                確認完成結算
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除子帳號確認 */}
      {subAccountToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="刪除此採買子帳"
          message={`確定要刪除「${subAccountToDelete.name}」嗎？此動作將刪除該帳號內部登記的 ${subAccountToDelete.items.length} 筆明細（已匯入總帳的紀錄不會被刪除）。`}
          confirmLabel="確認刪除"
          isDanger={true}
          onConfirm={() => {
            if (onDeleteSubAccount) {
              onDeleteSubAccount(subAccountToDelete.id);
            } else if (onUpdateSubAccounts) {
              onUpdateSubAccounts(subAccounts.filter((a) => a.id !== subAccountToDelete.id));
            }
            setSubAccountToDelete(null);
          }}
          onCancel={() => setSubAccountToDelete(null)}
        />
      )}

      {/* 刪除細項確認 */}
      {itemToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="刪除此筆採買支出"
          message="確定要刪除這筆採買消費紀錄嗎？"
          confirmLabel="確認刪除"
          isDanger={true}
          onConfirm={() => handleDeleteItem(itemToDelete.accountId, itemToDelete.itemId)}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
};
