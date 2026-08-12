import { useState, FormEvent } from 'react';
import { UserRoleMapping } from '../types';
import { Shield, Plus, RefreshCw, Mail, User, MapPin, AlertTriangle, Trash2, Check } from 'lucide-react';
import { motion } from 'motion/react';

export const ALL_STATIONS = [
  'นครราชสีมา',
  'ชุมทางถนนจิระ',
  'บ้านเกาะ',
  'บ้านกระโดน',
  'หนองแมว',
  'โนนสูง',
  'บ้านดงพลอง',
  'บ้านมะค่า',
  'พลสงคราม',
  'บ้านดอนใหญ่',
  'เมืองคง',
  'โนนทองหลาง',
  'ชุมทางบัวใหญ่',
  'หนองบัวลาย',
  'หนองมะเขือ',
  'เมืองพล',
  'บ้านหัน',
  'บ้านไผ่',
  'บ้านแฮด',
  'ท่าพระ',
  'ขอนแก่น',
  'สำราญ',
  'โนนพยอม',
  'น้ำพอง',
  'ห้วยเสียว',
  'เขาสวนกวาง',
  'โนนสะอาด',
  'ห้วยเกิ้ง',
  'กุมภวาปี',
  'ห้วยสามพาด',
  'หนองตะไก้',
  'หนองขอนกว้าง',
  'อุดรธานี',
  'นาพู่',
  'นาทา',
  'หนองคาย',
  'ฝ่ายการพัสดุ',
  'งานเดินรถแขวงนครราชสีมา',
];

interface UserRoleManagementProps {
  userRoles: UserRoleMapping[];
  onSaveUserRole: (mapping: UserRoleMapping) => Promise<void>;
  onDeleteUserRole?: (email: string) => Promise<void>;
  isMutating: boolean;
  refreshRoles: () => Promise<void>;
  currentUserEmail: string | null;
}

