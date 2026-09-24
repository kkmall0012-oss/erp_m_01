import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  HardDrive, 
  FileCode2, 
  Table, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  GitBranch,
  FolderDown,
  Layers,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  triggerDownloadSqliteFile, 
  triggerDownloadSqlDumpFile,
  triggerDownloadFullJsonBackupFile,
  triggerDownloadModularJsonBackupFile,
  exportSeedsApi 
} from '../../services/api';
import { DATABASE_MODULE_CONFIGS, DatabaseModuleKey } from '../../types';

interface ErpDatabaseViewProps {
  onOpenBackupModal: () => void;
  onGoToPettyCash: () => void;
  onReloadData?: () => void;
}

export const ErpDatabaseView: React.FC<ErpDatabaseViewProps> = ({
  onOpenBackupModal,
  onGoToPettyCash,
  onReloadData
}) => {
  const [isExportingSeeds, setIsExportingSeeds] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const tables = [
    { name: 'company_profile', key: 'companies' as DatabaseModuleKey, desc: '公司基本設定主檔（多行號、負責人、統編、帳戶、發票印製抬頭）', icon: '🏢' },
    { name: 'customers', key: 'customers' as DatabaseModuleKey, desc: '客戶與協力廠商主檔（統編、主要聯絡人、付款條件、交際請款歷程）', icon: '👥' },
    { name: 'transactions', key: 'transactions' as DatabaseModuleKey, desc: '零用金核心收支流水帳（發票號碼、傳票編號、分類細項、靜態快照存檔）', icon: '📑' },
    { name: 'categories', key: 'categories_claimants' as DatabaseModuleKey, desc: '收支主分類與多階層預設選單（圖示、色碼、經辦請領人名冊）', icon: '🗂️' },
    { name: 'sub_accounts', key: 'sub_accounts' as DatabaseModuleKey, desc: '專案採買專款子帳戶（獨立備用金、結算、明細 JSON）', icon: '📦' },
    { name: 'budgets', key: 'budgets' as DatabaseModuleKey, desc: '月份預算額度與水位警示（超支預警、撥補提示）', icon: '🎯' },
    { name: 'director_withdrawals', key: 'director_withdrawals' as DatabaseModuleKey, desc: '廠長/主管專用大額現金提領紀錄（提領日期、用途與歸墊核銷狀態）', icon: '🏦' }
  ];

  const handleExportSeeds = async () => {
    try {
      setIsExportingSeeds(true);
      setStatusMessage('');
      const res = await exportSeedsApi();
      setStatusMessage(res.message || '🎉 最新資料庫已成功寫入 data/seeds/*.json！接力開發的同仁只需 git pull 即可共用。');
    } catch (err: any) {
      setStatusMessage(`匯出種子資料失敗：${err.message}`);
    } finally {
      setIsExportingSeeds(false);
    }
  };

  const handleModularDownload = (moduleKey: DatabaseModuleKey, label: string) => {
    triggerDownloadModularJsonBackupFile(moduleKey, label);
    setStatusMessage(`已開始下載【${label}】模組備份檔 (.json)！`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 狀態訊息提示 */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center justify-between text-xs font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage('')}
            className="text-stone-400 hover:text-stone-700 font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 標題卡片 */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">
                SQLite 實體資料庫與模組備份中心
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                連線中 · 資料庫完好
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              實體儲存於 <code className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-emerald-800 font-bold">data/petty_cash.sqlite</code>，支援模組獨立抽離、AES-256 加密保密與 Git 協同同步。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={triggerDownloadSqliteFile}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下載 SQLite 檔 (.sqlite)</span>
          </button>

          <button
            type="button"
            onClick={onOpenBackupModal}
            className="px-3.5 py-2 rounded-xl border border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-700" />
            <span>備份與智慧模組還原</span>
          </button>

          <button
            type="button"
            disabled={isExportingSeeds}
            onClick={handleExportSeeds}
            className="px-3.5 py-2 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-700" />
            <span>{isExportingSeeds ? '同步中...' : '同步至 Git seeds'}</span>
          </button>
        </div>
      </div>

      {/* 模組獨立單獨備份快捷區 */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <FolderDown className="w-4 h-4 text-emerald-700" />
              <span>模組獨立單獨備份（避免整庫肥大 · 各業務線個別保存）</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              可單獨匯出指定模組的 JSON 資料檔，還原時亦可只選取特定模組還原，其餘模組不受影響。
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>開啟進階還原面板</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map(tbl => {
            const cfg = DATABASE_MODULE_CONFIGS[tbl.key];
            const label = cfg?.label || tbl.name;
            return (
              <div key={tbl.name} className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{tbl.icon}</span>
                      <span className="font-bold text-xs text-stone-900">
                        {label}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-stone-100 text-stone-600 border border-stone-200">
                      {tbl.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {tbl.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">獨立 JSON 匯出</span>
                  <button
                    type="button"
                    onClick={() => handleModularDownload(tbl.key, label)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 hover:border-emerald-600 hover:text-emerald-700 font-bold text-[11px] text-stone-700 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>單獨備份</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
          <span className="font-bold flex items-center gap-1.5">
            <FileCode2 className="w-3.5 h-3.5 text-[#0066cc]" />
            完整欄位字典與架構文件：
          </span>
          <p className="text-blue-800">
            根目錄文件 <code className="px-1 py-0.5 rounded bg-blue-100 font-mono font-bold text-blue-900">/DATABASE_SCHEMA.md</code> 已詳列所有欄位型態、業務邏輯與常用 SQL 查詢範例。
          </p>
        </div>
      </div>
    </div>
  );
};
