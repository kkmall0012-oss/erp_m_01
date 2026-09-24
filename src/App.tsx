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
  Table as TableIcon,
  Building
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ErpTopBar } from './components/erp/ErpTopBar';
import { ErpSidebar, ERP_APPS, ErpAppId } from './components/erp/ErpSidebar';
import { ErpDashboardView } from './components/erp/ErpDashboardView';
import { ErpModulePlaceholder } from './components/erp/ErpModulePlaceholder';
import { ErpDatabaseView } from './components/erp/ErpDatabaseView';
import { CompanySettingsView } from './components/erp/CompanySettingsView';
import { CustomerManagementView } from './components/erp/CustomerManagementView';
import { SupplierManagementView } from './components/erp/SupplierManagementView';
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
  SubAccountItem,
  RestoreOptions,
  CompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  DEFAULT_COMPANIES,
  Customer
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
  saveCompanies,
  saveCompanyProfile,
  loadCustomers,
  saveCustomers,
  getCurrentYearMonth 
} from './utils/storage';
import { exportTransactionsToExcel, formatSystemVoucherId, generateMyMoneyNativeVoucherId } from './utils/excel';
import { 
  fetchBootstrap, 
  createTransactionApi, 
  updateTransactionApi, 
  deleteTransactionApi, 
  syncAllTransactionsApi, 
  syncCategoriesApi, 
  syncClaimantsApi, 
  syncBudgetsApi, 
  syncSubAccountsApi, 
  syncDirectorWithdrawalsApi, 
  migrateFromLocalApi,
  saveCompanyProfileApi,
  saveCompaniesApi,
  fetchCustomers,
  syncCustomersBatchApi,
  restoreModularDataApi
} from './services/api';

