# Bộ Analytics minh họa cho Antigravity

Bộ dữ liệu này bổ sung số liệu còn thiếu để thiết kế và kiểm tra biểu đồ, KPI, bảng, bộ lọc và file xuất của template. Nó liên kết với **3 team, 15 nhân sự, 15 kênh và 150 video mẫu** trong `data/mock-hierarchy/dataset.json` bằng ID.

**Toàn bộ số liệu trong thư mục này là dữ liệu tổng hợp để minh họa. Không phải Analytics, doanh thu, RPM, quyền OAuth hoặc trạng thái kiếm tiền thực của các kênh YouTube được nhắc tên.** Tên/ID thật chỉ giúp giữ cấu trúc danh mục nhất quán. Những con số này không được dùng để đánh giá hiệu suất hoặc dự đoán thu nhập thực của các chủ kênh.

`data/mock-hierarchy/dataset.json` vẫn là snapshot công khai riêng. Không điền số minh họa vào các trường Analytics `null` của file đó, không thay ngày phân công và không biến các bản ghi mẫu thành bằng chứng sở hữu kênh.

## 1. Nguồn và phạm vi thời gian

Các file dữ liệu có phần `meta` để nhận diện nguồn và phần `rows` chứa dữ liệu. Metadata dùng schema `1.0.0`, `source_kind: "synthetic_demo"`, `is_demo: true`, `oauth_authorized: false`, `source_api: null`, nhãn/cảnh báo minh họa, `generated_at` và `seed`. Nguồn tiền gốc là **USD**; ngày báo cáo theo **America/Los_Angeles**.

| Phần | Phạm vi |
|---|---|
| Chuỗi ngày cấp kênh | 01/01/2025–28/10/2026; 666 ngày × 15 kênh = 9.990 dòng |
| Dữ liệu video mẫu và nội dung còn lại | 31/07/2026–28/10/2026; 90 ngày gần nhất của bộ minh họa |
| Phân rã quốc gia/thiết bị/nguồn truy cập | Cùng phạm vi 90 ngày ở trên |
| Kỳ xem mặc định | 01/10/2026–28/10/2026; 28 ngày |
| Tỷ giá minh họa, nếu sử dụng | Ngày và phạm vi ghi trong file; không phải dữ liệu thị trường |

Ngày cuối là ngày cố định của fixture. Khi ứng dụng đang ở ngày khác, không kéo giãn chuỗi cũ, đổi nhãn ngày hoặc sinh thêm số mỗi lần người dùng đổi bộ lọc. Kỳ nằm ngoài dữ liệu phải hiện phạm vi khả dụng; số liệu ngoài phạm vi là thiếu dữ liệu. Tháng 10 và quý IV/2026 mới có dữ liệu đến 28/10, nên phải có nhãn kỳ chưa đầy đủ khi so sánh với tháng/quý trọn vẹn.

Ngày trong các dòng là bucket lịch Pacific của bộ minh họa, không phải ngày Việt Nam. `generated_at` là timestamp tạo file, không phải lần đồng bộ YouTube. Việc hiển thị timestamp theo giờ Việt Nam không làm đổi các bucket ngày.

## 2. Các file bàn giao

