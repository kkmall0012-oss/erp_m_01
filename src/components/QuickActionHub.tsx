import React from 'react';
import { 
  TrendingDown, 
  Coins, 
  Utensils, 
  Fuel, 
  Users, 
  Coffee, 
  Package, 
  ShoppingBag, 
  Wallet,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';
import { TransactionType } from '../types';

interface QuickActionHubProps {
  onOpenModal: (type: TransactionType, categoryId?: string) => void;
  onGoToSubAccounts: () => void;
  onOpenSettings: (tab?: 'categories' | 'claimants') => void;
  cashOnHand: number;
  subAccountCash: number;
  activeSubAccountsCount: number;
}

export const QuickActionHub: React.FC<QuickActionHubProps> = ({
  onOpenModal,
  onGoToSubAccounts,
  onOpenSettings,
  cashOnHand,
  subAccountCash,
  activeSubAccountsCount
}) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
      {/* 頂部標題 */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
        <div>
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <span>零用金快速登記台</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              直覺好操作
            </span>
          </h2>
          <p className="text-[11px] text-stone-400 mt-0.5">
            點擊按鍵開啟登記；零用金支出數字以紅色標示
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenSettings('categories')}
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          title="管理自訂分類"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 核心雙大按鈕：一目了然，絕無障礙 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. 登記支出 (醒目重點) */}
        <button
          type="button"
          id="btn-open-expense-hub"
          onClick={() => onOpenModal('expense')}
          className="group relative p-4 rounded-xl border-2 border-stone-900 bg-stone-900 hover:bg-black text-white text-left transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30">
              <TrendingDown className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-bold text-rose-300 tracking-wide">
              開銷扣減
            </span>
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-1">
              <span>－ 登記支出</span>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-stone-300 mt-0.5">
              便當餐飲、加油、代墊、雜項支出
            </p>
          </div>
        </button>

        {/* 2. 登記撥補 (收入) */}
        <button
          type="button"
          id="btn-open-income-hub"
          onClick={() => onOpenModal('income')}
          className="group relative p-4 rounded-xl border-2 border-emerald-600 bg-emerald-700 hover:bg-emerald-800 text-white text-left transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="p-2 rounded-lg bg-white/20 text-emerald-100 ring-1 ring-white/20">
              <Coins className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-bold text-emerald-200 tracking-wide">
              現鈔補水
            </span>
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-1">
              <span>＋ 登記撥補收入</span>
              <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              公司銀行提領撥入、主管現金撥補
            </p>
          </div>
        </button>
      </div>

      {/* 常用類別一鍵秒開 (懶人捷徑) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-stone-700">常用開支快速捷徑：</span>
          <span className="text-[10px] text-stone-400">點擊直接帶入分類</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => onOpenModal('expense', 'dining')}
            className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-800 transition-all flex items-center gap-1.5 cursor-pointer text-left group"
          >
            <span className="p-1 rounded-lg bg-orange-100 text-orange-700 group-hover:bg-orange-200">
              <Utensils className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-stone-800 group-hover:text-orange-900 truncate">
              🍱 便當餐飲
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('expense', 'fuel')}
            className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition-all flex items-center gap-1.5 cursor-pointer text-left group"
          >
            <span className="p-1 rounded-lg bg-sky-100 text-sky-700 group-hover:bg-sky-200">
              <Fuel className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-stone-800 group-hover:text-sky-900 truncate">
              ⛽ 加油交通
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('expense', 'advance')}
            className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-800 transition-all flex items-center gap-1.5 cursor-pointer text-left group"
          >
            <span className="p-1 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200">
              <Users className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-stone-800 group-hover:text-purple-900 truncate">
              👥 同仁代墊
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('expense', 'misc')}
            className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 transition-all flex items-center gap-1.5 cursor-pointer text-left group"
          >
            <span className="p-1 rounded-lg bg-stone-200 text-stone-700 group-hover:bg-stone-300">
              <Package className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-stone-800 truncate">
              📦 辦公雜支
            </span>
          </button>
        </div>
      </div>

      {/* 底部零用金現存狀態速覽 */}
      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-sky-700 shrink-0" />
          <div className="min-w-0">
            <span className="text-[11px] text-stone-500">手頭現存現金：</span>
            <span className="font-mono font-bold text-stone-900 ml-1">
              NT$ {cashOnHand.toLocaleString()}
            </span>
          </div>
        </div>

        {activeSubAccountsCount > 0 ? (
          <button
            type="button"
            onClick={onGoToSubAccounts}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>採買備用金 NT$ {subAccountCash.toLocaleString()} ›</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoToSubAccounts}
            className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>撥款至採買子帳 ›</span>
          </button>
        )}
      </div>
    </div>
  );
};
