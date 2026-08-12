import { useState, useMemo } from 'react';
import { Product, Transaction, ShippingStatus } from '../types';
import {
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ClipboardList,
  DollarSign,
  PackageCheck,
  PackageOpen,
  User,
  Clock,
  ChevronRight,
  Inbox,
  Truck,
  Search,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { LockedScreen } from './LoginScreen';
import { ProductThumbnail } from './ProductManagement';
import { DeliveryNoteModal } from './DeliveryNoteModal';
import { WithdrawalBill } from './StockWithdrawal';

interface InventoryReportProps {
  products: Product[];
  transactions: Transaction[];
  isLoggedIn: boolean;
  onLogin: () => void;
  isLoggingIn: boolean;
  onNavigateToIntake: (productId: string) => void;
  onNavigateToWithdrawal?: (productId: string) => void;
  onUpdateShippingStatus?: (transactionId: string, newStatus: ShippingStatus) => Promise<void>;
  isAdmin?: boolean;
  currentUserEmail?: string;
}

// Helper to parse and render note with optional bill ID and station prefix
const renderTransactionNote = (note: string) => {
  if (!note) return '-';

  let billId = '';
  let station = '';
  let cleanNote = note;

  const billMatch = note.match(/\[(?:ใบเบิก|ใบรับเข้า|เลขที่บิล|บิล):\s*([^\]]+)\]/);
  if (billMatch) {
    billId = billMatch[1].trim();
  }

  const stationMatch = note.match(/\[สถานี:\s*([^\]]+)\]/);
  if (stationMatch) {
    station = stationMatch[1].trim();
  }

  cleanNote = cleanNote
    .replace(/\[(?:ใบเบิก|ใบรับเข้า|เลขที่บิล|บิล):\_s*[^\]]+\]/g, '')
    .replace(/\[(?:ใบเบิก|ใบรับเข้า|เลขที่บิล|บิล):\s*[^\]]+\]/g, '')
    .replace(/\[สถานี:\s*[^\]]+\]/g, '')
    .trim();

  if (billId || station) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 py-0.5">
        {billId && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
            📄 {billId}
          </span>
        )}
        {station && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 shrink-0 font-sans">
            📍 {station}
          </span>
        )}
        <span className="truncate text-slate-600 font-medium">{cleanNote || 'เบิกใช้งานตามปกติ'}</span>
      </div>
    );
  }
  return <span className="text-slate-500 italic">{note}</span>;
};

// Helper to render Shipping Status Badge
const renderShippingStatusBadge = (status?: ShippingStatus, type?: 'รับเข้า' | 'เบิกออก') => {
  const s = status || (type === 'เบิกออก' ? 'อยู่ระหว่างจัดส่ง' : 'จัดส่งสำเร็จ');
  
  switch (s) {
    case 'กำลังเตรียมจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
          📦 กำลังเตรียมจัดส่ง
        </span>
      );
    case 'อยู่ระหว่างจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
          🚚 อยู่ระหว่างจัดส่ง
        </span>
      );
    case 'จัดส่งสำเร็จ':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          ✅ จัดส่งสำเร็จ
        </span>
      );
    case 'ยกเลิกการจัดส่ง':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
          ❌ ยกเลิกการจัดส่ง
        </span>
      );
    default:
      return null;
  }
};

// Helper to normalize any date string format to YYYY-MM-DD
const normalizeDateStr = (rawStr: string): string => {
  if (!rawStr) return '';
  const str = rawStr.trim();
  const ymdMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const dmyMatch = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    if (year > 2400) year -= 543;
    return `${year}-${month}-${day}`;
  }
  return str.split(' ')[0] || '';
};

