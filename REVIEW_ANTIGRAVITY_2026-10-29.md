# Review bản thiết kế Antigravity — 29/10/2026

**Kết luận:** đúng hướng về phong cách và đã bổ sung cấu trúc 8 mục, nhưng chưa đạt nghiệm thu prototype có tương tác theo kế hoạch. Cần sửa các lỗi dữ liệu, bộ lọc, điều hướng và responsive trước khi nối backend thật.

Đối chiếu với `KE_HOACH_THIET_KE_BAO_CAO.md` và `PROMPT_ANTIGRAVITY.md`. Kiểm tra mã đang sửa trong `index.html`, `app.js`, `styles.css` và chạy trên localhost. Không chỉnh sửa ba file ứng dụng trong lượt review này.

Đã duyệt đủ 8 trang; thử bộ lọc NV, khoảng ngày, CSV, đổi tiền tệ, Hướng dẫn, light/dark; kiểm tra desktop 1440×1000 và mobile 390×844. Không gọi API thật hoặc kiểm tra credentials. Việc dùng fixture là phù hợp cho giai đoạn thiết kế; các lỗi dưới đây phát sinh ngay trong prototype.

## Phần đã làm đúng hướng

- Có đủ 8 mục và giữ dark/light, sidebar đỏ, card, typography của mẫu.
- Đã thêm pivot nhiều kênh, pivot NV và bảng tóm tắt; dự án/network có chart và bảng chi tiết.
- Có các nhãn Pacific Time, độ trễ, revenue ước tính và công thức doanh thu API/1.000 views trong một số trang.
- Hướng dẫn có mục lục, từ điển và mô tả nguồn dữ liệu; đã có khung drawer giữ chân video.

## Các lỗi cần sửa

### 1. [P1] Dữ liệu minh họa bị gắn nhãn dữ liệu thật

**Vị trí:** [app.js:2180](</D:/4. bot/youtube-analytics-dashboard/app.js:2180>), [app.js:3507](</D:/4. bot/youtube-analytics-dashboard/app.js:3507>).

Mở trang bằng phiên mới, chưa cấp quyền hoặc kết nối API: header hiển thị **Dữ Liệu Thật: Lunavia** và trạng thái connected. `applyChannelDataToUI()` ghi đè nhãn minh họa đã đặt trong HTML. Banner minh họa riêng chỉ có ở overview; các trang project/network/NV không có banner đó. Network còn khẳng định quyền monetary hợp lệ bằng chuỗi cố định.

**Cần sửa:** một trạng thái nguồn dữ liệu dùng chung cho tất cả trang; fixture luôn có nhãn minh họa. Chỉ hiển thị connected/monetary valid khi provider có bằng chứng kết nối tương ứng.

**Đã xác nhận trực tiếp trên UI.**

### 2. [P2] Bộ lọc và chỉ số pivot NV không tác động kết quả

**Vị trí:** [app.js:3729](</D:/4. bot/youtube-analytics-dashboard/app.js:3729>).

Chọn **nguyenvana → Tháng → Lượt xem (Views)**. Bảng vẫn có cả hai nhân viên, ô tiền USD và 18 cột ngày **01–18/04/2026**, dù bộ lọc ngày đang là tháng 9–10. Renderer đọc metric nhưng không dùng và cố định ngày đầu 01/04/2026; các bộ lọc chưa tạo phạm vi chung.

**Cần sửa:** dựng bảng từ cùng filter state và fixture có schema metric/ngày/đối tượng; đơn vị, cột và dòng phải phản ánh lựa chọn. NV biểu đồ ↔ số liệu giữ nguyên cùng phạm vi.

**Đã xác nhận trực tiếp trên UI.** [Ảnh minh chứng](</D:/4. bot/youtube-analytics-dashboard/review-antigravity-2026-10-29/nv-filter-mismatch.png>).

### 3. [P2] Tổng fixture không bằng các dòng hoặc các ngày

**Vị trí:** [app.js:3763](</D:/4. bot/youtube-analytics-dashboard/app.js:3763>).

Ngay trong NV pivot mặc định:

- Ngày đầu: dòng tổng **$1.347,16**, trong khi hai nhân viên là **$825,03 + $652,66 = $1.477,69**. Lệch **$130,53**.
- Nguyễn Văn An: Tổng kỳ **$14.850,50**, cộng các ô ngày là **$14.912,67**.
- Trần Minh Bình: Tổng kỳ **$9.398,37**, cộng các ô ngày là **$9.549,72**.

Các dòng dùng công thức sin/cos riêng nên không hình thành một bộ dữ liệu đối soát được. Đây là fixture trong cùng bảng/phạm vi, không phải trường hợp tổng Analytics khác breakdown video đã xóa.

