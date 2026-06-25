# 🚌 Quản Lý Nhà Xe - Sơ Đồ Ghế & Định Vị Realtime

Hệ thống quản lý đặt chỗ, sơ đồ giường nằm trực quan, định vị GPS thời gian thực (Realtime GPS Tracking), cảnh báo trả khách trong bán kính 5km (Geofencing) và đồng bộ dữ liệu ngoại tuyến (Offline mode). Dự án được thiết kế chuyên nghiệp, tối ưu hóa toàn diện cho việc triển khai trên các dịch vụ đám mây và lưu trữ mã nguồn lên GitHub.

---

## 🌟 Tính Năng Nổi Bật

### 1. Định Vị GPS Realtime & Bản Đồ Lộ Trình (Conductor & Passenger Map)
*   Tích hợp bản đồ trực quan (Leaflet) hiển thị chính xác vị trí của xe khách.
*   Chế độ giả lập (Simulation Mode) tự động di chuyển xe dọc theo các tuyến đường cao tốc và quốc lộ Việt Nam (Sài Gòn - Đà Lạt, Sài Gòn - Nha Trang...).
*   Tính toán khoảng cách còn lại (km) và tốc độ di chuyển hiện tại thời gian thực.

### 2. Sơ Đồ Giường Nằm & Ghế Ngồi Đa Dạng (Seat Layout Management)
*   Sơ đồ giường nằm 2 tầng trực quan (Tầng dưới / Tầng trên).
*   Hỗ trợ nhiều sơ đồ xe khác nhau:
    *   **VIP 22 Cabin** (Giường nằm cabin riêng tư VIP)
    *   **VIP 34 Cabin** (Xe giường nằm thế hệ mới)
    *   **Ngồi 45 Chỗ** (Xe ghế ngồi cỡ lớn Thaco)
    *   **Limousine 9 Ghế** (Xe thương gia cao cấp)
    *   **Ngồi 16 Chỗ** (Xe Transit trung chuyển)
*   Tìm kiếm hành khách nhanh, đặt/hủy vé trực quan chỉ với vài cú nhấp chuột.

### 3. Cảnh Báo Bán Kính An Toàn & Âm Thanh (Geofencing Audio Alerts)
*   Tự động phát tín hiệu âm thanh cảnh báo (`beep` / `chime`) khi xe di chuyển vào bán kính an toàn **5km** so với điểm trả của hành khách.
*   Giúp tài xế và phụ xe chủ động nhắc nhở khách xuống đúng trạm, tránh ngủ quên hoặc bỏ sót điểm đỗ.

### 4. Đồng Bộ Ngoại Tuyến Đột Phá (Offline-First Mode)
*   Tự động phát hiện trạng thái kết nối Internet (Online/Offline).
*   Lưu trữ đệm toàn bộ thao tác đặt chỗ, cập nhật vị trí hoặc đăng ký đội xe vào `localStorage` khi mất mạng.
*   Hỗ trợ đồng bộ hóa tự động (Sync) toàn bộ dữ liệu lên máy chủ ngay khi thiết bị kết nối mạng trở lại.

### 5. Lưu Trữ Bền Vững Với Supabase Cloud (Supabase Backend Integration)
*   Hỗ trợ đồng bộ hóa lên cơ sở dữ liệu Supabase.
*   **Fallback thông minh**: Nếu chưa cấu hình Supabase, hệ thống vẫn hoạt động hoàn hảo bằng cơ chế in-memory RAM ở Server và LocalStorage ở Client.

---

## 🛠️ Công Nghệ Sử Dụng

