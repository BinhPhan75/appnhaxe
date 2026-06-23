import React, { useEffect, useRef, useState } from 'react';
import { BusState, TripConfig, CustomerHistory, Berth } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Users, 
  Percent, 
  MapPin, 
  Compass, 
  Search, 
  History, 
  TrendingUp, 
  Award, 
  Route, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  Plus,
  Trash2,
  Calendar,
  ClipboardList
} from 'lucide-react';

interface DashboardProps {
  busState: BusState;
  tripConfig: TripConfig;
  customerHistory: CustomerHistory[];
  buses?: any[];
  onSelectTrip?: (tripId: string) => void;
  onSearchCustomer: (searchTerm: string) => void;
  onUpdateWaypoints?: (newWaypoints: any[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  busState,
  tripConfig,
  customerHistory,
  buses = [],
  onSelectTrip,
  onUpdateWaypoints
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busesMarkersRef = useRef<Record<string, L.Marker>>({});
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const passengerMarkersRef = useRef<L.Marker[]>([]);

  const [customerSearch, setCustomerSearch] = useState('');
  const activeBuses = (buses && buses.length > 0) ? buses : [busState];

  // Waypoints local setup states
  const [newStopName, setNewStopName] = useState('');
  const [newStopKm, setNewStopKm] = useState<string>('');

  const handleAddNewStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStopName.trim()) return;

    const kmNum = Number(newStopKm) || 0;

    // Build new waypoint stop
    const newWaypoint = {
      name: newStopName.trim(),
      coords: {
        // interpolate coordinates depending on cumulative distance fraction
        lat: tripConfig.startCoords.lat + (tripConfig.endCoords.lat - tripConfig.startCoords.lat) * Math.min(1, kmNum / 350) + 0.05 * (Math.random() - 0.5),
        lng: tripConfig.startCoords.lng + (tripConfig.endCoords.lng - tripConfig.startCoords.lng) * Math.min(1, kmNum / 350) + 0.05 * (Math.random() - 0.5)
      },
      distanceKm: kmNum
    };

    // Sort waypoints by cumulative distance (distanceKm) to keep sequence precise
    const updated = [...tripConfig.waypoints, newWaypoint].sort((a, b) => a.distanceKm - b.distanceKm);
    
    if (onUpdateWaypoints) {
      onUpdateWaypoints(updated);
    }
    setNewStopName('');
    setNewStopKm('');
  };

  const handleDeleteStop = (stopIndex: number) => {
    const updated = tripConfig.waypoints.filter((_, idx) => idx !== stopIndex);
    if (onUpdateWaypoints) {
      onUpdateWaypoints(updated);
    }
  };

  // Calculate metrics
  const totalBerths = busState.berths.length;
  const occupiedBerths = busState.berths.filter(b => b.status === 'booked' || b.status === 'approaching').length;
  const fillRate = totalBerths > 0 ? Math.round((occupiedBerths / totalBerths) * 100) : 0;
  
  // Passengers scheduled to drop off next
  const approachingBerths = busState.berths.filter(b => b.status === 'approaching');

  // Filter local customer logs
  const filteredCustomers = customerHistory.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Standard Leaflet Icon fix
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Create Map
    mapRef.current = L.map(mapContainerRef.current, {
      center: [tripConfig.startCoords.lat, tripConfig.startCoords.lng],
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: false
    });

    // Elegant Light Map Tile style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(mapRef.current);

    // Initial Render of Path line
    const coordsList = tripConfig.waypoints.map(wp => [wp.coords.lat, wp.coords.lng] as [number, number]);
    routePolylineRef.current = L.polyline(coordsList, {
      color: '#dc2626',
      weight: 4,
      opacity: 0.8,
      dashArray: '5, 8'
    }).addTo(mapRef.current);

    // Setup Start and end markers
    L.marker([tripConfig.startCoords.lat, tripConfig.startCoords.lng])
      .bindPopup(`<p className="font-bold text-xs text-slate-800">Khởi Hành: ${tripConfig.waypoints[0]?.name || 'Bến Đi'}</p>`)
      .addTo(mapRef.current);

    L.marker([tripConfig.endCoords.lat, tripConfig.endCoords.lng])
      .bindPopup(`<p className="font-bold text-xs text-slate-800">Đích Đến: ${tripConfig.waypoints[tripConfig.waypoints.length-1]?.name || 'Bến Về'}</p>`)
      .addTo(mapRef.current);

