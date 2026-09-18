import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Building2, 
  Sparkles, 
  SlidersHorizontal,
  FileSpreadsheet,
  Coins,
  BarChart3,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Plus,
  Table as TableIcon
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatCards } from './components/StatCards';
import { QuickActionHub } from './components/QuickActionHub';
import { TransactionCreateModal } from './components/TransactionCreateModal';
import { ExpensePieChart } from './components/ExpensePieChart';
import { TransactionList } from './components/TransactionList';
import { TransactionEditModal } from './components/TransactionEditModal';
import { BudgetModal } from './components/BudgetModal';
import { SettingsModal } from './components/SettingsModal';
import { BackupModal } from './components/BackupModal';
import { DataImportModal } from './components/DataImportModal';
import { DirectorWithdrawalSection } from './components/DirectorWithdrawalSection';
import { CategoryReportView } from './components/CategoryReportView';
import { SubAccountSection } from './components/SubAccountSection';
import { ReportCenterView } from './components/ReportCenterView';
import { ReportExportModal } from './components/ReportExportModal';
import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  BackupData, 
  DirectorWithdrawal,
  SubAccount,
  SubAccountItem
} from './types';
import { 
  loadTransactions, 
  saveTransactions, 
  loadCategories, 
  saveCategories, 
  loadBudgets, 
  saveBudgets, 
  loadClaimants,
  saveClaimants,
  loadDirectorWithdrawals,
  saveDirectorWithdrawals,
  loadSubAccounts,
  saveSubAccounts,
  getCurrentYearMonth 
} from './utils/storage';
import { exportTransactionsToExcel } from './utils/excel';