*   **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet (Bản đồ), Motion (Animation).
*   **Backend**: Express.js, Node.js, `tsx` (TypeScript Execute Engine), `esbuild` (Bundler cho server).
*   **Database**: Supabase (PostgreSQL Cloud) hoặc Fallback RAM In-Memory.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
├── server.ts                 # Điểm khởi chạy Express Server & API Proxy
├── vite.config.ts            # Cấu hình Vite & Proxy chuyển tiếp API `/api`
├── src/
│   ├── App.tsx               # Entry Component chính của ứng dụng
│   ├── main.tsx              # Điểm khởi tạo React DOM
│   ├── index.css             # Cấu hình Tailwind CSS & Fonts
│   ├── types.ts              # Định nghĩa TypeScript Types & Interfaces
│   ├── components/
│   │   ├── AdminPanel.tsx    # Bảng điều khiển admin, quản lý đội xe và SQL Schema
│   │   ├── BerthMap.tsx      # Sơ đồ bố trí giường nằm & ghế ngồi
│   │   ├── ConductorMap.tsx  # Bản đồ lộ trình, theo dõi định vị của tài xế
│   │   ├── Dashboard.tsx     # Bảng tổng quan thông tin chuyến xe
│   │   └── PassengerModal.tsx# Form thông tin khách hàng đặt vé
│   └── utils/
│       ├── audioAlert.ts     # Engine phát âm thanh cảnh báo thông minh
│       └── mockData.ts       # Dữ liệu lộ trình xe khách Việt Nam mẫu
```

---

## 🚀 Hướng Dẫn Cài Đặt Chi Tiết (Chạy Local)

### 1. Tải Mã Nguồn Về Máy
```bash
git clone <URL_KHO_CHUA_GITHUB>
cd <TEN_THU_MUC_DU_AN>
```

### 2. Cài Đặt Các Gói Phụ Thuộc
```bash
npm install
```

### 3. Cấu Hình Biến Môi Trường (Environment Variables)
Sao chép tệp cấu hình mẫu `.env.example` thành `.env` ở thư mục gốc:
```bash
cp .env.example .env
```
Mở tệp `.env` vừa tạo và điền các khóa cấu hình của bạn:
```env
# Supabase Cloud (Tùy chọn - Bỏ trống để dùng chế độ Offline RAM)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Khởi Tạo Cơ Sở Dữ Liệu Trên Supabase (Nếu sử dụng)
Nếu bạn cấu hình Supabase, hãy mở mục **SQL Editor** trên giao diện điều khiển Supabase và thực thi các câu lệnh SQL sau để tạo bảng:

#### Bảng 1: Quản lý vị trí, thông tin chuyến xe (`bus_routes`)
```sql
CREATE TABLE bus_routes (
  trip_id text PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  layout_capacity integer DEFAULT 34,
  license_plate text,
  driver_name text,
  driver_phone text,
  conductor_name text,
  conductor_phone text,
  start_name text,
  end_name text,
  route_type text,
  status text DEFAULT 'active',
  start_coords jsonb,
  end_coords jsonb,
  current_location jsonb,
  speed integer DEFAULT 60,
  is_simulating boolean DEFAULT true,
  is_offline boolean DEFAULT false,
  simulation_progress numeric DEFAULT 0,
  waypoints jsonb DEFAULT '[]'::jsonb,
  berths jsonb DEFAULT '[]'::jsonb
);
```

#### Bảng 2: Đặt chỗ của hành khách (`passenger_bookings`)
```sql
CREATE TABLE passenger_bookings (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  phone text,
  cccd text,
  travel_date text,
  pickup_point text,
  dropoff_point text,
  berth_id text,
  trip_id text
);
```

#### Bảng 3: Đăng ký danh sách đội xe (`vehicles`)
```sql
CREATE TABLE vehicles (
  license_plate text PRIMARY KEY,
  brand text NOT NULL,
  vehicle_type text NOT NULL,
  capacity integer NOT NULL,
  registration_date text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 🏃 Chạy Ứng Dụng

### Chạy Môi Trường Phát Triển (Development)
Sử dụng công cụ `tsx` để khởi động Express Server kết hợp với middleware của Vite trên cổng **3000**:
```bash
npm run dev
```
Mở trình duyệt và truy cập: `http://localhost:3000`

### Biên Dịch & Chạy Môi Trường Sản Xuất (Production Build)
1. Biên dịch ứng dụng sang mã tĩnh và đóng gói máy chủ Node.js bằng `esbuild`:
   ```bash
   npm run build
   ```
2. Khởi động máy chủ ứng dụng chạy tệp đóng gói từ thư mục `dist`:
   ```bash
   npm run start
   ```

---

## 📝 Giấy Phép (License)

Dự án được phân phối dưới giấy phép **MIT**. Vui lòng tự do tải về, tùy biến và phát triển phục vụ cho doanh nghiệp vận tải của bạn!
