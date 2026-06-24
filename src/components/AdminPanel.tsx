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
  isBusRoutesTableMissing?: boolean;
  isPassengerBookingsTableMissing?: boolean;
}

const VIETNAM_TERMINALS = [
  { name: 'Bến xe Miền Tây (Sài Gòn)', coords: { lat: 10.7494, lng: 106.6171 } },
  { name: 'Bến xe Miền Đông mới (Sài Gòn)', coords: { lat: 10.8841, lng: 106.8282 } },
  { name: 'Bến xe An Sương (Sài Gòn)', coords: { lat: 10.8407, lng: 106.6192 } },
  { name: 'Bến xe Ngã Tư Ga (Sài Gòn)', coords: { lat: 10.8524, lng: 106.6896 } },
  { name: 'Văn phòng Đề Thám (Quận 1, Sài Gòn)', coords: { lat: 10.7675, lng: 106.6934 } },
  { name: 'Bến xe Liên Tỉnh Đà Lạt', coords: { lat: 11.9333, lng: 108.4503 } },
  { name: 'Văn phòng Lữ Gia (Đà Lạt)', coords: { lat: 11.9547, lng: 108.4568 } },
  { name: 'Văn phòng Bảo Lộc (Lâm Đồng)', coords: { lat: 11.5434, lng: 107.8031 } },
  { name: 'Bến xe Di Linh (Lâm Đồng)', coords: { lat: 11.5833, lng: 108.0833 } },
  { name: 'Bến xe Trung Tâm Cần Thơ', coords: { lat: 10.0152, lng: 105.7487 } },
  { name: 'Bến xe Phía Nam Nha Trang', coords: { lat: 12.2224, lng: 109.1672 } },
  { name: 'Bến xe Trung Tâm Đà Nẵng', coords: { lat: 16.0544, lng: 108.2022 } },
  { name: 'Bến xe Mỹ Đình (Hà Nội)', coords: { lat: 21.0285, lng: 105.7783 } },
  { name: 'Bến xe Giáp Bát (Hà Nội)', coords: { lat: 20.9791, lng: 105.8402 } },
  { name: 'Bến xe Nước Ngầm (Hà Nội)', coords: { lat: 20.9752, lng: 105.8454 } },
  { name: 'Bến xe Vũng Tàu', coords: { lat: 10.3460, lng: 107.0843 } },
  { name: 'Trạm Phan Thiết (Bình Thuận)', coords: { lat: 10.9322, lng: 108.1011 } },
  { name: 'Bến xe Quy Nhơn (Bình Định)', coords: { lat: 13.7820, lng: 109.2205 } },
  { name: 'Bến xe Rạch Giá (Kiên Giang)', coords: { lat: 10.0124, lng: 105.0809 } },
  { name: 'Bến xe Trung tâm Buôn Ma Thuột (Đắk Lắk)', coords: { lat: 12.6667, lng: 108.0500 } },
  { name: 'Bến xe Phía Nam Huế', coords: { lat: 16.4343, lng: 107.5995 } },
  { name: 'Bến xe Vinh (Nghệ An)', coords: { lat: 18.6734, lng: 105.6811 } },
  { name: 'Bến xe Cầu Rào (Hải Phòng)', coords: { lat: 20.8149, lng: 106.6981 } },
  { name: 'Bến xe Sa Pa (Lào Cai)', coords: { lat: 22.3364, lng: 103.8438 } },
  { name: 'Bến xe Quảng Ngãi', coords: { lat: 15.1205, lng: 108.7915 } },
  { name: 'Bến xe Tây Ninh', coords: { lat: 11.3117, lng: 106.1014 } }
];

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
    startCoords?: { lat: number; lng: number };
    endCoords?: { lat: number; lng: number };
    status?: 'active' | 'inactive';
  }) => Promise<void>;
  onSelectTrip?: (tripId: string) => void;
  onDeleteTrip?: (tripId: string) => Promise<void>;
  vehicles?: any[];
  onSaveVehicle?: (vehicle: any) => Promise<void>;
  onDeleteVehicle?: (licensePlate: string) => Promise<void>;
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
  onDeleteTrip,
  vehicles = [],
  onSaveVehicle,
  onDeleteVehicle
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

  // Accurate coordinates and status states
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [endLat, setEndLat] = useState('');
  const [endLng, setEndLng] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Autocomplete UI state
  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Supabase connection & CRM log records state
  const [supaConfig, setSupaConfig] = useState<SupabaseConfig>({ isConfigured: false, supabaseUrl: '' });
  const [crmLogs, setCrmLogs] = useState<BookedPassengerLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedBusSql, setCopiedBusSql] = useState(false);
  const [activeSqlTab, setActiveSqlTab] = useState<'bookings' | 'routes'>('bookings');

  // New tab navigation for AdminPanel
  const [activeAdminTab, setActiveAdminTab] = useState<'routes' | 'fleet'>('routes');

  // Fleet management states
  const [vehiclePlates, setVehiclePlates] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('Thaco');
  const [vehicleType, setVehicleType] = useState<'sleeper_22' | 'sleeper_34' | 'chair_45' | 'limo_9' | 'chair_16'>('sleeper_34');
  const [vehicleRegDate, setVehicleRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState<any | null>(null);
  const [copiedVehicleSql, setCopiedVehicleSql] = useState(false);
  const [previewFloor, setPreviewFloor] = useState<'lower' | 'upper'>('lower');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [saveVehicleSuccess, setSaveVehicleSuccess] = useState(false);

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

      const sCoords = activeBus.startCoords || (activeBus.waypoints && activeBus.waypoints.length > 0 ? activeBus.waypoints[0].coords : undefined);
      const eCoords = activeBus.endCoords || (activeBus.waypoints && activeBus.waypoints.length > 0 ? activeBus.waypoints[activeBus.waypoints.length - 1].coords : undefined);

      setStartLat(sCoords ? sCoords.lat.toString() : '');
      setStartLng(sCoords ? sCoords.lng.toString() : '');
      setEndLat(eCoords ? eCoords.lat.toString() : '');
      setEndLng(eCoords ? eCoords.lng.toString() : '');
      setStatus(activeBus.status || 'active');
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

      const startCoordsObj = startLat && startLng ? { lat: parseFloat(startLat), lng: parseFloat(startLng) } : undefined;
      const endCoordsObj = endLat && endLng ? { lat: parseFloat(endLat), lng: parseFloat(endLng) } : undefined;

      await onSaveBusInfo({
        tripId: activeId,
        licensePlate: plates,
        driverName: driver,
        driverPhone: drPhone,
        conductorName: cond,
        conductorPhone: condPhone,
        startName: startPoint,
        endName: endPoint,
        routeType: routeOption,
        startCoords: startCoordsObj,
        endCoords: endCoordsObj,
        status: status
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

  const copyBusSqlToClipboard = () => {
    const rawSql = `-- Script SQL khởi tạo bảng lưu trữ các tuyến xe (bus routes)
CREATE TABLE bus_routes (
  trip_id text PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  layout_capacity integer DEFAULT 34,
  license_plate text,
  driver_name text,
  driver_phone text,
  conductor_name text,
  conductor_phone text,
  start_name text,
  end_name text,
  route_type text,
  status text DEFAULT 'active',
  start_coords jsonb,
  end_coords jsonb,
  current_location jsonb,
  speed integer DEFAULT 60,
  is_simulating boolean DEFAULT true,
  is_offline boolean DEFAULT false,
  simulation_progress numeric DEFAULT 0,
  waypoints jsonb DEFAULT '[]'::jsonb,
  berths jsonb DEFAULT '[]'::jsonb
);`;
    navigator.clipboard.writeText(rawSql);
    setCopiedBusSql(true);
    setTimeout(() => setCopiedBusSql(false), 3000);
  };

  const handleSaveVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveVehicle || !vehiclePlates.trim()) return;
    setSavingVehicle(true);
    setSaveVehicleSuccess(false);

    const capacityMap: Record<string, number> = {
      'sleeper_22': 22,
      'sleeper_34': 34,
      'chair_45': 45,
      'limo_9': 9,
      'chair_16': 16
    };

    try {
      await onSaveVehicle({
        licensePlate: vehiclePlates.trim().toUpperCase(),
        brand: vehicleBrand,
        vehicleType,
        capacity: capacityMap[vehicleType] || 34,
        registrationDate: vehicleRegDate
      });
      setSaveVehicleSuccess(true);
      
      setVehiclePlates('');
      setVehicleBrand('Thaco');
      setVehicleType('sleeper_34');
      setVehicleRegDate(new Date().toISOString().split('T')[0]);
      setSelectedVehicleForEdit(null);

      setTimeout(() => setSaveVehicleSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleEditVehicle = (veh: any) => {
    setSelectedVehicleForEdit(veh);
    setVehiclePlates(veh.licensePlate);
    setVehicleBrand(veh.brand);
    setVehicleType(veh.vehicleType);
    setVehicleRegDate(veh.registrationDate);
  };

  const handleDeleteVehicleSubmit = async (plate: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa xe ${plate} khỏi đội xe?`)) {
      if (onDeleteVehicle) {
        await onDeleteVehicle(plate);
      }
    }
  };

  const copyVehicleSqlToClipboard = () => {
    const rawSql = `-- Script SQL khởi tạo bảng quản lý đội xe và đăng kiểm BH
CREATE TABLE vehicles (
  license_plate text PRIMARY KEY,
  brand text NOT NULL,
  vehicle_type text NOT NULL,
  capacity integer NOT NULL,
  registration_date text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);`;
    navigator.clipboard.writeText(rawSql);
    setCopiedVehicleSql(true);
    setTimeout(() => setCopiedVehicleSql(false), 3000);
  };

  const renderVehicleLayout = (type: string) => {
    const isSleeper = type === 'sleeper_22' || type === 'sleeper_34';
    
    let seatsList: { id: string; label: string; row: string; number: number }[] = [];
    
    if (type === 'sleeper_22') {
      const currentFloor = previewFloor;
      const rowALetter = currentFloor === 'lower' ? 'A' : 'D';
      const rowBLetter = currentFloor === 'lower' ? 'B' : 'E';
      const rowCLetter = currentFloor === 'lower' ? 'C' : 'F';
      
      for (let i = 1; i <= 4; i++) seatsList.push({ id: `L_${rowALetter}${i}`, label: `${rowALetter}${i}`, row: 'Left', number: i });
      for (let i = 1; i <= 3; i++) seatsList.push({ id: `M_${rowBLetter}${i}`, label: `${rowBLetter}${i}`, row: 'Middle', number: i });
      for (let i = 1; i <= 4; i++) seatsList.push({ id: `R_${rowCLetter}${i}`, label: `${rowCLetter}${i}`, row: 'Right', number: i });
    } else if (type === 'sleeper_34') {
      const currentFloor = previewFloor;
      const rowALetter = currentFloor === 'lower' ? 'A' : 'D';
      const rowBLetter = currentFloor === 'lower' ? 'B' : 'E';
      const rowCLetter = currentFloor === 'lower' ? 'C' : 'F';
      
      for (let i = 1; i <= 6; i++) seatsList.push({ id: `L_${rowALetter}${i}`, label: `${rowALetter}${i}`, row: 'Left', number: i });
      for (let i = 1; i <= 5; i++) seatsList.push({ id: `M_${rowBLetter}${i}`, label: `${rowBLetter}${i}`, row: 'Middle', number: i });
      for (let i = 1; i <= 6; i++) seatsList.push({ id: `R_${rowCLetter}${i}`, label: `${rowCLetter}${i}`, row: 'Right', number: i });
    } else if (type === 'chair_45') {
      for (let i = 1; i <= 11; i++) {
        seatsList.push({ id: `A${i}`, label: `A${i}`, row: 'Col 1', number: i });
        seatsList.push({ id: `B${i}`, label: `B${i}`, row: 'Col 2', number: i });
        seatsList.push({ id: `C${i}`, label: `C${i}`, row: 'Col 3', number: i });
        seatsList.push({ id: `D${i}`, label: `D${i}`, row: 'Col 4', number: i });
      }
      seatsList.push({ id: `G45`, label: `G45`, row: 'Col 1', number: 45 });
    } else if (type === 'limo_9') {
      seatsList.push({ id: `A1`, label: `A1`, row: 'Left', number: 1 });
      seatsList.push({ id: `A2`, label: `A2`, row: 'Right', number: 2 });
      seatsList.push({ id: `B3`, label: `B3`, row: 'Left', number: 3 });
      seatsList.push({ id: `B4`, label: `B4`, row: 'Middle', number: 4 });
      seatsList.push({ id: `B5`, label: `B5`, row: 'Right', number: 5 });
      seatsList.push({ id: `C6`, label: `C6`, row: 'Left', number: 6 });
      seatsList.push({ id: `C7`, label: `C7`, row: 'Right', number: 7 });
      seatsList.push({ id: `D8`, label: `D8`, row: 'Left', number: 8 });
      seatsList.push({ id: `D9`, label: `D9`, row: 'Right', number: 9 });
    } else if (type === 'chair_16') {
      for (let i = 1; i <= 5; i++) {
        seatsList.push({ id: `A${i}`, label: `A${i}`, row: 'Col 1', number: i });
        seatsList.push({ id: `B${i}`, label: `B${i}`, row: 'Col 2', number: i });
        seatsList.push({ id: `C${i}`, label: `C${i}`, row: 'Col 3', number: i });
      }
      seatsList.push({ id: `G16`, label: `G16`, row: 'Col 1', number: 16 });
    }

    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 font-sans shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>✨ Sơ đồ xe:</span>
            <span className="text-red-500 font-extrabold uppercase">
              {type === 'sleeper_22' ? 'VIP Cabin 22 Phòng' :
               type === 'sleeper_34' ? 'VIP Cabin 34 Phòng' :
               type === 'chair_45' ? 'Ghế ngồi 45 Chỗ' :
               type === 'limo_9' ? 'Limousine 9 Ghế' :
               'Xe 16 Chỗ'}
            </span>
          </h4>

          {isSleeper && (
            <div className="flex gap-1.5 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewFloor('lower')}
                className={`px-2.5 py-1 text-[10px] font-black rounded-md uppercase transition-all ${
                  previewFloor === 'lower' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tầng Dưới
              </button>
              <button
                type="button"
                onClick={() => setPreviewFloor('upper')}
                className={`px-2.5 py-1 text-[10px] font-black rounded-md uppercase transition-all ${
                  previewFloor === 'upper' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tầng Trên
              </button>
            </div>
          )}
        </div>

        {/* Bus physical container */}
        <div className="max-w-[280px] mx-auto bg-slate-950 rounded-t-3xl rounded-b-xl border-x border-t-2 border-b border-slate-800 p-4 relative">
          
          {/* Windshield */}
          <div className="h-9 bg-slate-800/40 rounded-t-2xl border-b border-slate-800 flex items-center justify-between px-4 mb-4 text-slate-500 text-[10px] font-mono">
            <span className="w-4 h-1.5 bg-slate-700 rounded-sm"></span>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Kính chắn gió</span>
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
          </div>

          {/* Dashboard and Driver Cabin */}
          <div className="flex justify-between items-center px-4 pb-3 border-b border-slate-800 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-500">
                ⎔
              </div>
              <span className="text-[8px] text-slate-500 mt-0.5">Vô lăng</span>
            </div>
            <div className="bg-slate-800 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[8px] font-black text-slate-300 uppercase">Tài Xế</span>
            </div>
          </div>

          {/* Grid display depending on coach layout */}
          {type === 'sleeper_22' || type === 'sleeper_34' ? (
            <div className="grid grid-cols-3 gap-3">
              {/* Left Column */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] text-center font-bold text-slate-600 uppercase tracking-widest border-b border-slate-900 pb-0.5">Dãy Trái</span>
                {seatsList.filter(s => s.row === 'Left').map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs font-black text-slate-300 shadow-md flex flex-col justify-between items-center h-11 relative">
                    <span className="text-[10px] text-red-500 font-extrabold">{s.label}</span>
                    <span className="text-[7px] text-slate-500 font-medium">Cabin VIP</span>
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                  </div>
                ))}
              </div>

              {/* Middle Column */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] text-center font-bold text-slate-600 uppercase tracking-widest border-b border-slate-900 pb-0.5">Dãy Giữa</span>
                {seatsList.filter(s => s.row === 'Middle').map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs font-black text-slate-300 shadow-md flex flex-col justify-between items-center h-11 relative">
                    <span className="text-[10px] text-slate-450 font-extrabold text-slate-400">{s.label}</span>
                    <span className="text-[7px] text-slate-500 font-medium">Cabin VIP</span>
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                  </div>
                ))}
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] text-center font-bold text-slate-600 uppercase tracking-widest border-b border-slate-900 pb-0.5">Dãy Phải</span>
                {seatsList.filter(s => s.row === 'Right').map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs font-black text-slate-300 shadow-md flex flex-col justify-between items-center h-11 relative">
                    <span className="text-[10px] text-red-500 font-extrabold">{s.label}</span>
                    <span className="text-[7px] text-slate-500 font-medium">Cabin VIP</span>
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : type === 'chair_45' ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 11 }).map((_, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {seatsList.filter(s => s.id !== 'G45' && s.number % 4 === (rowIndex * 4) % 4).slice(rowIndex * 4, rowIndex * 4 + 4).map(s => (
                      <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-md p-1 py-1.5 text-center text-[10px] font-black text-slate-300 shadow-sm flex flex-col justify-center items-center">
                        <span className="text-red-400">{s.label}</span>
                        <span className="text-[6px] text-slate-550 text-slate-500">Ghế Ngồi</span>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1 pt-1.5 border-t border-slate-900">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-md p-1 text-center text-[9px] font-black text-slate-300 shadow-sm">
                    <span className="text-emerald-500">G{41 + i}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : type === 'limo_9' ? (
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-3 gap-3">
                {seatsList.map(s => (
                  <div key={s.id} className="bg-slate-900 border border-amber-900/30 rounded-lg p-2 text-center text-xs font-black text-amber-500 shadow-md flex flex-col justify-between items-center h-12 relative border-t-2 border-t-amber-600/50">
                    <span className="text-[10px] font-extrabold">{s.label}</span>
                    <span className="text-[7px] text-slate-400 font-medium">LIMO VIP</span>
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500/20"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {seatsList.filter(s => s.id !== 'G16').map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-xs font-black text-slate-300 shadow-md flex flex-col justify-center items-center h-10">
                    <span className="text-red-400 font-extrabold">{s.label}</span>
                    <span className="text-[6px] text-slate-500">Tiêu Chuẩn</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-900">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-md p-1 text-center text-[9px] font-black text-slate-300">
                    <span className="text-red-400">G{13 + i}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-2 bg-slate-800 rounded-b-lg border-t border-slate-900 mt-4 text-[6px] text-center text-slate-600 font-mono">
            CỬA THOÁT HIỂM SAU
          </div>

        </div>
      </div>
    );
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
    <div className="flex flex-col gap-6 w-full">
      
      {/* Sub-tab navigation for AdminPanel */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveAdminTab('routes')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeAdminTab === 'routes'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>🗺️</span>
          Quản lý Tuyến & Lộ trình
        </button>
        <button
          onClick={() => setActiveAdminTab('fleet')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeAdminTab === 'fleet'
              ? 'border-red-600 text-red-600 bg-red-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>🚌</span>
          Quản lý Đội xe & Đăng kiểm
        </button>
      </div>

      {activeAdminTab === 'routes' ? (
        <>
          <div id="admin-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
      
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

            <div className="grid grid-cols-2 gap-3 relative">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bến Xuất Phát (Điểm Đi)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={startPoint}
                    onChange={(e) => {
                      setStartPoint(e.target.value);
                      setActiveInput('start');
                    }}
                    onFocus={() => setActiveInput('start')}
                    placeholder="Ví dụ: BX Miền Tây (Sài Gòn)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {activeInput === 'start' && (
                    <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg text-xs font-semibold">
                      {VIETNAM_TERMINALS.filter(t => t.name.toLowerCase().includes(startPoint.toLowerCase())).map((t, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50"
                          onMouseDown={() => {
                            setStartPoint(t.name);
                            setStartLat(t.coords.lat.toString());
                            setStartLng(t.coords.lng.toString());
                            setActiveInput(null);
                          }}
                        >
                          <span>{t.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">📍 {t.coords.lat}, {t.coords.lng}</span>
                        </div>
                      ))}
                      <div 
                        className="p-1 px-3 bg-slate-50 border-t border-slate-100 text-[10px] text-right text-slate-400 cursor-pointer font-bold"
                        onMouseDown={() => setActiveInput(null)}
                      >
                        Đóng ✖
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bến Đích Đến (Điểm Đến)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={endPoint}
                    onChange={(e) => {
                      setEndPoint(e.target.value);
                      setActiveInput('end');
                    }}
                    onFocus={() => setActiveInput('end')}
                    placeholder="Ví dụ: BX Liên Tỉnh Đà Lạt"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {activeInput === 'end' && (
                    <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg text-xs font-semibold">
                      {VIETNAM_TERMINALS.filter(t => t.name.toLowerCase().includes(endPoint.toLowerCase())).map((t, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50"
                          onMouseDown={() => {
                            setEndPoint(t.name);
                            setEndLat(t.coords.lat.toString());
                            setEndLng(t.coords.lng.toString());
                            setActiveInput(null);
                          }}
                        >
                          <span>{t.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">📍 {t.coords.lat}, {t.coords.lng}</span>
                        </div>
                      ))}
                      <div 
                        className="p-1 px-3 bg-slate-50 border-t border-slate-100 text-[10px] text-right text-slate-400 cursor-pointer font-bold"
                        onMouseDown={() => setActiveInput(null)}
                      >
                        Đóng ✖
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PHẦN GỢI Ý & ĐIỀU CHỈNH TOẠ ĐỘ PHỤC VỤ GHIM BẢN ĐỒ CHÍNH XÁC */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-2 mt-1">
              <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                📍 Gợi ý vị trí Ghim bản đồ (Tự động cập nhật khi chọn gợi ý hoặc tự điều chỉnh)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Toạ độ bắt đầu (Lat / Lng)</span>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Latitude"
                      value={startLat}
                      onChange={(e) => setStartLat(e.target.value)}
                      className="w-1/2 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Longitude"
                      value={startLng}
                      onChange={(e) => setStartLng(e.target.value)}
                      className="w-1/2 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Toạ độ kết thúc (Lat / Lng)</span>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Latitude"
                      value={endLat}
                      onChange={(e) => setEndLat(e.target.value)}
                      className="w-1/2 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Longitude"
                      value={endLng}
                      onChange={(e) => setEndLng(e.target.value)}
                      className="w-1/2 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* TRẠNG THÁI HOẠT ĐỘNG */}
            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trạng thái tuyến hành trình</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`px-3 py-2 rounded-lg border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    status === 'active'
                      ? 'bg-emerald-50 border-emerald-250 text-emerald-700 ring-1 ring-emerald-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Đang hoạt động (Kích hoạt)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  className={`px-3 py-2 rounded-lg border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    status === 'inactive'
                      ? 'bg-amber-50 border-amber-250 text-amber-700 ring-1 ring-amber-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Chờ hoạt động (Dự phòng)</span>
                </button>
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
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={plates}
                    onChange={(e) => setPlates(e.target.value)}
                    placeholder="Ví dụ: 51B-222.88"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <Bus className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {vehicles && vehicles.length > 0 && (
                  <select
                    value={vehicles.some(v => v.licensePlate === plates) ? plates : ''}
                    onChange={(e) => {
                      const selectedPlate = e.target.value;
                      if (selectedPlate) {
                        setPlates(selectedPlate);
                      }
                    }}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2 text-xs font-extrabold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">-- Chọn từ Đội xe --</option>
                    {vehicles.map(v => (
                      <option key={v.licensePlate} value={v.licensePlate}>
                        {v.licensePlate} ({v.brand})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {(() => {
                const vehicle = vehicles?.find(v => v.licensePlate === plates);
                if (vehicle) {
                  const regDate = new Date(vehicle.registrationDate);
                  const expDate = new Date(regDate.getFullYear() + 1, regDate.getMonth(), regDate.getDate());
                  const today = new Date('2026-06-24');
                  const diffTime = expDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (diffDays <= 0) {
                    return (
                      <div className="text-[10px] bg-red-50 text-red-700 border border-red-250 border-red-200 px-2 py-1.5 rounded-md font-bold mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                        <span>Cảnh báo Đăng kiểm: XE ĐÃ HẾT HẠN ({expDate.toISOString().split('T')[0]})!</span>
                      </div>
                    );
                  } else if (diffDays <= 30) {
                    return (
                      <div className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1.5 rounded-md font-bold mt-1.5 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Sắp hết hạn đăng kiểm trong {diffDays} ngày ({expDate.toISOString().split('T')[0]})!</span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-1.5 rounded-md font-bold mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đăng kiểm hoạt động an toàn (Hạn còn {diffDays} ngày).</span>
                      </div>
                    );
                  }
                }
                return null;
              })()}
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

            {supaConfig.isConfigured && (supaConfig.isBusRoutesTableMissing || supaConfig.isPassengerBookingsTableMissing) && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">⚠️ THIẾU BẢNG TRONG SUPABASE</p>
                  <p className="text-[10px] text-amber-700 mt-1 leading-normal">
                    {supaConfig.isBusRoutesTableMissing && supaConfig.isPassengerBookingsTableMissing 
                      ? 'Hai bảng (passenger_bookings & bus_routes) chưa được tìm thấy trong cơ sở dữ liệu Supabase của bạn.' 
                      : supaConfig.isBusRoutesTableMissing 
                        ? 'Bảng tuyến đường xe (bus_routes) chưa tồn tại trong cơ sở dữ liệu Supabase của bạn.' 
                        : 'Bảng khách đặt chỗ (passenger_bookings) chưa tồn tại trong cơ sở dữ liệu Supabase của bạn.'}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1.5 font-medium leading-normal">
                    Hãy bấm nút <strong className="text-slate-700">Sao chép</strong> ở bảng tương ứng phía dưới, dán và chạy SQL trong <strong className="text-slate-700">SQL Editor</strong> của bảng điều khiển Supabase của bạn!
                  </p>
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">SQL Schema (Để tạo bảng)</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveSqlTab('bookings')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tight transition-all cursor-pointer ${
                      activeSqlTab === 'bookings'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-200/50 hover:bg-slate-200 text-slate-500'
                    }`}
                  >
                    Khách Hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSqlTab('routes')}
                    className={`px-2 py-0.5 rounded text-[10px] font-black tracking-tight transition-all cursor-pointer ${
                      activeSqlTab === 'routes'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-200/50 hover:bg-slate-200 text-slate-500'
                    }`}
                  >
                    Tuyến Đường
                  </button>
                </div>
              </div>

              {activeSqlTab === 'bookings' ? (
                <>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 mb-1.5 text-[9px] text-slate-400 font-bold">
                    <span>1. Bảng Đặt Chỗ (passenger_bookings)</span>
                    <button
                      type="button"
                      onClick={copySqlToClipboard}
                      className="text-[9px] font-black text-red-600 hover:text-red-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs transition-all cursor-pointer"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          <span>Đã Lưu!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[9px] font-mono whitespace-pre text-slate-300 bg-slate-900 p-2.5 rounded-md overflow-x-auto max-h-40 leading-normal scrollbar-thin">
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
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/50 mb-1.5 text-[9px] text-slate-400 font-bold">
                    <span>2. Bảng Tuyến Xe (bus_routes)</span>
                    <button
                      type="button"
                      onClick={copyBusSqlToClipboard}
                      className="text-[9px] font-black text-red-600 hover:text-red-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-xs transition-all cursor-pointer"
                    >
                      {copiedBusSql ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          <span>Đã Lưu!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[9px] font-mono whitespace-pre text-slate-300 bg-slate-900 p-2.5 rounded-md overflow-x-auto max-h-40 leading-normal scrollbar-thin">
{`CREATE TABLE bus_routes (
  trip_id text PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  layout_capacity integer DEFAULT 34,
  license_plate text,
  driver_name text,
  driver_phone text,
  conductor_name text,
  conductor_phone text,
  start_name text,
  end_name text,
  route_type text,
  status text DEFAULT 'active',
  start_coords jsonb,
  end_coords jsonb,
  current_location jsonb,
  speed integer DEFAULT 60,
  is_simulating boolean DEFAULT true,
  is_offline boolean DEFAULT false,
  simulation_progress numeric DEFAULT 0,
  waypoints jsonb DEFAULT '[]'::jsonb,
  berths jsonb DEFAULT '[]'::jsonb
);`}
                  </pre>
                </>
              )}
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

    {/* QUẢN LÝ TẤT CẢ TUYẾN XE & LỘ TRÌNH ĐĂNG KÝ HỆ THỐNG */}
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 mb-4 gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
            <Bus className="w-4.5 h-4.5 text-red-600" />
            Danh Sách Tuyến Xe & Hành Trình Doanh Nghiệp (Route Inventory)
          </h3>
          <p className="text-[11px] text-slate-400">Xem và cấu hình toàn bộ đội xe, kích hoạt hành trình, chỉnh sửa thông tin hoặc xóa tuyển.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreatingNew(true);
            setPlates('51B-123.45');
            setDriver('Tài xế bổ sung');
            setDrPhone('0901230000');
            setCond('Nội bộ nhà xe');
            setCondPhone('0933550000');
            setStartPoint('');
            setEndPoint('');
            setRouteOption('national_highway');
            setStatus('inactive');
            const el = document.getElementById('admin-panel');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
        >
          ➕ Thêm Tuyến Chờ
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
              <th className="py-2.5 px-3 font-black">Lộ trình tuyến</th>
              <th className="py-2.5 px-3 font-black">Mã Route</th>
              <th className="py-2.5 px-3 font-black">Phương tiện</th>
              <th className="py-2.5 px-3 font-black">Tổ phục vụ</th>
              <th className="py-2.5 px-3 font-black text-center">Trạng Thái</th>
              <th className="py-2.5 px-3 font-black text-right">Thao Tác Nhanh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-705 text-slate-700 font-semibold text-[11px]">
            {buses && buses.length > 0 ? (
              buses.map((bus) => {
                const typeLabel = bus.routeType === 'expressway' ? 'Cao Tốc' : bus.routeType === 'other' ? 'Tuyến Tránh' : 'Quốc Lộ';
                return (
                  <tr key={bus.tripId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-[12px]">
                          {bus.startName} &rarr; {bus.endName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                          📍 {bus.startCoords?.lat ? `${bus.startCoords.lat}, ${bus.startCoords.lng}` : 'Auto coordinates'} | Kiểu: {typeLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {bus.tripId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{bus.licensePlate || 'N/A'}</span>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">Sơ đồ: {bus.layoutCapacity || 34} Giường</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-700 font-bold">🧑‍✈️ {bus.driverName} ({bus.driverPhone})</span>
                        <span className="text-[10px] text-slate-400 font-medium font-sans">🛋️ {bus.conductorName} ({bus.conductorPhone})</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {bus.status === 'inactive' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          Chờ hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Đang hoạt động
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextStatus = bus.status === 'inactive' ? 'active' : 'inactive';
                            await onSaveBusInfo({
                              ...bus,
                              status: nextStatus
                            });
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                            bus.status === 'inactive'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          }`}
                        >
                          {bus.status === 'inactive' ? '⚡ Chạy Xe' : '⚠️ Dừng Chạy'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNew(false);
                            setEditingTripId(bus.tripId);
                            const el = document.getElementById('admin-panel');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-750 text-slate-700 border border-slate-200/50 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                        >
                          Sửa
                        </button>
                        {onDeleteTrip && buses.length > 1 && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Bạn chắc chắn muốn xóa tuyến đường ${bus.startName} - ${bus.endName}? Trạm ghim và biển xe sẽ biến mất.`)) {
                                await onDeleteTrip(bus.tripId);
                              }
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-650 text-red-650 hover:text-red-800/80 p-1 px-2 rounded-lg text-[10px] font-bold border border-red-100 cursor-pointer transition-all"
                            title="Xóa vĩnh viễn"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                  Chưa ghi nhận tuyến hành trình nào!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  ) : (
    /* FLEET MANAGEMENT TAB */
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fade-in">
      
      {/* Left Column: Form & Live Layout Preview */}
      <div className="xl:col-span-5 flex flex-col gap-6">
        
        {/* Form to Add / Edit Vehicles */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 font-sans">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <Bus className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">
                {selectedVehicleForEdit ? 'Cập Nhật Thông Tin Xe' : 'Đăng Ký Xe Mới'}
              </h3>
              <p className="text-[11px] text-slate-400">Thiết lập biển kiểm soát, thương hiệu, loại ghế/giường & ngày đăng kiểm gần nhất</p>
            </div>
          </div>

          <form onSubmit={handleSaveVehicleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Biển Số Xe (Kiểm Soát)</label>
              <input
                type="text"
                required
                value={vehiclePlates}
                onChange={(e) => setVehiclePlates(e.target.value)}
                placeholder="Ví dụ: 51B-123.45"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 uppercase font-mono"
                disabled={!!selectedVehicleForEdit}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Thương Hiệu</label>
                <select
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                >
                  <option value="Thaco">Thaco Trường Hải</option>
                  <option value="Kim Long">Kim Long Motor</option>
                  <option value="Hyundai">Hyundai Universe</option>
                  <option value="Kia">Kia Granbird</option>
                  <option value="Samco">Samco Felix</option>
                  <option value="Ford">Ford Transit</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ngày Đăng Kiểm Gần Nhất</label>
                <input
                  type="date"
                  required
                  value={vehicleRegDate}
                  onChange={(e) => setVehicleRegDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loại Xe & Sơ Đồ Thiết Kế</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="sleeper_22">VIP Cabin 22 Giường (2 Tầng)</option>
                <option value="sleeper_34">VIP Cabin 34 Giường (2 Tầng)</option>
                <option value="chair_45">Ghế ngồi 45 Chỗ (1 Tầng)</option>
                <option value="limo_9">Limousine VIP 9 Ghế (1 Tầng)</option>
                <option value="chair_16">Xe Khách Tiêu Chuẩn 16 Chỗ (1 Tầng)</option>
              </select>
            </div>

            {vehicleRegDate && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Phân Tích Đăng Kiểm</span>
                  <span>Tự Động Tính Toán</span>
                </div>
                {(() => {
                  const reg = new Date(vehicleRegDate);
                  const exp = new Date(reg.getFullYear() + 1, reg.getMonth(), reg.getDate());
                  const today = new Date('2026-06-24');
                  const diffTime = exp.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  let warningText = "✅ Đội xe an toàn. Chưa đến hạn kiểm định đăng kiểm.";
                  if (diffDays <= 0) {
                    badgeColor = "bg-red-100 text-red-850 text-red-800 border-red-200 animate-pulse";
                    warningText = "❌ ĐÃ QUÁ HẠN ĐĂNG KIỂM! Yêu cầu đưa phương tiện đi đăng kiểm khẩn cấp để đảm bảo điều kiện kinh doanh vận tải hành khách.";
                  } else if (diffDays <= 30) {
                    badgeColor = "bg-amber-100 text-amber-850 text-amber-800 border-amber-200 animate-pulse";
                    warningText = `⚠️ CẢNH BÁO KIỂM ĐỊNH: Phương tiện sắp hết hạn đăng kiểm trong vòng ${diffDays} ngày! Cần lên lịch kiểm định trước ngày ${exp.toISOString().split('T')[0]}.`;
                  }

                  return (
                    <>
                      <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-200">
                        <span className="font-semibold text-slate-500">Ngày Hết Hạn đăng kiểm (12 tháng):</span>
                        <span className="font-bold text-slate-800 font-mono">{exp.toISOString().split('T')[0]}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="font-semibold text-slate-500">Thời gian còn lại:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${badgeColor}`}>
                          {diffDays <= 0 ? "Quá hạn" : `${diffDays} ngày`}
                        </span>
                      </div>
                      <div className="pt-2 text-[10px] font-bold leading-relaxed text-slate-500">
                        {warningText}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={savingVehicle}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase px-4 py-2.5 rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingVehicle ? 'Đang lưu...' : selectedVehicleForEdit ? '💾 Cập Nhật' : '➕ Thêm Vào Đội Xe'}
              </button>
              {selectedVehicleForEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicleForEdit(null);
                    setVehiclePlates('');
                    setVehicleBrand('Thaco');
                    setVehicleType('sleeper_34');
                    setVehicleRegDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-extrabold rounded-lg transition-all cursor-pointer"
                >
                  Hủy
                </button>
              )}
            </div>

            {saveVehicleSuccess && (
              <div className="bg-emerald-50 text-emerald-800 text-[11px] font-extrabold rounded-lg px-3 py-2 border border-emerald-150 flex items-center gap-1.5 animate-pulse">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Cập nhật thông tin đội xe thành công!</span>
              </div>
            )}
          </form>
        </div>

        {/* LIVE PREVIEW OF SEATS LAYOUT */}
        {renderVehicleLayout(vehicleType)}

      </div>

      {/* Right Column: Fleet List Table */}
      <div className="xl:col-span-7 flex flex-col gap-6">
        
        {/* Fleet List Panel */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Danh Sách Đội Xe Doanh Nghiệp ({vehicles.length})</h3>
                <p className="text-[11px] text-slate-400">Danh sách biển số, tình trạng đăng kiểm định kỳ của nhà xe BH</p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Tìm biển số, hãng xe..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-slate-700 w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Warnings summary widget */}
          {(() => {
            const expiringSoonCount = vehicles.filter(v => {
              const reg = new Date(v.registrationDate);
              const exp = new Date(reg.getFullYear() + 1, reg.getMonth(), reg.getDate());
              const diff = exp.getTime() - new Date('2026-06-24').getTime();
              const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
              return diffDays > 0 && diffDays <= 30;
            }).length;

            const expiredCount = vehicles.filter(v => {
              const reg = new Date(v.registrationDate);
              const exp = new Date(reg.getFullYear() + 1, reg.getMonth(), reg.getDate());
              const diff = exp.getTime() - new Date('2026-06-24').getTime();
              const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
              return diffDays <= 0;
            }).length;

            if (expiredCount > 0 || expiringSoonCount > 0) {
              return (
                <div className="mt-3 bg-red-50 border border-red-150 p-3 rounded-lg text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-red-800 uppercase text-[10px] tracking-wider">Hệ Thống Cảnh Báo Phương Tiện Giao Thông</p>
                    <p className="text-red-700 font-bold leading-relaxed">
                      Nhà xe ghi nhận <span className="underline decoration-2 font-black">{expiredCount} xe hết hạn</span> đăng kiểm và <span className="underline decoration-2 font-black">{expiringSoonCount} xe sắp hết hạn</span> kiểm định. Vui lòng cập nhật giấy đăng kiểm sớm!
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div className="mt-3 bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-emerald-800 uppercase text-[10px] tracking-wider">Tình Trạng Kỹ Thuật Đội Xe</p>
                  <p className="text-emerald-700 font-semibold leading-relaxed">
                    Toàn bộ đội xe BH Bus Corporation đều hoạt động trong tình trạng an toàn, có giấy chứng nhận đăng kiểm còn thời hạn hợp lệ.
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="overflow-x-auto mt-4 rounded-lg border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">Biển Số Xe</th>
                  <th className="py-2.5 px-3">Hãng Xe & Sức Chứa</th>
                  <th className="py-2.5 px-3">Kiểm Định Gần Nhất</th>
                  <th className="py-2.5 px-3">Hạn & Cảnh Báo</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vehicles.length > 0 ? (
                  vehicles
                    .filter(v => {
                      const query = vehicleSearch.toLowerCase();
                      return v.licensePlate.toLowerCase().includes(query) || v.brand.toLowerCase().includes(query);
                    })
                    .map(veh => {
                      const reg = new Date(veh.registrationDate);
                      const exp = new Date(reg.getFullYear() + 1, reg.getMonth(), reg.getDate());
                      const today = new Date('2026-06-24');
                      const diffTime = exp.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      let statusBadge = (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-md">
                          Hợp Lệ
                        </span>
                      );
                      if (diffDays <= 0) {
                        statusBadge = (
                          <span className="bg-red-100 text-red-850 text-red-800 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse">
                            Hết Hạn
                          </span>
                        );
                      } else if (diffDays <= 30) {
                        statusBadge = (
                          <span className="bg-amber-100 text-amber-850 text-amber-800 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-md animate-pulse">
                            Sắp Hết Hạn
                          </span>
                        );
                      }

                      return (
                        <tr key={veh.licensePlate} className="hover:bg-slate-50/50 transition-colors font-semibold">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-800 border-b border-slate-200 pb-0.5">{veh.licensePlate}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-700 font-bold">{veh.brand}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {veh.vehicleType === 'sleeper_22' ? 'VIP 22 Cabin' :
                               veh.vehicleType === 'sleeper_34' ? 'VIP 34 Cabin' :
                               veh.vehicleType === 'chair_45' ? 'Ngồi 45 Chỗ' :
                               veh.vehicleType === 'limo_9' ? 'Limo 9 Ghế' : 'Ngồi 16 Chỗ'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-medium font-mono">
                            {veh.registrationDate}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1">
                              <div className="font-bold text-slate-700 font-mono">{exp.toISOString().split('T')[0]}</div>
                              <div className="flex items-center gap-1">
                                {statusBadge}
                                <span className="text-[10px] text-slate-400">
                                  {diffDays <= 0 ? '(Trễ kiểm định)' : `(Còn ${diffDays} ngày)`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditVehicle(veh)}
                                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-black px-2 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVehicleSubmit(veh.licensePlate)}
                                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 text-[10px] font-black px-2 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 font-bold">
                      Không tìm thấy phương tiện nào phù hợp!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cloud SQL schema creation logic */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 font-sans text-slate-300">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider">Cơ sở dữ liệu Supabase Cloud SQL</span>
            </div>
            <button
              onClick={copyVehicleSqlToClipboard}
              className="bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg px-2.5 py-1 text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer text-slate-400"
            >
              {copiedVehicleSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Đã Copy!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Schema</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-3 space-y-2.5 text-xs text-slate-400">
            <p className="leading-relaxed">
              Để lưu trữ danh sách đội xe đồng bộ trực tuyến vĩnh viễn trên Supabase Cloud của bạn, hãy chạy câu lệnh SQL sau trong mục <span className="text-slate-200 font-bold">SQL Editor</span> trên giao diện điều khiển của Supabase:
            </p>
            <pre className="bg-slate-950 p-3 rounded-lg text-[10px] font-mono text-emerald-400 border border-slate-900 overflow-x-auto max-h-40 select-all">
{`CREATE TABLE vehicles (
  license_plate text PRIMARY KEY,
  brand text NOT NULL,
  vehicle_type text NOT NULL,
  capacity integer NOT NULL,
  registration_date text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);`}
            </pre>
            <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-lg text-[10px] text-emerald-400 font-semibold leading-normal">
              <Server className="w-3.5 h-3.5 shrink-0" />
              <span>Ứng dụng hỗ trợ cơ chế lưu trữ đệm in-memory RAM tự động khi bảng vehicles chưa được khởi tạo.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )}
</div>
);
}