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
  Info,
  Plus,
  Trash2,
  Copy,
  Calendar,
  ClipboardPaste,
  Sparkles,
  Table as TableIcon,
  Check,
  HelpCircle
} from 'lucide-react';
import { Transaction, CategoryConfig, ReceiptType, TransactionType } from '../types';
import {
  generateBlankImportTemplate,
  parseAndValidateImportFile,
  normalizeDateString,
  exportImportGridToExcel,
  decodeCsvBuffer,
  isMyMoneyCsvText,
  parseMyMoneyCsvText,
  exportToMyMoneyCsv,
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

interface TableRowItem {
  id: string;
  voucherNo?: string; // 系統加工後傳票號碼 (方案 A: P2026090714-0001)
  rawVoucherId?: string; // 帳務小管家原生傳票號碼 (例如 P20260907142530123)
  date: string;
  dateInput: string;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  subItem: string;
  amount: string;
  claimant: string;
  receiptType: ReceiptType;
  invoiceNumber: string;
  peopleCount: string;
  note: string;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  existingTransactions,
  categories,
  claimants,
  onImportSuccess
}) => {
  // 模式切換：'table' (線上表格化多筆輸入) 或 'upload' (Excel 檔案上傳)
  const [activeMode, setActiveMode] = useState<'table' | 'upload'>('table');

  // Excel 檔案上傳狀態
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<'new' | 'duplicate' | 'invalid'>('new');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 表格快速貼上彈跳視窗狀態
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');

  // 帳務小管家 (MyMoney) 匯入狀態
  const [myMoneyBanner, setMyMoneyBanner] = useState<{
    count: number;
    message: string;
  } | null>(null);
  const myMoneyInputRef = useRef<HTMLInputElement | null>(null);

  // 取得今日標準西元日期
  const getTodayDate = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 產生新空白列的輔助函數
  const createBlankRow = (initialDate?: string): TableRowItem => {
    const today = initialDate || getTodayDate();
    const firstCat = categories[0] || { id: 'dining', name: '餐費' };
    const defaultClaimant = claimants[0] || '零用金管理員';

    return {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: today,
      dateInput: today,
      type: 'expense',
      categoryId: firstCat.id,
      categoryName: firstCat.name,
      subItem: '',
      amount: '',
      claimant: defaultClaimant,
      receiptType: 'invoice',
      invoiceNumber: '',
      peopleCount: '',
      note: ''
    };
  };

  // 線上多筆表格輸入列狀態 (初始提供 3 列方便直接輸入)
  const [tableRows, setTableRows] = useState<TableRowItem[]>([
    createBlankRow(),
    createBlankRow(),
    createBlankRow()
  ]);

  if (!isOpen) return null;

  // 下載標準空白 Excel 範本 (含原生的 Excel 清單下拉選單功能與日期格式化)
  const handleDownloadTemplate = () => {
    generateBlankImportTemplate(categories, claimants);
  };

  // -------------------------------------------------------------
  // 線上表格多筆操作處理函數
  // -------------------------------------------------------------
  const handleAddRow = () => {
    const lastDate = tableRows.length > 0 ? tableRows[tableRows.length - 1].date : getTodayDate();
    setTableRows((prev) => [...prev, createBlankRow(lastDate)]);
  };

  const handleAddMultipleRows = (count: number = 5) => {
    const lastDate = tableRows.length > 0 ? tableRows[tableRows.length - 1].date : getTodayDate();
    const newItems: TableRowItem[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push(createBlankRow(lastDate));
    }
    setTableRows((prev) => [...prev, ...newItems]);
  };

  const handleDuplicateRow = (rowId: string) => {
    const index = tableRows.findIndex((r) => r.id === rowId);
    if (index === -1) return;
    const target = tableRows[index];
    const duplicated: TableRowItem = {
      ...target,
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    };
    const updated = [...tableRows];
    updated.splice(index + 1, 0, duplicated);
    setTableRows(updated);
  };

  const handleDeleteRow = (rowId: string) => {
    if (tableRows.length <= 1) {
      // 至少保留一列，清空該列內容
      setTableRows([createBlankRow()]);
      return;
    }
    setTableRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleClearTable = () => {
    if (window.confirm('確定要清空目前表格中的所有資料嗎？')) {
      setTableRows([createBlankRow()]);
    }
  };

  // 帶入示範範例資料
  const handleLoadSampleData = () => {
    const today = getTodayDate();
    const sampleItems: TableRowItem[] = [
      {
        id: `sample-1-${Date.now()}`,
        date: today,
        dateInput: '9/7',
        type: 'expense',
        categoryId: 'dining',
        categoryName: '餐費',
        subItem: '池上便當 (工廠會議午餐)',
        amount: '950',
        claimant: claimants[0] || '陳小明',
        receiptType: 'invoice',
        invoiceNumber: 'AB-12345678',
        peopleCount: '10',
        note: '工廠生產線會議便當'
      },
      {
        id: `sample-2-${Date.now()}`,
        date: today,
        dateInput: '9/8',
        type: 'expense',
        categoryId: 'fuel',
        categoryName: '油資/交通',
        subItem: '台灣中油 (公務9人座出勤)',
        amount: '1200',
        claimant: claimants[1] || claimants[0] || '李大華',
        receiptType: 'invoice',
        invoiceNumber: 'CD-87654321',
        peopleCount: '',
        note: '公務車出勤加油'
      },
      {
        id: `sample-3-${Date.now()}`,
        date: today,
        dateInput: '9/9',
        type: 'income',
        categoryId: 'replenish',
        categoryName: '零用金撥補',
        subItem: '公司銀行帳戶常態撥補',
        amount: '20000',
        claimant: '零用金管理員',
        receiptType: 'none',
        invoiceNumber: '',
        peopleCount: '',
        note: '補足零用金安全水位'
      }
    ];

    // 標準化示範資料的日期
    const normalizedSamples = sampleItems.map((item) => {
      const norm = normalizeDateString(item.dateInput);
      return {
        ...item,
        date: norm || item.date,
        dateInput: norm || item.dateInput
      };
    });

    setTableRows(normalizedSamples);
  };

  // 單一欄位更新
  const updateRowField = <K extends keyof TableRowItem>(rowId: string, field: K, value: TableRowItem[K]) => {
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const updated = { ...row, [field]: value };

        // 當收支屬性切換時連動分類與憑證
        if (field === 'type') {
          if (value === 'income') {
            updated.categoryId = 'replenish';
            updated.categoryName = '零用金撥補';
            updated.receiptType = 'none';
          } else {
            const firstCat = categories[0] || { id: 'dining', name: '餐費' };
            updated.categoryId = firstCat.id;
            updated.categoryName = firstCat.name;
          }
        }

        // 當類別切換時同步更新 categoryName
        if (field === 'categoryId') {
          const matched = categories.find((c) => c.id === value);
          if (matched) {
            updated.categoryName = matched.name;
          }
        }

        return updated;
      })
    );
  };

  // 日期文字輸入失焦 (onBlur) 智慧格式化：輸入 9/7 自動轉 2026-09-07
  const handleDateInputBlur = (rowId: string) => {
    setTableRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const normalized = normalizeDateString(row.dateInput);
        if (normalized) {
          return {
            ...row,
            date: normalized,
            dateInput: normalized
          };
        }
        return row;
      })
    );
  };

  // 快速設定當列日期
  const handleQuickSetDate = (rowId: string, type: 'today' | 'yesterday' | 'sameAsPrev') => {
    setTableRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx === -1) return prev;

      let targetDate = getTodayDate();
      if (type === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        targetDate = d.toISOString().slice(0, 10);
      } else if (type === 'sameAsPrev') {
        if (idx > 0) {
          targetDate = prev[idx - 1].date;
        }
      }

      return prev.map((r, i) =>
        i === idx ? { ...r, date: targetDate, dateInput: targetDate } : r
      );
    });
  };

  // 讀取並載入「帳務小管家 (MyMoney)」CSV 檔案
  const handleMyMoneyFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      const arrayBuffer = await selectedFile.arrayBuffer();
      const decodedText = decodeCsvBuffer(arrayBuffer);

      if (!isMyMoneyCsvText(decodedText)) {
        alert('所選檔案內容似乎不是「帳務小管家 (MyMoney)」標準匯出之 CSV 檔案，請檢查檔案內容。');
        return;
      }

      const parsedList = parseMyMoneyCsvText(decodedText, categories, claimants);

      if (parsedList.length === 0) {
        alert('在檔案中未辨識出任何零用金傳票記錄。');
        return;
      }

      // 轉換為線上表格列格式
      const convertedRows: TableRowItem[] = parsedList.map((item) => ({
        id: item.voucherId || `mymoney-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        voucherNo: item.voucherId,
        rawVoucherId: item.rawVoucherId,
        date: item.date,
        dateInput: item.date,
        type: item.type,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        subItem: item.subItem,
        amount: String(item.amount),
        claimant: item.claimant || claimants[0] || '零用金管理員',
        receiptType: item.receiptType,
        invoiceNumber: item.invoiceNumber || '',
        peopleCount: item.peopleCount ? String(item.peopleCount) : '',
        note: item.note || ''
      }));

      setTableRows(convertedRows);
      setActiveMode('table');
      setMyMoneyBanner({
        count: convertedRows.length,
        message: `🎉 已成功由「帳務小管家」讀入 ${convertedRows.length} 筆零用金收支傳票！系統已為您完成傳票借貸自動合併與分類語意智能對應。您可直接在下方表格檢視、以選單微調，確認無誤後點擊右下角「確認寫入系統帳本」。`
      });
    } catch (err: any) {
      alert(`解析帳務小管家檔案時發生錯誤：${err?.message || String(err)}`);
    } finally {
      setIsProcessing(false);
      if (myMoneyInputRef.current) myMoneyInputRef.current.value = '';
    }
  };

  // 解析來自剪貼簿的整批試算表文字 (Tab-delimited 或 帳務小管家 CSV)
  const handleApplyPasteText = () => {
    if (!pasteText.trim()) return;

    // 若貼上的是帳務小管家格式文字 (含 "4", 或 P20... 傳票)
    if (isMyMoneyCsvText(pasteText)) {
      const parsedList = parseMyMoneyCsvText(pasteText, categories, claimants);
      if (parsedList.length > 0) {
        const convertedRows: TableRowItem[] = parsedList.map((item) => ({
          id: item.voucherId || `mymoney-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          voucherNo: item.voucherId,
          rawVoucherId: item.rawVoucherId,
          date: item.date,
          dateInput: item.date,
          type: item.type,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          subItem: item.subItem,
          amount: String(item.amount),
          claimant: item.claimant || claimants[0] || '零用金管理員',
          receiptType: item.receiptType,
          invoiceNumber: item.invoiceNumber || '',
          peopleCount: item.peopleCount ? String(item.peopleCount) : '',
          note: item.note || ''
        }));

        setTableRows((prev) => {
          if (prev.length <= 1 && !prev[0]?.subItem && !prev[0]?.amount) {
            return convertedRows;
          }
          return [...prev, ...convertedRows];
        });

        setMyMoneyBanner({
          count: convertedRows.length,
          message: `🎉 已由貼上文字成功辨識並轉換 ${convertedRows.length} 筆「帳務小管家」傳票！系統已自動對齊分類與借貸金額。`
        });
        setPasteText('');
        setShowPasteModal(false);
        return;
      }
    }

    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedRows: TableRowItem[] = [];

    lines.forEach((line) => {
      const cols = line.split('\t').map((c) => c.trim());
      // 略過表頭行
      if (cols[0]?.includes('日期') || cols[1]?.includes('收支') || cols[0]?.startsWith('【')) {
        return;
      }

      const rawDate = cols[0] || '';
      const rawType = cols[1] || '支出';
      const rawCat = cols[2] || '';
      const rawSub = cols[3] || '';
      const rawAmt = cols[4] || '';
      const rawClm = cols[5] || '';
      const rawRec = cols[6] || '';
      const rawInv = cols[7] || '';
      const rawPpl = cols[8] || '';
      const rawNote = cols[9] || '';

      const normDate = normalizeDateString(rawDate) || getTodayDate();
      const isIncome = rawType.includes('撥補') || rawType.includes('收入');

      let catId = 'misc';
      let catName = '其他雜支';
      if (isIncome) {
        catId = 'replenish';
        catName = '零用金撥補';
      } else {
        const matched = categories.find((c) => c.name.includes(rawCat) || rawCat.includes(c.name));
        if (matched) {
          catId = matched.id;
          catName = matched.name;
        }
      }

      let receipt: ReceiptType = 'none';
      if (rawRec.includes('發票') || rawInv) receipt = 'invoice';
      else if (rawRec.includes('收據')) receipt = 'receipt';

      parsedRows.push({
        id: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: normDate,
        dateInput: normDate,
        type: isIncome ? 'income' : 'expense',
        categoryId: catId,
        categoryName: catName,
        subItem: rawSub,
        amount: rawAmt.replace(/[^0-9]/g, ''),
        claimant: rawClm || claimants[0] || '零用金管理員',
        receiptType: receipt,
        invoiceNumber: rawInv,
        peopleCount: rawPpl ? rawPpl.replace(/[^0-9]/g, '') : '',
        note: rawNote
      });
    });

    if (parsedRows.length > 0) {
      setTableRows((prev) => {
        // 如果目前表格只有一筆空白列，直接替換
        if (prev.length === 1 && !prev[0].subItem && !prev[0].amount) {
          return parsedRows;
        }
        return [...prev, ...parsedRows];
      });
      setPasteText('');
      setShowPasteModal(false);
    } else {
      alert('無法解析貼上之資料，請確認是否由 Excel 複製整列儲存格。');
    }
  };

  // 線上表格即時計算數據
  const validRows = tableRows.filter((r) => {
    const amt = parseInt(r.amount, 10);
    return r.date && r.subItem.trim() && !isNaN(amt) && amt > 0;
  });

  const totalExpenseSum = validRows
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + parseInt(r.amount, 10), 0);

  const totalIncomeSum = validRows
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + parseInt(r.amount, 10), 0);

  // 匯出線上表格至 Excel
  const handleExportGridToExcel = () => {
    if (validRows.length === 0) {
      alert('目前表格中尚無任何填妥之有效資料列可匯出。');
      return;
    }
    exportImportGridToExcel(
      validRows.map((r) => ({
        date: r.date,
        type: r.type,
        categoryName: r.categoryName,
        subItem: r.subItem.trim(),
        amount: parseInt(r.amount, 10),
        claimant: r.claimant,
        receiptType: r.receiptType,
        invoiceNumber: r.invoiceNumber,
        peopleCount: r.peopleCount ? parseInt(r.peopleCount, 10) : undefined,
        note: r.note
      }))
    );
  };

  // 確認寫入線上表格資料（含防重複比對）
  const handleConfirmTableImport = () => {
    if (validRows.length === 0) {
      alert('請至少填妥一筆具有完整「日期」、「店家/品項/細項」以及「金額」的資料列。');
      return;
    }

    // 防重複比對索引
    const existingFingerprints = new Set<string>();
    existingTransactions.forEach((t) => {
      const key = `${t.date.trim()}|${t.type.trim()}|${Math.round(t.amount)}|${t.subItem.trim().toLowerCase()}|${(t.claimant || '').trim()}`;
      existingFingerprints.add(key);
    });

    const inBatchFingerprints = new Set<string>();
    const newTransactionsToAdd: Transaction[] = [];
    let duplicateCount = 0;

    validRows.forEach((r) => {
      const amt = parseInt(r.amount, 10);
      const key = `${r.date.trim()}|${r.type.trim()}|${amt}|${r.subItem.trim().toLowerCase()}|${r.claimant.trim()}`;

      if (existingFingerprints.has(key) || inBatchFingerprints.has(key)) {
        duplicateCount++;
        return;
      }

      inBatchFingerprints.add(key);

      newTransactionsToAdd.push({
        id: r.voucherNo || `tx-grid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        voucherNo: r.voucherNo,
        rawVoucherId: r.rawVoucherId,
        date: r.date,
        type: r.type,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        subItem: r.subItem.trim(),
        amount: amt,
        claimant: r.claimant || claimants[0] || '零用金管理員',
        receiptType: r.receiptType,
        invoiceNumber: r.invoiceNumber.trim() || undefined,
        peopleCount: r.peopleCount ? parseInt(r.peopleCount, 10) : undefined,
        note: r.note.trim() || undefined,
        createdAt: Date.now()
      });
    });

    if (newTransactionsToAdd.length === 0) {
      alert('所填寫的資料皆已存在於帳本中（已自動防重複略過），無新增項目。');
      return;
    }

    onImportSuccess(newTransactionsToAdd, {
      added: newTransactionsToAdd.length,
      duplicates: duplicateCount
    });

    onClose();
  };

  // -------------------------------------------------------------
  // Excel 檔案上傳處理函數
  // -------------------------------------------------------------
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

  const handleResetFile = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmFileImport = () => {
    if (!importResult || importResult.newTransactions.length === 0) return;
    onImportSuccess(importResult.newTransactions, {
      added: importResult.newTransactions.length,
      duplicates: importResult.duplicates.length
    });
    handleResetFile();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="data-import-modal-panel"
        className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[92vh] transition-all"
      >
        {/* Modal 標題列 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 bg-stone-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Upload className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-stone-900">
                  帳務資料多筆快速匯入
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  智慧防重複檢視
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                支援「線上表格選單點選」與「Excel 試算表上傳」，自動排除重複項目
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 模式切換標籤 */}
            <div className="bg-stone-200/80 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'table'
                    ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>線上表格快速輸入 (推薦)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'upload'
                    ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel 檔案上傳</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
              title="關閉視窗 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 常用品項提示 datalist */}
        <datalist id="quick-subitem-suggestions">
          <option value="池上便當 (工廠會議午餐)" />
          <option value="悟饕便當 (加班晚餐)" />
          <option value="麥當勞 (加班點心)" />
          <option value="台灣中油 (公務車加油)" />
          <option value="全國加油站 (公務車加油)" />
          <option value="台亞石油" />
          <option value="高鐵車票 (客戶出差)" />
          <option value="計程車資 (急件拜訪)" />
          <option value="日日新五金 (水電管線零件)" />
          <option value="影印紙/原子筆 (行政耗材)" />
          <option value="桶裝飲用水/茶包" />
          <option value="公司銀行帳戶提領撥補" />
        </datalist>

        {/* Modal 主體內容 */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* ======================================================= */}
          {/* 模式 1：線上表格化多筆快速輸入 */}
          {/* ======================================================= */}
          {activeMode === 'table' && (
            <div className="space-y-3">
              {/* 人性化提示橫幅 */}
              <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200 flex items-start justify-between gap-3 text-xs text-sky-900">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block text-sky-950">
                      ⚡ 表格化人性化輸入模式（滑鼠點選、選單限制與自動轉換）
                    </span>
                    <p className="text-sky-800 leading-relaxed">
                      ・<strong>收支屬性</strong>：使用下拉選單嚴格限制「支出」或「撥補」，避免手寫打錯。<br />
                      ・<strong>智慧日期</strong>：日期欄位直接輸入「<span className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-sky-300">9/7</span>」或「<span className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-sky-300">09/07</span>」，失焦後系統立即秒轉標準格式「<span className="font-mono font-bold">2026-09-07</span>」，絕不報錯！<br />
                      ・<strong>快速操作</strong>：支援「複製整列」、「Excel 複製直接貼上」與「多列批量新增」。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-100 text-sky-800 font-bold text-xs border border-sky-300 shadow-2xs transition-all cursor-pointer"
                    title="若希望在 Excel 中填寫後再上傳，可下載標準範本"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下載空白 Excel 範本</span>
                  </button>
                </div>
              </div>

              {/* 工具列 */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新增 1 列</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddMultipleRows(5)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-stone-500" />
                    <span>+5 列</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddMultipleRows(10)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-stone-500" />
                    <span>+10 列</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasteModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium border border-stone-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="從 Excel 複製多行儲存格後整批貼上"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-stone-500" />
                    <span>從 Excel 貼上</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium border border-amber-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="帶入便當、油資、撥補之範例資料以供參考"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>帶入示範資料</span>
                  </button>

                  {/* 帳務小管家 (MyMoney) 專用功能按鈕 */}
                  <button
                    type="button"
                    onClick={() => myMoneyInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="點擊選取「帳務小管家」匯出的 CSV 檔案，自動載入並轉為線上表格"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>📁 匯入帳務小管家 CSV</span>
                  </button>
                  <input
                    ref={myMoneyInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleMyMoneyFileSelect}
                  />

                  <button
                    type="button"
                    onClick={() => exportToMyMoneyCsv(existingTransactions)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium border border-stone-300 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="將系統內零用金帳務明細匯出為帳務小管家相容的 CSV 檔案，可直接於帳務小管家匯入"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-600" />
                    <span>匯出帳務小管家相容 CSV</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportGridToExcel}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-600 text-xs border border-stone-300 shadow-2xs transition-all cursor-pointer"
                    title="將目前填寫的表格另存為 Excel 試算表檔"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>匯出目前表格 (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearTable}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors cursor-pointer"
                    title="清空表格所有資料"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空表格</span>
                  </button>
                </div>
              </div>

              {/* 帳務小管家匯入完成提示橫幅 */}
              {myMoneyBanner && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start justify-between gap-3 text-xs text-emerald-900 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-emerald-950">
                        🎉 成功載入 {myMoneyBanner.count} 筆帳務小管家傳票資料
                      </span>
                      <p className="text-emerald-800 leading-relaxed">
                        {myMoneyBanner.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMyMoneyBanner(null)}
                    className="text-emerald-600 hover:text-emerald-800 p-1 text-sm cursor-pointer"
                    title="關閉提示"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 線上表格實體 */}
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-xs text-left border-collapse min-w-[980px]">
                    <thead className="bg-stone-100/90 text-stone-700 sticky top-0 z-10 border-b border-stone-200 select-none">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-10 font-bold">#</th>
                        <th className="py-2.5 px-2 w-28 font-bold">
                          <span>收支屬性</span>
                          <span className="text-rose-500 ml-0.5">*</span>
                        </th>
                        <th className="py-2.5 px-2 w-36 font-bold">
                          <span>交易日期</span>
                          <span className="text-rose-500 ml-0.5">*</span>
                        </th>
                        <th className="py-2.5 px-2 w-32 font-bold">支出大類</th>
                        <th className="py-2.5 px-2 min-w-[180px] font-bold">
                          <span>店家 / 品項 / 細項</span>
                          <span className="text-rose-500 ml-0.5">*</span>
                        </th>
                        <th className="py-2.5 px-2 w-28 font-bold">
                          <span>金額 (NT$)</span>
                          <span className="text-rose-500 ml-0.5">*</span>
                        </th>
                        <th className="py-2.5 px-2 w-28 font-bold">請領同仁</th>
                        <th className="py-2.5 px-2 w-28 font-bold">憑證類型</th>
                        <th className="py-2.5 px-2 w-28 font-bold">發票號碼</th>
                        <th className="py-2.5 px-2 w-16 font-bold text-center">人數</th>
                        <th className="py-2.5 px-2 w-36 font-bold">備註說明</th>
                        <th className="py-2.5 px-2 text-center w-16 font-bold">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {tableRows.map((row, index) => {
                        const isIncome = row.type === 'income';
                        const isRowComplete =
                          row.date && row.subItem.trim() && parseInt(row.amount, 10) > 0;

                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-sky-50/20 transition-colors ${
                              !isRowComplete && (row.subItem || row.amount)
                                ? 'bg-amber-50/30'
                                : ''
                            }`}
                          >
                            {/* 序號 */}
                            <td className="py-2 px-2 text-center text-stone-400 font-mono text-[11px]">
                              {index + 1}
                            </td>

                            {/* 收支屬性 (強制下拉選單，僅支出或撥補) */}
                            <td className="py-2 px-2">
                              <select
                                value={row.type}
                                onChange={(e) =>
                                  updateRowField(
                                    row.id,
                                    'type',
                                    e.target.value as TransactionType
                                  )
                                }
                                className={`w-full py-1.5 px-2 rounded-lg font-bold text-xs border focus:ring-1 focus:ring-sky-500 focus:outline-hidden cursor-pointer ${
                                  isIncome
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <option value="expense">支出 (開銷)</option>
                                <option value="income">撥補 (入帳)</option>
                              </select>
                            </td>

                            {/* 交易日期 (支援直接鍵入 9/7 自動轉為 2026-09-07，亦支援月曆選取) */}
                            <td className="py-2 px-2">
                              <div className="space-y-1">
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    value={row.dateInput}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateRowField(row.id, 'dateInput', val);
                                      const normalized = normalizeDateString(val);
                                      if (normalized) {
                                        updateRowField(row.id, 'date', normalized);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleDateInputBlur(row.id);
                                      }
                                    }}
                                    onBlur={() => handleDateInputBlur(row.id)}
                                    placeholder="如 9/7 或 2026-09-07"
                                    className="w-full py-1 px-2 text-xs font-mono font-medium rounded-lg border border-stone-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden bg-white"
                                    title="支援直接輸入 9/7、0907 或西元年月日，按 Enter 或失焦立即轉為標準 2026-09-07"
                                  />
                                  <input
                                    type="date"
                                    value={row.date}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        updateRowField(row.id, 'date', e.target.value);
                                        updateRowField(row.id, 'dateInput', e.target.value);
                                      }
                                    }}
                                    className="absolute right-1 w-5 h-5 opacity-40 hover:opacity-100 cursor-pointer"
                                    title="點擊開啟月曆小幫手"
                                  />
                                </div>
                                {row.dateInput && row.date && row.dateInput !== row.date && (
                                  <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                    <span>✓ 自動轉換為</span>
                                    <span className="font-mono font-bold">{row.date}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-stone-400">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSetDate(row.id, 'today')}
                                    className="hover:text-sky-700 hover:underline cursor-pointer"
                                  >
                                    今天
                                  </button>
                                  <span>·</span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSetDate(row.id, 'yesterday')}
                                    className="hover:text-sky-700 hover:underline cursor-pointer"
                                  >
                                    昨天
                                  </button>
                                  {index > 0 && (
                                    <>
                                      <span>·</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleQuickSetDate(row.id, 'sameAsPrev')
                                        }
                                        className="hover:text-sky-700 hover:underline cursor-pointer"
                                      >
                                        同上一筆
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 支出大類 / 主分類 */}
                            <td className="py-2 px-2">
                              {isIncome ? (
                                <input
                                  type="text"
                                  disabled
                                  value="零用金撥補"
                                  className="w-full py-1.5 px-2 rounded-lg bg-stone-100 text-stone-500 border border-stone-200 text-xs"
                                />
                              ) : (
                                <select
                                  value={row.categoryId}
                                  onChange={(e) =>
                                    updateRowField(row.id, 'categoryId', e.target.value)
                                  }
                                  className="w-full py-1.5 px-2 rounded-lg border border-stone-300 text-xs text-stone-800 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                                >
                                  {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                  <option value="misc">其他雜支</option>
                                </select>
                              )}
                            </td>

                            {/* 店家/品項/細項 (輸入框 + 常用提示) */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                list="quick-subitem-suggestions"
                                value={row.subItem}
                                onChange={(e) =>
                                  updateRowField(row.id, 'subItem', e.target.value)
                                }
                                placeholder={isIncome ? '如：銀行帳戶提領' : '如：池上便當、台灣中油'}
                                className="w-full py-1.5 px-2 rounded-lg border border-stone-300 text-xs text-stone-800 bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                              />
                            </td>

                            {/* 金額 */}
                            <td className="py-2 px-2">
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={row.amount}
                                  onChange={(e) =>
                                    updateRowField(row.id, 'amount', e.target.value)
                                  }
                                  placeholder="0"
                                  className="w-full py-1.5 px-2 text-right font-mono font-bold text-xs rounded-lg border border-stone-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden bg-white"
                                />
                              </div>
                            </td>

                            {/* 請領同仁 */}
                            <td className="py-2 px-2">
                              <select
                                value={row.claimant}
                                onChange={(e) =>
                                  updateRowField(row.id, 'claimant', e.target.value)
                                }
                                className="w-full py-1.5 px-1.5 rounded-lg border border-stone-300 text-xs text-stone-800 bg-white focus:border-sky-500 focus:outline-hidden cursor-pointer truncate"
                              >
                                {claimants.map((clm) => (
                                  <option key={clm} value={clm}>
                                    {clm}
                                  </option>
                                ))}
                                <option value="零用金管理員">零用金管理員</option>
                              </select>
                            </td>

                            {/* 憑證類型 */}
                            <td className="py-2 px-2">
                              <select
                                value={row.receiptType}
                                onChange={(e) =>
                                  updateRowField(
                                    row.id,
                                    'receiptType',
                                    e.target.value as ReceiptType
                                  )
                                }
                                className="w-full py-1.5 px-1.5 rounded-lg border border-stone-300 text-xs text-stone-800 bg-white focus:border-sky-500 focus:outline-hidden cursor-pointer"
                              >
                                <option value="invoice">🧾 發票</option>
                                <option value="receipt">📄 收據</option>
                                <option value="none">❌ 無</option>
                              </select>
                            </td>

                            {/* 發票號碼 */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                disabled={row.receiptType !== 'invoice'}
                                value={row.invoiceNumber}
                                onChange={(e) =>
                                  updateRowField(row.id, 'invoiceNumber', e.target.value)
                                }
                                placeholder={row.receiptType === 'invoice' ? 'AB-12345678' : '無'}
                                className={`w-full py-1.5 px-2 font-mono text-xs rounded-lg border focus:outline-hidden ${
                                  row.receiptType === 'invoice'
                                    ? 'bg-white border-stone-300 focus:border-sky-500'
                                    : 'bg-stone-100 text-stone-400 border-stone-200'
                                }`}
                              />
                            </td>

                            {/* 人數 */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={row.peopleCount}
                                onChange={(e) =>
                                  updateRowField(row.id, 'peopleCount', e.target.value)
                                }
                                placeholder="-"
                                className="w-full py-1.5 px-1 text-center font-mono text-xs rounded-lg border border-stone-300 focus:border-sky-500 focus:outline-hidden bg-white"
                                title="餐飲消費用餐人次，用於均攤計算"
                              />
                            </td>

                            {/* 備註說明 */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.note}
                                onChange={(e) =>
                                  updateRowField(row.id, 'note', e.target.value)
                                }
                                placeholder="備註事由"
                                className="w-full py-1.5 px-2 text-xs rounded-lg border border-stone-300 focus:border-sky-500 focus:outline-hidden bg-white"
                              />
                            </td>

                            {/* 操作按鈕 (複製整列 / 刪除) */}
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRow(row.id)}
                                  className="p-1 rounded text-stone-400 hover:text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
                                  title="複製此列資料並新增下一列"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="刪除此列"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 表格底部即時統計 Bar */}
                <div className="bg-stone-50 px-4 py-2.5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-stone-600">
                      總列數：<strong className="text-stone-900 font-mono">{tableRows.length}</strong> 列
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      合格可寫入：<strong className="font-mono">{validRows.length}</strong> 筆
                    </span>
                    <span className="text-rose-700">
                      支出合計：<strong className="font-mono font-bold">NT$ {totalExpenseSum.toLocaleString()}</strong>
                    </span>
                    <span className="text-emerald-700">
                      撥補合計：<strong className="font-mono font-bold">NT$ {totalIncomeSum.toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-400 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                    <span>日期直接鍵入「9/7」即自動轉「2026-09-07」</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 模式 2：Excel 檔案上傳匯入 */}
          {/* ======================================================= */}
          {activeMode === 'upload' && (
            <div className="space-y-4">
              {/* 核心防重複說明卡片 */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/70 flex items-start gap-3 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-amber-950">
                    💡 支援斷點續傳防重複機制 ＆「帳務小管家」CSV 一鍵無痛匯入
                  </span>
                  <p className="text-amber-800/90 leading-relaxed">
                    上傳一般 Excel 試算表或<strong>「帳務小管家 (MyMoney)」CSV 匯出檔</strong>，系統會自動解碼（支援 Big5 / ANSI）、自動合併借貸傳票與分類語意對應！若部分資料已登記在資料庫中，系統會自動檢視略過，<strong className="text-amber-950 underline">只會將尚未登記的全新資料加入資料庫</strong>，絕不重複記帳！
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
                    <span className="text-xs font-bold text-stone-800 block">
                      第一步：下載人性化空白記帳匯入範本
                    </span>
                    <span className="text-[11px] text-stone-500">
                      包含標準欄位、強制選單清單對照表與 9/7 快速日期範例
                    </span>
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
                  <span className="text-xs font-bold text-stone-800">
                    第二步：上傳填妥之試算表檔案
                  </span>
                  {file && (
                    <button
                      type="button"
                      onClick={handleResetFile}
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
                    className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
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
                      支援格式：.xlsx, .xls, .csv (支援日期 9/7 簡寫自動辨識)
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
                          <div className="text-[10px] text-stone-500 mt-0.5">缺少必填或日期錯誤</div>
                        </div>
                      </div>

                      {/* 標籤切換預覽清單 */}
                      <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                        <div className="bg-stone-50 px-3.5 py-2 border-b border-stone-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-800">
                            {activePreviewTab === 'new' &&
                              `即將寫入之全新資料 (${importResult.newTransactions.length} 筆)`}
                            {activePreviewTab === 'duplicate' &&
                              `已自動排除之重複項目 (${importResult.duplicates.length} 筆)`}
                            {activePreviewTab === 'invalid' &&
                              `格式不符無法匯入項目 (${importResult.invalidRows.length} 筆)`}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            總讀取 {importResult.totalRows} 列
                          </span>
                        </div>

                        <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 text-xs">
                          {/* 1. 即將新增 */}
                          {activePreviewTab === 'new' &&
                            (importResult.newTransactions.length === 0 ? (
                              <div className="p-4 text-center text-stone-400">
                                檔案中無任何全新資料（可能檔案內的所有項目均已存在於資料庫中）
                              </div>
                            ) : (
                              importResult.newTransactions.map((tx, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 flex items-center justify-between hover:bg-emerald-50/30"
                                >
                                  <div className="flex items-center gap-2 truncate pr-2">
                                    <span className="font-mono text-stone-500 shrink-0">
                                      {tx.date}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        tx.type === 'expense'
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {tx.type === 'expense' ? '支出' : '撥補'}
                                    </span>
                                    <span className="font-bold text-stone-800 truncate">
                                      {tx.subItem}
                                    </span>
                                    {tx.claimant && (
                                      <span className="text-stone-400 text-[11px] truncate">
                                        ({tx.claimant})
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono font-bold text-stone-900 shrink-0">
                                    NT$ {tx.amount.toLocaleString()}
                                  </div>
                                </div>
                              ))
                            ))}

                          {/* 2. 排除重複 */}
                          {activePreviewTab === 'duplicate' &&
                            (importResult.duplicates.length === 0 ? (
                              <div className="p-4 text-center text-stone-400">
                                太棒了！上傳檔案中無任何重複資料。
                              </div>
                            ) : (
                              importResult.duplicates.map((dup, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 flex items-start justify-between hover:bg-amber-50/40"
                                >
                                  <div className="space-y-0.5 pr-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-stone-500">
                                        第 {dup.rowNumber} 列
                                      </span>
                                      <span className="font-bold text-stone-800">
                                        {dup.date} - {dup.subItem}
                                      </span>
                                      <span className="font-mono text-amber-900 font-bold">
                                        NT$ {dup.amount.toLocaleString()}
                                      </span>
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
                            ))}

                          {/* 3. 異常格式 */}
                          {activePreviewTab === 'invalid' &&
                            (importResult.invalidRows.length === 0 ? (
                              <div className="p-4 text-center text-stone-400">
                                所有資料列格式均完全正確。
                              </div>
                            ) : (
                              importResult.invalidRows.map((inv, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 flex items-center justify-between hover:bg-rose-50/30"
                                >
                                  <div>
                                    <span className="font-mono text-stone-500 font-bold mr-2">
                                      第 {inv.rowNumber} 列
                                    </span>
                                    <span className="text-rose-700 font-medium">{inv.reason}</span>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                                    格式錯誤
                                  </span>
                                </div>
                              ))
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal 底部按鈕操作區 */}
        <div className="px-5 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-medium text-xs transition-colors cursor-pointer"
          >
            取消
          </button>

          {activeMode === 'table' ? (
            <button
              type="button"
              disabled={validRows.length === 0}
              onClick={handleConfirmTableImport}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                validRows.length > 0
                  ? 'bg-sky-600 hover:bg-sky-700 text-white active:scale-98'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {validRows.length > 0
                  ? `確認寫入系統帳本 (${validRows.length} 筆合格資料)`
                  : '請先在表格中填妥資料'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!importResult || importResult.newTransactions.length === 0}
              onClick={handleConfirmFileImport}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
                importResult && importResult.newTransactions.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
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
          )}
        </div>
      </div>

      {/* 剪貼簿快速貼上彈跳對話框 */}
      {showPasteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-sky-600" />
                <span>從 Excel 複製貼上資料</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              在 Excel、Google 試算表或<strong>「帳務小管家」CSV 匯出檔</strong>中複製資料內容，接著點擊下方輸入框按 <kbd className="font-mono px-1 py-0.5 bg-stone-100 border border-stone-300 rounded text-[11px]">Ctrl+V</kbd> 貼上，系統將自動解析（支援借貸傳票合併與智慧分類對應）並填入線上表格！
            </p>

            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="請在此處貼上來自 Excel 的儲存格或帳務小管家 CSV 文字內容..."
              className="w-full p-2.5 text-xs font-mono border border-stone-300 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-hidden bg-stone-50/50"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1.5 rounded-lg text-stone-600 hover:bg-stone-100 text-xs font-medium cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={handleApplyPasteText}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pasteText.trim()
                    ? 'bg-sky-600 hover:bg-sky-700 text-white'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                解析並加入表格
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
