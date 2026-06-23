import React, { useState, useEffect } from 'react';
import { TripConfig, Waypoint, Passenger } from '../types';
import { MapPin, Phone, User, X, Check, Search } from 'lucide-react';

interface PassengerModalProps {
  berthLabel: string;
  berthId: string;
  tripConfig: TripConfig;
  onClose: () => void;
  onSave: (passenger: Passenger) => void;
}

export const PassengerModal: React.FC<PassengerModalProps> = ({
  berthLabel,
  berthId,
  tripConfig,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [destination, setDestination] = useState('');
  
  // Suggested destinations on the active route map + famous spots
  const [suggestions, setSuggestions] = useState<Waypoint[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number, lng: number } | null>(null);

  // Generate initial suggestions based on current route waypoints
  useEffect(() => {
    if (tripConfig && tripConfig.waypoints) {
      setSuggestions(tripConfig.waypoints);
    }
  }, [tripConfig]);

  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestination(val);

    // Search matches from tripConfig waypoints first, or general stops
    if (!val.trim()) {
      setSuggestions(tripConfig.waypoints);
      return;
    }

    const filtered = tripConfig.waypoints.filter(w => 
      w.name.toLowerCase().includes(val.toLowerCase())
    );
    setSuggestions(filtered);
  };

  const handleSelectSuggestion = (waypoint: Waypoint) => {
    setDestination(waypoint.name);
    setSelectedCoords(waypoint.coords);
    // filter suggestions down to just the selected one
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Vui lòng nhập tên hành khách!");
      return;
    }
    if (!destination.trim()) {
      alert("Vui lòng nhập hoặc chọn điểm trả khách!");
      return;
    }

    // Default coordinate if no suggestion matched: midpoint of the route or close to end
    const coords = selectedCoords || tripConfig.waypoints[tripConfig.waypoints.length - 1].coords;

    onSave({
      name: name.trim(),
      phone: phone.trim() || undefined,
      destination: destination.trim(),
      coords
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Xếp Ghế / Giường {berthLabel}</h3>
            <p className="text-xs text-red-100 mt-0.5">Nhập thông tin khách hàng lên xe</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 hover:bg-black/10 rounded-full transition-colors transition-transform hover:rotate-90 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          
          {/* Passenger Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Tên Hành Khách <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-slate-800"
            />
          </div>

          {/* Passenger Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Số Điện Thoại (Không bắt buộc)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ví dụ: 0912xxxxxx"
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-slate-800"
            />
          </div>

          {/* Destination - Autocomplete */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Điểm Trả Khách (Hành trình gợi ý) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={destination}
                onChange={handleDestinationChange}
                placeholder="Gợi ý điểm dừng dọc đường..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-slate-800"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Smart suggestions popover */}
            {suggestions.length > 0 && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-lg divide-y divide-slate-100">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-450 bg-slate-50 px-3 py-2 text-slate-500">
                  Phù hợp với lộ trình {tripConfig.route}
                </p>
                {suggestions.map((w, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(w)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-all text-slate-700"
                  >
                    <span className="font-semibold">{w.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 py-0.5 rounded">
                      Dist: {w.distanceKm} Km
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-500 flex flex-col gap-1">
            <p className="font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-500" /> Lộ trình chọn:
            </p>
            <p className="font-semibold text-slate-600">{tripConfig.name}</p>
            <p className="mt-1 leading-relaxed">Chọn đúng trạm dừng gợi ý để được hỗ trợ cảnh báo định vị <strong>phạm vi 5km</strong> khi xe chạy gần tới!</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Xếp chỗ
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