export default function InventoryReport({
  products,
  transactions,
  isLoggedIn,
  onLogin,
  isLoggingIn,
  onNavigateToIntake,
  onNavigateToWithdrawal,
  onUpdateShippingStatus,
  isAdmin = false,
  currentUserEmail,
}: InventoryReportProps) {
  // Format current date in Bangkok (YYYY-MM-DD format for input date standard)
  const todayDateStr = useMemo(() => {
    const d = new Date();
    // adjust to Bangkok time for timezone consistency
    const offset = 7 * 60; // Bangkok is UTC+7
    const localTime = d.getTime() + (d.getTimezoneOffset() + offset) * 60000;
    const localDate = new Date(localTime);
    return localDate.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  const [shippingFilter, setShippingFilter] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBillForDeliveryNote, setSelectedBillForDeliveryNote] = useState<WithdrawalBill | null>(null);

  const handlePrintDeliveryNote = (tx: Transaction) => {
    let billId = tx.id;
    let station = 'สถานีปลายทาง';

    const billMatch = tx.note?.match(/\[(?:ใบเบิก|เลขที่บิล|บิล):\s*([^\]]+)\]/);
    if (billMatch) billId = billMatch[1].trim();

    const stationMatch = tx.note?.match(/\[สถานี:\s*([^\]]+)\]/);
    if (stationMatch) station = stationMatch[1].trim();

    const related = transactions.filter((t) => {
      if (t.type !== 'เบิกออก') return false;
      if (billMatch) {
        return t.note?.includes(`[ใบเบิก: ${billId}]`) || t.note?.includes(`[เลขที่บิล: ${billId}]`);
      }
      return t.timestamp === tx.timestamp && t.userEmail === tx.userEmail;
    });

    const billItems = related.length > 0 ? related : [tx];

    const bill: WithdrawalBill = {
      billId: billId,
      timestamp: tx.timestamp,
      station: station,
      note: tx.note || '',
      userEmail: tx.userEmail,
      shippingStatus: tx.shippingStatus || 'กำลังเตรียมจัดส่ง',
      items: billItems,
      totalQuantity: billItems.reduce((acc, curr) => acc + curr.quantity, 0),
    };

    setSelectedBillForDeliveryNote(bill);
  };

  // 1. Alert System: Identify low-stock products (quantity <= minStock)
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.quantity <= p.minStock);
  }, [products]);

  // 2. Daily Summary calculations based on selected date
  const dailySummary = useMemo(() => {
    const targetDate = normalizeDateStr(selectedDate);
    const filteredTx = transactions.filter((tx) => {
      const txDate = normalizeDateStr(tx.timestamp);
      if (txDate !== targetDate) return false;
      if (!isAdmin && tx.type === 'เบิกออก' && currentUserEmail) {
        return (tx.userEmail || '').trim().toLowerCase() === currentUserEmail.trim().toLowerCase();
      }
      return true;
    });

    let totalInQty = 0;
    let totalOutQty = 0;
    let totalInValue = 0;
    let totalOutValue = 0;

    filteredTx.forEach((tx) => {
      // Find product price
      const prod = products.find((p) => p.id === tx.productId);
      const price = prod ? prod.price : 0;
      const txValue = tx.quantity * price;

      if (tx.type === 'รับเข้า') {
        totalInQty += tx.quantity;
        totalInValue += txValue;
      } else {
        totalOutQty += tx.quantity;
        totalOutValue += txValue;
      }
    });

    return {
      transactions: filteredTx,
      totalInTransactions: filteredTx.filter((t) => t.type === 'รับเข้า').length,
      totalOutTransactions: filteredTx.filter((t) => t.type === 'เบิกออก').length,
      totalInQuantity: totalInQty,
      totalOutQuantity: totalOutQty,
      totalInValue: totalInValue,
      totalOutValue: totalOutValue,
    };
  }, [transactions, selectedDate, products]);

  // Filtered transactions for daily log list based on shippingFilter and searchQuery
  const displayedTransactions = useMemo(() => {
    let list = dailySummary.transactions;

    if (shippingFilter === 'เฉพาะรอดำเนินการ') {
      list = list.filter((tx) => {
        if (tx.type === 'รับเข้า') return false;
        const status = tx.shippingStatus || 'กำลังเตรียมจัดส่ง';
        return status !== 'จัดส่งสำเร็จ' && status !== 'ยกเลิกการจัดส่ง';
      });
    } else if (shippingFilter !== 'ทั้งหมด') {
      list = list.filter((tx) => {
        const status = tx.shippingStatus || (tx.type === 'เบิกออก' ? 'กำลังเตรียมจัดส่ง' : 'จัดส่งสำเร็จ');
        return status === shippingFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (tx) =>
          tx.productName.toLowerCase().includes(q) ||
          tx.id.toLowerCase().includes(q) ||
          tx.productId.toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q) ||
          (tx.userEmail || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [dailySummary.transactions, shippingFilter, searchQuery]);

  // 3. 7-Day Trend Chart Data Calculations
  // Get sum of in/out quantities for the last 7 days ending on selectedDate
  const chartData = useMemo(() => {
    const data: Array<{ date: string; displayDate: string; inQty: number; outQty: number }> = [];
    const baseDate = new Date(selectedDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Thai formatted display date like "19 ก.ค."
      const displayStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

      // Filter transactions for this day
      let dayInQty = 0;
      let dayOutQty = 0;

      transactions.forEach((tx) => {
        const txDate = normalizeDateStr(tx.timestamp);
        if (txDate === dateStr) {
          if (tx.type === 'รับเข้า') {
            dayInQty += tx.quantity;
          } else {
            dayOutQty += tx.quantity;
          }
        }
      });

      data.push({
        date: dateStr,
        displayDate: displayStr,
        inQty: dayInQty,
        outQty: dayOutQty,
      });
    }

    return data;
  }, [transactions, selectedDate]);

  // Max value in chart for scale calculation
  const chartMaxVal = useMemo(() => {
    let max = 10; // default minimum ceiling
    chartData.forEach((d) => {
      if (d.inQty > max) max = d.inQty;
      if (d.outQty > max) max = d.outQty;
    });
    return Math.ceil(max * 1.15); // Add 15% headroom
  }, [chartData]);

  // If NOT logged in, show Locked Screen
  if (!isLoggedIn) {
    return (
      <LockedScreen
        onLogin={onLogin}
        isLoggingIn={isLoggingIn}
        pageTitle="รายงานสรุปสต๊อกพัสดุคงเหลือ"
      />
    );
  }

  return (
    <div className="space-y-8" id="report-root">
      
      {/* 1. Low Stock Alerts Center */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="alert-center">
        <div className="flex items-center gap-3 mb-4" id="alert-header">
          <div className={`p-2 rounded-xl shrink-0 ${lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">ระบบแจ้งเตือนพัสดุใกล้หมดคลัง</h3>
            <p className="text-slate-400 text-xs">คำนวณจากยอดคงเหลือที่ต่ำกว่าหรือเท่ากับเกณฑ์ขั้นต่ำที่กำหนดไว้</p>
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-3" id="all-good-alert">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>ยอดเยี่ยม! พัสดุทุกรายการมีปริมาณเพียงพอและไม่ตกเกณฑ์พัสดุใกล้หมดคลัง</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" id="low-stock-grid">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="bg-amber-50/30 hover:bg-amber-50/70 border border-amber-100/70 p-4 rounded-xl flex justify-between items-center transition gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProductThumbnail src={p.imageUrl} alt={p.name} size="md" />
                  <div className="space-y-0.5 truncate">
                    <span className="font-mono text-[9px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                      {p.id}
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm truncate">{p.name}</h4>
                    <p className="text-rose-600 text-xs font-bold">
                      คงเหลือ: {p.quantity} {p.unit} <span className="text-slate-400 font-normal text-[11px]">(ขั้นต่ำ: {p.minStock})</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-1.5 shrink-0" id={`alert-actions-${p.id}`}>
                  {(!isLoggedIn || isAdmin) && (
                    <button
                      onClick={() => onNavigateToIntake(p.id)}
                      className="flex items-center justify-center gap-1 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 text-emerald-700 text-[11px] font-bold py-1.5 px-2.5 rounded-lg shadow-sm transition"
                      title="รับพัสดุเข้าคลังเพิ่มเติม"
                      id={`btn-alert-intake-${p.id}`}
                    >
                      <span>รับเพิ่ม</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {onNavigateToWithdrawal && (
                    <button
                      onClick={() => onNavigateToWithdrawal(p.id)}
                      className="flex items-center justify-center gap-1 bg-white hover:bg-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-rose-700 text-[11px] font-bold py-1.5 px-2.5 rounded-lg shadow-sm transition"
                      title="เบิกพัสดุออกจากคลัง"
                      id={`btn-alert-withdraw-${p.id}`}
                    >
                      <span>เบิกออก</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Daily Summary Report Grid */}
      <div className="space-y-4" id="daily-summary-section">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="daily-header-panel">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">รายงานสรุปผลรายวัน</h3>
            <p className="text-slate-400 text-xs">ความเคลื่อนไหวยอดพัสดุเข้า-ออกและมูลค่ารวมประจำวัน</p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 w-full md:w-auto" id="date-picker-wrapper">
            <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none focus:ring-0 text-slate-700 text-xs font-bold w-full"
              id="report-date-selector"
            />
          </div>
        </div>

        {/* Core Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="metrics-grid">
          {/* Card 1: Receipts Qty */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4" id="metric-1">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">จำนวนรับเข้าสะสม</span>
              <span className="text-lg font-bold text-slate-800">
                {dailySummary.totalInQuantity.toLocaleString('th-TH')} ชิ้น
              </span>
              <span className="text-[10px] text-slate-400 block">({dailySummary.totalInTransactions} รายการ)</span>
            </div>
          </div>

          {/* Card 2: Receipts Value */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4" id="metric-2">
            <div className="p-3.5 bg-emerald-50/70 text-emerald-700 rounded-2xl shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">มูลค่าพัสดุรับเข้า</span>
              <span className="text-lg font-bold text-emerald-600">
                ฿{dailySummary.totalInValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block">ประเมินมูลค่าต้นทุน</span>
            </div>
          </div>

          {/* Card 3: Withdrawals Qty */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4" id="metric-3">
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">จำนวนเบิกออกสะสม</span>
              <span className="text-lg font-bold text-slate-800">
                {dailySummary.totalOutQuantity.toLocaleString('th-TH')} ชิ้น
              </span>
              <span className="text-[10px] text-slate-400 block">({dailySummary.totalOutTransactions} รายการ)</span>
            </div>
          </div>

          {/* Card 4: Withdrawals Value */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4" id="metric-4">
            <div className="p-3.5 bg-rose-50/70 text-rose-700 rounded-2xl shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">มูลค่าพัสดุเบิกออก</span>
              <span className="text-lg font-bold text-rose-600">
                ฿{dailySummary.totalOutValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block">ประเมินมูลค่าการเบิก</span>
            </div>
          </div>
        </div>

        {/* Custom Visual SVG Chart & Remaining Inventory Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="report-visual-grid">
          
          {/* Column 1 & 2: 7-Day Trend Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col" id="chart-card">
            <div className="mb-4" id="chart-header">
              <h4 className="font-bold text-slate-800 text-sm">กราฟสรุปความเคลื่อนไหวย้อนหลัง 7 วัน</h4>
              <p className="text-slate-400 text-xs">เปรียบเทียบสัดส่วนยอดการรับพัสดุเข้าและการเบิกออกคลัง (ชิ้น)</p>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="flex-1 min-h-[220px] flex items-end justify-center pt-4" id="chart-viewport">
              <svg className="w-full h-56" viewBox="0 0 500 220" id="trend-svg">
                {/* Horizontal Guide Lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="65" x2="480" y2="65" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="110" x2="480" y2="110" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="155" x2="480" y2="155" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="180" x2="480" y2="180" stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Y-Axis scale label */}
                <text x="10" y="24" className="text-[10px] fill-slate-400 font-bold font-mono">{(chartMaxVal).toLocaleString('th-TH')}</text>
                <text x="10" y="104" className="text-[10px] fill-slate-400 font-bold font-mono">{Math.round(chartMaxVal / 2).toLocaleString('th-TH')}</text>
                <text x="10" y="184" className="text-[10px] fill-slate-400 font-bold font-mono">0</text>

                {/* Draw side-by-side columns */}
                {chartData.map((d, index) => {
                  const xBase = 40 + index * 62 + 10;
                  // Map values to coordinates
                  const inBarHeight = (d.inQty / chartMaxVal) * 160;
                  const outBarHeight = (d.outQty / chartMaxVal) * 160;

                  return (
                    <g key={d.date} className="group cursor-pointer">
                      {/* Tooltip trigger helpers */}
                      <title>{`วันที่: ${d.date}\nรับเข้า: ${d.inQty} ชิ้น\nเบิกออก: ${d.outQty} ชิ้น`}</title>

                      {/* Intake Bar (Green) */}
                      <rect
                        x={xBase}
                        y={180 - inBarHeight}
                        width="14"
                        height={Math.max(2, inBarHeight)}
                        rx="3"
                        className="fill-emerald-500 hover:fill-emerald-600 transition-colors"
                      />

                      {/* Outtake Bar (Red) */}
                      <rect
                        x={xBase + 18}
                        y={180 - outBarHeight}
                        width="14"
                        height={Math.max(2, outBarHeight)}
                        rx="3"
                        className="fill-rose-500 hover:fill-rose-600 transition-colors"
                      />

                      {/* Date label */}
                      <text
                        x={xBase + 16}
                        y="200"
                        textAnchor="middle"
                        className="text-[9px] fill-slate-500 font-bold"
                      >
                        {d.displayDate}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend indicators */}
            <div className="flex gap-4 justify-center text-[10px] text-slate-500 font-bold pt-2 border-t border-slate-50" id="chart-legend">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500"></div>
                <span>รับพัสดุเข้า (ชิ้น)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-500"></div>
                <span>เบิกพัสดุออก (ชิ้น)</span>
              </div>
            </div>
          </div>

          {/* Column 3: Quick Inventory Level Status */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col" id="inventory-status-card">
            <div className="mb-4" id="inv-status-header">
              <h4 className="font-bold text-slate-800 text-sm">สัดส่วนพัสดุคงคลังคงเหลือ</h4>
              <p className="text-slate-400 text-xs">ตรวจเช็กภาพรวมระดับพัสดุ 5 รายการแรก</p>
            </div>

            <div className="space-y-4 flex-1" id="inv-status-list">
              {products.slice(0, 5).map((p) => {
                const ratio = Math.min(100, (p.quantity / (p.minStock * 2 || 10)) * 100);
                const isLow = p.quantity <= p.minStock;

                return (
                  <div key={p.id} className="space-y-1.5" id={`inv-status-item-${p.id}`}>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-700 truncate max-w-[150px]">{p.name}</span>
                      <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-500'}`}>
                        {p.quantity} {p.unit}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : 'bg-indigo-600'}`}
                        style={{ width: `${ratio}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Transaction Log List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="daily-tx-log-card">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2" id="tx-log-header">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              <span>ประวัติรายการประจำวัน ({dailySummary.transactions.length} รายการ)</span>
            </h4>
            <span className="text-[11px] font-bold text-slate-400">
              วันที่ {new Date(selectedDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}
            </span>
          </div>

          {/* Search & Shipping Status Filter Bar */}
          <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3" id="tx-shipping-filter-bar">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อพัสดุ / รหัสบิล / ผู้เบิก..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5" id="tx-shipping-filter-tabs">
              <div className="flex items-center gap-1 text-xs text-slate-500 font-bold mr-1">
                <Truck className="w-3.5 h-3.5 text-sky-500" />
                <span>สถานะ:</span>
              </div>
              {['เฉพาะรอดำเนินการ', 'ทั้งหมด', 'กำลังเตรียมจัดส่ง', 'อยู่ระหว่างจัดส่ง', 'จัดส่งสำเร็จ', 'ยกเลิกการจัดส่ง'].map((filterItem) => {
                const isActive = shippingFilter === filterItem;
                return (
                  <button
                    key={filterItem}
                    type="button"
                    onClick={() => setShippingFilter(filterItem)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterItem}
                  </button>
                );
              })}
            </div>
          </div>

          {displayedTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs" id="tx-log-empty">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <span>ไม่พบรายการที่ตรงกับสถานะจัดส่งหรือวันที่นี้</span>
            </div>
          ) : (
            <div className="overflow-x-auto" id="tx-log-table-wrapper">
              <table className="w-full text-left text-xs" id="tx-log-table">
                <thead className="bg-slate-50/50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">รหัสรายการ</th>
                    <th className="py-3 px-6">เวลา</th>
                    <th className="py-3 px-6">ประเภท</th>
                    <th className="py-3 px-6">พัสดุ</th>
                    <th className="py-3 px-6 text-right">จำนวน</th>
                    <th className="py-3 px-6">สถานะการจัดส่ง</th>
                    <th className="py-3 px-6">ผู้ทำรายการ</th>
                    <th className="py-3 px-6">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-400">{tx.id}</td>
                      <td className="py-3.5 px-6 font-mono text-slate-500">
                        {tx.timestamp.split(' ')[1] || tx.timestamp}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.type === 'รับเข้า' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-slate-700">{tx.productName}</td>
                      <td className="py-3.5 px-6 text-right font-bold text-slate-800">{tx.quantity.toLocaleString('th-TH')}</td>
                      <td className="py-3.5 px-6">
                        {tx.type === 'เบิกออก' ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {renderShippingStatusBadge(tx.shippingStatus, tx.type)}

                            <button
                              type="button"
                              onClick={() => handlePrintDeliveryNote(tx)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 border shadow-2xs ${
                                tx.shippingStatus === 'อยู่ระหว่างจัดส่ง'
                                  ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700 animate-pulse'
                                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'
                              }`}
                              title="พิมพ์ / พรีวิวใบนำส่ง (แทนแบบที่ 13 การรถไฟแห่งประเทศไทย)"
                            >
                              <Truck className="w-3 h-3" />
                              <span>พิมพ์ใบนำส่ง (แบบ 13)</span>
                            </button>

                            {isAdmin && onUpdateShippingStatus && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onUpdateShippingStatus(tx.id, 'จัดส่งสำเร็จ')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                    tx.shippingStatus === 'จัดส่งสำเร็จ'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                  title="เปลี่ยนสถานะเป็น 'จัดส่งสำเร็จ/จ่ายได้'"
                                >
                                  ✅ จ่ายได้
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateShippingStatus(tx.id, 'ยกเลิกการจัดส่ง')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                    tx.shippingStatus === 'ยกเลิกการจัดส่ง'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  }`}
                                  title="เปลี่ยนสถานะเป็น 'ยกเลิก/จ่ายไม่ได้'"
                                >
                                  ❌ จ่ายไม่ได้
                                </button>
                                <select
                                  value={tx.shippingStatus || 'กำลังเตรียมจัดส่ง'}
                                  onChange={(e) => onUpdateShippingStatus(tx.id, e.target.value as ShippingStatus)}
                                  className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  title="คลิกเพื่อปรับเปลี่ยนสถานะการจัดส่ง"
                                >
                                  <option value="กำลังเตรียมจัดส่ง">📦 กำลังเตรียมจัดส่ง</option>
                                  <option value="อยู่ระหว่างจัดส่ง">🚚 อยู่ระหว่างจัดส่ง</option>
                                  <option value="จัดส่งสำเร็จ">✅ จัดส่งสำเร็จ</option>
                                  <option value="ยกเลิกการจัดส่ง">❌ ยกเลิกการจัดส่ง</option>
                                </select>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">✅ จัดส่งสำเร็จ (รับเข้า)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-[10px]" title={tx.userEmail}>
                        {tx.userEmail.split('@')[0]}
                      </td>
                      <td className="py-3.5 px-6 max-w-xs" title={tx.note}>
                        {renderTransactionNote(tx.note)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Note Modal (แทนแบบที่ 13 การรถไฟแห่งประเทศไทย) */}
      <DeliveryNoteModal
        bill={selectedBillForDeliveryNote}
        products={products}
        onClose={() => setSelectedBillForDeliveryNote(null)}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
}
