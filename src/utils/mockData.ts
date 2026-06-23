import { TripConfig, CustomerHistory, Berth, FloorType, RowType, Waypoint } from '../types';

// Famous routes in Vietnam with GPS coordinates along the highway
export const VIETNAM_ROUTES: TripConfig[] = [
  {
    id: 'sg-dl',
    name: 'Sài Gòn - Đà Lạt (Nhà Xe Phương Trang)',
    route: 'Sài Gòn - Đà Lạt',
    startName: 'BX Miền Tây (Sài Gòn)',
    endName: 'BX Liên Tỉnh Đà Lạt',
    startCoords: { lat: 10.7494, lng: 106.6171 },
    endCoords: { lat: 11.9333, lng: 108.4503 },
    waypoints: [
      { name: 'BX Miền Tây (Xuất phát)', coords: { lat: 10.7494, lng: 106.6171 }, distanceKm: 0 },
      { name: 'Trạm Mai Chí Thọ (Quận 2)', coords: { lat: 10.7932, lng: 106.7454 }, distanceKm: 15 },
      { name: 'Ngã Ba Dầu Giây', coords: { lat: 10.9572, lng: 107.1952 }, distanceKm: 65 },
      { name: 'Trạm Định Quán', coords: { lat: 11.2062, lng: 107.3601 }, distanceKm: 100 },
      { name: 'Chân Đèo Bảo Lộc', coords: { lat: 11.4589, lng: 107.7289 }, distanceKm: 145 },
      { name: 'Văn Phòng Bảo Lộc', coords: { lat: 11.5434, lng: 107.8031 }, distanceKm: 160 },
      { name: 'Ngã Ba Di Linh', coords: { lat: 11.5833, lng: 108.0833 }, distanceKm: 210 },
      { name: 'Sân Bay Khương Liên (Đức Trọng)', coords: { lat: 11.7513, lng: 108.3711 }, distanceKm: 260 },
      { name: 'Trạm Thu Phí Định An', coords: { lat: 11.8415, lng: 108.4321 }, distanceKm: 285 },
      { name: 'BX Liên Tỉnh Đà Lạt (Đích)', coords: { lat: 11.9333, lng: 108.4503 }, distanceKm: 300 }
    ]
  },
  {
    id: 'sg-ct',
    name: 'Sài Gòn - Cần Thơ (Phục vụ miền Tây)',
    route: 'Sài Gòn - Cần Thơ',
    startName: 'BX Miền Tây (Sài Gòn)',
    endName: 'BX Trung Tâm Cần Thơ',
    startCoords: { lat: 10.7494, lng: 106.6171 },
    endCoords: { lat: 10.0152, lng: 105.7487 },
    waypoints: [
      { name: 'BX Miền Tây (Xuất phát)', coords: { lat: 10.7494, lng: 106.6171 }, distanceKm: 0 },
      { name: 'Trạm Thu Phí Bến Lức', coords: { lat: 10.6405, lng: 106.4715 }, distanceKm: 25 },
      { name: 'Thành Phố Tân An (Long An)', coords: { lat: 10.5333, lng: 106.4000 }, distanceKm: 45 },
      { name: 'Thành Phố Mỹ Tho (Tiền Giang)', coords: { lat: 10.3603, lng: 106.3268 }, distanceKm: 70 },
      { name: 'Trạm dừng chân Cái Bè', coords: { lat: 10.2831, lng: 106.0142 }, distanceKm: 110 },
      { name: 'Cầu Mỹ Thuận (Vĩnh Long)', coords: { lat: 10.2741, lng: 105.9529 }, distanceKm: 120 },
      { name: 'Trạm Bình Minh', coords: { lat: 10.0768, lng: 105.8234 }, distanceKm: 155 },
      { name: 'Cầu Cần Thơ', coords: { lat: 10.0435, lng: 105.7951 }, distanceKm: 165 },
      { name: 'BX Trung Tâm Cần Thơ (Đích)', coords: { lat: 10.0152, lng: 105.7487 }, distanceKm: 170 }
    ]
  },
  {
    id: 'sg-nt',
    name: 'Sài Gòn - Nha Trang (Dọc Biển Việt Nam)',
    route: 'Sài Gòn - Nha Trang',
    startName: 'BX Miền Đông (Sài Gòn)',
    endName: 'BX Phía Nam Nha Trang',
    startCoords: { lat: 10.8142, lng: 106.7126 },
    endCoords: { lat: 12.2224, lng: 109.1672 },
    waypoints: [
      { name: 'BX Miền Đông (Xuất phát)', coords: { lat: 10.8142, lng: 106.7126 }, distanceKm: 0 },
      { name: 'Thành Phố Biên Hòa', coords: { lat: 10.9574, lng: 106.8427 }, distanceKm: 30 },
      { name: 'Xã Phan Thiết (Bình Thuận)', coords: { lat: 10.9322, lng: 108.1011 }, distanceKm: 195 },
      { name: 'Phan Rang - Tháp Chàm (Ninh Thuận)', coords: { lat: 11.5684, lng: 108.9904 }, distanceKm: 345 },
      { name: 'Thành Phố Cam Ranh (Khánh Hòa)', coords: { lat: 11.9161, lng: 109.1412 }, distanceKm: 400 },
      { name: 'Bãi Dài Nha Trang', coords: { lat: 12.1158, lng: 109.2014 }, distanceKm: 425 },
      { name: 'BX Phía Nam Nha Trang (Đích)', coords: { lat: 12.2224, lng: 109.1672 }, distanceKm: 440 }
    ]
  }
];

