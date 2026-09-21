import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Database, 
  User, 
  RefreshCw,
  Building2,
  ChevronDown,
  Check,
  Settings,
  Layers
} from 'lucide-react';
import { CompanyProfile } from '../../types';

interface ErpTopBarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  activeAppTitle: string;
  onOpenBackupModal: () => void;
  onReloadData?: () => void;
  companies?: CompanyProfile[];
  activeCompanyId?: string;
  onSelectCompany?: (id: string) => void;
  onGoToCompanySettings?: () => void;
}

export const ErpTopBar: React.FC<ErpTopBarProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  activeAppTitle,
  onOpenBackupModal,
  onReloadData,
  companies = [],
  activeCompanyId = 'comp_1',
  onSelectCompany,
  onGoToCompanySettings
}) => {
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const companyMenuRef = useRef<HTMLDivElement>(null);

  // 取得當前選取的公司物件
  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const isAllCompanies = activeCompanyId === 'all';

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target as Node)) {
        setIsCompanyMenuOpen(false);
      }
    };
    if (isCompanyMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCompanyMenuOpen]);

  return (
    <header className="bg-[#0066cc] text-white h-12 flex items-center justify-between px-3 shadow-md z-30 select-none flex-shrink-0">
      {/* 左側：漢堡選單切換 + ERP 系統名稱 + 目前模組路徑 */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "展開左側選單" : "收合左側選單"}
          className="p-1.5 rounded hover:bg-white/15 active:bg-white/25 transition-colors text-white cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* 系統 LOGO 與名稱 */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/20">
          <div className="flex items-center tracking-tight">
            <span className="font-extrabold text-base tracking-wide bg-white text-[#0066cc] px-1.5 py-0.5 rounded text-xs font-mono mr-1.5 shadow-2xs">
              ERP
            </span>
            <span className="font-bold text-sm tracking-wide hidden sm:inline">
              企業客製化商務系統
            </span>
          </div>
        </div>

        {/* 🏢 關係企業/三行號作帳即時切換下拉選單 */}
        {companies.length > 0 && (
          <div className="relative" ref={companyMenuRef}>
            <button
              type="button"
              onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
              title="點擊隨時切換三間公司作帳帳冊"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all text-xs font-medium cursor-pointer shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <div className="flex items-center gap-1.5 text-left max-w-[160px] sm:max-w-[240px] truncate">
                {isAllCompanies ? (
                  <span className="font-bold flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-300" />
                    <span>全部關係企業 (合併帳)</span>
                  </span>
                ) : (
                  <>
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: activeCompany?.color || '#38bdf8' }}
                    />
                    <span className="font-bold truncate">
                      {activeCompany?.shortName || activeCompany?.name || '請選擇行號'}
                    </span>
                    {activeCompany?.taxId && (
                      <span className="text-[10px] font-mono text-white/80 hidden md:inline">
                        ({activeCompany.taxId})
                      </span>
                    )}
                  </>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 opacity-80 transition-transform duration-200 ${isCompanyMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉切換選單彈窗 */}
            {isCompanyMenuOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-white text-stone-800 rounded-xl shadow-2xl border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between text-xs text-stone-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#0066cc]" />
                    切換記帳行號主體 (3 間關係企業)
                  </span>
                  <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                    獨立帳冊
                  </span>
                </div>

                <div className="py-1 max-h-64 overflow-y-auto">
                  {companies.map((comp) => {
                    const isSelected = activeCompanyId === comp.id;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => {
                          onSelectCompany?.(comp.id);
                          setIsCompanyMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-sky-50/70 border-l-4 border-[#0066cc]' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0 pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                            style={{ backgroundColor: comp.color || '#0066cc' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs truncate ${isSelected ? 'font-bold text-[#0066cc]' : 'font-semibold text-stone-800'}`}>
                                {comp.name}
                              </span>
                              {comp.isDefault && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-medium shrink-0">
                                  預設
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono flex items-center gap-2 mt-0.5">
                              <span>統編：{comp.taxId || '未填'}</span>
                              {comp.shortName && (
                                <span className="text-stone-400 font-sans">({comp.shortName})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-[#0066cc] shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {/* 全覽選項 */}
                  <div className="my-1 border-t border-stone-100" />
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCompany?.('all');
                      setIsCompanyMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer ${
                      isAllCompanies ? 'bg-cyan-50 border-l-4 border-cyan-600' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <Layers className="w-4 h-4 text-cyan-600" />
                      <div>
                        <span className={`font-semibold ${isAllCompanies ? 'text-cyan-700 font-bold' : 'text-stone-700'}`}>
                          全部關係企業 (跨公司合併總覽)
                        </span>
                        <div className="text-[10px] text-stone-400">彙整三間公司之全部零用金開銷與報表</div>
                      </div>
                    </div>
                    {isAllCompanies && <Check className="w-4 h-4 text-cyan-600 shrink-0" />}
                  </button>
                </div>

                {onGoToCompanySettings && (
                  <div className="pt-1.5 pb-1 px-2 border-t border-stone-100 bg-stone-50/70 rounded-b-xl flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompanyMenuOpen(false);
                        onGoToCompanySettings();
                      }}
                      className="text-[11px] text-[#0066cc] hover:text-[#0052a3] font-medium flex items-center gap-1 p-1 hover:underline cursor-pointer"
                    >
                      <Settings className="w-3 h-3" />
                      管理公司行號與統編設定...
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 當前小程式/模組路徑導航 */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/90">
          <span className="text-white/60">工作台 ＞</span>
          <span className="font-bold px-2 py-0.5 rounded bg-white/15 border border-white/20 flex items-center gap-1">
            {activeAppTitle}
          </span>
        </div>
      </div>

      {/* 右側：SQLite 連線狀態 + 使用者資訊 + 常用捷徑 */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        {/* 資料庫狀態指示標籤 */}
        <button
          type="button"
          onClick={onOpenBackupModal}
          title="🟢 已連線本機 SQLite 實體資料庫 (data/petty_cash.sqlite)，點擊可下載資料庫檔案帶著走或備份"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-white font-medium border border-emerald-400 shadow-2xs transition-colors cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          <Database className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono">SQLite 資料庫</span>
        </button>

        {/* 重新整理資料 */}
        {onReloadData && (
          <button
            type="button"
            onClick={onReloadData}
            title="從 SQLite 資料庫重新整理同步數據"
            className="p-1.5 rounded hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer hidden md:flex items-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 使用者身分頭像區塊 */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/20 py-0.5">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 text-xs">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden xl:flex flex-col text-left leading-tight">
            <span className="font-bold text-[11px]">財務帳務管家</span>
            <span className="text-[9px] text-white/70">線上運作中</span>
          </div>
        </div>
      </div>
    </header>
  );
};

