import { useState } from 'react';
import { Lock, Database, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export default function LoginScreen({ onLogin, isLoggingIn }: LoginScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-12 text-center" id="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
        id="login-card"
      >
        <div className="flex justify-center mb-6" id="login-logo-wrapper">
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600" id="login-icon-box">
            <Database className="w-12 h-12" id="login-db-icon" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2" id="login-title">
          ยินดีต้อนรับสู่ระบบคลังพัสดุ
        </h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed" id="login-desc">
          จัดการข้อมูลสต๊อกพัสดุ คุมการเบิก-รับเข้า และออกรายงานสรุปยอดรายวันได้อย่างง่ายดาย เชื่อมต่อข้อมูลโดยตรงกับ Google Sheets ของคุณอย่างปลอดภัย
        </p>

        <div className="space-y-4 mb-8 text-left bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100" id="login-features">
          <div className="flex items-start gap-3" id="feat-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>ข้อมูลทั้งหมดจะถูกจัดเก็บไว้ในบัญชี Google Sheets ของคุณเอง 100% ปลอดภัยและเป็นส่วนตัว</span>
          </div>
          <div className="flex items-start gap-3" id="feat-2">
            <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>มีระบบแจ้งเตือนเมื่อพัสดุใกล้หมดคลังเพื่อการสั่งซื้อที่ทันเวลา</span>
          </div>
        </div>

        <button
          onClick={onLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 border border-slate-200 rounded-xl shadow-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          id="google-signin-btn"
        >
          {isLoggingIn ? (
            <div className="flex items-center gap-2" id="login-loading-indicator">
              <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>กำลังเข้าสู่ระบบ...</span>
            </div>
          ) : (
            <>
              <div className="w-5 h-5 flex items-center justify-center" id="g-logo-box">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="text-slate-700 font-semibold" id="g-login-text">ลงชื่อเข้าใช้งานด้วย Google</span>
            </>
          )}
        </button>

        {(window.self !== window.top) && (
          <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100/80 rounded-xl text-amber-950 text-xs text-left leading-relaxed" id="login-iframe-hint">
            <span className="font-bold block text-amber-900 mb-0.5">💡 เคล็ดลับการใช้ผ่านพรีวิว (AI Studio):</span>
            หากกดแล้วหน้าต่างป็อปอัปถูกปิดทันทีหรือถูกบล็อก กรุณาแนะนำให้คลิกปุ่ม{" "}
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold underline text-indigo-600 hover:text-indigo-800"
            >
              เปิดพรีวิวในแท็บใหม่ ↗
            </a>{" "}
            ที่มุมบนขวา เพื่อเข้าสู่ระบบและสร้างคลังพัสดุลงใน Google Sheets ของคุณได้อย่างปลอดภัย
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface LockedScreenProps {
  onLogin: () => void;
  isLoggingIn: boolean;
  pageTitle: string;
}

export function LockedScreen({ onLogin, isLoggingIn, pageTitle }: LockedScreenProps) {
  const isIframe = window.self !== window.top;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border border-slate-100 max-w-lg mx-auto my-8" id="locked-container">
      <div className="p-4 bg-amber-50 rounded-full text-amber-500 mb-4" id="locked-icon-box">
        <Lock className="w-8 h-8" id="lock-icon" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1" id="locked-title">
        {pageTitle} (สำหรับผู้ใช้งาน)
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm" id="locked-desc">
        หน้าจอนี้จำกัดให้เข้าได้เฉพาะผู้ใช้งานที่เข้าสู่ระบบแล้วเท่านั้น กรุณาลงชื่อเข้าใช้งานด้วยบัญชี Google เพื่อเปิดใช้ระบบเบิกและรายงานข้อมูลสต๊อกพัสดุ
      </p>
      <button
        onClick={onLogin}
        disabled={isLoggingIn}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl shadow-sm transition duration-150 disabled:opacity-50 text-sm mb-4"
        id="locked-login-btn"
      >
        {isLoggingIn ? (
          <div className="flex items-center gap-2" id="locked-loading">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>กำลังเชื่อมต่อ...</span>
          </div>
        ) : (
          <>
            <Database className="w-4 h-4" />
            <span>เข้าสู่ระบบด้วย Google</span>
          </>
        )}
      </button>

      {isIframe && (
        <div className="p-3 bg-amber-50/50 border border-amber-100/80 rounded-xl text-amber-900 text-xs text-left leading-relaxed max-w-sm mt-2" id="locked-iframe-hint">
          <span className="font-bold block text-amber-950 mb-0.5">💡 เคล็ดลับการใช้ผ่านพรีวิว (AI Studio):</span>
          หากป็อปอัปถูกบล็อกหรือถูกปิดทันที กรุณาอนุญาตป็อปอัปในเบราว์เซอร์ของคุณ หรือกดคลิกปุ่ม{" "}
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-extrabold underline text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
          >
            เปิดหน้าพรีวิวในแท็บใหม่ ↗
          </a>{" "}
          ที่มุมขวาบน เพื่อเข้าสู่ระบบอย่างสมบูรณ์
        </div>
      )}
    </div>
  );
}
