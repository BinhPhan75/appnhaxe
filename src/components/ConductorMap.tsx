import React, { useEffect, useRef, useState } from 'react';
import { Berth, TripConfig } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route, MapPin, Compass, Maximize2, Minimize2 } from 'lucide-react';

interface ConductorMapProps {
  currentLocation: { lat: number; lng: number };
  berths: Berth[];
  tripConfig: TripConfig;
  speed: number;
}

export const ConductorMap: React.FC<ConductorMapProps> = ({
  currentLocation,
  berths,
  tripConfig,
  speed
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Body scroll lock and map invalidation when fullscreen toggle occurs
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        // Recenter on bus location smoothly or fit bounds
        if (currentLocation) {
          mapRef.current.panTo([currentLocation.lat, currentLocation.lng]);
        }
      }
    }, 150);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [isFullScreen]);

  // Helper inside component to find pickup coordinates
  const getPickupCoords = (passenger: any, trip: TripConfig) => {
    if (!passenger || !passenger.pickupPoint) return trip.startCoords;
    const match = trip.waypoints.find(wp => 
      wp.name.toLowerCase().includes(passenger.pickupPoint.toLowerCase())
    );
    return match ? match.coords : trip.startCoords;
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fixed default icon URLs for standard pins
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Create Map
    mapRef.current = L.map(mapContainerRef.current, {
      center: [tripConfig.startCoords.lat, tripConfig.startCoords.lng],
      zoom: 8,
      zoomControl: true,
      scrollWheelZoom: false
    });

    // Use high fidelity clean tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(mapRef.current);

    // Initial Path Line (Dotted Route)
    const coordsList = tripConfig.waypoints.map(wp => [wp.coords.lat, wp.coords.lng] as [number, number]);
    routePolylineRef.current = L.polyline(coordsList, {
      color: '#ef4444',
      weight: 3.5,
      opacity: 0.75,
      dashArray: '5, 8'
    }).addTo(mapRef.current);

    // Zoom and Fit bounds initially
    try {
      const bounds = L.latLngBounds(coordsList);
      mapRef.current.fitBounds(bounds, { padding: [25, 25] });
    } catch (e) {
      // safe ignore
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [tripConfig.id]);

  useEffect(() => {
    if (!mapRef.current || !routePolylineRef.current || !tripConfig.waypoints.length) return;

    const coordsList = tripConfig.waypoints.map(wp => [wp.coords.lat, wp.coords.lng] as [number, number]);
    routePolylineRef.current.setLatLngs(coordsList);

    try {
      const bounds = L.latLngBounds(coordsList);
      mapRef.current.fitBounds(bounds, { padding: [25, 25] });
    } catch (e) {
      // safe ignore
    }
  }, [tripConfig.waypoints]);

  // 2. Render dynamic locations (the bus + passengers pickups & dropoffs)
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear legacy passenger markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Setup or update Bus location pin
    const busIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-60"></span>
          <div class="relative bg-red-650 bg-red-600 text-white rounded-full p-2 shadow-md border-2 border-white flex items-center justify-center">
            <svg class="w-4 h-4 fill-none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
        </div>
      `,
      className: 'conductor-bus-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (busMarkerRef.current) {
      busMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
    } else {
      busMarkerRef.current = L.marker([currentLocation.lat, currentLocation.lng], { icon: busIcon })
        .bindPopup(`
          <div class="p-1 font-sans">
            <p class="font-bold text-red-600 text-xs uppercase">XE KHÁCH TEAM BH</p>
            <p class="text-[10px] text-slate-500 font-medium mt-0.5">Tốc độ: ${speed} km/h</p>
          </div>
        `)
        .addTo(mapRef.current);
    }

    // Plot Passenger pickups (GREEN) and dropoffs (RED)
    berths.forEach(b => {
      if (b.passenger && (b.status === 'booked' || b.status === 'approaching')) {
        const passenger = b.passenger;

        // 🟢 Pick-up Point (MÀU XANH)
        const pickupLoc = getPickupCoords(passenger, tripConfig);
        const pickupIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-50 animate-pulse"></span>
              <div class="h-6 w-6 rounded-full border-2 border-white bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black shadow-md">
                ${b.label}
              </div>
            </div>
          `,
          className: 'passenger-pickup-dot',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const pickupMarker = L.marker([pickupLoc.lat, pickupLoc.lng], { icon: pickupIcon })
          .bindPopup(`
            <div class="p-1.5 font-sans min-w-[150px]">
              <span class="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">ĐIỂM ĐÓN KHÁCH</span>
              <p class="font-black text-slate-800 text-sm mt-1">${passenger.name}</p>
              <p class="text-[10px] text-slate-500 font-extrabold mt-0.5">Giường: ${b.label}</p>
              <p class="text-[10px] text-slate-500 font-medium">Vị trí đón: ${passenger.pickupPoint || 'BX Xuất phát'}</p>
              ${passenger.phone ? `<p class="text-[10px] font-mono font-bold text-slate-600 mt-1">SĐT: ${passenger.phone}</p>` : ''}
            </div>
          `)
          .addTo(mapRef.current!);
        
        markersRef.current.push(pickupMarker);


        // 🔴 Drop-off Point (MÀU ĐỎ)
        const dropoffLoc = passenger.coords || tripConfig.endCoords;
        const dropoffIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center font-sans">
              <span class="absolute inline-flex h-6 w-6 rounded-full bg-red-400 opacity-50 animate-pulse"></span>
              <div class="h-6 w-6 rounded-full border-2 border-white bg-red-600 text-white flex items-center justify-center text-[9px] font-black shadow-md">
                ${b.label}
              </div>
            </div>
          `,
          className: 'passenger-dropoff-dot',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const dropoffMarker = L.marker([dropoffLoc.lat, dropoffLoc.lng], { icon: dropoffIcon })
          .bindPopup(`
            <div class="p-1.5 font-sans min-w-[150px]">
              <span class="bg-red-100 text-red-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">ĐIỂM TRẢ KHÁCH</span>
              <p class="font-black text-slate-800 text-sm mt-1">${passenger.name}</p>
              <p class="text-[10px] text-slate-500 font-extrabold mt-0.5">Giường: ${b.label}</p>
              <p class="text-[10px] text-slate-500 font-medium">Vị trí trả: ${passenger.destination}</p>
              ${passenger.phone ? `<p class="text-[10px] font-mono font-bold text-slate-600 mt-1">SĐT: ${passenger.phone}</p>` : ''}
            </div>
          `)
          .addTo(mapRef.current!);

        markersRef.current.push(dropoffMarker);
      }
    });

  }, [currentLocation, berths, tripConfig.id]);

  return (
    <div className={isFullScreen 
      ? "fixed inset-0 z-[9999] bg-white flex flex-col p-6 h-screen w-screen animate-fade-in" 
      : "bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col h-[320px]"
    }>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Route className="w-4.5 h-4.5 text-red-600" />
          <div>
            <h4 className="font-extrabold text-xs uppercase text-slate-700 tracking-tight flex items-center gap-2">
              HÀNH TRÌNH XE CHẠY & ĐIỂM ĐÓN/TRẢ (GPS LIVE)
              {isFullScreen && <span className="bg-red-50 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-150 uppercase tracking-wider">Toàn màn hình</span>}
            </h4>
            <p className="text-[10px] text-slate-400">
              <span className="text-emerald-600 font-bold">● Màu xanh: Điểm đón khách</span> {" | "} 
              <span className="text-red-600 font-bold">● Màu đỏ: Điểm trả khách</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Compass className="w-3.5 h-3.5 text-slate-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-[10px] font-mono font-black text-slate-600">{speed} KM/H</span>
          </div>
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
            title={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-red-600 shrink-0" />
                <span>Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Toàn màn hình</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="flex-1 rounded-lg overflow-hidden border border-slate-150 relative z-10 bg-slate-50">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: isFullScreen ? 'calc(100vh - 120px)' : '200px' }} />
      </div>
    </div>
  );
};
