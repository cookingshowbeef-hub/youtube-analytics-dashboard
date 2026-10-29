# Rà soát bản Antigravity tích hợp Analytics minh họa

Ngày kiểm tra: 29/10/2026. Commit được đối chiếu: `abbe6ad` — tích hợp chế độ Xem Minh Họa. Kiểm tra này chỉ tạo tài liệu/bằng chứng, không sửa mã ứng dụng.

**Kết luận: đã nối dữ liệu demo vào một phần báo cáo, chưa đạt nghiệm thu.** Cần sửa các lỗi nguồn dữ liệu giữa bảng/biểu đồ và phân biệt thiếu quyền với số 0 trước khi bàn giao.

## Phạm vi đã kiểm tra

- Đọc `app.js`, `index.html`, nguồn JSON và `demo_bundle.js`; kiểm tra cú pháp JavaScript đạt.
- Thực thi các hàm dữ liệu/render/export được trích từ mã hiện tại trong môi trường Node VM cô lập, với dữ liệu mẫu và phần phụ thuộc UI được mô phỏng. Không gọi Google API, không đọc credential/token và không tương tác OAuth.
- Bằng chứng số nằm ở `review-antigravity-demo-2026-10-29/logic-checks.json`.
- Trình duyệt kiểm tra chặn giao thức `file:` theo chính sách bảo mật. Không dùng cách vòng qua giới hạn này. Vì vậy chưa xác nhận giao diện chạy thực tế, mobile, light mode hoặc thao tác tải file qua trình duyệt; các kết luận render bên dưới dựa vào cấu hình Chart/HTML mà hàm thực sự tạo ra.

## Phần đã làm đúng

1. Có hai chế độ dữ liệu thật/minh họa, banner giải thích dữ liệu hư cấu và bộ chọn kịch bản.
2. `DATA_STORE.reindex()` đã bổ sung ánh xạ trường và quan hệ phân công. Lỗi thiếu `emp.name`, `emp.channelId`, `ch.title` của bản trước đã được xử lý; không tiếp tục báo các lỗi cũ đó như lỗi hiện tại.
3. Có `DEMO_STORE` và `getEffectiveChannelReport`, dùng được số theo ngày cho bảng và một số biểu đồ. Đổi kỳ đã có nhánh gọi adapter trong demo và request trong live.
4. Kỳ 01–28/10/2026 của Lunavia trả **20.334 views, 20,79 USD minh họa**, khớp JSON nguồn. Các dòng năm 2026, summary và retention trong bundle khớp file chuẩn tương ứng.
5. Đã bỏ lỗi `displayRevUSD` chưa khai báo trước đây. Có dữ liệu retention cho 145 video mẫu và chức năng CSV thực sự tạo nội dung tệp ở các báo cáo kênh/NV.

## Các lỗi cần sửa

### 1. [P1] Biểu đồ thanh không dùng adapter demo nên về 0 dù bảng có tiền

**Vị trí:** `app.js:3859`–`3874`.

Bảng và biểu đồ đường lấy số qua `getEffectiveChannelReport`, nhưng biểu đồ thanh vẫn đọc trực tiếp `analyticsReportCache`. Khi chỉ dùng demo, cache live trống nên ba kênh được chọn có thanh doanh thu `[0, 0, 0]` dù bảng có tiền và biểu đồ đường có ba chuỗi.

**Sửa:** mọi thành phần so sánh dùng cùng kết quả adapter, cùng ID/kỳ/scenario. Thiếu tiền phải là `null`/trạng thái thiếu, không tự trả 0. Nghiệm thu bảng, tổng đường và thanh của từng kênh khớp nhau.

### 2. [P1] KPI biến thiếu quyền monetary thành doanh thu 0

**Vị trí:** `app.js:1360`–`1362`, cùng luồng dựng `currentData.timeline` tại `app.js:2707`.

Kịch bản `analytics_without_monetary` trả đúng `estimatedRevenue: null` từ adapter. Tuy nhiên KPI chỉ kiểm tra mảng tiền có phần tử, rồi cộng mảng toàn `null`, kết quả thành **$0.00**. Người xem không phân biệt được thiếu quyền với doanh thu thật bằng 0.

