import React, { useState, useMemo } from 'react';
import { Search, Flame, ArrowDownAZ, ListOrdered, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

export type SortMode = 'popular' | 'alpha' | 'default';

interface SearchableOptionPickerProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  usageCounts?: Record<string, number>;
  monthLabel?: string;
  placeholder?: string;
  itemTypeLabel?: string; // 例如「店家」、「同仁」、「站點」
  badgeColor?: string;
}

export const SearchableOptionPicker: React.FC<SearchableOptionPickerProps> = ({
  options,
  value,
  onChange,
  usageCounts = {},
  monthLabel,
  placeholder = '搜尋或點選...',
  itemTypeLabel = '項目',
  badgeColor = '#d97706'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // 1. 根據排序模式與歷史次數計算排序後的清單
  const sortedOptions = useMemo(() => {
    const list = [...options];

    if (sortMode === 'popular') {
      return list.sort((a, b) => {
        const countA = usageCounts[a] || 0;
        const countB = usageCounts[b] || 0;
        if (countB !== countA) {
          return countB - countA; // 使用次數多的排前面
        }
        return a.localeCompare(b, 'zh-Hant'); // 次數相同照筆劃
      });
    }

    if (sortMode === 'alpha') {
      return list.sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    }

    return list; // default
  }, [options, sortMode, usageCounts]);

  // 2. 關鍵字過濾
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return sortedOptions;
    const query = searchTerm.toLowerCase();
    return sortedOptions.filter((opt) => opt.toLowerCase().includes(query));
  }, [sortedOptions, searchTerm]);

  // 3. 最常用的前 6~8 個項目（供快速點選標籤）
  const topPicks = useMemo(() => {
    // 依使用次數由大到小排序取出前幾名
    const sortedByUsage = [...options].sort((a, b) => {
      const countA = usageCounts[a] || 0;
      const countB = usageCounts[b] || 0;
      return countB - countA;
    });
    return sortedByUsage.slice(0, 7);
  }, [options, usageCounts]);

  return (
    <div className="space-y-2">
      {/* 搜尋與排序控制列 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
        {/* 即時搜尋框 */}
        <div className="relative grow">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={`快速搜尋${itemTypeLabel} (輸入關鍵字)...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isExpanded) setIsExpanded(true);
            }}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium placeholder:text-stone-400 shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 排序方式切換按鈕 */}
        <div className="inline-flex p-0.5 bg-stone-100 rounded-lg text-[10px] shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setSortMode('popular')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              sortMode === 'popular'
                ? 'bg-white text-amber-800 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="依照歷史使用次數高到低排序，最常用排在最前面"
          >
            <Flame className="w-3 h-3 text-amber-600" />
            <span>常用優先</span>
          </button>

          <button
            type="button"
            onClick={() => setSortMode('alpha')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              sortMode === 'alpha'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="依照中文筆畫或字母 A-Z 順序排列"
          >
            <ArrowDownAZ className="w-3 h-3 text-blue-600" />
            <span>筆劃名稱</span>
          </button>

          <button
            type="button"
            onClick={() => setSortMode('default')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              sortMode === 'default'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
            title="依照原本在分類中預設的排序"
          >
            <ListOrdered className="w-3 h-3 text-stone-500" />
            <span>預設</span>
          </button>
        </div>
      </div>

      {/* 當前已選擇提示卡 */}
      {value ? (
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border border-amber-300 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-stone-500 shrink-0">已選擇{itemTypeLabel}：</span>
            <span className="font-bold text-stone-900 truncate">{value}</span>
            {usageCounts[value] ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 font-mono shrink-0">
                {monthLabel ? `${monthLabel}已記` : '當月已記'} {usageCounts[value]} 次
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-stone-400 hover:text-rose-600 ml-2 shrink-0 cursor-pointer"
          >
            清除
          </button>
        </div>
      ) : null}

      {/* 常用前幾名快捷點選標籤 */}
      {!searchTerm && topPicks.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-stone-400 font-semibold flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>常用快速點選（點擊直接帶入）：</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topPicks.map((item, idx) => {
              const isSelected = value === item;
              const count = usageCounts[item] || 0;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange(item)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-amber-400 hover:bg-amber-50/50'
                  }`}
                >
                  <span>{item}</span>
                  {count > 0 && (
                    <span className={`text-[9px] px-1 py-0.2 rounded-sm font-mono ${
                      isSelected ? 'bg-amber-700/50 text-white' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 全部選項清單 (可展開 / 收合) */}
      <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center justify-between border-b border-stone-200/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span>瀏覽全部 {itemTypeLabel} 清單 ({filteredOptions.length} 個)</span>
            <span className="text-[10px] text-stone-400">
              {sortMode === 'popular' ? '• 常用次數排序' : sortMode === 'alpha' ? '• 筆劃名稱排序' : '• 預設排序'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-700 font-normal">
            <span>{isExpanded ? '收合清單' : '展開挑選'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isExpanded && (
          <div className="p-2 max-h-52 overflow-y-auto divide-y divide-stone-100">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-400">
                無符合「{searchTerm}」的{itemTypeLabel}，可切換為「手動輸入」新增
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 py-1">
                {filteredOptions.map((opt, idx) => {
                  const isSelected = value === opt;
                  const count = usageCounts[opt] || 0;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onChange(opt);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-stone-900 font-bold ring-1 ring-amber-500'
                          : 'bg-stone-50/70 border-stone-100 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {count > 0 && (
                          <span className="text-[9px] text-stone-400 font-mono">
                            {count}次
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