export default function App() {
  // 1. 主要狀態
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(getCurrentYearMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [claimants, setClaimants] = useState<string[]>([]);
  const [directorWithdrawals, setDirectorWithdrawals] = useState<DirectorWithdrawal[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [budgets, setBudgets] = useState<Record<string, MonthBudget>>({});
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [companies, setCompanies] = useState<CompanyProfile[]>(DEFAULT_COMPANIES);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>('all');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 0. 客製化 ERP 大框架模組狀態 ('home' | 'petty_cash' | 'fleet' | 'assets' | 'workflow' | 'database')
  const [activeApp, setActiveApp] = useState<ErpAppId>('petty_cash');
  // 左側邊欄展開/收合 (預設 true：仿鼎新經典圖示+下方文字直立欄，展開為 200px 抽屜)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);

  // 當前選取的 ERP 模組設定
  const activeAppItem = useMemo(() => {
    return ERP_APPS.find(app => app.id === activeApp) || ERP_APPS[1];
  }, [activeApp]);

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

  // 初次載入：優先從後端 SQLite 資料庫讀取所有資料
  const reloadFromDb = async () => {
    try {
      const bootstrap = await fetchBootstrap();
      if (bootstrap && bootstrap.success) {
        // 如果 SQLite 是全新空的，而瀏覽器過去曾有資料，自動遷移至 SQLite
        const localTx = loadTransactions();
        if (bootstrap.transactions.length === 0 && localTx.length > 0) {
          console.log('偵測到瀏覽器舊有資料，正在自動無縫遷移至 SQLite 資料庫...');
          await migrateFromLocalApi({
            transactions: localTx,
            categories: loadCategories(),
            claimants: loadClaimants(),
            budgets: loadBudgets(),
            subAccounts: loadSubAccounts(),
            directorWithdrawals: loadDirectorWithdrawals()
          });
          const refreshed = await fetchBootstrap();
          setTransactions(refreshed.transactions);
          setCategories(refreshed.categories);
          setClaimants(refreshed.claimants);
          setBudgets(refreshed.budgets);
          setSubAccounts(refreshed.subAccounts);
          setDirectorWithdrawals(refreshed.directorWithdrawals);
          if (refreshed.companies && refreshed.companies.length > 0) {
            setCompanies(refreshed.companies);
            const def = refreshed.companies.find((c: any) => c.isDefault) || refreshed.companies[0];
            setCompanyProfile(def);
          } else if (refreshed.companyProfile) {
            setCompanyProfile(refreshed.companyProfile);
          }
          if (refreshed.customers) {
            setCustomers(refreshed.customers);
            saveCustomers(refreshed.customers);
          }
        } else {
          setTransactions(bootstrap.transactions);
          setCategories(bootstrap.categories);
          setClaimants(bootstrap.claimants);
          setBudgets(bootstrap.budgets);
          setSubAccounts(bootstrap.subAccounts);
          setDirectorWithdrawals(bootstrap.directorWithdrawals);
          if (bootstrap.companies && bootstrap.companies.length > 0) {
            setCompanies(bootstrap.companies);
            const def = bootstrap.companies.find((c: any) => c.isDefault) || bootstrap.companies[0];
            setCompanyProfile(def);
          } else if (bootstrap.companyProfile) {
            setCompanyProfile(bootstrap.companyProfile);
          }
          if (bootstrap.customers) {
            setCustomers(bootstrap.customers);
            saveCustomers(bootstrap.customers);
          }
        }
      }
    } catch (err) {
      console.warn('載入 SQLite 資料庫失敗，切換至本機備援快照', err);
      setTransactions(loadTransactions());
      setCategories(loadCategories());
      setClaimants(loadClaimants());
      setDirectorWithdrawals(loadDirectorWithdrawals());
      setSubAccounts(loadSubAccounts());
      setBudgets(loadBudgets());
      setCustomers(loadCustomers());
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    reloadFromDb();
  }, []);

  // 當 transactions 變更時儲存至記憶體、本機快照與 SQLite
  const handleTransactionsChange = (newTxList: Transaction[]) => {
    setTransactions(newTxList);
    saveTransactions(newTxList);
    syncAllTransactionsApi(newTxList).catch((err) => console.error('SQLite transactions sync error:', err));
  };

  // 當 categories 變更時儲存
  const handleCategoriesChange = (newCats: CategoryConfig[]) => {
    setCategories(newCats);
    saveCategories(newCats);
    syncCategoriesApi(newCats).catch((err) => console.error('SQLite categories sync error:', err));
  };

  // 當 claimants 變更時儲存
  const handleClaimantsChange = (newClaimants: string[]) => {
    setClaimants(newClaimants);
    saveClaimants(newClaimants);
    syncClaimantsApi(newClaimants).catch((err) => console.error('SQLite claimants sync error:', err));
  };

  // 當 directorWithdrawals 變更時儲存
  const handleDirectorWithdrawalsChange = (newDW: DirectorWithdrawal[]) => {
    setDirectorWithdrawals(newDW);
    saveDirectorWithdrawals(newDW);
    syncDirectorWithdrawalsApi(newDW).catch((err) => console.error('SQLite directorWithdrawals sync error:', err));
  };

  // 當 subAccounts 變更時儲存
  const handleSubAccountsChange = (newSubs: SubAccount[]) => {
    setSubAccounts(newSubs);
    saveSubAccounts(newSubs);
    syncSubAccountsApi(newSubs).catch((err) => console.error('SQLite subAccounts sync error:', err));
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
    syncBudgetsApi(newBudgets).catch((err) => console.error('SQLite budgets sync error:', err));
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
    const createdAt = Date.now();
    const yearMonth = data.date.slice(0, 7);
    const monthSeq = transactions.filter((t) => t.date.startsWith(yearMonth)).length + 1;
    // 1. 產生帳務小管家建檔模式編號 (P + 8碼年月日 + 6碼時分秒 + 3碼毫秒)
    const rawVoucherId = generateMyMoneyNativeVoucherId(data.date, createdAt, monthSeq);
    // 2. 加工為系統專用高可讀性傳票號 (方案 A: P2026090714-0001)
    const voucherNo = formatSystemVoucherId(data.date, monthSeq, rawVoucherId, createdAt);
    const assignedCompanyId = data.companyId || (activeCompanyId === 'all' ? (companies[0]?.id || 'comp_1') : activeCompanyId);

    const newRecord: Transaction = {
      ...data,
      id: voucherNo,
      voucherNo,
      rawVoucherId,
      companyId: assignedCompanyId,
      createdAt
    };
    handleTransactionsChange([newRecord, ...transactions]);
    return newRecord;
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
      const isMatch =
        cat.id === categoryId ||
        ((categoryId === 'replenish' || categoryId === 'replenishment') &&
          (cat.id === 'replenish' || cat.id === 'replenishment' || cat.type === 'income'));
      if (isMatch && !cat.defaultSubItems.includes(newItem)) {
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
    const updated = transactions.filter((t) => t.id !== id && t.voucherNo !== id);
    handleTransactionsChange(updated);
    if (editingTransaction?.id === id || editingTransaction?.voucherNo === id) {
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

  // 還原備份檔 (支援全庫還原、僅還原選單設定、僅還原流水帳、自選模組精準還原)
  const handleRestoreBackup = async (data: BackupData, options?: RestoreOptions) => {
    const scope = options?.scope || 'full';

    // 模組獨立精準還原
    if (scope === 'modular' && options?.selectedModules && options.selectedModules.length > 0) {
      try {
        const mode = options.mode || 'replace';
        await restoreModularDataApi(data, options.selectedModules, mode);
        await reloadFromDb();
        setImportNotification({
          type: 'success',
          message: `✓ 已成功完成【${options.selectedModules.length} 個指定模組】之${mode === 'merge' ? '智慧合併追加' : '鏡像覆蓋替換'}還原！資料庫已即時同步更新。`
        });
      } catch (err: any) {
        setImportNotification({
          type: 'error',
          message: `模組還原失敗：${err.message}`
        });
      }
      return;
    }

    if (scope === 'settings_only') {
      // 僅還原選單項目、店家與請領人名冊 (完全保留現有記帳明細)
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
        saveCategories(data.categories);
      }
      if (data.claimants && data.claimants.length > 0) {
        setClaimants(data.claimants);
        saveClaimants(data.claimants);
      }
      if (data.budgets) {
        setBudgets(data.budgets);
        saveBudgets(data.budgets);
      }
      if (data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
        saveCompanies(data.companies);
        saveCompaniesApi(data.companies).catch(console.error);
        const def = data.companies.find((c) => c.isDefault) || data.companies[0];
        setCompanyProfile(def);
        saveCompanyProfile(def);
      } else if (data.companyProfile) {
        setCompanyProfile(data.companyProfile);
        saveCompanyProfile(data.companyProfile);
        saveCompanyProfileApi(data.companyProfile).catch(console.error);
      }
      setImportNotification({
        type: 'success',
        message: `✓ 已成功救回自訂主題分類、常用請領人名冊與公司行號設定！您現有的 ${transactions.length} 筆流水帳與專款明細完全保留、毫無遺失。`
      });
      return;
    }

    if (scope === 'transactions_only') {
      // 僅還原流水帳紀錄 (保留現有選單項目設定)
      setTransactions(data.transactions);
      saveTransactions(data.transactions);
      if (data.directorWithdrawals) {
        setDirectorWithdrawals(data.directorWithdrawals);
        saveDirectorWithdrawals(data.directorWithdrawals);
      }
      if (data.subAccounts) {
        setSubAccounts(data.subAccounts);
        saveSubAccounts(data.subAccounts);
      }
      setImportNotification({
        type: 'success',
        message: `✓ 已成功還原 ${data.transactions.length} 筆歷史記帳流水！現有的自訂選單與請領人名冊維持不變。`
      });
      return;
    }

    // 預設 full：全庫完整覆蓋鏡像還原
    setTransactions(data.transactions);
    saveTransactions(data.transactions);
    syncAllTransactionsApi(data.transactions).catch(console.error);

    if (data.categories && data.categories.length > 0) {
      setCategories(data.categories);
      saveCategories(data.categories);
      syncCategoriesApi(data.categories).catch(console.error);
    }

    if (data.claimants && data.claimants.length > 0) {
      setClaimants(data.claimants);
      saveClaimants(data.claimants);
      syncClaimantsApi(data.claimants).catch(console.error);
    }

    if (data.directorWithdrawals) {
      setDirectorWithdrawals(data.directorWithdrawals);
      saveDirectorWithdrawals(data.directorWithdrawals);
      syncDirectorWithdrawalsApi(data.directorWithdrawals).catch(console.error);
    }

    if (data.budgets) {
      setBudgets(data.budgets);
      saveBudgets(data.budgets);
      syncBudgetsApi(data.budgets).catch(console.error);
    }

    if (data.subAccounts) {
      setSubAccounts(data.subAccounts);
      saveSubAccounts(data.subAccounts);
      syncSubAccountsApi(data.subAccounts).catch(console.error);
    }

    if (data.companies && data.companies.length > 0) {
      setCompanies(data.companies);
      saveCompanies(data.companies);
      saveCompaniesApi(data.companies).catch(console.error);
      const def = data.companies.find((c) => c.isDefault) || data.companies[0];
      setCompanyProfile(def);
      saveCompanyProfile(def);
    } else if (data.companyProfile) {
      setCompanyProfile(data.companyProfile);
      saveCompanyProfile(data.companyProfile);
      saveCompanyProfileApi(data.companyProfile).catch(console.error);
    }

    if (data.customers && data.customers.length > 0) {
      setCustomers(data.customers);
      saveCustomers(data.customers);
      syncCustomersBatchApi(data.customers).catch(console.error);
    }

    setImportNotification({
      type: 'success',
      message: `✓ 已完成全資料庫完整還原！已恢復 ${data.transactions.length} 筆帳目、${data.categories?.length || 0} 個主題分類、${data.customers?.length || 0} 筆客戶聯絡人與公司行號設定。`
    });
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

  // 當前選取的作帳公司物件 (若是 'all' 則代表合併檢視三間關係企業)
  const activeCompany = useMemo(() => {
    if (activeCompanyId === 'all') return null;
    return companies.find((c) => c.id === activeCompanyId) || companies[0] || companyProfile;
  }, [companies, activeCompanyId, companyProfile]);

  // 三社共用零用金之法定掛名主體公司
  const nominalCompany = useMemo(() => {
    return companies.find((c) => c.isNominalPettyCashHolder) || companies.find((c) => c.isDefault) || companies[0] || companyProfile;
  }, [companies, companyProfile]);

  // 依當前選取的公司行號篩選之交易清單 (三間公司分開記帳核心，隨時切換)
  const activeTransactions = useMemo(() => {
    if (activeCompanyId === 'all') {
      return transactions;
    }
    return transactions.filter(
      (t) => (t.companyId || companies[0]?.id || 'comp_1') === activeCompanyId
    );
  }, [transactions, activeCompanyId, companies]);

  // 計算當月指標數據 (依選定之公司或合併)
  const monthlyTransactions = useMemo(() => {
    return activeTransactions.filter((t) => t.date.startsWith(currentYearMonth));
  }, [activeTransactions, currentYearMonth]);

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
    return activeTransactions.filter((t) => t.date <= endOfMonth);
  }, [activeTransactions, currentYearMonth]);

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
    <div className="min-h-screen h-screen flex flex-col bg-stone-100 text-stone-900 font-sans overflow-hidden">
      {/* 1. 最頂部：深藍色企業級導航列 (仿鼎新 A1 頂欄) */}
      <ErpTopBar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        activeAppTitle={activeAppItem.name}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onReloadData={reloadFromDb}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onSelectCompany={(id) => setActiveCompanyId(id)}
        onGoToCompanySettings={() => setActiveApp('company')}
      />

      {/* 2. 主體架構：左側直立選單 + 右側工作視窗 */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 左側鼎新風格直立導航欄 (整合各小程式入口) */}
        <ErpSidebar
          activeApp={activeApp}
          onSelectApp={(id) => setActiveApp(id)}
          isCollapsed={isSidebarCollapsed}
        />

        {/* 右側主工作視窗 (各功能視窗獨立純淨排版) */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-stone-50/90 min-h-0">
          {/* 小程式 1：系統總覽首頁 */}
          {activeApp === 'home' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <ErpDashboardView
                onSelectApp={(id) => setActiveApp(id)}
                transactions={activeTransactions}
                cashOnHand={cashOnHand}
                currentYearMonth={currentYearMonth}
                onOpenBackupModal={() => setIsBackupModalOpen(true)}
              />
            </div>
          )}

          {/* 小程式 2：公司基本設定 (三間獨立公司之企業基礎主檔庫維護) */}
          {activeApp === 'company' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <CompanySettingsView
                companies={companies}
                activeCompanyId={activeCompanyId}
                onGoToReports={() => {
                  setActiveApp('petty_cash');
                  setActiveTab('reports');
                  setReportsSubTab('center');
                }}
                onUpdateCompanies={(updated) => {
                  setCompanies(updated);
                  const def = updated.find(c => c.isDefault) || updated[0];
                  if (def) setCompanyProfile(def);
                  // 若目前選取的 activeCompanyId 已被刪除，自動導向現存有效公司
                  if (activeCompanyId !== 'all' && !updated.some(c => c.id === activeCompanyId)) {
                    setActiveCompanyId(def ? def.id : 'all');
                  }
                }}
              />
            </div>
          )}

          {/* 小程式 3：客戶名冊管理 (區分個人客戶及店家/企業) */}
          {activeApp === 'customers' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <CustomerManagementView
                customers={customers}
                companies={companies}
                activeCompanyId={activeCompanyId}
                transactions={transactions}
                categories={categories}
                claimants={claimants}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onRefreshCustomers={reloadFromDb}
                onSwitchToSuppliers={() => setActiveApp('suppliers')}
              />
            </div>
          )}

          {/* 小程式 4：合作廠商管理 (業務所屬分類、付款帳號與一鍵產出通訊名冊) */}
          {activeApp === 'suppliers' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <SupplierManagementView
                customers={customers}
                companies={companies}
                activeCompanyId={activeCompanyId}
                transactions={transactions}
                categories={categories}
                claimants={claimants}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onRefreshCustomers={reloadFromDb}
                onSwitchToCustomers={() => setActiveApp('customers')}
              />
            </div>
          )}

          {/* 小程式 2：公司零用金管理系統 (原完整零用金工作台) */}
          {activeApp === 'petty_cash' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* 零用金月份與工具導覽列 */}
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

              {/* 零用金主工作區 */}
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
                7種核心報表
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
                  transactions={activeTransactions}
                  categories={categories}
                  currentYearMonth={currentYearMonth}
                />
              </div>
            </div>

            {/* 3. 下方：收支流水明細清單 (支援顯示關係企業歸屬與分開作帳) */}
            <div>
              <TransactionList
                transactions={activeTransactions}
                categories={categories}
                currentYearMonth={currentYearMonth}
                companies={companies}
                activeCompanyId={activeCompanyId}
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
                transactions={activeTransactions}
                categories={categories}
                currentYearMonth={currentYearMonth}
                budgets={budgets}
                subAccounts={subAccounts}
                directorWithdrawals={directorWithdrawals}
                companyProfile={activeCompany || nominalCompany}
                companies={companies}
                activeCompanyId={activeCompanyId}
              />
            ) : (
              <CategoryReportView
                transactions={activeTransactions}
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
    </div>
  )}

          {/* 小程式 6：SQLite 實體資料庫中心 */}
          {activeApp === 'database' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <ErpDatabaseView
                onOpenBackupModal={() => setIsBackupModalOpen(true)}
                onGoToPettyCash={() => setActiveApp('petty_cash')}
                onReloadData={reloadFromDb}
              />
            </div>
          )}

          {/* 預留客製化模組 (車輛油資、物品資產、洽談簽核) */}
          {(activeApp === 'fleet' || activeApp === 'assets' || activeApp === 'workflow') && (
            <div className="p-4 sm:p-6 lg:p-8">
              <ErpModulePlaceholder
                app={activeAppItem}
                onGoToPettyCash={() => setActiveApp('petty_cash')}
                onGoToHome={() => setActiveApp('home')}
              />
            </div>
          )}

        </div>
      </div>

      {/* 3. 最底部：父視窗切割出的專屬固定底部狀態列 (Down Frame)，完全獨立於各子頁面 */}
      <footer className="shrink-0 py-1.5 px-4 bg-white border-t border-stone-200 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-2 select-none z-20 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0066cc]">企業客製化商務系統 (ERP)</span>
          <span className="text-stone-300">|</span>
          <span>實體資料庫：SQLite 3 (data/petty_cash.sqlite)</span>
          {activeCompany && (
            <>
              <span className="text-stone-300">|</span>
              <span className="font-medium text-stone-700">
                目前作帳：<span className="font-bold text-[#0066cc]">{activeCompany.name}</span> (統編: {activeCompany.taxId || '未設定'})
              </span>
            </>
          )}
          {activeCompanyId === 'all' && (
            <>
              <span className="text-stone-300">|</span>
              <span className="font-medium text-amber-700 font-semibold">
                目前檢視：田頭關係企業共用金庫（法定掛名：{nominalCompany?.name || '田頭工程有限公司'}）
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-stone-500">當前工作模組：{activeAppItem.name}</span>
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            資料庫連線中
          </span>
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
        companies={companies}
        activeCompanyId={activeCompanyId}
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
        companies={companies}
        companyProfile={companyProfile}
        customers={customers}
        onRestoreBackup={handleRestoreBackup}
        onClearAllData={handleClearAllData}
        onReloadAllData={reloadFromDb}
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
        companies={companies}
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
        transactions={activeTransactions}
        categories={categories}
        currentYearMonth={currentYearMonth}
        budgets={budgets}
        subAccounts={subAccounts}
        directorWithdrawals={directorWithdrawals}
      />
    </div>
  );
}