| File | Cách dùng |
|---|---|
| `manifest.json` | Danh mục file, số dòng, hash, phạm vi và kỳ mặc định. Dùng để biết chính xác lượng bản ghi đã sinh trong lần chạy hiện tại. |
| `channel_daily.json` | Nguồn cơ sở cho chuỗi ngày, KPI và tổng hợp cấp hệ thống/kênh/team/NV. Một dòng cho một kênh và một ngày. |
| `video_daily.json` | Hiệu suất minh họa theo ngày của 150 video mẫu khi video đã được công khai trong kỳ 90 ngày. Không là toàn bộ danh mục kênh. |
| `other_content_daily.json` | Phần cộng được còn lại ngoài các video mẫu, ở cấp kênh/ngày. Không tạo hoặc giả mạo video ID YouTube để lấp phần này. |
| `video_summaries.json` | Tóm tắt đầy đủ 150 video mẫu; video không có hoạt động trong kỳ giữ trạng thái `no_activity_in_demo_period` và `metrics: null`. |
| `breakdown_daily.json` | Các phân rã minh họa độc lập theo quốc gia, thiết bị và nguồn truy cập; có loại phân rã và ngày để lọc đúng phạm vi. |
| `retention.json` | Đường retention minh họa của từng video mẫu có hoạt động; mỗi đường có 51 vị trí từ 0 đến 1. |
| `summaries.json` | Tóm tắt các kỳ đặt tên sẵn theo hệ thống/kênh/team/NV; không duy trì bằng cách nhập tay riêng với chuỗi ngày. |
| `period_rollups.json` | Tổng hợp theo tháng/quý của các cấp đối tượng; kỳ cuối chưa đầy đủ phải giữ thông tin phạm vi. |
| `daily_fx.json` | Tỷ giá USD/VND hư cấu theo ngày phục vụ thiết kế đổi tiền; mọi kết quả dùng bảng này vẫn là minh họa. |
| `scenarios.json` | Các kịch bản trạng thái và phần ghi đè để kiểm tra thiếu quyền, thiếu dữ liệu, số 0, lỗi và độ trễ. Không phải phản hồi thực từ Google. |
| `channel_summary_28d.csv` | Bảng xem nhanh 15 kênh trong kỳ 01–28/10/2026; UTF-8 BOM, có nhãn minh họa, team/NV, nguồn, tiền tệ và chỉ số. |
| `generate_demo.py` | Sinh lại bộ dữ liệu theo seed; nhận `--generated-at` nếu cần cố định timestamp để tái lập. |
| `validation.json` | Kết quả kiểm tra dữ liệu sau khi sinh. Đọc kết quả và danh sách kiểm tra, không suy rằng file tồn tại là đã đạt. |
| `verify_demo.py`, `independent_validation.json` | Kiểm tra độc lập các file đã xuất, không import generator: hash, tổng hợp tùy kỳ, tiền/rate, hierarchy, video, retention, breakdown, CSV và scenarios. |

Số dòng của các file video, breakdown, retention và các bảng tổng hợp phụ thuộc phạm vi/điều kiện sinh. Lấy số chính xác từ `manifest.json`; không nhập thêm các con số tổng cố định vào UI hoặc duy trì một phiên bản riêng trong từng trang.

Bản đã tạo hiện có **9.990 dòng kênh/ngày, 4.394 dòng video/ngày, 21.600 dòng phân rã, 150 tóm tắt video và 145 đường retention**. Năm video còn lại chưa có hoạt động trong kỳ kết thúc 28/10 nên không tạo retention cho chúng. Có 272 dòng tóm tắt kỳ đặt tên và 1.020 dòng tổng hợp tháng/quý. Bộ dữ liệu chỉ mô hình hóa `VIDEO`; chưa có dữ liệu Shorts hoặc livestream.

Khóa dòng: `channel_daily` dùng `channel_id` + `day`; `video_daily` thêm `video_id`; breakdown thêm `dimension` + `value`. Dòng ngày chứa metric trực tiếp. Dòng summary/rollup chứa `entity_type`, `entity_id`, `period_key`, `channel_ids` và object `metrics`. Dữ liệu manifest/validation là tài liệu chỉ mục/kiểm tra, không dùng `rows`.

## 3. Quan hệ với hierarchy có sẵn

Định danh phải khớp nguồn chuẩn:

- Kênh dùng channel ID của `channels` trong snapshot công khai.
- Video dùng video ID của `videos`, giữ đúng kênh tương ứng.
- Team/NV nối qua `teams`, `employees`, `assignments`; không ghép bằng tên, vị trí mảng, handle hoặc tên viết tắt.
- Tên kênh/avatar/handle/thumbnail và bộ đếm công khai vẫn đọc từ nguồn public riêng. Đừng ghi đè chúng bằng số hiệu suất minh họa hoặc coi tổng mẫu là bộ đếm toàn kênh.

