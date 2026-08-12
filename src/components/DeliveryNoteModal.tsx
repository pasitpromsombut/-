import React, { useState } from 'react';
import { Printer, X, Truck, FileText, Calendar, MapPin, Train, User } from 'lucide-react';
import { WithdrawalBill, Product, UserRoleMapping } from '../types';

interface DeliveryNoteModalProps {
  bill: WithdrawalBill | null;
  products: Product[];
  onClose: () => void;
  userRoles?: UserRoleMapping[];
  currentUserName?: string;
  currentUserEmail?: string;
}

export const DeliveryNoteModal: React.FC<DeliveryNoteModalProps> = ({
  bill,
  products,
  onClose,
  userRoles,
  currentUserName,
  currentUserEmail,
}) => {
  if (!bill) return null;

  // Resolve Requester Full Name
  const getRequesterName = () => {
    if (!bill.userEmail) return '';
    const emailLower = bill.userEmail.toLowerCase().trim();

    const matchedRole = userRoles?.find((r) => r.email.toLowerCase().trim() === emailLower);
    if (matchedRole?.name) {
      return matchedRole.name;
    }

    if (currentUserName && currentUserEmail?.toLowerCase().trim() === emailLower) {
      return currentUserName;
    }

    if (bill.userEmail.includes('@')) {
      return bill.userEmail.split('@')[0];
    }

    return bill.userEmail;
  };

  // Default values for form inputs
  const [docNo, setDocNo] = useState(bill.billId || '');
  const [fromStation, setFromStation] = useState('คลังสินค้ากลาง / งานพัสดุ');
  const [toStation, setToStation] = useState(bill.station || 'สถานีปลายทาง');
  const [trainNo, setTrainNo] = useState('');
  const [senderName, setSenderName] = useState(getRequesterName() || (currentUserName || ''));

  // Format Date (DD/MM/YYYY in BE year)
  const formatThaiSlashDate = (timestampStr: string) => {
    if (!timestampStr) return '';
    try {
      const d = new Date(timestampStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return timestampStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543;
      return `${day} / ${month} / ${year}`;
    } catch {
      return timestampStr;
    }
  };

  const [shipDate, setShipDate] = useState(formatThaiSlashDate(bill.timestamp));

  // Minimum grid rows (12 rows as standard form)
  const minRows = 12;
  const paddedItems = Array.from({ length: Math.max(bill.items.length, minRows) }, (_, idx) => {
    return bill.items[idx] || null;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleOpenPrintWindow = () => {
    const printElement = document.getElementById('printable-delivery-note');
    if (!printElement) return;

    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบนำส่ง แทนแบบที่ 13 - ${bill.billId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet">
        ${headStyles}
        <style>
          body {
            font-family: 'Prompt', 'Sarabun', sans-serif !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 20px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
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
            <strong style="font-size: 15px; color: #38bdf8; display: block;">🚚 ใบนำส่ง แทนแบบที่ 13 (เลขที่ ${bill.billId})</strong>
            <span style="font-size: 12px; color: #cbd5e1;">คลิกปุ่ม "สั่งพิมพ์เอกสาร" เพื่อเปิดหน้าต่างสั่งพิมพ์</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" style="padding: 10px 22px; background: #0284c7; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
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
      id="delivery-note-modal-container"
    >
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[95vh]">
        {/* Top Control Bar (Hidden during printing) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>พรีวิวใบนำส่ง (แทนแบบที่ ๑๓)</span>
                <span className="text-[10px] bg-sky-500/30 text-sky-200 px-2 py-0.5 rounded-full border border-sky-400/30 font-semibold">
                  การรถไฟแห่งประเทศไทย
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                บิลเลขที่: <span className="font-mono text-sky-300 font-bold">{bill.billId}</span> | สถานีปลายทาง: {bill.station}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPrintWindow}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="เปิดพิมพ์ในหน้าต่างใหม่"
            >
              <span>↗️ เปิดพิมพ์ในหน้าต่างใหม่</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              id="print-delivery-note-btn"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบนำส่ง (Print)</span>
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

        {/* Quick Settings Bar (Hidden during printing) */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0 print:hidden text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>ใบส่ง เลขที่</span>
            </label>
            <input
              type="text"
              value={docNo}
              onChange={(e) => setDocNo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="เลขที่ใบส่ง..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>จาก (ต้นทาง)</span>
            </label>
            <input
              type="text"
              value={fromStation}
              onChange={(e) => setFromStation(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="จาก..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span>ถึง (ปลายทาง)</span>
            </label>
            <input
              type="text"
              value={toStation}
              onChange={(e) => setToStation(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="ถึง..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Train className="w-3.5 h-3.5 text-slate-400" />
              <span>ส่งโดยขบวนรถที่</span>
            </label>
            <input
              type="text"
              value={trainNo}
              onChange={(e) => setTrainNo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="เช่น ขบวน 135..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>ผู้ลงชื่อนำส่ง</span>
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="ชื่อผู้ส่ง..."
            />
          </div>
        </div>

        {/* Printable Form Container */}
        <div className="p-6 sm:p-12 overflow-y-auto flex-1 bg-white text-black font-sans print:p-0" id="printable-delivery-note">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-delivery-note,
              #printable-delivery-note *,
              #print-content,
              #print-content * {
                visibility: visible !important;
              }
              #printable-delivery-note,
              #print-content {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          `}</style>

          <div className="max-w-[720px] mx-auto bg-white p-2 sm:p-4 text-black font-sans leading-relaxed">
            {/* Header Title */}
            <div className="mb-6 relative">
              <div className="text-center">
                <p className="text-base sm:text-lg font-bold tracking-wide">แทนแบบที่ ๑๓</p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">การรถไฟแห่งประเทศไทย</h2>
              </div>
              <div className="flex items-baseline justify-start mt-3 font-bold text-base sm:text-lg px-1">
                <div className="flex items-baseline gap-2">
                  <span>ใบส่ง  เลขที่</span>
                  <span className="border-b border-dotted border-black min-w-[200px] text-center font-mono font-semibold px-2">
                    {docNo || bill.billId || '........................................................'}
                  </span>
                </div>
              </div>
            </div>

            {/* From & To Section */}
            <div className="space-y-2 mb-6 text-base font-semibold">
              <div className="flex items-baseline gap-2">
                <span className="w-12 shrink-0">จาก</span>
                <span className="border-b border-dotted border-black flex-1 min-h-[28px] px-2 font-normal">
                  {fromStation || '....................................................................................................'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="w-12 shrink-0">ถึง</span>
                <span className="border-b border-dotted border-black flex-1 min-h-[28px] px-2 font-normal">
                  {toStation || '....................................................................................................'}
                </span>
              </div>
            </div>

            {/* Grid Table */}
            <table className="w-full border-collapse border-2 border-black mb-6 text-sm sm:text-base">
              <thead>
                <tr className="border-b-2 border-black font-bold text-center bg-slate-50/50">
                  <th className="border-r border-black py-2 px-2 w-[15%]">ลำดับ</th>
                  <th className="border-r border-black py-2 px-2 w-[20%]">จำนวน</th>
                  <th className="py-2 px-3 text-center">รายการ</th>
                </tr>
              </thead>
              <tbody>
                {paddedItems.map((item, index) => {
                  const prod = item ? products.find((p) => p.id === item.productId) : null;
                  return (
                    <tr key={item?.id || index} className="border-b border-black/70 min-h-[32px]">
                      <td className="border-r border-black py-2 px-2 text-center font-mono">
                        {item ? `${index + 1}` : '\u00A0'}
                      </td>
                      <td className="border-r border-black py-2 px-2 text-center font-medium">
                        {item ? `${item.quantity.toLocaleString('th-TH')} ${prod?.unit || ''}` : '\u00A0'}
                      </td>
                      <td className="py-2 px-3 font-medium">
                        {item ? (
                          <div className="flex items-baseline justify-between gap-2">
                            <span>{item.productName}</span>
                            <span className="text-xs font-mono text-slate-500 print:text-black">({item.productId})</span>
                          </div>
                        ) : (
                          '\u00A0'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer Signatures & Shipping details */}
            <div className="space-y-4 text-sm sm:text-base pt-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span>ได้ส่งไปโดยขบวนรถที่</span>
                <span className="border-b border-dotted border-black min-w-[180px] text-center font-semibold px-2">
                  {trainNo || '........................................................'}
                </span>
                <span className="ml-2">วันที่</span>
                <span className="border-b border-dotted border-black min-w-[140px] text-center font-semibold px-2">
                  {shipDate || '........ / ........ / ........'}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-2">
                <span className="w-14">ลงชื่อ</span>
                <span className="border-b border-dotted border-black min-w-[240px] text-center font-semibold px-2">
                  {senderName || '........................................................'}
                </span>
                <span className="ml-2">วันที่</span>
                <span className="border-b border-dotted border-black min-w-[140px] text-center font-semibold px-2">
                  {shipDate || '........ / ........ / ........'}
                </span>
              </div>

              <div className="pt-3 font-bold text-base">
                ได้รับสิ่งของตามรายการข้างบนไว้ถูกต้องแล้ว
              </div>

              <div className="flex flex-wrap items-baseline gap-2">
                <span className="w-14">ลงชื่อ</span>
                <span className="border-b border-dotted border-black min-w-[240px] text-center px-2">
                  ........................................................
                </span>
                <span className="ml-2">วันที่</span>
                <span className="border-b border-dotted border-black min-w-[140px] text-center px-2">
                  ........ / ........ / ........
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
