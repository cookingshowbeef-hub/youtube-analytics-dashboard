# Kế hoạch thiết kế 8 mục báo cáo YouTube

Ngày lập: 28/10/2026. Cập nhật: 29/10/2026, sau khi kiểm tra nguồn dữ liệu đang dùng trong template. Phạm vi của lần cập nhật tài liệu này: sửa kế hoạch và yêu cầu bàn giao cho Antigravity; không sửa mã ứng dụng.

## 0. Ưu tiên hiện tại: đưa dữ liệu đúng nguồn vào template

Lượt tiếp theo của Antigravity phải nối nguồn dữ liệu chung vào các màn hình quản lý và báo cáo, đồng thời giữ thiết kế so sánh nhiều kênh ở mục 5.4. Không giới hạn lượt này ở việc thay bố cục trang kênh hoặc thêm một cửa sổ kiểm tra API. Mục tiêu là số liệu trên KPI, biểu đồ, bảng và CSV đi qua cùng nguồn, cùng kỳ và đúng channel ID.

### 0.1. Hiện trạng đã kiểm tra trong mã ngày 29/10/2026

| Thành phần | Hiện trạng | Việc Antigravity cần làm |
|---|---|---|
| Data API v3 | Có luồng gọi kênh/video trong `fetchLiveYouTubeData`; áp dụng một kênh và lưu cache. Dữ liệu mặc định vẫn có mảng cố định | Nối catalog công khai vào nguồn chung; hiện timestamp và phân biệt cache với lần đồng bộ mới |
| Biểu đồ và báo cáo chính | Còn bộ sinh timeline, mảng team/NV và các công thức như views × 0.0025 cho tiền, views × 0.05 cho giờ xem | Loại số mô phỏng khỏi chế độ dữ liệu thật; dùng báo cáo Analytics hoặc trạng thái thiếu |
| OAuth và Analytics | `oauth_service.py`, `dashboard_server.py` đã có luồng kết nối và `/api/analytics/test`; frontend mới đưa kết quả vào modal kiểm tra | Tái sử dụng phần đang có, bổ sung lớp truy vấn báo cáo và đưa kết quả vào nguồn chung của các màn hình |
| Bộ hierarchy | `data/mock-hierarchy/dataset.json` đã có 3 team, 15 NV, 15 kênh, 150 video mẫu; chưa được runtime của template đọc | Nạp bộ này và dùng cùng quan hệ ID cho quản lý, bộ lọc, báo cáo và drill-down |
| Badge trạng thái | Có nhãn “Dữ liệu thật/Đã cấp đủ quyền” gắn sẵn hoặc suy từ thông tin kênh/token | Gắn nhãn theo nguồn từng phần, quyền đã xác minh và lần truy vấn thành công; token tồn tại chưa chứng minh đọc được doanh thu |

Đây là kiểm tra đường đi dữ liệu trong mã, không xác nhận mọi token đang hợp lệ hoặc đã truy vấn API thành công ở thời điểm chạy. Antigravity cần kiểm tra lại mã trước khi sửa vì dự án có thể được cập nhật tiếp.

### 0.2. Kết quả cần thấy trên giao diện

- Mặc định nạp bộ 3 team → 15 nhân sự → 15 kênh → 150 video mẫu. Metadata và bộ đếm từ file ghi **Dữ liệu công khai YouTube · Đã lấy lúc …**; tổ chức ghi **Phân công minh họa**.
- Phần có đồng bộ Data API thành công hiển thị số công khai mới, nguồn và thời điểm tương ứng. Mở lại cache không tự được tính là một lần đồng bộ mới.
- Kênh có Analytics được xác minh hiển thị hiệu suất theo kỳ từ API trên KPI/chart/bảng/CSV; kênh thiếu quyền vẫn hiện trong danh sách, với ô thiếu và lý do cụ thể.
- Doanh thu, giờ xem, shares, gained/lost và tỷ số doanh thu không lấy từ công thức giả. Tất cả kênh thiếu số kỳ thì hiện trạng thái trống có hướng dẫn kết nối, không vẽ đường mô phỏng.
- Có thể bắt đầu với một kênh được chủ sở hữu cấp quyền. Không yêu cầu đủ 15 kênh hoặc 15 email mới làm được giao diện và kiểm tra tích hợp.
- Giữ đủ 8 mục báo cáo. Các trang chưa có dữ liệu hợp lệ vẫn có bộ lọc, thông tin phạm vi và trạng thái thiếu; không dùng một bộ số mẫu riêng để làm đầy trang.

### 0.3. Phạm vi bàn giao cho Antigravity

Tái sử dụng HTML/CSS/JavaScript, backend và OAuth client đang có. Bổ sung phần lấy/chuẩn hóa dữ liệu cần thiết để nối frontend với nguồn thực; không yêu cầu viết lại toàn bộ backend, đổi framework hoặc hoàn thiện phát hành OAuth công khai trước khi làm giao diện. Khi môi trường chưa có grant hợp lệ, hoàn thiện trạng thái thiếu và ghi rõ phần kiểm tra API còn chờ; không báo đã tích hợp live thành công chỉ từ modal test hoặc badge.

## 1. Định hướng và nguồn dữ liệu

Giữ phong cách Antigravity trong dự án: nền tối, sidebar đỏ, card xanh đen, số dễ đọc, biểu đồ và bảng đồng nhất. Giữ đủ 8 mục trong ảnh người dùng, đúng thứ tự.

Nguồn tham khảo: index.html, styles.css, app.js và preview.png cho hệ thống giao diện; các ảnh 20261028-*.jpg và untitled@2x (1).png cho cấu trúc nghiệp vụ, bộ lọc và bảng ngày/tháng.

**Báo cáo** là bảng đối soát nhiều kênh. **Theo team / dự án / kênh / network / NV (biểu đồ)** là các góc nhìn phân tích. **NV (số liệu)** là bảng đối soát theo nhân viên. Mỗi trang phục vụ một nhiệm vụ riêng, dùng chung hợp đồng dữ liệu.

### Phương án chính: Data API v3 + Analytics API v2

Data API và Analytics là năng lực sản phẩm cần hỗ trợ. Khả năng sử dụng thực tế được xác minh riêng cho từng channel ID, từng phạm vi quyền và loại báo cáo. Không mặc định 15 kênh công khai trong bộ dữ liệu đã cấp OAuth/monetary; mỗi phần giao diện phải hoạt động cả khi chưa kết nối, mới kết nối một kênh hoặc chỉ có quyền Analytics thông thường.

| Nguồn | Vai trò |
|---|---|
| YouTube Data API v3 | Danh mục kênh/video, metadata, thumbnail, ngày công khai, thời lượng và bộ đếm công khai hiện tại |
| YouTube Analytics API v2 | Hiệu suất theo kỳ: views, giờ xem, tương tác, gained/lost, doanh thu ước tính, CPM và phân tích được loại báo cáo hỗ trợ |
| Cấu hình nội bộ | Team, dự án, nhân viên, network, vai trò và ngày hiệu lực phân công |
| Sync log / snapshot | Độ mới, phạm vi thành công; lịch sử quan sát bộ đếm công khai khi được phép lưu |

Analytics là nguồn chính cho ngày/tháng, lịch sử và so sánh kỳ. Snapshot công khai là lớp phụ, không thay báo cáo Analytics. Không dùng số ngẫu nhiên, hệ số doanh thu cố định hoặc dữ liệu mẫu để lấp phần thiếu.

NV là **nhân viên**, đúng tiêu đề trong mẫu. Team/dự án/nhân viên/network là phân công nội bộ gắn channel ID/video ID; YouTube không cung cấp cơ cấu tổ chức này.

**Bộ dữ liệu nghiệm thu đã chốt ngày 29/10/2026:** dùng `data/mock-hierarchy/dataset.json` làm nguồn chung: **3 team × 5 nhân sự/team × 1 kênh/nhân sự = 15 kênh khác nhau**. Team, tên nhân sự và phân công là mẫu; metadata/bộ đếm công khai của 15 kênh âm nhạc và 150 video được lấy thực từ YouTube Data API v3 tại mốc lưu trong dữ liệu. Không dùng lại danh sách 2/8 kênh hardcode để thay bộ này. Chi tiết quan hệ và giới hạn nằm ở mục 6.6.