Phân công gốc có hiệu lực từ **29/10/2026**, sau kỳ lịch sử của bộ này. Báo cáo minh họa team/NV sử dụng `attribution_mode: "demo_current_portfolio"` — **Danh mục minh họa theo phân công hiện tại**: phân nhóm lịch sử kênh theo danh mục hiện đang được gán để duyệt bố cục. Đây **không phải thành tích cá nhân trong thời gian phụ trách**, không chứng minh nhân viên đã quản lý kênh ở các ngày lịch sử.

UI phải hiện chú thích này khi mở báo cáo team/NV minh họa. Nếu chuyển sang báo cáo thực theo ngày hiệu lực phân công, dùng quy tắc nghiệp vụ thực của ứng dụng; không tự sửa ngày nhận việc gốc để làm đầy các cột lịch sử.

## 4. Chỉ số và quy tắc tổng hợp

Metric dùng tên camelCase. Đọc giá trị trong `rows`, đơn vị và phần metadata của file thay vì coi hình dạng này là một phản hồi YouTube API nguyên bản.

| Chỉ số | Cách hiểu trong bộ minh họa |
|---|---|
| `views`, `engagedViews` | Hai trường riêng; trong mô hình chỉ có VIDEO này, hai lượng được tạo bằng nhau. Không suy ra điều này đúng cho Shorts hoặc dữ liệu thực. |
| `estimatedMinutesWatched` | Tổng phút xem minh họa; giờ xem = tổng phút / 60. |
| `averageViewDuration` | Giây xem trung bình, tổng hợp lại bằng tổng phút × 60 / tổng views trong phạm vi được định nghĩa. |
| `averageViewPercentage` | Phần trăm xem trung bình; dùng cách tổng hợp có trọng số của generator, không trung bình trực tiếp các phần trăm ngày/kênh. |
| `likes`, `comments`, `shares` | Lượng tương tác riêng; không tự suy shares từ likes khi render. |
| `subscribersGained`, `subscribersLost` | Gained/lost trong kỳ minh họa; net = gained − lost, có thể âm. |
| `estimatedRevenue` | Doanh thu hư cấu trong kỳ, không phải số được chủ kênh xác nhận hoặc API trả về. |
| `estimatedAdRevenue`, `estimatedRedPartnerRevenue` | Thành phần quảng cáo/Premium của mô hình minh họa; không cam kết mô hình này bao phủ mọi nguồn tiền trong Studio. |
| `grossRevenue` | Đại lượng tiền gộp riêng; không cộng vào `estimatedRevenue` như một thành phần thu nhập mới. |
| `adImpressions`, `monetizedPlaybacks` | Mẫu số của các chỉ số quảng cáo; không phải impressions thumbnail hoặc toàn bộ views. |
| `cpm`, `playbackBasedCpm` | Tổng hợp từ tổng tiền gộp và mẫu số quảng cáo tương ứng; không lấy trung bình CPM các dòng. |
| `proxyRpm` | Tỷ số minh họa = tổng `estimatedRevenue` / tổng `views` × 1.000 trên cùng phạm vi. Không phải field RPM chính thức hoặc cam kết khớp Studio. |

Các lượng cộng được như views, phút xem, tương tác, gained/lost và tiền cộng trên tập ID/ngày không trùng. Tiền được tạo/tổng hợp bằng đơn vị nhỏ hoặc số thập phân kiểm soát được trong generator; UI không cộng các chuỗi đã format và không dùng số đã làm tròn trên card làm nguồn tính bảng.

Mỗi khối metric còn có `aggregation_components`, là **thành phần hỗ trợ riêng của fixture, không phải metric YouTube API**:

- `estimated_ad_revenue_cents`, `premium_revenue_cents`, `gross_revenue_cents`: số nguyên cents để cộng tiền chính xác. Doanh thu bằng tổng hai thành phần đầu chia 100.
- `view_percentage_basis_sum`: tử số của mô hình phần trăm xem có trọng số. Tổng hợp tùy kỳ bằng `sum(view_percentage_basis_sum) / sum(views) / 100`, rồi làm tròn 2 chữ số; không cộng các `averageViewPercentage` ngày đã làm tròn. Thiếu views hoặc views bằng 0 thì tỷ lệ là `null`.