**Cần sửa:** fixture theo ngày là nguồn duy nhất; tổng dòng, tổng cột và KPI tính từ cùng dữ liệu. Rate tính từ tổng tử/mẫu hợp lệ. Không sinh tổng bằng một công thức độc lập.

**Đã tính lại từ các ô đang hiển thị trên UI.**

### 4. [P2] Pivot tổng không theo khoảng ngày đã chọn

**Vị trí:** [app.js:3559](</D:/4. bot/youtube-analytics-dashboard/app.js:3559>), [app.js:2053](</D:/4. bot/youtube-analytics-dashboard/app.js:2053>).

Chọn **7 Ngày**: thanh thời gian chuyển thành **23–29/10/2026**, nhưng pivot vẫn có **14 ngày, 16–29/10**. Renderer cố định 14 ngày/6 tuần/4 tháng, bỏ ngày bắt đầu; áp dụng kỳ không refresh pivot cùng các KPI. Danh sách cũng chỉ lấy bốn kênh đầu.

**Cần sửa:** bucket tạo từ cả ngày bắt đầu và kết thúc, danh sách ID từ cùng bộ lọc; cập nhật KPI/chart/pivot qua một lần áp dụng state.

**Đã xác nhận trực tiếp trên UI.**

### 5. [P2] Bấm mục lục Hướng dẫn làm trắng nội dung

**Vị trí:** [app.js:6485](</D:/4. bot/youtube-analytics-dashboard/app.js:6485>), [index.html:2114](</D:/4. bot/youtube-analytics-dashboard/index.html:2114>).

Vào Hướng dẫn → bấm **1. Kiến Trúc & Kết Nối API**. Hash chuyển thành `#guide-sec-1` và không còn dashboard view nào hiển thị. Handler hashchange đưa mọi ID tồn tại vào `switchView()`, kể cả anchor trong bài; renderer chỉ nhận ID trang nên ẩn tất cả.

**Cần sửa:** phân biệt route `view-*` với anchor `guide-sec-*`. Anchor chỉ cuộn trong trang Hướng dẫn; Back/Forward vẫn hoạt động.

**Đã xác nhận trực tiếp trên UI.** [Ảnh minh chứng](</D:/4. bot/youtube-analytics-dashboard/review-antigravity-2026-10-29/guide-empty-after-anchor.png>).

### 6. [P2] Bốn nút CSV mới chỉ hiện toast

**Vị trí:** [app.js:4333](</D:/4. bot/youtube-analytics-dashboard/app.js:4333>).

Các handler xuất pivot tổng, NV, dự án và network chỉ gọi `showToast()`, không tạo CSV hoặc download. Thử nút Xuất CSV NV: hiện **Đang xuất file CSV…**, không có file tải xuống.

**Cần sửa:** xuất file thật theo dữ liệu/bộ lọc đang xem; có ID, metric, đơn vị, kỳ, timezone, currency, công thức khi cần và nhãn Dữ liệu minh họa. Không thông báo thành công khi chưa có kết quả.

**NV đã thử trên UI; ba nút còn lại được xác nhận qua handler.**

### 7. [P2] Đổi USD/VND không cập nhật các bảng mới

**Vị trí:** [app.js:5587](</D:/4. bot/youtube-analytics-dashboard/app.js:5587>), [app.js:4949](</D:/4. bot/youtube-analytics-dashboard/app.js:4949>).

Mở NV số liệu → chọn VND: selector đổi nhưng bảng vẫn **$24,248.87**, footer vẫn **Đơn vị: USD ($) ước tính**. Luồng cũ không gọi lại các renderer mới; một số ô proxy còn hardcode ký hiệu `$`.

**Cần sửa:** currency nằm trong query/render state dùng chung. Khi dùng fixture, chọn tiền tệ phải đổi đồng bộ hoặc khóa lựa chọn chưa hỗ trợ và giải thích rõ. Nguồn thật dùng currency theo kế hoạch, không tỷ giá cố định của mẫu.

**Đã xác nhận trực tiếp trên UI.**

### 8. [P2] Trang kênh/drill-down chưa bám đối tượng được chọn

**Vị trí:** [app.js:4246](</D:/4. bot/youtube-analytics-dashboard/app.js:4246>), [app.js:4439](</D:/4. bot/youtube-analytics-dashboard/app.js:4439>).

Mục Theo kênh vẫn là so sánh cố định **Lunavia vs 80s Groove**, thay vì chi tiết một kênh hoặc tập kênh đã chọn. Nút Xem Video dự án gọi `switchChannel()` rồi trang này, không truyền project ID/tập video. Trong lần thử nút dự án Chill Coffee, chưa mở được danh sách video dự án.

**Cần sửa:** trang kênh nhận channel/project/video scope rõ; có chế độ một kênh và so sánh động. Drill-down dự án phải mở đúng danh mục nội dung và giữ bộ lọc.

