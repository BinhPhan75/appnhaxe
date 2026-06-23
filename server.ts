import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { VIETNAM_ROUTES, getPositionOnRoute, getDistanceKm } from './src/utils/mockData';

const app = express();
const PORT = 3000;

app.use(express.json());

// Load Supabase Client configuration
let rawSupabaseUrl = (process.env.SUPABASE_URL || '').trim();
if (rawSupabaseUrl) {
  // Strip trailing slashes
  while (rawSupabaseUrl.endsWith('/')) {
    rawSupabaseUrl = rawSupabaseUrl.slice(0, -1);
  }
  // Strip redundant PostgREST path suffix if mistakenly appended
  if (rawSupabaseUrl.endsWith('/rest/v1')) {
    rawSupabaseUrl = rawSupabaseUrl.slice(0, -8);
  }
  while (rawSupabaseUrl.endsWith('/')) {
    rawSupabaseUrl = rawSupabaseUrl.slice(0, -1);
  }
}
const SUPABASE_URL = rawSupabaseUrl;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)  
  : null;

if (supabase) {
  console.log('✅ Supabase client loaded successfully for backend persistence.');
} else {
  console.warn('⚠️ Supabase credentials missing/incomplete in environment. Falling back to RAM persistence.');
}

// In-Memory state for the bus and bookings so that the dispatcher and assistant can share data in real-time
interface SavedPassenger {
  name: string;
  phone?: string;
  destination: string;
  coords: { lat: number; lng: number };
  cccd?: string;
  travelDate?: string;
  pickupPoint?: string;
}

interface SavedBerth {
  id: string;
  label: string;
  floor: 'lower' | 'upper';
  row: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  number: number;
  status: 'empty' | 'booked' | 'approaching' | 'dropped';
  passenger?: SavedPassenger;
}

// Smart coordinate resolver for arbitrary Vietnamese station and city names
function resolveCoords(name: string, isStart: boolean): { lat: number; lng: number } {
  const n = (name || '').toLowerCase();
  
  // Sài Gòn / HCMC
  if (n.includes('sài gòn') || n.includes('sai gon') || n.includes('hồ chí minh') || n.includes('tphcm') || n.includes('bến xe miền tây') || n.includes('miền tây')) {
    return { lat: 10.7494, lng: 106.6171 };
  }
  if (n.includes('miền đông') || n.includes('bến xe miền đông')) {
    return { lat: 10.8142, lng: 106.7126 };
  }
  
  // Other major cities
  if (n.includes('đà lạt') || n.includes('da lat') || n.includes('lâm đồng')) return { lat: 11.9333, lng: 108.4503 };
  if (n.includes('cần thơ') || n.includes('can tho')) return { lat: 10.0152, lng: 105.7487 };
  if (n.includes('nha trang') || n.includes('nha trang') || n.includes('khánh hòa')) return { lat: 12.2224, lng: 109.1672 };
  if (n.includes('đà nẵng') || n.includes('da nang')) return { lat: 16.0544, lng: 108.2022 };
  if (n.includes('hà nội') || n.includes('ha noi')) return { lat: 21.0285, lng: 105.8542 };
  if (n.includes('vũng tàu') || n.includes('vung tau')) return { lat: 10.3460, lng: 107.0843 };
  if (n.includes('phan thiết') || n.includes('phan thiet') || n.includes('bình thuận')) return { lat: 10.9322, lng: 108.1011 };
  if (n.includes('rạch giá') || n.includes('rach gia') || n.includes('kiên giang')) return { lat: 10.0124, lng: 105.0809 };
  if (n.includes('quy nhơn') || n.includes('quy nhon') || n.includes('bình định')) return { lat: 13.7820, lng: 109.2205 };
  if (n.includes('buôn ma thuột') || n.includes('buon ma thuot') || n.includes('đắk lắk') || n.includes('bmt')) return { lat: 12.6667, lng: 108.0500 };
  if (n.includes('hải phòng') || n.includes('hai phong')) return { lat: 20.8449, lng: 106.6881 };
  if (n.includes('vinh') || n.includes('nghệ an')) return { lat: 18.6734, lng: 105.6811 };
  if (n.includes('huế') || n.includes('thừa thiên')) return { lat: 16.4637, lng: 107.5909 };

  // Generate slightly randomized coordinates nearby region based on hash if not recognized
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = (hash % 100) / 200; // ±0.5 degree
  const lngOffset = ((hash >> 8) % 100) / 200; // ±0.5 degree

  if (isStart) {
    return { lat: 10.7494 + latOffset, lng: 106.6171 + lngOffset }; // Sài Gòn region
  } else {
    return { lat: 11.9333 + latOffset, lng: 108.4503 + lngOffset }; // Đà Lạt region
  }
}

