import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Product, Transaction, UserRoleMapping, ShippingStatus } from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken
} from './auth';
import {
  getOrCreateSpreadsheet,
  fetchProducts,
  fetchTransactions,
  addProduct,
  updateProductRow,
  addTransaction,
  deleteProductRow,
  fetchUserRoles,
  saveUserRole,
  updateTransactionShippingStatus
} from './sheetsService';

// Subcomponents
import LoginScreen from './components/LoginScreen';
import ProductManagement from './components/ProductManagement';
import StockIntake from './components/StockIntake';
import StockWithdrawal from './components/StockWithdrawal';
import InventoryReport from './components/InventoryReport';
import UserRoleManagement from './components/UserRoleManagement';

import {
  Database,
  Warehouse,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Package,
  PlusSquare,
  MinusSquare,
  BarChart3,
  X,
  Users,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper to generate clean YYYY-MM-DD HH:mm:ss timestamp in Bangkok timezone
const getBangkokFormattedTimestamp = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p = (type: string) => parts.find((pt) => pt.type === type)?.value || '00';
  return `${p('year')}-${p('month')}-${p('day')} ${p('hour')}:${p('minute')}:${p('second')}`;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  // User and Admin Roles State
  const [userRole, setUserRole] = useState<'แอดมิน' | 'ผู้ใช้งาน' | null>(null);
  const [allUserRoles, setAllUserRoles] = useState<UserRoleMapping[]>([]);

  // Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // States
  const [activeTab, setActiveTab] = useState<'catalog' | 'intake' | 'withdrawal' | 'reports' | 'roles'>('catalog');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializingSheet, setIsInitializingSheet] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  
  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [intakePreselectedProdId, setIntakePreselectedProdId] = useState<string>('');
  const [withdrawalPreselectedProdId, setWithdrawalPreselectedProdId] = useState<string>('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Determine actual role assigned in database
  const currentUserRoleMapping = useMemo(() => {
    if (!user?.email) return null;
    return allUserRoles.find(r => r.email.toLowerCase() === user.email?.toLowerCase());
  }, [user, allUserRoles]);

  // Real admin status check (allows role switching only for actual admins or guest mode)
  const isActualAdmin = useMemo(() => {
    if (!user) return true; // Guest mode
    return currentUserRoleMapping?.role === 'แอดมิน';
  }, [user, currentUserRoleMapping]);

  // Enforce role lock: non-admins cannot hold or switch to admin role
  useEffect(() => {
    if (user && !isActualAdmin) {
      if (userRole !== 'ผู้ใช้งาน') {
        setUserRole('ผู้ใช้งาน');
      }
    }
  }, [user, isActualAdmin, userRole]);

  // Restrict access for non-admin users (ผู้ใช้งาน)
  useEffect(() => {
    if (user && userRole === 'ผู้ใช้งาน') {
      if (activeTab !== 'withdrawal' && activeTab !== 'reports') {
        setActiveTab('withdrawal');
      }
    }
  }, [user, userRole, activeTab]);

  // Initial authentication and sync listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        setUser(firebaseUser);
        setAccessToken(token);
        setIsLoading(true);
        setError(null);
        try {
          const sheetId = await getOrCreateSpreadsheet(token);
          setSpreadsheetId(sheetId);
          
          const fetchedProds = await fetchProducts(sheetId, token);
          const fetchedTxs = await fetchTransactions(sheetId, token);
          setProducts(fetchedProds);
          setTransactions(fetchedTxs);

          // User Roles Sync
          try {
            const rolesList = await fetchUserRoles(sheetId, token);
            setAllUserRoles(rolesList);
            
            const emailKey = firebaseUser.email?.toLowerCase() || '';
            const matchedRole = rolesList.find(r => r.email.toLowerCase() === emailKey);
            
            if (matchedRole) {
              setUserRole(matchedRole.role);
            } else {
              // First user in spreadsheet is Admin automatically, subsequent users are normal Users
              const isFirstUser = rolesList.length === 0;
              const autoRole: 'แอดมิน' | 'ผู้ใช้งาน' = isFirstUser ? 'แอดมิน' : 'ผู้ใช้งาน';
              
              const newMapping: UserRoleMapping = {
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || firebaseUser.email || 'ผู้ใช้งานคลัง',
                role: autoRole,
                updatedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
              };
              
              await saveUserRole(sheetId, token, newMapping);
              setUserRole(autoRole);
              
              // Refresh roles list
              const updatedRoles = await fetchUserRoles(sheetId, token);
              setAllUserRoles(updatedRoles);
            }
          } catch (roleErr) {
            console.error('Failed to sync user roles:', roleErr);
            setUserRole('ผู้ใช้งาน'); // Fallback safe role
          }

        } catch (err: any) {
          console.error('Failed to initialize sheets database:', err);
          setError(`ไม่สามารถเชื่อมข้อมูล Google Sheets ได้: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      },
      () => {
        // Guest mode (offline fallback to let users play immediately)
        setUser(null);
        setAccessToken(null);
        setSpreadsheetId(null);
        setUserRole(null);
        setAllUserRoles([]);
        
        const guestSampleProducts = [
          { id: 'PROD001', name: 'กล่องกระดาษลูกฟูก A', category: 'บรรจุภัณฑ์', quantity: 15, minStock: 50, price: 12.00, unit: 'ใบ', updatedAt: '2026-07-19 08:00:00', imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80' },
          { id: 'PROD002', name: 'ปากกาลูกลื่นสีน้ำเงิน', category: 'เครื่องเขียน', quantity: 120, minStock: 20, price: 5.00, unit: 'ด้าม', updatedAt: '2026-07-19 08:00:00', imageUrl: 'https://images.unsplash.com/photo-1585336261026-875a60a1c92f?auto=format&fit=crop&w=400&q=80' },
          { id: 'PROD003', name: 'เทปกาวปิดกล่อง 2 นิ้ว', category: 'อุปกรณ์แพ็คกิ้ง', quantity: 8, minStock: 10, price: 35.00, unit: 'ม้วน', updatedAt: '2026-07-19 08:00:00', imageUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=400&q=80' },
          { id: 'PROD004', name: 'ถุงพลาสติกกันกระแทก 10x15cm', category: 'บรรจุภัณฑ์', quantity: 300, minStock: 100, price: 1.50, unit: 'ซอง', updatedAt: '2026-07-19 08:00:00', imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80' },
          { id: 'PROD005', name: 'กระดาษ A4 80 แกรม', category: 'เครื่องเขียน', quantity: 4, minStock: 5, price: 135.00, unit: 'รีม', updatedAt: '2026-07-19 08:00:00', imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80' }
        ];
        setProducts(guestSampleProducts);
        setTransactions([]);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setIsInitializingSheet(true);
        
        const sheetId = await getOrCreateSpreadsheet(result.accessToken);
        setSpreadsheetId(sheetId);
        
        const fetchedProds = await fetchProducts(sheetId, result.accessToken);
        const fetchedTxs = await fetchTransactions(sheetId, result.accessToken);
        setProducts(fetchedProds);
        setTransactions(fetchedTxs);

        // User Roles Sync
        try {
          const rolesList = await fetchUserRoles(sheetId, result.accessToken);
          setAllUserRoles(rolesList);
          
          const emailKey = result.user.email?.toLowerCase() || '';
          const matchedRole = rolesList.find(r => r.email.toLowerCase() === emailKey);
          
          if (matchedRole) {
            setUserRole(matchedRole.role);
          } else {
            const isFirstUser = rolesList.length === 0;
            const autoRole: 'แอดมิน' | 'ผู้ใช้งาน' = isFirstUser ? 'แอดมิน' : 'ผู้ใช้งาน';
            
            const newMapping: UserRoleMapping = {
              email: result.user.email || '',
              name: result.user.displayName || result.user.email || 'ผู้ใช้งานคลัง',
              role: autoRole,
              updatedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
            };
            
            await saveUserRole(sheetId, result.accessToken, newMapping);
            setUserRole(autoRole);
            
            const updatedRoles = await fetchUserRoles(sheetId, result.accessToken);
            setAllUserRoles(updatedRoles);
          }
        } catch (roleErr) {
          console.error('Failed to sync user roles on login:', roleErr);
          setUserRole('ผู้ใช้งาน');
        }
        
        showToast('🔓 เข้าสู่ระบบและเชื่อมโยงคลังสินค้าสำเร็จ!');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const errCode = err?.code || '';
      const errMsg = err?.message || '';
      const isPopupError = 
        errCode === 'auth/popup-blocked' || 
        errCode === 'auth/popup-closed-by-user' ||
        errCode === 'auth/cancelled-popup-request' ||
        errMsg.includes('popup-blocked') ||
        errMsg.includes('popup-closed-by-user') ||
        errMsg.includes('cancelled-popup-request') ||
        errMsg.includes('popup');

      if (isPopupError) {
        setError(
          '⚠️ หน้าต่างลงชื่อเข้าใช้ถูกบล็อก (Popup Blocked) หรือถูกปิดก่อนทำรายการเสร็จสิ้น: กรุณาอนุญาตป็อปอัปในเบราว์เซอร์ของคุณ หรือกดปุ่ม "เปิดพรีวิวในแท็บใหม่ ↗" ที่มุมขวาบน เพื่อลงชื่อเข้าใช้งานด้วย Google อย่างเสถียรและปลอดภัย'
        );
      } else {
        setError(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`);
      }
    } finally {
      setIsLoggingIn(false);
      setIsInitializingSheet(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    setIsLoading(true);
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setSpreadsheetId(null);
      setUserRole(null);
      setAllUserRoles([]);
      setActiveTab('catalog'); // Fallback to safe view
      showToast('🔒 ออกจากระบบเรียบร้อยแล้ว');
    } catch (err: any) {
      setError(`ออกจากระบบไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsMutating(true);
    setError(null);
    try {
      const fetchedProds = await fetchProducts(spreadsheetId, accessToken);
      const fetchedTxs = await fetchTransactions(spreadsheetId, accessToken);
      setProducts(fetchedProds);
      setTransactions(fetchedTxs);

      try {
        const rolesList = await fetchUserRoles(spreadsheetId, accessToken);
        setAllUserRoles(rolesList);
        const emailKey = user?.email?.toLowerCase() || '';
        const matchedRole = rolesList.find(r => r.email.toLowerCase() === emailKey);
        if (matchedRole) {
          setUserRole(matchedRole.role);
        }
      } catch (roleErr) {
        console.error('Failed to refresh roles:', roleErr);
      }

      showToast('🔄 อัปเดตข้อมูลสต๊อกจาก Google Sheets แล้ว');
    } catch (err: any) {
      setError(`อัปเดตข้อมูลสต๊อกล้มเหลว: ${err.message}`);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveUserRole = async (mapping: UserRoleMapping) => {
    if (!accessToken || !spreadsheetId) return;
    setIsMutating(true);
    setError(null);
    try {
      await saveUserRole(spreadsheetId, accessToken, mapping);
      const updatedRoles = await fetchUserRoles(spreadsheetId, accessToken);
      setAllUserRoles(updatedRoles);
      
      // If updating current user's role, sync local userRole state
      if (mapping.email.toLowerCase() === user?.email?.toLowerCase()) {
        setUserRole(mapping.role);
        showToast(`👑 อัปเดตสิทธิ์ของคุณเป็น "${mapping.role}" แล้ว`);
      } else {
        showToast(`👤 อัปเดตสิทธิ์สำหรับ "${mapping.email}" เรียบร้อย`);
      }
    } catch (err: any) {
      setError(`ไม่สามารถบันทึกสิทธิ์ได้: ${err.message}`);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddProduct = async (product: Product) => {
    if (!accessToken || !spreadsheetId) return;
    setIsMutating(true);
    setError(null);
    try {
      await addProduct(spreadsheetId, accessToken, product);
      // Refresh
      const fetchedProds = await fetchProducts(spreadsheetId, accessToken);
      setProducts(fetchedProds);
      showToast(`📦 บันทึกสินค้า "${product.name}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      setError(`เพิ่มสินค้าล้มเหลว: ${err.message}`);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateProduct = async (product: Product, index: number) => {
    if (!accessToken || !spreadsheetId) return;
    setIsMutating(true);
    setError(null);
    try {
      await updateProductRow(spreadsheetId, accessToken, product, index);
      // Refresh
      const fetchedProds = await fetchProducts(spreadsheetId, accessToken);
      setProducts(fetchedProds);
      showToast(`📝 อัปเดตข้อมูล "${product.name}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      setError(`แก้ไขข้อมูลล้มเหลว: ${err.message}`);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteProduct = async (index: number) => {
    if (!accessToken || !spreadsheetId) return;
    setIsMutating(true);
    setError(null);
    const prodName = products[index]?.name || '';
    try {
      await deleteProductRow(spreadsheetId, accessToken, index);
      // Refresh
      const fetchedProds = await fetchProducts(spreadsheetId, accessToken);
      setProducts(fetchedProds);
      showToast(`🗑️ ลบสินค้า "${prodName}" ออกแล้ว`);
    } catch (err: any) {
      setError(`ลบสินค้าล้มเหลว: ${err.message}`);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddTransaction = async (
    productId: string,
    type: 'รับเข้า' | 'เบิกออก',
    quantity: number,
    note: string,
    shippingStatus?: ShippingStatus
  ) => {
    const finalShippingStatus: ShippingStatus = shippingStatus || (type === 'เบิกออก' ? 'กำลังเตรียมจัดส่ง' : 'จัดส่งสำเร็จ');

    // Guest/Offline Mode support when not logged in
    if (!accessToken || !spreadsheetId) {
      const index = products.findIndex((p) => p.id === productId);
      if (index === -1) throw new Error('ไม่พบสินค้าที่เลือกในคลัง');
      const product = products[index];

      let newQty = product.quantity;
      if (type === 'รับเข้า') {
        newQty += quantity;
      } else {
        if (quantity > product.quantity) {
          throw new Error('ยอดสต๊อกคงเหลือไม่พอสำหรับการเบิก');
        }
        newQty -= quantity;
      }

      const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = getBangkokFormattedTimestamp();
      
      const transaction: Transaction = {
        id: txId,
        timestamp,
        type,
        productId,
        productName: product.name,
        quantity,
        userEmail: 'guest_user@example.com',
        note: `${note} (โหมดทดลองใช้งาน)`,
        shippingStatus: finalShippingStatus,
      };

      const updatedProduct: Product = {
        ...product,
        quantity: newQty,
        updatedAt: timestamp,
      };

      // Directly update state for local playability
      const updatedProducts = [...products];
      updatedProducts[index] = updatedProduct;
      setProducts(updatedProducts);
      setTransactions((prev) => [transaction, ...prev]);

      showToast(type === 'รับเข้า' ? `📥 รับเข้า "${product.name}" สำเร็จ (โหมดทดลอง)` : `📤 เบิกออก "${product.name}" สำเร็จ (โหมดทดลอง)`);
      return;
    }

    setIsMutating(true);
    setError(null);
    const originalProducts = [...products];
    const originalTransactions = [...transactions];
    try {
      const index = products.findIndex((p) => p.id === productId);
      if (index === -1) throw new Error('ไม่พบสินค้าที่เลือกในคลัง');
      const product = products[index];

      let newQty = product.quantity;
      if (type === 'รับเข้า') {
        newQty += quantity;
      } else {
        if (quantity > product.quantity) {
          throw new Error('ยอดสต๊อกคงเหลือไม่พอสำหรับการเบิก');
        }
        newQty -= quantity;
      }

      const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      const timestamp = getBangkokFormattedTimestamp();
      
      const transaction: Transaction = {
        id: txId,
        timestamp,
        type,
        productId,
        productName: product.name,
        quantity,
        userEmail: user?.email || 'unidentified_user',
        note,
        shippingStatus: finalShippingStatus,
      };

      const updatedProduct: Product = {
        ...product,
        quantity: newQty,
        updatedAt: timestamp,
      };

      // 1. Optimistically update local state immediately so UI updates instantly
      const updatedProducts = [...products];
      updatedProducts[index] = updatedProduct;
      setProducts(updatedProducts);
      setTransactions((prev) => [transaction, ...prev]);

      // 2. Update product quantity row in Google Sheets
      await updateProductRow(spreadsheetId, accessToken, updatedProduct, index);

      // 3. Append transaction row in Google Sheets
      await addTransaction(spreadsheetId, accessToken, transaction);
      
      showToast(type === 'รับเข้า' ? `📥 รับเข้า "${product.name}" สำเร็จ` : `📤 เบิกออก "${product.name}" สำเร็จ`);
    } catch (err: any) {
      // Rollback optimistic updates on failure
      setProducts(originalProducts);
      setTransactions(originalTransactions);
      setError(`ทำรายการสต๊อกล้มเหลว: ${err.message}`);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateShippingStatus = async (transactionId: string, newStatus: ShippingStatus) => {
    if (!accessToken || !spreadsheetId) {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, shippingStatus: newStatus } : tx))
      );
      showToast(`🚚 อัปเดตสถานะจัดส่งเป็น "${newStatus}" เรียบร้อย (โหมดทดลอง)`);
      return;
    }

    setIsMutating(true);
    setError(null);
    const originalTransactions = [...transactions];
    try {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === transactionId ? { ...tx, shippingStatus: newStatus } : tx))
      );
      
      await updateTransactionShippingStatus(spreadsheetId, accessToken, transactionId, newStatus);
      showToast(`🚚 อัปเดตสถานะจัดส่งเป็น "${newStatus}" เรียบร้อยแล้ว`);
    } catch (err: any) {
      setTransactions(originalTransactions);
      setError(`อัปเดตสถานะจัดส่งล้มเหลว: ${err.message}`);
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const handleNavigateToIntake = (productId: string) => {
    setIntakePreselectedProdId(productId);
    setActiveTab('intake');
  };

  const handleNavigateToWithdrawal = (productId: string) => {
    setWithdrawalPreselectedProdId(productId);
    setActiveTab('withdrawal');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col" id="app-root">
      
      {/* 1. Header component */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" id="header-container">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('catalog')} id="header-logo-group">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-200 shrink-0" id="header-logo">
              <Warehouse className="w-5 h-5" />
            </div>
            <div className="leading-tight shrink-0" id="header-titles">
              <h1 className="text-sm font-black text-slate-800 tracking-tight">ระบบคลังพัสดุ</h1>
              <p className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase font-mono">Google Sheets Sync</p>
            </div>
          </div>

          {/* User Section & Authentication Controls */}
          <div className="flex items-center gap-3" id="header-user-controls">
            {isLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold" id="loading-spinner">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                <span className="hidden sm:inline">กำลังอัปเดต...</span>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2" id="user-info-badge">
                {/* Role and Toggle for Admin */}
                <div className="flex items-center gap-1.5 mr-2 shrink-0" id="role-tester-toggle">
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg border ${
                    userRole === 'แอดมิน' 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {userRole === 'แอดมิน' ? '👑 แอดมิน' : '👤 ผู้ใช้งาน'}
                  </span>
                  {isActualAdmin && (
                    <button
                      onClick={() => {
                        const target = userRole === 'แอดมิน' ? 'ผู้ใช้งาน' : 'แอดมิน';
                        setUserRole(target);
                        showToast(`🔄 สลับบทบาทเป็น "${target}" สำเร็จ!`);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black shrink-0 cursor-pointer"
                      title="สลับมุมมองบทบาท (สิทธิ์เฉพาะแอดมิน)"
                      id="role-toggle-test"
                    >
                      สลับบทบาท
                    </button>
                  )}
                </div>

                {/* User avatar */}
                <div className="hidden sm:flex flex-col text-right" id="user-meta">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{user.displayName || 'ผู้ใช้งานคลัง'}</span>
                  <span className="text-[9px] text-slate-400 font-mono leading-none truncate max-w-[140px]" title={user.email || ''}>{user.email}</span>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} referrerPolicy="no-referrer" alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" id="user-photo" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs" id="user-initials">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition duration-150"
                  title="ออกจากระบบ"
                  id="logout-btn"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl transition duration-150 disabled:opacity-50 shadow-sm"
                id="login-btn"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบด้วย Google</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* 2. Error bar banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-rose-600 text-white text-xs font-bold px-4 py-3 flex justify-between items-start gap-4 border-b border-rose-700"
            id="error-banner"
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-200 shrink-0 mt-0.5" />
              <div className="flex-1">
                {error.includes('แท็บใหม่') ? (
                  <div className="space-y-1.5" id="error-popup-hint">
                    <p className="leading-relaxed text-[12px]">{error}</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm transition"
                        id="open-tab-error-btn"
                      >
                        <span>เปิดพรีวิวในแท็บใหม่ ↗</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <span className="leading-normal">{error}</span>
                )}
              </div>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-700 rounded transition shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Success toast toaster */}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-5 right-5 z-50" id="toast-wrapper">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-slate-900 text-white py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold max-w-sm border border-slate-800"
              id="toast-box"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toast}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Sheet Initialization Loader Screen */}
      <AnimatePresence>
        {isInitializingSheet && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="init-loader-screen">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-100"
            >
              <div className="flex justify-center">
                <Database className="w-12 h-12 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">กำลังเชื่อมต่อข้อมูลคลังพัสดุ</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                ระบบกำลังตรวจสอบโครงสร้างตารางข้อมูลและสร้างไฟล์ฐานข้อมูล <span className="font-semibold text-indigo-600">"{`Stock Management App (ระบบจัดการสต๊อกพัสดุ)`}"</span> ใน Google Sheets ของคุณ เพื่อความปลอดภัยและเป็นส่วนตัวของคลังพัสดุ...
              </p>
              <div className="flex justify-center pt-2">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Navigation Bar (Optimized for both Desktop & Mobile) */}
      <nav className="bg-white border-b border-slate-100 shadow-sm shrink-0" id="main-navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2 overflow-x-auto scrollbar-none" id="tabs-scroller">
            
            {/* Tab: Catalog */}
            {(!user || userRole === 'แอดมิน') && (
              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                  activeTab === 'catalog'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
                id="tab-catalog"
              >
                <Package className="w-4 h-4" />
                <span>ข้อมูลสต๊อกพัสดุ</span>
              </button>
            )}

            {/* Tab: Intake */}
            {(!user || userRole === 'แอดมิน') && (
              <button
                onClick={() => {
                  setIntakePreselectedProdId('');
                  setActiveTab('intake');
                }}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                  activeTab === 'intake'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
                id="tab-intake"
              >
                <PlusSquare className="w-4 h-4" />
                <span>หน้ารับเข้าพัสดุ</span>
              </button>
            )}

            {/* Tab: Withdrawal (RESTRICTED) */}
            <button
              onClick={() => {
                setWithdrawalPreselectedProdId('');
                setActiveTab('withdrawal');
              }}
              className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                activeTab === 'withdrawal'
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              id="tab-withdrawal"
            >
              <MinusSquare className="w-4 h-4" />
              <span>หน้าเบิกพัสดุ</span>
              {!user && <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded ml-0.5 font-semibold">ล็อค</span>}
            </button>

            {/* Tab: Report (RESTRICTED) */}
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              id="tab-reports"
            >
              <BarChart3 className="w-4 h-4" />
              <span>พัสดุคงเหลือ & สรุปยอด</span>
              {!user && <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded ml-0.5 font-semibold">ล็อค</span>}
            </button>

            {/* Tab: User Roles (ADMIN ONLY) */}
            {user && userRole === 'แอดมิน' && (
              <button
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${
                  activeTab === 'roles'
                    ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
                id="tab-roles"
              >
                <Users className="w-4 h-4" />
                <span>จัดการสิทธิ์ผู้ใช้</span>
              </button>
            )}

          </div>

          {/* Quick Help Toggle */}
          <button
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 rounded-xl transition my-2 shrink-0 border border-indigo-100 cursor-pointer"
            id="toggle-help-guide-btn"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showHelpGuide ? 'ซ่อนคำแนะนำ' : '💡 วิธีใช้งานง่ายๆ'}</span>
            {showHelpGuide ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>
        </div>
      </nav>

      {/* 6. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="main-content-container">
        
        {/* Easy Quick-Start 3-Step Guide Banner */}
        <AnimatePresence>
          {showHelpGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40 relative overflow-hidden"
              id="easy-start-guide-banner"
            >
              <div className="flex justify-between items-start gap-4 relative z-10">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-500/30 text-indigo-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" /> คู่มือฉบับย่อ ใช้งานง่ายใน 3 สเต็ป
                    </span>
                    <span className="text-slate-300 text-xs">
                      {userRole === 'แอดมิน' ? '👑 สิทธิ์: แอดมิน (จัดการเบิก/รับเข้า/อนุมัติ)' : '👤 สิทธิ์: ผู้ใช้งาน (ทำรายการเบิก & ติดตามจัดส่ง)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition cursor-pointer" onClick={() => setActiveTab('withdrawal')}>
                      <div className="flex items-center gap-2 font-bold text-xs text-rose-300 mb-1">
                        <span className="w-5 h-5 rounded-full bg-rose-500/30 flex items-center justify-center text-[10px] text-white">1</span>
                        <span>1. เลือกพัสดุใส่ใบเบิก</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">
                        เข้าหน้า <strong>"หน้าเบิกพัสดุ"</strong> แล้วกดค้นหา หรือคลิกปุ่มพัสดุด่วนเพื่อเพิ่มพัสดุลงในบิล (เลือกได้หลายรายการ)
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition cursor-pointer" onClick={() => setActiveTab('withdrawal')}>
                      <div className="flex items-center gap-2 font-bold text-xs text-amber-300 mb-1">
                        <span className="w-5 h-5 rounded-full bg-amber-500/30 flex items-center justify-center text-[10px] text-white">2</span>
                        <span>2. ระบุสถานที่ส่ง / หมายเหตุ</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">
                        เลือกสถานีปลายทาง (เช่น นครราชสีมา, ขอนแก่น) หรือระบุหมายเหตุ เพื่อให้เจ้าหน้าที่จัดส่งได้อย่างถูกต้อง
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/15 transition cursor-pointer" onClick={() => setActiveTab('withdrawal')}>
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-300 mb-1">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-[10px] text-white">3</span>
                        <span>3. กดยืนยัน & พิมพ์ใบเบิก</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">
                        ระบบจะสร้างรหัสบิลใบเบิกให้อัตโนมัติ สามารถติดตามสถานะจัดส่ง และกดปุ่มพิมพ์/ดาวน์โหลดเอกสาร PDF ได้ทันที
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelpGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition shrink-0"
                  title="ซ่อนคำแนะนำ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs font-semibold gap-3" id="loading-spinner-view">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span>กำลังดึงข้อมูลฐานคลังสินค้า...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              id="tab-content-animator"
            >
              {activeTab === 'catalog' && (
                <ProductManagement
                  products={products}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  isMutating={isMutating}
                  refreshData={handleRefresh}
                  isLoggedIn={user !== null}
                  isAdmin={userRole === 'แอดมิน'}
                  onNavigateToWithdrawal={(prodId) => {
                    setWithdrawalPreselectedProdId(prodId);
                    setActiveTab('withdrawal');
                  }}
                  onNavigateToIntake={(prodId) => {
                    setIntakePreselectedProdId(prodId);
                    setActiveTab('intake');
                  }}
                />
              )}

              {activeTab === 'intake' && (
                <StockIntake
                  products={products}
                  onAddTransaction={handleAddTransaction}
                  isMutating={isMutating}
                  isLoggedIn={user !== null}
                  onLogin={handleLogin}
                  isLoggingIn={isLoggingIn}
                  initialSelectedProductId={intakePreselectedProdId}
                />
              )}

              {activeTab === 'withdrawal' && (
                <StockWithdrawal
                  products={products}
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  onUpdateShippingStatus={handleUpdateShippingStatus}
                  isMutating={isMutating}
                  isLoggedIn={user !== null}
                  currentUserEmail={user?.email || undefined}
                  currentUserName={user?.displayName || allUserRoles.find(r => r.email.toLowerCase() === user?.email?.toLowerCase())?.name}
                  userRoles={allUserRoles}
                  onLogin={handleLogin}
                  isLoggingIn={isLoggingIn}
                  initialSelectedProductId={withdrawalPreselectedProdId}
                  isAdmin={userRole === 'แอดมิน'}
                />
              )}

              {activeTab === 'reports' && (
                <InventoryReport
                  products={products}
                  transactions={transactions}
                  isLoggedIn={user !== null}
                  currentUserEmail={user?.email || undefined}
                  onLogin={handleLogin}
                  isLoggingIn={isLoggingIn}
                  onNavigateToIntake={handleNavigateToIntake}
                  onNavigateToWithdrawal={handleNavigateToWithdrawal}
                  onUpdateShippingStatus={handleUpdateShippingStatus}
                  isAdmin={userRole === 'แอดมิน'}
                />
              )}

              {activeTab === 'roles' && user && userRole === 'แอดมิน' && (
                <UserRoleManagement
                  userRoles={allUserRoles}
                  onSaveUserRole={handleSaveUserRole}
                  isMutating={isMutating}
                  refreshRoles={handleRefresh}
                  currentUserEmail={user.email}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* 7. Footer details */}
      <footer className="bg-white border-t border-slate-100 py-4 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0" id="main-footer">
        <div>ระบบจัดการคลังสินค้าสต๊อก • ข้อมูลจัดเก็บใน Google Sheets ส่วนตัวปลอดภัย</div>
      </footer>

      {/* Custom Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="logout-confirm-overlay">
            {/* Background Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Content Card */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 z-10 text-left"
              id="logout-confirm-card"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-full shrink-0">
                  <LogOut className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">ยืนยันการออกจากระบบ</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    คุณต้องการออกจากระบบสต๊อกสินค้าใช่หรือไม่? หลังจากออกจากระบบ ระบบจะกลับเข้าสู่โหมดทดลองใช้งานทั่วไป
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                >
                  ออกจากระบบ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
