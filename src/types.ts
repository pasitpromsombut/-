export interface Product {
  id: string; // รหัสสินค้า
  name: string; // ชื่อสินค้า
  category: string; // หมวดหมู่
  quantity: number; // จำนวนคงเหลือ
  minStock: number; // ขั้นต่ำที่แจ้งเตือนสินค้าใกล้หมด
  price: number; // ราคาต่อหน่วย
  unit: string; // หน่วยนับ (เช่น ชิ้น, กล่อง, แพ็ค)
  updatedAt: string; // อัปเดตล่าสุด
  imageUrl?: string; // URL รูปภาพสินค้า
}

export type ShippingStatus = 'กำลังเตรียมจัดส่ง' | 'อยู่ระหว่างจัดส่ง' | 'จัดส่งสำเร็จ' | 'ยกเลิกการจัดส่ง';

export interface Transaction {
  id: string; // รหัสรายการ (TX-XXXXXX)
  timestamp: string; // วัน-เวลา
  type: 'รับเข้า' | 'เบิกออก'; // ประเภทรายการ
  productId: string; // รหัสสินค้า
  productName: string; // ชื่อสินค้า
  quantity: number; // จำนวน
  userEmail: string; // อีเมลผู้ทำรายการ
  note: string; // หมายเหตุ
  shippingStatus?: ShippingStatus; // สถานะการจัดส่ง
}

export interface DailyReport {
  date: string;
  totalInTransactions: number;
  totalOutTransactions: number;
  totalInQuantity: number;
  totalOutQuantity: number;
  totalInValue: number;
  totalOutValue: number;
  transactions: Transaction[];
}

export interface UserRoleMapping {
  email: string; // อีเมลผู้ใช้งาน
  name: string; // ชื่อ
  role: 'แอดมิน' | 'ผู้ใช้งาน'; // บทบาท (แอดมิน หรือ ผู้ใช้งานทั่วไป)
  station?: string; // สถานีประจำ / หน่วยงาน
  updatedAt: string; // วันที่อัปเดตล่าสุด
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