    // Fit map view
    try {
      const bounds = L.latLngBounds(coordsList);
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    } catch (e) {
      // Ignored
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      busesMarkersRef.current = {};
    };
  }, [tripConfig.id]);

  // Update Polyline when waypoints are customized
  useEffect(() => {
    if (!mapRef.current || !routePolylineRef.current) return;
    const coordsList = tripConfig.waypoints.map(wp => [wp.coords.lat, wp.coords.lng] as [number, number]);
    routePolylineRef.current.setLatLngs(coordsList);
  }, [tripConfig.waypoints]);

  // Update client position and entire fleet of buses on map
  useEffect(() => {
    if (!mapRef.current) return;

    // Use either the full buses list or fall back to single busState model representatively
    const activeBuses = (buses && buses.length > 0) ? buses : [busState];

    // Clear fleet markers for items that are no longer present
    const activeTripIds = activeBuses.map(b => b.tripId);
    Object.keys(busesMarkersRef.current).forEach(tId => {
      if (!activeTripIds.includes(tId)) {
        busesMarkersRef.current[tId].remove();
        delete busesMarkersRef.current[tId];
      }
    });

    // Create or update markers for all fleet buses
    activeBuses.forEach(bus => {
      const isCurrentActive = bus.tripId === busState.tripId;
      const busColor = isCurrentActive ? 'bg-red-600' : 'bg-slate-700';
      const pingColor = isCurrentActive ? 'bg-red-400' : 'bg-slate-400';

      const busIcon = L.divIcon({
        html: `
          <div class="relative flex flex-col items-center justify-center" style="transform: translate(0, -10px);">
            <!-- License Plate Badge -->
            <div class="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-[10px] font-mono font-black text-white rounded shadow-sm whitespace-nowrap mb-1 tracking-tight">
              ${bus.licensePlate || 'XE-BH'}
            </div>
            <!-- Marker Core -->
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full ${pingColor} opacity-75"></span>
              <div class="relative ${busColor} text-white rounded-full p-1.5 shadow-lg border-2 border-white flex items-center justify-center">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
          </div>
        `,
        className: `bus-gps-div-${bus.tripId}`,
        iconSize: [40, 50],
        iconAnchor: [20, 40]
      });

      const routeName = bus.tripId === 'sg-dl' ? 'Sài Gòn - Đà Lạt' : bus.tripId === 'sg-ct' ? 'Sài Gòn - Cần Thơ' : 'Sài Gòn - Nha Trang';

      if (busesMarkersRef.current[bus.tripId]) {
        busesMarkersRef.current[bus.tripId].setLatLng([bus.currentLocation.lat, bus.currentLocation.lng]);
        busesMarkersRef.current[bus.tripId].setPopupContent(`
          <div class="p-1 font-sans">
            <p class="font-extrabold text-red-650 text-sm">XE KHÁCH LIVE</p>
            <p class="text-xs text-slate-700 font-bold mt-1">Biển số: ${bus.licensePlate || 'Chưa cài đặt'}</p>
            <p class="text-[11px] text-slate-650 font-medium">Bổ nhiệm tài xế: ${bus.driverName || 'N/A'}</p>
            <p class="text-[11px] text-slate-650 font-medium">Liên hệ phụ xe: ${bus.conductorName || 'N/A'}</p>
            <p class="text-[11px] text-slate-650 font-bold mt-0.5">Tuyến đường: ${routeName}</p>
            <p class="text-[11px] text-slate-700 font-bold mt-0.5">Tốc độ giả lập: ${bus.speed || 60} km/h</p>
          </div>
        `);
      } else {
        busesMarkersRef.current[bus.tripId] = L.marker([bus.currentLocation.lat, bus.currentLocation.lng], {
          icon: busIcon
        })
        .bindPopup(`
          <div class="p-1 font-sans">
            <p class="font-extrabold text-red-650 text-sm">XE KHÁCH LIVE</p>
            <p class="text-xs text-slate-700 font-bold mt-1">Biển số: ${bus.licensePlate || 'Chưa cài đặt'}</p>
            <p class="text-[11px] text-slate-650 font-medium">Bổ nhiệm tài xế: ${bus.driverName || 'N/A'}</p>
            <p class="text-[11px] text-slate-650 font-medium">Liên hệ phụ xe: ${bus.conductorName || 'N/A'}</p>
            <p class="text-[11px] text-slate-650 font-bold mt-0.5">Tuyến đường: ${routeName}</p>
            <p class="text-[11px] text-slate-700 font-bold mt-0.5">Tốc độ giả lập: ${bus.speed || 60} km/h</p>
          </div>
        `)
        .addTo(mapRef.current);
      }

      // Add selection and focus synchronization to marker clicks
      busesMarkersRef.current[bus.tripId].off('click');
      busesMarkersRef.current[bus.tripId].on('click', () => {
        if (onSelectTrip) {
          onSelectTrip(bus.tripId);
        }
      });
    });

    // Fly smoothly to track the actively simulating focus bus
    const currentActiveBus = activeBuses.find(b => b.tripId === busState.tripId);
    if (currentActiveBus && currentActiveBus.isSimulating) {
      mapRef.current.panTo([currentActiveBus.currentLocation.lat, currentActiveBus.currentLocation.lng]);
    }

    // Clear old passenger markers first
    passengerMarkersRef.current.forEach(m => m.remove());
    passengerMarkersRef.current = [];

    // Add current active bus's passenger destinations as map markers
    busState.berths.forEach(b => {
      if (b.passenger && (b.status === 'booked' || b.status === 'approaching')) {
        const isApproaching = b.status === 'approaching';
        const passengerMarkerColor = isApproaching ? 'bg-amber-400 border-amber-600 text-slate-900' : 'bg-red-600 border-red-800 text-white';
        
        const pxIcon = L.divIcon({
          html: `
            <div class="relative group">
              ${isApproaching ? '<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-amber-400 opacity-60"></span>' : ''}
              <div class="h-6 w-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[9px] font-black ${passengerMarkerColor}">
                ${b.label}
              </div>
            </div>
          `,
          className: 'passenger-pin-div',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const m = L.marker([b.passenger.coords.lat, b.passenger.coords.lng], {
          icon: pxIcon
        })
        .bindPopup(`
          <div class="p-1 font-sans">
            <p class="font-bold text-slate-800 text-xs">Phòng/Ghế: ${b.label} - ${b.passenger.name}</p>
            <p class="text-[11px] text-slate-600">Trạm trả: <strong>${b.passenger.destination}</strong></p>
            <p class="text-[10px] text-slate-500 font-medium">Trạng thái: ${isApproaching ? '⚠️ Sắp đến điểm trả (≤5km)' : '✅ Có khách'}</p>
          </div>
        `)
        .addTo(mapRef.current!);

        passengerMarkersRef.current.push(m);
      }
    });

  }, [buses, busState.currentLocation, busState.berths, busState.tripId]);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in" id="dashboard-system">
      
      {/* Top Banner: Active bus info, driver & conductor */}
      <div className="bg-slate-950 text-white rounded-xl shadow-md border border-slate-800 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <div className="bg-red-650 bg-red-600 h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg">
            <Route className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Hệ Thống BH</span>
              <span className="text-xs font-black tracking-tight text-slate-400 uppercase">BÁO CÁO NHÀ ĐIỀU HÀNH BẾN BÃI</span>
            </div>
            <p className="text-lg font-black text-white mt-0.5 uppercase tracking-wide">
              BIỂN SỐ XE: <span className="text-red-550 text-red-500">{busState.licensePlate || '51B-222.88'}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:flex items-center gap-5 md:gap-8 w-full md:w-auto pt-4 md:pt-0 border-t border-slate-800 md:border-none">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-slate-400">Tài Xế Phụ Trách</span>
            <span className="text-xs font-extrabold text-slate-200">{busState.driverName || 'Nguyễn Văn Đạt'}</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">{busState.driverPhone || '0901235566'}</span>
          </div>
          
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-slate-400">Phụ Xe (Tiếp Viên)</span>
            <span className="text-xs font-extrabold text-slate-200">{busState.conductorName || 'Lê Hoàng Quân'}</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">{busState.conductorPhone || '0933556677'}</span>
          </div>

          <div className="flex flex-col gap-0.5 col-span-2 md:col-span-1">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-slate-400 font-extrabold">Chặng Xe Chạy</span>
            <span className="text-xs font-extrabold text-red-500 tracking-wide uppercase">{tripConfig.route}</span>
            <span className="text-[10px] text-slate-400 font-bold">BH Live Connection &rarr;</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Metrics Column */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Fill Percentage & Stats card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Hiệu Suất Vận Hành</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tỷ lệ lấp đầy giường/ghế khoá luồng</p>
            </div>

            <div className="flex items-center justify-center py-6">
              <div className="relative flex items-center justify-center">
                {/* Circular progress bar */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle 
                    cx="64" cy="64" r="54" 
                    stroke="#f1f5f9" strokeWidth="10" fill="transparent" 
                  />
                  <circle 
                    cx="64" cy="64" r="54" 
                    stroke="#dc2626" strokeWidth="10" fill="transparent"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - fillRate / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold text-slate-850 tracking-tight">{fillRate}%</span>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide mt-0.5">Lấp Đầy</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50 text-center">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xl font-extrabold text-slate-800">{occupiedBerths}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Đã Đặt</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-xl font-extrabold text-slate-800">{totalBerths - occupiedBerths}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Trống</p>
              </div>
            </div>
          </div>

          {/* Lộ Trình & Điểm Dừng Xe Chạy: Cài đặt hành trình chuyến */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 uppercase font-black tracking-tight text-xs">
                <ClipboardList className="w-4 h-4 text-red-600" />
                Cài Đặt Hành Trình Bến
              </h3>
              <span className="bg-red-50 text-red-800 border border-red-100 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                {tripConfig.waypoints.length} Điểm dừng
              </span>
            </div>

            {/* Custom waypoint stop appending form */}
            <form onSubmit={handleAddNewStop} className="mt-4 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <input
                type="text"
                required
                placeholder="Tên Trạm/Điểm dừng..."
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <input
                type="number"
                required
                min="0"
                max="500"
                placeholder="Km"
                value={newStopKm}
                onChange={(e) => setNewStopKm(e.target.value)}
                className="w-14 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 text-center"
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white p-1.5 px-2.5 rounded font-black text-sm transition-colors shadow-xs"
                title="Thêm trạm dừng vào hành trình"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 overflow-y-auto max-h-56 divide-y divide-slate-100 pr-1 select-none">
              {tripConfig.waypoints.map((wp, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 rounded px-1 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 font-black text-[9px] flex items-center justify-center border border-slate-200">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{wp.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono font-bold">Lấy mốc: Tích lũy {wp.distanceKm} km</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      {wp.distanceKm} KM
                    </span>
                    {idx > 0 && idx < tripConfig.waypoints.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStop(idx)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Xóa trạm dừng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Realtime Alert Board */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                <Zap className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                Điểm Xuống Sắp Tới
              </h3>
              <span className="bg-amber-100 text-amber-850 text-amber-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                {approachingBerths.length} Khách
              </span>
            </div>

            <div className="flex-1 mt-3 overflow-y-auto max-h-48 divide-y divide-slate-100">
              {approachingBerths.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400 select-none">
                  <ShieldCheck className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
                  <p className="text-xs font-semibold">Chưa có khách chuẩn bị xuống</p>
                  <p className="text-[10px] mt-0.5">Xe di chuyển an toàn trên tuyến của bạn &rarr;</p>
                </div>
              ) : (
                approachingBerths.map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 px-1 transition-all rounded">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500 text-slate-900 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                        {b.label}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800">{b.passenger?.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">{b.passenger?.destination}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider block">
                        &lt;5 KM
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Map Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Container Map Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 uppercase text-xs">
                  <Route className="w-4 h-4 text-red-600" />
                  Định Vị Hành Trình Trực Tuyến
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Toàn bộ lộ trình tự động cập nhật và thu hút GPS hành khách</p>
              </div>
              
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${busState.isOffline ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span className="text-xs font-bold text-slate-600">{busState.isOffline ? 'Offline' : 'Realtime'}</span>
              </div>
            </div>

            <div className="flex-1 rounded-xl overflow-hidden mt-4 relative z-10 border border-slate-150">
              {/* Leaflet Map container mount point */}
              <div ref={mapContainerRef} className="w-full h-full animate-fade-in" style={{ minHeight: '300px' }} />

              {/* Offline notification covering map layer when offline */}
              {busState.isOffline && (
                <div className="absolute top-2 right-2 z-20 bg-slate-900/90 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold border border-slate-800 shadow-xl flex items-center gap-1.5 backdrop-blur-xs">
                  <Info className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                  MẤT KẾT NỐI - ĐANG LƯU CACHE TẠI MÁY PHỤ XE
                </div>
              )}
            </div>
          </div>

          {/* Real-time Fleet Activity Board */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col" id="fleet-live-panel">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 uppercase">
                  <Compass className="w-4 h-4 text-red-650 text-red-650 animate-spin" style={{ animationDuration: '6s' }} />
                  Giám Sát Toàn Bộ Đội Xe ({activeBuses.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 mt-[2px]">Nhấp vào xe để theo dõi lộ trình &amp; định vị bản đồ lập tức</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {activeBuses.map((bus) => {
                const isSelected = bus.tripId === busState.tripId;
                const routeName = bus.tripId === 'sg-dl' ? 'Sài Gòn - Đà Lạt' : bus.tripId === 'sg-ct' ? 'Sài Gòn - Cần Thơ' : 'Sài Gòn - Nha Trang';
                const totalBerthsCount = bus.berths?.length || 0;
                const bookedBerthsCount = bus.berths?.filter((b: any) => b.status === 'booked' || b.status === 'approaching').length || 0;
                const busFillPct = totalBerthsCount > 0 ? Math.round((bookedBerthsCount / totalBerthsCount) * 100) : 0;

                return (
                  <div 
                    key={bus.tripId}
                    onClick={() => {
                      if (onSelectTrip) onSelectTrip(bus.tripId);
                      if (mapRef.current) {
                        mapRef.current.setView([bus.currentLocation.lat, bus.currentLocation.lng], 9);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-44 group ${
                      isSelected 
                        ? 'bg-red-50/40 border-red-500 shadow-xs ring-1 ring-red-500' 
                        : 'bg-slate-50/40 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        {/* License Plate Badge */}
                        <span className="font-mono text-xs font-black text-slate-800 bg-white border border-slate-250 px-2 py-0.5 rounded shadow-sm group-hover:border-red-400 group-hover:text-red-600 transition-colors">
                          {bus.licensePlate || 'XE-BH'}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">{routeName}</p>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-red-500' : 'bg-slate-300 animate-pulse'}`}></span>
                    </div>

                    <div className="my-2 text-[11px] text-slate-500">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-400">Tài xế:</span>
                        <span className="font-bold text-slate-700 truncate max-w-[100px]">{bus.driverName || 'Chưa phân công'}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-400">Tốc độ:</span>
                        <span className="font-mono font-bold text-slate-850 text-slate-800">{bus.speed} KM/H</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-400">Khách đặt:</span>
                        <span className="font-bold text-red-650 text-red-600 font-mono">{bookedBerthsCount}/{totalBerthsCount} giường ({busFillPct}%)</span>
                      </div>
                    </div>

                    {/* Progress slider representation */}
                    <div className="w-full">
                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isSelected ? 'bg-red-500' : 'bg-slate-600'}`}
                          style={{ width: `${bus.simulationProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-450 text-slate-400 mt-1 uppercase">
                        <span>Bến Đi</span>
                        <span>Đi {Math.round(bus.simulationProgress)}%</span>
                        <span>Bến Đến</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CRM Loyalty customer columns */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase text-xs">
                  <Award className="w-4 h-4 text-amber-500" />
                  CRM Khách Hàng Thân Thiết BH
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Theo dõi lịch sử đi lại, điểm thưởng tích lũy chăm sóc dài hạn</p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Tìm khách hàng bằng Tên / SĐT..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-slate-50 pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-slate-400 text-slate-700 text-[11px]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="overflow-x-auto mt-4 overflow-y-auto max-h-72 pr-1 scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="py-2.5 px-4 font-black">Khách Hàng</th>
                    <th className="py-2.5 px-4 font-black">Số Điện Thoại</th>
                    <th className="py-2.5 px-4 font-black text-center">Số Chuyến</th>
                    <th className="py-2.5 px-4 font-black text-right">Điểm</th>
                    <th className="py-2.5 px-4 font-black">Hạng</th>
                    <th className="py-2.5 px-4 font-black text-right">Chuyến Gần Nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        Không tìm thấy khách hàng nào khớp từ khóa!
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      // Badge tier styling
                      let tierBadge = "bg-slate-100 text-slate-700 border-slate-200";
                      if (cust.tier === 'Kim Cương') {
                        tierBadge = "bg-blue-50 text-blue-800 border-blue-200 font-extrabold";
                      } else if (cust.tier === 'Vàng') {
                        tierBadge = "bg-amber-50 text-amber-800 border-amber-200 font-extrabold";
                      }

                      return (
                        <tr key={cust.phone} className="hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[11px] shrink-0">
                                {cust.name.split(' ').pop()?.substring(0, 2)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{cust.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium max-w-[150px] truncate">
                                  Tuyến: {cust.routes.join(', ')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-650">{cust.phone}</td>
                          <td className="py-3 px-4 font-extrabold font-mono text-center text-slate-800">{cust.tripsCount}</td>
                          <td className="py-3 px-4 font-extrabold font-mono text-red-600 text-right">
                            {cust.points.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] border ${tierBadge}`}>
                              {cust.tier}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-500">
                            {cust.lastTripDate}
                          </td>
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
    </div>
  );
};
