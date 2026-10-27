# TubePulse - YouTube Channel Analytics Hub

Báo cáo phân tích hiệu suất kênh YouTube hiện đại được xây dựng theo tiêu chuẩn thiết kế cao cấp (**Taste-Skill & Anti-AI-Slop**), kết nối trực tiếp với **YouTube Data API v3**.

## ✨ Tính Năng Nổi Bật

- **Kết nối YouTube Data API v3 Trực Tiếp**:
  - Tự động nhận diện mọi định dạng: Link kênh đầy đủ (`https://youtube.com/@handle`), Handle (`@MrBeast`), hoặc Channel ID (`UC...`).
  - Hỗ trợ đổi kênh tức thì và lưu bộ nhớ đệm (`localStorage`) tự động.
- **Thẻ Chỉ Số Hiệu Suất (KPIs)**:
  - Lượt Xem (Views), Doanh Thu Ước Tính (RPM/CPM), Tương Tác (Likes/Comments), Đăng Ký (Subscribers), Thời Lượng Xem (Watch Time).
  - Tích hợp biểu đồ sparkline mini trực quan cho từng thẻ.
- **Biểu Đồ Xu Hướng Tương Tác**:
  - Dựng bằng Chart.js với đường cong mượt mà, phân cấp thị giác rõ ràng, loại bỏ nhãn chữ chồng chéo (*Anti-Slop Clean Design*).
  - Chuyển đổi linh hoạt giữa: Lượt Xem, Doanh Thu, Người Đăng Ký, Giờ Xem.
  - Hỗ trợ đối chiếu kỳ trước và làm mịn điểm nhiễu ngoại lai (*Outlier smoothing*).
- **Phân Tích Cơ Cấu Tương Tác & Thuê Bao**:
  - Biểu đồ đa đường so sánh Tỉ lệ Thích vs Bình luận vs Chia sẻ.
  - Biểu đồ Donut tỷ lệ giữ chân và tăng trưởng người đăng ký ròng.
- **Bảng Video Hiệu Suất Cao Nhất**:
  - Bảng thống kê chi tiết video: Thumbnail thực tế, tiêu đề, ngày xuất bản, thời lượng, số view, like, comment và doanh thu ước tính.
  - Tìm kiếm video thời gian thực và phân trang thông minh.
- **Đa Tiền Tệ & Giao Diện**:
  - Chuyển đổi tiền tệ tức thì giữa **USD ($)** và **VND (₫)**.
  - Hỗ trợ giao diện **Dark Mode** (Obsidian) và **Light Mode**.

## 🚀 Khởi Chạy Nhanh (Local)

1. **Cách 1: Mở trực tiếp**
   - Nhấp đúp vào file `index.html` trong bất kỳ trình duyệt nào (Chrome, Edge, Firefox).

2. **Cách 2: Khởi chạy với Local Server**
   - Nhấp đúp vào file `start_server.bat` (hoặc chạy lệnh: `python -m http.server 4173`).
   - Mở trình duyệt tại: `http://localhost:4173/`.

## 🌐 Triển Khai Miễn Phí (GitHub Pages / Vercel)

Dự án là ứng dụng web tĩnh thuần túy (**Vanilla HTML, CSS, JavaScript**), không cần build build-step phức tạp:
- **GitHub Pages**: Bật tính năng GitHub Pages trong mục *Settings > Pages* chọn nhánh `main` và thư mục `/ (root)`.
- **Vercel / Netlify**: Kéo thả thư mục hoặc kết nối trực tiếp với GitHub repo.

## 🛠️ Công Nghệ Sử Dụng

- HTML5 Semantic Markup
- Vanilla CSS3 (Custom Design System, Glassmorphism, Responsive)
- Vanilla JavaScript (ES6+, Async/Await, Canvas API)
- [Chart.js](https://www.chartjs.org/)
- [Remix Icon](https://remixicon.com/)
- [Google Fonts (Plus Jakarta Sans & JetBrains Mono)](https://fonts.google.com/)

---
Phát triển bởi **cookingshowbeef-hub**.
