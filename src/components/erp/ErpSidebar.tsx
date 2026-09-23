import React from 'react';
import { 
  Home, 
  Coins, 
  Building2,
  Users2,
  Truck,
  Car, 
  Package, 
  FileCheck2, 
  Database, 
  ChevronRight,
  Sparkles,
  Layers,
  Settings
} from 'lucide-react';

export type ErpAppId = 'home' | 'company' | 'customers' | 'suppliers' | 'petty_cash' | 'fleet' | 'assets' | 'workflow' | 'database';

export interface ErpAppItem {
  id: ErpAppId;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  isReady: boolean;
  description: string;
}

export const ERP_APPS: ErpAppItem[] = [
  {
    id: 'home',
    name: '系統總覽首頁',
    shortName: '首頁',
    icon: Home,
    isReady: true,
    description: '客製化 ERP 工作台總覽、快速捷徑與系統狀態'
  },
  {
    id: 'company',
    name: '公司基本設定',
    shortName: '公司設定',
    icon: Building2,
    badge: '表格核心',
    badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
    isReady: true,
    description: '公司全名、統編、電話地址與銀行匯款帳號，供套印表格或匯出報表自動帶入'
  },
  {
    id: 'customers',
    name: '客戶名冊管理',
    shortName: '客戶管理',
    icon: Users2,
    badge: '個人/店家',
    badgeColor: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    isReady: true,
    description: '客戶聯絡名冊，分類管理個人客戶、實體店家/門市與公司法人，掌握客戶屬性'
  },
  {
    id: 'suppliers',
    name: '合作廠商管理',
    shortName: '廠商管理',
    icon: Truck,
    badge: '業務分類',
    badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    isReady: true,
    description: '協力廠商與供料商，依業務屬性分類、維護銀行付款帳號及一鍵產出通訊名冊'
  },
  {
    id: 'petty_cash',
    name: '公司零用金管理',
    shortName: '零用金',
    icon: Coins,
    badge: '運作中',
    badgeColor: 'bg-emerald-600 text-white',
    isReady: true,
    description: '收支流水帳、傳票發票、採買子帳、報表中心與 SQLite 儲存'
  },
  {
    id: 'fleet',
    name: '車輛油資管理',
    shortName: '油資審核',
    icon: Car,
    badge: '預留',
    badgeColor: 'bg-stone-100 text-stone-600',
    isReady: false,
    description: '公務車出差、加油卡與里程核銷（客製模組預留入口）'
  },
  {
    id: 'assets',
    name: '物品與資產管理',
    shortName: '物品資產',
    icon: Package,
    badge: '預留',
    badgeColor: 'bg-stone-100 text-stone-600',
    isReady: false,
    description: '耗材領用、辦公設備與固資盤點（客製模組預留入口）'
  },
  {
    id: 'workflow',
    name: '內部洽談與簽核',
    shortName: '簽核表單',
    icon: FileCheck2,
    badge: '預留',
    badgeColor: 'bg-stone-100 text-stone-600',
    isReady: false,
    description: '採購請購單、出差申請與電子審核（客製模組預留入口）'
  },
  {
    id: 'database',
    name: 'SQLite 資料庫中心',
    shortName: '資料庫',
    icon: Database,
    badge: 'SQLite',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    isReady: true,
    description: '實體資料庫備份、欄位字典文件與帶著走管理'
  }
];

interface ErpSidebarProps {
  activeApp: ErpAppId;
  onSelectApp: (id: ErpAppId) => void;
  isCollapsed: boolean;
}

export const ErpSidebar: React.FC<ErpSidebarProps> = ({
  activeApp,
  onSelectApp,
  isCollapsed
}) => {
  return (
    <aside
      className={`bg-white border-r border-stone-200 flex flex-col transition-all duration-200 select-none z-20 flex-shrink-0 shadow-2xs ${
        isCollapsed ? 'w-[70px]' : 'w-[200px]'
      }`}
    >
      {/* 模組選單區域 */}
      <div className="flex-1 py-2 overflow-y-auto overflow-x-hidden space-y-1">
        {ERP_APPS.map((app) => {
          const Icon = app.icon;
          const isActive = activeApp === app.id;

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelectApp(app.id)}
              title={`${app.name}：${app.description}`}
              className={`w-full text-left transition-all relative group cursor-pointer ${
                isCollapsed
                  ? 'px-1 py-2.5 flex flex-col items-center justify-center'
                  : 'px-3 py-2.5 flex items-center gap-3'
              } ${
                isActive
                  ? 'bg-blue-50/90 text-[#0066cc] font-bold'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              {/* 鼎新風格：作用中的左側藍色高亮標籤條 */}
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-1 bg-[#0066cc] rounded-r" />
              )}

              {/* 圖示 */}
              <div
                className={`flex items-center justify-center transition-colors ${
                  isCollapsed ? 'mb-1' : ''
                } ${
                  isActive ? 'text-[#0066cc]' : 'text-stone-500 group-hover:text-stone-800'
                }`}
              >
                <Icon className={isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} />
              </div>

              {/* 文字標籤 (鼎新直立風格：收合時文字在圖示下方，展開時在右方) */}
              {isCollapsed ? (
                <span
                  className={`text-[10px] text-center tracking-tight leading-none truncate max-w-[62px] ${
                    isActive ? 'font-bold text-[#0066cc]' : 'text-stone-600'
                  }`}
                >
                  {app.shortName}
                </span>
              ) : (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-xs truncate block font-medium">
                    {app.name}
                  </span>
                  {app.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-normal ml-1.5 shrink-0 ${
                        app.badgeColor || 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {app.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 底部邊欄說明 */}
      <div className="p-2 border-t border-stone-200 text-center text-stone-600">
        {isCollapsed ? (
          <div className="text-[10px] font-mono py-1" title="客製化 ERP 大框架">
            ERP
          </div>
        ) : (
          <div className="text-[10px] text-left px-2 py-1 leading-snug">
            <span className="font-semibold block text-stone-600">客製化大框架</span>
            <span className="text-stone-600 block mt-0.5">點擊模組隨選即用</span>
          </div>
        )}
      </div>
    </aside>
  );
};
