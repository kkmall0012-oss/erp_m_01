import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MonthBudget } from '../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentYearMonth: string;
  currentBudget?: MonthBudget;
  onSaveBudget: (budget: MonthBudget) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  currentYearMonth,
  currentBudget,
  onSaveBudget
}) => {
  const [budgetAmount, setBudgetAmount] = useState<string>(
    currentBudget ? String(currentBudget.budgetAmount) : '35000'
  );
  const [alertThresholdPercent, setAlertThresholdPercent] = useState<number>(
    currentBudget?.alertThresholdPercent ?? 20
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(budgetAmount, 10) || 0;
    onSaveBudget({
      yearMonth: currentYearMonth,
      budgetAmount: amount,
      alertThresholdPercent
    });
    onClose();
  };

  const parsedAmount = parseInt(budgetAmount, 10) || 0;
  const alertTriggerAmount = Math.round(parsedAmount * (alertThresholdPercent / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                設定每月預計花費與餘額警示
              </h3>
              <p className="text-xs text-stone-500">
                針對 {currentYearMonth} 月份設定預算上限
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 預計花費金額 */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              本月預計花費上限 (NT$ 新台幣)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-stone-400 text-sm">
                NT$
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-2.5 text-base font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* 預算快捷按鈕 */}
            <div className="flex gap-2 mt-2">
              {[20000, 30000, 40000, 50000, 80000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBudgetAmount(String(val))}
                  className="text-[11px] px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                >
                  {(val / 10000).toFixed(0)}萬
                </button>
              ))}
            </div>
          </div>

          {/* 餘額警示門檻 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-700">
                餘額警示觸發門檻 (百分比)
              </label>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                剩餘低於 {alertThresholdPercent}% 時警示
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={alertThresholdPercent}
              onChange={(e) => setAlertThresholdPercent(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>5% (極限)</span>
              <span>20% (推薦)</span>
              <span>50% (嚴格預警)</span>
            </div>
          </div>

          {/* 警示效果預覽 */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-1.5 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>智慧餘額警示機制說明：</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              當月預算設定為 <strong>NT$ {parsedAmount.toLocaleString()}</strong>。<br />
              當開支增加、剩餘額度小於 <strong>NT$ {alertTriggerAmount.toLocaleString()}</strong> ({alertThresholdPercent}%) 時，儀表板將自動由綠轉為<strong>黃色警告</strong>；若支出超過預算，則即刻發出<strong>紅色超支警報</strong>。
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>儲存預算設定</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
