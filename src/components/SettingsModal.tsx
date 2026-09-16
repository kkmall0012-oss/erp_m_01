import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  Utensils, 
  Fuel, 
  HandCoins, 
  PackageCheck,
  Check,
  RotateCcw,
  ShieldCheck,
  Coins,
  Car,
  Users,
  FolderPlus,
  AlertCircle
} from 'lucide-react';
import { CategoryConfig, DEFAULT_CATEGORIES, DEFAULT_CLAIMANTS, TransactionType } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryConfig[];
  onSaveCategories: (cats: CategoryConfig[]) => void;
  claimants: string[];
  onSaveClaimants: (claimants: string[]) => void;
  initialTab?: 'categories' | 'claimants';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  claimants,
  onSaveClaimants,
  initialTab = 'categories'
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'claimants'>(initialTab);
  const [localCategories, setLocalCategories] = useState<CategoryConfig[]>(categories);
  const [localClaimants, setLocalClaimants] = useState<string[]>(claimants);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || 'dining');
  
  // 子項目新增/編輯
  const [newSubItemName, setNewSubItemName] = useState<string>('');
  const [editingSubItem, setEditingSubItem] = useState<{ original: string; current: string } | null>(null);

  // 主分類編輯
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; subLabel: string } | null>(null);

  // 主分類新增
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatSubLabel, setNewCatSubLabel] = useState<string>('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatColor, setNewCatColor] = useState<string>('#f59e0b');

  // 請領人新增/編輯
  const [newClaimantName, setNewClaimantName] = useState<string>('');
  const [editingClaimant, setEditingClaimant] = useState<{ original: string; current: string } | null>(null);

  // 提示訊息
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 刪除確認彈窗狀態 (避免 iframe 阻擋 window.confirm)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmText?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // 當傳入的 props 改變或 modal 開啟時同步
  useEffect(() => {
    if (isOpen) {
      setLocalCategories(categories);
      setLocalClaimants(claimants);
      setActiveTab(initialTab);
      if (categories.length > 0 && !categories.some(c => c.id === activeCategoryId)) {
        setActiveCategoryId(categories[0].id);
      }
    }
  }, [isOpen, categories, claimants, initialTab]);

  if (!isOpen) return null;

  const currentCategory = localCategories.find((c) => c.id === activeCategoryId) || localCategories[0];

  // 即時更新分類並同步儲存
  const updateAndSaveCategories = (updated: CategoryConfig[]) => {
    setLocalCategories(updated);
    onSaveCategories(updated);
  };

  // 即時更新請領人並同步儲存
  const updateAndSaveClaimants = (updated: string[]) => {
    setLocalClaimants(updated);
    onSaveClaimants(updated);
  };

  // ==========================
  // 子項目 (店家/站點/來源) 處理
  // ==========================
  const handleAddSubItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubItemName.trim();
    if (!trimmed) return;

    if (currentCategory?.defaultSubItems.includes(trimmed)) {
      showToast(`「${trimmed}」已存在於選單中`);
      return;
    }

    const updated = localCategories.map((c) => {
      if (c.id === activeCategoryId) {
        return {
          ...c,
          defaultSubItems: [...c.defaultSubItems, trimmed]
        };
      }
      return c;
    });

    updateAndSaveCategories(updated);
    setNewSubItemName('');
    showToast(`已成功新增「${trimmed}」至【${currentCategory?.name}】選單`);
  };

  const handleDeleteSubItem = (itemToDelete: string) => {
    setConfirmState({
      isOpen: true,
      title: '確定要從下拉選單中刪除此項目？',
      description: (
        <div className="space-y-2 text-xs">
          <p>
            即將從【{currentCategory?.name}】選單移除：
            <strong className="text-stone-900 font-bold ml-1">「{itemToDelete}」</strong>
          </p>
          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
            ✓ 靜態快照存檔保證：過去已經記帳過的歷史紀錄與 Excel 報表均不受任何影響。
          </div>
        </div>
      ),
      confirmText: '確認從選單刪除',
      variant: 'danger',
      onConfirm: () => {
        const updated = localCategories.map((c) => {
          if (c.id === activeCategoryId) {
            return {
              ...c,
              defaultSubItems: c.defaultSubItems.filter((item) => item !== itemToDelete)
            };
          }
          return c;
        });
        updateAndSaveCategories(updated);
        showToast(`已從選單刪除「${itemToDelete}」`);
      }
    });
  };

  const handleSaveEditSubItem = () => {
    if (!editingSubItem || !editingSubItem.current.trim()) return;
    const trimmed = editingSubItem.current.trim();
    const updated = localCategories.map((c) => {
      if (c.id === activeCategoryId) {
        return {
          ...c,
          defaultSubItems: c.defaultSubItems.map((item) =>
            item === editingSubItem.original ? trimmed : item
          )
        };
      }
      return c;
    });
    updateAndSaveCategories(updated);
    setEditingSubItem(null);
    showToast(`已將「${editingSubItem.original}」更名為「${trimmed}」`);
  };

  // ==========================
  // 主分類處理 (新增、更名、刪除)
  // ==========================
  const handleCreateNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) return;

    const newId = `custom-cat-${Date.now()}`;
    const newCategory: CategoryConfig = {
      id: newId,
      name: trimmedName,
      type: newCatType,
      icon: 'PackageCheck',
      color: newCatColor,
      subLabel: newCatSubLabel.trim() || '項目名稱',
      defaultSubItems: [],
      hasPeopleCount: false
    };

    const updated = [...localCategories, newCategory];
    updateAndSaveCategories(updated);
    setActiveCategoryId(newId);
    setIsAddingCategory(false);
    setNewCatName('');
    setNewCatSubLabel('');
    showToast(`已成功建立新分類「${trimmedName}」！`);
  };

  const handleSaveEditCategory = () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    const updated = localCategories.map((c) => {
      if (c.id === editingCategory.id) {
        return {
          ...c,
          name: editingCategory.name.trim(),
          subLabel: editingCategory.subLabel.trim() || c.subLabel
        };
      }
      return c;
    });
    updateAndSaveCategories(updated);
    setEditingCategory(null);
    showToast(`分類已更新為「${editingCategory.name.trim()}」`);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (localCategories.length <= 1) {
      showToast('至少需保留一個主分類！');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: '確定要刪除此主分類？',
      description: (
        <div className="space-y-2 text-xs">
          <p>
            即將刪除主分類：
            <strong className="text-stone-900 font-bold ml-1">「{catName}」</strong>
          </p>
          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
            ✓ 靜態快照存檔保證：過去已經記帳過的「{catName}」明細與報表仍會完整保留。
          </div>
        </div>
      ),
      confirmText: '確認刪除主分類',
      variant: 'danger',
      onConfirm: () => {
        const updated = localCategories.filter((c) => c.id !== catId);
        updateAndSaveCategories(updated);
        setActiveCategoryId(updated[0].id);
        showToast(`已刪除「${catName}」主分類`);
      }
    });
  };

  // ==========================
  // 請領人處理 (新增、更名、刪除)
  // ==========================
  const handleAddClaimant = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClaimantName.trim();
    if (!trimmed) return;

    if (localClaimants.includes(trimmed)) {
      showToast(`「${trimmed}」已在常用請領人名冊中`);
      return;
    }

    const updated = [...localClaimants, trimmed];
    updateAndSaveClaimants(updated);
    setNewClaimantName('');
    showToast(`已新增常用請領人「${trimmed}」`);
  };

  const handleDeleteClaimant = (claimantToDelete: string) => {
    setConfirmState({
      isOpen: true,
      title: '確定要從常用請領人名冊移除？',
      description: (
        <div className="space-y-2 text-xs">
          <p>
            即將移除請領同仁：
            <strong className="text-stone-900 font-bold ml-1">「{claimantToDelete}」</strong>
          </p>
          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
            ✓ 靜態快照存檔保證：歷史記帳中的請領人姓名依然會永久保留，不會受到任何影響。
          </div>
        </div>
      ),
      confirmText: '確認移除同仁',
      variant: 'danger',
      onConfirm: () => {
        const updated = localClaimants.filter((c) => c !== claimantToDelete);
        updateAndSaveClaimants(updated);
        showToast(`已移除請領人「${claimantToDelete}」`);
      }
    });
  };

  const handleSaveEditClaimant = () => {
    if (!editingClaimant || !editingClaimant.current.trim()) return;
    const trimmed = editingClaimant.current.trim();
    const updated = localClaimants.map((c) =>
      c === editingClaimant.original ? trimmed : c
    );
    updateAndSaveClaimants(updated);
    setEditingClaimant(null);
    showToast(`請領人已更名為「${trimmed}」`);
  };

  // 恢復預設值
  const handleResetDefaults = () => {
    setConfirmState({
      isOpen: true,
      title: '確定要將選單設定恢復為系統預設值？',
      description: (
        <div className="space-y-2 text-xs">
          <p className="text-stone-700">
            所有主分類、常用店家名單與請領人名冊將重設為初始狀態。
          </p>
          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
            ✓ 您的歷史記帳資料不會遺失。
          </div>
        </div>
      ),
      confirmText: '確認恢復預設值',
      variant: 'warning',
      onConfirm: () => {
        updateAndSaveCategories(DEFAULT_CATEGORIES);
        updateAndSaveClaimants(DEFAULT_CLAIMANTS);
        setActiveCategoryId(DEFAULT_CATEGORIES[0].id);
        showToast('已重設為系統預設值');
      }
    });
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'dining':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'fuel':
        return <Fuel className="w-3.5 h-3.5" />;
      case 'advance':
        return <HandCoins className="w-3.5 h-3.5" />;
      case 'misc':
        return <PackageCheck className="w-3.5 h-3.5" />;
      case 'transport':
        return <Car className="w-3.5 h-3.5" />;
      case 'replenishment':
        return <Coins className="w-3.5 h-3.5" />;
      default:
        return <Settings className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                零用金選單與項目管理中心
              </h3>
              <p className="text-xs text-stone-500">
                即時編輯、新增或刪除主分類、常用店家、站點與請領人名單
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

        {/* 頂部 Tab 切換：分類與選單管理 VS 常用請領人管理 */}
        <div className="px-6 pt-3 border-b border-stone-200 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'categories'
                  ? 'border-amber-500 text-amber-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>主分類與店家/項目選單</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('claimants')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'claimants'
                  ? 'border-amber-500 text-amber-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>常用請領人名冊 ({localClaimants.length})</span>
            </button>
          </div>

          {/* 即時反饋 Toast */}
          {toastMessage && (
            <div className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 grow">
          {/* 靜態快照說明 Banner */}
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs flex items-start gap-2.5 text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">靜態快照資料寫入保證 (即時生效且安全)：</span><br />
              所有操作均<strong>即時自動儲存</strong>。在此刪除或更名店家、加油站或請領人，<strong>過去所有歷史帳目、圓餅統計與 Excel 依然完整保留</strong>！
            </div>
          </div>

          {/* TAB 1: 主分類與店家/站點/項目選單 */}
          {activeTab === 'categories' && (
            <>
              {/* 主分類選擇列與新增分類入口 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-700">
                    點選要管理的分類：
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-xs text-amber-700 hover:text-amber-800 font-bold underline flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{isAddingCategory ? '收合新增主分類' : '＋ 新增自訂主分類'}</span>
                  </button>
                </div>

                {/* 新增主分類表單 */}
                {isAddingCategory && (
                  <form onSubmit={handleCreateNewCategory} className="mb-3 p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                    <div className="font-bold text-xs text-stone-800 flex items-center gap-1">
                      <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
                      <span>建立新的主分類 (例如：特約廠商、公關招待)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-stone-500 block mb-1">主分類名稱 *</span>
                        <input
                          type="text"
                          placeholder="例如：特約廠商"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block mb-1">子選單名稱 *</span>
                        <input
                          type="text"
                          placeholder="例如：廠商名稱"
                          value={newCatSubLabel}
                          onChange={(e) => setNewCatSubLabel(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block mb-1">屬性</span>
                        <select
                          value={newCatType}
                          onChange={(e) => setNewCatType(e.target.value as TransactionType)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden"
                        >
                          <option value="expense">零用金支出類別</option>
                          <option value="income">零用金撥補/來源類別</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="px-3 py-1 text-xs text-stone-500 hover:bg-stone-200 rounded-lg"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                      >
                        立即建立並儲存
                      </button>
                    </div>
                  </form>
                )}

                {/* 分類標籤切換 */}
                <div className="flex flex-wrap gap-2">
                  {localCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(cat.id);
                        setEditingCategory(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                        activeCategoryId === cat.id
                          ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span style={{ color: cat.color }}>{getCategoryIcon(cat.id)}</span>
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-70">
                        ({cat.type === 'income' ? '撥補' : '支'})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 當前分類屬性與編輯主分類 */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                {editingCategory ? (
                  <div className="bg-white p-3 rounded-lg border border-amber-300 space-y-2">
                    <div className="text-xs font-bold text-stone-800">修改主分類設定</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-stone-500">主分類名稱</span>
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-stone-300 rounded-md"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500">子選單名稱 (如：店家/加油站/姓名)</span>
                        <input
                          type="text"
                          value={editingCategory.subLabel}
                          onChange={(e) => setEditingCategory({ ...editingCategory, subLabel: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-stone-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100 rounded-md"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditCategory}
                        className="px-3 py-1 text-xs font-bold bg-amber-600 text-white rounded-md hover:bg-amber-700"
                      >
                        儲存修改
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentCategory?.color }} />
                        <span>「{currentCategory?.name}」的主分類設定 (項目欄位：{currentCategory?.subLabel})</span>
                      </span>
                      <span className="text-[11px] text-stone-500">
                        下拉選單目前共有 {currentCategory?.defaultSubItems.length} 個常駐選項
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCategory({
                          id: currentCategory.id,
                          name: currentCategory.name,
                          subLabel: currentCategory.subLabel
                        })}
                        className="text-[11px] text-amber-700 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>更名主分類</span>
                      </button>

                      {localCategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(currentCategory.id, currentCategory.name)}
                          className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 font-medium ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>刪除此主分類</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 新增子項目輸入框 */}
                <form onSubmit={handleAddSubItem} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder={`輸入新「${currentCategory?.subLabel}」(例如：${
                      currentCategory?.id === 'dining' ? '新便當店、熱炒店' : currentCategory?.id === 'fuel' ? '中油-某某站' : '新項目'
                    })`}
                    value={newSubItemName}
                    onChange={(e) => setNewSubItemName(e.target.value)}
                    className="grow px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors shrink-0 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>立即加入選單</span>
                  </button>
                </form>
              </div>

              {/* 子項目條列清單 (支援即時刪除與修改更名) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-700">
                    【{currentCategory?.name}】目前的下拉選單項目 ({currentCategory?.defaultSubItems.length} 項)：
                  </span>
                  <span className="text-[11px] text-stone-400">
                    點擊 ✏️ 重新更名或 🗑️ 移除
                  </span>
                </div>

                {currentCategory?.defaultSubItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    目前此類別尚無常駐項目，請使用上方輸入框新增
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                    {currentCategory?.defaultSubItems.map((item, idx) => {
                      const isEditing = editingSubItem?.original === item;

                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between gap-2 hover:border-stone-300 transition-colors"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 grow">
                              <input
                                type="text"
                                value={editingSubItem.current}
                                onChange={(e) =>
                                  setEditingSubItem({ ...editingSubItem, current: e.target.value })
                                }
                                className="grow px-2 py-1 text-xs border border-amber-400 rounded-md focus:outline-hidden"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={handleSaveEditSubItem}
                                className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                title="儲存更名"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSubItem(null)}
                                className="p-1 rounded-md bg-stone-100 text-stone-500 hover:bg-stone-200"
                                title="取消"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-medium text-stone-800 truncate">
                                {item}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingSubItem({ original: item, current: item })
                                  }
                                  className="p-1 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                                  title="重新命名"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubItem(item)}
                                  className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="刪除此項目"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: 常用請領人名冊管理 */}
          {activeTab === 'claimants' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">支出請領人名冊說明：</span>
                零用金由您統一保管，每當公司同仁（如：林先生、陳小明、廠長）拿單據或口頭請領零用金時，可在記帳時快速點選請領人。在此可預先建立常用同仁名單。
              </div>

              {/* 新增請領人表單 */}
              <form onSubmit={handleAddClaimant} className="flex gap-2">
                <input
                  type="text"
                  placeholder="輸入同仁姓名或職稱 (例如：張工程師、會計王小姐)"
                  value={newClaimantName}
                  onChange={(e) => setNewClaimantName(e.target.value)}
                  className="grow px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>加入名冊</span>
                </button>
              </form>

              {/* 請領人清單 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-stone-700">
                    現有常用請領人清單 ({localClaimants.length} 人)：
                  </span>
                  <span className="text-[11px] text-stone-400">
                    點擊 ✏️ 編輯或 🗑️ 刪除
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                  {localClaimants.map((person, idx) => {
                    const isEditing = editingClaimant?.original === person;

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between gap-2 hover:border-stone-300 transition-colors"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 grow">
                            <input
                              type="text"
                              value={editingClaimant.current}
                              onChange={(e) =>
                                setEditingClaimant({ ...editingClaimant, current: e.target.value })
                              }
                              className="grow px-2 py-1 text-xs border border-amber-400 rounded-md focus:outline-hidden"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditClaimant}
                              className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              title="儲存更名"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingClaimant(null)}
                              className="p-1 rounded-md bg-stone-100 text-stone-500 hover:bg-stone-200"
                              title="取消"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-stone-400" />
                              <span>{person}</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingClaimant({ original: person, current: person })
                                }
                                className="p-1 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                                title="重新命名"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClaimant(person)}
                                className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="刪除此請領人"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重設為系統預設值</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            完成並關閉管理中心
          </button>
        </div>

        {/* 刪除確認彈窗 (避免 iframe 阻擋 window.confirm) */}
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          description={confirmState.description}
          confirmText={confirmState.confirmText || '確認刪除'}
          cancelText="取消"
          variant={confirmState.variant || 'danger'}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState((prev) => ({ ...prev, isOpen: false }));
          }}
          onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
};