// Seed Customer Data
export const MOCK_CUSTOMERS: CustomerHistory[] = [
  {
    phone: '0901234567',
    name: 'Nguyễn Văn Hùng',
    tripsCount: 42,
    routes: ['Sài Gòn - Đà Lạt', 'Sài Gòn - Nha Trang'],
    points: 4200,
    tier: 'Kim Cương',
    lastTripDate: '15/06/2026'
  },
  {
    phone: '0987654321',
    name: 'Phạm Thị Mai',
    tripsCount: 15,
    routes: ['Sài Gòn - Cần Thơ'],
    points: 1500,
    tier: 'Vàng',
    lastTripDate: '20/06/2026'
  },
  {
    phone: '0912334455',
    name: 'Trần Minh Hải',
    tripsCount: 8,
    routes: ['Sài Gòn - Đà Lạt'],
    points: 800,
    tier: 'Bạc',
    lastTripDate: '10/05/2026'
  },
  {
    phone: '0933445566',
    name: 'Lê Hoàng Phong',
    tripsCount: 22,
    routes: ['Sài Gòn - Nha Trang'],
    points: 2200,
    tier: 'Vàng',
    lastTripDate: '18/06/2026'
  },
  {
    phone: '0977889900',
    name: 'Hoàng Ngọc Ánh',
    tripsCount: 3,
    routes: ['Sài Gòn - Cần Thơ'],
    points: 300,
    tier: 'Bạc',
    lastTripDate: '01/06/2026'
  }
];

// Helper to interpolate between waypoints to simulate clean movement on GPS
export function getPositionOnRoute(waypoints: Waypoint[], progressPercent: number): { coords: { lat: number; lng: number }; currentTarget: Waypoint | null } {
  if (waypoints.length === 0) return { coords: { lat: 0, lng: 0 }, currentTarget: null };
  if (waypoints.length === 1) return { coords: waypoints[0].coords, currentTarget: waypoints[0] };

  const totalDistance = waypoints[waypoints.length - 1].distanceKm;
  const targetDistance = (progressPercent / 100) * totalDistance;

  // Find the segment we are in
  let segmentIndex = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    if (targetDistance >= waypoints[i].distanceKm && targetDistance <= waypoints[i + 1].distanceKm) {
      segmentIndex = i;
      break;
    }
  }

  const p1 = waypoints[segmentIndex];
  const p2 = waypoints[segmentIndex + 1];

  let segmentProgress = 0;
  const segmentLen = p2.distanceKm - p1.distanceKm;
  if (segmentLen > 0) {
    segmentProgress = (targetDistance - p1.distanceKm) / segmentLen;
  }

  const lat = p1.coords.lat + (p2.coords.lat - p1.coords.lat) * segmentProgress;
  const lng = p1.coords.lng + (p2.coords.lng - p1.coords.lng) * segmentProgress;

  return {
    coords: { lat, lng },
    currentTarget: p2
  };
}

