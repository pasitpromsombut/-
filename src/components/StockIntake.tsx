import { useState, useMemo, useEffect, FormEvent } from 'react';
import { Product } from '../types';
import {
  Download,
  CheckCircle,
  Search,
  AlertCircle,
  MessageSquare,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  Package,
  X,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductThumbnail } from './ProductManagement';

export interface IntakeItem {
  productId: string;
  quantity: number;
}

interface StockIntakeProps {
  products: Product[];
  onAddTransaction: (
    productId: string,
    type: 'รับเข้า' | 'เบิกออก',
    quantity: number,
    note: string
  ) => Promise<void>;
  isMutating: boolean;
  isLoggedIn: boolean;
  onLogin: () => void;
  isLoggingIn: boolean;
  initialSelectedProductId?: string;
}

export default function StockIntake({
  products,
  onAddTransaction,
  isMutating,
  isLoggedIn,
  onLogin,
  isLoggingIn,
  initialSelectedProductId = '',
}: StockIntakeProps) {
  const [intakeItems, setIntakeItems] = useState<IntakeItem[]>([]);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sync preselected product ID if passed down
  useEffect(() => {
    if (initialSelectedProductId && products.some((p) => p.id === initialSelectedProductId)) {
      setIntakeItems((prev) => {
        if (prev.some((item) => item.productId === initialSelectedProductId)) {
          return prev;
        }
        return [...prev, { productId: initialSelectedProductId, quantity: 1 }];
      });
    }
  }, [initialSelectedProductId, products]);

  // Search filtered products for the dropdown
  const dropdownProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Add a product to the intake list
  const addProductToIntake = (productId: string) => {
    setIntakeItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === productId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      } else {
        return [...prev, { productId, quantity: 1 }];
      }
    });
    setIsDropdownOpen(false);
    setSearchQuery('');
    setErrorMessage('');
  };

  // Update quantity of an item in the intake list
  const updateItemQuantity = (productId: string, qty: number) => {
    setIntakeItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return { ...item, quantity: Math.max(1, qty) };
        }
        return item;
      })
    );
    setErrorMessage('');
  };

  // Remove an item from the intake list
  const removeItem = (productId: string) => {
    setIntakeItems((prev) => prev.filter((item) => item.productId !== productId));
    setErrorMessage('');
  };

  // Clear all items
  const clearAllItems = () => {
    setIntakeItems([]);
    setErrorMessage('');
  };

  // Total summary calculation
  const totalSummary = useMemo(() => {
    const totalTypes = intakeItems.length;
    const totalUnits = intakeItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return { totalTypes, totalUnits };
  }, [intakeItems]);

  // Handle Form Submit
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (intakeItems.length === 0) {
      setErrorMessage('กรุณาเลือกพัสดุอย่างน้อย 1 รายการเพื่อทำรายการรับเข้า');
      return;
    }

    for (const item of intakeItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;
      if (item.quantity <= 0) {
        setErrorMessage(`กรุณาระบุจำนวนรับเข้าของ "${prod.name}" ให้มากกว่า 0`);
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Execute Batch Intake
  const handleConfirmIntake = async () => {
    setShowConfirmModal(false);
    
    // Generate a single Intake Bill ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(100 + Math.random() * 900);
    const billId = `IN-${dateStr}-${randomNum}`;

    const cleanNote = note.trim();
    const formattedNote = `[ใบรับเข้า: ${billId}] ${cleanNote || 'รับเข้าคลังตามปกติ'}`;

    try {
      let successCount = 0;
      for (const item of intakeItems) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          await onAddTransaction(item.productId, 'รับเข้า', item.quantity, formattedNote);
          successCount++;
        }
      }

      setSuccessMessage(
        isLoggedIn
          ? `บันทึกการรับเข้าพัสดุรวม ${successCount} รายการ ในใบรับเข้าเลขที่ "${billId}" สำเร็จเรียบร้อยแล้ว!`
          : `บันทึกการรับเข้าพัสดุรวม ${successCount} รายการ ในใบรับเข้าเลขที่ "${billId}" สำเร็จ! (โหมดทดลองใช้งาน)`
      );

      // Reset form
      setIntakeItems([]);
      setNote('');

      // Auto dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage(`เกิดข้อผิดพลาดในการรับเข้าพัสดุ: ${err.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="stock-intake-root">
      {/* Visual Header */}
      <div className="bg-emerald-600 px-6 py-8 text-white relative overflow-hidden" id="intake-header">
        <div className="relative z-10" id="intake-header-text">
          <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Stock Inward Setup</span>
          <h2 className="text-2xl font-bold mt-1">หน้ารับเข้าพัสดุ (Multi-Item)</h2>
          <p className="text-emerald-100/90 text-xs mt-1 leading-relaxed">
            เลือกรายการพัสดุได้ทีละหลายรายการ พร้อมระบุจำนวนที่นำเข้าเพื่ออัปเดตยอดสต๊อกคลังพร้อมกันในครั้งเดียว
          </p>
        </div>
        <div className="absolute right-6 bottom-4 text-emerald-500/30 font-black text-7xl select-none" id="intake-watermark">
          IN
        </div>
      </div>

      {/* Guest Warning */}
      {!isLoggedIn && (
        <div className="p-4 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs flex flex-col gap-2" id="intake-guest-warning">
          <div className="flex items-center gap-2 font-bold text-[13px] text-amber-900">
            <span className="text-base">💡</span>
            <span>โหมดทดลองใช้งาน (Guest Mode)</span>
          </div>
          <p className="leading-relaxed font-medium">
            คุณสามารถเลือกพัสดุได้หลายรายการ ระบุจำนวน และจำลองการรับเข้าสต๊อกได้ทันที โดยจะเพิ่มยอดสต๊อกชั่วคราวให้ในหน้า "พัสดุคงเหลือ & สรุปยอด" 
            หากต้องการเชื่อมข้อมูลและบันทึกลงไฟล์ Google Sheets จริงของคุณอย่างถาวร กรุณากดปุ่ม 
            <button type="button" onClick={onLogin} className="mx-1 text-indigo-600 hover:underline font-black">เข้าสู่ระบบด้วย Google</button>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6" id="intake-form">
        {/* Success / Error Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-start gap-3 text-sm font-medium"
              id="intake-success-alert"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-3 text-sm font-medium"
              id="intake-error-alert"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span>{errorMessage}</span>
                {!isLoggedIn && (
                  <button
                    type="button"
                    onClick={onLogin}
                    disabled={isLoggingIn}
                    className="block mt-2 text-xs text-indigo-600 hover:underline font-bold"
                  >
                    ล็อกอินด้วย Google คลิกที่นี่
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Searchable Dropdown for Selecting & Adding Items */}
        <div className="space-y-2 relative" id="intake-select-prod-wrapper">
          <label className="block text-sm font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <PackagePlus className="w-4 h-4 text-emerald-600" />
              <span>ค้นหาและเลือกพัสดุที่ต้องการรับเข้า (คลิกเพื่อเพิ่มลงรายการ) *</span>
            </span>
            {intakeItems.length > 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                เลือกแล้ว {intakeItems.length} รายการ
              </span>
            )}
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 text-left text-sm flex justify-between items-center transition shadow-2xs"
              id="intake-dropdown-trigger"
            >
              <span className="text-slate-500 font-medium flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span>--- กดตรงนี้เพื่อเลือกพัสดุเพิ่มลงรายการรับเข้า ---</span>
              </span>
              <Plus className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {isDropdownOpen && (
              <div
                className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-72 flex flex-col"
                id="intake-dropdown-menu"
              >
                <div className="p-3 border-b border-slate-100" id="dropdown-search">
                  <input
                    type="text"
                    placeholder="ค้นหาด้วยชื่อ, รหัสพัสดุ หรือหมวดหมู่..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                  {dropdownProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">ไม่พบรายการพัสดุ</div>
                  ) : (
                    dropdownProducts.map((p) => {
                      const inCartItem = intakeItems.find((item) => item.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProductToIntake(p.id)}
                          className="w-full px-4 py-2.5 text-left hover:bg-emerald-50/60 flex items-center justify-between text-xs transition gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ProductThumbnail src={p.imageUrl} alt={p.name} size="sm" />
                            <div className="truncate">
                              <p className="font-bold text-slate-800 truncate group-hover:text-emerald-700">{p.name}</p>
                              <p className="font-mono text-[10px] text-slate-400">{p.id} • {p.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {inCartItem && (
                              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                ในรายการแล้ว (+{inCartItem.quantity})
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              คงเหลือ {p.quantity} {p.unit}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Items List */}
        <div className="space-y-3" id="selected-intake-items-section">
          <div className="flex justify-between items-center" id="selected-intake-header">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              <span>รายการพัสดุที่เลือกรับเข้า ({intakeItems.length} รายการ)</span>
            </h3>
            {intakeItems.length > 0 && (
              <button
                type="button"
                onClick={clearAllItems}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างทั้งหมด</span>
              </button>
            )}
          </div>

          {intakeItems.length === 0 ? (
            <div
              className="text-center py-10 bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-slate-50 transition"
              onClick={() => setIsDropdownOpen(true)}
              id="empty-intake-cart"
            >
              <PackagePlus className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">ยังไม่ได้เลือกพัสดุสำหรับรับเข้า</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                กดเลือกพัสดุจากช่องด้านบนเพื่อเริ่มสร้างรายการรับเข้า (สามารถเลือกเพิ่มได้หลายรายการ)
              </p>
            </div>
          ) : (
            <div className="space-y-2.5" id="intake-items-list">
              {intakeItems.map((item, index) => {
                const prod = products.find((p) => p.id === item.productId);
                if (!prod) return null;

                const newQuantity = prod.quantity + (item.quantity || 0);

                return (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl shadow-2xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    id={`intake-item-card-${item.productId}`}
                  >
                    {/* Left: Item Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center shrink-0">
                        {index + 1}.
                      </span>
                      <ProductThumbnail src={prod.imageUrl} alt={prod.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{prod.name}</h4>
                          <span className="font-mono text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            {prod.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <span className="text-slate-500 font-medium">
                            สต๊อกปัจจุบัน: <strong className="text-slate-700">{prod.quantity} {prod.unit}</strong>
                          </span>
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-100">
                            <TrendingUp className="w-3 h-3" />
                            หลังรับเข้า: {newQuantity} {prod.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quantity Controls & Remove */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Quick Quantity Presets */}
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded transition cursor-pointer"
                          title="เพิ่ม 1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity + 5)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded transition cursor-pointer"
                          title="เพิ่ม 5"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity + 10)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded transition cursor-pointer"
                          title="เพิ่ม 10"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity + 50)}
                          className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded transition font-extrabold cursor-pointer"
                          title="เพิ่ม 50"
                        >
                          +50
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-white shadow-2xs transition cursor-pointer"
                          title="ลดจำนวน"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            updateItemQuantity(item.productId, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-14 text-center font-bold text-sm text-slate-800 bg-transparent focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 shadow-2xs transition cursor-pointer"
                          title="เพิ่มจำนวน"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-slate-500 pr-1.5">{prod.unit}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="ลบรายการนี้ออกจากใบรับเข้า"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Multi-item Batch Summary Card */}
        {intakeItems.length > 0 && (
          <div
            className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/60 text-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 text-xs"
            id="intake-batch-summary"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl shadow-2xs text-emerald-600">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">
                  สรุปการรับเข้า: <span className="text-emerald-600 font-black">{totalSummary.totalTypes}</span> รายการพัสดุ
                </p>
                <p className="text-slate-500 text-xs">
                  รวมจำนวนพัสดุที่รับเข้าคลังทั้งหมด <strong className="text-slate-800">{totalSummary.totalUnits.toLocaleString('th-TH')}</strong> ชิ้น/หน่วย
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Note Field */}
        <div className="space-y-2 pt-2 border-t border-slate-100" id="intake-note-wrapper">
          <label className="block text-sm font-bold text-slate-700 flex items-center gap-1">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>หมายเหตุ / ข้อมูลซัพพลายเออร์</span>
          </label>
          <input
            type="text"
            placeholder="เช่น ซื้อจากซัพพลายเออร์ A, ล็อต #A1, นำเข้าคลังประจำสัปดาห์"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            id="intake-note-input"
          />
        </div>

        {/* Form Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end" id="intake-submit-wrapper">
          <button
            type="submit"
            disabled={isMutating || intakeItems.length === 0}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-8 rounded-xl shadow-md hover:shadow-lg transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed w-full md:w-auto text-sm"
            id="intake-submit-btn"
          >
            {isMutating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>กำลังบันทึกข้อมูลเข้า Google Sheets...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>ยืนยันการรับเข้าพัสดุ ({totalSummary.totalTypes} รายการ)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" id="confirm-modal-overlay">
            {/* Background Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Content Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 z-10 text-left"
              id="confirm-modal-card"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-800">
                    ยืนยันรายการรับเข้าพัสดุ ({intakeItems.length} รายการ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    หมายเหตุ: <strong className="text-slate-800">{note.trim() || 'รับเข้าคลังตามปกติ'}</strong>
                  </p>
                </div>
              </div>

              {/* Items Summary in Modal */}
              <div className="max-h-48 overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-3 divide-y divide-slate-100 space-y-2">
                {intakeItems.map((item, i) => {
                  const prod = products.find((p) => p.id === item.productId);
                  if (!prod) return null;
                  return (
                    <div key={item.productId} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-mono text-slate-400 font-bold">{i + 1}.</span>
                        <span className="font-semibold text-slate-800 truncate">{prod.name}</span>
                      </div>
                      <span className="font-bold text-emerald-600 shrink-0">
                        +{item.quantity} {prod.unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {isLoggedIn ? (
                <p className="text-[11px] text-indigo-600 font-medium leading-normal pt-1 border-t border-slate-50">
                  📝 ข้อมูลจะถูกบันทึกลงในยอดสต๊อกใน Google Sheets ทันทีตามลำดับ
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 font-medium leading-normal pt-1 border-t border-slate-50">
                  ⚠️ คุณอยู่ในโหมดทดลองใช้งาน รายการจะอัปเดตยอดสต๊อกชั่วคราวในหน่วยความจำเท่านั้น
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIntake}
                  disabled={isMutating}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition shadow-sm hover:shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isMutating ? 'กำลังบันทึก...' : 'ยืนยันการรับเข้า'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
