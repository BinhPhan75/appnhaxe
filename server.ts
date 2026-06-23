import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory state for the bus and bookings so that the dispatcher and assistant can share data in real-time
interface SavedPassenger {
  name: string;
  phone?: string;
  destination: string;
  coords: { lat: number; lng: number };
}

interface SavedBerth {
  id: string;
  label: string;
  floor: 'lower' | 'upper';
  row: 'A' | 'B' | 'C' | 'D' | 'E';
  number: number;
  status: 'empty' | 'booked' | 'approaching' | 'dropped';
  passenger?: SavedPassenger;
}

let busState = {
  tripId: 'sg-dl',
  layoutCapacity: 34,
  currentLocation: { lat: 10.7494, lng: 106.6171 }, // Start at HCMC BX Mien Tay
  speed: 60,
  isSimulating: true,
  simulationProgress: 0,
  berths: [] as SavedBerth[]
};

// Seed initial bookings for standard demo (so the stats aren't boring 0% when first loading!)
function initializeBerths(capacity: number) {
  const berths: SavedBerth[] = [];
  const floors: ('lower' | 'upper')[] = ['lower', 'upper'];

  floors.forEach(floor => {
    let count = 1;
    const limit = capacity === 22 ? 4 : capacity === 34 ? 6 : 7;
    const middleLimit = capacity === 22 ? 3 : capacity === 34 ? 5 : 6;

    // Row A (Left)
    for (let i = 1; i <= limit; i++) {
      berths.push({ id: `${floor}_A${count}`, label: `A${count}`, floor, row: 'A', number: count, status: 'empty' });
      count++;
    }
    // Row B (Middle)
    for (let i = 1; i <= middleLimit; i++) {
      berths.push({ id: `${floor}_B${count}`, label: `B${count}`, floor, row: 'B', number: count, status: 'empty' });
      count++;
    }
    // Row C (Right)
    for (let i = 1; i <= limit; i++) {
      berths.push({ id: `${floor}_C${count}`, label: `C${count}`, floor, row: 'C', number: count, status: 'empty' });
      count++;
    }
  });

  // Seed 3 mock passengers representing real-time passengers
  if (berths.length > 5) {
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
  }

  busState.berths = berths;
}

// Initialize berths initially (capacity 34)
initializeBerths(34);

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

// --- API ENDPOINTS ---

// GET: Current unified bus status
app.get('/api/state', (req, res) => {
  res.json(busState);
});

// POST: Update layout capacity
app.post('/api/layout', (req, res) => {
  const { capacity } = req.body;
  if ([22, 34, 41].includes(Number(capacity))) {
    busState.layoutCapacity = Number(capacity);
    initializeBerths(Number(capacity));
    res.json({ success: true, message: `Changed bus layout to ${capacity} seats successfully`, state: busState });
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
            routes: ['Sài Gòn - Đà Lạt'],
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

// POST: Update live simulation location or actual tracking positions
app.post('/api/location', (req, res) => {
  const { lat, lng, speed, isSimulating, progress } = req.body;
  
  if (lat && lng) {
    busState.currentLocation = { lat, lng };
    if (speed !== undefined) busState.speed = speed;
    if (isSimulating !== undefined) busState.isSimulating = isSimulating;
    if (progress !== undefined) busState.simulationProgress = progress;
    
    res.json({ success: true });
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