**Sửa:** kiểm tra `has_monetary` và thành phần hợp lệ trước khi cộng; toàn bộ thiếu thì hiện “— · Chưa có quyền doanh thu”. Trường hợp doanh thu 0 hợp lệ vẫn phải hiện 0. Áp dụng cùng quy tắc cho chart, tỷ số và file xuất.

### 3. [P1] Dữ liệu demo bị gắn nhãn LIVE OAuth trong báo cáo NV và CSV

**Vị trí:** `app.js:3018`–`3020`, `app.js:3921`–`3940`, `app.js:3960`–`3980`.

Hàm xuất CSV của cả kênh và NV lấy số demo qua adapter nhưng ghi cột trạng thái **LIVE OAuth** khi có Analytics. Nội dung CSV không có `is_demo`, `synthetic_demo` hoặc nhãn minh họa. Bảng tóm tắt NV cũng chỉ dựa vào `has_analytics` để hiện LIVE OAuth, khác bảng so sánh kênh đã biết phân biệt chế độ.

**Sửa:** thêm nguồn/chế độ/kỳ/timezone/currency/scenario/độ phủ vào CSV, ghi nhãn minh họa tại mọi vùng demo và tên tệp phù hợp. Không dùng khả năng trả số demo làm bằng chứng đã được Google cấp OAuth.

### 4. [P2] Tỷ số trong kịch bản tiền trễ dùng sai tập ngày

**Vị trí:** `app.js:279`–`318`, `app.js:3713` và các chỗ tính tỷ số từ `totals`.

`delayed_monetary` cắt tiền đến 26/10 nhưng vẫn dùng views đến 28/10 làm mẫu số. Kiểm tra Lunavia: tiền **19,10 USD**, views toàn kỳ **20.334**, views cùng kỳ có tiền **18.081**. UI tính tỷ số **0,9393 USD/1.000 views** thay vì **1,0564** trên tập ngày hợp lệ.

**Sửa:** adapter trả rõ kỳ khả dụng và views tương ứng tiền; mọi proxy dùng tử/mẫu cùng ID/ngày. Views toàn kỳ vẫn có thể hiển thị riêng với nhãn phạm vi rõ.

### 5. [P2] Override mẫu số 0 để lại phút xem và subscribers từ số cũ

**Vị trí:** `app.js:295`–`309`.

Adapter mới áp override cho `views` và `estimatedRevenue`, bỏ qua các trường khác trong `metric_overrides` và các thành phần tổng hợp. Kịch bản `zero_denominator` trả **0 views nhưng 185.995 phút xem và 42 subscribers gained** cho cùng kênh/kỳ, trái fixture đã đặt các lượng cộng được bằng 0. Các tổng nhóm có thể tiếp tục cộng dữ liệu không còn cùng kịch bản.

**Sửa:** áp đầy đủ override theo hợp đồng, cập nhật cents/counter hỗ trợ rồi tính lại tổng/rate. Các kịch bản thiếu/no-row/thu hồi phải có trạng thái riêng. Bổ sung hai lựa chọn `zero_denominator` và `revoked` hiện chưa có trong dropdown ở `index.html:255`.

### 6. [P2] Banner nói 666 ngày nhưng bundle chỉ chứa 301 ngày năm 2026

**Vị trí:** `app.js:196`, `index.html:249`–`251`, `data/demo-analytics/demo_bundle.js`.

Bundle có **4.515 dòng = 15 kênh × 301 ngày**, từ 01/01 đến 28/10/2026, thiếu toàn bộ năm 2025. Chọn năm 2025 qua adapter trả `has_analytics: true`, không có hàng và tổng views 0, dù fixture chuẩn có dữ liệu thật sự cho thiết kế. Các tóm tắt 2025 có trong bundle nhưng adapter không dùng để lấy chuỗi ngày.

**Sửa:** nạp đủ lịch sử theo manifest hoặc tải file ngày đúng nhu cầu; nếu chưa hỗ trợ thì ghi rõ giới hạn và trạng thái thiếu. Không biến ngày ngoài phạm vi thành số 0 hay báo đủ dữ liệu. Preset demo phải căn theo mốc cuối 28/10, không tự kéo đến ngày máy chủ.

### 7. [P2] MoM/QoQ và một số chart nhóm vẫn chưa dùng nguồn demo chung

