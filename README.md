# Mini Web Gia Phả

Trang gia phả nội bộ cho dòng họ — chạy hoàn toàn trên trình duyệt, không cần máy chủ, không cần cài đặt.

Dựng phả đồ nhiều đời, quản lý hồ sơ từng người, tính ngày giỗ theo âm lịch, tra cứu cách xưng hô giữa hai người bất kỳ, và in ra thành sách phả.

---

## Chạy trên web (GitHub Pages)

Trang này là HTML/CSS/JavaScript thuần, chỉ cần đưa lên là chạy — không cần build, không cần GitHub Actions.

Cách bật (chỉ làm một lần):

1. Mở repo trên GitHub → tab **Settings** → mục **Pages** (cột bên trái)
2. **Build and deployment → Source**: chọn **Deploy from a branch**
3. **Branch**: chọn `main`, thư mục `/ (root)` → bấm **Save**
4. Đợi 1–2 phút, tải lại trang là thấy địa chỉ site

Địa chỉ trang:

```
https://dattiennguye.github.io/Gia-ph-Nguy-n/
```

Từ đó về sau, mỗi lần đẩy code lên `main` là GitHub tự đăng lại, không cần thao tác gì thêm.

> Lưu ý: GitHub Pages **không nhận nhánh có dấu `/` trong tên** (ví dụ `claude/mini-web-gia-pha-itpieh` sẽ không hiện trong danh sách chọn). Hãy dùng `main`.
>
> Tệp `.nojekyll` đã có sẵn để GitHub không bỏ qua thư mục `assets`.

### Chạy thử trên máy (tuỳ chọn)

```bash
python3 -m http.server 8000
# rồi mở http://localhost:8000
```

---

## Tính năng

### Phả đồ
- Cây phả hệ vẽ bằng SVG, hiển thị cặp vợ chồng thành một cụm, con cái xếp bên dưới
- Kéo để di chuyển, `Ctrl` + lăn chuột để phóng to/thu nhỏ, nút **Vừa màn hình**
- Thu gọn / mở từng nhánh (số trên nút cho biết nhánh đó có bao nhiêu người con)
- Đổi gốc phả đồ sang bất kỳ ai để xem riêng một chi
- Bật/tắt ảnh chân dung trên thẻ
- Xuất **ảnh PNG** độ phân giải cao hoặc **In / Lưu PDF**

### Phả ký
Phả đồ dạng chữ, thụt đầu dòng theo đời — dễ đọc, dễ in thành sách phả truyền thống.

### Hồ sơ thành viên
Mỗi người lưu được: họ tên, tên thường gọi, tên tự/hiệu/thuỵ, giới tính, đời, chi/nhánh, thứ tự trong nhà, ngày sinh, ngày mất, nơi sinh, nơi an táng, quê quán, nghề nghiệp, học vấn, chức vụ, điện thoại, email, địa chỉ, ảnh chân dung, tiểu sử, công trạng, ghi chú.

Quan hệ: cha, mẹ, nhiều vợ/chồng (kể cả vợ kế, đã ly hôn), con cái, anh chị em — tất cả tự động liên kết hai chiều.

Nút tắt trong hồ sơ: **Thêm con**, **Thêm vợ/chồng** (điền sẵn quan hệ), **Xem trên phả đồ**.

### Danh sách
Bảng đầy đủ, lọc theo đời / chi / giới tính / còn sống–đã mất, tìm theo tên–nghề–quê (không dấu cũng tìm được), sắp xếp theo mọi cột, xuất **CSV mở bằng Excel**.

### Ngày giỗ (âm lịch)
- Ngày giỗ tính từ ngày mất, quy đổi âm lịch ↔ dương lịch bằng thuật toán thiên văn (Hồ Ngọc Đức), đúng cho cả tháng nhuận
- Danh sách sắp tới trong 12 tháng, kèm đếm ngược
- Bảng giỗ chạp cả năm xếp theo tháng âm lịch
- Xuất **tệp `.ics`** để nạp vào Google Calendar / Lịch iPhone, có nhắc trước 3 ngày

### Sự kiện dòng họ
Giỗ Tổ, Thanh minh, họp họ đầu xuân, mừng thọ… lặp hằng năm theo **âm lịch** hoặc dương lịch.

### Tra cứu quan hệ
Chọn hai người bất kỳ, trang sẽ cho biết **hai bên gọi nhau là gì** theo lối xưng hô Việt Nam:

- Trực hệ: cha/mẹ, ông/bà nội–ngoại, cụ, kỵ · con, cháu, chắt, chút, chít
- Bên nhánh: bác, chú, cô, cậu, dì, ông bác, ông chú, bà cô, bà dì
- Anh chị em họ: con chú con bác, chung cụ, chung kỵ, họ xa
- Dâu rể: con dâu, con rể, anh rể, chị dâu, thím, mợ, dượng, bố/mẹ chồng, bố/mẹ vợ

Kèm **đường liên hệ huyết thống** và **tổ tiên chung gần nhất**, cộng bảng xưng hô của một người với toàn bộ dòng họ.

