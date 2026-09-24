import React, { useRef, useState, useMemo } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  HardDrive,
  CheckCircle2,
  Trash2,
  Check,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  GitBranch,
  RefreshCw,
  FolderDown,
  Layers,
  Sparkles,
  Building2,
  Users,
  FileSpreadsheet,
  SlidersHorizontal,
  Package,
  Target,
  Landmark
} from 'lucide-react';
import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  BackupData, 
  DirectorWithdrawal, 
  SubAccount, 
  CompanyProfile,
  Customer,
  RestoreScope, 
  RestoreOptions,
  DatabaseModuleKey,
  DATABASE_MODULE_CONFIGS,
  RestoreMode
} from '../types';
import { 
  exportBackupJSON, 
  exportModularBackupJSON, 
  parseBackupJSON 
} from '../utils/storage';
import { 
  triggerDownloadSqliteFile, 
  triggerDownloadSqlDumpFile, 
  triggerDownloadFullJsonBackupFile, 
  triggerDownloadModularJsonBackupFile, 
  uploadSqliteFileApi,
  exportSeedsApi 
} from '../services/api';
import { decryptBackupData } from '../utils/crypto';
import { ConfirmDialog } from './ConfirmDialog';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: CategoryConfig[];
  budgets: Record<string, MonthBudget>;
  claimants?: string[];
  directorWithdrawals?: DirectorWithdrawal[];
  subAccounts?: SubAccount[];
  companies?: CompanyProfile[];
  companyProfile?: CompanyProfile;
  customers?: Customer[];
  onRestoreBackup: (data: BackupData, options?: RestoreOptions) => Promise<void> | void;
  onClearAllData: () => void;
  onReloadAllData?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  budgets,
  claimants,
  directorWithdrawals,
  subAccounts,
  companies,
  companyProfile,
  customers,
  onRestoreBackup,
  onClearAllData,
  onReloadAllData
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqliteInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
  const [restoreStatus, setRestoreStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isUploadingSqlite, setIsUploadingSqlite] = useState<boolean>(false);
  const [isExportingSeeds, setIsExportingSeeds] = useState<boolean>(false);

  // 密碼保護 (AES-256 加密) 狀態
  const [enablePassword, setEnablePassword] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 還原狀態
  const [pendingRestore, setPendingRestore] = useState<BackupData | null>(null);
  const [selectedModulesToRestore, setSelectedModulesToRestore] = useState<DatabaseModuleKey[]>([]);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('replace');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // 加密解密彈窗狀態
  const [encryptedPayloadToDecrypt, setEncryptedPayloadToDecrypt] = useState<any | null>(null);
  const [decryptPassword, setDecryptPassword] = useState<string>('');
  const [decryptError, setDecryptError] = useState<string>('');
  const [showDecryptPassword, setShowDecryptPassword] = useState<boolean>(false);

  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  // 聚合當前系統各模組資料總筆數
  const currentStats: Record<DatabaseModuleKey, { count: number; unit: string }> = {
    companies: { count: companies?.length || 1, unit: '家行號' },
    customers: { count: customers?.length || 0, unit: '位/家' },
    transactions: { count: transactions.length, unit: '筆記帳' },
    categories_claimants: { count: categories.length + (claimants?.length || 0), unit: '類/位' },
    sub_accounts: { count: subAccounts?.length || 0, unit: '個子帳' },
    budgets: { count: Object.keys(budgets).length, unit: '個月份' },
    director_withdrawals: { count: directorWithdrawals?.length || 0, unit: '筆提領' }
  };

  // 下載實體 SQLite 資料庫檔案 (帶著走)
  const handleDownloadSqlite = () => {
    triggerDownloadSqliteFile();
    setRestoreStatus('已開始下載 SQLite 實體資料庫檔案 (petty_cash.sqlite)！可直接存入隨身碟帶著走。');
  };

  // 下載純文字標準 SQL 語法備份檔 (.sql)
  const handleDownloadSqlDump = () => {
    triggerDownloadSqlDumpFile();
    setRestoreStatus('已開始下載標準 SQL 語法備份檔 (.sql)！包含全部資料表結構與所有資料列。');
  };

  // 下載完整全庫 JSON 備份檔 (支援選配 AES-256 加密)
  const handleDownloadFullBackup = async () => {
    try {
      setErrorMessage('');
      await exportBackupJSON(
        transactions,
        categories,
        budgets,
        claimants,
        directorWithdrawals,
        subAccounts,
        companies,
        companyProfile,
        customers,
        enablePassword ? password : undefined
      );
      setRestoreStatus(
        enablePassword
          ? '🎉 已成功產出並下載【AES-256 安全加密】系統全庫備份檔！'
          : '🎉 已成功產出並下載系統全庫完整備份檔 (.json)！'
      );
    } catch (err: any) {
      setErrorMessage(err.message || '匯出備份失敗');
    }
  };

  // 單獨匯出特定模組備份檔 (支援選配 AES-256 加密)
  const handleExportModule = async (moduleKey: DatabaseModuleKey) => {
    try {
      setErrorMessage('');
      const allData = {
        transactions,
        categories,
        budgets,
        claimants,
        directorWithdrawals,
        subAccounts,
        companies,
        companyProfile,
        customers
      };
      await exportModularBackupJSON(moduleKey, allData, enablePassword ? password : undefined);
      const label = DATABASE_MODULE_CONFIGS[moduleKey]?.label || moduleKey;
      setRestoreStatus(`🎉 已成功單獨下載【${label}】模組備份檔！${enablePassword ? '（已套用 AES-256 加密保護）' : ''}`);
    } catch (err: any) {
      setErrorMessage(err.message || '匯出模組備份失敗');
    }
  };

  // 同步匯出 Git 種子資料檔 (data/seeds/*.json)
  const handleExportSeeds = async () => {
    try {
      setIsExportingSeeds(true);
      setErrorMessage('');
      const res = await exportSeedsApi();
      setRestoreStatus(res.message || '🎉 最新資料庫已成功寫入 data/seeds/*.json！接力開發的同仁只需 git pull 即可共用。');
    } catch (err: any) {
      setErrorMessage(err.message || '匯出 Git 種子資料失敗');
    } finally {
      setIsExportingSeeds(false);
    }
  };

  // 匯入實體 SQLite 資料庫檔案、.sql 腳本或通用備份 (換機直接置換)
  const handleSqliteFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingSqlite(true);
      setErrorMessage('');
      setRestoreStatus('');

      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        setErrorMessage('⚠️ 試算表檔案請至主畫面點選【快速匯入】；此處專門載入 .sqlite / .sql / .json 系統級資料庫備份。');
        return;
      }

      const res = await uploadSqliteFileApi(file);
      setRestoreStatus(res.message || '🎉 資料庫已成功載入並替換！所有主檔與記帳明細已 100% 恢復！');
      if (onReloadAllData) {
        await onReloadAllData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || '載入資料庫檔案失敗');
    } finally {
      setIsUploadingSqlite(false);
      e.target.value = '';
    }
  };

  // 匯入 JSON 備份檔（支援全庫或單一模組、自動偵測加密）
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const parsedResult = parseBackupJSON(content);
      if (!parsedResult) {
        setErrorMessage('備份檔案格式不正確或已毀損，請確認是否為本系統匯出的 .json 或 .enc.json 備份檔');
        return;
      }

      if (parsedResult.isEncrypted && parsedResult.encryptedPayload) {
        // 加密檔案，跳出解密輸入框
        setEncryptedPayloadToDecrypt(parsedResult.encryptedPayload);
        setDecryptPassword('');
        setDecryptError('');
        return;
      }

      if (parsedResult.data) {
        prepareRestoreDialog(parsedResult.data);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 解密已加密之備份檔案
  const handleDecryptAndProceed = async () => {
    if (!encryptedPayloadToDecrypt) return;
    if (!decryptPassword) {
      setDecryptError('請輸入解密密碼');
      return;
    }

    try {
      setDecryptError('');
      const plainData = await decryptBackupData(encryptedPayloadToDecrypt, decryptPassword);
      const parsedResult = parseBackupJSON(JSON.stringify(plainData));
      if (!parsedResult || !parsedResult.data) {
        setDecryptError('解密成功但資料格式無效');
        return;
      }
      setEncryptedPayloadToDecrypt(null);
      prepareRestoreDialog(parsedResult.data);
    } catch (err: any) {
      setDecryptError(err.message || '密碼錯誤或解密失敗');
    }
  };

  // 準備還原對話框，預設勾選可用模組
  const prepareRestoreDialog = (data: BackupData) => {
    setPendingRestore(data);

    // 找出備份檔中真正含有資料的模組
    const availableModules: DatabaseModuleKey[] = [];
    if (data.companies && data.companies.length > 0) availableModules.push('companies');
    else if (data.companyProfile) availableModules.push('companies');

    if (data.customers && data.customers.length > 0) availableModules.push('customers');
    if (data.transactions && data.transactions.length > 0) availableModules.push('transactions');
    if ((data.categories && data.categories.length > 0) || (data.claimants && data.claimants.length > 0)) {
      availableModules.push('categories_claimants');
    }
    if (data.subAccounts && data.subAccounts.length > 0) availableModules.push('sub_accounts');
    if (data.budgets && Object.keys(data.budgets).length > 0) availableModules.push('budgets');
    if (data.directorWithdrawals && data.directorWithdrawals.length > 0) availableModules.push('director_withdrawals');

    // 若是單一模組備份檔，預設只勾選該模組
    if (data.backupType === 'module' && data.moduleKey) {
      setSelectedModulesToRestore([data.moduleKey]);
    } else {
      // 全庫備份包，預設全選
      setSelectedModulesToRestore(availableModules.length > 0 ? availableModules : ['transactions', 'companies']);
    }
    setRestoreMode('replace');
  };

  // 模組切換勾選
  const toggleModuleSelection = (key: DatabaseModuleKey) => {
    setSelectedModulesToRestore((prev) => 
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // 執行自選模組還原
  const handleConfirmRestore = async () => {
    if (!pendingRestore || selectedModulesToRestore.length === 0) return;

    try {
      setIsRestoring(true);
      await onRestoreBackup(pendingRestore, {
        scope: 'modular',
        selectedModules: selectedModulesToRestore,
        mode: restoreMode
      });
      setRestoreStatus(`🎉 已成功完成【${selectedModulesToRestore.length} 個模組】之${restoreMode === 'merge' ? '智慧合併追加' : '鏡像覆蓋替換'}還原！`);
      setPendingRestore(null);
      setTimeout(() => {
        setRestoreStatus('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || '還原執行失敗');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 頂端標頭 */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  資料庫全庫與模組獨立備份還原中心
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  SQLite 3 實體庫
                </span>
              </div>
              <p className="text-xs text-stone-500">
                純本地端儲存 · 支援全庫/單模組獨立抽離 · AES-256 加密保密 · 接力開發同步
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 頁籤切換：備份匯出 vs 載入還原 */}
        <div className="px-6 pt-3 border-b border-stone-200 flex items-center gap-4 bg-stone-50/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出備份 (全庫 / 獨立模組)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'restore'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>資料庫載入與智慧模組還原</span>
          </button>
        </div>

        {/* 內容卷動區 */}
        <div className="p-6 overflow-y-auto space-y-5 grow text-xs">
          {/* 還原或操作成功提示 */}
          {restoreStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-2 font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{restoreStatus}</span>
            </div>
          )}

          {/* 錯誤提示 */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 目前資料庫狀態儀表 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-stone-100/70 rounded-xl border border-stone-200 text-stone-700">
            <div>
              <span className="text-[10px] text-stone-500 block">公司行號主檔</span>
              <span className="text-xs font-bold text-stone-900 font-mono">
                {currentStats.companies.count} {currentStats.companies.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 block">客戶與廠商</span>
              <span className="text-xs font-bold text-indigo-700 font-mono">
                {currentStats.customers.count} {currentStats.customers.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 block">零用金流水帳</span>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {currentStats.transactions.count} {currentStats.transactions.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 block">採買專款子帳</span>
              <span className="text-xs font-bold text-amber-700 font-mono">
                {currentStats.sub_accounts.count} {currentStats.sub_accounts.unit}
              </span>
            </div>
          </div>

          {/* ======================= TAB 1: 匯出備份 ======================= */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* 密碼加密保護 (AES-256) 設定卡片 */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${enablePassword ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      {enablePassword ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-stone-900 block">
                        🔒 備份檔案保密加密 (AES-256-GCM)
                      </span>
                      <span className="text-[11px] text-stone-500">
                        勾選後，匯出的 JSON 檔將以自訂密碼加密，非經密碼無法讀取商業與財務敏感資訊
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                    />
                    <span className="text-xs font-bold text-stone-800">啟用加密</span>
                  </label>
                </div>

                {enablePassword && (
                  <div className="pt-2 border-t border-amber-200/80 flex items-center gap-2 animate-in fade-in">
                    <div className="relative grow">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="請設定備份保護密碼（還原時須輸入相同密碼）..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-amber-900 shrink-0 font-medium">
                      {password.length > 0 ? '✓ 密碼已就緒' : '⚠️ 請輸入密碼'}
                    </span>
                  </div>
                )}
              </div>

              {/* 1. 全庫完整打包備份專區 */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-700 text-white">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs">
                        全系統完整打包備份（包含所有模組與歷史資料）
                      </h4>
                      <p className="text-[11px] text-emerald-900">
                        100% 完整打包所有公司、客戶、流水帳、自訂分類與子帳戶
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* 下載 SQLite 實體庫 */}
                  <button
                    type="button"
                    onClick={handleDownloadSqlite}
                    className="p-3 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-50 text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      下載 SQLite 實體檔
                    </div>
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      petty_cash.sqlite 實體二進位庫，隨身碟帶著走
                    </span>
                  </button>

                  {/* 下載 SQL 語法檔 */}
                  <button
                    type="button"
                    onClick={handleDownloadSqlDump}
                    className="p-3 rounded-xl border border-blue-400 bg-white hover:bg-blue-50 text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      下載 SQL 腳本檔 (.sql)
                    </div>
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      標準純文字 SQL 語法，跨工具 DBeaver 相容
                    </span>
                  </button>

                  {/* 下載 全庫 JSON 備份檔 */}
                  <button
                    type="button"
                    onClick={handleDownloadFullBackup}
                    className="p-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                      下載全庫 JSON 備份
                    </div>
                    <span className="text-[10px] text-stone-500 mt-1 block">
                      {enablePassword ? '🔒 將產出 AES-256 加密檔案 (.enc.json)' : '跨版本相容性最高的結構化備份'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. 模組獨立個別備份專區 (解決資料庫肥大、只備份特定模組) */}
              <div className="p-4 rounded-xl bg-white border border-stone-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-stone-800 text-white">
                      <FolderDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs">
                        模組獨立單獨備份（避免檔案肥大 · 個別抽出管理）
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        點選任一模組即可立即單獨匯出該模組的 JSON 檔，精準省時
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(Object.keys(DATABASE_MODULE_CONFIGS) as DatabaseModuleKey[]).map((key) => {
                    const cfg = DATABASE_MODULE_CONFIGS[key];
                    const stat = currentStats[key];
                    return (
                      <div
                        key={key}
                        className="p-3 rounded-xl border border-stone-200 hover:border-stone-400 bg-stone-50/60 hover:bg-stone-50 transition-all flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-stone-900 truncate">
                              {cfg.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-stone-200 text-stone-700">
                              {stat.count} {stat.unit}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500 truncate mt-0.5">
                            {cfg.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleExportModule(key)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 font-bold text-[11px] text-stone-700 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>單獨匯出</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Git 接力協同開發：種子資料集匯出 */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-700 text-white">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-purple-950 block">
                      Git 接力開發種子檔同步 (data/seeds/*.json)
                    </span>
                    <span className="text-[11px] text-purple-800">
                      多個 AI Studio 接力開發時，一鍵將當前 SQLite 寫入 Git 種子集，方便其他協同人員同步檢視
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isExportingSeeds}
                  onClick={handleExportSeeds}
                  className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isExportingSeeds ? 'animate-spin' : ''}`} />
                  <span>{isExportingSeeds ? '同步中...' : '匯出至 seeds'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= TAB 2: 載入還原 ======================= */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>智慧模組還原特色</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  上傳任何備份檔案後，系統會<strong>自動解析內部模組與筆數</strong>。您可以<strong>自選只還原某幾個模組</strong>（例如僅還原「客戶名冊」或「收支流水帳」），未勾選的模組<strong>完全不受影響</strong>！
                </p>
              </div>

              {/* 上傳選取區 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. 選取 SQLite 實體檔 / SQL 腳本 */}
                <div>
                  <input
                    ref={sqliteInputRef}
                    type="file"
                    accept=".sqlite,.db,.sql"
                    onChange={handleSqliteFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingSqlite}
                    onClick={() => sqliteInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50 text-left transition-all flex flex-col justify-between group cursor-pointer h-full"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-emerald-700" />
                          載入 .sqlite / .sql 實體檔案
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                          整庫置換
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                        直接載入隨身碟帶來的 <code className="font-mono text-emerald-800 font-bold">petty_cash.sqlite</code> 或標準 SQL 腳本，換機 100% 鏡像重現。
                      </p>
                    </div>
                  </button>
                </div>

                {/* 2. 選取 JSON / 加密備份檔 (進入模組勾選還原) */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.enc.json"
                    onChange={handleJsonFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50 text-left transition-all flex flex-col justify-between group cursor-pointer h-full"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-indigo-700" />
                          載入 JSON 備份檔（自選模組還原）
                        </span>
                        <span className="text-[10px] font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-full border border-indigo-300">
                          推薦自選
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                        支援一般 <code className="font-mono text-indigo-800 font-bold">.json</code> 或加密 <code className="font-mono text-indigo-800 font-bold">.enc.json</code>，可自由勾選要還原哪些模組！
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 重設與清空選項 */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-700 block">重設資料庫</span>
                  <span className="text-[11px] text-stone-400">
                    清除本機所有記帳明細（自訂公司主檔與分類保留）
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空記帳明細</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕列 */}
        <div className="px-6 py-3 border-t border-stone-200 flex items-center justify-between bg-stone-50/80 shrink-0">
          <span className="text-[11px] text-stone-400">
            資料庫核心：SQLite 3 WASM · 實體路徑: data/petty_cash.sqlite
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>

        {/* ============================================================== */}
        {/* 彈窗 1: 解密密碼輸入彈窗 (當上傳加密檔案時) */}
        {/* ============================================================== */}
        {encryptedPayloadToDecrypt && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-700">
                <div className="p-2 rounded-xl bg-amber-100">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900">
                    偵測到加密備份檔案 (AES-256)
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    匯出時間：{new Date(encryptedPayloadToDecrypt.exportedAt).toLocaleString('zh-TW')}
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                此備份檔受密碼保護，請輸入當初設定的解密密碼以進行解密與模組還原：
              </p>

              <div className="relative">
                <input
                  type={showDecryptPassword ? 'text' : 'password'}
                  value={decryptPassword}
                  onChange={(e) => setDecryptPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDecryptAndProceed();
                  }}
                  placeholder="輸入解密密碼..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowDecryptPassword(!showDecryptPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showDecryptPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {decryptError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{decryptError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEncryptedPayloadToDecrypt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleDecryptAndProceed}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors cursor-pointer"
                >
                  解密並載入
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 彈窗 2: 智慧模組勾選還原精靈 */}
        {/* ============================================================== */}
        {pendingRestore && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
            <div 
              className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 精靈標頭 */}
              <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900">
                        智慧模組精準還原
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {pendingRestore.backupType === 'module' ? '單一模組備份檔' : '全庫完整備份包'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      備份檔產生時間：{new Date(pendingRestore.exportedAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 精靈內容 */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* 說明文字 */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-700 space-y-1">
                  <span className="font-bold text-stone-900 block">
                    請勾選您希望還原的模組資料：
                  </span>
                  <p className="text-[11px] text-stone-500">
                    您可以只還原單一模組（例如：只還原客戶通訊錄），未勾選之模組維持目前系統現狀，絕不被影響或覆蓋。
                  </p>
                </div>

                {/* 模組列表勾選清單 */}
                <div className="space-y-2">
                  {(Object.keys(DATABASE_MODULE_CONFIGS) as DatabaseModuleKey[]).map((key) => {
                    const cfg = DATABASE_MODULE_CONFIGS[key];
                    const isSelected = selectedModulesToRestore.includes(key);

                    // 計算備份檔內該模組是否有資料
                    let backupCount = 0;
                    let unit = '筆';
                    switch (key) {
                      case 'companies':
                        backupCount = pendingRestore.companies?.length || (pendingRestore.companyProfile ? 1 : 0);
                        unit = '家行號';
                        break;
                      case 'customers':
                        backupCount = pendingRestore.customers?.length || 0;
                        unit = '位/家';
                        break;
                      case 'transactions':
                        backupCount = pendingRestore.transactions?.length || 0;
                        unit = '筆流水';
                        break;
                      case 'categories_claimants':
                        backupCount = (pendingRestore.categories?.length || 0) + (pendingRestore.claimants?.length || 0);
                        unit = '類/位';
                        break;
                      case 'sub_accounts':
                        backupCount = pendingRestore.subAccounts?.length || 0;
                        unit = '個子帳';
                        break;
                      case 'budgets':
                        backupCount = Object.keys(pendingRestore.budgets || {}).length;
                        unit = '個月份';
                        break;
                      case 'director_withdrawals':
                        backupCount = pendingRestore.directorWithdrawals?.length || 0;
                        unit = '筆提領';
                        break;
                    }

                    const hasDataInBackup = backupCount > 0;

                    return (
                      <div
                        key={key}
                        onClick={() => hasDataInBackup && toggleModuleSelection(key)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          !hasDataInBackup
                            ? 'opacity-40 bg-stone-50 border-stone-200 cursor-not-allowed'
                            : isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-xs cursor-pointer'
                            : 'border-stone-200 hover:border-stone-300 bg-white cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-stone-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-stone-900 block truncate">
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-stone-500 truncate block">
                              {cfg.description}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full ${
                            hasDataInBackup
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : 'bg-stone-200 text-stone-500'
                          }`}>
                            備份檔內：{backupCount} {unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 還原模式切換 (覆蓋 vs 合併) */}
                <div className="p-3.5 rounded-xl bg-stone-100/70 border border-stone-200 space-y-2">
                  <span className="text-xs font-bold text-stone-800 block">
                    請選擇還原模式：
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      onClick={() => setRestoreMode('replace')}
                      className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 cursor-pointer ${
                        restoreMode === 'replace'
                          ? 'border-indigo-600 bg-white shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold text-xs text-stone-900 block">
                          🔄 鏡像覆蓋替換 (Replace)
                        </span>
                        <span className="text-[10px] text-stone-500 leading-normal block mt-0.5">
                          清空所選模組的現有資料，並完全以備份資料取代（推薦換機時使用）
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setRestoreMode('merge')}
                      className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 cursor-pointer ${
                        restoreMode === 'merge'
                          ? 'border-indigo-600 bg-white shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-bold text-xs text-stone-900 block">
                          ➕ 智慧合併追加 (Merge)
                        </span>
                        <span className="text-[10px] text-stone-500 leading-normal block mt-0.5">
                          現有資料不刪除，同 ID/統編比對更新，新筆數自動追加
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 還原精靈底部確認 */}
              <div className="px-6 py-3.5 border-t border-stone-200 flex items-center justify-between bg-stone-50/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isRestoring || selectedModulesToRestore.length === 0}
                  onClick={handleConfirmRestore}
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isRestoring
                      ? '還原寫入中...'
                      : `確認執行還原 (${selectedModulesToRestore.length} 個模組)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 清空確認彈窗 */}
        <ConfirmDialog
          isOpen={showClearConfirm}
          title="確定要清空所有記帳資料嗎？"
          description={
            <div className="space-y-2 text-xs">
              <p className="text-stone-700">
                此操作將會清空所有的零用金收支流水明細與廠長領取紀錄（建議先下載備份檔以防萬一）。
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                ⚠️ 清空後本機記帳明細將重設為零，公司基本主檔與自訂主題分類將完整保留。
              </div>
            </div>
          }
          confirmText="確認清空記帳明細"
          cancelText="取消保留"
          variant="danger"
          onConfirm={() => {
            setShowClearConfirm(false);
            onClearAllData();
            onClose();
          }}
          onClose={() => setShowClearConfirm(false)}
        />
      </div>
    </div>
  );
};