**Vị trí:** `app.js:1447`–`1498`, `app.js:1630`–`1635`, `app.js:3999`–`4067`, `app.js:4161`–`4206`.

Ma trận tháng/quý vẫn gọi bộ sinh số cũ từ views lifetime, RPM giả định, tỷ lệ US 58% và hệ số giờ xem. Các chart NV/team vẫn chủ yếu hiển thị public views/subscribers/video count, không đọc số kỳ minh họa theo bộ lọc; biểu đồ `teamChartRevenue` lại dựng dataset subscribers. Chúng không đối soát được với các bảng đã đọc adapter demo.

**Sửa:** tổng hợp từ dòng ngày hoặc `period_rollups.json`/`summaries.json` đúng kỳ/scenario. Chart có nhãn doanh thu phải dùng tiền, các public counters nằm ở phần có nhãn riêng. Giữ `demo_current_portfolio` và chú thích danh mục hiện tại cho lịch sử nhóm/NV.

### 8. [P2] Pivot chưa tổng hợp theo tuần/tháng và chưa bám đủ kỳ được chọn

**Vị trí:** `app.js:2833`–`2854`, `app.js:2930`–`2931`.

Pivot tạo cố định 14 ngày/6 tuần/4 tháng rồi tìm `report.rows.day` bằng khóa cột. Ở tuần/tháng, khóa là `w_i`/`m_i`, không bao giờ khớp ngày ISO của report, nên các ô kỳ trống dù dữ liệu có sẵn. Cột ngày cũng chỉ hiện 14 mốc trong kỳ mặc định 28 ngày; dòng tổng thời gian vẫn điền “—”.

**Sửa:** tạo bucket từ cả khoảng bắt đầu/kết thúc, tổng hợp các lượng cộng được theo ngày/tuần/tháng; rate tính từ thành phần đúng. Tổng cột, tổng kỳ và CSV phải khớp phạm vi đang hiển thị.

### 9. [P2] Video, phân rã và tỷ giá minh họa chưa được nối đủ

**Vị trí:** `app.js:99`–`116`, `app.js:750`–`754`, cấu trúc `DEMO_STORE` và bundle.

Bundle chỉ nạp meta, summaries, scenarios, retention và dòng ngày 2026; không có video daily, breakdown hoặc daily FX, cũng chưa thấy luồng tải riêng chúng. Video vẫn lấy public lifetime và giữ tiền `null`; phần thông tin Mỹ có chỗ dùng tổng tiền toàn kênh thay breakdown. VND tiếp tục nhân tỷ giá cố định **25.450** thay vì tỷ giá minh họa từng ngày. Với Lunavia 01–28/10, cách cũ ra **529.106 VND**, file FX minh họa theo ngày cho **524.722 VND**.

**Sửa:** nối file theo nhu cầu từng tab; video vẫn ghi phạm vi mẫu, country/device/traffic là các partition độc lập; tiền tệ demo dùng `daily_fx.json` có nhãn Tỷ giá minh họa. Nếu phần nào chưa được nối thì giữ trạng thái thiếu/đang hỗ trợ, không lấy tổng toàn kênh gắn nhãn phân rã.

## Thứ tự giao Antigravity sửa tiếp

1. Sửa adapter cho null/0, override đầy đủ, kỳ tiền trễ và ngày khả dụng.
2. Đưa bảng/đường/thanh/KPI/CSV qua cùng nguồn, sửa các nhãn demo bị ghi LIVE.
3. Nạp đủ lịch sử và rollup; sửa bucket pivot và báo cáo team/NV theo kỳ.
4. Nối các file video/breakdown/FX còn thiếu; giữ nguồn thật và minh họa tách biệt.
5. Nghiệm thu lại 9 kịch bản, so sánh 3/5 kênh, đổi kỳ/currency, CSV, thoát demo; sau đó kiểm tra trình duyệt 1440/768/390 px và dark/light.

Lượt tiếp theo cần sửa mã theo các bằng chứng cụ thể này; không tạo thêm bộ số mô phỏng độc lập hoặc đổi nhãn để che sai lệch. Báo riêng kiểm tra logic, kiểm tra UI thực tế và kết nối Google thật, không coi chúng thay thế nhau.
