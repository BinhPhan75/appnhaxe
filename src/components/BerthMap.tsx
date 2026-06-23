import React, { useState } from 'react';
import { Berth, FloorType, BerthStatus, Passenger } from '../types';
import { Armchair, CircleAlert, User, ShieldCheck, MapPin, Eye, Phone, LogOut } from 'lucide-react';

interface BerthMapProps {
  berths: Berth[];
  capacity: number;
  onSelectBerth: (berthId: string) => void;
  onToggleStatus: (berthId: string, status: BerthStatus) => void;
  onCancelBooking: (berthId: string) => void;
}

export const REFERENCE_IMAGES = [
  { title: "Sơ đồ xe Giường nằm 41 chỗ tiêu chuẩn", url: "https://buulong.com.vn/wp-content/uploads/2026/03/so-ghe-xe-giuong-nam-phuong-trang.jpg" },
  { title: "Sơ đồ bố trí tầng dưới xe limousine FUTA", url: "https://buulong.com.vn/wp-content/uploads/2026/03/so-ghe-xe-giuong-nam-phuong-trang-2.jpg" },
  { title: "Sơ đồ bố trí tầng trên xe limousine VIP", url: "https://buulong.com.vn/wp-content/uploads/2026/03/so-ghe-xe-giuong-nam-phuong-trang-3.jpg" },
  { title: "Sơ đồ 34 phòng VIP Limousine", url: "https://buulong.com.vn/wp-content/uploads/2026/03/so-ghe-xe-giuong-nam-phuong-trang-4.jpg" },
  { title: "Bản vẽ kích thước chỗ nằm xe khách", url: "https://buulong.com.vn/wp-content/uploads/2026/03/so-ghe-xe-giuong-nam-phuong-trang-5.jpg" }
];

