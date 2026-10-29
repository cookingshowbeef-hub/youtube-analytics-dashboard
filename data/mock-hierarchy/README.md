# Bộ dữ liệu bàn giao Antigravity: 3 team, 15 nhân viên, 15 kênh

Bộ dữ liệu dùng cơ cấu tổ chức hư cấu để thiết kế và kiểm tra các màn hình Quản lý team, Quản lý kênh, Quản lý video và Báo cáo. Tên kênh, metadata và bộ đếm công khai là ảnh chụp dữ liệu đã lấy từ YouTube Data API v3; tên nhân viên và quan hệ phân công là dữ liệu minh họa.

**Không có khẳng định các nhân viên hoặc team này thực sự quản lý, sở hữu hay đại diện cho các kênh công khai.** `meta.ownership_claim` là `false`.

Quy mô đã kiểm tra: **3 team × 5 nhân viên = 15 nhân viên; 15 phân công; 15 kênh duy nhất; 150 video mẫu**. Mỗi nhân viên có đúng một kênh phân công chính đang hiệu lực; mỗi kênh thuộc đúng một nhân viên trong bộ minh họa này.

## Các file bàn giao

| File | Vai trò |
|---|---|
| [dataset.json](dataset.json) | Nguồn dữ liệu chuẩn, có cấu trúc chuẩn hóa: metadata bộ dữ liệu, team, nhân viên, phân công, kênh và video. Đọc chỉ số từ đây. |
| [hierarchy-preview.json](hierarchy-preview.json) | Cây team → nhân viên → kênh → danh sách video ID, được sinh từ dataset để kiểm tra bố cục và quan hệ. Không duy trì bộ đếm riêng trong file này. |
| [assignments.csv](assignments.csv) | Bảng đối chiếu 15 phân công, có tên/ID, handle, một số bộ đếm snapshot, số video mẫu và thời điểm lấy dữ liệu. Phù hợp mở nhanh bằng bảng tính. |
| [validation.json](validation.json) | Kết quả kiểm tra số lượng, quan hệ khóa ngoại, tính duy nhất, nguồn dữ liệu, độ phủ mẫu video và trạng thái chưa kết nối Analytics. |

README này mô tả bộ dữ liệu bàn giao; việc nối các màn hình với nguồn dữ liệu chung sẽ do Antigravity thực hiện theo prompt.

## Cấu trúc chuẩn hóa và khóa ngoại

`dataset.json` có các nhóm cấp đầu: `meta`, `teams`, `employees`, `assignments`, `channels`, `videos`, `projects`, `networks`, `costs`. Phiên bản schema hiện tại là `1.0.0`.

| Nhóm | Khóa chính và quan hệ |
|---|---|
| `teams` | `id` là mã team; `name` là tên minh họa. |
| `employees` | `id` là mã nhân viên; `team_id` tham chiếu `teams.id`; tên đầy đủ nằm ở `full_name`. |
| `assignments` | `id` là mã phân công; `employee_id` tham chiếu `employees.id`; `channel_id` tham chiếu `channels.id`. Có `valid_from`, `valid_to`, `is_primary`. |
| `channels` | `id` là channel ID chuẩn của YouTube. Tên thực tế nằm ở `snippet.title`; handle công khai hiện nhận được nằm ở `snippet.customUrl`. |
| `videos` | `id` là video ID chuẩn; `channel_id` tham chiếu `channels.id`. |

Luồng ghép dữ liệu: **team → nhân viên → phân công → kênh → video**. Tìm kênh của nhân viên qua `assignments`, không ghép bằng tên hoặc thứ tự phần tử. Video liên kết với kênh; người phụ trách được xác định qua phân công của kênh.

Ngày hiệu lực minh họa là **29/10/2026** (`meta.assignment_effective_date`). Các phân công hiện có `valid_to: null` và `is_primary: true`. Bộ đếm cộng dồn không trở thành thành tích do nhân viên tạo ra kể từ ngày nhận phân công.

Luôn giữ channel ID/video ID làm định danh và khóa liên kết. Tên kênh, `snippet.customUrl` và handle có thể thay đổi; `requested_handle` chỉ ghi nhận đầu vào đã dùng để tìm kênh. Link `channels[].url` theo channel ID giúp nhận diện đúng đối tượng.

## Cây phân công hiện tại

Tên kênh dưới đây lấy từ JSON đã thu thập, không thay bằng tên dự kiến trước khi xác minh. Ví dụ, tên API hiện trả về cho kênh Lunavia là **Lunavia**.

