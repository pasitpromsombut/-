import { useState, useMemo, useEffect, FormEvent } from 'react';
import { Product, Transaction, ShippingStatus, UserRoleMapping } from '../types';
import {
  Upload,
  CheckCircle,
  Search,
  AlertCircle,
  MessageSquare,
  MapPin,
  Truck,
  Clock,
  Plus,
  Minus,
  Trash2,
  PackagePlus,
  Package,
  X,
  FileText,
  Printer,
  User,
  Eye,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductThumbnail } from './ProductManagement';
import { OfficialVoucherModal } from './OfficialVoucherModal';
import { DeliveryNoteModal } from './DeliveryNoteModal';

export interface WithdrawalItem {
  productId: string;
  quantity: number;
}

export interface WithdrawalBill {
  billId: string;
  timestamp: string;
  station: string;
  note: string;
  userEmail: string;
  shippingStatus: ShippingStatus;
  items: Transaction[];
  totalQuantity: number;
}

interface StockWithdrawalProps {
  products: Product[];
  transactions?: Transaction[];
  onAddTransaction: (
    productId: string,
    type: 'รับเข้า' | 'เบิกออก',
    quantity: number,
    note: string,
    shippingStatus?: ShippingStatus
  ) => Promise<void>;
  onUpdateShippingStatus?: (transactionId: string, newStatus: ShippingStatus) => Promise<void>;
  isMutating: boolean;
  isLoggedIn: boolean;
  currentUserEmail?: string;
  currentUserName?: string;
  userRoles?: UserRoleMapping[];
  onLogin: () => void;
  isLoggingIn: boolean;
  initialSelectedProductId?: string;
  isAdmin?: boolean;
}

// Helper to parse note for Bill ID, Station, and clean note
export const parseNoteDetails = (note: string) => {
  if (!note) return { billId: '', station: '', cleanNote: '' };

  let billId = '';
  let station = '';
  let cleanNote = note;

  const billMatch = note.match(/\[(?:ใบเบิก|เลขที่บิล|บิล):\s*([^\]]+)\]/);
  if (billMatch) {
    billId = billMatch[1].trim();
  }

  const stationMatch = note.match(/\[สถานี:\s*([^\]]+)\]/);
  if (stationMatch) {
    station = stationMatch[1].trim();
  }

  cleanNote = cleanNote
    .replace(/\[(?:ใบเบิก|เลขที่บิล|บิล):\s*[^\]]+\]/g, '')
    .replace(/\[สถานี:\s*[^\]]+\]/g, '')
    .trim();

  return { billId, station, cleanNote };
};

// Helper to render item-level fulfillment status badge
export const renderItemStatusBadge = (status?: ShippingStatus) => {
  const s = status || 'กำลังเตรียมจัดส่ง';
  switch (s) {
    case 'จัดส่งสำเร็จ':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✅ จ่ายได้
        </span>
      );
    case 'ยกเลิกการจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
          ❌ จ่ายไม่ได้
        </span>
      );
    case 'อยู่ระหว่างจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          🚚 อยู่ระหว่างจัดส่ง
        </span>
      );
    case 'กำลังเตรียมจัดส่ง':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          📦 รอตรวจสอบ
        </span>
      );
  }
};

// Helper to render bill overall shipping badge
const renderShippingBadge = (status?: ShippingStatus, items?: Transaction[]) => {
  if (items && items.length > 0) {
    const approved = items.filter((i) => i.shippingStatus === 'จัดส่งสำเร็จ').length;
    const rejected = items.filter((i) => i.shippingStatus === 'ยกเลิกการจัดส่ง').length;

    if (approved === items.length) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✅ จ่ายได้ทั้งหมด ({approved}/{items.length})
        </span>
      );
    }
    if (rejected === items.length) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          ❌ จ่ายไม่ได้ทั้งบิล ({rejected}/{items.length})
        </span>
      );
    }
    if (approved > 0 || rejected > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
          ⚖️ จ่ายได้บางรายการ (จ่ายได้ {approved}, จ่ายไม่ได้ {rejected})
        </span>
      );
    }
  }

  const s = status || 'กำลังเตรียมจัดส่ง';
  switch (s) {
    case 'กำลังเตรียมจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          📦 รอตรวจสอบการจ่าย
        </span>
      );
    case 'อยู่ระหว่างจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
          🚚 อยู่ระหว่างจัดส่ง
        </span>
      );
    case 'จัดส่งสำเร็จ':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✅ จ่ายได้เรียบร้อย
        </span>
      );
    case 'ยกเลิกการจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          ❌ ยกเลิก / จ่ายไม่ได้
        </span>
      );
    default:
      return null;
  }
};

