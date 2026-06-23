import React, { useState, useEffect, useRef } from 'react';
import { 
  BusState, 
  Berth, 
  TripConfig, 
  CustomerHistory, 
  SyncTransaction, 
  BerthStatus, 
  Passenger
} from './types';
import { 
  VIETNAM_ROUTES, 
  MOCK_CUSTOMERS, 
  generateInitialBerths, 
  getPositionOnRoute, 
  getDistanceKm 
} from './utils/mockData';
import { 
  playProximityAlert, 
  playSuccessBeep, 
  speakVietnamese 
} from './utils/audioAlert';
import { BerthMap } from './components/BerthMap';
import { PassengerModal } from './components/PassengerModal';
import { Dashboard } from './components/Dashboard';
import { 
  Wifi, 
  WifiOff, 
  RotateCw, 
  Users, 
  TrendingUp, 
  Settings, 
  Activity, 
  Play, 
  Pause, 
  Square, 
  ArrowRight, 
  BellRing,
  HelpCircle,
  Cpu,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Share2
} from 'lucide-react';

export default function App() {
  // Roles toggles: 'conductor' (phụ xe) or 'dispatcher' (điều hành bến)
  const [activeRole, setActiveRole] = useState<'conductor' | 'dispatcher'>('conductor');

  // Selected trip route configurations
  const [selectedTrip, setSelectedTrip] = useState<TripConfig>(VIETNAM_ROUTES[0]);
  const [capacity, setCapacity] = useState<number>(34); // Capacity choices: 22, 34, 41

  // Primary state sync'd with Server in real-time
  const [berths, setBerths] = useState<Berth[]>([]);
  const [currentLocation, setCurrentLocation] = useState({ lat: 10.7494, lng: 106.6171 });
  const [isSimulating, setIsSimulating] = useState(true);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 5x, 10x speed multiplier
  const [speedKmh, setSpeedKmh] = useState(65);

  // Connection offline/online modes representation
  const [isOffline, setIsOffline] = useState(false);
  const [outbox, setOutbox] = useState<SyncTransaction[]>([]);
  const [customers, setCustomers] = useState<CustomerHistory[]>(MOCK_CUSTOMERS);

  // UI state
  const [selectedBerthForBooking, setSelectedBerthForBooking] = useState<{ id: string; label: string } | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  
  // Track announced proximity checkpoints to avoid repetitive speech loops
  const announcedDestinations = useRef<Set<string>>(new Set());

  // Simulation run timer ref
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch full state from backend Express server
  const fetchStateFromServer = async () => {
    if (isOffline) return; // Block API fetches when intentionally working offline
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setBerths(data.berths);
        setCapacity(data.layoutCapacity);
        
        // Only pull location from server if we are NOT simulating on this screen
        if (!isSimulating) {
          setCurrentLocation(data.currentLocation);
          setSimulationProgress(data.simulationProgress || 0);
        }
      }

      const resCustomers = await fetch('/api/customers');
      if (resCustomers.ok) {
        const dataCust = await resCustomers.json();
        setCustomers(dataCust);
      }
    } catch (e) {
      console.warn("Express server connection lost. Entering safety offline state naturally.", e);
      setIsOffline(true);
    }
  };

  // Pull initial data on mount
  useEffect(() => {
    fetchStateFromServer();
    // Continuous polling for live operations updates when online every 4 seconds
    const interval = setInterval(() => {
      fetchStateFromServer();
    }, 4000);
    return () => clearInterval(interval);
  }, [isOffline, isSimulating]);

  // Handle Offline state local storage persistence representation
  useEffect(() => {
    const savedOutbox = localStorage.getItem('FUTA_SYNC_OUTBOX');
    if (savedOutbox) {
      setOutbox(JSON.parse(savedOutbox));
    }
  }, []);

  const saveOutboxToStorage = (updatedOutbox: SyncTransaction[]) => {
    setOutbox(updatedOutbox);
    localStorage.setItem('FUTA_SYNC_OUTBOX', JSON.stringify(updatedOutbox));
  };

  // Synchronize outbox transactional queue with Express backend when online
  const triggerOnlineSynchronization = async (currentOutbox: SyncTransaction[] = outbox) => {
    if (currentOutbox.length === 0) {
      setSyncFeedback("Hệ thống đã đồng bộ ở trạng thái mới nhất!");
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    try {
      setSyncFeedback("Đang kết nối đồng bộ...");
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: currentOutbox })
      });

      if (response.ok) {
        const result = await response.json();
        setBerths(result.state.berths);
        setCustomers(result.customers);
        
        // Play sweet feedback chime
        playSuccessBeep();
        
        // Notify user
        setSyncFeedback(`Đồng bộ thành công ${currentOutbox.length} giao dịch ngoại tuyến.`);
        saveOutboxToStorage([]); // Clear outbox queue
        
        setTimeout(() => setSyncFeedback(null), 5000);
      } else {
        throw new Error("Server error synchronizing payload");
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback("Đồng bộ thất bại. Vui lòng kiểm tra lại đường truyền mạng!");
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Toggle network setting manually or listen for navigator network state changes
  const toggleNetworkConnection = () => {
    if (isOffline) {
      // Transitioning offline to online: Trigger sync
      setIsOffline(false);
      triggerOnlineSynchronization();
    } else {
      setIsOffline(true);
      setSyncFeedback("Đã chuyển sang Chế độ Ngoại tuyến (Offline Mode)");
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Route selector or Layout capacity overrides
  const handleTripChange = async (tripId: string) => {
    const targetTrip = VIETNAM_ROUTES.find(r => r.id === tripId);
    if (!targetTrip) return;

    setSelectedTrip(targetTrip);
    setSimulationProgress(0);
    setCurrentLocation(targetTrip.startCoords);
    announcedDestinations.current.clear();
    setActiveAlarm(null);

    // Reset berths with some seeded passengers for the new route
    if (!isOffline) {
      try {
        await fetch('/api/layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ capacity })
        });
      } catch (err) {
        console.warn("Failure telling server about trip change", err);
      }
    }
    fetchStateFromServer();
  };

  const handleCapacityChange = async (newCap: number) => {
    setCapacity(newCap);
    setBerths(generateInitialBerths(newCap));
    announcedDestinations.current.clear();
    setActiveAlarm(null);

    if (!isOffline) {
      try {
        await fetch('/api/layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ capacity: newCap })
        });
        fetchStateFromServer();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // --- PASSENGER BOOKING OPERATIONS ---
  const handleSelectBerth = (berthId: string) => {
    const b = berths.find(item => item.id === berthId);
    if (b && b.status === 'empty') {
      setSelectedBerthForBooking({ id: berthId, label: b.label });
    }
  };

  const handleSavePassenger = async (passenger: Passenger) => {
    if (!selectedBerthForBooking) return;
    const bId = selectedBerthForBooking.id;

    // Build booking object
    const updatedBerths = berths.map(item => {
      if (item.id === bId) {
        return {
          ...item,
          status: 'booked' as BerthStatus,
          passenger
        };
      }
      return item;
    });

    setBerths(updatedBerths);
    setSelectedBerthForBooking(null);

    if (isOffline) {
      // Save locally to cache queue
      const tx: SyncTransaction = {
        id: `tx_${Date.now()}`,
        timestamp: Date.now(),
        type: 'book',
        payload: { berthId: bId, passenger },
        status: 'pending'
      };
      
      const updatedOutbox = [...outbox, tx];
      saveOutboxToStorage(updatedOutbox);
      
      setSyncFeedback(`Đã xếp phòng ${selectedBerthForBooking.label} ngoại tuyến. Chờ mạng đồng bộ!`);
      setTimeout(() => setSyncFeedback(null), 3500);
    } else {
      // Sync online directly
      try {
        await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ berthId: bId, status: 'booked', passenger })
        });
        fetchStateFromServer();
        playSuccessBeep();
      } catch (e) {
        console.warn("Direct post failed, buffering booking to outbox", e);
      }
    }
  };

  const handleToggleStatus = async (berthId: string, status: BerthStatus) => {
    const updatedBerths = berths.map(item => {
      if (item.id === berthId) {
        return { ...item, status };
      }
      return item;
    });
    setBerths(updatedBerths);

    if (isOffline) {
      const tx: SyncTransaction = {
        id: `tx_${Date.now()}`,
        timestamp: Date.now(),
        type: 'change_status',
        payload: { berthId, status },
        status: 'pending'
      };
      saveOutboxToStorage([...outbox, tx]);
    } else {
      try {
        await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ berthId, status })
        });
        fetchStateFromServer();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCancelBooking = async (berthId: string) => {
    const updatedBerths = berths.map(item => {
      if (item.id === berthId) {
        const resetBerth: Berth = { ...item, status: 'empty' };
        delete resetBerth.passenger;
        return resetBerth;
      }
      return item;
    });
    setBerths(updatedBerths);

    if (isOffline) {
      const tx: SyncTransaction = {
        id: `tx_${Date.now()}`,
        timestamp: Date.now(),
        type: 'cancel',
        payload: { berthId },
        status: 'pending'
      };
      saveOutboxToStorage([...outbox, tx]);
    } else {
      try {
        await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ berthId, status: 'empty' })
        });
        fetchStateFromServer();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- SIMULATION TICK RUNNER ---
  useEffect(() => {
    if (isSimulating) {
      simTimerRef.current = setInterval(() => {
        setSimulationProgress(prev => {
          let next = prev + (0.5 * simSpeed);
          if (next >= 100) {
            next = 0; // Wrap around route
            announcedDestinations.current.clear(); // reset announcements for next loop
          }
          return next;
        });
      }, 1000);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating, simSpeed]);

  // Translate progress % into latitude/longitude on Vietnam highways
  useEffect(() => {
    const { coords, currentTarget } = getPositionOnRoute(selectedTrip.waypoints, simulationProgress);
    setCurrentLocation(coords);

    // Propagate simulation coordinates to server in background so remote office dashboards can display it
    if (!isOffline && isSimulating) {
      fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          speed: speedKmh,
          isSimulating,
          progress: simulationProgress
        })
      }).catch(err => console.debug("GPS update buffering", err));
    }

    // --- CO-COORDINATE PROXIMITY CALCULATIONS (5KM WARNING BOUNDARY) ---
    // Scan all registered passengers currently on board (booked/approaching)
    const nextBerths = berths.map(b => {
      if (b.passenger && (b.status === 'booked' || b.status === 'approaching')) {
        const passengerCoords = b.passenger.coords;
        const distKm = getDistanceKm(coords.lat, coords.lng, passengerCoords.lat, passengerCoords.lng);

        if (distKm <= 5.0) {
          // Trigger alert if not previously announced
          const uniqueKey = `${b.id}_${b.passenger.name}`;
          if (!announcedDestinations.current.has(uniqueKey)) {
            announcedDestinations.current.add(uniqueKey);
            
            // Set dynamic warning alert banners
            setActiveAlarm(`Sắp trả khách ${b.passenger.name} tại trạm: ${b.passenger.destination} (Cách ${distKm.toFixed(1)} km)`);
            
            // play double alarm chime
            playProximityAlert();
            
            // Synthesize clear audio speaker announcement in natural Vietnamese
            speakVietnamese(`Chú ý phụ xe, chuẩn bị trả khách ${b.passenger.name} xuống tại ${b.passenger.destination}. Khoảng cách còn lại năm ki lô mét.`);
            
            // Auto dismiss alert banner after 8 seconds
            setTimeout(() => setActiveAlarm(null), 8500);
          }

          // Return modified status
          return {
            ...b,
            status: 'approaching' as BerthStatus
          };
        }
      }
      return b;
    });

    // Check if any state changes before setting state to avoid excessive React triggers
    const stateChanged = JSON.stringify(nextBerths) !== JSON.stringify(berths);
    if (stateChanged && berths.length > 0) {
      setBerths(nextBerths);
    }

  }, [simulationProgress, selectedTrip, isSimulating]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="bus-operator-app">
      
      {/* Visual Header */}
      <header className="bg-slate-900 text-white px-5 py-4 flex flex-col md:flex-row items-center justify-between shadow-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-red-650 h-10 w-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md border border-red-500">
            FUTA
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              FUTA BUS LINES CO-COORDINATOR
              <span className="bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded tracking-normal">
                VIP
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Bản đồ số định vị &amp; Sơ đồ lấp đầy giường nằm dã khóa ngoại tuyến</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          
          {/* Offline Sync Buffer Badge Indicator */}
          {outbox.length > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-amber-400 text-xs font-bold animate-pulse">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>Chờ đồng bộ: {outbox.length}</span>
            </div>
          )}

          {/* Connected Network Toggle State */}
          <button
            onClick={toggleNetworkConnection}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              isOffline 
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-4 h-4 text-slate-450" />
                <span>CHẾ ĐỘ OFFLINE: KHÓA BỘ NHỚ LOCAL</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 animate-bounce" />
                <span>MẠNG TRỰC TUYẾN: ONLINE SYNC</span>
              </>
            )}
          </button>

          {/* Trigger Sync Force Button */}
          {isOffline && outbox.length > 0 && (
            <button
              onClick={() => triggerOnlineSynchronization()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-md border border-red-500"
            >
              Đồng bộ ngay
            </button>
          )}

        </div>
      </header>

      {/* Global Status/Action Messages */}
      {syncFeedback && (
        <div className="bg-red-50 text-red-900 border-b border-red-100 px-5 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {syncFeedback}
        </div>
      )}

      {/* Proximity Flashing Warning banner */}
      {activeAlarm && (
        <div className="bg-amber-500 text-slate-900 border-b border-amber-600 px-5 py-3 text-center text-xs font-extrabold flex items-center justify-center gap-2 animate-bounce">
          <BellRing className="w-5 h-5 text-slate-900 animate-swing" />
          <span>{activeAlarm}</span>
        </div>
      )}

      {/* Main Content Workspace Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
        
        {/* Sub-Header / Settings and Selectors */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
            {/* Route selector */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hành trình xe chạy</label>
              <select
                value={selectedTrip.id}
                onChange={(e) => handleTripChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                {VIETNAM_ROUTES.map(route => (
                  <option key={route.id} value={route.id}>{route.name}</option>
                ))}
              </select>
            </div>

            {/* Capacity setup */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loại giường (Sức chứa)</label>
              <div className="flex gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                {[22, 34, 41].map((capValue) => (
                  <button
                    key={capValue}
                    onClick={() => handleCapacityChange(capValue)}
                    className={`px-3 py-1 rounded text-[11px] font-extrabold transition-all uppercase ${
                      capacity === capValue 
                        ? 'bg-red-650 bg-red-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {capValue} giường
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Role and Coordination Tabs Switcher */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
            <button
              onClick={() => setActiveRole('conductor')}
              className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeRole === 'conductor' 
                  ? 'bg-white text-red-600 shadow-sm font-black' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4" />
              BÀN PHỤ XE (VỊ TRÍ & ĐẶT CHỖ)
            </button>
            <button
              onClick={() => setActiveRole('dispatcher')}
              className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                activeRole === 'dispatcher' 
                  ? 'bg-white text-red-600 shadow-sm font-black' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              ĐIỀU HÀNH BẾN (DASHBOARD & HÀNH TRÌNH)
            </button>
          </div>

        </div>

        {/* Dynamic active role visual layout */}
        {activeRole === 'driver' || activeRole === 'conductor' ? (
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Sidebar and Simulation adjustments */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Proximity sensor status */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-150 p-5">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">ĐỊNH VỊ GPS GIẢ LẬP HÀNH TRÌNH</h3>
                <p className="text-xs text-slate-500 mt-1">Dùng để kiểm thử cảnh báo định vị 5km trả khách tiếp theo khi đang di chuyển</p>

                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all ${
                      isSimulating ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isSimulating ? (
                      <>
                        <Pause className="w-4 h-4" /> Tam dừng chạy
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" /> Khởi hành xe
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setSimulationProgress(0);
                      announcedDestinations.current.clear();
                      setActiveAlarm(null);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200"
                    title="Đặt lại chuyến đi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress bar controller slider */}
                <div className="mt-5 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Hành Trình Chạy:</span>
                    <span className="font-mono text-red-650 text-red-600">{Math.round(simulationProgress)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="99"
                    step="0.5"
                    value={simulationProgress}
                    onChange={(e) => {
                      setSimulationProgress(Number(e.target.value));
                      // clear announcements to allow testing proximal trigger again on same checkpoint
                      announcedDestinations.current.clear();
                    }}
                    className="w-full accent-red-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>{selectedTrip.startName}</span>
                    <span>{selectedTrip.endName}</span>
                  </div>
                </div>

                {/* Simulation speed overrides */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Gia tăng tốc độ chạy kiểm thử:</span>
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[1, 5, 10, 20].map(multiplier => (
                      <button
                        key={multiplier}
                        onClick={() => setSimSpeed(multiplier)}
                        className={`text-xs font-bold py-1 rounded border transition-all ${
                          simSpeed === multiplier 
                            ? 'bg-slate-800 text-white border-slate-800' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {multiplier}x
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Điều chỉnh tốc độ nhanh hơn (e.g. 10x, 20x) để xe chạy lướt qua các trạm dừng giúp kiểm thử tính năng phát âm thanh và cảnh báo rung khi đến mốc 5km dễ dàng hơn.</p>
                </div>

              </div>

              {/* Waypoints of route logs */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-150 p-5 flex flex-col">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Danh Sách Trạm Dừng</h3>
                <p className="text-xs text-slate-500 mt-1">Các trạm định vị hỗ trợ trả khách dọc đường</p>

                <div className="mt-4 flex-1 flex flex-col gap-3.5 relative overflow-y-auto max-h-56">
                  {selectedTrip.waypoints.map((wp, idx) => {
                    const isNext = simulationProgress < (wp.distanceKm / selectedTrip.waypoints[selectedTrip.waypoints.length - 1].distanceKm) * 100;
                    return (
                      <div key={idx} className="flex gap-3 text-xs items-start">
                        <div className="flex flex-col items-center">
                          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[7px] font-bold ${
                            isNext ? 'bg-white border-slate-300 text-slate-400' : 'bg-red-600 border-red-800 text-white'
                          }`}>
                            {idx + 1}
                          </span>
                          {idx < selectedTrip.waypoints.length - 1 && (
                            <div className="w-0.5 h-6 bg-slate-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 flex justify-between">
                          <div>
                            <p className={`font-bold ${isNext ? 'text-slate-500' : 'text-slate-800 font-extrabold'}`}>{wp.name}</p>
                          </div>
                          <span className="font-mono text-[10px] text-slate-450 text-slate-400">
                            {wp.distanceKm} km
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Berth layouts core panels */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              <BerthMap 
                berths={berths} 
                capacity={capacity}
                onSelectBerth={handleSelectBerth}
                onToggleStatus={handleToggleStatus}
                onCancelBooking={handleCancelBooking}
              />

            </div>

          </div>

        ) : (
          
          // Office and operator visual dashboard
          <Dashboard 
            busState={{
              tripId: selectedTrip.id,
              layoutCapacity: capacity,
              currentLocation,
              berths,
              isOffline,
              isSimulating,
              simulationProgress,
              speed: speedKmh
            }}
            tripConfig={selectedTrip}
            customerHistory={customers}
            onSearchCustomer={(val) => {}}
          />

        )}

      </main>

      {/* Floating passenger registration overlay */}
      {selectedBerthForBooking && (
        <PassengerModal
          berthLabel={selectedBerthForBooking.label}
          berthId={selectedBerthForBooking.id}
          tripConfig={selectedTrip}
          onClose={() => setSelectedBerthForBooking(null)}
          onSave={handleSavePassenger}
        />
      )}

      {/* Aesthetic Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12 py-6 text-slate-400 px-5 text-center text-xs">
        <p className="font-semibold text-slate-300">© 2026 FUTA Bus Corporation. Bản quyền thuộc về Nhà Xe Phương Trang.</p>
        <p className="mt-1.5 text-slate-500 max-w-xl mx-auto leading-relaxed">
          Định vị vệ tinh 4G liên tục được phát qua Express &rarr; Vite. Hệ thống lưu trữ bảo vệ ngoại tuyến an toàn khi xe di chuyển qua khu vực mất sóng (Đèo Bảo Lộc, Vùng Cao Di Linh) và đồng bộ trực tuyến khi có kết nối hoàn bến.
        </p>
      </footer>

    </div>
  );
}