```text
TEAM-01 · Jazz & Lo-fi
├─ EMP-001 · Nguyễn Văn An → Lunavia
├─ EMP-002 · Lê Minh Anh → Lofi Girl
├─ EMP-003 · Phạm Hà Linh → Chillhop Music
├─ EMP-004 · Đỗ Gia Huy → The Jazz Hop Café
└─ EMP-005 · Trần Ngọc Mai → Cafe Music BGM channel

TEAM-02 · Retro & Electronic
├─ EMP-006 · Trần Minh Bình → 80s Groove Machine
├─ EMP-007 · Nguyễn Hoàng Nam → ThePrimeThanatos
├─ EMP-008 · Võ Thanh Tùng → NewRetroWave
├─ EMP-009 · Phan Bảo Ngọc → The '80s Guy
└─ EMP-010 · Đặng Quốc Bảo → Electronic Gems

TEAM-03 · Indie & Chill
├─ EMP-011 · Hoàng Thảo Vy → MrSuicideSheep
├─ EMP-012 · Trịnh Minh Khang → Chill Nation
├─ EMP-013 · Bùi Quỳnh Chi → College Music
├─ EMP-014 · Đinh Tuấn Kiệt → alexrainbirdMusic
└─ EMP-015 · Dương Khánh An → WaveMusic
```

Mỗi kênh trong cây hiện có 10 video mẫu. ID chi tiết nằm trong `hierarchy-preview.json` và `dataset.json`; `assignments.csv` cung cấp bảng tra nhân viên ↔ channel ID.

## Nguồn dữ liệu và thời điểm lấy

| Phần dữ liệu | Dấu nguồn | Cách diễn đạt trên giao diện |
|---|---|---|
| Team, nhân viên, phân công | `source: "mock_org"`, `is_fictional: true` | “Tổ chức và phân công minh họa”. |
| Metadata và thống kê kênh/video | `source.kind: "live_public_snapshot"`, `source.api: "youtube_data_api_v3"` | “Ảnh chụp dữ liệu công khai YouTube”, kèm thời điểm lấy. |
| Analytics | `analytics.status: "not_connected"` | “Chưa kết nối YouTube Analytics”. |

Đợt thu thập bắt đầu lúc **29/10/2026 01:09:56 UTC**, hoàn tất lúc **01:12:05 UTC**, tương ứng **08:09:56–08:12:05 giờ Việt Nam**. Đây là thời gian của cả đợt thu thập; mỗi kênh/video có `source.fetched_at` riêng và phải dùng mốc đó khi hiển thị độ mới của đối tượng.

`meta.display_timezone` là `Asia/Ho_Chi_Minh`. Timestamp nguồn vẫn giữ định dạng UTC trong file; giao diện có thể chuyển sang giờ Việt Nam và ghi rõ múi giờ.

Từ `live` trong `live_public_snapshot` mô tả dữ liệu thực sự đã được gọi từ API lúc thu thập. **File JSON không tự cập nhật và không làm ứng dụng trở thành hệ thống dữ liệu trực tiếp.** `meta.refresh_mode` là `snapshot_refresh_required`. Khi ứng dụng chưa có luồng đồng bộ đang hoạt động, không gắn badge “Live”, “Realtime” hoặc “Đã kết nối API” dựa riêng vào sự tồn tại của file này. Có thể dùng nhãn: “Dữ liệu công khai YouTube · Đã lấy lúc …”.

## Cách đọc bộ đếm công khai

- `channels[].statistics.viewCount`: views cộng dồn của kênh tại `source.fetched_at`.
- `channels[].statistics.subscriberCount`: số subscriber công khai, có quy tắc làm tròn của YouTube; đọc kèm `hiddenSubscriberCount`. Subscriber ẩn hoặc thiếu dữ liệu khác giá trị 0.
- `channels[].statistics.videoCount`: số video công khai được API báo cho kênh tại thời điểm lấy; không phải số video đã lưu trong bộ mẫu.
- `videos[].statistics.viewCount`, `likeCount`, `commentCount`: bộ đếm cộng dồn của từng video tại thời điểm lấy.
- `videos[].duration_iso8601`: độ dài nội dung video; không phải thời gian người xem đã xem.

Các bộ đếm này có `source.metric_basis: "lifetime_public_counters"`. Không đổi nhãn thành views/likes/comments phát sinh trong ngày, tháng hoặc kỳ do người dùng chọn. Lọc ngày công khai video chỉ chọn danh mục video, không chuyển bộ đếm lifetime thành số trong kỳ. Một ảnh chụp duy nhất cũng không cung cấp chuỗi tăng trưởng lịch sử.

## Phạm vi 150 video

