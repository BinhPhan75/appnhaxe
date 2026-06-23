import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  Server, 
  Database,
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  IdCard, 
  Calendar, 
  MapPin, 
  Phone, 
  User,
  Check
} from 'lucide-react';

interface BookedPassengerLog {
  id: string;
  name: string;
  phone: string;
  cccd: string;
  travelDate: string;
  pickupPoint: string;
  dropoffPoint: string;
  berthId: string;
  tripId: string;
  createdAt: string;
}

interface SupabaseConfig {
  isConfigured: boolean;
  supabaseUrl: string;
}

interface AdminPanelProps {
  buses: any[];
  selectedTripId: string;
  onSaveBusInfo: (info: {
    tripId: string;
    licensePlate: string;
    driverName: string;
    driverPhone: string;
    conductorName: string;
    conductorPhone: string;
    startName?: string;
    endName?: string;
    routeType?: string;
  }) => Promise<void>;
  onSelectTrip?: (tripId: string) => void;
  onDeleteTrip?: (tripId: string) => Promise<void>;
}

const FALLBACK_BUSES: Record<string, any> = {
  'sg-dl': {
    tripId: 'sg-dl',
    licensePlate: '51B-222.88',
    driverName: 'Nguyễn Văn Đạt',
    driverPhone: '0901235566',
    conductorName: 'Lê Hoàng Quân',
    conductorPhone: '0933556677',
    startName: 'BX Miền Tây (Sài Gòn)',
    endName: 'BX Liên Tỉnh Đà Lạt',
    routeType: 'national_highway'
  },
  'sg-ct': {
    tripId: 'sg-ct',
    licensePlate: '65B-111.22',
    driverName: 'Trần Văn Nam',
    driverPhone: '0918765432',
    conductorName: 'Lâm Văn Hải',
    conductorPhone: '0932112233',
    startName: 'BX Miền Tây (Sài Gòn)',
    endName: 'BX Trung Tâm Cần Thơ',
    routeType: 'national_highway'
  },
  'sg-nt': {
    tripId: 'sg-nt',
    licensePlate: '79B-888.99',
    driverName: 'Lê Quốc Bảo',
    driverPhone: '0905556677',
    conductorName: 'Nguyễn Văn An',
    conductorPhone: '0914445566',
    startName: 'BX Miền Đông (Sài Gòn)',
    endName: 'BX Phía Nam Nha Trang',
    routeType: 'national_highway'
  }
};