### Tư liệu
Ghi lại nguồn gốc dòng họ, tộc ước, gia phong, ban chấp sự, chuyện các cụ kể lại.

### Thống kê
Tổng thành viên, số đời, còn sống/đã khuất, nam/nữ, tuổi thọ trung bình, phân bố theo đời và theo chi, năm sinh theo thập niên, người đông con nhất, người nhiều hậu duệ nhất, và **danh sách những hồ sơ còn thiếu thông tin** cần bổ sung.

### Khác
- Giao diện sáng / tối / theo hệ thống
- Chạy tốt trên điện thoại
- Hoàn tác `Ctrl+Z`, làm lại `Ctrl+Shift+Z`
- Phím tắt: `Ctrl+K` hoặc `/` để tìm, `N` để thêm người, `Esc` để đóng
- Mã truy cập nội bộ (lớp che nhẹ, xem lưu ý bên dưới)

---

## Dữ liệu được lưu ở đâu?

Toàn bộ gia phả nằm trong **`localStorage` của trình duyệt trên chính máy bạn**. Không có máy chủ, không gửi dữ liệu đi đâu cả.

Điều đó có nghĩa là:

- Mỗi người mở trang sẽ thấy dữ liệu **riêng của máy mình**, không tự đồng bộ với nhau
- Xoá lịch sử/dữ liệu duyệt web hoặc đổi máy là **mất dữ liệu**

**Cách làm việc chung cho cả họ:**

1. Một người giữ phả nhập liệu và bấm **Cài đặt → Xuất tệp gia phả (.json)**
2. Gửi tệp đó cho những người khác (Zalo, email, Drive…)
3. Họ mở trang, bấm **Cài đặt → Nhập từ tệp** là thấy đúng gia phả đó
4. Muốn cả họ thấy sẵn khi mở trang: đưa tệp `.json` vào repo rồi cập nhật `assets/js/sample-data.js`

> **Hãy xuất tệp sao lưu định kỳ.** Đây là bản gốc duy nhất của bạn.

### Xuất / nhập

| Định dạng | Dùng để |
|---|---|
| `.json` | Sao lưu & khôi phục đầy đủ (khuyến nghị) |
| `.csv` | Mở bằng Excel, in danh sách |
| `.ged` (GEDCOM 5.5.1) | Chuyển sang phần mềm gia phả khác |
| `.ics` | Nạp lịch giỗ vào Google Calendar / iPhone |
| `.png` / In PDF | Treo phả đồ, in sách phả |

Trang cũng **nhập được tệp GEDCOM** từ phần mềm gia phả khác.

---

## Lưu ý về bảo mật

Mã truy cập trong phần Cài đặt chỉ là **lớp che phía trình duyệt**, không phải bảo mật thật — người biết cách vẫn xem được mã trong dữ liệu trình duyệt.

Nếu gia phả có thông tin riêng tư (số điện thoại, địa chỉ, ngày sinh của người còn sống), đừng đăng lên GitHub Pages công khai. Hãy dùng một trong các cách sau:

- Để repo ở chế độ **private** và chỉ chia sẻ tệp `.json` cho người trong họ
- Dùng GitHub Pages của **tài khoản/tổ chức trả phí** có bật giới hạn truy cập
- Hoặc chỉ mở tệp `index.html` trực tiếp trên máy từng người

---

## Cấu trúc mã nguồn

```
index.html                  Khung trang
.nojekyll                   Để GitHub Pages phục vụ nguyên thư mục assets
assets/css/styles.css       Giao diện (giấy dó, son đỏ, thếp vàng) + chế độ tối + CSS in ấn
assets/js/lunar.js          Chuyển đổi âm ↔ dương lịch, can chi, con giáp
assets/js/store.js          Dữ liệu, quan hệ, tính đời, hoàn tác, xuất/nhập JSON–CSV–GEDCOM
assets/js/kinship.js        Tính quan hệ và cách xưng hô Việt Nam
assets/js/tree.js           Bố cục & vẽ phả đồ SVG, zoom/pan
assets/js/sample-data.js    Dữ liệu mẫu (họ Nguyễn, 6 đời, 36 người)
assets/js/app.js            Giao diện, định tuyến, các màn hình
```

Không dùng thư viện ngoài, không cần bước build. Sửa tệp, đẩy lên là chạy.

---

## Bắt đầu nhập gia phả của bạn

Lần đầu mở, trang nạp sẵn dữ liệu mẫu để bạn xem giao diện. Khi muốn nhập họ mình:

**Cài đặt → Xoá toàn bộ & bắt đầu trắng**, rồi:

1. Thêm **Thuỷ tổ** trước (người đời thứ nhất, để trống mục Cha và Mẹ)
2. Thêm vợ/chồng của cụ
3. Mở hồ sơ Thuỷ tổ → **Thêm con** — quan hệ cha mẹ được điền sẵn
4. Cứ thế lần lượt xuống các đời sau

Số đời được tính tự động từ Thuỷ tổ, không cần nhập tay.