Các số tiền hiển thị giữ 2 chữ số thập phân; `proxyRpm`/CPM giữ 4, giờ xem giữ 6, AVD/APV giữ 2. Khi dùng `averageViewDuration`, tính lại từ tổng phút × 60 / tổng views. CSV xem nhanh bỏ object hỗ trợ tổng hợp để dễ mở bằng bảng tính; JSON giữ đầy đủ thành phần chính xác.

Với tỷ số: dùng tổng tử/tổng mẫu của cùng kỳ, cùng tập ID, cùng nguồn, cùng loại nội dung và cùng đơn vị tiền. Doanh thu bằng 0, views hợp lệ lớn hơn 0 cho proxy bằng 0. Thiếu thành phần hoặc mẫu số 0 cho `null`/“—”; không thay bằng RPM mặc định. Khoảng thiếu không tự chuyển thành số 0 hoặc được nội suy.

Không cộng hoặc lấy trung bình các rate/average/CPM/RPM của team, nhân viên và kênh. Các bảng tóm tắt và rollup được tạo từ cùng nguồn ngày để đối soát; nếu adapter tự tổng hợp lại thì phải khớp quy tắc của generator.

## 5. Video mẫu, phần còn lại và retention

`video_daily.json` chỉ bao phủ các video mẫu đã có trong snapshot; không tạo hoạt động trước ngày công khai thực tế theo lịch Pacific. Danh sách 150 video vẫn xuất hiện đầy đủ trong `video_summaries.json`, kể cả video có trạng thái `no_activity_in_demo_period`.

Trong phạm vi 90 ngày, đối với từng metric cộng được và từng kênh/ngày:

```text
channel_daily = tổng video_daily của mẫu + other_content_daily
```

Phần còn lại là một nhóm tổng hợp **“Nội dung khác ngoài mẫu”**, không phải một video thật và không có video ID để mở lên YouTube. Đẳng thức trên thuộc mô hình minh họa, không khẳng định API thực tế luôn cho tổng breakdown video bằng tổng kênh. Với tỷ số/average, cộng các thành phần rồi tính lại, không cộng trực tiếp các tỷ số.

Retention là một đường minh họa riêng cho một video và phạm vi được ghi trong dữ liệu. Trục ngang `elapsedVideoTimeRatio` đi từ 0 đến 1, không là lịch ngày. Không suy retention từ `averageViewPercentage`, không cộng các đường thành retention của team/network và không dùng retention này để đánh giá video thật.

## 6. Phân rã quốc gia, thiết bị và nguồn truy cập

Ba loại phân rã trong `breakdown_daily.json` độc lập:

- **Quốc gia:** US, VN, GB, CA, OTHER; chia views, phút xem và doanh thu minh họa.
- **Thiết bị:** DESKTOP, MOBILE, TABLET, TV, OTHER; chia views và phút xem.
- **Nguồn truy cập:** RELATED_VIDEO, YT_SEARCH, SUBSCRIBER, EXT_URL, PLAYLIST, NO_LINK_OTHER; chia views và phút xem.

Trong cùng một kênh/ngày/loại phân rã, tổng các nhóm phải khớp tổng tương ứng của nguồn kênh. `OTHER` là nhóm phần còn lại do fixture đặt để duyệt bố cục; không cam kết đó là mã dimension chính thức của API ở mọi report.

Không cộng các loại phân rã với nhau và không join chéo thành ma trận country × device × traffic khi file không cung cấp sự kết hợp đó. Những phân rã độc lập này không chứng minh một tổ hợp metrics/dimensions/filters tùy ý được YouTube API hỗ trợ. Khi chuyển sang nguồn thật, adapter phải dùng ma trận report được API cho phép.

## 7. Tiền tệ và tỷ giá minh họa

USD là đơn vị gốc của fixture. `daily_fx.json` phục vụ giao diện USD/VND bằng một bảng **tỷ giá hư cấu**, không lấy từ nguồn thị trường và không phải tham số currency mà YouTube API thực sự trả về.

