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
  Trash2
} from 'lucide-react';
import { Transaction, CategoryConfig, MonthBudget, BackupData, DirectorWithdrawal, SubAccount } from '../types';
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
  onRestoreBackup: (data: BackupData) => void;
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
                10年資料庫安全備份與還原
              </h3>
              <p className="text-xs text-stone-500">
                純本地端儲存 · 零收費風險 · 資料安全自主掌控
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

          {/* 10 年保存與免收費承諾說明 */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-stone-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>單機版如何確保 10 年以上資料永不遺失？</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              您選擇的「純本地端單機架構」具備<strong>100% 永久免費</strong>、<strong>無任何後續收費風險</strong>且<strong>隱私絕不外洩</strong>的最高優點。
            </p>
            <p className="text-stone-600 leading-relaxed">
              但因為電腦若更換、重灌作業系統或瀏覽器快取被深度清除時，本機暫存會被清空，因此請建立良好的備份習慣：
            </p>
            <ul className="list-disc pl-5 space-y-1 text-stone-600">
              <li><strong>定期下載備份檔</strong>：每個月或每半年點擊下方「立即下載完整資料庫備份檔 (.json)」。</li>
              <li><strong>存於安全實體</strong>：將該檔案備份到您的隨身碟、外接隨身硬碟或個人的 Google Drive / OneDrive 雲端空間。</li>
              <li><strong>換機無縫銜接</strong>：換新電腦、換新手機或重灌後，只要點擊「匯入還原」，10 年前的每一筆帳目 1 秒完全還原！</li>
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

        {/* 還原確認彈窗 */}
        <ConfirmDialog
          isOpen={!!pendingRestore}
          title="確認要還原備份資料嗎？"
          description={
            pendingRestore ? (
              <div className="space-y-1.5 text-xs">
                <p className="text-stone-700">還原後將會覆蓋目前的歷史紀錄與設定：</p>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 space-y-1 font-mono text-[11px]">
                  <div>備份時間：{new Date(pendingRestore.exportedAt).toLocaleString('zh-TW')}</div>
                  <div>歷史記帳：{pendingRestore.transactions.length} 筆</div>
                  <div>主分類數：{pendingRestore.categories.length} 類</div>
                  {pendingRestore.claimants && (
                    <div>常用請領人：{pendingRestore.claimants.length} 位</div>
                  )}
                  {pendingRestore.directorWithdrawals && (
                    <div>廠長領取紀錄：{pendingRestore.directorWithdrawals.length} 筆</div>
                  )}
                  {pendingRestore.subAccounts && (
                    <div>採買子帳帳戶：{pendingRestore.subAccounts.length} 個</div>
                  )}
                </div>
              </div>
            ) : null
          }
          confirmText="確認覆蓋並還原"
          cancelText="取消"
          variant="warning"
          onConfirm={() => {
            if (pendingRestore) {
              onRestoreBackup(pendingRestore);
              setPendingRestore(null);
              setRestoreStatus('還原成功！已完整恢復所有歷史記帳與設定');
              setTimeout(() => {
                setRestoreStatus('');
                onClose();
              }, 1500);
            }
          }}
          onClose={() => setPendingRestore(null)}
        />

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
