import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { Transaction, CategoryConfig } from '../types';
import {
  generateBlankImportTemplate,
  parseAndValidateImportFile,
  ImportResult
} from '../utils/excel';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTransactions: Transaction[];
  categories: CategoryConfig[];
  claimants: string[];
  onImportSuccess: (newTransactions: Transaction[], stats: { added: number; duplicates: number }) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  existingTransactions,
  categories,
  claimants,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'new' | 'duplicate' | 'invalid'>('new');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    generateBlankImportTemplate();
  };

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsProcessing(true);
    setImportResult(null);

    try {
      const res = await parseAndValidateImportFile(
        selectedFile,
        existingTransactions,
        categories,
        claimants
      );
      setImportResult(res);
      if (res.newTransactions.length > 0) {
        setActivePreviewTab('new');
      } else if (res.duplicates.length > 0) {
        setActivePreviewTab('duplicate');
      } else if (res.invalidRows.length > 0) {
        setActivePreviewTab('invalid');
      }
    } catch (err) {
      setImportResult({
        success: false,
        totalRows: 0,
        newTransactions: [],
        duplicates: [],
        invalidRows: [],
        errorMessage: '檔案讀取發生未預期錯誤，請檢查檔案格式。'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.newTransactions.length === 0) return;
    onImportSuccess(importResult.newTransactions, {
      added: importResult.newTransactions.length,
      duplicates: importResult.duplicates.length
    });
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="data-import-modal-panel"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-6 transition-all"
      >
        {/* Modal 標題列 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Upload className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <span>帳務資料匯入</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  智慧防重複比對
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                支援 Excel 試算表上傳，自動比對現有帳本，重複項目自動排除
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            title="關閉視窗 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* 核心防重複說明卡片 */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-amber-950">
                💡 支援斷點續傳防重複機制
              </span>
              <p className="text-amber-800/90 leading-relaxed">
                若先前匯出或匯入時曾因故中斷、或部分資料已存在資料庫中，再次匯入相同檔案時，系統會自動檢核並略過已登記項目，<strong className="text-amber-950 underline">只會將尚未登記的全新資料加入資料庫</strong>，絕不重複記帳！
              </p>
            </div>
          </div>

          {/* 步驟 1：下載範本 */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-bold text-stone-800 block">第一步：下載空白記帳匯入範本</span>
                <span className="text-[11px] text-stone-500">提供標準欄位標題、填寫說明與參考範例</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-300 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下載空白範本 (.xlsx)</span>
            </button>
          </div>

          {/* 步驟 2：上傳檔案 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-stone-800">第二步：上傳填妥之試算表檔案</span>
              {file && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>重新選擇檔案</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-sky-500 bg-sky-50/60'
                    : 'border-stone-300 hover:border-sky-400 bg-stone-50/50 hover:bg-white'
                }`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-stone-800">
                  點擊選擇檔案 或 將 Excel 檔案拖曳至此處
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  支援格式：.xlsx, .xls, .csv
                </p>
              </div>
            ) : (
              <div className="p-3 bg-stone-100/70 rounded-xl border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="text-xs font-bold text-stone-800 truncate">{file.name}</span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                {isProcessing && (
                  <div className="flex items-center gap-1.5 text-xs text-sky-600 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在進行防重複檢視...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 步驟 3：檢核預覽與防重複分析 */}
          {importResult && (
            <div className="space-y-3 pt-1">
              {!importResult.success ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">匯入失敗：</span>
                    <span>{importResult.errorMessage}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* 統計指標方塊 */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* 綠色：即將新增 */}
                    <div
                      onClick={() => setActivePreviewTab('new')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        activePreviewTab === 'new'
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-400'
                          : 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>即將新增</span>
                        </span>
                        <ChevronRight className="w-3 h-3 text-emerald-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
                        {importResult.newTransactions.length}
                        <span className="text-xs font-normal text-emerald-700 ml-1">筆</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">全新待寫入明細</div>
                    </div>

                    {/* 橘色：排除重複 */}
                    <div
                      onClick={() => setActivePreviewTab('duplicate')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        activePreviewTab === 'duplicate'
                          ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-400'
                          : 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>自動排除重複</span>
                        </span>
                        <ChevronRight className="w-3 h-3 text-amber-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-amber-800 mt-1">
                        {importResult.duplicates.length}
                        <span className="text-xs font-normal text-amber-700 ml-1">筆</span>
                      </div>
                      <div className="text-[10px] text-amber-700 mt-0.5">已存在，自動略過</div>
                    </div>

                    {/* 紅色：格式異常 */}
                    <div
                      onClick={() => setActivePreviewTab('invalid')}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        activePreviewTab === 'invalid'
                          ? 'border-rose-500 bg-rose-50/70 shadow-xs ring-1 ring-rose-400'
                          : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          <span>格式異常</span>
                        </span>
                        <ChevronRight className="w-3 h-3 text-stone-400" />
                      </div>
                      <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                        {importResult.invalidRows.length}
                        <span className="text-xs font-normal text-rose-600 ml-1">筆</span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5">缺少必填欄位</div>
                    </div>
                  </div>

                  {/* 標籤切換預覽清單 */}
                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-stone-50 px-3.5 py-2 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">
                        {activePreviewTab === 'new' && `即將寫入之全新資料 (${importResult.newTransactions.length} 筆)`}
                        {activePreviewTab === 'duplicate' && `已自動排除之重複項目 (${importResult.duplicates.length} 筆)`}
                        {activePreviewTab === 'invalid' && `格式不符無法匯入項目 (${importResult.invalidRows.length} 筆)`}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        總讀取 {importResult.totalRows} 列
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 text-xs">
                      {/* 1. 即將新增 */}
                      {activePreviewTab === 'new' && (
                        importResult.newTransactions.length === 0 ? (
                          <div className="p-4 text-center text-stone-400">
                            檔案中無任何全新資料（可能檔案內的所有項目均已存在於資料庫中）
                          </div>
                        ) : (
                          importResult.newTransactions.map((tx, idx) => (
                            <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-emerald-50/30">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="font-mono text-stone-500 shrink-0">{tx.date}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  tx.type === 'expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {tx.type === 'expense' ? '支出' : '撥補'}
                                </span>
                                <span className="font-bold text-stone-800 truncate">{tx.subItem}</span>
                                {tx.claimant && (
                                  <span className="text-stone-400 text-[11px] truncate">({tx.claimant})</span>
                                )}
                              </div>
                              <div className="font-mono font-bold text-stone-900 shrink-0">
                                NT$ {tx.amount.toLocaleString()}
                              </div>
                            </div>
                          ))
                        )
                      )}

                      {/* 2. 排除重複 */}
                      {activePreviewTab === 'duplicate' && (
                        importResult.duplicates.length === 0 ? (
                          <div className="p-4 text-center text-stone-400">
                            太棒了！上傳檔案中無任何重複資料。
                          </div>
                        ) : (
                          importResult.duplicates.map((dup, idx) => (
                            <div key={idx} className="p-2.5 flex items-start justify-between hover:bg-amber-50/40">
                              <div className="space-y-0.5 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-stone-500">第 {dup.rowNumber} 列</span>
                                  <span className="font-bold text-stone-800">{dup.date} - {dup.subItem}</span>
                                  <span className="font-mono text-amber-900 font-bold">NT$ {dup.amount.toLocaleString()}</span>
                                </div>
                                <div className="text-[11px] text-amber-700 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 shrink-0" />
                                  <span>{dup.reason}</span>
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold shrink-0">
                                已略過
                              </span>
                            </div>
                          ))
                        )
                      )}

                      {/* 3. 異常格式 */}
                      {activePreviewTab === 'invalid' && (
                        importResult.invalidRows.length === 0 ? (
                          <div className="p-4 text-center text-stone-400">
                            所有資料列格式均完全正確。
                          </div>
                        ) : (
                          importResult.invalidRows.map((inv, idx) => (
                            <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-rose-50/30">
                              <div>
                                <span className="font-mono text-stone-500 font-bold mr-2">第 {inv.rowNumber} 列</span>
                                <span className="text-rose-700 font-medium">{inv.reason}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                                格式錯誤
                              </span>
                            </div>
                          ))
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal 底部操作按鈕 */}
        <div className="px-5 py-3.5 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-medium text-xs transition-colors cursor-pointer"
          >
            取消
          </button>

          <button
            type="button"
            disabled={!importResult || importResult.newTransactions.length === 0}
            onClick={handleConfirmImport}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              importResult && importResult.newTransactions.length > 0
                ? 'bg-sky-600 hover:bg-sky-700 text-white active:scale-98'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {importResult && importResult.newTransactions.length > 0
                ? `確認匯入 ${importResult.newTransactions.length} 筆全新資料`
                : '請先上傳包含新資料的試算表'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