// Calculate Haversine distance in km between two GPS coordinates
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Generates an initial clean setup of seats based on capacity config (22, 34, 41)
// Traditional seat configurations on sleep coaches:
// 22 beds: Luxury limousine vip. 2 floors, 3 rows (A,B,C), 11 upper and 11 lower.
// 34 beds: Limousine coach. 2 floors, 3 rows, 17 upper and 17 lower.
// 41 beds: Standard sleeper. 2 floors, 3 rows. Usually 20 lower, 21 upper.
export function generateInitialBerths(capacity: number): Berth[] {
  const list: Berth[] = [];
  const floors: FloorType[] = ['lower', 'upper'];

  if (capacity === 22) {
    // 11 Lower, 11 Upper.
    // 3 rows: A, B, C.
    // Floor lower: Row A (1, 2, 3, 4), Row B (1, 2, 3), Row C (1, 2, 3, 4) -> 11
    // Floor upper: Row A (1, 2, 3, 4), Row B (1, 2, 3), Row C (1, 2, 3, 4) -> 11
    floors.forEach(floor => {
      let count = 1;

      // Row A (Left)
      for (let i = 1; i <= 4; i++) {
        list.push({
          id: `${floor}_A${count}`,
          label: `A${count}`,
          floor,
          row: 'A',
          number: count,
          status: 'empty'
        });
        count++;
      }

      // Row B (Middle)
      for (let i = 1; i <= 3; i++) {
        list.push({
          id: `${floor}_B${count}`,
          label: `B${count}`,
          floor,
          row: 'B',
          number: count,
          status: 'empty'
        });
        count++;
      }

      // Row C (Right)
      for (let i = 1; i <= 4; i++) {
        list.push({
          id: `${floor}_C${count}`,
          label: `C${count}`,
          floor,
          row: 'C',
          number: count,
          status: 'empty'
        });
        count++;
      }
    });

  } else if (capacity === 34) {
    // 17 berths per deck.
    // Row A: (1-6) = 6
    // Row B: (1-5) = 5
    // Row C: (1-6) = 6
    floors.forEach(floor => {
      let count = 1;

      // Row A (Left)
      for (let i = 1; i <= 6; i++) {
        list.push({
          id: `${floor}_A${count}`,
          label: `A${count}`,
          floor,
          row: 'A',
          number: count,
          status: 'empty'
        });
        count++;
      }

      // Row B (Middle)
      for (let i = 1; i <= 5; i++) {
        list.push({
          id: `${floor}_B${count}`,
          label: `B${count}`,
          floor,
          row: 'B',
          number: count,
          status: 'empty'
        });
        count++;
      }

      // Row C (Right)
      for (let i = 1; i <= 6; i++) {
        list.push({
          id: `${floor}_C${count}`,
          label: `C${count}`,
          floor,
          row: 'C',
          number: count,
          status: 'empty'
        });
        count++;
      }
    });

  } else {
    // 41 Beds standard
    // Floor Lower: 20 beds. Row A: 1-7 (7), Row B: 1-6 (6), Row C: 1-7 (7) = 20
    // Floor Upper: 21 beds. Close layout. Row A: 1-7 (7), Row B: 1-7 (7), Row C: 1-7 (7) = 21
    floors.forEach(floor => {
      let count = 1;
      const isUpper = floor === 'upper';

      // Row A (7 beds)
      for (let i = 1; i <= 7; i++) {
        list.push({
          id: `${floor}_A${count}`,
          label: `A${count}`,
          floor,
          row: 'A',
          number: count,
          status: 'empty'
        });
        count++;
      }

      // Row B (6 beds for lower, 7 beds for upper)
      const bCountLimit = isUpper ? 7 : 6;
      for (let i = 1; i <= bCountLimit; i++) {
        list.push({
          id: `${floor}_B${count}`,
          label: `B${count}`,
          floor,
          row: 'B',
          number: count,
          status: 'empty'
        });
        count++;
      }

      // Row C (7 beds)
      for (let i = 1; i <= 7; i++) {
        list.push({
          id: `${floor}_C${count}`,
          label: `C${count}`,
          floor,
          row: 'C',
          number: count,
          status: 'empty'
        });
        count++;
      }
    });
  }

  return list;
}