export const BerthMap: React.FC<BerthMapProps> = ({
  berths,
  capacity,
  onSelectBerth,
  onToggleStatus,
  onCancelBooking
}) => {
  const [activeFloor, setActiveFloor] = useState<FloorType>('lower');
  const [showRefImages, setShowRefImages] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);

  // Filter berths by active floor
  const floorBerths = berths.filter(b => b.floor === activeFloor);

  // Group by rows (A, B, C)
  const rowA = floorBerths.filter(b => b.row === 'A').sort((a,b) => a.number - b.number);
  const rowB = floorBerths.filter(b => b.row === 'B').sort((a,b) => a.number - b.number);
  const rowC = floorBerths.filter(b => b.row === 'C').sort((a,b) => a.number - b.number);

  // Find maximum column length to align grid nicely
  const maxRowLen = Math.max(rowA.length, rowB.length, rowC.length);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5" id="berth-map-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h2 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-red-600" />
            Sơ Đồ Ghế / Giườngằm ({capacity} Chỗ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Màu sắc thay đổi theo trạng thái hoạt động của hành khách</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BH reference images modal button */}
          <button
            onClick={() => setShowRefImages(!showRefImages)}
            className="flex items-center gap-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs py-1.5 rounded-lg font-medium border border-red-200 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {showRefImages ? "Ẩn ảnh BH" : "Sơ đồ BH thực tế"}
          </button>
        </div>
      </div>

      {showRefImages && (
        <div className="mt-4 bg-red-50/50 p-4 rounded-xl border border-red-100 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">Tài liệu tham khảo sơ đồ BH</h3>
            <span className="text-[10px] text-red-700 font-mono">Trang {selectedImg + 1}/5</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {REFERENCE_IMAGES.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImg(idx)}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-all ${
                  selectedImg === idx 
                    ? 'bg-red-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Sơ đồ {idx + 1}
              </button>
            ))}
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-700 font-medium mb-1.5 text-center">{REFERENCE_IMAGES[selectedImg].title}</p>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-slate-100">
              <img 
                src={REFERENCE_IMAGES[selectedImg].url} 
                alt={REFERENCE_IMAGES[selectedImg].title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Legend Block */}
      <div className="grid grid-cols-4 gap-2 mt-4 p-2.5 bg-slate-50 rounded-lg text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-3 h-3 rounded-full bg-emerald-500 block border border-emerald-600"></span>
          <span>Trống</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-3 h-3 rounded-full bg-red-500 block border border-red-600"></span>
          <span>Có khách</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-3 h-3 rounded-full bg-amber-400 block border border-amber-500 animate-pulse"></span>
          <span>Sắp xuống (≤5km)</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-3 h-3 rounded-full bg-slate-300 block border border-slate-400"></span>
          <span>Đã xuống</span>
        </div>
      </div>

      {/* Deck Selector Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg mt-5">
        <button
          onClick={() => setActiveFloor('lower')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
            activeFloor === 'lower' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          TẦNG DƯỚI (LOWER DECK)
        </button>
        <button
          onClick={() => setActiveFloor('upper')}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
            activeFloor === 'upper' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          TẦNG TRÊN (UPPER DECK)
        </button>
      </div>

      {/* Cabin Visualizer */}
      <div className="relative mt-6 border-4 border-slate-400 rounded-2xl p-4 md:p-6 bg-slate-50/60 max-w-xl mx-auto overflow-x-auto min-w-[320px]">
        {/* Front windshield representation */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-slate-850 rounded-t-xl opacity-20 flex items-center justify-center">
          <span className="text-[9px] text-slate-800 font-bold tracking-wider uppercase">Đầu Xe (Front)</span>
        </div>

        {/* Rows layout */}
        <div className="flex flex-row justify-between gap-4 mt-2">
          {/* Row A (Left Window Deck) */}
          <div className="flex flex-col gap-3 flex-1 items-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">LỐI ĐI TRÁI</span>
            {rowA.map((b) => (
              <BerthCard 
                key={b.id} 
                berth={b} 
                onClick={() => onSelectBerth(b.id)} 
                onToggleStatus={onToggleStatus}
                onCancelBooking={onCancelBooking}
              />
            ))}
            {/* Pad shorter rows to match grids alignment */}
            {rowA.length < maxRowLen && Array.from({ length: maxRowLen - rowA.length }).map((_, i) => (
              <div key={`pad_a_${i}`} className="h-16 w-full opacity-0 pointer-events-none" />
            ))}
          </div>

          {/* Row B (Middle Row Deck) */}
          <div className="flex flex-col gap-3 flex-1 items-center border-x border-dashed border-slate-200 px-2">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">HÀNG GIỮA</span>
            {rowB.map((b) => (
              <BerthCard 
                key={b.id} 
                berth={b} 
                onClick={() => onSelectBerth(b.id)} 
                onToggleStatus={onToggleStatus}
                onCancelBooking={onCancelBooking}
              />
            ))}
            {/* Pad shorter rows */}
            {rowB.length < maxRowLen && Array.from({ length: maxRowLen - rowB.length }).map((_, i) => (
              <div key={`pad_b_${i}`} className="h-16 w-full opacity-0 pointer-events-none" />
            ))}
          </div>

          {/* Row C (Right Window Deck) */}
          <div className="flex flex-col gap-3 flex-1 items-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">LỐI ĐI PHẢI</span>
            {rowC.map((b) => (
              <BerthCard 
                key={b.id} 
                berth={b} 
                onClick={() => onSelectBerth(b.id)} 
                onToggleStatus={onToggleStatus}
                onCancelBooking={onCancelBooking}
              />
            ))}
            {/* Pad shorter rows */}
            {rowC.length < maxRowLen && Array.from({ length: maxRowLen - rowC.length }).map((_, i) => (
              <div key={`pad_c_${i}`} className="h-16 w-full opacity-0 pointer-events-none" />
            ))}
          </div>
        </div>

        {/* Back seats indicator */}
        <div className="mt-5 pt-3 border-t border-slate-200 text-center">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Đuôi Xe (Back)</span>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Mini-card representation of a single berth
interface BerthCardProps {
  berth: Berth;
  onClick: () => void;
  onToggleStatus: (berthId: string, status: BerthStatus) => void;
  onCancelBooking: (berthId: string) => void;
}

const BerthCard: React.FC<BerthCardProps> = ({ berth, onClick, onToggleStatus, onCancelBooking }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Determine CSS classes according to passenger state
  let bgClass = "bg-white text-slate-700 hover:bg-slate-50 border-slate-200";
  let statusBadgeColor = "bg-slate-100 text-slate-600";
  let animatePulseClass = "";

  if (berth.status === 'booked') {
    bgClass = "bg-red-50 text-red-900 border-red-300 hover:bg-red-100/70";
    statusBadgeColor = "bg-red-600 text-white";
  } else if (berth.status === 'approaching') {
    bgClass = "bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100/80 ring-2 ring-amber-400 ring-offset-1";
    statusBadgeColor = "bg-amber-500 text-slate-900";
    animatePulseClass = "animate-pulse";
  } else if (berth.status === 'dropped') {
    bgClass = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/50";
    statusBadgeColor = "bg-slate-400 text-white";
  } else {
    // empty
    bgClass = "bg-emerald-50/50 text-emerald-950 border-emerald-200 hover:bg-emerald-50";
    statusBadgeColor = "bg-emerald-500 text-white";
  }

  const handleBerthClick = (e: React.MouseEvent) => {
    // If berth has client passenger on board, toggle quick popover. If empty, directly select.
    if (berth.status === 'empty') {
      onClick();
    } else {
      setShowQuickActions(!showQuickActions);
    }
  };

  return (
    <div className="relative w-full" onMouseLeave={() => setShowQuickActions(false)}>
      <button
        onClick={handleBerthClick}
        className={`w-full h-20 rounded-xl border-2 flex flex-col justify-between p-2 text-left shadow-sm transition-all relative ${bgClass} ${animatePulseClass}`}
      >
        <div className="flex items-center justify-between w-full">
          <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${statusBadgeColor}`}>
            {berth.label}
          </span>
          {berth.status === 'approaching' && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </div>

        {berth.passenger ? (
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate block">{berth.passenger.name}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-0.5 text-slate-600">
              <MapPin className="w-2.5 h-2.5 text-red-600 shrink-0" />
              {berth.passenger.destination}
            </p>
          </div>
        ) : berth.status === 'dropped' ? (
          <div>
            <p className="text-[10px] text-slate-400 font-medium block">Đã xuống xe</p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-emerald-600 font-semibold block">Trống</p>
          </div>
        )}
      </button>

      {/* Quick contextual action menu for seated passengers */}
      {showQuickActions && berth.status !== 'empty' && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1.5 flex flex-col gap-1 transition-all">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-1 text-center border-b border-slate-100 pb-1">
            Hành khách {berth.label}
          </span>
          
          {berth.status === 'booked' && (
            <button
              onClick={() => {
                onToggleStatus(berth.id, 'approaching');
                setShowQuickActions(false);
              }}
              className="w-full text-left text-[11px] py-1 px-2 font-semibold text-amber-700 hover:bg-amber-50 rounded flex items-center gap-1"
            >
              <CircleAlert className="w-3.5 h-3.5" />
              Báo sắp xuống
            </button>
          )}

          {berth.status === 'approaching' && (
            <button
              onClick={() => {
                onToggleStatus(berth.id, 'booked');
                setShowQuickActions(false);
              }}
              className="w-full text-left text-[11px] py-1 px-2 font-semibold text-blue-700 hover:bg-blue-50 rounded flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Bình thường
            </button>
          )}

          <button
            onClick={() => {
              onToggleStatus(berth.id, 'dropped');
              setShowQuickActions(false);
            }}
            className="w-full text-left text-[11px] py-1 px-2 font-semibold text-slate-700 hover:bg-slate-50 rounded flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            Cho xuống xe
          </button>

          <button
            onClick={() => {
              onCancelBooking(berth.id);
              setShowQuickActions(false);
            }}
            className="w-full text-[11px] text-left text-red-600 font-semibold py-1 px-2 hover:bg-red-50 rounded flex items-center gap-1 border-t border-slate-100 pt-1"
          >
            <LogOut className="w-3.5 h-3.5 rotate-180 text-red-400" />
            Hủy đăng ký
          </button>
        </div>
      )}
    </div>
  );
};
