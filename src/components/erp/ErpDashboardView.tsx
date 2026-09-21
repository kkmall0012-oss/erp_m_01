import React from 'react';
import { 
  Coins, 
  Building2,
  Car, 
  Package, 
  FileCheck2, 
  Database, 
  ArrowRight, 
  HardDrive, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  TrendingDown,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction } from '../../types';

interface ErpDashboardViewProps {
  onSelectApp: (appId: any) => void;
  transactions: Transaction[];
  cashOnHand: number;
  currentYearMonth: string;
  onOpenBackupModal: () => void;
}

export const ErpDashboardView: React.FC<ErpDashboardViewProps> = ({
  onSelectApp,
  transactions,
  cashOnHand,
  currentYearMonth,
  onOpenBackupModal
}) => {
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(currentYearMonth));
  const currentMonthExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 歡迎橫幅 (仿鼎新 A1 企業儀表板風格) */}
      <div className="bg-gradient-to-r from-[#005bb5] to-[#0078d7] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/20 text-white border border-white/30 font-mono">
              客製化 ERP 整合大框架
            </span>
            <span className="text-xs text-white/80">系統運作正常</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            企業商務應用工作台
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-2xl leading-relaxed">
            採用鼎新風格左側直立導航架構，將各獨立業務小程式整合於單一系統中。您可在左側隨時切換模組，未來新功能將持續逐步擴充加入。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectApp('petty_cash')}
            className="px-4 py-2.5 rounded-xl bg-white text-[#0066cc] font-bold text-xs shadow-sm hover:bg-blue-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Coins className="w-4 h-4 text-[#0066cc]" />
            <span>立即進入零用金系統</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 小程式模組入口總覽卡片 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0066cc]" />
            <span>企業小程式與功能模組一覽</span>
          </h3>
          <span className="text-xs text-stone-500">點擊卡片即可切換至該小程式</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 模組 1：零用金管理系統 (已完成運作中) */}
          <div 
            onClick={() => onSelectApp('petty_cash')}
            className="p-5 rounded-2xl border-2 border-[#0066cc]/40 bg-white hover:border-[#0066cc] hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ● 已上線運作中
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-base group-hover:text-[#0066cc] transition-colors">
                公司零用金管理系統
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                包含階層式選單記帳、手頭現金水位警示、7種核心財務統計報表、採買專款子帳及傳票發票勾稽。
              </p>

              {/* 即時數據快照 */}
              <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-[10px] text-stone-600 block">手頭現金餘額</span>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    ${cashOnHand.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-600 block">本月累計支出</span>
                  <span className="text-xs font-mono font-bold text-rose-700">
                    ${currentMonthExpense.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-[#0066cc]">
              <span>開啟零用金工作台</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 模組：公司基本設定 (表格套用主檔) */}
          <div 
            onClick={() => onSelectApp('company')}
            className="p-5 rounded-2xl border-2 border-blue-200 bg-white hover:border-[#0066cc] hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-[#0066cc] border border-blue-200">
                  ● 表格套印主檔
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-base group-hover:text-[#0066cc] transition-colors">
                公司基本設定 (ERP 主檔)
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                維護公司全名、統一編號、負責人、電話地址與匯款銀行帳號。未來系統產出所有報表與請款表格時自動帶入！
              </p>

              <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>支援隨填即時 A4 表單套用預覽</span>
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-[#0066cc]">
              <span>進入公司設定編輯</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 模組 2：車輛油資審核 (客製模組預備) */}
          <div 
            onClick={() => onSelectApp('fleet')}
            className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs transition-all cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                  <Car className="w-5 h-5" />
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                  預留擴充模組
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-base group-hover:text-[#0066cc] transition-colors">
                車輛油資審核管理
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                預留管理公務車加油卡、同仁出差私車公用公里數換算、加油發票核銷審核流程。
              </p>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-medium text-stone-500 group-hover:text-stone-900">
              <span>查看模組規劃</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 模組 3：物品資產管理 (客製模組預備) */}
          <div 
            onClick={() => onSelectApp('assets')}
            className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs transition-all cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                  預留擴充模組
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-base group-hover:text-[#0066cc] transition-colors">
                物品與設備資產管理
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                預留辦公耗材領用登記、各部門固定資產盤點編號、報廢保固追蹤。
              </p>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-medium text-stone-500 group-hover:text-stone-900">
              <span>查看模組規劃</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 模組 4：洽談簽核與表單 (客製模組預備) */}
          <div 
            onClick={() => onSelectApp('workflow')}
            className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs transition-all cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-600">
                  預留擴充模組
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-base group-hover:text-[#0066cc] transition-colors">
                內部洽談與簽核表單
              </h4>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                預留採購請購單簽核、廠商拜訪洽談紀錄、主管線上審批簽章。
              </p>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-medium text-stone-500 group-hover:text-stone-900">
              <span>查看模組規劃</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 模組 5：SQLite 實體資料庫中心 */}
          <div 
            onClick={() => onSelectApp('database')}
            className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ● 實體檔案帶著走
                </span>
              </div>
              <h4 className="font-bold text-stone-900 text-base group-hover:text-emerald-800 transition-colors">
                SQLite 實體資料庫中心
              </h4>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                全系統統一儲存於 <code className="font-mono text-emerald-800 font-bold">data/petty_cash.sqlite</code>，支援隨身碟下載與各模組欄位字典查詢。
              </p>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>進入資料庫管理與欄位速查</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
