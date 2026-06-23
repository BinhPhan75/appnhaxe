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
  Info
} from 'lucide-react';
import { MOCK_CUSTOMERS } from '../utils/mockData';

interface DashboardProps {
  busState: BusState;
  tripConfig: TripConfig;
  customerHistory: CustomerHistory[];
  onSearchCustomer: (searchTerm: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  busState,
  tripConfig,
  customerHistory,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const passengerMarkersRef = useRef<L.Marker[]>([]);

  const [customerSearch, setCustomerSearch] = useState('');

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

  // Initialize leaf map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map is already initialized on this element, if so, do not recreate.
    if (!mapRef.current) {
      // Create map
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([tripConfig.startCoords.lat, tripConfig.startCoords.lng], 8);

      // Add high fidelity streets tile layer (Google Map style / OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } else {
      // If trip has changed, pan to start coords
      mapRef.current.setView([busState.currentLocation.lat, busState.currentLocation.lng]);
    }

    // Clean up markers
    passengerMarkersRef.current.forEach(m => m.remove());
    passengerMarkersRef.current = [];

    // Draw trip highway route line
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
    }

    const routeLatLngs = tripConfig.waypoints.map(w => L.latLng(w.coords.lat, w.coords.lng));
    routePolylineRef.current = L.polyline(routeLatLngs, {
      color: '#dc2626',
      weight: 4,
      opacity: 0.75,
      dashArray: '1, 6'
    }).addTo(mapRef.current);

    // Initial load adjustment to show full route path clearly
    try {
      const bounds = L.latLngBounds(routeLatLngs);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    } catch (err) {
      console.warn("Could not fit route bounds", err);
    }

    return () => {
      // no-op
    };
  }, [tripConfig]);

  // Update dynamic vehicle markers and passenger locations on map tick
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old passenger markers
    passengerMarkersRef.current.forEach(m => m.remove());
    passengerMarkersRef.current = [];

    // Create or update custom orange/red vehicle marker with smooth animation
    const busIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-red-500 opacity-30 mt-0"></span>
          <div class="h-8 w-8 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="lucide lucide-bus"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h20"/><path d="M21 16H3"/><path d="M19 16c0 1.66-1.34 3-3 3s-3-1.34-3-3"/><path d="M7 16c0 1.66-1.34 3-3 3S1 17.66 1 16"/><path d="M5 21h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2z"/></svg>
          </div>
        </div>
      `,
      className: 'custom-bus-icon-div',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([busState.currentLocation.lat, busState.currentLocation.lng]);
    } else {
      busMarkerRef.current = L.marker([busState.currentLocation.lat, busState.currentLocation.lng], {
        icon: busIcon
      })
      .bindPopup(`
        <div class="p-1 font-sans">
          <p class="font-bold text-red-600 text-sm">XE KHÁCH PHƯƠNG TRANG</p>
          <p class="text-xs text-slate-705 font-medium mt-0.5">Tuyến: ${tripConfig.route}</p>
          <p class="text-xs text-slate-705 font-medium">Tốc độ giả lập: ${busState.speed} km/h</p>
        </div>
      `)
      .addTo(mapRef.current);
    }

    // Fly smoothly to track the simulating bus if we are in dashboard
    if (busState.isSimulating) {
      mapRef.current.panTo([busState.currentLocation.lat, busState.currentLocation.lng]);
    }

    // Add passenger destinations as map markers
    busState.berths.forEach(b => {
      if (b.passenger && (b.status === 'booked' || b.status === 'approaching')) {
        const isApproaching = b.status === 'approaching';
        const passengerMarkerColor = isApproaching ? 'bg-amber-400 border-amber-600' : 'bg-blue-600 border-blue-800';
        
        const pxIcon = L.divIcon({
          html: `
            <div class="relative group">
              ${isApproaching ? '<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-amber-400 opacity-60"></span>' : ''}
              <div class="h-6 w-6 rounded-full border-2 border-white shadow-md text-white flex items-center justify-center text-[10px] font-bold ${passengerMarkerColor}">
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

  }, [busState.currentLocation, busState.berths]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-system">
      
      {/* Metrics Column */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* Fill Percentage & Stats card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Hiệu Suất Vận Hành</h3>
            <p className="text-xs text-slate-500 mt-0.5">Thời gian thực bến bãi</p>
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

        {/* Realtime Alert Board */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Zap className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
              Điểm Xuống Sắp Tới
            </h3>
            <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
              {approachingBerths.length} Khách
            </span>
          </div>

          <div className="flex-1 mt-3 overflow-y-auto max-h-48 divide-y divide-slate-100">
            {approachingBerths.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
                <ShieldCheck className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
                <p className="text-xs">Không có khách hàng chuẩn bị trả</p>
                <p className="text-[10px] mt-0.5">Khoảng cách đến trạm đều an toàn &rarr;</p>
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Route className="w-4.5 h-4.5 text-red-600" />
                Định Vị Vị Trí Xe Khách Trực Tuyến
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Dữ liệu từ thiết bị di động phụ xe (Cập nhật 1 giây/lần)</p>
            </div>
            
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${busState.isOffline ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`}></span>
              <span className="text-xs font-bold text-slate-600">{busState.isOffline ? 'Offline' : 'Realtime'}</span>
            </div>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden mt-4 relative z-10 border border-slate-150">
            {/* The actual Leaflet map container mount point */}
            <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '300px' }} />

            {/* Offline notification covering map layer when offline */}
            {busState.isOffline && (
              <div className="absolute top-2 right-2 z-20 bg-slate-900/90 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold border border-slate-800 shadow-xl flex items-center gap-1.5 backdrop-blur-xs">
                <Info className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                MẤT KẾT NỐI - ĐANG LƯU CACHE TẠI MÁY PHỤ XE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CRM Loyalty customer columns */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Award className="w-4.5 h-4.5 text-amber-500" />
                Data Khách Hàng Thân Thiết (CRM Suite)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Theo dõi lịch sử đi lại, thăng hạng tích lũy điểm thưởng của quý khách</p>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm khách bằng Tên / SĐT..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 placeholder-slate-400 text-slate-700"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold">
                  <th className="py-2.5 px-4 font-black">Khách Hàng</th>
                  <th className="py-2.5 px-4 font-black">Số Điện Thoại</th>
                  <th className="py-2.5 px-4 font-black">Số Chuyến Đi</th>
                  <th className="py-2.5 px-4 font-black">Điểm Tích Lũy</th>
                  <th className="py-2.5 px-4 font-black">Hạng Thành Viên</th>
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
                      <tr key={cust.phone} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[11px]">
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
                        <td className="py-3 px-4 font-mono font-semibold">{cust.phone}</td>
                        <td className="py-3 px-4 font-extrabold font-mono text-slate-800">{cust.tripsCount}</td>
                        <td className="py-3 px-4 font-extrabold font-mono text-red-600">
                          {cust.points.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] border ${tierBadge}`}>
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
  );
};