export default function App() {
  // 1. 主要狀態
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(getCurrentYearMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [claimants, setClaimants] = useState<string[]>([]);
  const [directorWithdrawals, setDirectorWithdrawals] = useState<DirectorWithdrawal[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [budgets, setBudgets] = useState<Record<string, MonthBudget>>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 2. 視圖切換：'general' (零用金總帳本)、'reports' (分類月報表及年報表)、'director' (廠長領取記錄)、'subaccounts' (專款代管與採買子帳號)
  const [activeTab, setActiveTab] = useState<'general' | 'reports' | 'director' | 'subaccounts'>('general');

  // 3. 編輯中狀態
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 4. 模態視窗狀態
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'categories' | 'claimants'>('categories');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importNotification, setImportNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createModalType, setCreateModalType] = useState<'income' | 'expense'>('expense');
  const [createModalCategoryId, setCreateModalCategoryId] = useState<string | undefined>(undefined);
  const [isReportExportModalOpen, setIsReportExportModalOpen] = useState<boolean>(false);
  const [reportsSubTab, setReportsSubTab] = useState<'center' | 'analytics'>('center');

  // 初次載入本機所有資料
  useEffect(() => {
    const loadedTx = loadTransactions();
    const loadedCats = loadCategories();
    const loadedClaimants = loadClaimants();
    const loadedDW = loadDirectorWithdrawals();
    const loadedSubs = loadSubAccounts();
    const loadedBdg = loadBudgets();

    setTransactions(loadedTx);
    setCategories(loadedCats);
    setClaimants(loadedClaimants);
    setDirectorWithdrawals(loadedDW);
    setSubAccounts(loadedSubs);
    setBudgets(loadedBdg);
    setIsLoaded(true);
  }, []);

  // 當 transactions 變更時儲存
  const handleTransactionsChange = (newTxList: Transaction[]) => {
    setTransactions(newTxList);
    saveTransactions(newTxList);
  };

  // 當 categories 變更時儲存
  const handleCategoriesChange = (newCats: CategoryConfig[]) => {
    setCategories(newCats);
    saveCategories(newCats);
  };

  // 當 claimants 變更時儲存
  const handleClaimantsChange = (newClaimants: string[]) => {
    setClaimants(newClaimants);
    saveClaimants(newClaimants);
  };

  // 當 directorWithdrawals 變更時儲存
  const handleDirectorWithdrawalsChange = (newDW: DirectorWithdrawal[]) => {
    setDirectorWithdrawals(newDW);
    saveDirectorWithdrawals(newDW);
  };

  // 當 subAccounts 變更時儲存
  const handleSubAccountsChange = (newSubs: SubAccount[]) => {
    setSubAccounts(newSubs);
    saveSubAccounts(newSubs);
  };

  // 建立新專款子帳號 (有撥款才放，可自訂初始撥款或為 0)
  const handleAddSubAccount = (accountData: Omit<SubAccount, 'id' | 'createdAt' | 'items'> & { id?: string }) => {
    const newId = accountData.id || `sub-acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newAccount: SubAccount = {
      ...accountData,
      id: newId,
      createdAt: Date.now(),
      items: []
    };
    handleSubAccountsChange([newAccount, ...subAccounts]);
    return newAccount.id;
  };

  // 更新單一專款子帳號
  const handleUpdateSubAccount = (updatedAccount: SubAccount) => {
    const updated = subAccounts.map((acc) => (acc.id === updatedAccount.id ? updatedAccount : acc));
    handleSubAccountsChange(updated);
  };

  // 刪除專款子帳號
  const handleDeleteSubAccount = (id: string) => {
    const updated = subAccounts.filter((acc) => acc.id !== id);
    handleSubAccountsChange(updated);
  };

  // 當 budgets 變更時儲存
  const handleBudgetsChange = (newBudgets: Record<string, MonthBudget>) => {
    setBudgets(newBudgets);
    saveBudgets(newBudgets);
  };

  // 採買子帳明細整批匯入零用金總帳
  const handleImportSubAccountToGeneral = (
    subAccount: SubAccount,
    itemsToImport: SubAccountItem[],
    returnExcessFund?: number
  ) => {
    const newTxList: Transaction[] = [];

    // 依細項或所選分類匯入
    itemsToImport.forEach((item) => {
      let catId = item.categoryId || 'misc';
      let catName = item.categoryName || '採買開支';

      if (!item.categoryId) {
        const subLower = item.subItem.toLowerCase();
        if (subLower.includes('便當') || subLower.includes('餐') || subLower.includes('飯') || subLower.includes('飲料') || subLower.includes('茶')) {
          catId = 'dining';
          catName = '餐費';
        } else if (subLower.includes('油') || subLower.includes('車') || subLower.includes('運') || subLower.includes('高鐵') || subLower.includes('計程車')) {
          catId = 'fuel';
          catName = '油資/交通';
        } else if (subLower.includes('代墊') || subLower.includes('代付') || subLower.includes('借')) {
          catId = 'advance';
          catName = '同仁代墊款';
        }
      }

      newTxList.push({
        id: `tx-sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'expense',
        date: item.date,
        amount: item.amount,
        categoryId: catId,
        categoryName: catName,
        subItem: item.subItem,
        claimant: item.claimant || subAccount.custodian,
        receiptType: item.receiptType,
        invoiceNumber: item.invoiceNumber,
        note: `[採買子帳「${subAccount.name}」匯入] ${item.note || ''}`.trim(),
        createdAt: Date.now()
      });
    });

    // 若有剩餘備用金退還，建立一筆撥補收入
    if (returnExcessFund && returnExcessFund > 0) {
      newTxList.push({
        id: `tx-sub-ret-${Date.now()}`,
        type: 'income',
        date: new Date().toISOString().split('T')[0],
        amount: returnExcessFund,
        categoryId: 'replenish',
        categoryName: '撥補收入',
        subItem: `${subAccount.name} 結算退回剩餘備用金`,
        claimant: subAccount.custodian,
        note: `由採買同仁 ${subAccount.custodian} 結算繳回剩餘款`,
        createdAt: Date.now()
      });
    }

    if (newTxList.length > 0) {
      handleTransactionsChange([...newTxList, ...transactions]);
    }
  };

  // 批次匯入新資料（防重複檢核通過後的安全寫入）
  const handleImportSuccess = (newTxList: Transaction[], stats: { added: number; duplicates: number }) => {
    handleTransactionsChange([...newTxList, ...transactions]);
    setImportNotification({
      message: `成功匯入 ${stats.added} 筆全新帳務資料！${stats.duplicates > 0 ? `（已自動排除略過 ${stats.duplicates} 筆重複資料）` : ''}`,
      type: 'success'
    });
    setTimeout(() => {
      setImportNotification(null);
    }, 6000);
  };

  // 新增一般零用金記帳 (左側專用表單)
  const handleAddTransaction = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newRecord: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now()
    };
    handleTransactionsChange([newRecord, ...transactions]);
  };

  // 更新零用金記帳 (由獨立跳出彈窗專用儲存)
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map((t) =>
      t.id === updatedTx.id ? updatedTx : t
    );
    handleTransactionsChange(updated);
    setEditingTransaction(null);
  };

  // 使用者自訂快速加入子項目（店家、加油站、來源等）
  const handleQuickAddSubItem = (categoryId: string, newItem: string) => {
    const updated = categories.map((cat) => {
      if (cat.id === categoryId && !cat.defaultSubItems.includes(newItem)) {
        return {
          ...cat,
          defaultSubItems: [...cat.defaultSubItems, newItem]
        };
      }
      return cat;
    });
    handleCategoriesChange(updated);
  };

  // 快速新增請領人到常用名冊
  const handleQuickAddClaimant = (newClaimant: string) => {
    if (!claimants.includes(newClaimant)) {
      const updated = [...claimants, newClaimant];
      handleClaimantsChange(updated);
    }
  };

  // 刪除記帳
  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    handleTransactionsChange(updated);
    if (editingTransaction?.id === id) {
      setEditingTransaction(null);
    }
  };

  // 廠長領取紀錄：新增
  const handleAddDirectorWithdrawal = (record: Omit<DirectorWithdrawal, 'id' | 'createdAt'>) => {
    const newRecord: DirectorWithdrawal = {
      ...record,
      id: `dw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now()
    };
    handleDirectorWithdrawalsChange([newRecord, ...directorWithdrawals]);
  };

  // 廠長領取紀錄：刪除
  const handleDeleteDirectorWithdrawal = (id: string) => {
    const updated = directorWithdrawals.filter((d) => d.id !== id);
    handleDirectorWithdrawalsChange(updated);
  };

  // 儲存預算設定
  const handleSaveBudget = (budget: MonthBudget) => {
    const updated = {
      ...budgets,
      [budget.yearMonth]: budget
    };
    handleBudgetsChange(updated);
  };

  // 匯出 Excel (自選報表產出視窗：可單獨選流水帳/日報/分類/損益/平衡表/資金預估，亦可自選打包)
  const handleExportExcel = () => {
    setIsReportExportModalOpen(true);
  };

  // 還原備份檔
  const handleRestoreBackup = (data: BackupData) => {
    setTransactions(data.transactions);
    saveTransactions(data.transactions);

    if (data.categories && data.categories.length > 0) {
      setCategories(data.categories);
      saveCategories(data.categories);
    }

    if (data.claimants && data.claimants.length > 0) {
      setClaimants(data.claimants);
      saveClaimants(data.claimants);
    }

    if (data.directorWithdrawals) {
      setDirectorWithdrawals(data.directorWithdrawals);
      saveDirectorWithdrawals(data.directorWithdrawals);
    }

    if (data.budgets) {
      setBudgets(data.budgets);
      saveBudgets(data.budgets);
    }

    if (data.subAccounts) {
      setSubAccounts(data.subAccounts);
      saveSubAccounts(data.subAccounts);
    }
  };

  // 清空所有資料
  const handleClearAllData = () => {
    handleTransactionsChange([]);
    handleDirectorWithdrawalsChange([]);
    handleSubAccountsChange([]);
  };

  // 開啟選單管理設定彈窗
  const handleOpenSettingsModal = (tab: 'categories' | 'claimants' = 'categories') => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
  };

  // 計算當月指標數據
  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(currentYearMonth));
  }, [transactions, currentYearMonth]);

  const totalExpense = useMemo(() => {
    return monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTransactions]);

  const totalIncome = useMemo(() => {
    return monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthlyTransactions]);

  const expenseCount = useMemo(() => {
    return monthlyTransactions.filter((t) => t.type === 'expense').length;
  }, [monthlyTransactions]);

  const incomeCount = useMemo(() => {
    return monthlyTransactions.filter((t) => t.type === 'income').length;
  }, [monthlyTransactions]);

  // 當月廠長領取總額統計
  const currentMonthDirectorTotal = useMemo(() => {
    return directorWithdrawals
      .filter((d) => d.date.startsWith(currentYearMonth))
      .reduce((sum, d) => sum + d.amount, 0);
  }, [directorWithdrawals, currentYearMonth]);

  // 進行中的採買子帳
  const activeSubAccounts = useMemo(() => {
    return subAccounts.filter((s) => s.status === 'active');
  }, [subAccounts]);

  const activeSubAccountsCount = activeSubAccounts.length;

  // 撥給採買子帳的總撥出本金 (一旦撥給同仁5000，我手上的零用金就少5000)
  const activeSubAccountsAllocated = useMemo(() => {
    return activeSubAccounts.reduce((sum, s) => sum + s.initialFund, 0);
  }, [activeSubAccounts]);

  // 採買子帳已記錄的花費
  const activeSubAccountsSpent = useMemo(() => {
    return activeSubAccounts.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.amount, 0),
      0
    );
  }, [activeSubAccounts]);

  // 採買子帳目前剩餘未用的零用金額度 (在採買人手上的備用金)
  const activeSubAccountsRemaining = useMemo(() => {
    return Math.max(0, activeSubAccountsAllocated - activeSubAccountsSpent);
  }, [activeSubAccountsAllocated, activeSubAccountsSpent]);

  // 零用金實體現鈔滾存計算：
  // 撥款採取「有撥款才放，並非每月直接撥款」，某月可能無撥補，手上現鈔為前期滾存餘額
  // 因此手上的現金餘額與總水位是「歷史累計撥補 - 歷史累計總帳支出 - 目前撥給進行中子帳的款項」
  const cumulativeTransactions = useMemo(() => {
    // 統計至當前月份底的所有收支紀錄
    const endOfMonth = `${currentYearMonth}-99`;
    return transactions.filter((t) => t.date <= endOfMonth);
  }, [transactions, currentYearMonth]);

  const cumulativeIncome = useMemo(() => {
    return cumulativeTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [cumulativeTransactions]);

  const cumulativeExpense = useMemo(() => {
    return cumulativeTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [cumulativeTransactions]);

  // 手上的實體零用金 (歷史累積撥入 - 歷史累積總帳直接支出 - 目前已撥給進行中採買子帳的備用金)
  const cashOnHand = useMemo(() => {
    return cumulativeIncome - cumulativeExpense - activeSubAccountsAllocated;
  }, [cumulativeIncome, cumulativeExpense, activeSubAccountsAllocated]);

  const currentBudget = budgets[currentYearMonth];

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500 text-sm">
        正在載入公司零用金資料庫...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      {/* 頂部導覽列 */}
      <Navbar
        currentYearMonth={currentYearMonth}
        onMonthChange={setCurrentYearMonth}
        onExportExcel={handleExportExcel}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenSettings={() => handleOpenSettingsModal('categories')}
        onOpenBudget={() => setIsBudgetModalOpen(true)}
      />

      {/* 匯入通知提示列 */}
      {importNotification && (
        <div className="bg-emerald-600 text-white text-xs px-4 py-2.5 text-center font-bold flex items-center justify-center gap-2 shadow-sm animate-fade-in">
          <span>{importNotification.message}</span>
          <button
            onClick={() => setImportNotification(null)}
            className="text-emerald-100 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 主工作區容器 */}
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 分頁導航切換：總帳本 vs 分類財務報表 vs 廠長專用領取紀錄 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="inline-flex p-1 bg-stone-100 rounded-xl flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>零用金總帳本</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-700">
                {transactions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TableIcon className="w-4 h-4 text-emerald-700" />
              <span>P. 統計報表中心</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                12種報表
              </span>
            </button>

            <button
              onClick={() => setActiveTab('director')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'director'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>廠長領取記錄</span>
              {currentMonthDirectorTotal > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold transition-colors ${
                  activeTab === 'director'
                    ? 'bg-amber-400/25 text-amber-200 border border-amber-400/30'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                }`}>
                  本月 ${currentMonthDirectorTotal.toLocaleString()}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('subaccounts')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'subaccounts'
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-sky-600" />
              <span>採買子帳</span>
              {activeSubAccountsCount > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 font-mono font-bold">
                  進行中 {activeSubAccountsCount}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 font-mono">
                  0
                </span>
              )}
            </button>
          </div>

          {/* 右側快捷捷徑按鈕 (依使用者要求：只保留「自訂分類與選單」，取消原本主頁面的常用請領人名冊按鈕) */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handleOpenSettingsModal('categories')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
              <span>自訂分類與選單</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 視圖 1：公司零用金總帳本 (按鍵跳窗記帳、圖表、流水清單) */}
        {/* ========================================================= */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            {/* 1. 財務統計指標卡片 (手上的零用金 + 採買子帳零用金，本期支出為醒目紅色) */}
            <StatCards
              totalExpense={totalExpense}
              totalIncome={totalIncome}
              expenseCount={expenseCount}
              incomeCount={incomeCount}
              cashOnHand={cashOnHand}
              activeSubAccountsAllocated={activeSubAccountsAllocated}
              activeSubAccountsRemaining={activeSubAccountsRemaining}
              activeSubAccountsSpent={activeSubAccountsSpent}
              activeSubAccountsCount={activeSubAccountsCount}
              onGoToSubAccounts={() => setActiveTab('subaccounts')}
            />

            {/* 2. 核心工作站：左側為快速登記工作台 (傻瓜式大按鍵 + 常用捷徑)，右側為月度開支圓餅圖 (半寬緊湊排版) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5 flex flex-col">
                <QuickActionHub
                  onOpenModal={(type, categoryId) => {
                    setCreateModalType(type);
                    setCreateModalCategoryId(categoryId);
                    setIsCreateModalOpen(true);
                  }}
                  onGoToSubAccounts={() => setActiveTab('subaccounts')}
                  onOpenSettings={handleOpenSettingsModal}
                  cashOnHand={cashOnHand}
                  subAccountCash={activeSubAccountsRemaining}
                  activeSubAccountsCount={activeSubAccountsCount}
                />
              </div>

              <div className="lg:col-span-7 flex flex-col">
                <ExpensePieChart
                  transactions={transactions}
                  categories={categories}
                  currentYearMonth={currentYearMonth}
                />
              </div>
            </div>

            {/* 3. 下方：收支流水明細清單 */}
            <div>
              <TransactionList
                transactions={transactions}
                categories={categories}
                currentYearMonth={currentYearMonth}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={(item) => {
                  setEditingTransaction(item);
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 視圖 2：P. 統計報表中心 (支援自由選取12種獨立報表產出、流水帳、損益表、平衡表) */}
        {/* ========================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* 次級切換列 */}
            <div className="flex items-center justify-between bg-stone-100 p-1.5 rounded-xl text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setReportsSubTab('center')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    reportsSubTab === 'center'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
                  <span>P. 統計報表中心 (12類流水帳/日報/損益/平衡/預估)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportsSubTab('analytics')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    reportsSubTab === 'analytics'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-stone-600" />
                  <span>圖表統計與全年度交叉樞紐分析</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsReportExportModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 cursor-pointer shadow-2xs active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>快速產出 Excel 報表</span>
              </button>
            </div>

            {reportsSubTab === 'center' ? (
              <ReportCenterView
                transactions={transactions}
                categories={categories}
                currentYearMonth={currentYearMonth}
                budgets={budgets}
                subAccounts={subAccounts}
                directorWithdrawals={directorWithdrawals}
              />
            ) : (
              <CategoryReportView
                transactions={transactions}
                categories={categories}
                currentYearMonth={currentYearMonth}
                budgets={budgets}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 視圖 3：廠長領取記錄 (精簡專用流水簿) */}
        {/* ========================================================= */}
        {activeTab === 'director' && (
          <DirectorWithdrawalSection
            records={directorWithdrawals}
            currentYearMonth={currentYearMonth}
            onAddRecord={handleAddDirectorWithdrawal}
            onDeleteRecord={handleDeleteDirectorWithdrawal}
          />
        )}

        {/* ========================================================= */}
        {/* 視圖 4：採買子帳 (撥款採買/開支記帳/結算匯入) */}
        {/* ========================================================= */}
        {activeTab === 'subaccounts' && (
          <SubAccountSection
            subAccounts={subAccounts}
            categories={categories}
            claimants={claimants}
            onAddSubAccount={handleAddSubAccount}
            onUpdateSubAccount={handleUpdateSubAccount}
            onDeleteSubAccount={handleDeleteSubAccount}
            onImportItemsToGeneral={handleImportSubAccountToGeneral}
          />
        )}
      </main>

      {/* 頁腳資訊 */}
      <footer className="py-6 border-t border-stone-200/80 bg-white/60 text-center text-xs text-stone-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>公司零用金管理與開支分析工具 · 單機離線安全版 (NT$ 新台幣)</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="text-stone-600 hover:text-stone-900 underline"
            >
              10年資料備份導引
            </button>
            <span>·</span>
            <button
              onClick={() => handleOpenSettingsModal('categories')}
              className="text-stone-600 hover:text-stone-900 underline"
            >
              自訂下拉選單
            </button>
            <span>·</span>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="text-sky-700 hover:text-sky-800 font-medium cursor-pointer"
            >
              匯入 Excel 帳務 (智慧防重複)
            </button>
            <span>·</span>
            <button
              onClick={handleExportExcel}
              className="text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
            >
              匯出本月綜合報表 (Excel)
            </button>
          </div>
        </div>
      </footer>

      {/* 彈出視窗群 */}
      {/* 零用金收支登記視窗 (按按鍵跳出：支出/收入) */}
      <TransactionCreateModal
        isOpen={isCreateModalOpen}
        type={createModalType}
        defaultCategoryId={createModalCategoryId}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateModalCategoryId(undefined);
        }}
        categories={categories}
        claimants={claimants}
        transactions={transactions}
        currentYearMonth={currentYearMonth}
        onAddTransaction={handleAddTransaction}
        onQuickAddSubItem={handleQuickAddSubItem}
        onQuickAddClaimant={handleQuickAddClaimant}
        onOpenSettings={handleOpenSettingsModal}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentYearMonth={currentYearMonth}
        currentBudget={currentBudget}
        onSaveBudget={handleSaveBudget}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        categories={categories}
        onSaveCategories={handleCategoriesChange}
        claimants={claimants}
        onSaveClaimants={handleClaimantsChange}
        initialTab={settingsInitialTab}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        transactions={transactions}
        categories={categories}
        budgets={budgets}
        claimants={claimants}
        directorWithdrawals={directorWithdrawals}
        subAccounts={subAccounts}
        onRestoreBackup={handleRestoreBackup}
        onClearAllData={handleClearAllData}
      />

      {/* 帳務資料匯入視窗 (支援 Excel 空白範本下載、上傳與智慧防重複檢視) */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingTransactions={transactions}
        categories={categories}
        claimants={claimants}
        onImportSuccess={handleImportSuccess}
      />

      {/* 獨立跳出修改視窗 (專用於明細清單的修改動作，不佔用左側專用記帳表單) */}
      <TransactionEditModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        categories={categories}
        claimants={claimants}
        onSave={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* 自選專業報表產出視窗 (讓使用者自由勾選想產出的報表，而非強制只產出一種) */}
      <ReportExportModal
        isOpen={isReportExportModalOpen}
        onClose={() => setIsReportExportModalOpen(false)}
        onNavigateToReportCenter={(reportId) => {
          setActiveTab('reports');
          setReportsSubTab('center');
        }}
        transactions={transactions}
        categories={categories}
        currentYearMonth={currentYearMonth}
        budgets={budgets}
        subAccounts={subAccounts}
        directorWithdrawals={directorWithdrawals}
      />
    </div>
  );
}