// Dynamic routing waypoints generator based on user selections in Admin Panel
function generateWaypointsByRoute(
  tripId: string,
  startName: string,
  endName: string,
  routeType: string,
  startCoordsOverride?: { lat: number; lng: number },
  endCoordsOverride?: { lat: number; lng: number }
): any[] {
  let coordsList: { name: string; coords: { lat: number; lng: number } }[] = [];

  const startCoords = startCoordsOverride || resolveCoords(startName, true);
  const endCoords = endCoordsOverride || resolveCoords(endName, false);

  if (tripId === 'sg-dl') {
    if (routeType === 'expressway') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Trạm Thu Phí Cao Tốc LT-DG', coords: { lat: 10.8123, lng: 106.8234 } },
        { name: 'Trạm Dừng Chân Cao Tốc Phú Túc', coords: { lat: 11.1124, lng: 107.2845 } },
        { name: 'Đường Cao Tốc Dầu Giây Liên Khương', coords: { lat: 11.4589, lng: 107.7289 } },
        { name: 'Nút Giao Cao Tốc Liên Khương', coords: { lat: 11.7233, lng: 108.3245 } },
        { name: 'Trạm Thu Phí Định An', coords: { lat: 11.8415, lng: 108.4321 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else if (routeType === 'other') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Đường Tỉnh ĐT.763', coords: { lat: 10.9984, lng: 107.0512 } },
        { name: 'Đèo Tà Pứa (Lâm Đồng)', coords: { lat: 11.3855, lng: 107.5944 } },
        { name: 'Trạm dừng chân Đạ Huoai', coords: { lat: 11.4123, lng: 107.6543 } },
        { name: 'Nhánh Hướng Đèo Prenn Cổ Điển', coords: { lat: 11.9056, lng: 108.4412 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else { // national_highway
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Trạm Mai Chí Thọ (Quận 2)', coords: { lat: 10.7932, lng: 106.7454 } },
        { name: 'Ngã Ba Dầu Giây', coords: { lat: 10.9572, lng: 107.1952 } },
        { name: 'Trạm Định Quán', coords: { lat: 11.2062, lng: 107.3601 } },
        { name: 'Chân Đèo Bảo Lộc', coords: { lat: 11.4589, lng: 107.7289 } },
        { name: 'Văn Phòng Bảo Lộc', coords: { lat: 11.5434, lng: 107.8031 } },
        { name: 'Ngã Ba Di Linh', coords: { lat: 11.5833, lng: 108.0833 } },
        { name: 'Sân Bay Liên Khương (Đức Trọng)', coords: { lat: 11.7513, lng: 108.3711 } },
        { name: 'Trạm Thu Phí Định An', coords: { lat: 11.8415, lng: 108.4321 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    }
  } else if (tripId === 'sg-ct') {
    if (routeType === 'expressway') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Vào Cao Tốc Trung Lương (Bến Lức)', coords: { lat: 10.6405, lng: 106.4715 } },
        { name: 'Trạm Dừng Chân Cao Tốc Châu Thành', coords: { lat: 10.4215, lng: 106.3412 } },
        { name: 'Nút Giao Cao Tốc Mỹ Thuận', coords: { lat: 10.2741, lng: 105.9529 } },
        { name: 'Cao Tốc Mỹ Thuận - Cần Thơ', coords: { lat: 10.0987, lng: 105.8112 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else if (routeType === 'other') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Đường Tỉnh ĐT.824 (Đức Hòa)', coords: { lat: 10.8412, lng: 106.4523 } },
        { name: 'Quốc Lộ 62 (Thạnh Hóa)', coords: { lat: 10.5982, lng: 106.2111 } },
        { name: 'Đường Tránh Sông Tiền (Cao Lãnh)', coords: { lat: 10.4567, lng: 105.6789 } },
        { name: 'Bến Phà Cổ Đình An (Vĩnh Long)', coords: { lat: 10.1543, lng: 105.7891 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else { // national_highway
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Trạm Thu Phí Bến Lức', coords: { lat: 10.6405, lng: 106.4715 } },
        { name: 'Thành Phố Tân An (Long An)', coords: { lat: 10.5333, lng: 106.4000 } },
        { name: 'Thành Phố Mỹ Tho (Tiền Giang)', coords: { lat: 10.3603, lng: 106.3268 } },
        { name: 'Trạm dừng chân Cái Bè', coords: { lat: 10.2831, lng: 106.0142 } },
        { name: 'Cầu Mỹ Thuận (Vĩnh Long)', coords: { lat: 10.2741, lng: 105.9529 } },
        { name: 'Trạm Bình Minh', coords: { lat: 10.0768, lng: 105.8234 } },
        { name: 'Cầu Cần Thơ', coords: { lat: 10.0435, lng: 105.7951 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    }
  } else if (tripId === 'sg-nt') {
    if (routeType === 'expressway') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Nút Giao Cao tốc Long Thành - Dầu Giây', coords: { lat: 10.8256, lng: 106.9112 } },
        { name: 'Cao tốc Dầu Giây - Phan Thiết', coords: { lat: 10.9123, lng: 107.5112 } },
        { name: 'Cao tốc Phan Thiết - Vĩnh Hảo', coords: { lat: 11.0855, lng: 108.2111 } },
        { name: 'Cao tốc Vĩnh Hảo - Cam Lâm', coords: { lat: 11.6112, lng: 109.0112 } },
        { name: 'Nút Giao Cao tốc Cam Lâm - Nha Trang', coords: { lat: 12.1158, lng: 109.1123 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else if (routeType === 'other') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Quốc Lộ 51 (Bà Rịa - Vũng Tàu)', coords: { lat: 10.5123, lng: 107.1512 } },
        { name: 'Đường Ven Biển Mũi Né (Bình Thuận)', coords: { lat: 10.9412, lng: 108.2112 } },
        { name: 'Bực Dừa Đồi Cát Trắng (Hòa Thắng)', coords: { lat: 11.0612, lng: 108.3812 } },
        { name: 'Nhánh Cực Tây Vịnh Cam Ranh', coords: { lat: 11.9543, lng: 109.1054 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else { // national_highway
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Thành Phố Biên Hòa', coords: { lat: 10.9574, lng: 106.8427 } },
        { name: 'Thành Phố Phan Thiết (Bình Thuận)', coords: { lat: 10.9322, lng: 108.1011 } },
        { name: 'Phan Rang - Tháp Chàm (Ninh Thuận)', coords: { lat: 11.5684, lng: 108.9904 } },
        { name: 'Thành Phố Cam Ranh (Khánh Hòa)', coords: { lat: 11.9161, lng: 109.1412 } },
        { name: 'Bãi Dài Nha Trang', coords: { lat: 12.1158, lng: 109.2014 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    }
  } else {
    // Completely dynamic routing for newly added route!
    if (routeType === 'expressway') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Vào Tuyến Cao Tốc Liên Tỉnh', coords: { lat: startCoords.lat * 0.75 + endCoords.lat * 0.25, lng: startCoords.lng * 0.75 + endCoords.lng * 0.25 } },
        { name: 'Trạm Dừng Chân Cao Tốc Tiện Nghi', coords: { lat: startCoords.lat * 0.5 + endCoords.lat * 0.5, lng: startCoords.lng * 0.5 + endCoords.lng * 0.5 } },
        { name: 'Nút Giao Cao Tốc Rẽ Chuẩn Bị Vào Bến', coords: { lat: startCoords.lat * 0.25 + endCoords.lat * 0.75, lng: startCoords.lng * 0.25 + endCoords.lng * 0.75 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else if (routeType === 'other') {
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Đường Tỉnh Lộ Nhánh Tránh', coords: { lat: startCoords.lat * 0.75 + endCoords.lat * 0.25 + 0.05, lng: startCoords.lng * 0.75 + endCoords.lng * 0.25 - 0.06 } },
        { name: 'Trạm Nghỉ Điểm Du Lịch Địa Phương', coords: { lat: startCoords.lat * 0.5 + endCoords.lat * 0.5 - 0.04, lng: startCoords.lng * 0.5 + endCoords.lng * 0.5 + 0.07 } },
        { name: 'Điểm Kiểm Kiểm Soát Lộ Trình Phụ', coords: { lat: startCoords.lat * 0.25 + endCoords.lat * 0.75 + 0.02, lng: startCoords.lng * 0.25 + endCoords.lng * 0.75 - 0.03 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    } else { // national_highway
      coordsList = [
        { name: `${startName} (Xuất phát)`, coords: startCoords },
        { name: 'Trạm Thu Phí Quốc Lộ', coords: { lat: startCoords.lat * 0.8 + endCoords.lat * 0.2, lng: startCoords.lng * 0.8 + endCoords.lng * 0.2 } },
        { name: 'Trạm Dừng Kiểm Soát Hành Trình', coords: { lat: startCoords.lat * 0.6 + endCoords.lat * 0.4, lng: startCoords.lng * 0.6 + endCoords.lng * 0.4 } },
        { name: 'Trạm Dừng Chân Ăn Uống Quốc Lộ', coords: { lat: startCoords.lat * 0.4 + endCoords.lat * 0.6, lng: startCoords.lng * 0.4 + endCoords.lng * 0.6 } },
        { name: 'Văn Phòng Đại Diện Tuyến', coords: { lat: startCoords.lat * 0.2 + endCoords.lat * 0.8, lng: startCoords.lng * 0.2 + endCoords.lng * 0.8 } },
        { name: `${endName} (Đích đến)`, coords: endCoords }
      ];
    }
  }

  // Calculate cumulative distances
  let cumulativeDistance = 0;
  const resultWaypoints = [
    {
      name: coordsList[0].name,
      coords: coordsList[0].coords,
      distanceKm: 0
    }
  ];

  for (let i = 1; i < coordsList.length; i++) {
    const prev = coordsList[i - 1].coords;
    const curr = coordsList[i].coords;
    const segmentDist = getDistanceKm(prev.lat, prev.lng, curr.lat, curr.lng);
    cumulativeDistance += Math.round(segmentDist);
    resultWaypoints.push({
      name: coordsList[i].name,
      coords: curr,
      distanceKm: cumulativeDistance
    });
  }

  return resultWaypoints;
}

// Map of all active buses representing our fleet running different routes simultaneously
let buses: Record<string, any> = {
  'sg-dl': {
    tripId: 'sg-dl',
    layoutCapacity: 34,
    currentLocation: { lat: 10.7494, lng: 106.6171 }, // Start at HCMC BX Mien Tay
    speed: 60,
    isSimulating: true,
    isOffline: false,
    simulationProgress: 15, // Started partly on highway
    licensePlate: '51B-222.88',
    driverName: 'Nguyễn Văn Đạt',
    driverPhone: '0901235566',
    conductorName: 'Lê Hoàng Quân',
    conductorPhone: '0933556677',
    berths: [] as SavedBerth[],
    startName: 'BX Miền Tây (Sài Gòn)',
    endName: 'BX Liên Tỉnh Đà Lạt',
    routeType: 'national_highway',
    status: 'active',
    waypoints: VIETNAM_ROUTES[0].waypoints
  },
  'sg-ct': {
    tripId: 'sg-ct',
    layoutCapacity: 34,
    currentLocation: { lat: 10.6405, lng: 106.4715 }, // Start at Tan An Highway
    speed: 65,
    isSimulating: true,
    isOffline: false,
    simulationProgress: 42,
    licensePlate: '65B-111.22',
    driverName: 'Trần Văn Nam',
    driverPhone: '0918765432',
    conductorName: 'Lâm Văn Hải',
    conductorPhone: '0932112233',
    berths: [] as SavedBerth[],
    startName: 'BX Miền Tây (Sài Gòn)',
    endName: 'BX Trung Tâm Cần Thơ',
    routeType: 'national_highway',
    status: 'active',
    waypoints: VIETNAM_ROUTES[1].waypoints
  },
  'sg-nt': {
    tripId: 'sg-nt',
    layoutCapacity: 34,
    currentLocation: { lat: 10.9574, lng: 106.8427 }, // Start at Bien Hoa highway
    speed: 75,
    isSimulating: true,
    isOffline: false,
    simulationProgress: 28,
    licensePlate: '79B-888.99',
    driverName: 'Lê Quốc Bảo',
    driverPhone: '0905556677',
    conductorName: 'Nguyễn Văn An',
    conductorPhone: '0914445566',
    berths: [] as SavedBerth[],
    startName: 'BX Miền Đông (Sài Gòn)',
    endName: 'BX Phía Nam Nha Trang',
    routeType: 'national_highway',
    status: 'active',
    waypoints: VIETNAM_ROUTES[2].waypoints
  }
};

let busState = buses['sg-dl'];

// Seed initial bookings for standard demo (so the stats aren't boring 0% when first loading!)
function initializeBerthsForBus(bus: any, capacity: number) {
  const berths: SavedBerth[] = [];
  const floors: ('lower' | 'upper')[] = ['lower', 'upper'];

  floors.forEach(floor => {
    let count = 1;
    const limit = capacity === 22 ? 4 : capacity === 34 ? 6 : 7;
    const middleLimit = capacity === 22 ? 3 : capacity === 34 ? 5 : 6;

    const rowALetter = floor === 'lower' ? 'A' : 'D';
    const rowBLetter = floor === 'lower' ? 'B' : 'E';
    const rowCLetter = floor === 'lower' ? 'C' : 'F';

    // Row A (Left)
    for (let i = 1; i <= limit; i++) {
      berths.push({ id: `${floor}_${rowALetter}${count}`, label: `${rowALetter}${count}`, floor, row: rowALetter, number: count, status: 'empty' });
      count++;
    }
    // Row B (Middle)
    for (let i = 1; i <= middleLimit; i++) {
      berths.push({ id: `${floor}_${rowBLetter}${count}`, label: `${rowBLetter}${count}`, floor, row: rowBLetter, number: count, status: 'empty' });
      count++;
    }
    // Row C (Right)
    for (let i = 1; i <= limit; i++) {
      berths.push({ id: `${floor}_${rowCLetter}${count}`, label: `${rowCLetter}${count}`, floor, row: rowCLetter, number: count, status: 'empty' });
      count++;
    }
  });

  // Seed mock passengers representing real-time passengers
  if (bus.tripId === 'sg-dl' && berths.length > 5) {
    berths[0].status = 'booked';
    berths[0].passenger = {
      name: 'Lê Văn Tám',
      phone: '0909123456',
      destination: 'Ngã Ba Dầu Giây',
      coords: { lat: 10.9572, lng: 107.1952 }
    };

    berths[3].status = 'booked';
    berths[3].passenger = {
      name: 'Võ Thị Sáu',
      phone: '0981122334',
      destination: 'Văn Phòng Bảo Lộc',
      coords: { lat: 11.5434, lng: 107.8031 }
    };

    berths[5].status = 'approaching';
    berths[5].passenger = {
      name: 'Trần Đại Nghĩa',
      phone: '0978654321',
      destination: 'Sân Bay Khương Liên (Đức Trọng)',
      coords: { lat: 11.7513, lng: 108.3711 }
    };
  } else if (bus.tripId === 'sg-ct' && berths.length > 5) {
    berths[1].status = 'booked';
    berths[1].passenger = {
      name: 'Nguyễn Văn Sơn',
      phone: '0912112233',
      destination: 'Thành Phố Mỹ Tho (Tiền Giang)',
      coords: { lat: 10.3603, lng: 106.3268 }
    };

    berths[4].status = 'booked';
    berths[4].passenger = {
      name: 'Phạm Thị Lan',
      phone: '0976554433',
      destination: 'Cầu Mỹ Thuận (Vĩnh Long)',
      coords: { lat: 10.2741, lng: 105.9529 }
    };
  } else if (bus.tripId === 'sg-nt' && berths.length > 5) {
    berths[2].status = 'booked';
    berths[2].passenger = {
      name: 'Vũ Quốc Minh',
      phone: '0905667788',
      destination: 'Thành Phố Cam Ranh (Khánh Hòa)',
      coords: { lat: 11.9161, lng: 109.1412 }
    };
  }

  bus.berths = berths;
}

// Initialize berths for all routes
Object.keys(buses).forEach(tripId => {
  initializeBerthsForBus(buses[tripId], buses[tripId].layoutCapacity);
});

// Set active bus pointer initially to sg-dl
busState = buses['sg-dl'];

// Background server simulation interval for other (non-conductor-selected) buses
setInterval(() => {
  Object.values(buses).forEach(bus => {
    // If the bus is simulating and IS NOT the currently selected active bus being edited by conductor
    if (bus.status !== 'inactive' && bus.isSimulating && bus.tripId !== busState.tripId) {
      let progressStep = 0.4; // gradual speed
      bus.simulationProgress += progressStep;
      if (bus.simulationProgress >= 100) {
        bus.simulationProgress = 0;
      }
      const route = VIETNAM_ROUTES.find(r => r.id === bus.tripId);
      if (route) {
        const { coords } = getPositionOnRoute(route.waypoints, bus.simulationProgress);
        bus.currentLocation = coords;
      }
    }
  });
}, 2500);

// Customer loyalty profiles
let customHistoryDatabase = [
  {
    phone: '0901234567',
    name: 'Nguyễn Văn Hùng',
    tripsCount: 42,
    routes: ['Sài Gòn - Đà Lạt', 'Sài Gòn - Nha Trang'],
    points: 4200,
    tier: 'Kim Cương' as const,
    lastTripDate: '15/06/2026'
  },
  {
    phone: '0987654321',
    name: 'Phạm Thị Mai',
    tripsCount: 15,
    routes: ['Sài Gòn - Cần Thơ'],
    points: 1500,
    tier: 'Vàng' as const,
    lastTripDate: '20/06/2026'
  },
  {
    phone: '0912334455',
    name: 'Trần Minh Hải',
    tripsCount: 8,
    routes: ['Sài Gòn - Đà Lạt'],
    points: 800,
    tier: 'Bạc' as const,
    lastTripDate: '10/05/2026'
  },
  {
    phone: '0933445566',
    name: 'Lê Hoàng Phong',
    tripsCount: 22,
    routes: ['Sài Gòn - Nha Trang'],
    points: 2200,
    tier: 'Vàng' as const,
    lastTripDate: '18/06/2026'
  },
  {
    phone: '0977889900',
    name: 'Hoàng Ngọc Ánh',
    tripsCount: 3,
    routes: ['Sài Gòn - Cần Thơ'],
    points: 300,
    tier: 'Bạc' as const,
    lastTripDate: '01/06/2026'
  }
];

interface CustomerLog {
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

let customerLogsDatabase: CustomerLog[] = [
  {
    id: 'log_1',
    name: 'Nguyễn Văn Hùng',
    phone: '0901234567',
    cccd: '035090123456',
    travelDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'BX Miền Tây (Sài Gòn)',
    dropoffPoint: 'BX Liên Tỉnh Đà Lạt',
    berthId: 'lower_A1',
    tripId: 'sg-dl',
    createdAt: new Date().toISOString()
  },
  {
    id: 'log_2',
    name: 'Phạm Thị Mai',
    phone: '0987654321',
    cccd: '035090123457',
    travelDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'BX Miền Tây (Sài Gòn)',
    dropoffPoint: 'Văn Phòng Bảo Lộc',
    berthId: 'lower_A4',
    tripId: 'sg-dl',
    createdAt: new Date().toISOString()
  }
];

// --- API ENDPOINTS ---

// GET: Current unified bus status
app.get('/api/state', (req, res) => {
  const reqTripId = req.query.tripId as string;
  if (reqTripId && buses[reqTripId]) {
    busState = buses[reqTripId];
  }
  res.json({
    ...busState,
    buses: Object.values(buses)
  });
});

// POST: Update layout capacity
app.post('/api/layout', (req, res) => {
  const { capacity, tripId } = req.body;
  const targetTripId = tripId || busState.tripId;
  const activeBus = buses[targetTripId] || busState;

  if ([22, 34, 41].includes(Number(capacity))) {
    activeBus.layoutCapacity = Number(capacity);
    initializeBerthsForBus(activeBus, Number(capacity));
    res.json({ 
      success: true, 
      message: `Changed bus layout to ${capacity} seats successfully`, 
      state: activeBus,
      buses: Object.values(buses)
    });
  } else {
    res.status(400).json({ success: false, error: 'Invalid capacity size' });
  }
});

// POST: Booking reservation updates or changes (empty, booked, approaching, dropped)
app.post('/api/bookings', (req, res) => {
  const { berthId, status, passenger } = req.body;
  const index = busState.berths.findIndex(b => b.id === berthId);
  
  if (index !== -1) {
    busState.berths[index].status = status;
    if (status === 'empty') {
      delete busState.berths[index].passenger;
    } else if (passenger) {
      busState.berths[index].passenger = passenger;

      // Add to CRM database logs for customer care
      const logRecord: CustomerLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: passenger.name,
        phone: passenger.phone || '',
        cccd: passenger.cccd || '',
        travelDate: passenger.travelDate || '',
        pickupPoint: passenger.pickupPoint || '',
        dropoffPoint: passenger.destination || '',
        berthId: berthId,
        tripId: busState.tripId,
        createdAt: new Date().toISOString()
      };
      
      customerLogsDatabase.unshift(logRecord);

      // Async save to Supabase if configured
      if (supabase) {
        (async () => {
          try {
            const { error } = await supabase.from('passenger_bookings').insert([{
              name: passenger.name,
              phone: passenger.phone || '',
              cccd: passenger.cccd || '',
              travel_date: passenger.travelDate || '',
              pickup_point: passenger.pickupPoint || '',
              dropoff_point: passenger.destination || '',
              berth_id: berthId,
              trip_id: busState.tripId
            }]);
            if (error) {
              console.error('Supabase write error on booking:', error.message);
            } else {
              console.log('Successfully saved customer booking in Supabase!');
            }
          } catch (e: any) {
            console.error('Supabase async exception:', e.message);
          }
        })();
      }

      // Seed / update CRM loyalty profile
      if (passenger.phone) {
        const custIdx = customHistoryDatabase.findIndex(c => c.phone === passenger.phone);
        if (custIdx !== -1) {
          customHistoryDatabase[custIdx].tripsCount += 1;
          customHistoryDatabase[custIdx].points += 100;
          customHistoryDatabase[custIdx].lastTripDate = new Date().toLocaleDateString('vi-VN');
          if (customHistoryDatabase[custIdx].tripsCount > 30) {
            customHistoryDatabase[custIdx].tier = 'Kim Cương';
          } else if (customHistoryDatabase[custIdx].tripsCount > 10) {
            customHistoryDatabase[custIdx].tier = 'Vàng';
          }
        } else {
          // New loyal user
          customHistoryDatabase.push({
            phone: passenger.phone,
            name: passenger.name,
            tripsCount: 1,
            routes: [busState.tripId === 'sg-dl' ? 'Sài Gòn - Đà Lạt' : 'Sài Gòn - Nha Trang'],
            points: 100,
            tier: 'Bạc',
            lastTripDate: new Date().toLocaleDateString('vi-VN')
          });
        }
      }
    }
    res.json({ success: true, state: busState });
  } else {
    res.status(404).json({ success: false, error: 'Berth not found' });
  }
});

// POST: Batch synchronization of logged offline operations
app.post('/api/sync', (req, res) => {
  const { transactions } = req.body; // Array of transactions
  
  if (Array.isArray(transactions)) {
    console.log(`Received offline synchronization batch: ${transactions.length} records`);
    
    transactions.forEach(tx => {
      const { type, payload } = tx;
      
      if (type === 'book') {
        const { berthId, passenger } = payload;
        const idx = busState.berths.findIndex(b => b.id === berthId);
        if (idx !== -1) {
          busState.berths[idx].status = 'booked';
          busState.berths[idx].passenger = passenger;

          // Add to CRM database logs for customer care
          const logRecord: CustomerLog = {
            id: `log_${Date.now()}_sync_${Math.random().toString(36).substring(2, 6)}`,
            name: passenger.name,
            phone: passenger.phone || '',
            cccd: passenger.cccd || '',
            travelDate: passenger.travelDate || '',
            pickupPoint: passenger.pickupPoint || '',
            dropoffPoint: passenger.destination || '',
            berthId: berthId,
            tripId: busState.tripId,
            createdAt: new Date().toISOString()
          };
          customerLogsDatabase.unshift(logRecord);

          // Save to Supabase if configured
          if (supabase) {
            (async () => {
              try {
                const { error } = await supabase.from('passenger_bookings').insert([{
                  name: passenger.name,
                  phone: passenger.phone || '',
                  cccd: passenger.cccd || '',
                  travel_date: passenger.travelDate || '',
                  pickup_point: passenger.pickupPoint || '',
                  dropoff_point: passenger.destination || '',
                  berth_id: berthId,
                  trip_id: busState.tripId
                }]);
                if (error) console.error('Supabase sync insert failed:', error.message);
                else console.log('Successfully synchronized offline booking into Supabase!');
              } catch (e: any) {
                console.error('Supabase sync async exception:', e.message);
              }
            })();
          }
          
          // Seed loyal account on sync
          if (passenger.phone) {
            const custIdx = customHistoryDatabase.findIndex(c => c.phone === passenger.phone);
            if (custIdx !== -1) {
              customHistoryDatabase[custIdx].tripsCount += 1;
              customHistoryDatabase[custIdx].points += 100;
            } else {
              customHistoryDatabase.push({
                phone: passenger.phone,
                name: passenger.name,
                tripsCount: 1,
                routes: ['Sài Gòn - Đà Lạt'],
                points: 100,
                tier: 'Bạc',
                lastTripDate: new Date().toLocaleDateString('vi-VN')
              });
            }
          }
        }
      } else if (type === 'cancel') {
        const { berthId } = payload;
        const idx = busState.berths.findIndex(b => b.id === berthId);
        if (idx !== -1) {
          busState.berths[idx].status = 'empty';
          delete busState.berths[idx].passenger;
        }
      } else if (type === 'change_status') {
        const { berthId, status } = payload;
        const idx = busState.berths.findIndex(b => b.id === berthId);
        if (idx !== -1) {
          busState.berths[idx].status = status;
        }
      }
    });

    res.json({ success: true, message: `Successfully synchronized ${transactions.length} offline operations!`, state: busState, customers: customHistoryDatabase });
  } else {
    res.status(400).json({ success: false, error: 'Invalid sync transaction stream representation' });
  }
});

// GET: Supabase configuration status helper
app.get('/api/supabase-config', (req, res) => {
  res.json({
    isConfigured: !!supabase,
    supabaseUrl: SUPABASE_URL || 'Chưa cấu hình',
  });
});

// GET: Direct access to CRM bookings logs database (Supabase priority, falls back to memory db)
app.get('/api/customer-logs', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('passenger_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        // Map Supabase column names to frontend camelCase property names
        const formatted = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          cccd: row.cccd,
          travelDate: row.travel_date,
          pickupPoint: row.pickup_point,
          dropoffPoint: row.dropoff_point,
          berthId: row.berth_id,
          tripId: row.trip_id,
          createdAt: row.created_at
        }));
        return res.json(formatted);
      } else {
        if (error) console.warn('Supabase select logs error:', error.message);
      }
    } catch (e: any) {
      console.warn('Supabase service unavailable, falling back to local logs:', e.message);
    }
  }
  // Fallback to local logs
  res.json(customerLogsDatabase);
});

// POST: Save driver name, conductor name, license plate, etc.
app.post('/api/bus-info', (req, res) => {
  const { 
    licensePlate, 
    driverName, 
    driverPhone, 
    conductorName, 
    conductorPhone, 
    speed, 
    isOffline, 
    tripId,
    startName,
    endName,
    routeType,
    startCoords,
    endCoords,
    status
  } = req.body;
  const targetTripId = tripId || busState.tripId;
  let activeBus = buses[targetTripId];

  if (!activeBus) {
    // Dynamic creation of a brand new route!
    activeBus = {
      tripId: targetTripId,
      layoutCapacity: 34,
      currentLocation: startCoords || { lat: 10.7494, lng: 106.6171 },
      speed: status === 'inactive' ? 0 : 60,
      isSimulating: status !== 'inactive',
      isOffline: status === 'inactive',
      simulationProgress: 0,
      licensePlate: licensePlate || '51B-000.00',
      driverName: driverName || 'Tài xế mặc định',
      driverPhone: driverPhone || '0901230000',
      conductorName: conductorName || 'Tiếp viên mặc định',
      conductorPhone: conductorPhone || '0933550000',
      berths: [],
      startName: startName || 'BX Miền Tây (Sài Gòn)',
      endName: endName || 'BX Liên Tỉnh Đà Lạt',
      routeType: routeType || 'national_highway',
      status: status || 'active',
      startCoords: startCoords,
      endCoords: endCoords,
      waypoints: []
    };

    // Build the dynamic intermediate stations
    activeBus.waypoints = generateWaypointsByRoute(targetTripId, activeBus.startName, activeBus.endName, activeBus.routeType, startCoords, endCoords);
    if (activeBus.waypoints && activeBus.waypoints.length > 0) {
      activeBus.currentLocation = activeBus.waypoints[0].coords;
    }

    // Initialize layout berths
    initializeBerthsForBus(activeBus, activeBus.layoutCapacity);

    // Save into active pool
    buses[targetTripId] = activeBus;
  }

  if (licensePlate !== undefined) activeBus.licensePlate = licensePlate;
  if (driverName !== undefined) activeBus.driverName = driverName;
  if (driverPhone !== undefined) activeBus.driverPhone = driverPhone;
  if (conductorName !== undefined) activeBus.conductorName = conductorName;
  if (conductorPhone !== undefined) activeBus.conductorPhone = conductorPhone;
  if (speed !== undefined) activeBus.speed = Number(speed);
  if (isOffline !== undefined) activeBus.isOffline = !!isOffline;

  // Cấu hình tuyến xe: Điểm xuất phát, Điểm đến, Loại tuyến đường
  if (startName !== undefined) activeBus.startName = startName;
  if (endName !== undefined) activeBus.endName = endName;
  if (routeType !== undefined) activeBus.routeType = routeType;
  if (startCoords !== undefined) activeBus.startCoords = startCoords;
  if (endCoords !== undefined) activeBus.endCoords = endCoords;
  if (status !== undefined) {
    activeBus.status = status;
    if (status === 'inactive') {
      activeBus.isSimulating = false;
      activeBus.isOffline = true;
      activeBus.speed = 0;
    } else {
      activeBus.isSimulating = true;
      activeBus.isOffline = false;
    }
  }

  if (startName !== undefined || endName !== undefined || routeType !== undefined || startCoords !== undefined || endCoords !== undefined) {
    const fStart = activeBus.startName || (targetTripId === 'sg-nt' ? 'BX Miền Đông (Sài Gòn)' : 'BX Miền Tây (Sài Gòn)');
    const fEnd = activeBus.endName || (targetTripId === 'sg-dl' ? 'BX Liên Tỉnh Đà Lạt' : targetTripId === 'sg-ct' ? 'BX Trung Tâm Cần Thơ' : 'BX Phía Nam Nha Trang');
    const fRouteType = activeBus.routeType || 'national_highway';
    activeBus.waypoints = generateWaypointsByRoute(targetTripId, fStart, fEnd, fRouteType, activeBus.startCoords, activeBus.endCoords);
    activeBus.simulationProgress = 0; // Reset progress when route config changes
    if (activeBus.waypoints && activeBus.waypoints.length > 0) {
      activeBus.currentLocation = activeBus.waypoints[0].coords; // Reset bus location to new starting coordinates
    }
  }

  res.json({ success: true, state: activeBus, buses: Object.values(buses) });
});

// POST: Delete a route from fleet
app.post('/api/bus-delete', (req, res) => {
  const { tripId } = req.body;
  if (!tripId) {
    return res.status(400).json({ success: false, error: 'tripId is required' });
  }
  
  if (Object.keys(buses).length <= 1) {
    return res.status(400).json({ success: false, error: 'Không thể xóa tuyến xe cuối cùng của nhà xe!' });
  }

  if (buses[tripId]) {
    delete buses[tripId];
    // If the currently pointed busState is the deleted one, set it to the first available bus
    if (busState.tripId === tripId) {
      const firstId = Object.keys(buses)[0];
      busState = buses[firstId];
    }
    return res.json({ success: true, message: `Thành công xóa tuyến xe ${tripId}`, state: busState, buses: Object.values(buses) });
  } else {
    return res.status(404).json({ success: false, error: 'Không tìm thấy mã tuyến này' });
  }
});

// POST: Update live simulation location or actual tracking positions
app.post('/api/location', (req, res) => {
  const { lat, lng, speed, isSimulating, progress, tripId } = req.body;
  const targetTripId = tripId || busState.tripId;
  const activeBus = buses[targetTripId] || busState;
  
  if (lat && lng) {
    activeBus.currentLocation = { lat, lng };
    if (speed !== undefined) activeBus.speed = speed;
    if (isSimulating !== undefined) activeBus.isSimulating = isSimulating;
    if (progress !== undefined) activeBus.simulationProgress = progress;
    
    res.json({ success: true, state: activeBus, buses: Object.values(buses) });
  } else {
    res.status(400).json({ success: false, error: 'Missing lat or lng coords' });
  }
});

// GET: Loyal customers database
app.get('/api/customers', (req, res) => {
  res.json(customHistoryDatabase);
});

// --- VITE DEV SERVICE VS PRODUCTION HANDLER ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server listening on port ${PORT}`);
  });
}

startServer();