Mỗi kênh chỉ lấy mẫu **tối đa 10 video công khai** từ các mục đã xem trong trang uploads đầu tiên. Đợt này trả đủ **10 video/kênh**, tổng cộng **150 video**, theo `validation.json`.

Chi tiết phạm vi nằm ở `channels[].video_sample`: `requested_limit`, `returned_count`, `scope`, `uploads_page_scanned_ids`, `uploads_has_next_page`, `is_full_catalog`, `status`, `error`. `is_full_catalog` hiện là `false`.

Trên Quản lý video hoặc báo cáo danh mục, ghi “10 video mẫu của kênh” hoặc “150 video mẫu đã tải”. Không gọi đây là toàn bộ video, top video toàn kênh hay danh sách đầy đủ mọi video mới nhất khi chưa duyệt toàn bộ uploads. Không ép tổng views/likes/comments của 10 video bằng bộ đếm của cả kênh.

## Analytics chưa có dữ liệu

**Cập nhật thiết kế 29/10/2026:** đã tạo bộ Analytics giả lập riêng tại [`../demo-analytics/README.md`](../demo-analytics/README.md), liên kết cùng 15 channel ID và 150 video ID để duyệt biểu đồ/KPI/bảng. Các trường Analytics trong snapshot công khai này vẫn giữ `null`/`not_connected`; số giả lập chỉ xuất hiện trong chế độ **Xem minh họa**, không chứng minh chủ kênh đã cấp OAuth và không phải số thực của các kênh.

`meta.analytics_status` là `not_connected`; trong từng kênh, `analytics.reason` là `youtube_analytics_oauth_not_connected`. Các trường `estimatedRevenue`, `rpm`, `estimatedMinutesWatched`, `subscribersGained`, `subscribersLost`, `shares`, `period_metrics` hiện là **`null`**.

Giữ nguyên `null` khi bàn giao. Giao diện hiển thị “— · Chưa kết nối Analytics” cho phần cần dữ liệu này; không chuyển thành 0 và không tạo doanh thu, giờ xem, RPM, gained/lost hoặc shares từ công thức giả định. Không dựng biểu đồ ngày/tháng từ bộ đếm lifetime, không nhân views với RPM cố định, không lấy độ dài video nhân views để giả lập watch time.

Nếu một màn hình báo cáo chưa có số kỳ, vẫn có thể thiết kế bộ lọc, bảng phân công, thông tin nguồn và trạng thái thiếu Analytics. Bộ dữ liệu này chưa cung cấp lịch sử hiệu suất theo kỳ, retention, dữ liệu tài chính hoặc quyền monetary.

## Dùng cho các màn hình

- **Quản lý team:** đọc `teams` và `employees`; mỗi team hiện đủ 5 người. Dùng phân công để mở kênh và danh mục video của từng người.
- **Quản lý kênh:** đọc 15 `channels`, ghép PIC/team qua `assignments` và `employees`; hiển thị metadata, bộ đếm hiện tại trong snapshot và độ mới đúng nguồn.
- **Quản lý video:** đọc 150 `videos`, lọc qua `channel_id`; hiển thị rõ phạm vi mẫu và số liệu lifetime.
- **Báo cáo:** dùng cùng quan hệ ID để lọc và drill-down. Phân biệt báo cáo bộ đếm snapshot với hiệu suất Analytics theo kỳ; những phần thiếu Analytics giữ trạng thái chưa kết nối.

`projects`, `networks`, `costs` đang để **`[]`** vì người dùng chưa chốt các danh mục này. Giữ nguyên trạng thái chưa cấu hình; không tự tạo dự án, network/MCN, chi phí, lợi nhuận hoặc quan hệ bổ sung để lấp màn hình.

## Kiểm tra trước khi tích hợp

`validation.json` hiện có `passed: true`, được kiểm tra lúc **29/10/2026 01:12:05 UTC**. Các kiểm tra đã đạt bao gồm đúng 3 team/15 nhân viên, 5 người/team, 15 kênh duy nhất, quan hệ một-một đang hiệu lực, khóa ngoại hợp lệ, video ID duy nhất, video trỏ đúng kênh, phạm vi tối đa 10 video/kênh, nguồn snapshot đúng, Analytics chưa khả dụng và không tuần tự hóa bí mật.

Kết quả này xác nhận cấu trúc tại lúc tạo bộ dữ liệu; không xác nhận số liệu vẫn mới hoặc ứng dụng đã tích hợp thành công. Khi thay đổi dataset, sinh lại cây xem trước, CSV và kết quả kiểm tra từ nguồn chuẩn để tránh lệch quan hệ hoặc bộ đếm. Giữ nguyên Unicode trong tên nhân viên/kênh và không thêm API key, token hoặc credential vào các file bàn giao.
