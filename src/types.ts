export type FloorType = 'lower' | 'upper';
export type RowType = 'A' | 'B' | 'C' | 'D' | 'E'; // E is for back row
export type BerthStatus = 'empty' | 'booked' | 'approaching' | 'dropped';

export interface Coords {
  lat: number;
  lng: number;
}

export interface Waypoint {
  name: string;
  coords: Coords;
  distanceKm: number; // cumulative distance from start
}

export interface Passenger {
  name: string;
  phone?: string;
  destination: string; // This is the dropoffPoint
  coords: Coords;
  cccd?: string;
  travelDate?: string;
  pickupPoint?: string;
}

export interface Berth {
  id: string; // e.g., "A1_DUE" (lower) or "B3_TRE" (upper)
  label: string; // e.g., "A1", "B3"
  floor: FloorType;
  row: RowType;
  number: number;
  status: BerthStatus;
  passenger?: Passenger;
}

export interface TripConfig {
  id: string;
  name: string;
  route: string; // e.g. "Sài Gòn - Đà Lạt"
  startName: string;
  endName: string;
  startCoords: Coords;
  endCoords: Coords;
  waypoints: Waypoint[];
}

export interface SyncTransaction {
  id: string;
  timestamp: number;
  type: 'book' | 'cancel' | 'change_status' | 'update_location' | 'sync_all';
  payload: any;
  status: 'pending' | 'success' | 'failed';
}

export interface CustomerHistory {
  phone: string;
  name: string;
  tripsCount: number;
  routes: string[];
  points: number;
  tier: 'Bạc' | 'Vàng' | 'Kim Cương';
  lastTripDate: string;
}

export interface BusState {
  tripId: string;
  layoutCapacity: number; // 22, 34, 41
  currentLocation: Coords;
  berths: Berth[];
  isOffline: boolean;
  isSimulating: boolean;
  simulationProgress: number; // 0 to 100
  speed: number; // km/h
  licensePlate?: string;
  driverName?: string;
  driverPhone?: string;
  conductorName?: string;
  conductorPhone?: string;
}