export default function StockWithdrawal({
  products,
  transactions = [],
  onAddTransaction,
  onUpdateShippingStatus,
  isMutating,
  isLoggedIn,
  currentUserEmail,
  currentUserName,
  userRoles = [],
  onLogin,
  isLoggingIn,
  initialSelectedProductId = '',
  isAdmin = false,
}: StockWithdrawalProps) {
  const [withdrawalItems, setWithdrawalItems] = useState<WithdrawalItem[]>([]);
  const [station, setStation] = useState<string>('นครราชสีมา');
  const [customStation, setCustomStation] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'รอดำเนินการ' | 'จัดส่งสำเร็จ' | 'ทั้งหมด'>('รอดำเนินการ');
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<WithdrawalBill | null>(null);
  const [selectedBillForDeliveryNote, setSelectedBillForDeliveryNote] = useState<WithdrawalBill | null>(null);
  const [lastCreatedBill, setLastCreatedBill] = useState<WithdrawalBill | null>(null);

  // Sync preselected product ID if passed down
  useEffect(() => {
    if (initialSelectedProductId && products.some((p) => p.id === initialSelectedProductId)) {
      setWithdrawalItems((prev) => {
        if (prev.some((item) => item.productId === initialSelectedProductId)) {
          return prev;
        }
        return [...prev, { productId: initialSelectedProductId, quantity: 1 }];
      });
    }
  }, [initialSelectedProductId, products]);

  // Auto-fill station from user's assigned station in user roles
  useEffect(() => {
    if (currentUserEmail && userRoles.length > 0) {
      const myRoleMapping = userRoles.find(
        (r) => r.email.toLowerCase() === currentUserEmail.toLowerCase()
      );
      if (myRoleMapping?.station) {
        setStation(myRoleMapping.station);
      }
    }
  }, [currentUserEmail, userRoles]);

  // Search filtered products for the dropdown
  const dropdownProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Add a product to the withdrawal list
  const addProductToWithdrawal = (productId: string) => {
    setWithdrawalItems((prev) => {
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

  // Update quantity of an item in the withdrawal list
  const updateItemQuantity = (productId: string, qty: number) => {
    setWithdrawalItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const prod = products.find((p) => p.id === productId);
          const maxQty = prod ? prod.quantity : 999999;
          return { ...item, quantity: Math.min(maxQty, Math.max(1, qty)) };
        }
        return item;
      })
    );
    setErrorMessage('');
  };

  // Remove an item from withdrawal list
  const removeItem = (productId: string) => {
    setWithdrawalItems((prev) => prev.filter((item) => item.productId !== productId));
    setErrorMessage('');
  };

  // Clear all items from withdrawal list
  const clearAllItems = () => {
    setWithdrawalItems([]);
    setErrorMessage('');
  };

  // Total summary calculation
  const totalSummary = useMemo(() => {
    const totalTypes = withdrawalItems.length;
    const totalUnits = withdrawalItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const hasExceededStock = withdrawalItems.some((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return prod ? item.quantity > prod.quantity : false;
    });
    return { totalTypes, totalUnits, hasExceededStock };
  }, [withdrawalItems, products]);

  // Group transactions into Bills (ใบเบิกพัสดุ)
  const groupedBills = useMemo(() => {
    let withdrawalTxList = transactions.filter((tx) => tx.type === 'เบิกออก');

    // General users (not admin) can view only their own account's withdrawal bills
    if (!isAdmin) {
      if (currentUserEmail) {
        const cleanUserEmail = currentUserEmail.trim().toLowerCase();
        withdrawalTxList = withdrawalTxList.filter(
          (tx) => (tx.userEmail || '').trim().toLowerCase() === cleanUserEmail
        );
      } else {
        withdrawalTxList = [];
      }
    }

    const billMap = new Map<string, WithdrawalBill>();

    for (const tx of withdrawalTxList) {
      const { billId: parsedBillId, station: parsedStation, cleanNote } = parseNoteDetails(tx.note);
      
      // Generate grouping key
      // If parsedBillId exists, group by parsedBillId
      // Otherwise, fallback to grouping by (timestamp + station + cleanNote + userEmail)
      const fallbackKey = `LEGACY-${tx.timestamp}-${parsedStation}-${cleanNote}-${tx.userEmail}`;
      const groupKey = parsedBillId ? parsedBillId : fallbackKey;
      const displayBillId = parsedBillId || `WD-${tx.id}`;

      if (!billMap.has(groupKey)) {
        billMap.set(groupKey, {
          billId: displayBillId,
          timestamp: tx.timestamp,
          station: parsedStation || 'ไม่ระบุสถานี',
          note: cleanNote || 'เบิกใช้งานตามปกติ',
          userEmail: tx.userEmail,
          shippingStatus: tx.shippingStatus || 'กำลังเตรียมจัดส่ง',
          items: [],
          totalQuantity: 0,
        });
      }

      const bill = billMap.get(groupKey)!;
      bill.items.push(tx);
      bill.totalQuantity += tx.quantity;

    }

    for (const bill of Array.from(billMap.values())) {
      const approvedCount = bill.items.filter((i) => i.shippingStatus === 'จัดส่งสำเร็จ').length;
      const rejectedCount = bill.items.filter((i) => i.shippingStatus === 'ยกเลิกการจัดส่ง').length;

      if (approvedCount === bill.items.length) {
        bill.shippingStatus = 'จัดส่งสำเร็จ';
      } else if (rejectedCount === bill.items.length) {
        bill.shippingStatus = 'ยกเลิกการจัดส่ง';
      } else if (approvedCount > 0 || rejectedCount > 0) {
        bill.shippingStatus = 'อยู่ระหว่างจัดส่ง';
      } else {
        bill.shippingStatus = 'กำลังเตรียมจัดส่ง';
      }
    }

    return Array.from(billMap.values());
  }, [transactions, isAdmin, currentUserEmail]);

  // Filtered Bills by Status Filter
  const filteredBills = useMemo(() => {
    if (withdrawalFilter === 'รอดำเนินการ') {
      return groupedBills.filter((b) => b.shippingStatus !== 'จัดส่งสำเร็จ' && b.shippingStatus !== 'ยกเลิกการจัดส่ง');
    }
    if (withdrawalFilter === 'จัดส่งสำเร็จ') {
      return groupedBills.filter((b) => b.shippingStatus === 'จัดส่งสำเร็จ');
    }
    return groupedBills;
  }, [groupedBills, withdrawalFilter]);

  // Counts for tabs
  const billCounts = useMemo(() => {
    const pending = groupedBills.filter((b) => b.shippingStatus !== 'จัดส่งสำเร็จ' && b.shippingStatus !== 'ยกเลิกการจัดส่ง').length;
    const completed = groupedBills.filter((b) => b.shippingStatus === 'จัดส่งสำเร็จ').length;
    const total = groupedBills.length;
    return { pending, completed, total };
  }, [groupedBills]);

  // Update status for all items in a Bill
  const handleUpdateBillStatus = async (bill: WithdrawalBill, newStatus: ShippingStatus) => {
    if (!onUpdateShippingStatus) return;
    try {
      await Promise.all(bill.items.map((item) => onUpdateShippingStatus(item.id, newStatus)));
    } catch (err: any) {
      console.error('Failed to update bill shipping status:', err);
    }
  };

  // Validate on Form Submit
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (withdrawalItems.length === 0) {
      setErrorMessage('กรุณาเลือกพัสดุอย่างน้อย 1 รายการเพื่อทำรายการเบิก');
      return;
    }

    for (const item of withdrawalItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;
      if (item.quantity <= 0) {
        setErrorMessage(`กรุณาระบุจำนวนเบิกของ "${prod.name}" ให้มากกว่า 0`);
        return;
      }
      if (item.quantity > prod.quantity) {
        setErrorMessage(
          `ไม่สามารถเบิกพัสดุได้! เนื่องจาก "${prod.name}" ยอดเบิก (${item.quantity} ${prod.unit}) เกินยอดคงเหลือในคลัง (${prod.quantity} ${prod.unit})`
        );
        return;
      }
    }

    const finalStation = station === 'ระบุสถานีอื่น...' ? customStation.trim() : station;
    if (!finalStation) {
      setErrorMessage('กรุณาระบุชื่อสถานีที่ต้องการเบิก');
      return;
    }

    setShowConfirmModal(true);
  };

  // Execute Batch Withdrawal with Unified Bill ID
  const handleConfirmWithdrawal = async () => {
    setShowConfirmModal(false);
    const finalStation = station === 'ระบุสถานีอื่น...' ? customStation.trim() : station;

    // Generate a single unique Bill ID for this withdrawal order
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(100 + Math.random() * 900);
    const billId = `WD-${dateStr}-${randomNum}`;

    const cleanNoteText = note.trim();
    const formattedNote = `[ใบเบิก: ${billId}] [สถานี: ${finalStation}] ${cleanNoteText || 'เบิกใช้งานตามปกติ'}`;

    try {
      let successCount = 0;
      const createdItems: Transaction[] = [];

      for (const item of withdrawalItems) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          await onAddTransaction(
            item.productId,
            'เบิกออก',
            item.quantity,
            formattedNote,
            'กำลังเตรียมจัดส่ง'
          );
          createdItems.push({
            id: `new-${item.productId}-${Date.now()}`,
            productId: item.productId,
            productName: prod.name,
            type: 'เบิกออก',
            quantity: item.quantity,
            timestamp: now.toLocaleString('th-TH'),
            note: formattedNote,
            userEmail: currentUserEmail || 'user@railway.go.th',
            shippingStatus: 'กำลังเตรียมจัดส่ง',
          });
          successCount++;
        }
      }

      const createdBill: WithdrawalBill = {
        billId,
        timestamp: now.toLocaleString('th-TH'),
        station: finalStation,
        note: cleanNoteText || 'เบิกใช้งานตามปกติ',
        userEmail: currentUserEmail || 'user@railway.go.th',
        shippingStatus: 'กำลังเตรียมจัดส่ง',
        items: createdItems,
        totalQuantity: withdrawalItems.reduce((acc, curr) => acc + curr.quantity, 0),
      };

      setLastCreatedBill(createdBill);

      setSuccessMessage(
        isLoggedIn
          ? `บันทึกการเบิกออกพัสดุรวม ${successCount} รายการ ในใบเบิกเลขที่ "${billId}" ไปยัง "${finalStation}" สำเร็จเรียบร้อยแล้ว!`
          : `บันทึกการเบิกออกพัสดุรวม ${successCount} รายการ ในใบเบิกเลขที่ "${billId}" ไปยัง "${finalStation}" สำเร็จ! (โหมดทดลองใช้งาน)`
      );

      // Reset form
      setWithdrawalItems([]);
      setNote('');
      setStation('นครราชสีมา');
      setCustomStation('');

      // Auto-open Official Printable Voucher Modal for immediate print preview!
      setSelectedBillForPrint(createdBill);

      // Auto dismiss success message after 10 seconds
      setTimeout(() => setSuccessMessage(''), 10000);
    } catch (err: any) {
      setErrorMessage(`เกิดข้อผิดพลาดในการเบิกพัสดุ: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8" id="stock-withdrawal-root">
      {/* Top Withdrawal Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="withdrawal-form-card">
        {/* Visual Header */}
        <div className="bg-rose-600 px-6 py-8 text-white relative overflow-hidden" id="withdrawal-header">
          <div className="relative z-10" id="withdrawal-header-text">
            <span className="text-rose-100 text-xs font-semibold uppercase tracking-wider">Unified Multi-Item Withdrawal Bill</span>
            <h2 className="text-2xl font-bold mt-1">หน้าเบิกพัสดุ (รวมในบิลเดียวกัน)</h2>
            <p className="text-rose-100/90 text-xs mt-1 leading-relaxed">
              เลือกพัสดุได้หลายรายการในการเบิกครั้งเดียว ระบบจะสร้างใบเบิกพัสดุ (Bill) พร้อมรหัสบิลเดียวกันสำหรับติดตามสถานะจัดส่ง
            </p>
          </div>
          <div className="absolute right-6 bottom-4 text-rose-500/30 font-black text-7xl select-none" id="withdrawal-watermark">
            OUT
          </div>
        </div>

        {/* Guest Warning */}
        {!isLoggedIn && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 text-amber-800 text-xs flex flex-col gap-2" id="withdrawal-guest-warning">
            <div className="flex items-center gap-2 font-bold text-[13px] text-amber-900">
              <span className="text-base">💡</span>
              <span>โหมดทดลองใช้งาน (Guest Mode)</span>
            </div>
            <p className="leading-relaxed font-medium">
              คุณสามารถเลือกพัสดุได้หลายรายการในบิลเดียว ระบุจำนวน และจำลองการเบิกออกจากคลังได้ทันที โดยจะหักยอดสต๊อกชั่วคราวให้ 
              หากต้องการบันทึกลงไฟล์ Google Sheets จริงของคุณอย่างถาวร กรุณากดปุ่ม 
              <button type="button" onClick={onLogin} className="mx-1 text-indigo-600 hover:underline font-black">เข้าสู่ระบบด้วย Google</button>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6" id="withdrawal-form">
          {/* Step Progress Bar */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-xs text-center font-bold" id="withdrawal-steps-bar">
            <div className={`p-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              withdrawalItems.length > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-rose-600 text-white shadow-xs'
            }`}>
              <span>1. เลือกรายการพัสดุ</span>
            </div>
            <div className={`p-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              withdrawalItems.length > 0 && station ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-200/70 text-slate-500'
            }`}>
              <span>2. ระบุปลายทาง/หมายเหตุ</span>
            </div>
            <div className={`p-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              withdrawalItems.length > 0 && station ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200/70 text-slate-400'
            }`}>
              <span>3. กดยืนยันเบิกพัสดุ</span>
            </div>
          </div>

          {/* Success / Error Messages */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center justify-between gap-3 text-sm font-medium flex-wrap"
                id="withdrawal-success-alert"
              >
                <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
                {lastCreatedBill && (
                  <button
                    type="button"
                    onClick={() => setSelectedBillForPrint(lastCreatedBill)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    title="เปิดหน้าพิมพ์ใบเบิก"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ พิมพ์ใบเบิก #{lastCreatedBill.billId}</span>
                  </button>
                )}
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-3 text-sm font-medium"
                id="withdrawal-error-alert"
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
          <div className="space-y-2 relative" id="withdrawal-select-prod-wrapper">
            <label className="block text-sm font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-rose-600" />
                <span>ค้นหาและเลือกพัสดุที่ต้องการเบิก (คลิกเพื่อเพิ่มลงบิล) *</span>
              </span>
              {withdrawalItems.length > 0 && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  เลือกแล้ว {withdrawalItems.length} รายการ
                </span>
              )}
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 text-left text-sm flex justify-between items-center transition shadow-2xs cursor-pointer"
                id="withdrawal-dropdown-trigger"
              >
                <span className="text-slate-500 font-medium flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>--- กดตรงนี้เพื่อเลือกพัสดุเพิ่มลงในใบเบิกนี้ ---</span>
                </span>
                <Plus className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-72 flex flex-col"
                  id="withdrawal-dropdown-menu"
                >
                  <div className="p-3 border-b border-slate-100" id="dropdown-search">
                    <input
                      type="text"
                      placeholder="ค้นหาด้วยชื่อ, รหัสพัสดุ หรือหมวดหมู่..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                    {dropdownProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">ไม่พบรายการพัสดุ</div>
                    ) : (
                      dropdownProducts.map((p) => {
                        const inCartItem = withdrawalItems.find((item) => item.productId === p.id);
                        const isOutOfStock = p.quantity <= 0;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addProductToWithdrawal(p.id)}
                            className="w-full px-4 py-2.5 text-left hover:bg-rose-50/60 disabled:opacity-50 disabled:bg-slate-50 flex items-center justify-between text-xs transition gap-3 group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ProductThumbnail src={p.imageUrl} alt={p.name} size="sm" />
                              <div className="truncate">
                                <p className="font-bold text-slate-800 truncate group-hover:text-rose-700">{p.name}</p>
                                <p className="font-mono text-[10px] text-slate-400">{p.id} • {p.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {inCartItem && (
                                <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                                  ในบิลแล้ว ({inCartItem.quantity})
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  isOutOfStock
                                    ? 'bg-rose-100 text-rose-700 font-bold'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isOutOfStock ? 'สินค้าหมดคลัง' : `คงเหลือ ${p.quantity} ${p.unit}`}
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

            {/* Quick Product Chips for Direct 1-Click Addition */}
            {products.some((p) => p.quantity > 0) && (
              <div className="pt-1.5 space-y-1.5" id="withdrawal-quick-chips">
                <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>หรือคลิกเลือกพัสดุด่วน (1-Click Add):</span>
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {products
                    .filter((p) => p.quantity > 0)
                    .slice(0, 10)
                    .map((p) => {
                      const inCart = withdrawalItems.find((item) => item.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProductToWithdrawal(p.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            inCart
                              ? 'bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-200'
                              : 'bg-white border-slate-200 hover:border-rose-400 text-slate-700 hover:bg-rose-50/60'
                          }`}
                          title={`เพิ่ม ${p.name} ลงใบเบิก`}
                        >
                          <span>+ {p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({p.quantity} {p.unit})</span>
                          {inCart && (
                            <span className="text-[9px] bg-rose-200 text-rose-900 px-1 py-0.2 rounded font-black">
                              x{inCart.quantity}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Items List inside Current Bill */}
          <div className="space-y-3" id="selected-withdrawal-items-section">
            <div className="flex justify-between items-center" id="selected-withdrawal-header">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-600" />
                <span>รายการพัสดุในใบเบิกนี้ ({withdrawalItems.length} รายการ)</span>
              </h3>
              {withdrawalItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllItems}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ล้างทั้งหมด</span>
                </button>
              )}
            </div>

            {withdrawalItems.length === 0 ? (
              <div
                className="text-center py-10 bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setIsDropdownOpen(true)}
                id="empty-withdrawal-cart"
              >
                <PackagePlus className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">ยังไม่ได้เลือกพัสดุใส่ใบเบิกนี้</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  เลือกพัสดุจากช่องด้านบนเพื่อจัดกลุ่มเบิกออกหลายรายการในบิลเดียวกัน
                </p>
              </div>
            ) : (
              <div className="space-y-2.5" id="withdrawal-items-list">
                {withdrawalItems.map((item, index) => {
                  const prod = products.find((p) => p.id === item.productId);
                  if (!prod) return null;

                  const isExceeded = item.quantity > prod.quantity;

                  return (
                    <motion.div
                      key={item.productId}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 rounded-xl border shadow-2xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isExceeded ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                      id={`withdrawal-item-card-${item.productId}`}
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
                              สต๊อกในคลัง: <strong className="text-slate-800">{prod.quantity} {prod.unit}</strong>
                            </span>
                            {isExceeded && (
                              <span className="text-rose-600 font-bold bg-rose-100 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                ยอดเบิกเกินสต๊อก ({item.quantity - prod.quantity} {prod.unit})
                              </span>
                            )}
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
                            disabled={item.quantity >= prod.quantity}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded transition disabled:opacity-40 cursor-pointer"
                            title="เพิ่ม 1"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 5)}
                            disabled={item.quantity >= prod.quantity}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded transition disabled:opacity-40 cursor-pointer"
                            title="เพิ่ม 5"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 10)}
                            disabled={item.quantity >= prod.quantity}
                            className="px-1.5 py-0.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded transition disabled:opacity-40 cursor-pointer"
                            title="เพิ่ม 10"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, prod.quantity)}
                            className="px-1.5 py-0.5 bg-rose-100 text-rose-800 hover:bg-rose-200 rounded transition font-extrabold cursor-pointer"
                            title="เบิกทั้งหมดตามสต๊อกคงเหลือ"
                          >
                            เบิกทั้งหมด
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
                            max={prod.quantity}
                            value={item.quantity || ''}
                            onChange={(e) =>
                              updateItemQuantity(item.productId, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-14 text-center font-bold text-sm text-slate-800 bg-transparent focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= prod.quantity}
                            className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-white shadow-2xs transition cursor-pointer"
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
                          title="ลบรายการนี้ออกจากบิล"
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
          {withdrawalItems.length > 0 && (
            <div
              className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-4 text-xs ${
                totalSummary.hasExceededStock
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-rose-50/60 border-rose-100 text-slate-700'
              }`}
              id="withdrawal-batch-summary"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-xl shadow-2xs text-rose-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">
                    สรุปใบเบิก: <span className="text-rose-600 font-black">{totalSummary.totalTypes}</span> รายการพัสดุในบิลนี้
                  </p>
                  <p className="text-slate-500 text-xs">
                    รวมจำนวนพัสดุที่เบิกทั้งหมด <strong className="text-slate-800">{totalSummary.totalUnits.toLocaleString('th-TH')}</strong> ชิ้น/หน่วย
                  </p>
                </div>
              </div>

              {totalSummary.hasExceededStock && (
                <span className="text-rose-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4" />
                  มีพัสดุบางรายการเกินจำนวนคงเหลือ
                </span>
              )}
            </div>
          )}

          {/* Input fields for Destination Station and Note */}
          <div className="space-y-4 pt-2 border-t border-slate-100" id="withdrawal-destination-wrapper">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. สถานีที่เบิก */}
              <div className="space-y-2" id="withdrawal-station-field">
                <label className="block text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>สถานีที่เบิกส่ง / ปลายทาง *</span>
                  </span>
                </label>

                {/* Quick Station Click Pills */}
                <div className="flex flex-wrap gap-1.5" id="withdrawal-quick-stations">
                  {['นครราชสีมา', 'ชุมทางถนนจิระ', 'ขอนแก่น', 'อุดรธานี'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStation(st)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer shadow-2xs ${
                        station === st
                          ? 'bg-rose-600 text-white border-rose-600 ring-1 ring-rose-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300'
                      }`}
                    >
                      📍 {st}
                    </button>
                  ))}
                </div>

                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 font-medium cursor-pointer"
                  id="withdrawal-station-select"
                >
                  <option value="นครราชสีมา">🚉 นครราชสีมา</option>
                  <option value="ชุมทางถนนจิระ">🚉 ชุมทางถนนจิระ</option>
                  <option value="บ้านเกาะ">🚉 บ้านเกาะ</option>
                  <option value="บ้านกระโดน">🚉 บ้านกระโดน</option>
                  <option value="หนองแมว">🚉 หนองแมว</option>
                  <option value="โนนสูง">🚉 โนนสูง</option>
                  <option value="บ้านดงพลอง">🚉 บ้านดงพลอง</option>
                  <option value="บ้านมะค่า">🚉 บ้านมะค่า</option>
                  <option value="พลสงคราม">🚉 พลสงคราม</option>
                  <option value="บ้านดอนใหญ่">🚉 บ้านดอนใหญ่</option>
                  <option value="เมืองคง">🚉 เมืองคง</option>
                  <option value="โนนทองหลาง">🚉 โนนทองหลาง</option>
                  <option value="ชุมทางบัวใหญ่">🚉 ชุมทางบัวใหญ่</option>
                  <option value="หนองบัวลาย">🚉 หนองบัวลาย</option>
                  <option value="หนองมะเขือ">🚉 หนองมะเขือ</option>
                  <option value="เมืองพล">🚉 เมืองพล</option>
                  <option value="บ้านหัน">🚉 บ้านหัน</option>
                  <option value="บ้านไผ่">🚉 บ้านไผ่</option>
                  <option value="บ้านแฮด">🚉 บ้านแฮด</option>
                  <option value="ท่าพระ">🚉 ท่าพระ</option>
                  <option value="ขอนแก่น">🚉 ขอนแก่น</option>
                  <option value="สำราญ">🚉 สำราญ</option>
                  <option value="โนนพยอม">🚉 โนนพยอม</option>
                  <option value="น้ำพอง">🚉 น้ำพอง</option>
                  <option value="ห้วยเสียว">🚉 ห้วยเสียว</option>
                  <option value="เขาสวนกวาง">🚉 เขาสวนกวาง</option>
                  <option value="โนนสะอาด">🚉 โนนสะอาด</option>
                  <option value="ห้วยเกิ้ง">🚉 ห้วยเกิ้ง</option>
                  <option value="กุมภวาปี">🚉 กุมภวาปี</option>
                  <option value="ห้วยสามพาด">🚉 ห้วยสามพาด</option>
                  <option value="หนองตะไก้">🚉 หนองตะไก้</option>
                  <option value="หนองขอนกว้าง">🚉 หนองขอนกว้าง</option>
                  <option value="อุดรธานี">🚉 อุดรธานี</option>
                  <option value="นาพู่">🚉 นาพู่</option>
                  <option value="นาทา">🚉 นาทา</option>
                  <option value="หนองคาย">🚉 หนองคาย</option>
                  <option value="ระบุสถานีอื่น...">✏️ ระบุสถานีอื่น...</option>
                </select>
              </div>

              {/* 2. เหตุผลที่เบิก / หมายเหตุ */}
              <div className="space-y-2" id="withdrawal-note-field">
                <label className="block text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span>เหตุผลที่เบิก / หมายเหตุประจำบิล</span>
                  </span>
                  {note && (
                    <button
                      type="button"
                      onClick={() => setNote('')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ล้างข้อความ
                    </button>
                  )}
                </label>

                {/* Preset Note Pills */}
                <div className="flex flex-wrap gap-1.5" id="withdrawal-preset-notes">
                  {[
                    '📝 เบิกใช้งานประจำวัน',
                    '🛠️ สำรองคลังประจำสถานี',
                    '🚨 เบิกซ่อมบำรุงด่วน',
                    '🚆 เบิกส่งขบวนรถไฟ',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNote(preset)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer shadow-2xs ${
                        note === preset
                          ? 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50/50 hover:border-rose-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="เช่น เบิกส่งขบวนรถไฟ, ช่างเบิกซ่อมบำรุงประจำเดือน"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 font-medium"
                  id="withdrawal-note-input"
                />
              </div>
            </div>

            {/* Custom Station Input */}
            <AnimatePresence>
              {station === 'ระบุสถานีอื่น...' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="space-y-2 overflow-hidden"
                  id="custom-station-field"
                >
                  <label className="block text-xs font-bold text-slate-500">ระบุชื่อสถานีใหม่ *</label>
                  <input
                    type="text"
                    placeholder="เช่น แผนกบัญชี, บูธกิจกรรมพิเศษ"
                    value={customStation}
                    onChange={(e) => setCustomStation(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-indigo-200 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    id="withdrawal-custom-station-input"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end" id="withdrawal-submit-wrapper">
            <button
              type="submit"
              disabled={isMutating || withdrawalItems.length === 0 || totalSummary.hasExceededStock}
              className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 px-8 rounded-xl shadow-md hover:shadow-lg transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed w-full md:w-auto text-sm cursor-pointer"
              id="withdrawal-submit-btn"
            >
              {isMutating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>กำลังบันทึกบิลลง Google Sheets...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>ออกใบเบิกพัสดุ ({totalSummary.totalTypes} รายการ)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bill Cards List (รายการใบเบิกพัสดุ / ติดตามการจัดส่งแบบรวมบิล) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="recent-withdrawals-card">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 flex-wrap">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>รายการใบเบิกพัสดุ (Orders/Bills) & ติดตามการจัดส่ง</span>
              {!isAdmin && (
                <span className="text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                  👤 เฉพาะบัญชีของคุณ ({currentUserEmail || 'ผู้ใช้งาน'})
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              {isAdmin
                ? 'แสดงรายการพัสดุที่จัดกลุ่มอยู่ในบิลเดียวกัน สามารถดูใบเบิก ปรับสถานะ หรือพิมพ์เอกสารได้'
                : 'แสดงรายการใบเบิกพัสดุเฉพาะบัญชีของคุณ สามารถติดตามสถานะและพิมพ์ใบเบิกได้'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-200/60 p-1 rounded-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setWithdrawalFilter('รอดำเนินการ')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                withdrawalFilter === 'รอดำเนินการ'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📦 รอดำเนินการ</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-100 text-rose-700 rounded-full font-extrabold">
                {billCounts.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWithdrawalFilter('จัดส่งสำเร็จ')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                withdrawalFilter === 'จัดส่งสำเร็จ'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>✅ จัดส่งสำเร็จแล้ว</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-700 rounded-full font-extrabold">
                {billCounts.completed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWithdrawalFilter('ทั้งหมด')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                withdrawalFilter === 'ทั้งหมด'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📋 ทั้งหมด</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-slate-200 text-slate-700 rounded-full font-extrabold">
                {billCounts.total}
              </span>
            </button>
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {withdrawalFilter === 'รอดำเนินการ' ? (
              <p className="text-emerald-600 font-bold flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>ไม่มีใบเบิกที่รอดำเนินการจัดส่ง (จัดส่งสำเร็จทั้งหมดแล้ว)</span>
              </p>
            ) : (
              <p>ไม่พบรายการใบเบิกพัสดุในหมวดนี้</p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4" id="bills-list-container">
            {filteredBills.map((bill) => (
              <div
                key={bill.billId}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden hover:border-slate-300 transition"
                id={`bill-card-${bill.billId}`}
              >
                {/* Bill Header */}
                <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                      ใบเบิก #{bill.billId}
                    </span>
                    <span className="font-bold text-xs text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {bill.station}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {bill.timestamp}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1" title={bill.userEmail}>
                      <User className="w-3 h-3 text-slate-400" />
                      {bill.userEmail.split('@')[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {renderShippingBadge(bill.shippingStatus, bill.items)}

                    {/* Batch status controls for the entire bill (Admin only) */}
                    {isAdmin && onUpdateShippingStatus && (
                      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateBillStatus(bill, 'จัดส่งสำเร็จ')}
                          className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                          title="ตั้งค่าทุกรายการในบิลนี้เป็น 'จ่ายได้'"
                        >
                          <span>✅ จ่ายได้ทั้งหมด</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateBillStatus(bill, 'ยกเลิกการจัดส่ง')}
                          className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                          title="ตั้งค่าทุกรายการในบิลนี้เป็น 'จ่ายไม่ได้'"
                        >
                          <span>❌ จ่ายไม่ได้ทั้งหมด</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedBillForPrint(bill)}
                      className="text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="พิมพ์ / พรีวิวใบเบิกและใบส่งสิ่งของ (แบบ ส.๑๖/๔๖)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>🖨️ พิมพ์ใบเบิก</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBillForDeliveryNote(bill)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        bill.shippingStatus === 'อยู่ระหว่างจัดส่ง'
                          ? 'text-white bg-sky-600 hover:bg-sky-700 ring-2 ring-sky-300 animate-pulse'
                          : 'text-sky-700 hover:text-white bg-sky-50 hover:bg-sky-600 border border-sky-200'
                      }`}
                      title="พิมพ์ / พรีวิวใบนำส่ง (แทนแบบที่ 13 การรถไฟแห่งประเทศไทย)"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>🚚 พิมพ์ใบนำส่ง (แบบ 13)</span>
                    </button>
                  </div>
                </div>

                {/* Items Table inside Bill */}
                <div className="p-4 space-y-3">
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {bill.items.map((item, idx) => {
                      const prod = products.find((p) => p.id === item.productId);
                      return (
                        <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 hover:bg-slate-50/80 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-slate-400 font-bold w-5 text-center shrink-0 text-sm">
                              {idx + 1}.
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-800 truncate text-sm">{item.productName}</p>
                                {renderItemStatusBadge(item.shippingStatus)}
                              </div>
                              <p className="font-mono text-[10px] text-slate-400">รหัสพัสดุ: {item.productId}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <div className="text-right">
                              <span className="font-extrabold text-sm text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 block">
                                -{item.quantity.toLocaleString('th-TH')} {prod?.unit || 'ชิ้น'}
                              </span>
                            </div>

                            {/* Item-level status selection: จ่ายได้ / จ่ายไม่ได้ (Admin only) */}
                            {isAdmin && onUpdateShippingStatus && (
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => onUpdateShippingStatus(item.id, 'จัดส่งสำเร็จ')}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                    item.shippingStatus === 'จัดส่งสำเร็จ'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                                  }`}
                                  title="ระบุว่ารายการนี้จ่ายได้ / จัดส่งสำเร็จ"
                                >
                                  <span>✅ จ่ายได้</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onUpdateShippingStatus(item.id, 'ยกเลิกการจัดส่ง')}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                    item.shippingStatus === 'ยกเลิกการจัดส่ง'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                                  }`}
                                  title="ระบุว่ารายการนี้จ่ายไม่ได้ / ไม่พร้อมจ่าย"
                                >
                                  <span>❌ จ่ายไม่ได้</span>
                                </button>

                                <select
                                  value={item.shippingStatus || 'กำลังเตรียมจัดส่ง'}
                                  onChange={(e) => onUpdateShippingStatus(item.id, e.target.value as ShippingStatus)}
                                  className="text-[11px] bg-white border border-slate-200 rounded-md px-1.5 py-1 font-medium text-slate-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-rose-500"
                                  title="เลือกสถานะย่อยของรายการนี้"
                                >
                                  <option value="กำลังเตรียมจัดส่ง">📦 รอตรวจสอบ</option>
                                  <option value="อยู่ระหว่างจัดส่ง">🚚 อยู่ระหว่างจัดส่ง</option>
                                  <option value="จัดส่งสำเร็จ">✅ จ่ายได้</option>
                                  <option value="ยกเลิกการจัดส่ง">❌ จ่ายไม่ได้</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bill Footer Note & Summary Breakdown */}
                  {(() => {
                    const approvedCount = bill.items.filter((i) => i.shippingStatus === 'จัดส่งสำเร็จ').length;
                    const rejectedCount = bill.items.filter((i) => i.shippingStatus === 'ยกเลิกการจัดส่ง').length;
                    const pendingCount = bill.items.length - (approvedCount + rejectedCount);

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-1 gap-2">
                        <p className="flex items-center gap-1.5 text-slate-600 font-medium truncate">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>หมายเหตุ: <strong className="text-slate-800">{bill.note || 'เบิกใช้งานตามปกติ'}</strong></span>
                        </p>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            จ่ายได้: {approvedCount}
                          </span>
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            จ่ายไม่ได้: {rejectedCount}
                          </span>
                          {pendingCount > 0 && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                              รอจ่าย: {pendingCount}
                            </span>
                          )}
                          <div className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                            รวมพัสดุในบิลนี้: <span className="text-rose-600">{bill.items.length}</span> รายการ ({bill.totalQuantity.toLocaleString('th-TH')} ชิ้น)
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" id="confirm-modal-overlay">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 z-10 text-left"
              id="confirm-modal-card"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-full shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-800">
                    ยืนยันการออกใบเบิกพัสดุ ({withdrawalItems.length} รายการ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    สถานีปลายทาง: <strong className="text-indigo-600 font-bold">{station === 'ระบุสถานีอื่น...' ? customStation.trim() : station}</strong>
                  </p>
                </div>
              </div>

              {/* Items Summary in Modal */}
              <div className="max-h-48 overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-3 divide-y divide-slate-100 space-y-2">
                {withdrawalItems.map((item, i) => {
                  const prod = products.find((p) => p.id === item.productId);
                  if (!prod) return null;
                  return (
                    <div key={item.productId} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-mono text-slate-400 font-bold">{i + 1}.</span>
                        <span className="font-semibold text-slate-800 truncate">{prod.name}</span>
                      </div>
                      <span className="font-bold text-rose-600 shrink-0">
                        -{item.quantity} {prod.unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {isLoggedIn ? (
                <p className="text-[11px] text-indigo-600 font-medium leading-normal pt-1 border-t border-slate-50">
                  📝 ข้อมูลพัสดุทุกรายการจะถูกหักออกจากคลัง และบันทึกลง Google Sheets ในรหัสบิลเดียวกัน
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 font-medium leading-normal pt-1 border-t border-slate-50">
                  ⚠️ คุณอยู่ในโหมดทดลองใช้งาน รายการจะถูกหักสต๊อกชั่วคราวในหน่วยความจำเท่านั้น
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
                  onClick={handleConfirmWithdrawal}
                  disabled={isMutating}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-sm hover:shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isMutating ? 'กำลังบันทึกบิล...' : 'ยืนยันออกใบเบิก'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sticky Floating Checkout Bar for Quick Requisitioning */}
      {withdrawalItems.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 z-40 max-w-lg md:w-auto" id="sticky-checkout-bar">
          <div className="bg-slate-900/90 text-white p-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700/80 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-extrabold text-slate-100 truncate">
                  📍 {station === 'ระบุสถานีอื่น...' ? customStation || 'ไม่ระบุสถานี' : station}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                รวมพัสดุในบิล <strong className="text-white">{totalSummary.totalTypes}</strong> รายการ ({totalSummary.totalUnits} ชิ้น)
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('withdrawal-submit-btn');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.focus();
                }
              }}
              disabled={isMutating || totalSummary.hasExceededStock}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <span>🚀 ยืนยันออกใบเบิก</span>
            </button>
          </div>
        </div>
      )}

      {/* Official Printable Bill Voucher Modal */}
      <OfficialVoucherModal
        bill={selectedBillForPrint}
        products={products}
        onClose={() => setSelectedBillForPrint(null)}
        userRoles={userRoles}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        onOpenDeliveryNote={() => {
          setSelectedBillForDeliveryNote(selectedBillForPrint);
          setSelectedBillForPrint(null);
        }}
      />

      {/* Delivery Note Modal (แทนแบบที่ 13 การรถไฟแห่งประเทศไทย) */}
      <DeliveryNoteModal
        bill={selectedBillForDeliveryNote}
        products={products}
        onClose={() => setSelectedBillForDeliveryNote(null)}
        userRoles={userRoles}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
}