**Trang kênh cố định đã xác nhận trên UI; nguyên nhân scope xác nhận qua code.**

### 9. [P2] Cột cố định che vùng thời gian trên mobile

**Vị trí:** [styles.css:4206](</D:/4. bot/youtube-analytics-dashboard/styles.css:4206>).

Ở viewport **390 px**, vùng bảng chỉ rộng **318 px**, nhưng bốn cột cố định chiếm ít nhất **560 px**. Sau khi cuộn ngang tới `scrollLeft = 787`, các cột ngày nằm dưới các cột định danh sticky và không có vùng đọc phù hợp. Bảng NV cũng có vấn đề tương tự với tổng chiều rộng cột cố định.

**Cần sửa:** breakpoint mobile chỉ cố định cột định danh tối thiểu; thu gọn metadata, chuyển chỉ số/tổng ra vùng tóm tắt hoặc cho bỏ cố định. Kiểm tra cuộn ngang thực tế ở 390 px, không chỉ kiểm tra page không tràn ngang.

**Đã xác nhận trực tiếp trên UI.** [Ảnh minh chứng](</D:/4. bot/youtube-analytics-dashboard/review-antigravity-2026-10-29/mobile-pivot-scrolled.png>).

### 10. [P2] Light mode có chữ tối trên nền tối

**Vị trí:** [styles.css:4217](</D:/4. bot/youtube-analytics-dashboard/styles.css:4217>), [styles.css:4328](</D:/4. bot/youtube-analytics-dashboard/styles.css:4328>).

Cột cố định hardcode nền **#111726**; khi chọn light mode, chữ kế thừa chuyển thành **#0F172A**, khiến tên nhân viên/header khó đọc. Drawer cũng có nền tối cố định cần kiểm tra cùng theme.

**Cần sửa:** dùng token nền/chữ theo theme cho sticky cells, header, total row và drawer. Kiểm tra hover và selected state ở cả hai theme.

**Đã xác nhận trực tiếp trên UI và computed style.** [Ảnh minh chứng](</D:/4. bot/youtube-analytics-dashboard/review-antigravity-2026-10-29/nv-light-mode.png>).

### 11. [P2] Drawer thay số 0 hợp lệ bằng số tự tính

**Vị trí:** [app.js:4165](</D:/4. bot/youtube-analytics-dashboard/app.js:4165>).

Các dòng `video.views || 2500`, `video.revenue || …`, `video.comments || …` coi 0 là thiếu và thay bằng số khác; lifetime còn được suy thành views × 3. Khi nối nguồn thật, video 0 bình luận hoặc 0 doanh thu sẽ hiển thị sai; ngay fixture cũng mất tính nhất quán.

**Cần sửa:** giữ 0; phân biệt null/undefined, thiếu dữ liệu và không hỗ trợ. Chỉ dùng fixture qua provider demo; không fallback công thức trong renderer thật. Lifetime dùng đúng trường nguồn hoặc trạng thái thiếu.

**Phát hiện qua code; chưa thực hiện vòng kiểm tra drawer cho từng video.**

## Thứ tự sửa đề xuất

1. Chuẩn hóa một provider demo và filter state; sửa nhãn nguồn, metric, ngày và tổng fixture (1–4).
2. Hoàn thiện điều hướng Hướng dẫn, drill-down, CSV và currency (5–8).
3. Sửa mobile/light mode và drawer (9–11); sau đó kiểm tra lại keyboard/focus drawer và trạng thái thiếu/lỗi.
4. Chụp lại 8 trang desktop cùng các trường hợp 390 px/light mode; đối soát chart–KPI–bảng–CSV trước khi nối API thật.

## Yêu cầu nghiệm thu lại

- Chọn một nhân viên + Views + Tháng → đúng một người, đơn vị lượt xem, cột tháng đúng kỳ.
- Chọn 7 ngày → pivot có đúng các ngày thuộc kỳ, không còn 14 cột cố định.
- Tổng ngày và tổng kỳ tính từ cùng fixture; tỷ số không cộng hoặc lấy trung bình các dòng.
- Mọi trang demo đều ghi minh họa; không tuyên bố monetary valid khi chưa xác minh.
- Mục lục Hướng dẫn cuộn đúng section; route Back/Forward không làm trống trang.
- Bốn nút export tạo file đọc được, khớp đúng dữ liệu đang xem.
- USD/VND nhất quán giữa label, KPI, chart, bảng, tooltip và CSV.
- Trang kênh và video mở đúng lựa chọn, giữ project/NV scope khi drill-down.
- Đọc được cột ngày sau khi cuộn ngang ở 390 px và đọc được chữ trong light mode.
- Số 0 vẫn là 0; dữ liệu thiếu không bị thay bằng công thức hoặc dữ liệu mẫu.
