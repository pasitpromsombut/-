import React, { useState } from 'react';
import { Printer, X, FileText, CheckCircle2, Truck } from 'lucide-react';
import { WithdrawalBill, Product, UserRoleMapping } from '../types';

interface OfficialVoucherModalProps {
  bill: WithdrawalBill | null;
  products: Product[];
  onClose: () => void;
  userRoles?: UserRoleMapping[];
  currentUserName?: string;
  currentUserEmail?: string;
  onOpenDeliveryNote?: () => void;
}

export const OfficialVoucherModal: React.FC<OfficialVoucherModalProps> = ({
  bill,
  products,
  onClose,
  userRoles,
  currentUserName,
  currentUserEmail,
  onOpenDeliveryNote,
}) => {
  if (!bill) return null;

  // Resolve Requester Full Name
  const getRequesterName = () => {
    if (!bill.userEmail) return 'ผู้ใช้งานทั่วไป';
    const emailLower = bill.userEmail.toLowerCase().trim();

    // 1. Look up in User Roles mapping (Google Sheet synchronized roles)
    const matchedRole = userRoles?.find((r) => r.email.toLowerCase().trim() === emailLower);
    if (matchedRole?.name) {
      return matchedRole.name;
    }

    // 2. If it's the logged-in user, use current user display name
    if (currentUserName && currentUserEmail?.toLowerCase().trim() === emailLower) {
      return currentUserName;
    }

    // 3. Clean email prefix fallback
    if (bill.userEmail.includes('@')) {
      return bill.userEmail.split('@')[0];
    }

    return bill.userEmail;
  };

  const requesterName = getRequesterName();

  // Format Date to Thai Full Date
  const formatThaiFullDate = (timestampStr: string) => {
    if (!timestampStr) return '';
    try {
      const d = new Date(timestampStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return timestampStr;
      const day = d.getDate();
      const months = [
        'มกราคม',
        'กุมภาพันธ์',
        'มีนาคม',
        'เมษายน',
        'พฤษภาคม',
        'มิถุนายน',
        'กรกฎาคม',
        'สิงหาคม',
        'กันยายน',
        'ตุลาคม',
        'พฤศจิกายน',
        'ธันวาคม',
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear() + 543;
      return `${day} ${month} ${year}`;
    } catch {
      return timestampStr;
    }
  };

  const thaiDate = formatThaiFullDate(bill.timestamp);

  // Pad items up to 12 rows (Official Form constraint: 12 rows maximum)
  const maxRows = 12;
  const paddedItems = Array.from({ length: maxRows }, (_, idx) => {
    return bill.items[idx] || null;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPrintWindow = () => {
    const printElement = document.getElementById('official-printable-voucher');
    if (!printElement) return;

    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบเบิกและใบส่งสิ่งของ แบบ ส.๑๖/๔๖ - ${bill.billId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet">
        ${headStyles}
        <style>
          body {
            font-family: 'Prompt', serif !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 15px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: white; padding: 14px 20px; border-radius: 12px; font-family: sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div>
            <strong style="font-size: 15px; color: #fb7185; display: block;">🖨️ ใบเบิกและใบส่งสิ่งของ (เลขที่ ${bill.billId})</strong>
            <span style="font-size: 12px; color: #cbd5e1;">คลิกปุ่ม "สั่งพิมพ์เอกสาร" เพื่อเปิดหน้าต่างสั่งพิมพ์</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" style="padding: 10px 22px; background: #e11d48; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              🖨️ สั่งพิมพ์เอกสาร (Print)
            </button>
            <button onclick="window.close()" style="padding: 10px 16px; background: #334155; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 13px;">
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
        <div id="print-content" class="bg-white">
          ${printElement.innerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
      alert('เบราว์เซอร์บล็อกการเปิดป๊อปอัป กรุณาอนุญาตการเปิด Pop-up ในเบราว์เซอร์เพื่อเปิดหน้าพิมพ์');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      id="official-voucher-modal-container"
    >
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[95vh]">
        {/* Top Control Bar (Hidden during printing) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>พรีวิวใบเบิกและใบส่งสิ่งของ (แบบ ส.๑๖ / ๔๖)</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  แบบฟอร์มทางการ
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                บิลเลขที่: <span className="font-mono text-rose-300 font-bold">{bill.billId}</span> | สถานี: {bill.station}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDeliveryNote && (
              <button
                type="button"
                onClick={onOpenDeliveryNote}
                className="px-3 py-2 bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs border border-sky-400/40"
                title="สลับไปพิมพ์ใบนำส่ง (แทนแบบที่ 13)"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>🚚 พิมพ์ใบนำส่ง (แบบ 13)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenPrintWindow}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="เปิดพิมพ์ในหน้าต่างใหม่ (กรณีพรีวิวใน iframe บล็อกสั่งพิมพ์)"
            >
              <span>↗️ เปิดพิมพ์ในหน้าต่างใหม่</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              id="print-official-voucher-btn"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบเบิก (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Form Area */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-black font-serif print:p-0" id="official-printable-voucher">
          <style>{`
            @media print {
              /* Hide all elements on page except printable voucher elements */
              body * {
                visibility: hidden;
              }

              /* Explicitly make printable voucher and print content visible */
              #official-printable-voucher,
              #official-printable-voucher *,
              #print-content,
              #print-content * {
                visibility: visible !important;
              }

              /* Position printable container at top left */
              #official-printable-voucher,
              #print-content {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
                overflow: visible !important;
                font-family: 'Prompt', 'TH Sarabun PSK', serif !important;
              }

              .print\:hidden,
              .no-print {
                display: none !important;
              }

              @page {
                size: A4 portrait;
                margin: 8mm;
              }
            }
          `}</style>

          <div className="max-w-[210mm] mx-auto space-y-4 text-[13px] leading-snug">
            {/* 1. Header Title & Top Right Form Codes */}
            <div className="relative pt-2">
              <h1 className="text-xl sm:text-2xl font-bold text-center tracking-wide font-sans mb-1">
                ใบเบิกและใบส่งสิ่งของ
              </h1>

              <div className="absolute right-0 top-0 text-right text-[11px] space-y-0.5">
                <p>ส. ๑๑๔๕๑ / ๑</p>
                <p className="font-bold">แบบ ส.๑๖ / ๔๖</p>
                <p>ฉบับที่ ........</p>
              </div>
            </div>

            {/* 2. Sub-Header Section */}
            <div className="grid grid-cols-12 gap-2 text-[12px] pt-2">
              {/* Left Column Info */}
              <div className="col-span-7 space-y-1.5">
                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">เลขที่</span>
                  <span className="border-b border-dotted border-black flex-1 font-bold font-mono text-center">
                    {bill.billId}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">ลงวันที่</span>
                  <span className="border-b border-dotted border-black flex-1 text-center font-medium">
                    {thaiDate}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">เบิกจาก</span>
                  <span className="border-b border-dotted border-black flex-1 text-center font-bold">
                    งานเดินรถแขวงนครราชสีมา
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">ผู้เบิก</span>
                  <span className="border-b border-dotted border-black flex-1 text-center font-bold truncate">
                    {requesterName}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="whitespace-nowrap">ให้ส่งสิ่งของไปที่</span>
                  <span className="border-b border-dotted border-black flex-1 text-center font-bold">
                    {bill.station}
                  </span>
                </div>
              </div>

              {/* Right Column Info + Metadata Box */}
              <div className="col-span-5 space-y-1.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className="whitespace-nowrap">พัสดุส่งเลขที่</span>
                    <span className="border-b border-dotted border-black flex-1"></span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="whitespace-nowrap">ลงวันที่</span>
                    <span className="border-b border-dotted border-black flex-1"></span>
                  </div>
                </div>

                {/* 4-Box Metadata Table */}
                <table className="w-full border-collapse border border-black text-[10px] text-center mt-2">
                  <thead>
                    <tr className="border-b border-black bg-slate-50 print:bg-transparent">
                      <th className="border-r border-black p-1 font-normal w-1/4">ประเภทบัญชี</th>
                      <th className="border-r border-black p-1 font-normal w-1/4">รหัสความรับผิดชอบ</th>
                      <th className="border-r border-black p-1 font-normal w-1/4 leading-tight">
                        เลขที่ งทป., คสง.,<br />งภน., รอฯ
                      </th>
                      <th className="p-1 font-normal w-1/4">รหัสงบประมาณ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-6">
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td className="border-r border-black"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Items Main Table */}
            <div className="pt-2">
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="border-b border-black text-center font-bold bg-slate-50 print:bg-transparent">
                    <th className="border-r border-black py-1.5 px-1 w-[6%]">ข้อที่</th>
                    <th className="border-r border-black py-1.5 px-1 w-[16%]">สิ่งของเลขที่</th>
                    <th className="border-r border-black py-1.5 px-2 w-[38%] text-center">รายการสิ่งของ</th>
                    <th className="border-r border-black py-1.5 px-1 w-[10%]">เบิกจำนวน</th>
                    <th className="border-r border-black py-1.5 px-1 w-[8%]">หน่วย</th>
                    <th className="py-1 px-1 w-[22%]" colSpan={3}>
                      <div className="border-b border-black pb-0.5">๓ ช่องนี้พัสดุกรอก</div>
                      <div className="grid grid-cols-3 text-[10px] font-normal pt-0.5">
                        <span className="border-r border-black">จ่ายจำนวน</span>
                        <span className="border-r border-black">บาท</span>
                        <span>สต.</span>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paddedItems.map((item, idx) => {
                    const prod = item ? products.find((p) => p.id === item.productId) : null;
                    const rowNumber = idx + 1;
                    const isIssued = item && item.shippingStatus === 'จัดส่งสำเร็จ';

                    return (
                      <tr key={idx} className="border-b border-black h-7 text-center">
                        <td className="border-r border-black py-1 font-mono">{rowNumber}</td>
                        <td className="border-r border-black py-1 px-1 font-mono text-left truncate">
                          {item ? item.productId : ''}
                        </td>
                        <td className="border-r border-black py-1 px-2 text-left truncate font-sans">
                          {item ? item.productName : ''}
                        </td>
                        <td className="border-r border-black py-1 px-1 font-mono font-bold">
                          {item ? item.quantity.toLocaleString('th-TH') : ''}
                        </td>
                        <td className="border-r border-black py-1 px-1 text-center">
                          {item ? prod?.unit || 'ชิ้น' : ''}
                        </td>
                        {/* 3 supply officer columns */}
                        <td className="border-r border-black py-1 px-1 font-mono text-center">
                          {isIssued && item ? item.quantity.toLocaleString('th-TH') : ''}
                        </td>
                        <td className="border-r border-black py-1 px-1 text-center"></td>
                        <td className="py-1 px-1 text-center"></td>
                      </tr>
                    );
                  })}

                  {/* Summary Row */}
                  <tr className="h-7 text-right font-bold text-[11px]">
                    <td colSpan={5} className="border-r border-black pr-3 italic">
                      รวมเป็นเงิน
                    </td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Footer Signatures Section (3 Columns) */}
            <div className="grid grid-cols-3 gap-2 pt-4 text-[11px] leading-relaxed">
              {/* Left Column: Requester & Approval */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p>ลงชื่อผู้เบิก .....................................................</p>
                  <p className="text-center font-medium text-[11px] pr-8">( {requesterName} )</p>
                  <p>ตำแหน่ง .........................................................</p>
                </div>

                <div className="space-y-1 pt-1">
                  <p className="font-bold text-center pr-4">อนุญาตให้เบิกได้</p>
                  <p>.....................................................................</p>
                  <p>ตำแหน่ง .........................................................</p>
                </div>

                <div className="space-y-1 pt-1">
                  <p className="font-bold text-center pr-4">ได้รับของตามรายการข้างบนนี้ ถูกต้องแล้ว</p>
                  <p>.................................................................. ผู้รับ</p>
                  <p>( .................................................................. )</p>
                  <p>ตำแหน่ง .........................................................</p>
                </div>
              </div>

              {/* Middle Column: Supply Officer & Approval */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p>บันทึกเสนอ ................................................</p>
                  <p>.....................................................................</p>
                  <p className="text-center font-bold pr-2">เจ้าหน้าที่พัสดุ</p>
                </div>

                <div className="space-y-1 pt-6">
                  <p>ส่งผ่านจ่ายได้ .............................................</p>
                  <p>.....................................................................</p>
                  <p className="text-center font-bold text-[10px] leading-tight">
                    แทนหัวหน้ากองจัดการพัสดุ<br />
                    ปฏิบัติการแทน ผู้อำนวยการฝ่ายการพัสดุ
                  </p>
                </div>
              </div>

              {/* Right Column: Inventory Supervisor */}
              <div className="space-y-4 flex flex-col justify-start">
                <div className="space-y-1">
                  <p className="font-bold text-center">ตรวจแล้วถูกต้อง</p>
                  <p className="pt-2">.....................................................................</p>
                  <p className="text-center font-bold pr-2">หัวหน้างานคลังพัสดุ</p>
                </div>
              </div>
            </div>

            {/* 5. Footer Note */}
            <div className="pt-4 border-t border-slate-300 text-[10px] text-slate-700 font-sans">
              <p>
                <strong className="underline">หมายเหตุ</strong> ใบเบิก ๑ ชุด มี ๘ ฉบับ ฉบับที่ ๑-๗ ส่งฝ่ายการพัสดุ และไม่ควรเบิกเกิน ๑๒ รายการ
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Controls (Hidden on print) */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center shrink-0 print:hidden">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>แบบฟอร์มถูกจัดวางตรงตามมาตรฐาน แบบ ส.๑๖ / ๔๖ สำหรับพิมพ์ A4</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleOpenPrintWindow}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer shadow-2xs"
              title="เปิดพิมพ์ในหน้าต่างใหม่ (กรณีอยู่ใน iframe)"
            >
              <span>↗️ เปิดพิมพ์ในหน้าต่างใหม่</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบเบิก (Print)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
