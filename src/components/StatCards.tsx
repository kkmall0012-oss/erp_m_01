import React from 'react';
import { TrendingDown, TrendingUp, ShoppingBag, Wallet, Coins } from 'lucide-react';

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
  const cashOnHand = propCashOnHand !== undefined 
    ? propCashOnHand 
    : (totalIncome - totalExpense - activeSubAccountsAllocated);

  // 2. 採買零用金 (同仁手中尚餘未用額度)
  const subAccountCash = activeSubAccountsRemaining;

  // 3. 零用金總額 (手上的零用金 + 採買子帳零用金)
  const totalPettyCash = cashOnHand + subAccountCash;

  // 平均單筆支出
  const avgExpense = expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0;

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-5 space-y-4">
      {/* 頂部標題列 */}
      <div className="flex items-center justify-between pb-3 border-b border-sky-100/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          <Wallet className="w-4 h-4 text-sky-600" />
          <span className="font-bold text-stone-900 text-sm sm:text-base">零用金水位與收支動態總表</span>
        </div>
        <span className="text-xs text-stone-400 font-medium">實時盤點水位與收支</span>
      </div>

      {/* 3 欄式主佈局：左 2 張 | 中 1 張大卡 (零用金總餘額) | 右 2 張 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 左側：手上零用金 (上) ＋ 採買零用金 (下) */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 justify-between">
          {/* 左上：手上零用金 */}
          <div 
            id="stat-cash-on-hand"
            className="p-4 rounded-2xl border border-sky-200 bg-sky-50/20 hover:border-sky-300 transition-colors flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span>手上零用金</span>
                </span>
                <span className="text-[10px] text-sky-700 bg-sky-100/90 font-medium px-2 py-0.5 rounded">
                  現存現金
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-stone-900 mt-2">
                <span className="text-xs font-normal text-stone-400 mr-1 font-sans">NT$</span>
                {cashOnHand.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-400 mt-2">
              保險箱／抽屜現存可支配現金
            </div>
          </div>

          {/* 左下：採買零用金 */}
          <div 
            id="stat-subaccount-cash"
            onClick={onGoToSubAccounts}
            className={`p-4 rounded-2xl border border-amber-200 bg-amber-50/20 hover:border-amber-400 transition-all flex-1 flex flex-col justify-between ${
              onGoToSubAccounts ? 'cursor-pointer group hover:bg-amber-50/40' : ''
            }`}
            title={onGoToSubAccounts ? "點擊前往採買子帳管理" : undefined}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>採買零用金</span>
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-100/90 font-medium px-2 py-0.5 rounded">
                  {activeSubAccountsCount} 筆進行中
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-900 mt-2">
                <span className="text-xs font-normal text-stone-400 mr-1 font-sans">NT$</span>
                {subAccountCash.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-between">
              <span>同仁採買手中尚餘未用額度</span>
              {onGoToSubAccounts && (
                <span className="text-amber-700 font-bold group-hover:underline text-[11px]">
                  管理子帳 ›
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 中間：零用金總餘額 (總水位) 大卡片 */}
        <div className="lg:col-span-6 p-6 rounded-2xl border-2 border-sky-300 bg-white shadow-2xs flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <span className="text-base sm:text-lg font-black text-stone-900 tracking-wide">
              零用金總餘額
            </span>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              總水位
            </span>
          </div>

          <div className="text-4xl sm:text-5xl lg:text-[54px] font-black font-mono tracking-tight text-stone-950 leading-tight my-2">
            <span className="text-base sm:text-xl font-bold text-stone-400 mr-1.5 font-sans">NT$</span>
            {totalPettyCash.toLocaleString()}
          </div>

          <div className="text-xs sm:text-sm text-stone-500 font-medium mt-2 flex items-center justify-center gap-1.5 flex-wrap">
            <span>手上</span>
            <span className="font-mono font-bold text-sky-900">NT$ {cashOnHand.toLocaleString()}</span>
            <span className="text-stone-300 font-bold mx-1">＋</span>
            <span>採買</span>
            <span className="font-mono font-bold text-amber-800">NT$ {subAccountCash.toLocaleString()}</span>
          </div>
        </div>

        {/* 右側：本期零用金總支出 (上) ＋ 本期撥補 (下) */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 justify-between">
          {/* 右上：本期零用金總支出 */}
          <div 
            id="stat-total-expense" 
            className="p-4 rounded-2xl border border-rose-200 bg-rose-50/20 hover:border-rose-300 transition-colors flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  <span>本期零用金總支出</span>
                </span>
                <span className="text-[10px] text-rose-700 bg-rose-100/90 font-bold px-2 py-0.5 rounded">
                  {expenseCount} 筆
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-600 mt-2">
                <span className="text-xs font-normal text-rose-400 mr-1 font-sans">NT$</span>
                {totalExpense.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-400 mt-2 truncate">
              {expenseCount > 0 ? (
                <span>平均單筆 NT$ {avgExpense.toLocaleString()}</span>
              ) : (
                <span>本期尚無支出紀錄</span>
              )}
            </div>
          </div>

          {/* 右下：本期撥補 */}
          <div 
            id="stat-total-income" 
            className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 transition-colors flex-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span>本期撥補</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  incomeCount > 0 
                    ? 'text-emerald-800 bg-emerald-100/90' 
                    : 'text-stone-500 bg-stone-100'
                }`}>
                  {incomeCount > 0 ? `${incomeCount} 次入帳` : '有撥款才放'}
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-2 ${
                totalIncome > 0 ? 'text-emerald-700' : 'text-stone-500'
              }`}>
                <span className="text-xs font-normal text-stone-400 mr-1 font-sans">NT$</span>
                {totalIncome.toLocaleString()}
              </div>
            </div>
            <div className="text-[11px] text-stone-500 mt-2">
              {totalIncome > 0 ? (
                <span>金庫現金水位補足</span>
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
