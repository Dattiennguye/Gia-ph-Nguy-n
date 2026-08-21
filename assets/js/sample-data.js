/* ==========================================================================
   sample-data.js — Dữ liệu mẫu (họ Nguyễn, 6 đời) để dùng thử ngay.
   Bấm "Xoá toàn bộ & bắt đầu trắng" trong phần Cài đặt khi muốn nhập họ thật.
   ========================================================================== */
(function (global) {
  'use strict';

  // [id, họ tên, giới, sinh, mất, cha, mẹ, chi nhánh, nghề nghiệp, quê/ghi chú]
  var T = [
    ['n01', 'Nguyễn Văn Đức', 'nam', '1878-03-12', '1945-08-19', null, null, 'Thuỷ tổ', 'Nho sĩ, dạy học làng', 'Thuỷ tổ của dòng họ, khai cơ lập nghiệp tại làng Đông Ngạc.'],
    ['n02', 'Trần Thị Nhàn', 'nu', '1882-11-02', '1951-01-27', null, null, 'Thuỷ tổ', 'Nội trợ', 'Chính thất của Thuỷ tổ, tần tảo nuôi ba người con nên người.'],

    ['n03', 'Nguyễn Văn Hiền', 'nam', '1905-06-08', '1978-12-04', 'n01', 'n02', 'Chi Trưởng', 'Thầy thuốc Đông y', 'Trưởng nam, giữ việc hương hoả từ đường.'],
    ['n04', 'Lê Thị Tần', 'nu', '1910-02-14', '1985-07-21', null, null, 'Chi Trưởng', 'Buôn bán nhỏ', ''],
    ['n05', 'Nguyễn Văn Khang', 'nam', '1908-09-30', '1980-05-16', 'n01', 'n02', 'Chi Hai', 'Nông dân', 'Con thứ, lập nghiệp tại Hưng Yên.'],
    ['n06', 'Phạm Thị Lụa', 'nu', '1913-04-05', '1990-10-02', null, null, 'Chi Hai', 'Nội trợ', ''],
    ['n07', 'Nguyễn Thị Mận', 'nu', '1912-07-19', '1988-03-11', 'n01', 'n02', 'Chi Ba', 'Nội trợ', 'Con gái út của Thuỷ tổ.'],
    ['n08', 'Đỗ Văn Bình', 'nam', '1908-01-23', '1979-09-08', null, null, '', 'Thợ mộc', 'Chồng bà Nguyễn Thị Mận.'],

    ['n09', 'Nguyễn Văn Thịnh', 'nam', '1932-05-11', '2010-11-30', 'n03', 'n04', 'Chi Trưởng', 'Giáo viên', 'Trưởng chi, dựng lại từ đường năm 1992.'],
    ['n10', 'Vũ Thị Hoa', 'nu', '1936-08-26', '2018-02-09', null, null, 'Chi Trưởng', 'Y tá', ''],
    ['n11', 'Nguyễn Văn Tài', 'nam', '1935-12-01', '2005-06-18', 'n03', 'n04', 'Chi Trưởng', 'Kỹ sư cầu đường', ''],
    ['n12', 'Ngô Thị Lan', 'nu', '1940-03-17', '', null, null, 'Chi Trưởng', 'Kế toán', ''],
    ['n13', 'Nguyễn Thị Hương', 'nu', '1939-10-09', '', 'n03', 'n04', 'Chi Trưởng', 'Giáo viên tiểu học', ''],
    ['n14', 'Trần Văn Sơn', 'nam', '1936-06-22', '2012-04-03', null, null, '', 'Bộ đội', 'Chồng bà Nguyễn Thị Hương.'],

    ['n15', 'Nguyễn Văn Cường', 'nam', '1936-02-28', '2015-09-14', 'n05', 'n06', 'Chi Hai', 'Cán bộ hợp tác xã', ''],
    ['n16', 'Bùi Thị Nga', 'nu', '1941-11-11', '', null, null, 'Chi Hai', 'Nội trợ', ''],
    ['n17', 'Nguyễn Thị Thu', 'nu', '1942-05-05', '', 'n05', 'n06', 'Chi Hai', 'Công nhân dệt', ''],

    ['n18', 'Nguyễn Văn Hùng', 'nam', '1958-04-02', '', 'n09', 'n10', 'Chi Trưởng', 'Kỹ sư xây dựng', 'Hiện là trưởng tộc.'],
    ['n19', 'Đặng Thị Mai', 'nu', '1961-09-15', '', null, null, 'Chi Trưởng', 'Dược sĩ', ''],
    ['n20', 'Nguyễn Thị Bích', 'nu', '1962-01-20', '', 'n09', 'n10', 'Chi Trưởng', 'Kế toán trưởng', ''],
    ['n21', 'Lý Văn Toàn', 'nam', '1959-07-07', '', null, null, '', 'Doanh nhân', 'Chồng bà Nguyễn Thị Bích.'],
    ['n22', 'Nguyễn Văn Dũng', 'nam', '1965-03-25', '', 'n09', 'n10', 'Chi Trưởng', 'Bác sĩ', ''],
    ['n23', 'Trịnh Thị Yến', 'nu', '1968-12-30', '', null, null, 'Chi Trưởng', 'Giáo viên', ''],
    ['n24', 'Nguyễn Văn Nam', 'nam', '1962-08-08', '', 'n11', 'n12', 'Chi Trưởng', 'Kiến trúc sư', ''],
    ['n25', 'Hoàng Thị Vân', 'nu', '1965-05-19', '', null, null, 'Chi Trưởng', 'Nhân viên ngân hàng', ''],
    ['n26', 'Nguyễn Thị Loan', 'nu', '1966-10-27', '', 'n11', 'n12', 'Chi Trưởng', 'Giáo viên', ''],
    ['n27', 'Nguyễn Văn Phúc', 'nam', '1964-06-14', '', 'n15', 'n16', 'Chi Hai', 'Cán bộ ngân hàng', ''],
    ['n28', 'Lê Thị Hạnh', 'nu', '1967-02-03', '', null, null, 'Chi Hai', 'Nội trợ', ''],

    ['n29', 'Nguyễn Tiến Đạt', 'nam', '1986-07-21', '', 'n18', 'n19', 'Chi Trưởng', 'Kỹ sư phần mềm', 'Người khởi xướng số hoá gia phả dòng họ.'],
    ['n30', 'Phạm Thu Trang', 'nu', '1989-04-09', '', null, null, 'Chi Trưởng', 'Biên tập viên', ''],
    ['n31', 'Nguyễn Ngọc Ánh', 'nu', '1990-11-05', '', 'n18', 'n19', 'Chi Trưởng', 'Bác sĩ nội khoa', ''],
    ['n32', 'Nguyễn Minh Quân', 'nam', '1992-09-12', '', 'n22', 'n23', 'Chi Trưởng', 'Luật sư', ''],
    ['n33', 'Nguyễn Hoàng Long', 'nam', '1990-02-18', '', 'n24', 'n25', 'Chi Trưởng', 'Nhà báo', ''],
    ['n34', 'Nguyễn Gia Bảo', 'nam', '1995-08-30', '', 'n27', 'n28', 'Chi Hai', 'Giảng viên đại học', ''],

    ['n35', 'Nguyễn Tiến Khôi', 'nam', '2015-03-08', '', 'n29', 'n30', 'Chi Trưởng', 'Học sinh', ''],
    ['n36', 'Nguyễn Thảo My', 'nu', '2018-12-01', '', 'n29', 'n30', 'Chi Trưởng', 'Học sinh', '']
  ];

  // Các cặp vợ chồng
  var COUPLES = [
    ['n01', 'n02'], ['n03', 'n04'], ['n05', 'n06'], ['n08', 'n07'],
    ['n09', 'n10'], ['n11', 'n12'], ['n14', 'n13'], ['n15', 'n16'],
    ['n18', 'n19'], ['n21', 'n20'], ['n22', 'n23'], ['n24', 'n25'],
    ['n27', 'n28'], ['n29', 'n30']
  ];

  function build() {
    var d = global.Store.emptyData();
    d.meta = {
      tenGiaPha: 'Gia phả họ Nguyễn — Đông Ngạc',
      hoTocs: 'Nguyễn',
      thuyTo: 'Nguyễn Văn Đức',
      namLap: 2024,
      tuDuong: 'Từ đường họ Nguyễn, thôn Đông Ngạc, xã Đông Ngạc',
      queQuan: 'Đông Ngạc, Bắc Từ Liêm, Hà Nội',
      loiNoiDau: 'Cây có gốc mới nở cành xanh ngọn, nước có nguồn mới bể rộng sông sâu. ' +
        'Cuốn gia phả này được con cháu trong họ chung tay biên soạn, nhằm ghi lại công đức tổ tiên, ' +
        'gìn giữ nề nếp gia phong và nối kết tình thân giữa các chi, các đời.\n\n' +
        'Đây là dữ liệu mẫu để bạn xem thử. Vào mục Cài đặt để xoá và bắt đầu nhập gia phả của dòng họ mình.',
      updatedAt: new Date().toISOString()
    };

    var idmap = {};
    T.forEach(function (row, i) {
      var m = global.Store.normalizeMember({
        hoTen: row[1],
        gioiTinh: row[2],
        ngaySinh: row[3],
        ngayMat: row[4],
        conSong: !row[4],
        chiNhanh: row[7] || '',
        ngheNghiep: row[8] || '',
        tieuSu: row[9] || '',
        queQuan: 'Đông Ngạc, Hà Nội',
        thuTu: i
      });
      idmap[row[0]] = m.id;
      d.members.push(m);
    });

    var byNew = {};
    d.members.forEach(function (m) { byNew[m.id] = m; });

    T.forEach(function (row) {
      var m = byNew[idmap[row[0]]];
      if (row[5]) m.fatherId = idmap[row[5]] || null;
      if (row[6]) m.motherId = idmap[row[6]] || null;
      if (row[4]) { m.noiAnTang = 'Nghĩa trang dòng họ, Đông Ngạc'; }
    });

    COUPLES.forEach(function (c) {
      var a = byNew[idmap[c[0]]], b = byNew[idmap[c[1]]];
      if (!a || !b) return;
      a.spouses.push({ id: b.id, quanHe: 'vo_chong', ngayCuoi: '' });
      b.spouses.push({ id: a.id, quanHe: 'vo_chong', ngayCuoi: '' });
    });

    d.events = [
      { id: 'e1', ten: 'Giỗ Tổ dòng họ', loai: 'gio', ngayAm: '19/7', amLich: true,
        diaDiem: 'Từ đường họ Nguyễn', moTa: 'Ngày giỗ Thuỷ tổ Nguyễn Văn Đức. Con cháu các chi tề tựu đông đủ.', lapLai: 'hang_nam' },
      { id: 'e2', ten: 'Tết Thanh minh — tảo mộ', loai: 'le', ngayAm: '3/3', amLich: true,
        diaDiem: 'Nghĩa trang dòng họ', moTa: 'Con cháu đi tảo mộ, sửa sang phần mộ tổ tiên.', lapLai: 'hang_nam' },
      { id: 'e3', ten: 'Họp họ đầu xuân', loai: 'hop', ngayAm: '4/1', amLich: true,
        diaDiem: 'Từ đường họ Nguyễn', moTa: 'Tổng kết năm cũ, bàn việc họ năm mới, mừng thọ các cụ.', lapLai: 'hang_nam' },
      { id: 'e4', ten: 'Rằm tháng Bảy — lễ Vu Lan', loai: 'le', ngayAm: '15/7', amLich: true,
        diaDiem: 'Từ đường họ Nguyễn', moTa: 'Lễ Vu Lan báo hiếu, cầu siêu cho gia tiên.', lapLai: 'hang_nam' }
    ];

    d.docs = [
      {
        id: 'd1', tieuDe: 'Nguồn gốc dòng họ',
        noiDung: 'Theo lời truyền lại của các cụ và bản phả cũ viết bằng chữ Nôm còn lưu tại từ đường, ' +
          'Thuỷ tổ Nguyễn Văn Đức vốn quê gốc ở Thanh Hoá, theo cha ra Bắc lập nghiệp vào những năm cuối thế kỷ XIX. ' +
          'Cụ dừng chân tại làng Đông Ngạc, mở lớp dạy chữ Nho cho trẻ trong làng, sau lấy vợ và định cư tại đây.\n\n' +
          'Từ Thuỷ tổ đến nay, dòng họ đã trải sáu đời, chia thành ba chi: chi Trưởng, chi Hai và chi Ba. ' +
          'Con cháu hiện sinh sống tại Hà Nội, Hưng Yên, TP. Hồ Chí Minh và một số ở nước ngoài.',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'd2', tieuDe: 'Tộc ước — Gia phong',
        noiDung: '1. Hiếu kính với ông bà cha mẹ, thuận hoà với anh em, giữ trọn nghĩa vợ chồng.\n' +
          '2. Giữ gìn từ đường, phần mộ tổ tiên; giỗ chạp đúng ngày, con cháu về đông đủ.\n' +
          '3. Chăm lo việc học của con cháu; nhà nào khó khăn thì cả họ chung tay giúp đỡ.\n' +
          '4. Không làm điều trái pháp luật, trái đạo lý, làm nhục đến thanh danh dòng họ.\n' +
          '5. Mỗi năm họp họ một lần vào ngày mồng 4 tháng Giêng để bàn việc họ.\n' +
          '6. Mọi thay đổi trong gia phả (sinh, tử, cưới hỏi) phải báo với người giữ phả trong vòng 3 tháng.',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'd3', tieuDe: 'Ban chấp sự dòng họ (nhiệm kỳ hiện tại)',
        noiDung: 'Trưởng tộc: ông Nguyễn Văn Hùng (đời thứ 4)\n' +
          'Phó tộc: ông Nguyễn Văn Nam (đời thứ 4)\n' +
          'Thủ quỹ: bà Nguyễn Thị Bích (đời thứ 4)\n' +
          'Giữ phả — biên tập: anh Nguyễn Tiến Đạt (đời thứ 5)\n' +
          'Phụ trách lễ nghi: ông Nguyễn Văn Dũng (đời thứ 4)',
        updatedAt: new Date().toISOString()
      }
    ];

    return d;
  }

  global.SampleData = { build: build };
})(window);