Các trường tỷ giá là `day`, `base_currency: "USD"`, `quote_currency: "VND"`, `rate`; có 666 dòng cùng phạm vi lịch sử cấp kênh. Đây là số VND minh họa cho một USD, không phải tỷ giá thật của bất kỳ ngày nào.

Nếu dùng VND, tính chuyển đổi theo ngày trước khi cộng các lượng tiền của kỳ; không áp một tỷ giá ngày hiện tại cho toàn bộ lịch sử rồi mô tả là số chuẩn. Tính lại các rate từ tổng tử/mẫu đã chuyển đổi phù hợp. Kết quả và file xuất phải ghi rõ **Tỷ giá minh họa**, currency và phạm vi ngày. Không dùng bảng FX này để quy đổi hoặc bổ sung tiền cho báo cáo thật.

## 8. Kịch bản để duyệt trạng thái

`scenarios.json` chứa dữ liệu trạng thái/ghi đè phục vụ kiểm tra, tách khỏi các dòng cơ sở. Các kịch bản bao gồm đầy đủ dữ liệu, một phần kênh, chưa kết nối, thiếu monetary, không có hàng, hết quyền, doanh thu 0 với views dương, mẫu số 0 và tiền xử lý chậm.

Định danh nằm ở `scenario_id`: `all_demo_ready`, `public_only`, `analytics_without_monetary`, `partial_monetary`, `revoked`, `empty_report`, `zero_revenue_positive_views`, `zero_denominator`, `delayed_monetary`. Dùng `channel_states`, `metric_overrides`, `expected_coverage` và `common_ratio_end` để áp dụng kịch bản. Với override cấp kỳ, cập nhật các thành phần tiền/counter tương ứng trước khi tính lại tổng nhóm; kịch bản tiền bằng 0 có `aggregation_component_overrides` để xóa đúng cents. Không trộn tổng sau override với thành phần của số cũ.

Khi áp dụng một kịch bản:

1. Tạo bản sao/overlay trên dữ liệu demo, không sửa fixture nền hoặc snapshot public.
2. Áp dụng trạng thái và các trường bị ảnh hưởng trước khi tổng hợp; không chỉ thay nhãn trên card.
3. Tính độ phủ riêng cho mỗi metric. Ví dụ tiền hợp lệ của 1/15 kênh phải ghi **Tổng một phần · 1/15 kênh**; proxy dùng views của chính tập kênh/kỳ có tiền.
4. Phân biệt 0 thực sự, `null`, no-row, lỗi, thiếu quyền và chưa xử lý. Không có số hợp lệ thì tổng là “—”.
5. Với tiền chậm, tử/mẫu của proxy dùng cùng ngày cuối khả dụng; views có thể vẫn hiển thị kỳ dài hơn với nhãn riêng.
6. Trạng thái mô phỏng không được cập nhật kho grant/token hoặc badge OAuth thực của ứng dụng.

## 9. Cách Antigravity tích hợp vào template

**Bộ này chưa tự được nối vào template chỉ vì đã xuất hiện trong thư mục dự án.** Antigravity cần bổ sung adapter đọc dữ liệu và chế độ xem riêng; không sửa backend để trả fixture như phản hồi API thật.

Luồng đề xuất:

