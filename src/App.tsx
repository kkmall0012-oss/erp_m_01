import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Building2, 
  Sparkles, 
  SlidersHorizontal,
  FileSpreadsheet,
  Coins,
  BarChart3
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatCards } from './components/StatCards';
import { TransactionForm } from './components/TransactionForm';
import { ExpensePieChart } from './components/ExpensePieChart';
import { TransactionList } from './components/TransactionList';
import { TransactionEditModal } from './components/TransactionEditModal';
import { BudgetModal } from './components/BudgetModal';
import { SettingsModal } from './components/SettingsModal';
import { BackupModal } from './components/BackupModal';
import { DirectorWithdrawalSection } from './components/DirectorWithdrawalSection';
import { CategoryReportView } from './components/CategoryReportView';
import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  BackupData, 
  DirectorWithdrawal 
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
  const [budgets, setBudgets] = useState<Record<string, MonthBudget>>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 2. 視圖切換：'general' (零用金總帳本)、'reports' (分類月報表及年報表)、'director' (廠長專用領取簿)
  const [activeTab, setActiveTab] = useState<'general' | 'reports' | 'director'>('general');

  // 3. 編輯中狀態
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 4. 模態視窗狀態
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'categories' | 'claimants'>('categories');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // 初次載入本機所有資料
  useEffect(() => {
    const loadedTx = loadTransactions();
    const loadedCats = loadCategories();
    const loadedClaimants = loadClaimants();
    const loadedDW = loadDirectorWithdrawals();
    const loadedBdg = loadBudgets();

    setTransactions(loadedTx);
    setCategories(loadedCats);
    setClaimants(loadedClaimants);
    setDirectorWithdrawals(loadedDW);
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

  // 當 budgets 變更時儲存
  const handleBudgetsChange = (newBudgets: Record<string, MonthBudget>) => {
    setBudgets(newBudgets);
    saveBudgets(newBudgets);
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

  // 匯出 Excel
  const handleExportExcel = () => {
    const currentBudget = budgets[currentYearMonth];
    exportTransactionsToExcel(transactions, currentYearMonth, currentBudget);
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
  };

  // 清空所有資料
  const handleClearAllData = () => {
    handleTransactionsChange([]);
    handleDirectorWithdrawalsChange([]);
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

  // 當月廠長領取總額統計
  const currentMonthDirectorTotal = useMemo(() => {
    return directorWithdrawals
      .filter((d) => d.date.startsWith(currentYearMonth))
      .reduce((sum, d) => sum + d.amount, 0);
  }, [directorWithdrawals, currentYearMonth]);

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
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenSettings={() => handleOpenSettingsModal('categories')}
        onOpenBudget={() => setIsBudgetModalOpen(true)}
      />

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
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>分類月報表 & 年報表</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                月/年統計
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
              <span>廠長專用領取紀錄</span>
              {currentMonthDirectorTotal > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 font-mono">
                  本月 ${currentMonthDirectorTotal.toLocaleString()}
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
        {/* 視圖 1：公司零用金總帳本 (記帳、圖表、流水清單) */}
        {/* ========================================================= */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* 1. 財務統計指標與預算餘額警示卡片 */}
            <StatCards
              totalExpense={totalExpense}
              totalIncome={totalIncome}
              expenseCount={expenseCount}
              budget={currentBudget}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
            />

            {/* 2. 雙欄主要工作區：左側記帳表單，右側圓餅圖分析 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* 左欄：階層式選單記帳 (佔 5 欄) */}
              <div className="lg:col-span-5 space-y-4">
                <TransactionForm
                  categories={categories}
                  claimants={claimants}
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  onQuickAddSubItem={handleQuickAddSubItem}
                  onQuickAddClaimant={handleQuickAddClaimant}
                  onOpenSettings={handleOpenSettingsModal}
                />
              </div>

              {/* 右欄：圓餅圖分析與開支洞察 (佔 7 欄) */}
              <div className="lg:col-span-7">
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
        {/* 視圖 2：分類月報表及年報表 (按分類統計、月度損益與1~12月交叉樞紐表) */}
        {/* ========================================================= */}
        {activeTab === 'reports' && (
          <CategoryReportView
            transactions={transactions}
            categories={categories}
            currentYearMonth={currentYearMonth}
            budgets={budgets}
          />
        )}

        {/* ========================================================= */}
        {/* 視圖 3：廠長專用零用金領取紀錄 (精簡專用流水簿) */}
        {/* ========================================================= */}
        {activeTab === 'director' && (
          <DirectorWithdrawalSection
            records={directorWithdrawals}
            currentYearMonth={currentYearMonth}
            onAddRecord={handleAddDirectorWithdrawal}
            onDeleteRecord={handleDeleteDirectorWithdrawal}
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
              onClick={handleExportExcel}
              className="text-emerald-700 hover:text-emerald-800 font-medium"
            >
              匯出本月 Excel 報表
            </button>
          </div>
        </div>
      </footer>

      {/* 彈出視窗群 */}
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
        onRestoreBackup={handleRestoreBackup}
        onClearAllData={handleClearAllData}
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
    </div>
  );
}
