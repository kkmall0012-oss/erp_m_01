import React from 'react';
import { 
  ArrowLeft, 
  Coins, 
  Sparkles, 
  Wrench, 
  Layers, 
  CheckCircle2, 
  FileText
} from 'lucide-react';
import { ErpAppItem } from './ErpSidebar';

interface ErpModulePlaceholderProps {
  app: ErpAppItem;
  onGoToPettyCash: () => void;
  onGoToHome: () => void;
}

export const ErpModulePlaceholder: React.FC<ErpModulePlaceholderProps> = ({
  app,
  onGoToPettyCash,
  onGoToHome
}) => {
  const Icon = app.icon;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* 模組準備卡片 */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xs text-center relative overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="inline-flex p-4 rounded-2xl bg-blue-50 text-[#0066cc] mb-4 shadow-2xs">
          <Icon className="w-10 h-10" />
        </div>

        <div className="inline-block mb-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            客製化 ERP 模組預留入口
          </span>
        </div>

        <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
          {app.name}
        </h3>
        
        <p className="text-stone-500 text-sm max-w-md mx-auto mt-2 leading-relaxed">
          {app.description}
        </p>

        {/* 說明方塊 */}
        <div className="mt-8 p-6 rounded-2xl bg-stone-50 border border-stone-200 text-left max-w-xl mx-auto space-y-3">
          <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
            <Wrench className="w-4 h-4 text-[#0066cc]" />
            <span>客製化開發準備說明：</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            這是一個專為您的作業流程所預留的小程式入口。依照您的規劃原則，我們採用<strong>「只做需要的功能、簡化目前處理流程」</strong>的客製化方向。
          </p>
          <ul className="text-xs text-stone-600 space-y-2 list-disc list-inside">
            <li>底層已與 SQLite 實體資料庫整合完畢，可共用同一套資料庫。</li>
            <li>隨時只要您開出作業需求（如：需要哪些輸入欄位、審核流程、或對應公式），我們就能立刻為您撰寫此模組！</li>
          </ul>
        </div>

        {/* 快速返回或前往已完成的零用金小程式 */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoToPettyCash}
            className="px-5 py-2.5 rounded-xl bg-[#0066cc] hover:bg-[#005bb5] text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            <span>前往公司零用金系統</span>
          </button>

          <button
            type="button"
            onClick={onGoToHome}
            className="px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回總覽首頁</span>
          </button>
        </div>
      </div>
    </div>
  );
};
