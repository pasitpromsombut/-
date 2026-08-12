import { useState, useMemo, FormEvent } from 'react';
import { Product } from '../types';
import { Search, Plus, Edit2, Trash2, Package, Layers, X, RefreshCw, AlertTriangle, Image as ImageIcon, ArrowUpDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper to parse date string into timestamp for accurate sorting
const parseDateStrToTimestamp = (dateStr?: string): number => {
  if (!dateStr) return 0;
  // Try direct Date parse
  const directDate = new Date(dateStr);
  if (!isNaN(directDate.getTime())) {
    return directDate.getTime();
  }
  // Try parsing Thai string e.g. "9/8/2569, 12:00:00" or "19/7/2026 08:00:00"
  try {
    const cleanStr = dateStr.replace(/,/g, '').trim();
    const parts = cleanStr.split(/\s+/);
    if (parts[0]) {
      const dParts = parts[0].split('/');
      if (dParts.length === 3) {
        let day = parseInt(dParts[0], 10);
        let month = parseInt(dParts[1], 10) - 1;
        let year = parseInt(dParts[2], 10);
        if (year > 2400) year -= 543; // Convert Buddhist Era (BE) to AD
        let hours = 0, minutes = 0, seconds = 0;
        if (parts[1]) {
          const tParts = parts[1].split(':');
          hours = parseInt(tParts[0] || '0', 10);
          minutes = parseInt(tParts[1] || '0', 10);
          seconds = parseInt(tParts[2] || '0', 10);
        }
        const parsed = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(parsed.getTime())) return parsed.getTime();
      } else {
        const hyphenParts = parts[0].split('-');
        if (hyphenParts.length === 3) {
          let year = parseInt(hyphenParts[0], 10);
          let month = parseInt(hyphenParts[1], 10) - 1;
          let day = parseInt(hyphenParts[2], 10);
          if (year > 2400) year -= 543;
          let hours = 0, minutes = 0, seconds = 0;
          if (parts[1]) {
            const tParts = parts[1].split(':');
            hours = parseInt(tParts[0] || '0', 10);
            minutes = parseInt(tParts[1] || '0', 10);
            seconds = parseInt(tParts[2] || '0', 10);
          }
          const parsed = new Date(year, month, day, hours, minutes, seconds);
          if (!isNaN(parsed.getTime())) return parsed.getTime();
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return 0;
};

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (product: Product, index: number) => Promise<void>;
  onDeleteProduct: (index: number) => Promise<void>;
  isMutating: boolean;
  refreshData: () => Promise<void>;
  isLoggedIn: boolean;
  isAdmin?: boolean;
  onNavigateToWithdrawal?: (productId: string) => void;
  onNavigateToIntake?: (productId: string) => void;
}

export const ProductThumbnail = ({ src, alt, size = 'md' }: { src?: string; alt: string; size?: 'sm' | 'md' | 'lg' }) => {
  const [hasError, setHasError] = useState(false);

  const dimensions = {
    sm: 'w-9 h-9 rounded-lg text-xs',
    md: 'w-12 h-12 rounded-xl text-sm',
    lg: 'w-16 h-16 rounded-2xl text-base',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  if (!src || hasError) {
    return (
      <div className={`${dimensions} bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0`}>
        <Package className={iconSizes} />
      </div>
    );
  }

  return (
    <div className={`${dimensions} overflow-hidden border border-slate-200 shrink-0 bg-slate-50 relative`}>
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default function ProductManagement({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  isMutating,
  refreshData,
  isLoggedIn,
  isAdmin = false,
  onNavigateToWithdrawal,
  onNavigateToIntake,
}: ProductManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt_desc' | 'updatedAt_asc' | 'name_asc' | 'name_desc' | 'id_asc' | 'quantity_asc' | 'quantity_desc'>('updatedAt_desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formMinStock, setFormMinStock] = useState(10);
  const [formPrice, setFormPrice] = useState(0);
  const [formUnit, setFormUnit] = useState('ชิ้น');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Auto-generate next sequential ID
  const nextSuggestedId = useMemo(() => {
    let maxNum = 0;
    products.forEach((p) => {
      const match = p.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `PROD${nextNum.toString().padStart(3, '0')}`;
  }, [products]);

  // Open modal for adding
  const handleOpenAdd = () => {
    if (!isLoggedIn || !isAdmin) return;
    setEditingProduct(null);
    setEditingIndex(null);
    setFormId(nextSuggestedId);
    setFormName('');
    setFormCategory('');
    setFormMinStock(10);
    setFormPrice(0);
    setFormUnit('ชิ้น');
    setFormImageUrl('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (product: Product, index: number) => {
    if (!isLoggedIn || !isAdmin) return;
    setEditingProduct(product);
    setEditingIndex(index);
    setFormId(product.id);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormMinStock(product.minStock);
    setFormPrice(product.price);
    setFormUnit(product.unit);
    setFormImageUrl(product.imageUrl || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = async (product: Product, index: number) => {
    if (!isLoggedIn || !isAdmin) return;
    let confirmed = false;
    try {
      confirmed = window.confirm(
        `คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "${product.name}" (รหัส: ${product.id}) ออกจากระบบ?\nการดำเนินการนี้จะลบข้อมูลออกจาก Google Sheets ทันที`
      );
    } catch (e) {
      console.warn('window.confirm is blocked or failed in sandboxed iframe. Auto-confirming action.', e);
      confirmed = true;
    }
    if (confirmed) {
      try {
        await onDeleteProduct(index);
      } catch (err: any) {
        console.error('Delete product error:', err);
        try {
          alert(`เกิดข้อผิดพลาดในการลบสินค้า: ${err.message}`);
        } catch (ae) {
          console.warn('window.alert is blocked in sandboxed iframe.', ae);
        }
      }
    }
  };

  // Handle submit form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formId.trim()) return setFormError('กรุณากรอกรหัสสินค้า');
    if (!formName.trim()) return setFormError('กรุณากรอกชื่อสินค้า');
    if (!formCategory.trim()) return setFormError('กรุณากรอกหมวดหมู่');
    if (formMinStock < 0) return setFormError('ระดับขั้นต่ำแจ้งเตือนต้องไม่ติดลบ');
    if (formPrice < 0) return setFormError('ราคาต่อหน่วยต้องไม่ติดลบ');
    if (!formUnit.trim()) return setFormError('กรุณากรอกหน่วยนับ');

    // Duplicate ID check (only when creating new)
    if (!editingProduct) {
      const isDuplicate = products.some((p) => p.id.toLowerCase() === formId.trim().toLowerCase());
      if (isDuplicate) {
        return setFormError('รหัสสินค้านี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น');
      }
    }

    const targetProduct: Product = {
      id: formId.trim().toUpperCase(),
      name: formName.trim(),
      category: formCategory.trim(),
      quantity: editingProduct ? editingProduct.quantity : 0, // Starts at 0 for new, preserved for edit
      minStock: formMinStock,
      price: formPrice,
      unit: formUnit.trim(),
      updatedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      imageUrl: formImageUrl.trim(),
    };

    try {
      if (editingProduct && editingIndex !== null) {
        let confirmed = false;
        try {
          confirmed = window.confirm(
            `ยืนยันการแก้ไขข้อมูลสินค้า "${editingProduct.name}" เป็น "${targetProduct.name}" ใน Google Sheets?`
          );
        } catch (e) {
          console.warn('window.confirm is blocked or failed in sandboxed iframe. Auto-confirming action.', e);
          confirmed = true;
        }
        if (!confirmed) return;
        await onUpdateProduct(targetProduct, editingIndex);
      } else {
        await onAddProduct(targetProduct);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(`ไม่สามารถบันทึกได้: ${err.message}`);
    }
  };

  // Filtered and sorted products list
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === '' || p.category === selectedCategory;
      const matchesLowStock = !onlyLowStock || p.quantity <= p.minStock;
      return matchesSearch && matchesCategory && matchesLowStock;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'updatedAt_desc') {
        const tA = parseDateStrToTimestamp(a.updatedAt);
        const tB = parseDateStrToTimestamp(b.updatedAt);
        if (tA !== tB) return tB - tA; // Newest date first
        return a.name.localeCompare(b.name, 'th'); // Fallback alphabetical
      }
      if (sortBy === 'updatedAt_asc') {
        const tA = parseDateStrToTimestamp(a.updatedAt);
        const tB = parseDateStrToTimestamp(b.updatedAt);
        if (tA !== tB) return tA - tB; // Oldest date first
        return a.name.localeCompare(b.name, 'th');
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'th');
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name, 'th');
      }
      if (sortBy === 'id_asc') {
        return a.id.localeCompare(b.id, 'th', { numeric: true });
      }
      if (sortBy === 'quantity_asc') {
        return a.quantity - b.quantity;
      }
      if (sortBy === 'quantity_desc') {
        return b.quantity - a.quantity;
      }
      return 0;
    });
  }, [products, searchTerm, selectedCategory, onlyLowStock, sortBy]);

  // Quick Stats
  const totalLowStockCount = useMemo(() => {
    return products.filter((p) => p.quantity <= p.minStock).length;
  }, [products]);

  const totalValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.quantity * p.price, 0);
  }, [products]);

  return (
    <div className="space-y-6" id="product-mgmt-root">
      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="catalog-stats-cards">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">พัสดุในระบบทั้งหมด</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{products.length.toLocaleString('th-TH')} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <button
          onClick={() => {
            setOnlyLowStock(!onlyLowStock);
            if (onlyLowStock) setSelectedCategory('');
          }}
          className={`p-4 rounded-2xl border transition text-left flex items-center justify-between cursor-pointer ${
            onlyLowStock
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white border-slate-100 shadow-2xs hover:border-rose-300'
          }`}
          id="stat-low-stock-btn"
        >
          <div>
            <p className={`text-[11px] font-bold uppercase ${onlyLowStock ? 'text-rose-100' : 'text-slate-400'}`}>
              พัสดุใกล้หมดคลัง
            </p>
            <p className={`text-xl font-black mt-0.5 ${onlyLowStock ? 'text-white' : 'text-rose-600'}`}>
              {totalLowStockCount.toLocaleString('th-TH')} <span className={`text-xs font-normal ${onlyLowStock ? 'text-rose-100' : 'text-slate-500'}`}>รายการ</span>
            </p>
          </div>
          <div className={`p-3 rounded-xl ${onlyLowStock ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">มูลค่าพัสดุคงคลังรวม</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">฿{totalValuation.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Upper bar with filters, search, and sorting */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3" id="filter-panel">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
          {/* Search box with Clear button */}
          <div className="relative w-full md:w-80" id="search-input-wrapper">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ รหัส หรือหมวดหมู่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              id="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap w-full md:w-auto gap-2 shrink-0 justify-end items-center" id="filter-controls">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500" id="sort-selector-wrapper">
              <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs sm:text-sm text-slate-700 focus:outline-none cursor-pointer font-medium"
                id="sort-filter"
              >
                <option value="updatedAt_desc">เรียง: อัปเดตล่าสุด (ใหม่ก่อน)</option>
                <option value="updatedAt_asc">เรียง: อัปเดตล่าสุด (เก่าก่อน)</option>
                <option value="name_asc">เรียง: ชื่อสินค้า (ก - ฮ)</option>
                <option value="name_desc">เรียง: ชื่อสินค้า (ฮ - ก)</option>
                <option value="id_asc">เรียง: รหัสสินค้า</option>
                <option value="quantity_asc">เรียง: จำนวนคงเหลือ (น้อยก่อน)</option>
                <option value="quantity_desc">เรียง: จำนวนคงเหลือ (มากก่อน)</option>
              </select>
            </div>

            <button
              onClick={refreshData}
              disabled={isMutating}
              className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition duration-150 disabled:opacity-50 cursor-pointer"
              title="รีเฟรชข้อมูล"
              id="refresh-btn"
            >
              <RefreshCw className={`w-4 h-4 ${isMutating ? 'animate-spin' : ''}`} />
            </button>

            {isLoggedIn && isAdmin && (
              <button
                onClick={handleOpenAdd}
                disabled={isMutating}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-xl shadow-sm hover:shadow transition duration-150 disabled:opacity-50 cursor-pointer"
                id="add-prod-btn"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มพัสดุ</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Category Filter Pills (1-Click selection) */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" id="category-pills">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">หมวดหมู่:</span>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('');
              setOnlyLowStock(false);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              selectedCategory === '' && !onlyLowStock
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({products.length})
          </button>

          {totalLowStockCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setOnlyLowStock(!onlyLowStock);
                setSelectedCategory('');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                onlyLowStock
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              ⚠️ สินค้าใกล้หมด ({totalLowStockCount})
            </button>
          )}

          {categories.map((cat) => {
            const catCount = products.filter((p) => p.category === cat).length;
            const isSelected = selectedCategory === cat && !onlyLowStock;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setOnlyLowStock(false);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({catCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Guest info alert if not logged in */}
      {!isLoggedIn && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-xs flex gap-3 items-start" id="guest-alert">
          <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">ข้อมูลอยู่ในโหมดอ่านอย่างเดียว (Read-only):</span> คุณสามารถดูรายการข้อมูลสต๊อกพัสดุที่มีอยู่ได้ แต่จะไม่สามารถ เพิ่ม แก้ไข หรือลบพัสดุได้ กรุณาล็อกอินด้วย Google เพื่อสิทธิ์แก้ไข
          </div>
        </div>
      )}

      {/* User role warning if logged in but not admin */}
      {isLoggedIn && !isAdmin && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-xs flex gap-3 items-start" id="user-role-alert">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">บทบาทผู้ใช้งานทั่วไป (User):</span> คุณล็อกอินแล้วในฐานะผู้ใช้งานทั่วไป คุณสามารถตรวจสอบพัสดุและเบิกจ่าย/รับเข้าสต๊อกได้ แต่ไม่มีสิทธิ์ เพิ่ม แก้ไข หรือลบพัสดุตั้งต้นในหน้าจัดระบบ
          </div>
        </div>
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200" id="empty-state">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-slate-700 font-semibold mb-1" id="empty-title">ไม่พบพัสดุในระบบ</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto" id="empty-desc">
            {searchTerm || selectedCategory || onlyLowStock
              ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหาของคุณ ลองล้างคำค้นหาหรือตัวกรองหมวดหมู่'
              : 'ยังไม่มีพัสดุจัดเก็บในระบบคลังพัสดุ กดเพิ่มพัสดุเพื่อเพิ่มข้อมูลตั้งต้น'}
          </p>
          {(searchTerm || selectedCategory || onlyLowStock) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                setOnlyLowStock(false);
              }}
              className="mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              🔄 ล้างตัวกรองการค้นหาทั้งหมด
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table view */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="desktop-table-container">
            <table className="w-full text-left text-sm" id="products-table">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6">รูปภาพ</th>
                  <th className="py-4 px-6">รหัสสินค้า</th>
                  <th className="py-4 px-6">ชื่อสินค้า</th>
                  <th className="py-4 px-6">หมวดหมู่</th>
                  <th className="py-4 px-6 text-right">จำนวนคงเหลือ</th>
                  <th className="py-4 px-6 text-right">เกณฑ์ขั้นต่ำ</th>
                  <th className="py-4 px-6 text-right">ราคาต่อหน่วย</th>
                  <th className="py-4 px-6">หน่วยนับ</th>
                  <th className="py-4 px-6">อัปเดตล่าสุด</th>
                  <th className="py-4 px-6 text-center">ทำรายการ</th>
                  {isLoggedIn && isAdmin && <th className="py-4 px-6 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.quantity <= p.minStock;
                  // Find original index in sheets list
                  const sheetIndex = products.findIndex((original) => original.id === p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6">
                        <ProductThumbnail src={p.imageUrl} alt={p.name} size="md" />
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500">{p.id}</td>
                      <td className="py-4 px-6 font-medium text-slate-800">{p.name}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-50/70 text-indigo-700 rounded-full font-medium">
                          <Layers className="w-3 h-3" />
                          {p.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-semibold">
                        <span className={isLow ? 'text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-100' : 'text-slate-700'}>
                          {p.quantity.toLocaleString('th-TH')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-500">{p.minStock.toLocaleString('th-TH')}</td>
                      <td className="py-4 px-6 text-right font-semibold text-emerald-600">฿{p.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      <td className="py-4 px-6 text-slate-500">{p.unit}</td>
                      <td className="py-4 px-6 text-xs text-slate-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {p.updatedAt || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {onNavigateToWithdrawal && p.quantity > 0 && (
                          <button
                            onClick={() => onNavigateToWithdrawal(p.id)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                            title="ไปหน้าเบิกพัสดุชิ้นนี้"
                          >
                            <span>+ เบิกพัสดุนี้</span>
                          </button>
                        )}
                        {p.quantity <= 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">หมดคลัง</span>
                        )}
                      </td>
                      {isLoggedIn && isAdmin && (
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(p, sheetIndex)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition duration-150 cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p, sheetIndex)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition duration-150 cursor-pointer"
                              title="ลบสินค้า"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card view */}
          <div className="grid grid-cols-1 gap-4 md:hidden" id="mobile-cards-container">
            {filteredProducts.map((p) => {
              const isLow = p.quantity <= p.minStock;
              const sheetIndex = products.findIndex((original) => original.id === p.id);
              return (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-start gap-3">
                    <ProductThumbnail src={p.imageUrl} alt={p.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">{p.id}</span>
                      <h4 className="font-bold text-slate-800 text-base truncate">{p.name}</h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-indigo-50 text-indigo-700 rounded-full font-medium mt-1">
                        <Layers className="w-3 h-3" />
                        {p.category}
                      </span>
                    </div>
                    {isLoggedIn && isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(p, sheetIndex)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p, sheetIndex)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {isLow ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] bg-rose-50 text-rose-700 rounded-full border border-rose-100 font-bold animate-pulse">
                        ⚠️ สินค้าใกล้หมดคลัง
                      </div>
                    ) : (
                      <div></div>
                    )}

                    {onNavigateToWithdrawal && p.quantity > 0 && (
                      <button
                        onClick={() => onNavigateToWithdrawal(p.id)}
                        className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-rose-700 transition cursor-pointer shrink-0"
                      >
                        + เบิกพัสดุนี้
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      อัปเดต: {p.updatedAt || '-'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs text-center text-slate-500">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400 mb-0.5">คงเหลือ</span>
                      <span className={`text-sm font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                        {p.quantity} {p.unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400 mb-0.5">แจ้งเตือนที่</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {p.minStock} {p.unit}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400 mb-0.5">ราคาต่อหน่วย</span>
                      <span className="text-sm font-bold text-emerald-600">
                        ฿{p.price}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="modal-backdrop">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100"
              id="product-modal"
            >
              <div className="flex justify-between items-center bg-slate-50 border-b border-slate-100 px-6 py-4" id="modal-header">
                <h3 className="text-lg font-bold text-slate-800">
                  {editingProduct ? '📝 แก้ไขข้อมูลพัสดุ' : '📦 เพิ่มพัสดุใหม่'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4" id="product-form">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium" id="form-error">
                    {formError}
                  </div>
                )}

                {/* Product Image URL with Live Preview */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    รูปภาพพัสดุ (URL รูปภาพ)
                  </label>
                  <div className="flex gap-3 items-center">
                    <ProductThumbnail src={formImageUrl} alt={formName || 'รูปภาพตัวอย่าง'} size="lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="relative">
                        <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={formImageUrl}
                          onChange={(e) => setFormImageUrl(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        ใส่ URL รูปภาพ หรือเลือกตัวอย่าง:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80')}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          📦 กล่อง
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1585336261026-875a60a1c92f?auto=format&fit=crop&w=400&q=80')}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          🖊️ ปากกา
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=400&q=80')}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          🏷️ เทปกาว
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80')}
                          className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          📄 กระดาษ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="form-grid-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสพัสดุ *</label>
                    <input
                      type="text"
                      disabled={editingProduct !== null}
                      placeholder="เช่น PROD001"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed uppercase font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">หมวดหมู่พัสดุ *</label>
                    <input
                      type="text"
                      list="categories-list"
                      placeholder="เช่น เครื่องเขียน, บรรจุภัณฑ์"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <datalist id="categories-list">
                      {categories.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อพัสดุ *</label>
                  <input
                    type="text"
                    placeholder="กรอกชื่อพัสดุ เช่น กระดาษดับเบิ้ลเอ A4"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="form-grid-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">ราคาต่อหน่วย (บาท) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formPrice || ''}
                      onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">หน่วยนับ *</label>
                    <input
                      type="text"
                      placeholder="เช่น ชิ้น, กล่อง, แพ็ค"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">ขั้นต่ำเตือนใกล้หมด *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="10"
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3" id="form-actions">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isMutating}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-5 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50"
                  >
                    {isMutating ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <span>บันทึกข้อมูล</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
