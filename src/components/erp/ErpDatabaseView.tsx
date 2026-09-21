import React from 'react';
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
  RefreshCw
} from 'lucide-react';
import { triggerDownloadSqliteFile } from '../../services/api';

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
  const tables = [
    { name: 'company_profile', desc: '公司基本設定主檔（全名、統編、負責人、電話地址、銀行帳戶、表單抬頭）', icon: '🏢' },
    { name: 'transactions', desc: '零用金核心流水帳本（收支、發票號碼、傳票號碼、靜態快照）', icon: '📑' },
    { name: 'categories', desc: '收支主分類與多階層預設選單（圖示、色碼、人數開關）', icon: '🗂️' },
    { name: 'claimants', desc: '常用經辦請領人名冊（快速點選、排序權重）', icon: '👤' },
    { name: 'budgets', desc: '月份預算額度與警戒百分比（超支預警、撥補提示）', icon: '🎯' },
    { name: 'sub_accounts', desc: '專案採買專款子帳戶（獨立備用金、結算、明細 JSON）', icon: '📦' },
    { name: 'director_withdrawals', desc: '廠長/主管專用大額現金提領紀錄', icon: '🏦' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 標題卡片 */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">
                SQLite 實體資料庫管理中心
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                連線中 · 資料庫完好
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              實體儲存於 <code className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-emerald-800 font-bold">data/petty_cash.sqlite</code>，全系統所有小程式共用同一資料庫引擎。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>載入換機資料庫 / 還原</span>
          </button>
        </div>
      </div>

      {/* 資料表與欄位字典速查卡片 */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-700" />
              <span>資料表結構一覽（已定義於根目錄 DATABASE_SCHEMA.md）</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              未來新增任何小程式時，可直接對應下方資料表與欄位撈取數據，免重複設欄位。
            </p>
          </div>
          <span className="text-[11px] text-stone-600 font-mono">
            6 個核心實體資料表
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map(tbl => (
            <div key={tbl.name} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{tbl.icon}</span>
                <span className="font-mono font-bold text-xs text-stone-900">
                  {tbl.name}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                {tbl.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
          <span className="font-bold block flex items-center gap-1.5">
            <FileCode2 className="w-3.5 h-3.5 text-[#0066cc]" />
            完整欄位字典文件位置：
          </span>
          <p className="text-blue-800">
            根目錄文件 <code className="px-1 py-0.5 rounded bg-blue-100 font-mono font-bold text-blue-900">/DATABASE_SCHEMA.md</code> 已詳列所有欄位型態、意思、業務邏輯與常用 SQL 查詢範例。
          </p>
        </div>
      </div>
    </div>
  );
};