## 2. Giữ và điều chỉnh mẫu Antigravity

| Phần | Giữ lại | Điều chỉnh |
|---|---|---|
| Shell | Sidebar, dark/light, font, toolbar, card, bảng responsive | Breadcrumb theo trang; một mục active |
| Báo cáo tổng | Bộ lọc, bảng, export | Pivot nhiều kênh với số Analytics theo kỳ |
| KPI | Views, doanh thu, tương tác, subscribers, giờ xem | Gắn trường API, kỳ, phạm vi và độ mới thật |
| Theo kênh | Phong cách giao diện, bộ chọn kênh, chart | Bỏ hai thẻ đối đầu/VS cố định; biểu đồ so sánh nhiều kênh là nội dung chính, chi tiết kênh mở khi cần |
| Team / NV | Bộ lọc, chart xếp dọc, legend | Dữ liệu thật và phân công có ngày hiệu lực |
| Dự án | Bảng và doanh thu | Hiệu suất danh mục video; bỏ cost/profit/ROI khi chưa có nguồn |
| Network | Card, nhóm kênh | Xu hướng, cơ cấu doanh thu, bảng trong phạm vi có quyền |
| Thời gian | Ngày/tháng/quý, MoM/QoQ | Truy vấn Analytics; không dựng lịch sử bằng hệ số |
| USD/VND | Bộ chọn tiền tệ | Dùng currency của Analytics cho metric hỗ trợ |
| Hướng dẫn | Trang trợ giúp | Nguồn, kỳ, độ trễ, công thức và quyền |

Khi triển khai thay `generateTimelineForRange`, `generateMonthlyComparisonData`, `TEAM_RAW_CURVES` và các mảng cố định trong luồng báo cáo thật của `app.js`. Bỏ công thức tự tạo shares/revenue ngay trong `fetchLiveYouTubeData` và mọi script nhập liệu còn dùng công thức này. Danh mục uploads phải phân trang khi đồng bộ đầy đủ; 150 video đầu vào vẫn được ghi rõ là mẫu. Badge nguồn phải đúng từng thành phần.

## 3. Hợp đồng chỉ số

### 3.1. Metadata và bộ đếm hiện tại — Data API v3

| Dữ liệu | Nguồn | Nhãn |
|---|---|---|
| Kênh, avatar, mô tả, ID | channels.list → snippet | Thông tin kênh |
| Views kênh | statistics.viewCount | Views cộng dồn tại lần lấy |
| Subscribers công khai | subscriberCount, hiddenSubscriberCount | Subscribers công khai, đã làm tròn |
| Số video công khai | statistics.videoCount | Video công khai của kênh |
| Uploads | contentDetails.relatedPlaylists.uploads + playlistItems.list | Danh mục đã đồng bộ |
| Video | videos.snippet, contentDetails.duration | Tiêu đề, thumbnail, ngày công khai, thời lượng nội dung |
| Views/likes/comments video | videos.statistics | Bộ đếm cộng dồn hiện tại |