export default function UserRoleManagement({
  userRoles,
  onSaveUserRole,
  isMutating,
  refreshRoles,
  currentUserEmail,
}: UserRoleManagementProps) {
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'แอดมิน' | 'ผู้ใช้งาน'>('ผู้ใช้งาน');
  const [formStation, setFormStation] = useState('');
  const [editingStationEmail, setEditingStationEmail] = useState<string | null>(null);
  const [editingStationValue, setEditingStationValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formEmail.trim()) {
      setError('กรุณากรอกอีเมล Google Account');
      return;
    }
    if (!formEmail.includes('@')) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    if (!formName.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้งาน');
      return;
    }

    const mapping: UserRoleMapping = {
      email: formEmail.trim().toLowerCase(),
      name: formName.trim(),
      role: formRole,
      station: formStation.trim(),
      updatedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    };

    try {
      await onSaveUserRole(mapping);
      setSuccess(`บันทึกสิทธิ์ผู้เข้าใช้งานสำหรับ "${formEmail}" สำเร็จ`);
      setFormEmail('');
      setFormName('');
      setFormRole('ผู้ใช้งาน');
      setFormStation('');
    } catch (err: any) {
      setError(`บันทึกสิทธิ์ล้มเหลว: ${err.message}`);
    }
  };

  const handleRoleChangeInTable = async (user: UserRoleMapping, newRole: 'แอดมิน' | 'ผู้ใช้งาน') => {
    if (user.email.toLowerCase() === currentUserEmail?.toLowerCase()) {
      const confirmed = window.confirm(
        '⚠️ คุณกำลังเปลี่ยนบทบาทของตัวเอง! การลดบทบาทตัวเองเป็น "ผู้ใช้งานทั่วไป" จะทำให้คุณเสียสิทธิ์ในการเข้าถึงหน้านี้และสิทธิ์ในการจัดการข้อมูลพัสดุ\n\nยืนยันที่จะทำรายการหรือไม่?'
      );
      if (!confirmed) return;
    }

    const updatedMapping: UserRoleMapping = {
      ...user,
      role: newRole,
      updatedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    };

    try {
      await onSaveUserRole(updatedMapping);
    } catch (err: any) {
      alert(`ไม่สามารถอัปเดตสิทธิ์ได้: ${err.message}`);
    }
  };

  const handleSaveStationInTable = async (user: UserRoleMapping, newStation: string) => {
    const updatedMapping: UserRoleMapping = {
      ...user,
      station: newStation.trim(),
      updatedAt: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    };

    try {
      await onSaveUserRole(updatedMapping);
      setEditingStationEmail(null);
    } catch (err: any) {
      alert(`ไม่สามารถอัปเดตสถานีได้: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6" id="user-role-mgmt-root">
      {/* Header and Explanation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3" id="role-intro-card">
        <div className="flex items-center gap-3" id="role-title-group">
          <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600" id="role-title-icon">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">ระบบจัดการสิทธิ์ผู้ใช้งาน (User & Admin Roles)</h2>
            <p className="text-slate-400 text-xs font-semibold">กําหนดสิทธิ์การเข้าถึงข้อมูลและการทํารายการคลังพัสดุ</p>
          </div>
        </div>

        <p className="text-slate-500 text-xs leading-relaxed max-w-4xl" id="role-desc">
          ข้อมูลบทบาทผู้ใช้ทั้งหมดจะถูกซิงก์และจัดเก็บไว้บนชีต <span className="font-semibold text-indigo-600">"สิทธิ์การเข้าใช้งาน"</span> ในไฟล์ Google Sheets ของท่านโดยตรง เพื่อความปลอดภัยและความโปร่งใสสูงสุด สมาชิกจะแบ่งออกเป็น 2 บทบาทหลัก:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2" id="roles-comparison">
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/60 text-indigo-900" id="role-admin-card">
            <h4 className="text-sm font-bold flex items-center gap-1.5 mb-1 text-indigo-800">
              <span className="text-base">👑</span> แอดมิน (Admin)
            </h4>
            <p className="text-xs text-indigo-700/90 leading-normal">
              มีสิทธิ์เข้าถึงครบ 100% ทุกระบบ สามารถเพิ่ม แก้ไข และลบพัสดุหลัก จัดการสิทธิ์การเข้าใช้ของผู้ใช้งานอื่น ดูรายงานสรุปยอด และทำรายการรับเข้า/เบิกจ่ายพัสดุได้
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700" id="role-user-card">
            <h4 className="text-sm font-bold flex items-center gap-1.5 mb-1 text-slate-800">
              <span className="text-base">👤</span> ผู้ใช้งานทั่วไป (User)
            </h4>
            <p className="text-xs text-slate-500 leading-normal">
              มีสิทธิ์จำกัดเฉพาะการทำรายการรับเข้าพัสดุ (Stock Intake) และการเบิกพัสดุ (Stock Withdrawal) พร้อมดูรายงานพัสดุคงเหลือ (โหมดจำกัดสิทธิ์อ่านอย่างเดียวในหน้าจัดคลัง ไม่สามารถเพิ่ม/แก้ไข/ลบพัสดุหลักได้)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="role-mgmt-layout">
        {/* Left column: Add/Update Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 h-fit" id="role-form-wrapper">
          <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>เชิญหรือบันทึกสิทธิ์ล่วงหน้า</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4" id="role-form">
            <div className="space-y-1.5" id="form-group-email">
              <label className="text-slate-600 font-bold text-xs">อีเมล Google Account <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="เช่น example@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  id="form-email-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5" id="form-group-name">
              <label className="text-slate-600 font-bold text-xs">ชื่อผู้ใช้งานหรือสรรพนาม <span className="text-rose-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  id="form-name-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5" id="form-group-station">
              <label className="text-slate-600 font-bold text-xs flex justify-between items-center">
                <span>สถานี / หน่วยงานประจำ</span>
                <span className="text-[10px] text-indigo-600 font-semibold">เลือกหรือพิมพ์จากสถานีรถไฟ</span>
              </label>

              {/* Quick Station Click Pills */}
              <div className="flex flex-wrap gap-1 mb-1" id="role-quick-stations">
                {['นครราชสีมา', 'ชุมทางถนนจิระ', 'ขอนแก่น', 'อุดรธานี', 'หนองคาย', 'งานเดินรถแขวงนครราชสีมา'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFormStation(st)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      formStation === st
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                  >
                    📍 {st}
                  </button>
                ))}
              </div>

              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    list="station-options-list"
                    placeholder="เลือกจากรายการหรือพิมพ์ระบุ..."
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-slate-800"
                    id="form-station-input"
                  />
                  <datalist id="station-options-list">
                    {ALL_STATIONS.map((st) => (
                      <option key={st} value={st} />
                    ))}
                  </datalist>
                </div>

                <select
                  onChange={(e) => {
                    if (e.target.value) setFormStation(e.target.value);
                  }}
                  value={ALL_STATIONS.includes(formStation) ? formStation : ''}
                  className="px-2 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer max-w-[140px]"
                  id="form-station-select-dropdown"
                >
                  <option value="">-- เลือกสถานี --</option>
                  {ALL_STATIONS.map((st) => (
                    <option key={st} value={st}>
                      🚉 {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5" id="form-group-role">
              <label className="text-slate-600 font-bold text-xs">บทบาท / ระดับสิทธิ์</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as 'แอดมิน' | 'ผู้ใช้งาน')}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                id="form-role-select"
              >
                <option value="ผู้ใช้งาน">👤 ผู้ใช้งานทั่วไป (User)</option>
                <option value="แอดมิน">👑 แอดมินระบบ (Admin)</option>
              </select>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs p-3 rounded-lg flex items-start gap-2" id="form-error">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-lg flex items-start gap-2" id="form-success">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isMutating}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition duration-150"
              id="submit-role-btn"
            >
              {isMutating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>บันทึกสิทธิ์ผู้ใช้งาน</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right column: Users table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2" id="roles-table-wrapper">
          <div className="flex justify-between items-center" id="roles-table-header">
            <h3 className="text-slate-800 font-bold text-sm">สิทธิ์การเข้าใช้งานทั้งหมด ({userRoles.length})</h3>
            <button
              onClick={refreshRoles}
              disabled={isMutating}
              className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition duration-150"
              title="รีเฟรชสิทธิ์"
              id="refresh-roles-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isMutating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl" id="roles-table-container">
            <table className="w-full text-left text-xs" id="roles-table">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">อีเมลบัญชี Google</th>
                  <th className="py-3.5 px-4">ชื่อผู้ใช้</th>
                  <th className="py-3.5 px-4">สถานี / หน่วยงาน</th>
                  <th className="py-3.5 px-4">สิทธิ์การเข้าใช้งาน</th>
                  <th className="py-3.5 px-4">วันที่อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 font-semibold">
                      ไม่พบประวัติผู้ได้รับสิทธิ์
                    </td>
                  </tr>
                ) : (
                  userRoles.map((mapping) => {
                    const isSelf = mapping.email.toLowerCase() === currentUserEmail?.toLowerCase();
                    const isEditingStation = editingStationEmail === mapping.email;

                    return (
                      <tr key={mapping.email} className={`hover:bg-slate-50/50 transition-colors ${isSelf ? 'bg-indigo-50/20' : ''}`}>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[150px] sm:max-w-none">{mapping.email}</span>
                            {isSelf && (
                              <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                ตัวคุณ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{mapping.name}</td>
                        <td className="py-3.5 px-4">
                          {isEditingStation ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={ALL_STATIONS.includes(editingStationValue) ? editingStationValue : 'custom'}
                                onChange={(e) => {
                                  if (e.target.value !== 'custom') {
                                    setEditingStationValue(e.target.value);
                                    handleSaveStationInTable(mapping, e.target.value);
                                  } else {
                                    setEditingStationValue('');
                                  }
                                }}
                                className="px-1.5 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[130px] font-medium text-slate-800 bg-white"
                              >
                                <option value="">-- เลือกสถานี --</option>
                                {ALL_STATIONS.map((st) => (
                                  <option key={st} value={st}>
                                    🚉 {st}
                                  </option>
                                ))}
                                <option value="custom">✏️ พิมพ์ระบุเอง...</option>
                              </select>

                              {(!ALL_STATIONS.includes(editingStationValue) || editingStationValue === '') && (
                                <input
                                  type="text"
                                  value={editingStationValue}
                                  onChange={(e) => setEditingStationValue(e.target.value)}
                                  className="px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
                                  placeholder="ระบุสถานี..."
                                  autoFocus
                                />
                              )}

                              <button
                                type="button"
                                onClick={() => handleSaveStationInTable(mapping, editingStationValue)}
                                className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-[10px] cursor-pointer shrink-0"
                                title="บันทึก"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStationEmail(null)}
                                className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 text-[10px] cursor-pointer shrink-0"
                                title="ยกเลิก"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStationEmail(mapping.email);
                                setEditingStationValue(mapping.station || '');
                              }}
                              className="group flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors text-left"
                              title="คลิกเพื่อแก้ไขสถานี"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                              {mapping.station ? (
                                <span className="font-semibold text-slate-800">{mapping.station}</span>
                              ) : (
                                <span className="text-slate-400 italic font-normal text-[11px] group-hover:underline">
                                  + ระบุสถานี
                                </span>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={mapping.role}
                            onChange={(e) => handleRoleChangeInTable(mapping, e.target.value as 'แอดมิน' | 'ผู้ใช้งาน')}
                            className={`px-2 py-1 text-[11px] font-bold rounded-lg focus:outline-none border border-slate-200 bg-white cursor-pointer ${
                              mapping.role === 'แอดมิน'
                                ? 'text-indigo-700 border-indigo-200 bg-indigo-50/50'
                                : 'text-slate-600'
                            }`}
                          >
                            <option value="ผู้ใช้งาน">👤 ผู้ใช้งาน (User)</option>
                            <option value="แอดมิน">👑 แอดมิน (Admin)</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{mapping.updatedAt}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
