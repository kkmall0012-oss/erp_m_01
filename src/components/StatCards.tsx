import React from 'react';
import { TrendingDown, TrendingUp, Coins, ShoppingBag, Wallet } from 'lucide-react';

interface StatCardsProps {
  totalExpense: number;
  totalIncome: number;
  expenseCount: number;
  incomeCount?: number;
  cashOnHand?: number; // 累計實體現鈔餘額 (滾存至當月，有撥款才放)
  activeSubAccountsAllocated?: number; // 撥給採買子帳的總金額
  activeSubAccountsRemaining?: number; // 採買子帳目前剩餘未用的零用金
  activeSubAccountsSpent?: number; // 採買子帳已記開銷
  activeSubAccountsCount?: number; // 進行中的採買子帳數量
  onGoToSubAccounts?: () => void; // 點擊直接跳轉採買子帳管理
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalExpense,
  totalIncome,
  expenseCount,
  incomeCount = 0,
  cashOnHand: propCashOnHand,
  activeSubAccountsAllocated = 0,
  activeSubAccountsRemaining = 0,
  activeSubAccountsCount = 0,
  onGoToSubAccounts
}) => {
  // 1. 手上的零用金 (實體抽屜/保險箱現有現金 = 累計撥補 - 累計支出 - 已撥給採買同仁的款項)
  // 撥款採取「有撥款才放，並非每月直接撥款」，某月可能無撥補，手上現鈔為前期滾存餘額
  const cashOnHand = propCashOnHand !== undefined 
    ? propCashOnHand 
    : (totalIncome - totalExpense - activeSubAccountsAllocated);

  // 2. 採買子帳零用金 (同仁手中尚餘未用額度)
  const subAccountCash = activeSubAccountsRemaining;

  // 3. 零用金總額 (手上的零用金 + 採買子帳零用金)
  const totalPettyCash = cashOnHand + subAccountCash;

  return (
    /* 單一整合總表：依照使用者要求的三欄排列：
       左欄 (上: 手上零用金 / 下: 採買零用金) | 中欄 (零用金總餘額) | 右欄 (上: 本期零用金總支出 / 下: 本期撥補)
    */
    <div 
      id="stat-petty-cash-unified-card" 
      className="w-full bg-white rounded-2xl border border-sky-200/80 bg-linear-to-b from-white via-sky-50/10 to-white shadow-xs p-4 sm:p-5"
    >
      {/* 頂部標頭列 */}
      <div className="flex items-center justify-between pb-2.5 border-b border-sky-100 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
          <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-sky-600" />
            <span>零用金水位與收支動態總表</span>
          </span>
        </div>
        <span className="text-[11px] text-stone-500 font-medium">實時盤點水位與收支</span>
      </div>

      {/* 核心三欄配置：左 (手上+採買) | 中 (總餘額) | 右 (總支出+撥補) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* ==================================================== */}
        {/* 左欄：手上零用金 (上) ＋ 採買零用金 (下) */}
        {/* ==================================================== */}
        <div className="md:col-span-1 lg:col-span-3 flex flex-col justify-between gap-3">
          {/* 左上：手上零用金 */}
          <div 
            id="substat-cash-on-hand" 
            className="bg-sky-50/50 border border-sky-200/80 rounded-xl p-3.5 flex-1 flex flex-col justify-between shadow-2xs hover:border-sky-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>手上零用金</span>
                </span>
                <span className="text-[10px] text-sky-700 bg-sky-100/80 px-1.5 py-0.5 rounded font-medium">
                  現存現金
                </span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-sky-950 mt-1.5">
                <span className="text-xs font-normal text-stone-400 mr-1 font-sans">NT$</span>
                {cashOnHand.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-500 mt-2 truncate">
              {activeSubAccountsAllocated > 0 ? (
                <span className="text-amber-800 font-medium">
                  已扣撥子帳 NT$ {activeSubAccountsAllocated.toLocaleString()}
                </span>
              ) : (
                <span>保險箱／抽屜現存可支配現金</span>
              )}
            </div>
          </div>

          {/* 左下：採買零用金 */}
          <div 
            id="substat-subaccount-cash" 
            onClick={onGoToSubAccounts}
            className={`bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 flex-1 flex flex-col justify-between shadow-2xs hover:border-amber-400 hover:bg-amber-50/80 transition-all ${
              onGoToSubAccounts ? 'cursor-pointer group' : ''
            }`}
            title={onGoToSubAccounts ? "點擊切換至採買子帳管理 (新增、刪除、撥款記帳)" : undefined}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>採買零用金</span>
                </span>
                <span className="text-[10px] text-amber-800 font-medium px-1.5 py-0.5 rounded bg-amber-100/70 group-hover:bg-amber-200 transition-colors">
                  {activeSubAccountsCount} 筆進行中
                </span>
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-amber-900 mt-1.5">
                <span className="text-xs font-normal text-stone-400 mr-1 font-sans">NT$</span>
                {subAccountCash.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between">
              <span>同仁採買手中尚餘未用額度</span>
              {onGoToSubAccounts && (
                <span className="text-amber-700 font-bold group-hover:underline text-[10px]">
                  管理子帳 ›
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 中欄：零用金總餘額 (中央特大突出，上下垂直置中) */}
        {/* ==================================================== */}
        <div 
          id="substat-total-cash" 
          className="md:col-span-1 lg:col-span-6 flex flex-col justify-center items-center text-center p-5 sm:p-6 bg-linear-to-b from-sky-50/80 via-white to-sky-50/40 rounded-xl border-2 border-sky-300/90 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Coins className="w-5 h-5 text-emerald-600" />
            <span className="text-sm sm:text-base font-black text-stone-800 tracking-wide">
              零用金總餘額
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              總水位
            </span>
          </div>

          {/* 餘額數字特大字體 */}
          <div className="text-3xl sm:text-4xl lg:text-[42px] font-black font-mono tracking-tight text-stone-950 leading-tight my-2">
            <span className="text-base sm:text-xl font-bold text-stone-400 mr-1.5 font-sans">NT$</span>
            {totalPettyCash.toLocaleString()}
          </div>

          {/* 手上 ＋ 採買 分解說明 */}
          <div className="text-xs text-stone-500 font-medium mt-1">
            手上 <span className="font-mono font-bold text-sky-900">NT$ {cashOnHand.toLocaleString()}</span>
            <span className="mx-1.5 text-stone-300 font-bold">＋</span>
            採買 <span className="font-mono font-bold text-amber-800">NT$ {subAccountCash.toLocaleString()}</span>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 右欄：本期零用金總支出 (上) ＋ 本期撥補 (下) */}
        {/* ==================================================== */}
        <div className="md:col-span-1 lg:col-span-3 flex flex-col justify-between gap-3">
          {/* 右上：本期零用金總支出 (數字紅色) */}
          <div 
            id="stat-total-expense" 
            className="bg-rose-50/50 border border-rose-200/90 rounded-xl p-3.5 flex-1 flex flex-col justify-between shadow-2xs hover:border-rose-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>本期零用金總支出</span>
                </span>
                <span className="text-[10px] text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded font-medium">
                  {expenseCount} 筆
                </span>
              </div>
              {/* 數字鮮紅特大 */}
              <div className="text-2xl font-black font-mono tracking-tight text-rose-600 mt-1.5">
                <span className="text-xs font-normal text-rose-400 mr-1 font-sans">NT$</span>
                {totalExpense.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-500 mt-2 truncate">
              {expenseCount > 0 ? (
                <span>平均單筆 NT$ {Math.round(totalExpense / expenseCount).toLocaleString()}</span>
              ) : (
                <span>本期尚無支出紀錄</span>
              )}
            </div>
          </div>

          {/* 右下：本期撥補 (有撥款才放，非每月直接撥款) */}
          <div 
            id="stat-total-income" 
            className="bg-emerald-50/50 border border-emerald-200/90 rounded-xl p-3.5 flex-1 flex flex-col justify-between shadow-2xs hover:border-emerald-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span>本期撥補</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  incomeCount > 0 
                    ? 'text-emerald-800 bg-emerald-100/80' 
                    : 'text-stone-500 bg-stone-100'
                }`}>
                  {incomeCount > 0 ? `${incomeCount} 次入帳` : '有撥款才放'}
                </span>
              </div>
              <div className={`text-2xl font-black font-mono tracking-tight mt-1.5 ${
                totalIncome > 0 ? 'text-emerald-700' : 'text-stone-500'
              }`}>
                <span className="text-xs font-normal text-stone-400 mr-1 font-sans">NT$</span>
                {totalIncome.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-500 mt-2">
              {totalIncome > 0 ? (
                <span className="text-emerald-800 font-medium">金庫現金水位補足</span>
              ) : (
                <span>本月未撥款 (滾存前月餘額)</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