export default function AdminPanel({
  buses,
  selectedTripId,
  onSaveBusInfo,
  onSelectTrip,
  onDeleteTrip
 }: AdminPanelProps) {
  const [editingTripId, setEditingTripId] = useState(selectedTripId);

  // Mode to create dynamic trip
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTripId, setNewTripId] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local edit states
  const [plates, setPlates] = useState('');
  const [driver, setDriver] = useState('');
  const [drPhone, setDrPhone] = useState('');
  const [cond, setCond] = useState('');
  const [condPhone, setCondPhone] = useState('');

  // Sstart, end, and route options configuration states
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [routeOption, setRouteOption] = useState('national_highway');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Supabase connection & CRM log records state
  const [supaConfig, setSupaConfig] = useState<SupabaseConfig>({ isConfigured: false, supabaseUrl: '' });
  const [crmLogs, setCrmLogs] = useState<BookedPassengerLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Sync state modifications based on route selection
  useEffect(() => {
    if (isCreatingNew) return;
    const activeBus = (buses && buses.find(b => b.tripId === editingTripId)) || FALLBACK_BUSES[editingTripId] || FALLBACK_BUSES['sg-dl'];
    if (activeBus) {
      setPlates(activeBus.licensePlate || '');
      setDriver(activeBus.driverName || '');
      setDrPhone(activeBus.driverPhone || '');
      setCond(activeBus.conductorName || '');
      setCondPhone(activeBus.conductorPhone || '');
      setStartPoint(activeBus.startName || (editingTripId === 'sg-nt' ? 'BX Miền Đông (Sài Gòn)' : 'BX Miền Tây (Sài Gòn)'));
      setEndPoint(activeBus.endName || (editingTripId === 'sg-dl' ? 'BX Liên Tỉnh Đà Lạt' : editingTripId === 'sg-ct' ? 'BX Trung Tâm Cần Thơ' : 'BX Phía Nam Nha Trang'));
      setRouteOption(activeBus.routeType || 'national_highway');
    }
  }, [editingTripId, buses, selectedTripId, isCreatingNew]);

  // Load backend details
  const loadAdminData = async () => {
    try {
      // 1. Fetch Supabase Configuration
      const resConfig = await fetch('/api/supabase-config');
      if (resConfig.ok) {
        setSupaConfig(await resConfig.json());
      }
      // 2. Fetch CRM Customer Logs
      const resLogs = await fetch('/api/customer-logs');
      if (resLogs.ok) {
        setCrmLogs(await resLogs.json());
      }
    } catch (e) {
      console.warn('Failed loading administration logs from server', e);
    }
  };

  useEffect(() => {
    loadAdminData();
    const inv = setInterval(loadAdminData, 6000);
    return () => clearInterval(inv);
  }, []);

  const handlePublishInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const activeId = isCreatingNew 
        ? (`tuyen_${Date.now().toString(36)}`) 
        : editingTripId;

      await onSaveBusInfo({
        tripId: activeId,
        licensePlate: plates,
        driverName: driver,
        driverPhone: drPhone,
        conductorName: cond,
        conductorPhone: condPhone,
        startName: startPoint,
        endName: endPoint,
        routeType: routeOption
      });
      setSaveSuccess(true);
      
      if (isCreatingNew) {
        setIsCreatingNew(false);
        setEditingTripId(activeId);
        if (onSelectTrip) {
          onSelectTrip(activeId);
        }
      } else {
        if (onSelectTrip && activeId === selectedTripId) {
          onSelectTrip(activeId);
        }
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAction = async () => {
    if (onDeleteTrip) {
      try {
        await onDeleteTrip(editingTripId);
        setShowDeleteConfirm(false);
        // Find a surviving trip to edit instead
        const remaining = buses.find(b => b.tripId !== editingTripId);
        if (remaining) {
          setEditingTripId(remaining.tripId);
        } else {
          setEditingTripId('sg-dl');
        }
      } catch (err) {
        console.warn("Delete error", err);
      }
    }
  };

  const copySqlToClipboard = () => {
    const rawSql = `-- Script SQL khởi tạo bảng lưu trữ thông tin khách hàng đặt chỗ BH
CREATE TABLE passenger_bookings (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  phone text,
  cccd text,
  travel_date text,
  pickup_point text,
  dropoff_point text,
  berth_id text,
  trip_id text
);`;
    navigator.clipboard.writeText(rawSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const filteredLogs = crmLogs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.name.toLowerCase().includes(query) ||
      (log.phone && log.phone.includes(query)) ||
      (log.cccd && log.cccd.includes(query)) ||
      (log.pickupPoint && log.pickupPoint.toLowerCase().includes(query)) ||
      (log.dropoffPoint && log.dropoffPoint.toLowerCase().includes(query)) ||
      log.berthId.toLowerCase().includes(query)
    );
  });

  return (
    <div id="admin-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left panel column: Setup and Supabase Info */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Personnel configurations */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Hành Trình & Cấu Hình Xe</h3>
              <p className="text-[11px] text-slate-400">Thiết lập lộ trình đi, bến bãi, lựa chọn tuyến đường, tài xế & phụ xe</p>
            </div>
          </div>

          <form onSubmit={handlePublishInfo} className="space-y-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chọn Tuyến Xe Cấu Hình / Thêm Mới</label>
              <div className="flex gap-2">
                <select
                  value={isCreatingNew ? 'CREATE_NEW' : editingTripId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'CREATE_NEW') {
                      setIsCreatingNew(true);
                      setPlates('51B-123.45');
                      setDriver('Tài xế bổ sung');
                      setDrPhone('0901230000');
                      setCond('Nội bộ nhà xe');
                      setCondPhone('0933550000');
                      setStartPoint('');
                      setEndPoint('');
                      setRouteOption('national_highway');
                    } else {
                      setIsCreatingNew(false);
                      setEditingTripId(val);
                    }
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                >
                  <optgroup label="Danh sách tuyến hoạt động">
                    {buses && buses.length > 0 ? (
                      buses.map(bus => {
                        const typeLabel = bus.routeType === 'expressway' ? 'Cao Tốc' : bus.routeType === 'other' ? 'Tuyến Tránh' : 'Quốc Lộ';
                        const labelText = bus.startName && bus.endName
                          ? `${bus.startName} - ${bus.endName} (${bus.licensePlate})`
                          : bus.tripId;
                        return (
                          <option key={bus.tripId} value={bus.tripId}>
                            {labelText}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="sg-dl">Sài Gòn - Đà Lạt (Biển 51B)</option>
                        <option value="sg-ct">Sài Gòn - Cần Thơ (Biển 65B)</option>
                        <option value="sg-nt">Sài Gòn - Nha Trang (Biển 79B)</option>
                      </>
                    )}
                  </optgroup>
                  <optgroup label="Thao tác chức năng">
                    <option value="CREATE_NEW">➕ Tạo Tuyến Xe Hành Trình Mới...</option>
                  </optgroup>
                </select>

                {isCreatingNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setEditingTripId(selectedTripId);
                    }}
                    className="px-3 py-2 text-xs font-black bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-600 transition-all cursor-pointer"
                    title="Hủy, quay lại bến chỉnh sửa"
                  >
                    Hủy
                  </button>
                )}
              </div>

              {isCreatingNew && (
                <div className="bg-red-50 text-red-800 text-[11px] font-extrabold rounded-lg px-3 py-2 border border-red-200 flex items-center gap-1.5 mt-1.5">
                  <span className="w-2 h-2 bg-red-650 bg-red-500 rounded-full animate-ping"></span>
                  <span>ĐANG TẠO TUYẾN MỚI: Nhập chi tiết lộ trình bên dưới</span>
                </div>
              )}
            </div>

            {/* CẤU HÌNH TUYẾN ĐƯỜNG & HÀNH TRÌNH */}
            <div className="pt-2 pb-1 border-t border-dashed border-slate-100 flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-650 bg-red-500"></span>
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Cấu Hình Lộ Trình & Tuyến Xe</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bến Xuất Phát (Điểm Đi)</label>
                <input
                  type="text"
                  required
                  value={startPoint}
                  onChange={(e) => setStartPoint(e.target.value)}
                  placeholder="Ví dụ: BX Miền Tây (Sài Gòn)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bến Đích Đến (Điểm Đến)</label>
                <input
                  type="text"
                  required
                  value={endPoint}
                  onChange={(e) => setEndPoint(e.target.value)}
                  placeholder="Ví dụ: BX Liên Tỉnh Đà Lạt"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lựa Chọn Tuyến Đường Hành Trình</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRouteOption('national_highway')}
                  className={`px-3 py-2 rounded-lg border text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    routeOption === 'national_highway'
                      ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <span className="text-sm">🛣️</span>
                  <span>Quốc Lộ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRouteOption('expressway')}
                  className={`px-3 py-2 rounded-lg border text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    routeOption === 'expressway'
                      ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <span className="text-sm">⚡</span>
                  <span>Cao Tốc</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRouteOption('other')}
                  className={`px-3 py-2 rounded-lg border text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    routeOption === 'other'
                      ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <span className="text-sm">🌲</span>
                  <span>Tuyến Khác</span>
                </button>
              </div>
            </div>

            {/* PHƯƠNG TIỆN & NHÂN SỰ */}
            <div className="pt-3 pb-1 border-t border-dashed border-slate-100 flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-650 bg-red-500"></span>
              <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Thông Tin Xe & Nhân Viên</h4>
            </div>

            <div className="flex flex-col gap-1.5 font-sans">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Biển Số Xe (Kiểm Soát)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={plates}
                  onChange={(e) => setPlates(e.target.value)}
                  placeholder="Ví dụ: 51B-222.88"
                  className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <Bus className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Họ Tên Tài Xế chính</label>
                <input
                  type="text"
                  required
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  placeholder="Tên tài xế chính"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SĐT Liên Hệ Tài Xế</label>
                <input
                  type="text"
                  required
                  value={drPhone}
                  onChange={(e) => setDrPhone(e.target.value)}
                  placeholder="Số điện thoại tài xế"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Họ Tên Phụ Xe (Tiếp Viên)</label>
                <input
                  type="text"
                  required
                  value={cond}
                  onChange={(e) => setCond(e.target.value)}
                  placeholder="Họ tên phụ xe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SĐT Liên Hệ Phụ Xe</label>
                <input
                  type="text"
                  required
                  value={condPhone}
                  onChange={(e) => setCondPhone(e.target.value)}
                  placeholder="Số điện thoại phụ xe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3 border-t border-slate-100 mt-4">
              <div className="flex items-center justify-between gap-3">
                {saveSuccess && (
                  <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Đã đồng bộ nhà xe thành công!
                  </span>
                )}
                
                {/* Decommission route button - only for existing routes if more than 1 route exists */}
                {!isCreatingNew && buses && buses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    className="px-3.5 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    🗑️ Xóa Tuyến
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="ml-auto w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-black text-xs px-5 py-2 rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1"
                >
                  {saving ? (
                    'Đang kết nối...'
                  ) : isCreatingNew ? (
                    <>🚀 Khởi Hành Tuyến Mới</>
                  ) : (
                    <>💾 Lưu Cài Đặt Nhà Xe</>
                  )}
                </button>
              </div>

              {/* Secure Inline Deletion Confirmation Box */}
              {showDeleteConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs mt-2 animate-fade-in">
                  <p className="font-extrabold text-red-800">⚠️ Bạn có chắc chắn muốn XÓA tuyến xe hoạt động này?</p>
                  <p className="text-slate-500 mt-1">
                    Toàn bộ lộ trình [{startPoint} &rarr; {endPoint}], biển số {plates}, sơ đồ đặt vé & lịch sử định dạng xe sẽ bị gỡ bỏ khỏi cơ sở dữ liệu BH Bus.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleDeleteAction}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg cursor-pointer transition-colors"
                    >
                      Xác Nhận Xóa
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Hủy Bỏ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Supabase connection display */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Đồng bộ Supabase Cloud</h3>
              <p className="text-[11px] text-slate-400">Tự động đẩy thông tin hành khách để chăm sóc khách hàng</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {supaConfig.isConfigured ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-800">LIÊN KẾT SUPABASE THÀNH CÔNG</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5 break-all">URL: {supaConfig.supabaseUrl}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-800">Offline Fallback (RAM logs active)</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Hệ thống đang lưu trữ trực tiếp vào danh sách bộ nhớ tạm phía server. Cấu hình SUPABASE_URL & SUPABASE_ANON_KEY trong file .env để kết nối cloud hoàn chỉnh!
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-55 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">SQL Schema (Để tạo bảng)</span>
                <button
                  onClick={copySqlToClipboard}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-white border border-slate-200 px-2 py-1 rounded flex items-center gap-1 shadow-xs transition-all"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Đã Sao Chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Sao Chép SQL</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="mt-2 text-[9px] font-mono whitespace-pre text-slate-600 bg-slate-900 text-slate-300 p-2.5 rounded-md overflow-x-auto max-h-36 leading-normal scrollbar-thin">
{`CREATE TABLE passenger_bookings (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  phone text,
  cccd text,
  travel_date text,
  pickup_point text,
  dropoff_point text,
  berth_id text,
  trip_id text
);`}
              </pre>
            </div>
          </div>
        </div>

      </div>

      {/* Right panel column: Sổ lưu khách hàng */}
      <div className="lg:col-span-7 bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col min-h-[500px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-normal flex items-center gap-1.5">
              <Server className="w-4.5 h-4.5 text-red-600" />
              Sổ Danh Sách Hành Khách Đặt Chỗ (CRM Data Care)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Quản lý, truy vấn thông tin đặt phòng nằm của khách để chăm sóc dịch vụ</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Tra cứu khách bằng Tên / SĐT / CCCD / Giường..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-slate-400 text-slate-700 text-[11px]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto mt-4 overflow-y-auto max-h-[420px] scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-2.5 px-3 font-black">Mã Ghế</th>
                <th className="py-2.5 px-3 font-black">Khách Hàng</th>
                <th className="py-2.5 px-3 font-black">SĐT / CCCD</th>
                <th className="py-2.5 px-3 font-black text-center">Ngày Đi</th>
                <th className="py-2.5 px-3 font-black">Điểm Đón / Trả</th>
                <th className="py-2.5 px-3 font-black text-right">Mã Trip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-105 divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    <p className="text-sm font-semibold">Chưa có bản ghi nào!</p>
                    <p className="text-xs text-slate-350 text-slate-400 mt-1">Đăng ký đặt chỗ tại sơ đồ xe để tạo hồ sơ khách hàng mới.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all font-medium">
                    <td className="py-3 px-3">
                      <span className="bg-red-55 bg-red-100 text-red-750 text-red-800 font-extrabold px-1.5 py-0.5 rounded text-[10px] tracking-wide border border-red-200">
                        {log.berthId}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{log.name}</td>
                    <td className="py-3 px-3">
                      <div>
                        <div className="flex items-center gap-1 font-mono font-semibold text-slate-755 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{log.phone || 'Chưa cung cấp'}</span>
                        </div>
                        {log.cccd && (
                          <div className="flex items-center gap-1 font-mono font-medium text-[10px] text-slate-400 mt-0.5">
                            <IdCard className="w-3 h-3 text-slate-400" />
                            <span>CCCD: {log.cccd}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{log.travelDate || 'Trong ngày'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-[180px] break-words">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-755 text-slate-700 font-semibold">
                          <MapPin className="w-3 h-3 text-red-500" />
                          <span>Đón: {log.pickupPoint || 'BX Miền Tây'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-500" />
                          <span>Trả: {log.dropoffPoint || 'BX Liên tỉnh'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-400 uppercase tracking-wide">
                      {log.tripId}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}