Subscriber công khai làm tròn xuống ba chữ số có nghĩa; ẩn/thiếu không là 0. Không dùng quốc gia kênh làm quốc gia khán giả, hoặc thời lượng nội dung làm thời gian đã xem. [Channels](https://developers.google.com/youtube/data/reference/rest/v3/channels), [Videos](https://developers.google.com/youtube/data/reference/rest/v3/videos).

### 3.2. Hiệu suất theo kỳ — Analytics API v2

| Nhóm | Metric / cách hiển thị |
|---|---|
| Views | views; engagedViews được ghi nhãn riêng, đặc biệt khi tách loại nội dung |
| Giờ xem | estimatedMinutesWatched / 60; giữ phút trong dữ liệu gốc |
| Thời gian xem trung bình | averageViewDuration, đơn vị giây |
| Tỷ lệ xem trung bình | averageViewPercentage |
| Tương tác | likes, comments, shares; tổng tương tác ghi rõ gồm ba thành phần |
| Subscribers | subscribersGained, subscribersLost; ròng = gained − lost |
| Doanh thu ước tính | estimatedRevenue |
| Thành phần doanh thu | estimatedAdRevenue; estimatedRedPartnerRevenue cho Premium khi hỗ trợ |
| Quảng cáo | cpm, playbackBasedCpm, adImpressions, monetizedPlaybacks, grossRevenue |
| Giữ chân | audienceWatchRatio, relativeRetentionPerformance theo elapsedVideoTimeRatio của một video |
| Phân rã | Dimensions hợp lệ như quốc gia, nguồn truy cập, thiết bị, loại nội dung |

Backend dùng ma trận report–metrics–dimensions–filters hợp lệ. Retention, traffic source, quảng cáo và tài chính có thể cần truy vấn riêng; không ghép mọi trường tùy ý. [Metrics](https://developers.google.com/youtube/analytics/metrics), [Channel reports](https://developers.google.com/youtube/analytics/channel_reports).

Doanh thu là **ước tính**, có thể điều chỉnh; grossRevenue là doanh thu gộp quảng cáo, không thay estimatedRevenue. Không khẳng định API bao phủ mọi nguồn doanh thu Studio.

Gained/lost theo kênh có phạm vi khác theo/lọc video: số theo video chỉ phản ánh trang xem video tương ứng theo định nghĩa API. Không chia phần subscriber toàn kênh cho dự án/NV theo tỷ lệ views.

**Chưa đưa vào:** chi phí, lợi nhuận, ROI, % KPI/thi đua nhân sự khi chưa có nguồn nghiệp vụ; thumbnail impressions/CTR khi chưa xác minh API/loại báo cáo. adImpressions và cardClickRate không phải impressions/CTR thumbnail.

### 3.3. Doanh thu API trên 1.000 lượt xem, CPM và tiền tệ

Không có field rpm trực tiếp trong danh sách Analytics metrics đang dùng. Có thể hiển thị tỷ số tính từ dữ liệu API, với nhãn và mẫu số rõ:

- **Doanh thu API/1.000 views:** estimatedRevenue / views × 1.000, cùng kỳ và phạm vi Analytics. Đây là proxy doanh thu trên lượt xem, không cam kết là RPM Studio.
- **Doanh thu API/1.000 engaged views:** estimatedRevenue / engagedViews × 1.000; ưu tiên mẫu số này ở tab Shorts. Nếu có cả hai biến thể, đặt tên tách biệt.
- Tách Shorts và video thường bằng dữ liệu phân loại đã xác minh, như creatorContentType; không chỉ đoán từ thời lượng. Không trộn hai loại thành một RPM mặc định.
- Tử và mẫu cùng ID, bộ lọc, kỳ có dữ liệu, loại nội dung và tiền tệ. Không dùng views cộng dồn Data API làm mẫu số doanh thu Analytics trong kỳ.
- Tỷ số cả kỳ/nhóm tính lại từ tổng tử / tổng mẫu hợp lệ; không lấy trung bình RPM các dòng/ngày.
- Thiếu thành phần hoặc mẫu số 0 hiển thị “—”, không điền RPM mặc định. Tooltip nêu công thức và phạm vi nguồn doanh thu API.

CPM và playback-based CPM có field trực tiếp, đo quảng cáo với mẫu số khác proxy trên. Dùng truy vấn aggregate đúng phạm vi cho CPM/average; không mean các dòng. AVD/APV không được suy bằng average duration / độ dài video trung bình. [Revenue metrics](https://developers.google.com/youtube/analytics/metrics#Estimated_revenue_metrics), [RPM và CPM](https://support.google.com/youtube/answer/9314357?hl=en).

USD/VND đi qua tham số currency cho metric hỗ trợ. Query/cache key có currency; không cộng tiền khác đơn vị hoặc nhân tỷ giá cố định của mẫu. [Reports.query](https://developers.google.com/youtube/analytics/reference/reports/query).

### 3.4. Kỳ, lịch sử, múi giờ và độ mới

Ba chế độ tách biệt:

1. **Hiệu suất theo kỳ — mặc định:** Analytics theo ngày bắt đầu/kết thúc, dùng cho KPI/chart/pivot/MoM/QoQ.
2. **Bộ đếm hiện tại:** Data API ở lần lấy mới nhất; dùng hồ sơ và tab đối chiếu.
3. **Lịch sử bộ đếm công khai — phụ:** snapshot có timestamp và chênh giữa hai quan sát khi được phép lưu; không gọi là số phát sinh Analytics theo ngày.

Ngày công khai video là bộ lọc danh mục riêng với kỳ hiệu suất. Ví dụ minh họa: video có 20.000 views hiện tại không có nghĩa đã có 20.000 views trong kỳ 01–15/10; kỳ đó phải truy vấn Analytics.

Analytics có thể trả lịch sử trước ngày cài ứng dụng theo report/dữ liệu sẵn có; không cần chờ tích lũy snapshot. Không có hàng phải phân biệt không hoạt động, chưa xử lý, thiếu quyền, giới hạn dữ liệu và lỗi; không tự chuyển tất cả thành 0.

**Ngày Analytics theo Pacific Time**, dùng America/Los_Angeles (UTC−7/UTC−8 tùy thời điểm). Không đổi nhãn bucket ngày thành UTC+7. Tuần bắt đầu thứ Hai theo lịch báo cáo Pacific; tháng/quý cũng theo lịch này. Timestamp đồng bộ lưu UTC và hiển thị giờ Việt Nam riêng. [Dimensions — Time periods](https://developers.google.com/youtube/analytics/dimensions).

Analytics thường trễ **48–72 giờ**; ngày cuối phản hồi phụ thuộc mọi metric yêu cầu đã xử lý. Hiện “Yêu cầu đến… / Có dữ liệu đến… / Cập nhật lúc…”. Tỷ số và so sánh căn về ngày cuối chung của các thành phần, không dùng doanh thu đến D−3 chia views đến D−1. [Data freshness](https://developers.google.com/youtube/analytics/data_model).

Tổng cấp kênh có thể gồm hoạt động của video đã xóa, trong khi breakdown theo video không trả các video đó. Không ép tổng kênh bằng tổng dòng video; dự án/NV ghi rõ phạm vi ID truy ngược được, không phân bổ phần chênh không xác định cho nhân viên. [Data model](https://developers.google.com/youtube/analytics/data_model).

## 4. Giao diện dùng chung

### 4.1. Hình thức

- Sidebar khoảng 260 px; mobile thu gọn, nhóm Báo cáo mở đúng trang.
- Giữ màu styles.css: nền #080B11, sidebar #0B0F19, card #111726, chữ #F1F5F9 / #94A3B8.
- Đỏ #FF0033 cho thương hiệu/menu; xanh dương cho views, amber cho doanh thu, tím cho giờ xem. Màu đối tượng ổn định giữa chart/legend.
- Plus Jakarta Sans; số tabular/JetBrains Mono; giảm glow, ưu tiên đọc bảng.
- Bo góc 12–16 px, gap 20–24 px; KPI gọn. Tablet lọc hai cột, mobile drawer; bảng cuộn ngang trong khung, giữ cột định danh.

### 4.2. Cấu trúc

Tiêu đề → Bộ lọc → Phạm vi/độ mới → Nội dung chính → Chi tiết/bảng → Chú thích.

Header có Làm mới, Xuất CSV, lần cập nhật. Không badge Realtime. Bộ lọc có Áp dụng, Đặt lại, chip, Lọc nâng cao; preset 7/28/90 ngày, tháng này/tháng trước/tùy chọn. Luôn thấy kỳ yêu cầu/kỳ có dữ liệu, Pacific Time, tiền tệ, loại nội dung và trạng thái thiếu.

Dải nguồn dưới bộ lọc thể hiện riêng **Public: x/y kênh đã cập nhật**, **Analytics: a/y kênh có dữ liệu**, **Doanh thu: b/y kênh có dữ liệu**, trong tập kênh đang chọn và kỳ tương ứng. Nhãn trên từng card/bảng ghi **Tổng một phần · b/y kênh** khi thiếu; số kênh có doanh thu có thể khác số kênh có views. Không dùng một đèn xanh chung để suy ra mọi chỉ số đều đầy đủ.

Giữ bộ lọc khi nhóm → kênh → video hoặc NV biểu đồ ↔ số liệu. Channel picker ở header chỉ dùng trang kênh; trang khác chọn đúng đối tượng. Bộ đếm lifetime và hiệu suất kỳ không nằm chung cột không nhãn.

### 4.3. Chart và bảng

Một chart một đơn vị; tối đa 5 đối tượng mặc định. Ngày/tháng từ report hợp lệ; tuần/quý tổng hợp dữ liệu cộng được. Views, phút xem, revenue, tương tác và gained/lost chỉ cộng trên phạm vi rời nhau hỗ trợ. Average/rate/CPM ưu tiên query aggregate, không mean tùy ý; proxy doanh thu tính lại từ tổng tử/mẫu.

Retention có trục vị trí video, không cộng thành retention nhân viên/network, không ép tỷ lệ xem lại về 100%. Không nội suy khoảng thiếu. Tooltip có nguồn, đơn vị, kỳ, phạm vi, ngày sẵn sàng; snapshot ghi timestamp riêng.

Bảng căn phải số, header/cột định danh cố định; sort, chọn cột, phân trang, cuộn ngang, dòng tổng đúng metric. Chart có bảng thay thế để dùng bằng bàn phím.

## 5. Thiết kế từng mục

### 5.1. Báo cáo — bảng đối soát nhiều kênh

**Route:** #view-report-overview. **Mục đích:** đối soát các kênh trong cùng kỳ, xuất số ngày/tháng.

**Bố cục:** bộ lọc mở rộng → độ mới → KPI gọn → pivot.

**Lọc:** nhiều kênh/dán ID hoặc URL từng dòng; team cây; dự án/network/NV; kỳ; ngày/tuần/tháng; metric; loại nội dung; currency; chế độ. Cùng chiều OR, khác chiều AND; có Chưa phân công.

**KPI:** views, doanh thu ước tính, giờ xem, subscribers ròng, tổng tương tác (mở likes/comments/shares). Số kênh thành công/thiếu quyền đặt ở dải vận hành.

**Pivot:** STT | Avatar + Kênh | Chỉ số | Tổng kỳ / Tỷ số kỳ | Ngày/Tuần/Tháng…

- Mặc định views, doanh thu, giờ xem; mở gained/lost/ròng, likes/comments/shares và proxy doanh thu theo loại nội dung.
- Lượng cộng được có Tổng kỳ; tỷ số/average/CPM dùng kết quả cả kỳ, không tổng ô ngày.
- Mở kênh, thu gọn metric, đổi cột, xuất đúng phạm vi. Dán ID báo riêng trùng/sai/không tìm thấy.
- Kênh lỗi vẫn có dòng; ô thiếu monetary ghi trạng thái đúng. Public counters ở tab riêng.

**Nghiệm thu:** mỗi ô truy ngược query/kỳ/ID; không trộn lifetime với trong kỳ; pivot và CSV khớp.

### 5.2. Báo cáo theo team

**Route:** #view-report-team. **Mục đích:** so sánh danh mục kênh/video của các team.

**Bố cục:** lọc → tóm tắt phạm vi → chart xếp dọc → bảng → kênh/video cấu thành.

**Lọc:** team cha/con, network/dự án, kỳ/độ hạt, vai trò quản lý kênh/phụ trách video, loại nội dung, currency, chart.

**KPI/chart:** doanh thu ước tính, views, giờ xem, subscribers ròng; số kênh/video phân công là thông tin quản lý. Mặc định Views + Doanh thu; bật giờ xem, gained/lost, likes/comments/shares, mỗi metric một panel.

**Bảng:** Team | Kênh/Video | Views | Giờ xem | Doanh thu ước tính | Doanh thu API/1.000 views hoặc engaged views | Gained | Lost | Ròng | Tương tác | Có dữ liệu đến.

**Quy tắc:** team cha tính mỗi ID một lần; ngày hiệu lực phân công áp dụng cho số kỳ. Gained/lost cấp kênh khác phạm vi video. Bàn giao giữa một ngày Analytics không tự chia số theo giờ; hiện Ngày bàn giao chưa phân bổ hoặc quy tắc nghiệp vụ rõ.

**Nghiệm thu:** tổng và chi tiết cùng nguồn/kỳ/phân công, không cộng trùng và không ép tổng video bằng tổng kênh.

### 5.3. Báo cáo theo dự án

**Route:** #view-report-project. **Mục đích:** xem hiệu suất/doanh thu danh mục nội dung dự án trên một hoặc nhiều kênh.

**Bố cục:** lọc → KPI → xu hướng/so sánh → bảng dự án → video.

**Lọc:** dự án/team/kênh, ngày công khai, kỳ Analytics, độ hạt, loại nội dung, currency; hai bộ ngày có nhãn riêng.

**KPI:** số video, views kỳ, giờ xem, doanh thu ước tính, proxy doanh thu/1.000 lượt xem theo loại. Không cost/profit/ROI khi chưa có nguồn.

**Chart:** doanh thu + views theo thời gian, bật giờ xem/tương tác/gained-lost phạm vi video khi report hỗ trợ; một dự án phân rã theo kênh/video, nhiều dự án tối đa 5 chuỗi.

**Bảng:** Mã/Tên dự án | Team | Kênh | Video | Views | Giờ xem | Doanh thu ước tính | Proxy theo loại | Likes | Comments | Shares | Có dữ liệu đến; mở video với thumbnail/ngày công khai và cùng số kỳ.

**Quy tắc:** ưu tiên video_id → project_id, một dự án chính; không gán toàn bộ revenue/views kênh cho vài video dự án. Không chia subscriber kênh; gained/lost video ghi rõ watch-page scope. Phần chênh không truy ngược video không phân bổ cho dự án.

**Nghiệm thu:** dự án chung kênh vẫn có danh mục riêng, không cộng lặp hoặc lấy video ngoài dự án.

### 5.4. Báo cáo theo kênh

**Route:** #view-report-channel. **Tên trang:** So sánh hiệu suất kênh.

**Quyết định thiết kế cập nhật 29/10/2026:** thay khối hai thẻ Lunavia/80s Groove và huy hiệu VS trong ảnh tham khảo bằng biểu đồ so sánh nhiều kênh. Bỏ tên kênh cố định trong tiêu đề, các nút Đồng bộ 2 kênh/Xuất đối đầu và ma trận chỉ dành cho một cặp. Thông tin hồ sơ từng kênh chuyển vào chi tiết khi người dùng mở kênh đó.

**Mục đích:** trả lời hai câu hỏi: kênh nào có kết quả cao hơn trong cùng kỳ, và xu hướng của từng kênh thay đổi thế nào theo thời gian.

**Bố cục từ trên xuống:**

1. Tiêu đề + nguồn/độ mới + Xuất báo cáo.
2. Bộ chọn nhiều kênh và kỳ so sánh; các kênh đang chọn hiển thị bằng chip.
3. Bộ chọn chỉ số.
4. Biểu đồ đường xu hướng nhiều kênh và biểu đồ thanh so sánh kết quả trong kỳ.
5. Bảng tóm tắt gọn để đọc con số và mở chi tiết.

**Bộ lọc:**

- Chọn nhiều kênh bằng tìm tên/@handle/ID và checkbox; có chọn tất cả, bỏ chọn và gỡ từng chip. Mặc định 3 kênh để thấy ngay khả năng so sánh nhiều kênh.
- Hỗ trợ hơn 2 kênh; khuyến nghị hiển thị 3–5 đường để dễ đọc, không khóa cứng danh sách ở hai kênh mẫu. Khi chọn nhiều hơn, legend xuống dòng và cho ẩn/hiện từng đường.
- Cùng ngày bắt đầu/kết thúc, nhóm ngày/tuần/tháng, loại nội dung và tiền tệ. Team/dự án/network/NV nằm trong Lọc nâng cao.
- Nút Áp dụng cập nhật cả hai biểu đồ và bảng từ cùng phạm vi; Đặt lại khôi phục lựa chọn mặc định. Hiện rõ thay đổi chưa áp dụng, kỳ đang hiển thị và ngày dữ liệu khả dụng chung.

**Chỉ số so sánh:** Views, Doanh thu ước tính, Giờ xem, Subscribers ròng và Doanh thu API/1.000 views (RPM tự tính). Gained/lost, tương tác, CPM hoặc AVD/APV có thể mở trong lựa chọn nâng cao khi report hỗ trợ. Một thời điểm so sánh một chỉ số, mỗi chart một đơn vị; chuyển chỉ số giữ nguyên kênh và kỳ.

**Biểu đồ đường — xu hướng:**

- Trục X là thời gian, trục Y là chỉ số đã chọn; một đường cho mỗi kênh. Màu kênh cố định giữa biểu đồ đường, biểu đồ thanh, legend và bảng.
- Legend có tên và dấu màu; nhấn để ẩn/hiện đường, có cách hiện lại khi đã ẩn hết. Tooltip cùng mốc thời gian cho phép đối chiếu các kênh và có đơn vị rõ.
- Không xếp chồng views của các kênh thành đường tổng làm che khác biệt. Không làm mượt hoặc điền điểm thiếu thành số tự suy.
- Nếu chỉ chọn một kênh, vẫn dùng cùng chart, không quay về hai thẻ VS.

**Biểu đồ thanh ngang — so sánh trong kỳ:**

- Mỗi thanh là một kênh, sắp theo chỉ số đã chọn; hiển thị kết quả cả kỳ tương ứng với chart xu hướng.
- Các lượng cộng được dùng tổng kỳ; RPM, CPM và các trung bình dùng cách tổng hợp đúng mục 3, không cộng hoặc lấy trung bình tùy ý các ô ngày.
- Giữ màu kênh và hỗ trợ giá trị âm cho subscriber ròng. Thiếu dữ liệu không biến thành thanh giá trị 0.

**Bảng hỗ trợ:** một dòng/kênh, các cột Kênh | Views kỳ | Doanh thu ước tính | Giờ xem | Subscribers ròng | Doanh thu API/1.000 views | Có dữ liệu đến. Bảng là phần hỗ trợ biểu đồ, không khôi phục ma trận đối đầu có hai cột kênh và các câu đánh giá thắng/thua cố định.

Desktop có thể đặt hai chart cạnh nhau, chart xu hướng rộng hơn; tablet/mobile xếp dọc. Bảng cuộn ngang trong khung, mobile chỉ giữ cột định danh tối thiểu để còn vùng đọc số. Giữ font, màu, card và dark/light của Antigravity hiện tại.

**Chi tiết theo yêu cầu:** nhấn tên kênh/dòng bảng để mở hồ sơ và danh sách video đúng kênh, cùng kỳ/bộ lọc. Thông tin PIC/team/dự án, subscribers/views cộng dồn nằm tại đây. Video có drawer riêng cho xu hướng/retention; các tab quốc gia, nguồn, thiết bị và tài chính chỉ hiện khi được report hỗ trợ.

**Quy tắc dữ liệu:** cùng kỳ, tiền tệ, loại nội dung và ngày khả dụng chung. Analytics cung cấp số trong kỳ; metadata/public lifetime tách nhãn. RPM tự tính theo công thức nguồn, tách Shorts theo mẫu số phù hợp, không khẳng định trùng Studio. Fixture của prototype phải ghi minh họa ở cả biểu đồ, bảng và CSV, không được trình bày như monetary đã xác thực.

**Phạm vi bộ lọc:** khi lọc dự án/NV/ngày công khai và giới hạn danh mục video, cả hai chart và bảng cùng chuyển sang tập đó, nhãn **Theo bộ lọc**. Hồ sơ lifetime vẫn ghi **Toàn kênh**; gained/lost theo video có nhãn theo trang xem video, không thay tổng gained/lost kênh.

**Nghiệm thu riêng cho thay đổi này:**

- Không còn hai hero card, VS, tên cặp cố định hoặc ma trận chỉ so sánh hai kênh.
- Chọn 3 kênh rồi thêm kênh thứ 4/5: đường, thanh, legend và dòng bảng cập nhật đúng lựa chọn.
- Đổi chỉ số và kỳ vẫn giữ các kênh; tổng/rate khớp bảng và CSV.
- Gỡ hết kênh, ẩn hết đường, kỳ không hợp lệ hoặc thiếu dữ liệu đều có trạng thái rõ và thao tác phục hồi.
- Mobile đọc được biểu đồ và bảng; light mode giữ độ tương phản; thao tác được bằng bàn phím.
- Mở chi tiết không quay về hai kênh mẫu; quay lại vẫn giữ lựa chọn so sánh.

### 5.5. Báo cáo theo network

**Route:** #view-report-network. **Mục đích:** đánh giá tập kênh có quyền và độ mới.

**Lọc:** network/team/kênh, kỳ/độ hạt, loại nội dung/currency; có Chưa gán network.

**KPI:** số kênh đã gán/cập nhật; views, revenue ước tính, giờ xem, subscribers ròng. Phân biệt vận hành và Analytics.

**Chart:** views/revenue theo thời gian, cơ cấu theo kênh/team; bật giờ xem/gained-lost. Không retention trung bình network.

**Bảng:** Network/Kênh | Phụ trách | Views | Giờ xem | Revenue ước tính | Proxy theo loại | Gained | Lost | Shares | Quyền/Độ mới. Tỷ trọng cùng mẫu số phạm vi, thiếu kênh ghi tổng một phần.

**Quy tắc:** network nội bộ không tự là MCN/Content Owner; backend xác minh grant riêng cho tập kênh trước khi truy vấn/tổng hợp. Một network chính mỗi kênh tại một thời điểm. Tổng subscribers không là khán giả duy nhất; tỷ số nhóm không cộng/mean tỷ số kênh. Bộ đầu vào hiện chưa có network: trang hiện “Chưa cấu hình network”, không tự tạo MCN hoặc gộp 15 kênh vào một network giả.

**Nghiệm thu:** đúng lịch phân nhóm, không bỏ kênh lỗi rồi gọi tổng đầy đủ, tỷ số tính từ thành phần hợp lệ.

### 5.6. Báo cáo theo NV — biểu đồ

**Route:** #view-report-staff-chart. **Mục đích:** xem kết quả nội dung/kênh được giao, không khẳng định quan hệ nhân quả cá nhân.

**Bố cục:** lọc NV/vai trò → phạm vi → KPI gọn → chart xếp dọc → danh mục giải thích. Xem số liệu giữ lọc sang 5.7.

**Lọc:** NV/team/vai trò quản lý kênh hoặc phụ trách video/dự án; kỳ/độ hạt/loại/currency/chart.

**KPI/chart:** views, revenue ước tính, giờ xem; bật likes/comments/shares, gained/lost/ròng đúng report. Mặc định Views + Doanh thu; mỗi người một chuỗi, tối đa 5. Proxy theo loại ở card/bảng phụ, không chart tổng RPM cộng các người.

**Quy tắc:** quản lý kênh dùng report kênh; phụ trách video dùng danh mục được giao. Gained/lost video chỉ ở trang xem, không là toàn bộ subscriber do NV tạo ra. Một người báo cáo chính mỗi video/role; cộng tác không nhân đôi. Ngày hiệu lực và ngày bàn giao Pacific có quy tắc rõ; snapshot không chia được doanh thu ngày.

**Nghiệm thu:** chuỗi mở được ID cấu thành; chart/số liệu cùng kỳ/role, không phân phần chênh tổng kênh không truy ngược cho NV.

### 5.7. Báo cáo theo NV — số liệu

**Route:** #view-report-staff-data. **Mục đích:** đối soát chỉ số/doanh thu ước tính theo nhân viên và ngày/tháng.

**Bố cục:** lọc như chart → metric → pivot → ID cấu thành. Xem biểu đồ giữ nguyên lựa chọn.

**Pivot:** STT | Nhân viên | Team/Vai trò | Tổng kỳ / Tỷ số kỳ | Ngày/Tuần/Tháng…

- Mặc định Doanh thu ước tính; chọn views/giờ xem/likes/comments/shares/gained/lost/ròng/proxy theo loại; một metric mỗi bảng.
- Tab Tóm tắt: NV | Team | Kênh/Video | Views | Giờ xem | Revenue | Proxy theo loại | Gained | Lost | Ròng | Tương tác | Có dữ liệu đến.
- Giữ cột định danh/tổng, cuộn các mốc; mở ID/ngày phân công/kỳ/query để đối soát.
- Dòng tổng chỉ từ phạm vi không lặp. Không tự tạo % KPI/xếp loại khi chưa có nguồn nội bộ.
- CSV đúng metric/currency/content type/kỳ và trạng thái thiếu.

**Nghiệm thu:** revenue ngày cộng đúng kỳ khả dụng; tỷ số kỳ tính lại từ tử/mẫu; không cộng lifetime counters thành hiệu suất.

### 5.8. Hướng dẫn

**Route:** #view-report-guide. **Mục đích:** giải thích nguồn, 7 báo cáo và ý nghĩa số liệu.

**Bố cục:** tìm kiếm → mục lục → bài ngắn/link thao tác; desktop mục lục trái, mobile thu gọn. Ví dụ ghi Ví dụ minh họa.

Nội dung: kết nối Data/Analytics và quyền monetary; thêm kênh; cấu hình nhóm/NV/ngày hiệu lực; hướng dẫn lọc/pivot/chart/drill-down/export; hiệu suất kỳ vs hiện tại/snapshot; Pacific Time và timestamp giờ Việt Nam; độ trễ 48–72 giờ; từ điển views/engagedViews/giờ xem/tương tác/gained-lost/revenue/CPM/proxy; revenue có điều chỉnh và không đủ mọi nguồn Studio; thiếu/0/quyền/lỗi/tổng một phần; lưu giữ/xóa.

**Nghiệm thu:** thuật ngữ có trợ giúp; không hứa số quyết toán, RPM trùng Studio hoặc metric/tổ hợp chưa hỗ trợ.

## 6. Kiến trúc, đồng bộ và quyền

### 6.1. Luồng

Data API (catalog/counters) + Analytics (số kỳ) → Backend OAuth/quyền/chuẩn hóa → Kho catalog/Analytics/query log/snapshot phụ → Phân công có hiệu lực → Lớp truy vấn chung → 8 trang + CSV.

Tái dùng frontend HTML/CSS/JS; backend quản lý token, API, cache, job và quyền. localStorage chỉ lưu UI/bộ lọc, không là kho token/lịch sử chung. Credentials ở server/secret store, không trong JavaScript phát cho trình duyệt.

### 6.2. Endpoint và phạm vi

| Việc | API và quy tắc |
|---|---|
| Nhận diện | Data channels.list ID/forHandle; chuẩn hóa channel ID |
| Danh mục | Uploads playlist + playlistItems.list, 50 mục/trang, nextPageToken |
| Video | Data videos.list chia lô đúng giới hạn; ID thiếu xử lý riêng |
| Số kỳ | Analytics reports.query: ids/startDate/endDate/metrics/dimensions/filters/currency hợp lệ |
| Dự án/NV | Bộ lọc video/group hoặc report hỗ trợ, đúng ID có quyền |
| Phân tích bổ sung | Time/country/traffic/ad reports riêng theo ma trận |
| Retention | Một video với elapsedVideoTimeRatio |

[Data channels](https://developers.google.com/youtube/data/reference/rest/v3/channels/list), [PlaylistItems](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list), [Videos](https://developers.google.com/youtube/data/reference/rest/v3/videos/list), [Analytics query](https://developers.google.com/youtube/analytics/reference/reports/query), [Channel reports](https://developers.google.com/youtube/analytics/channel_reports).

Analytics phân trang theo report và startIndex/maxResults; top video có giới hạn riêng, không coi top là toàn danh mục. Lô filter ID tuân giới hạn; chỉ cộng các lượng cộng được trên phạm vi không trùng, không mean ratio giữa lô.

### 6.3. Kho dữ liệu

| Nhóm | Dữ liệu chính |
|---|---|
| channels / videos | ID, metadata, channel relation, publishedAt, duration, truy cập |
| analytics_query_runs | Report/params/grant, kỳ yêu cầu/khả dụng, timezone, fetched_at, lỗi |
| analytics_facts | Dimension/period, metric values, currency/content type, query key, revision |
| channel/video_snapshots | Public counters, observed_at, trường thiếu, retention class |
| teams/projects/networks/employees | Quan hệ nội bộ |
| assignments | ID, nhóm/người chính, role, valid_from/to, quy tắc bàn giao |
| sync_runs / access_grants | Tiến độ/lỗi/quota; scope/kênh/owner/quyền, verify/revoke |

Query/cache key có API/report, owner/kênh/ID scope, kỳ, dimensions/filters, currency/content type và phạm vi grant. Kết quả có metric basis, report timezone, ngày khả dụng, fetched_at, phạm vi, đầy đủ/thiếu và công thức tỷ số.

### 6.4. Đồng bộ và điều chỉnh

- Lần mở đầu nạp snapshot đã có để giao diện dùng được ngay. Khi đồng bộ catalog đầy đủ, phân trang và ghi tiến độ/phạm vi; không tự gọi 150 video mẫu là toàn danh mục. Kiểm tra grant và truy vấn lịch sử Analytics sẵn có cho đúng kênh; không đợi snapshot một tháng.
- Data API khởi điểm mỗi 6 giờ theo quy mô/quota, ghi timestamp thực; snapshot có chính sách lưu giữ riêng.
- Analytics tải hằng ngày, theo dõi ngày cuối report; đề xuất refresh cửa sổ gần đây và kỳ tháng gần nhất để nhận số trễ/điều chỉnh. Đây là lịch ứng dụng, không cam kết quyết toán.
- Upsert theo query/dimension/period và revision, không cộng chồng lần refresh.
- Nhóm report nhanh/monetary có thể tải riêng; tỷ số/so sánh phải căn ngày chung.
- Đổi tab dùng cache; Làm mới có cooldown; retry/backoff; quota hết giữ lần thành công với nhãn cũ, không chuyển demo.
- Đọc quota thực tế từng API/project, tránh hardcode giả định cũ.

### 6.5. OAuth, phân quyền, lưu giữ

Tái sử dụng OAuth client ID/client secret của dự án; không tạo client mới chỉ vì thêm Analytics. Luồng đọc báo cáo yêu cầu các scopes phù hợp: `youtube.readonly`, `yt-analytics.readonly`, `yt-analytics-monetary.readonly` cho phần tiền; giữ quyền của chức năng cũ đang được sử dụng. Quyền mới cần được yêu cầu trong luồng OAuth và cấp lại, không chỉ thêm vào màn hình consent. Backend refresh token, bảo vệ credential, xử lý revoke/expiry và liên kết lại. [Reports.query](https://developers.google.com/youtube/analytics/reference/reports/query), [Authorization](https://developers.google.com/youtube/reporting/guides/authorization).

Chủ sở hữu kênh thực hiện kết nối là phương án ưu tiên cho Analytics/doanh thu. Kênh phải đáp ứng điều kiện YPP và quyền monetary để lấy chỉ số tiền. Email được mời làm Người quản lý qua YouTube Studio không tự có quyền truy cập YouTube APIs, dù có thể xem tiền trong Studio. Quản lý Brand Account theo cơ chế cũ là loại quyền khác; không bảo đảm quyền monetary chỉ từ tên vai trò. [Channel reports](https://developers.google.com/youtube/analytics/channel_reports#Authorization), [Quyền Studio](https://support.google.com/youtube/answer/9367690?hl=en).

Nếu app còn ở Testing, Test users là danh sách **email Google**, không phải danh sách channel ID. Một email có nhiều kênh chỉ thêm email đó một lần vào Test users; app vẫn phải kết nối/xác minh phạm vi cho từng kênh tương ứng. Test user không tự có quyền sở hữu kênh hay quyền monetary. Thiết kế lỗi 403 do app Testing tách khỏi lỗi thiếu quyền Analytics/YPP. [Google Auth Platform Audience](https://support.google.com/cloud/answer/15549945?hl=en).

Lưu grant/token theo phạm vi kênh ở backend. Một lần kết nối kênh không được ghi đè grant của kênh khác hoặc tự cấp cho 14 kênh còn lại. Chỉ đánh dấu quyền khả dụng từ scopes và kết quả kiểm tra API phù hợp, kèm lần xác minh; không coi sự tồn tại của file token, `connected: true` hay thông tin hồ sơ là bằng chứng đọc được tiền. Nhân sự phụ trách trong dashboard là phân quyền nội bộ, độc lập với người thực hiện OAuth.

Vai trò xem số liệu, xem monetary và export được kiểm tra server; quản trị nghiệp vụ không tự xem tài chính mọi kênh. Nhóm nội bộ không thay quyền sở hữu/tổng hợp.

Chính sách lưu giữ phân biệt public/authorized, metadata và derived metrics; có refresh/xóa/xác minh quyền định kỳ. OAuth không tự cho phép lưu vô hạn, giới hạn public không đồng nghĩa cấm truy vấn mọi lịch sử Analytics. Áp dụng đúng điều kiện thực tế, không tạo thêm xác nhận trong luồng xem số liệu. [Developer Policies](https://developers.google.com/youtube/terms/developer-policies), [Policy guide](https://developers.google.com/youtube/terms/developer-policies-guide), [Derived metrics/storage](https://developers.google.com/youtube/terms/derived-metrics-policy).

### 6.6. Bộ dữ liệu mẫu theo hierarchy

**Nguồn chuẩn:** `data/mock-hierarchy/dataset.json`. Tài liệu sử dụng: `data/mock-hierarchy/README.md`. Có `hierarchy-preview.json` để xem cây, `assignments.csv` để đối chiếu phân công và `validation.json` ghi kết quả kiểm tra.

| Team mẫu | Nhân sự | Kênh phụ trách | Video mẫu từ API |
|---|---:|---:|---:|
| Jazz & Lo-fi | 5 | 5 | 50 |
| Retro & Electronic | 5 | 5 | 50 |
| Indie & Chill | 5 | 5 | 50 |
| Tổng bộ dữ liệu | 15 | 15 | 150 |

Đây là số lượng bản ghi mẫu, không phải tổng hiệu suất của các chủ kênh.

**Quan hệ chuẩn:** `teams.id → employees.team_id → assignments.employee_id/channel_id → channels.id → videos.channel_id`. Một nhân sự thuộc một team, có đúng một phân công kênh hiện hành; một kênh chỉ được gán cho một nhân sự trong bộ mẫu. Phân công có ngày hiệu lực và nguồn `mock_org`.

**Hai lớp nguồn cần hiển thị tách biệt:**

- Tổ chức: 3 team, 15 tên nhân sự và 15 quan hệ phân công là minh họa; không khẳng định những người này quản lý thực các kênh công khai.
- YouTube: tên/avatar/handle/channel ID, public counters và danh sách video trong bộ này lấy từ API; mỗi bản ghi có `source.kind = live_public_snapshot`, `source.fetched_at`, API và method. Đây là ảnh chụp dữ liệu tại lần lấy, không tự cập nhật khi mở ứng dụng.

**Áp dụng cho giao diện:**

- Quản lý team lấy đúng 3 team; danh sách nhân sự mở xuống đúng 5 người.
- Quản lý kênh có 15 dòng, hiện team và nhân sự qua foreign key; chọn team/NV ở mọi trang phải cho cùng danh sách kênh.
- Quản lý video lấy 150 bản ghi có channel ID hợp lệ; lọc một nhân sự tương đương lọc kênh của người đó. Kênh có 10 video mẫu, không gọi là toàn bộ video kênh.
- Báo cáo theo team/NV/kênh dùng cùng quan hệ ID; không tạo một bộ phân công riêng cho từng trang.
- Snapshot public chỉ cung cấp bộ đếm cộng dồn. Chọn kỳ không được biến các bộ đếm này thành số phát sinh theo ngày/tháng.

**Giới hạn của bộ dữ liệu lần này:** Analytics chưa được kết nối nên doanh thu, RPM, giờ xem, gained/lost, shares và period metrics để `null` với trạng thái `not_connected`. Không điền công thức giả vào các trường này. Thiết kế Analytics theo các mục trước vẫn giữ nguyên; khi có nguồn được cấp quyền thì bổ sung lớp Analytics theo cùng channel ID. `projects`, `networks`, `costs` để trống cho đến khi có cấu hình được chốt.

**Nghiệm thu dữ liệu:** đúng 3 team, 15 NV, 15 kênh duy nhất, 15 phân công 1:1; 150 video duy nhất đúng kênh; Unicode không hỏng; nguồn/timestamp đầy đủ; subscriber ẩn/thiếu khác 0; không có credentials trong dữ liệu bàn giao. `validation.json` phải được kiểm tra lại khi thay kênh hoặc đồng bộ mới.

### 6.7. Nối dữ liệu vào template và tách các lớp nguồn

Luồng khởi tạo: đọc `dataset.json` → kiểm tra schema/khóa ngoại → tạo danh mục dùng chung → render các trang → tải khả năng truy cập theo kênh từ backend → nạp báo cáo cho phạm vi đang chọn. Không sao chép lại 15 kênh hoặc số tổng vào mảng riêng của từng trang. Các file cây/CSV chỉ dùng đối chiếu, không là nguồn số liệu thứ hai.

| Lớp | Nguồn | Quy tắc |
|---|---|---|
| Tổ chức | `teams`, `employees`, `assignments` | Dữ liệu minh họa, giữ ID/ngày hiệu lực và thông báo không khẳng định sở hữu thật |
| Catalog/public ban đầu | `channels`, `videos` trong dataset | Snapshot công khai có `source.fetched_at`; số video đã nạp khác tổng video công khai |
| Catalog/public sau đồng bộ | Phản hồi Data API hợp lệ | Upsert theo channel/video ID, timestamp/phạm vi từng bản ghi; cập nhật một kênh không ghi đè kênh khác |
| Hiệu suất | Analytics qua backend với grant đúng kênh | Số kỳ và chuỗi ngày từ report hợp lệ; có tiền tệ, ngày khả dụng và trạng thái từng nhóm metric |
| Minh họa bố cục | Fixture demo riêng nếu cần duyệt thiết kế | Chỉ ở chế độ “Xem minh họa”, tách dữ liệu/CSV/cache; không là fallback khi API lỗi |

Frontend dùng một lớp dữ liệu chung để đọc hierarchy, public counters, khả năng truy cập và report. Backend trả tối thiểu: channel ID/phạm vi ID, report/metric/dimensions/filters, kỳ yêu cầu, kỳ thực có dữ liệu, report timezone, currency/content type, fetched_at, rows, trạng thái/nguồn và phạm vi đầy đủ hay một phần. Đây là hợp đồng cần bổ sung, không khẳng định endpoint hiện tại đã đáp ứng.

`/api/oauth/status` phục vụ trạng thái kết nối; `/api/analytics/test` phục vụ chẩn đoán. Tái sử dụng phần gọi API của chúng để xây luồng báo cáo nhận đúng bộ lọc/kỳ và chuỗi ngày khi cần. Không dùng một phản hồi aggregate của modal để lặp thành số cho từng ngày hoặc mọi kênh. Tách truy vấn số thường và monetary khi cần để lỗi tiền không làm mất views/giờ xem đang được phép đọc.

Kênh OAuth trả về phải khớp channel ID đang truy vấn. Nếu là kênh ngoài 15 kênh mẫu, hiển thị ở khu vực **Kênh đã kết nối · Chưa phân công**, giữ riêng với bộ 15 bản ghi đầu vào; không tự đổi tên, thay ID hoặc áp số của kênh đó vào Lunavia/80s Groove. Gán kênh thực vào tổ chức là cấu hình rõ ràng, không âm thầm tạo phân công hoặc thay bộ mẫu gốc.

Tổng nhóm dùng các kênh có dữ liệu hợp lệ cho metric đang hiển thị. Ví dụ doanh thu có dữ liệu 1/15 kênh thì hiện “Tổng một phần · 1/15 kênh”; proxy doanh thu dùng views của chính tập 1 kênh đó, cùng kỳ khả dụng. Khi không có kênh hợp lệ, tổng là `null`/“—”, không là 0. Cache hoặc dữ liệu lần trước phải giữ nguyên kỳ và timestamp của lần thành công; không đổi nhãn thành kỳ mới khi truy vấn kỳ mới lỗi.

Phân công mẫu bắt đầu ngày 29/10/2026. Nếu báo cáo kết quả theo thời gian phụ trách thì không gán doanh thu trước ngày này cho nhân viên. Góc nhìn danh mục đang phụ trách có thể xem lịch sử kênh với nhãn rõ **Danh mục hiện tại**, không gọi đó là thành tích cá nhân từ ngày nhận phân công.

## 7. Quy tắc chống sai lệch

1. Lifetime từ Data, số kỳ từ Analytics; không snapshot thay report.
2. Thiếu/quyền/lỗi/chưa xử lý khác 0; không tự biến API no-row thành 0.
3. Ngày Pacific, timestamp đồng bộ Việt Nam có nhãn riêng; xử lý DST.
4. Tử/mẫu/so sánh cùng ID/filter/kỳ khả dụng/loại/currency.
5. Cộng metric cộng được trên tập rời nhau; AVD/APV/CPM dùng aggregate phù hợp; proxy tính từ tổng tử/mẫu.
6. Revenue là trường thật, có điều chỉnh; không views × RPM cố định, US 58% hoặc gọi tiền đã trả.
7. Shorts tách mẫu số; không hứa proxy trùng RPM Studio.
8. Gained/lost Analytics khác subscriber công khai làm tròn; scope video khác toàn kênh.
9. Tổng kênh có thể khác tổng breakdown video; không phân phần không xác định cho NV/dự án.
10. Phân công đúng hiệu lực, không cộng trùng cộng tác/tag; ngày bàn giao có quy tắc rõ.
11. Kỳ so cùng ngày đã xử lý; kỳ trước 0 thì phần trăm “—”.
12. Retention một video, đúng trục; không ép ratio xem lại về 100%.
13. Export ghi ID/metric/đơn vị/nguồn/kỳ/timezone/currency/content type/phạm vi/thiếu và công thức; kiểm tra quyền server.

## 8. Trạng thái cần thiết kế

| Trạng thái | Hiển thị |
|---|---|
| Chưa kênh/phân công | Thêm kênh / cấu hình hoặc Chưa phân công |
| Sync đầu | Tiến độ catalog và Analytics riêng, dữ liệu có tới đâu hiện tới đó |
| Chỉ có public snapshot | Xem được metadata/bộ đếm với mốc lấy; phần số kỳ “Chưa kết nối Analytics” |
| Chỉ một số kênh có số | Phạm vi theo từng metric, tổng một phần x/y; kênh thiếu vẫn có dòng |
| Analytics chưa xử lý | Ngày cuối sẵn sàng và giải thích độ trễ |
| Không kết quả | Phân biệt bộ lọc/không hoạt động/no-row/lỗi |
| Thiếu monetary | Chỉ số thường còn; ô revenue ghi Chưa có quyền |
| OAuth hết hiệu lực | Liên kết lại đúng kênh/tài khoản |
| Kênh OAuth ngoài bộ mẫu | Kênh đã kết nối · Chưa phân công; không ghi đè kênh đang xem |
| App Testing chặn email | Giải thích Test users theo email, khác lỗi quyền kênh/monetary |
| Tổ hợp report không hỗ trợ | Giải thích, lựa chọn hợp lệ |
| Partial/quota/API lỗi | Dữ liệu gần nhất, phần thiếu, tổng một phần, retry phù hợp |
| Public counter ẩn | “—”; không ảnh hưởng mặc định tới Analytics |
| Video mất truy cập | Không tự kết luận đã xóa; đúng chính sách dữ liệu |
| Revenue điều chỉnh | Cập nhật/revision tại chi tiết khi cần |
| Snapshot thiếu lịch sử | Chỉ ảnh hưởng tab snapshot, không chặn lịch sử Analytics |

## 9. Triển khai và nghiệm thu

| Giai đoạn | Đầu ra |
|---|---|
| P0 — Nguồn chung | Kiểm tra hiện trạng; nạp dataset 3×5×1; thay catalog/phân công cố định; bỏ badge và công thức giả trong chế độ thật |
| P1 — Trạng thái và quản lý | Quản lý team/kênh/video cùng ID; snapshot/Data sync có nguồn/độ mới; capability theo kênh, trường thiếu và lỗi rõ ràng |
| P2 — Analytics vào báo cáo | Tái dùng OAuth/backend đang có; nối một kênh được cấp quyền vào KPI/chart/bảng/CSV, truy vấn đúng kỳ, money riêng khi cần |
| P3 — So sánh nhiều kênh | Mục 5.4 và pivot tổng; lựa chọn 3/5 kênh, chuỗi ngày thật, bảng hỗ trợ và tổng một phần đúng phạm vi |
| P4 — Các góc nhìn nhóm | Team/NV biểu đồ và số liệu cùng nguồn; dự án/network hiện chưa cấu hình cho đến khi có mapping; không sinh số riêng |
| P5 — Hoàn thiện | Export tải tệp thật, guide, phân tích/video được hỗ trợ, lỗi/quyền, dark/light và responsive; ghi rõ trạng thái kiểm tra API thực tế |

Không đợi đủ 15 grant để hoàn thành P0/P1 hoặc kiểm tra P2 với một kênh. Nếu chưa có kênh được cấp quyền, hoàn thành adapter/UI và nghiệm thu trạng thái thiếu; phần đối chiếu API thật được ghi “Chưa kiểm tra do chưa có grant”, không báo đạt giả.

### Các tình huống bắt buộc bàn giao

| Tình huống | Kết quả chấp nhận |
|---|---|
| Nạp bộ đầu vào | 3 team, 5 NV/team, 15 kênh duy nhất, 15 phân công 1:1, 150 video mẫu; các trang lọc ra cùng tập ID |
| Chưa có OAuth | Public snapshot vẫn xem được; doanh thu/giờ xem/số kỳ “— · Chưa kết nối Analytics”; không có timeline giả |
| Một kênh có Analytics, thiếu tiền | Views/giờ xem hợp lệ vẫn hiện; tiền/proxy báo thiếu; không mất toàn bộ report vì monetary lỗi |
| Một kênh có đầy đủ quyền | Nếu môi trường có grant phù hợp: KPI, chart, bảng, CSV khớp report thật cùng kỳ; 14 kênh còn lại giữ đúng trạng thái thiếu |
| Kênh OAuth ngoài 15 kênh | Hiện riêng Chưa phân công; không thay dữ liệu hoặc grant của bất kỳ kênh mẫu nào |
| Phạm vi thiếu | Doanh thu 1/15 ghi tổng một phần 1/15; proxy dùng views đúng tập/kỳ có tiền; toàn bộ thiếu không hiển thị tổng 0 |
| Chọn 3 rồi 5 kênh | Màu/legend ổn định; chỉ vẽ chuỗi thật có dữ liệu, kênh thiếu vẫn có dòng/trạng thái; bỏ hết lựa chọn có empty state |
| Đổi ngày/metric/currency | Query/cache key và KPI/chart/bảng cùng phạm vi; không lặp aggregate theo ngày, không giữ số kỳ cũ dưới nhãn kỳ mới |
| Số 0, no-row, lỗi API | Số 0 hợp lệ vẫn là 0; no-row/lỗi/thiếu quyền có trạng thái; không dùng `||` thay số 0 bằng dữ liệu mẫu |
| Lỗi/hết quyền hoặc cache cũ | Hiện lỗi hoặc số cũ với mốc cũ; không fallback demo, không báo “Đã cấp đủ quyền” chỉ vì còn token |
| Phân công và mẫu video | Không gán lịch sử trước ngày nhận việc thành thành tích; 10 video mẫu không gọi là toàn bộ hoặc ép bằng tổng kênh |
| CSV và responsive | Tải tệp thật khớp bảng, có nguồn/kỳ/phạm vi thiếu; dùng được ở 1440/768/390 px, dark/light và bàn phím |
| Chưa có dự án/network/chi phí | Hiện Chưa cấu hình; không tạo MCN, cost/profit/ROI hoặc quan hệ mới để làm đầy trang |

Checklist:

- Đủ 8 mục, giữ lọc và drill-down; không số giả hoặc timeline hệ số.
- Catalog trên 50 video tải đủ; top report không bị coi toàn danh mục.
- KPI/chart/bảng/CSV khớp Analytics cùng kỳ; lifetime tách nhãn.
- Ngày Pacific/DST, giờ cập nhật Việt Nam và lag monetary/views đúng.
- Proxy đúng tử/mẫu theo loại và tính lại từ tổng hợp lệ; thiếu thành phần hoặc mẫu số bằng 0 thì “—”, doanh thu bằng 0 với views hợp lệ thì proxy bằng 0; không mean RPM/CPM/AVD/APV.
- Phút → giờ đúng; gained/lost video/kênh rõ; retention từng video.
- Revenue upsert/refresh không cộng lặp, nhận điều chỉnh, currency nhất quán.
- Tổng kênh khác video breakdown được giải thích; không phân chênh cho NV.
- Dự án chung kênh/team cha-con/cộng tác/bàn giao không cộng trùng.
- Quyền số liệu/monetary/export và lưu giữ thực thi ở backend; không lộ credentials.
- Desktop/tablet/mobile và bàn phím dùng được bảng/lọc.

## 10. Giả định thiết kế

- Data API v3 + Analytics API v2 là nguồn đích; quyền và dữ liệu thực tế kiểm tra riêng từng kênh/metric, không mặc định 15 kênh có monetary.
- Dữ liệu tổ chức nghiệm thu dùng 3 team, mỗi team 5 nhân sự và mỗi nhân sự 1 kênh riêng theo `data/mock-hierarchy/dataset.json`; public snapshot đã lấy thật, còn lớp Analytics thực tế trong bộ này chưa kết nối.
- Analytics là nguồn hiệu suất kỳ/lịch sử; Data API catalog/hiện tại, snapshot là phụ.
- Một dự án chính và người báo cáo chính mỗi video/role; cộng tác liệt kê riêng.
- Một team quản lý chính/network báo cáo chính mỗi kênh tại một thời điểm; tag không cộng lặp.
- Network là cấu hình nội bộ; quyền/tổng hợp/lưu giữ theo grant và điều kiện thực.
- Chưa cost/profit/ROI/% KPI hoặc thumbnail impressions/CTR khi chưa có nguồn hỗ trợ.
- Ưu tiên số đúng, phạm vi rõ, dễ đối soát; không hứa khớp mọi số/tính năng Studio.
- Nguồn chung và trạng thái thiếu được triển khai trước; modal test OAuth/Analytics không thay việc đưa dữ liệu vào các báo cáo chính.