1. Người dùng chủ động chọn **Xem minh họa**. Toàn bộ vùng số liệu có nhãn dễ thấy **Dữ liệu Analytics minh họa** và chú thích tổ chức/danh mục hiện tại khi thích hợp.
2. Nạp `manifest.json`, sau đó đọc các file cần cho trang/kỳ đang xem. Metadata/ảnh public và hiệu suất demo phải giữ nguồn riêng trên giao diện.
3. Chuẩn hóa dữ liệu qua một adapter dùng chung. KPI, biểu đồ, pivot, bảng chi tiết và CSV lấy cùng tập ID/ngày/metric/scenario, không tự tạo thêm số trong hàm render.
4. Dùng `channel_daily.json` cho báo cáo kênh/hệ thống và tổng hợp danh mục team/NV; dùng video/breakdown/retention khi mở phần tương ứng. Không coi 90 ngày video là lịch sử đủ 666 ngày của toàn kênh.
5. Chọn kỳ mặc định 01–28/10/2026 và giữ thông tin ngày khả dụng khi người dùng đổi kỳ. Tháng/quý chưa đầy đủ có nhãn riêng.
6. Tách cache demo khỏi cache Analytics thật; key có chế độ, phiên bản bộ dữ liệu, phạm vi, currency và scenario. Chuyển chế độ không làm số demo còn hiển thị dưới badge thật.
7. CSV/JSON/tệp báo cáo xuất từ chế độ này phải có nhãn minh họa, nguồn, kỳ, timezone, currency, phạm vi thiếu và công thức chỉ số derived. Không bỏ nhãn nguồn khi tải file.
8. Khi trở về dữ liệu thật, chỉ dùng public snapshot hoặc báo cáo đã có quyền. API lỗi/thiếu quyền không tự chuyển sang demo để lấp số.

Chế độ demo không yêu cầu Client ID, client secret, token, quyền YPP hoặc chủ 15 kênh cấp OAuth. Nó chỉ giúp thiết kế/kiểm tra giao diện; kết quả kiểm tra fixture không được ghi thành “Đã kết nối Analytics/Monetary thành công”.

## 10. Sinh lại và kiểm tra

Chạy generator từ thư mục dự án theo tùy chọn được script hỗ trợ. Ví dụ cố định thời điểm tạo để so sánh hai lần sinh:

```powershell
python data/demo-analytics/generate_demo.py --generated-at 2026-10-29T04:27:28Z
python data/demo-analytics/verify_demo.py
```

Seed và metadata được lưu cùng bộ dữ liệu. Khi đổi dữ liệu đầu vào hoặc thuật toán, sinh lại các bảng phụ, rollup, manifest và validation từ cùng một lần chạy; không sửa tay một vài tổng ở bảng/CSV rồi giữ nguyên file ngày.

Bản hiện tại có **21 kiểm tra nội bộ và 21 kiểm tra độc lập đạt**. Bộ kiểm tra độc lập đọc lại 14.384 dòng kênh/video và đối soát 1.292 dòng summary/rollup từ JSON, gồm APV chính xác khi tổng hợp tùy kỳ. Script chỉ dùng thư viện chuẩn Python, không gọi Google API và không đọc credential/token. Trên Windows thiếu gói múi giờ, script có phương án tính lịch Pacific cho năm 2007–2100 theo quy tắc DST Hoa Kỳ; bộ hiện tại chỉ có ngày 2025/2026.

`validation.json` cần xác nhận ít nhất:

- Đúng tập channel/video ID và quan hệ hierarchy; không có ID trùng theo khóa ngày/đối tượng.
- Đúng 9.990 dòng kênh/ngày trong phạm vi đã công bố và đúng tập 150 video mẫu ở bảng tóm tắt.
- Không có hoạt động video trước ngày công khai; video không có hoạt động giữ trạng thái đúng.
- Phút→giờ, gained−lost, tổng tiền và các công thức tỷ số đúng; mẫu số 0/thiếu và doanh thu 0 được phân biệt.
- Các bảng kỳ/tháng/quý và tổng nhóm khớp dữ liệu ngày; tiền không cộng trùng, tỷ số không lấy mean các dòng.
- Mẫu video + nội dung còn lại khớp lượng cộng được của kênh trong 90 ngày.
- Từng phân rã độc lập khớp tổng tương ứng; retention đúng video và trục vị trí.
- Nhãn/source metadata là demo, không có credential/token hoặc khẳng định OAuth/YPP thực.
- Snapshot public gốc và ngày phân công gốc không bị thay đổi; manifest khớp các file của lần sinh.

Kiểm tra cấu trúc/tổng số chỉ xác nhận tính nhất quán nội bộ của bộ minh họa. Kiểm tra trình duyệt, lọc, CSV và kết nối Google thật vẫn là các hạng mục riêng trong kế hoạch Antigravity.
