import React, { useRef, useState } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  HardDrive,
  FileJson,
  CheckCircle2,
  Trash2,
  Check
} from 'lucide-react';
import { 
  Transaction, 
  CategoryConfig, 
  MonthBudget, 
  BackupData, 
  DirectorWithdrawal, 
  SubAccount,
  RestoreScope,
  RestoreOptions
} from '../types';
import { exportBackupJSON, parseBackupJSON } from '../utils/storage';
import { ConfirmDialog } from './ConfirmDialog';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: CategoryConfig[];
  budgets: Record<string, MonthBudget>;
  claimants?: string[];
  directorWithdrawals?: DirectorWithdrawal[];
  subAccounts?: SubAccount[];
  onRestoreBackup: (data: BackupData, options?: RestoreOptions) => void;
  onClearAllData: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  budgets,
  claimants,
  directorWithdrawals,
  subAccounts,
  onRestoreBackup,
  onClearAllData
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pendingRestore, setPendingRestore] = useState<BackupData | null>(null);
  const [restoreScope, setRestoreScope] = useState<RestoreScope>('settings_only');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  // 下載 JSON 備份檔
  const handleDownloadBackup = () => {
    exportBackupJSON(transactions, categories, budgets, claimants, directorWithdrawals, subAccounts);
  };

  // 匯入 JSON 備份檔
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const parsed = parseBackupJSON(content);
      if (parsed) {
        setPendingRestore(parsed);
      } else {
        setErrorMessage('備份檔案格式不正確或已毀損，請確認是否為本系統匯出的 .json 備份檔');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                完整資料庫安全備份與還原
              </h3>
              <p className="text-xs text-stone-500">
                全歷史資料無期限保存 · 純本地端儲存 · 換機無損鏡像還原
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 grow text-xs">
          {/* 還原成功通知 */}
          {restoreStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{restoreStatus}</span>
            </div>
          )}

          {/* 無期限永久保存與換機遷移說明 */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-stone-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>全歷史資料無年限限制 · 換機遷移 100% 一模一樣</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              本備份功能<strong>包含系統全部歷史資料，沒有任何年份或時間限制</strong>。不論是 5 年、10 年或更久的每一筆收支流水、發票憑證、傳票編號、自訂科目與專款子帳，都會完整打包無損保存。
            </p>
            <p className="text-stone-600 leading-relaxed">
              <strong>關於換機「還原」機制</strong>：還原功能採用<strong>「鏡像覆蓋寫入」</strong>。在新機器執行還原時，系統會先清空新機器的初始範例資料，再將備份檔中的真實資料完全寫入，確保新機器與原先機器<strong>100% 一模一樣</strong>，絕不會發生舊資料殘留或帳目重複疊加問題。
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-600">
              <li><strong>匯出遷移</strong>：點擊「下載完整資料庫備份檔 (.json)」，將檔案存至隨身碟或雲端硬碟。</li>
              <li><strong>新機還原</strong>：在新電腦開啟系統，點擊「選擇檔案進行資料還原」，選取該 .json 檔案即可瞬間恢復。</li>
            </ul>
          </div>

          {/* 目前資料庫狀態 */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-stone-100/60 rounded-xl border border-stone-200">
            <div>
              <span className="text-[11px] text-stone-500 block">目前記帳筆數</span>
              <span className="text-sm font-bold text-stone-900 font-mono">
                {transactions.length} 筆
              </span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">自訂常用項目</span>
              <span className="text-sm font-bold text-stone-900 font-mono">
                {categories.reduce((sum, c) => sum + c.defaultSubItems.length, 0)} 個
              </span>
            </div>
            <div>
              <span className="text-[11px] text-stone-500 block">儲存技術格式</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                JSON / LocalDB
              </span>
            </div>
          </div>

          {/* 備份與還原主要按鈕 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 下載備份 */}
            <button
              id="download-backup-btn"
              type="button"
              onClick={handleDownloadBackup}
              className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/80 text-left transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Download className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  推薦定期執行
                </span>
              </div>
              <div className="mt-3">
                <span className="font-bold text-stone-900 block text-xs">
                  1. 下載完整資料庫備份檔 (.json)
                </span>
                <span className="text-[11px] text-stone-500 mt-0.5 block leading-normal">
                  包含全部歷史流水帳、店家名單與預算設定
                </span>
              </div>
            </button>

            {/* 匯入還原 */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                id="restore-backup-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full p-4 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-left transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-stone-800 text-white flex items-center justify-center shadow-xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-600 bg-white px-2 py-0.5 rounded-full border border-stone-200">
                    換機/重灌必用
                  </span>
                </div>
                <div className="mt-3">
                  <span className="font-bold text-stone-900 block text-xs">
                    2. 選擇檔案進行資料還原
                  </span>
                  <span className="text-[11px] text-stone-500 mt-0.5 block leading-normal">
                    載入電腦中儲存的 .json 備份檔恢復歷史帳目
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 錯誤訊息 */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 清除資料選項 */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <div>
              <span className="font-bold text-stone-700 block">重設資料庫</span>
              <span className="text-[11px] text-stone-400">
                若要清除初始預設範例資料，可一鍵清空
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空所有紀錄</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-100 flex items-center justify-end bg-stone-50/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>

        {/* 還原模式自選彈窗 (支援僅恢復選單/名冊、全庫鏡像、僅恢復流水帳) */}
        {pendingRestore && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div 
              className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      選擇備份資料還原範圍
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      備份檔時間：{new Date(pendingRestore.exportedAt).toLocaleString('zh-TW')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* 備份檔概況 */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-stone-500 block">備份流水帳</span>
                    <span className="text-xs font-bold text-stone-900">{pendingRestore.transactions.length} 筆</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">主題分類</span>
                    <span className="text-xs font-bold text-stone-900">{pendingRestore.categories.length} 類</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">常用請領人</span>
                    <span className="text-xs font-bold text-stone-900">{pendingRestore.claimants?.length || 0} 位</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-stone-800">請選擇您希望還原的資料範圍：</span>
                  <p className="text-[11px] text-stone-500">
                    可依需求單獨救回主題分類與選單，或進行完整全庫覆蓋鏡像轉移。
                  </p>
                </div>

                {/* 模式選項 1: 僅還原選單項目與請領人名冊 (專門解決誤按重設或想保留新資料) */}
                <div
                  onClick={() => setRestoreScope('settings_only')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1.5 ${
                    restoreScope === 'settings_only'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        restoreScope === 'settings_only' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300'
                      }`}>
                        {restoreScope === 'settings_only' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="font-bold text-stone-900 text-xs">
                        僅還原「主題分類與常用請領人名冊」
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      推薦：救回選單首選
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 pl-6 leading-relaxed">
                    只從備份檔恢復<strong>自訂主題分類、店家細項選單、常用請領人名冊與預算設定</strong>。
                  </p>
                  <div className="ml-6 p-2 rounded-lg bg-white/90 border border-emerald-200/80 text-[11px] text-emerald-800 font-medium">
                    🛡️ <strong>現有記帳 100% 完整保留</strong>：您目前的所有記帳明細、傳票號碼與專款子帳完全不會被覆蓋或刪除！
                  </div>
                </div>

                {/* 模式選項 2: 完整全庫還原 */}
                <div
                  onClick={() => setRestoreScope('full')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1.5 ${
                    restoreScope === 'full'
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        restoreScope === 'full' ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-300'
                      }`}>
                        {restoreScope === 'full' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="font-bold text-stone-900 text-xs">
                        完整全庫覆蓋還原 (整機鏡像轉移)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      換新機器使用
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 pl-6 leading-relaxed">
                    將備份檔中的<strong>全歷史流水帳 ({pendingRestore.transactions.length} 筆)、自訂分類、同仁名冊、廠長專款、採買子帳與預算</strong>全部完整覆蓋寫入。
                  </p>
                  <div className="ml-6 text-[10px] text-amber-800">
                    ⚠️ 適合換新電腦或系統重灌，新機器將與備份當下完全一模一樣。
                  </div>
                </div>

                {/* 模式選項 3: 僅還原流水帳紀錄 */}
                <div
                  onClick={() => setRestoreScope('transactions_only')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-1.5 ${
                    restoreScope === 'transactions_only'
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        restoreScope === 'transactions_only' ? 'border-blue-600 bg-blue-600 text-white' : 'border-stone-300'
                      }`}>
                        {restoreScope === 'transactions_only' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="font-bold text-stone-900 text-xs">
                        僅還原「歷史收支流水帳紀錄」
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                      保留現有選單
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 pl-6 leading-relaxed">
                    只恢復 {pendingRestore.transactions.length} 筆歷史記帳流水與專款帳戶，您目前已設定好的分類與請領人名冊保持現狀。
                  </p>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="px-6 py-3.5 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRestoreBackup(pendingRestore, { scope: restoreScope });
                    setPendingRestore(null);
                    if (restoreScope === 'settings_only') {
                      setRestoreStatus('還原成功！已成功救回主題分類與請領人名冊，現有記帳紀錄完整保留！');
                    } else if (restoreScope === 'transactions_only') {
                      setRestoreStatus('還原成功！已恢復歷史流水帳，現有選單設定保持不變。');
                    } else {
                      setRestoreStatus('還原成功！已完成全資料庫完整覆蓋鏡像還原。');
                    }
                    setTimeout(() => {
                      setRestoreStatus('');
                      onClose();
                    }, 1800);
                  }}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                    restoreScope === 'settings_only' 
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : restoreScope === 'full'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {restoreScope === 'settings_only' && '確認僅還原選單與名冊 (保留現有記帳)'}
                  {restoreScope === 'full' && '確認全庫完整覆蓋還原'}
                  {restoreScope === 'transactions_only' && '確認僅還原收支流水帳'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 清空所有紀錄確認彈窗 */}
        <ConfirmDialog
          isOpen={showClearConfirm}
          title="確定要清空所有記帳資料嗎？"
          description={
            <div className="space-y-2 text-xs">
              <p className="text-stone-700">
                此操作將會清空所有的零用金流水明細與廠長領取紀錄（建議先下載 JSON 備份以防萬一）。
              </p>
              <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
                ⚠️ 清空後本機所有歷史帳目將被重設為零。
              </div>
            </div>
          }
          confirmText="確認清空全部資料"
          cancelText="取消保留"
          variant="danger"
          onConfirm={() => {
            setShowClearConfirm(false);
            onClearAllData();
            onClose();
          }}
          onClose={() => setShowClearConfirm(false)}
        />
      </div>
    </div>
  );
};
