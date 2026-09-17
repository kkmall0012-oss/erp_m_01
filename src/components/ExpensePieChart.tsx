import React, { useState } from 'react';
import { PieChart as PieIcon, Utensils, Fuel, HandCoins, Info, ChevronRight } from 'lucide-react';
import { Transaction, CategoryConfig } from '../types';
import { CategoryDrilldownModal } from './CategoryDrilldownModal';

interface ExpensePieChartProps {
  transactions: Transaction[];
  categories: CategoryConfig[];
  currentYearMonth: string;
}

interface SliceData {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
}

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({
  transactions,
  categories,
  currentYearMonth
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [drilldownState, setDrilldownState] = useState<{
    isOpen: boolean;
    name: string;
    id?: string;
  }>({
    isOpen: false,
    name: '',
    id: undefined
  });

  // 1. 篩選當月支出
  const monthlyExpenses = transactions.filter(
    (t) => t.type === 'expense' && t.date.startsWith(currentYearMonth)
  );

  const totalExpense = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);

  // 2. 彙整各類別金額
  const categoryTotals: Record<string, { total: number; count: number; name: string; color: string }> = {};

  monthlyExpenses.forEach((t) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    const catName = t.categoryName || cat?.name || '其他';
    const catColor = cat?.color || '#64748b';
    const groupKey = t.categoryName || t.categoryId;

    if (!categoryTotals[groupKey]) {
      categoryTotals[groupKey] = {
        total: 0,
        count: 0,
        name: catName,
        color: catColor
      };
    }
    categoryTotals[groupKey].total += t.amount;
    categoryTotals[groupKey].count += 1;
  });

  // 3. 計算圓餅弧度 (Slices calculation)
  const sortedCategories = Object.entries(categoryTotals).sort(
    (a, b) => b[1].total - a[1].total
  );

  let cumulativeAngle = 0;
  const slices: SliceData[] = sortedCategories.map(([catId, data]) => {
    const percentage = totalExpense > 0 ? (data.total / totalExpense) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    return {
      categoryId: catId,
      categoryName: data.name,
      color: data.color,
      total: data.total,
      count: data.count,
      percentage,
      startAngle,
      endAngle
    };
  });

  // 4. SVG 圓弧路徑產生器
  const radius = 100;
  const innerRadius = 60; // 甜甜圈圓環
  const center = 120;

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians)
    };
  };

  const createDonutArc = (startAngle: number, endAngle: number, isHovered: boolean) => {
    // 角度差距太小或滿圓處理
    const adjustedEnd = endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
    const currentRadius = isHovered ? radius + 6 : radius;
    const currentInner = isHovered ? innerRadius - 2 : innerRadius;

    const start = polarToCartesian(center, center, currentRadius, startAngle);
    const end = polarToCartesian(center, center, currentRadius, adjustedEnd);
    const innerStart = polarToCartesian(center, center, currentInner, adjustedEnd);
    const innerEnd = polarToCartesian(center, center, currentInner, startAngle);

    const largeArcFlag = adjustedEnd - startAngle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', currentRadius, currentRadius, 0, largeArcFlag, 1, end.x, end.y,
      'L', innerStart.x, innerStart.y,
      'A', currentInner, currentInner, 0, largeArcFlag, 0, innerEnd.x, innerEnd.y,
      'Z'
    ].join(' ');
  };

  // 5. 統計使用者特別關注的重點項目 (餐飲、加油、預支)
  const diningExpenses = monthlyExpenses.filter((t) => t.categoryId === 'dining');
  const diningTotal = diningExpenses.reduce((sum, t) => sum + t.amount, 0);
  const diningTotalPeople = diningExpenses.reduce((sum, t) => sum + (t.peopleCount || 1), 0);
  const diningAvgPerPerson = diningTotalPeople > 0 ? Math.round(diningTotal / diningTotalPeople) : 0;

  const fuelExpenses = monthlyExpenses.filter((t) => t.categoryId === 'fuel');
  const fuelTotal = fuelExpenses.reduce((sum, t) => sum + t.amount, 0);

  const advanceExpenses = monthlyExpenses.filter((t) => t.categoryId === 'advance');
  const advanceTotal = advanceExpenses.reduce((sum, t) => sum + t.amount, 0);

  const activeSlice = slices.find((s) => s.categoryId === hoveredCategory);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700">
              <PieIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-stone-900">
              月度開支分類圓餅分析
            </h2>
          </div>
          <span className="text-xs text-stone-400 font-medium">
            共 {monthlyExpenses.length} 筆支出
          </span>
        </div>

        {totalExpense === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400 mb-3">
              <PieIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-stone-600">本月份尚無任何支出資料</p>
            <p className="text-xs text-stone-400 mt-1">
              可使用左側快速登記台或按鍵登記餐飲、加油、代墊等開銷
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center py-2">
            {/* SVG 互動圓餅圖 */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <svg
                width="210"
                height="210"
                viewBox="0 0 240 240"
                className="overflow-visible select-none drop-shadow-xs"
              >
                {slices.map((slice) => {
                  const isHovered = hoveredCategory === slice.categoryId;
                  return (
                    <path
                      key={slice.categoryId}
                      d={createDonutArc(slice.startAngle, slice.endAngle, isHovered)}
                      fill={slice.color}
                      opacity={hoveredCategory && !isHovered ? 0.45 : 1}
                      className="cursor-pointer transition-all duration-300 hover:opacity-90"
                      onMouseEnter={() => setHoveredCategory(slice.categoryId)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() =>
                        setDrilldownState({
                          isOpen: true,
                          name: slice.categoryName,
                          id: slice.categoryId
                        })
                      }
                    />
                  );
                })}

                {/* 圓心文字資訊 */}
                <g className="pointer-events-none text-center">
                  <text
                    x={center}
                    y={center - 10}
                    textAnchor="middle"
                    className="text-[11px] fill-stone-400 font-medium"
                  >
                    {activeSlice ? activeSlice.categoryName : '當月總開支'}
                  </text>
                  <text
                    x={center}
                    y={center + 14}
                    textAnchor="middle"
                    className="text-base font-bold fill-stone-900"
                  >
                    NT$ {(activeSlice ? activeSlice.total : totalExpense).toLocaleString()}
                  </text>
                  <text
                    x={center}
                    y={center + 30}
                    textAnchor="middle"
                    className="text-[10px] font-semibold fill-amber-700"
                  >
                    {activeSlice
                      ? `佔 ${activeSlice.percentage.toFixed(1)}% (${activeSlice.count} 筆)`
                      : `100% 支出總計`}
                  </text>
                </g>
              </svg>
            </div>

            {/* 圖例與佔比清單 */}
            <div className="lg:col-span-7 space-y-2.5">
              <span className="text-xs font-semibold text-stone-500 block mb-1">
                開支類別排行佔比：
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {slices.map((item) => {
                  const isHovered = hoveredCategory === item.categoryId;
                  return (
                    <div
                      key={item.categoryId}
                      onMouseEnter={() => setHoveredCategory(item.categoryId)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() =>
                        setDrilldownState({
                          isOpen: true,
                          name: item.categoryName,
                          id: item.categoryId
                        })
                      }
                      className={`p-2 rounded-xl transition-all flex items-center justify-between cursor-pointer border ${
                        isHovered
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                          : 'border-stone-100 hover:bg-stone-50/80 hover:border-stone-300'
                      }`}
                      title={`點擊查看【${item.categoryName}】細項流水帳`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-semibold text-stone-800 truncate">
                          {item.categoryName}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {item.count} 筆
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-stone-900">
                            NT$ {item.total.toLocaleString()}
                          </div>
                          <div className="text-[10px] font-semibold text-stone-500">
                            {item.percentage.toFixed(1)}%
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部洞察卡片：針對用戶主要開支（餐飲、加油、預支）的關鍵指標 */}
      <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* 餐飲人均分析 */}
        <div 
          onClick={() => setDrilldownState({ isOpen: true, name: '餐飲', id: 'dining' })}
          className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/60 hover:border-orange-300 hover:bg-orange-100/60 transition-all cursor-pointer shadow-2xs group"
          title="點擊查看餐飲所有店家與均攤細項"
        >
          <div className="flex items-center justify-between font-bold text-orange-800">
            <div className="flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              <span>餐飲人均統計</span>
            </div>
            <span className="text-[10px] text-orange-600 font-normal group-hover:underline">看細項 ›</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-stone-600">
            <span>累積總餐費:</span>
            <span className="font-bold text-stone-900">NT$ {diningTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-baseline justify-between text-stone-600">
            <span>均攤每人餐費:</span>
            <span className="font-bold text-orange-700">
              {diningAvgPerPerson > 0 ? `NT$ ${diningAvgPerPerson.toLocaleString()}` : '-'}
            </span>
          </div>
        </div>

        {/* 加油花費 */}
        <div 
          onClick={() => setDrilldownState({ isOpen: true, name: '加油', id: 'fuel' })}
          className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/60 hover:border-sky-300 hover:bg-sky-100/60 transition-all cursor-pointer shadow-2xs group"
          title="點擊查看加油各加油站細項明細"
        >
          <div className="flex items-center justify-between font-bold text-sky-800">
            <div className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5" />
              <span>加油站支出</span>
            </div>
            <span className="text-[10px] text-sky-600 font-normal group-hover:underline">看細項 ›</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-stone-600">
            <span>加油次數:</span>
            <span className="font-bold text-stone-900">{fuelExpenses.length} 次</span>
          </div>
          <div className="flex items-baseline justify-between text-stone-600">
            <span>本月總油資:</span>
            <span className="font-bold text-sky-700">NT$ {fuelTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* 預支款統計 (點擊展示預支所有細項明細) */}
        <div 
          onClick={() => setDrilldownState({ isOpen: true, name: '預支', id: 'advance' })}
          className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/60 hover:border-purple-300 hover:bg-purple-100/60 transition-all cursor-pointer shadow-2xs group"
          title="點擊查看預支借支詳細同仁與項目明細"
        >
          <div className="flex items-center justify-between font-bold text-purple-800">
            <div className="flex items-center gap-1.5">
              <HandCoins className="w-3.5 h-3.5" />
              <span>預支借支額</span>
            </div>
            <span className="text-[10px] text-purple-600 font-normal group-hover:underline">看細項 ›</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-stone-600">
            <span>預支筆數:</span>
            <span className="font-bold text-stone-900">{advanceExpenses.length} 筆</span>
          </div>
          <div className="flex items-baseline justify-between text-stone-600">
            <span>預支總金額:</span>
            <span className="font-bold text-purple-700">NT$ {advanceTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 點擊圓餅圖或預支指標彈出的細項明細視窗 (純檢視統計與明細，無修改功能) */}
      <CategoryDrilldownModal
        isOpen={drilldownState.isOpen}
        onClose={() => setDrilldownState({ isOpen: false, name: '' })}
        categoryName={drilldownState.name}
        categoryId={drilldownState.id}
        currentYearMonth={currentYearMonth}
        transactions={transactions}
      />
    </div>
  );
};
