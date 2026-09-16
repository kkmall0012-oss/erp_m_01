import React from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, SlidersHorizontal, Coins } from 'lucide-react';
import { MonthBudget } from '../types';

interface StatCardsProps {
  totalExpense: number;
  totalIncome: number;
  expenseCount: number;
  budget?: MonthBudget;
  onOpenBudgetModal: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalExpense,
  totalIncome,
  expenseCount,
  budget,
  onOpenBudgetModal
}) => {
  const budgetAmount = budget?.budgetAmount || 0;
  const alertThreshold = budget?.alertThresholdPercent || 20;

  // 零用金剩餘水位 (以預算額度或以撥補總額扣減支出)
  // 如果有設預備金額度，以預算為基準；另外可參考 (撥補總額 - 支出)
  const remainingBudget = budgetAmount - totalExpense;
  const usageRatio = budgetAmount > 0 ? (totalExpense / budgetAmount) * 100 : 0;
  const remainingRatio = budgetAmount > 0 ? (remainingBudget / budgetAmount) * 100 : 0;
  const netPettyCashBalance = totalIncome - totalExpense;

  // 警示狀態判定
  let statusBadge = {
    label: '水位充裕',
    bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    barColor: 'bg-emerald-500',
    cardBorder: 'border-stone-200'
  };

  if (budgetAmount > 0) {
    if (remainingBudget < 0) {
      statusBadge = {
        label: `超支 NT$ ${Math.abs(remainingBudget).toLocaleString()} (請款急)`,
        bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: ShieldAlert,
        barColor: 'bg-rose-500',
        cardBorder: 'border-rose-300 ring-1 ring-rose-300'
      };
    } else if (remainingRatio <= alertThreshold) {
      statusBadge = {
        label: `水位僅存 ${remainingRatio.toFixed(0)}% (請儘速撥補)`,
        bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: AlertTriangle,
        barColor: 'bg-amber-500',
        cardBorder: 'border-amber-300 ring-1 ring-amber-200'
      };
    }
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. 當月零用金支出 */}
      <div 
        id="stat-total-expense" 
        className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500">本期零用金總支出</span>
          <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
            <TrendingDown className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-stone-900">
            <span className="text-sm font-normal text-stone-400 mr-1">NT$</span>
            {totalExpense.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-stone-500 flex items-center justify-between">
            <span>累計開支 {expenseCount} 筆</span>
            <span className="text-[11px] text-stone-400">平均單筆 NT$ {expenseCount > 0 ? Math.round(totalExpense / expenseCount).toLocaleString() : 0}</span>
          </div>
        </div>
      </div>

      {/* 2. 零用金預備金額度 (預算上限) */}
      <div 
        id="stat-budget" 
        className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500">零用金核定額度 (預算)</span>
          <button
            id="adjust-budget-btn"
            onClick={onOpenBudgetModal}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="設定零用金上限與警戒線"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-stone-900">
            {budgetAmount > 0 ? (
              <>
                <span className="text-sm font-normal text-stone-400 mr-1">NT$</span>
                {budgetAmount.toLocaleString()}
              </>
            ) : (
              <span className="text-base text-stone-400 font-normal">未設定上限額度</span>
            )}
          </div>
          <div className="mt-1 text-xs text-stone-500 flex items-center justify-between">
            <span>額度已支用: {usageRatio.toFixed(1)}%</span>
            <button
              onClick={onOpenBudgetModal}
              className="text-[11px] text-amber-700 hover:text-amber-800 font-medium underline"
            >
              設定額度
            </button>
          </div>
        </div>
      </div>

      {/* 3. 零用金水位與餘額警示 */}
      <div 
        id="stat-balance-alert" 
        className={`bg-white p-5 rounded-2xl border ${statusBadge.cardBorder} shadow-xs flex flex-col justify-between transition-all`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500">零用金即時水位與警示</span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge.bgColor}`}>
            <StatusIcon className="w-3 h-3" />
            {statusBadge.label}
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-stone-900">
            {budgetAmount > 0 ? (
              <>
                <span className={`text-sm font-normal mr-1 ${remainingBudget < 0 ? 'text-rose-500' : 'text-stone-400'}`}>
                  {remainingBudget < 0 ? '- NT$' : 'NT$'}
                </span>
                <span className={remainingBudget < 0 ? 'text-rose-600' : 'text-stone-900'}>
                  {Math.abs(remainingBudget).toLocaleString()}
                </span>
              </>
            ) : (
              <span className="text-sm text-stone-400 font-normal">請設定額度以監控水位</span>
            )}
          </div>

          {/* 預算進度條 */}
          {budgetAmount > 0 && (
            <div className="mt-2.5">
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${statusBadge.barColor}`}
                  style={{ width: `${Math.min(usageRatio, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-stone-400">
                <span>0%</span>
                <span>撥補警戒線: {alertThreshold}%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. 本期撥補入帳與淨結餘 */}
      <div 
        id="stat-income-savings" 
        className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500">本期撥補總額</span>
          <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Coins className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-emerald-700">
            <span className="text-sm font-normal text-stone-400 mr-1">NT$</span>
            {totalIncome.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-stone-500 flex items-center justify-between">
            <span>實體結存: NT$ {netPettyCashBalance.toLocaleString()}</span>
            <span className="text-[11px] text-stone-400">
              {netPettyCashBalance >= 0 ? '備用金充足' : '墊付款待補'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
