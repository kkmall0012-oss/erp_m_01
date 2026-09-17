import React from 'react';
import { TrendingDown, TrendingUp, Coins, ShoppingBag, Wallet } from 'lucide-react';

interface StatCardsProps {
  totalExpense: number;
  totalIncome: number;
  expenseCount: number;
  incomeCount?: number;
  activeSubAccountsAllocated?: number; // 撥給採買子帳的總金額
  activeSubAccountsRemaining?: number; // 採買子帳目前剩餘未用的零用金
  activeSubAccountsSpent?: number; // 採買子帳已記開銷
  activeSubAccountsCount?: number; // 進行中的採買子帳數量
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalExpense,
  totalIncome,
  expenseCount,
  incomeCount = 0,
  activeSubAccountsAllocated = 0,
  activeSubAccountsRemaining = 0,
  activeSubAccountsCount = 0
}) => {
  // 1. 手上的零用金 (實體抽屜/保險箱現有現金 = 總撥補 - 總帳直接支出 - 已撥給採買同仁的款項)
  const cashOnHand = totalIncome - totalExpense - activeSubAccountsAllocated;

  // 2. 採買子帳零用金 (同仁手中尚餘未用額度)
  const subAccountCash = activeSubAccountsRemaining;

  // 3. 零用金總額 (手上的零用金 + 採買子帳零用金)
  const totalPettyCash = cashOnHand + subAccountCash;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. 手上的零用金 (實存現金，核心重要) */}
      <div 
        id="stat-cash-on-hand" 
        className="bg-white p-4.5 rounded-2xl border border-sky-200 bg-linear-to-br from-white to-sky-50/40 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            手上的零用金 (現存現金)
          </span>
          <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700">
            <Wallet className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight font-mono text-sky-950">
            <span className="text-sm font-normal text-stone-400 mr-1 font-sans">NT$</span>
            {cashOnHand.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            {activeSubAccountsAllocated > 0 ? (
              <span className="text-amber-700 font-medium">
                已扣撥採買備用金 NT$ {activeSubAccountsAllocated.toLocaleString()}
              </span>
            ) : (
              <span>保險箱／抽屜現有可支配現金</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. 採買子帳零用金 */}
      <div 
        id="stat-subaccount-cash" 
        className="bg-white p-4.5 rounded-2xl border border-amber-200 bg-linear-to-br from-white to-amber-50/40 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900">採買子帳零用金</span>
          <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
            <ShoppingBag className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight font-mono text-amber-900">
            <span className="text-sm font-normal text-stone-400 mr-1 font-sans">NT$</span>
            {subAccountCash.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-stone-500 flex items-center justify-between">
            <span>進行中 {activeSubAccountsCount} 筆採買</span>
            <span className="text-stone-400 font-medium">
              合計總額 NT$ {totalPettyCash.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 本期零用金支出 (依指示：數字用紅色表示) */}
      <div 
        id="stat-total-expense" 
        className="bg-white p-4.5 rounded-2xl border border-rose-200 bg-linear-to-br from-white to-rose-50/30 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-rose-900">本期零用金總支出</span>
          <span className="p-1.5 rounded-xl bg-rose-100 text-rose-600">
            <TrendingDown className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2.5">
          {/* 數字使用醒目的鮮紅色表示 */}
          <div className="text-2xl font-bold tracking-tight font-mono text-rose-600">
            <span className="text-sm font-normal text-rose-400 mr-1 font-sans">NT$</span>
            {totalExpense.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-stone-500 flex items-center justify-between">
            <span>累計支出 {expenseCount} 筆</span>
            <span className="text-stone-400 font-mono">
              平均單筆 NT$ {expenseCount > 0 ? Math.round(totalExpense / expenseCount).toLocaleString() : 0}
            </span>
          </div>
        </div>
      </div>

      {/* 4. 本期撥補收入 */}
      <div 
        id="stat-total-income" 
        className="bg-white p-4.5 rounded-2xl border border-emerald-200 bg-linear-to-br from-white to-emerald-50/30 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-900">本期撥補入帳</span>
          <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight font-mono text-emerald-700">
            <span className="text-sm font-normal text-stone-400 mr-1 font-sans">NT$</span>
            {totalIncome.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-stone-500 flex items-center justify-between">
            <span>累計撥入 {incomeCount > 0 ? `${incomeCount} 次` : '常態撥補'}</span>
            <span className="text-emerald-700 font-semibold">金庫水位補足</span>
          </div>
        </div>
      </div>
    </div>
  );
};
