/* ==========================================================================
   app.js — Ứng dụng Mini Gia Phả
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Store, L = window.Lunar, K = window.Kinship, T = window.Tree;

  /* ============================ Tiện ích ============================ */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast--' + type : '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 320);
    }, 2600);
  }

  function initials(name) {
    var p = (name || '?').trim().split(/\s+/);
    return (p[p.length - 1] || '?').charAt(0).toUpperCase();
  }

  function avatar(m, cls) {
    if (!m) return '';
    var c = 'avatar' + (m.gioiTinh === 'nu' ? ' avatar--nu' : '') + (cls ? ' ' + cls : '');
    if (m.anh) return '<img class="' + c + '" src="' + esc(m.anh) + '" alt="' + esc(m.hoTen) + '">';
    return '<span class="' + c + '">' + esc(initials(m.hoTen)) + '</span>';
  }

  function yearOf(iso) { var x = (iso || '').match(/^(\d{4})/); return x ? x[1] : ''; }

  function fmtDate(iso) {
    var p = L.parseISO(iso);
    if (!p) return iso || '';
    return pad(p.d) + '/' + pad(p.m) + '/' + p.y;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmtDateFull(iso) {
    var p = L.parseISO(iso);
    if (!p) return iso || '—';
    var am = L.amFromISO(iso);
    return fmtDate(iso) + (am ? ' (' + am.d + '/' + am.m + (am.leap ? ' nhuận' : '') + ' ÂL, năm ' + L.canChiNam(am.y) + ')' : '');
  }

  function lifeText(m) {
    var b = yearOf(m.ngaySinh), d = yearOf(m.ngayMat);
    if (b && d) return b + '–' + d;
    if (b) return 'sinh ' + b;
    if (d) return 'mất ' + d;
    return '';
  }

  function ageOf(m) {
    var b = L.parseISO(m.ngaySinh);
    if (!b) return null;
    var end = m.ngayMat ? L.parseISO(m.ngayMat) : null;
    var e = end || { y: new Date().getFullYear(), m: new Date().getMonth() + 1, d: new Date().getDate() };
    var a = e.y - b.y;
    if (e.m < b.m || (e.m === b.m && e.d < b.d)) a--;
    return a >= 0 && a < 130 ? a : null;
  }

  function isDead(m) { return !!m.ngayMat || m.conSong === false; }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function daysBetween(isoA, isoB) {
    var a = L.parseISO(isoA), b = L.parseISO(isoB);
    if (!a || !b) return 0;
    return L.jdFromDate(b.d, b.m, b.y) - L.jdFromDate(a.d, a.m, a.y);
  }

  /* ============================ Modal / Drawer ============================ */

  var modalOnClose = null;

  function openModal(title, bodyHTML, footHTML, opts) {
    opts = opts || {};
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = bodyHTML;
    $('#modalFoot').innerHTML = footHTML || '';
    $('#modal').classList.toggle('modal--wide', !!opts.wide);
    $('#modalScrim').classList.add('is-open');
    modalOnClose = opts.onClose || null;
    var first = $('#modalBody input, #modalBody select, #modalBody textarea');
    if (first && !opts.noFocus) setTimeout(function () { first.focus(); }, 60);
  }

  function closeModal() {
    $('#modalScrim').classList.remove('is-open');
    $('#modalBody').innerHTML = '';
    $('#modalFoot').innerHTML = '';
    if (modalOnClose) { var f = modalOnClose; modalOnClose = null; f(); }
  }

  var drawerId = null;

  function openDrawer(id) {
    var m = S.byId(id);
    if (!m) return;
    drawerId = id;
    $('#drawerTitle').textContent = 'Hồ sơ thành viên';
    $('#drawerBody').innerHTML = profileHTML(m);
    $('#drawerFoot').innerHTML =
      '<button class="btn btn--primary" data-act="edit">✎ Sửa thông tin</button>' +
      '<button class="btn" data-act="addChild">＋ Thêm con</button>' +
      '<button class="btn" data-act="addSpouse">＋ Thêm vợ/chồng</button>' +
      '<button class="btn" data-act="focusTree">🌳 Xem trên phả đồ</button>' +
      '<button class="btn btn--danger btn--sm" data-act="del">🗑 Xoá</button>';
    $('#drawer').classList.add('is-open');
    $('#drawer').setAttribute('aria-hidden', 'false');
    $('#drawerScrim').classList.add('is-open');
  }

  function closeDrawer() {
    drawerId = null;
    $('#drawer').classList.remove('is-open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    $('#drawerScrim').classList.remove('is-open');
  }

  function profileHTML(m) {
    var doi = S.genOf(m.id);
    var spouses = S.spousesOf(m.id);
    var parents = S.parentsOf(m.id);
    var children = S.childrenOf(m.id);
    var siblings = S.siblingsOf(m.id);
    var age = ageOf(m);
    var amSinh = m.ngaySinh ? L.amFromISO(m.ngaySinh) : null;
    var amMat = m.ngayMat ? L.amFromISO(m.ngayMat) : null;

    var h = '';
    h += '<div class="profile-head">' + avatar(m, 'avatar--lg') +
      '<div class="profile-head__n"><h2>' + esc(m.hoTen) + '</h2>' +
      (m.tenThuong ? '<div class="sub">Thường gọi: ' + esc(m.tenThuong) + '</div>' : '') +
      (m.tenTu ? '<div class="sub">Tên tự/hiệu: ' + esc(m.tenTu) + '</div>' : '') +
      '<div class="profile-tags">' +
      '<span class="tag tag--doi">Đời thứ ' + doi + '</span>' +
      '<span class="tag tag--' + (m.gioiTinh === 'nu' ? 'nu">Nữ' : 'nam">Nam') + '</span>' +
      (isDead(m) ? '<span class="tag tag--mat">✝ Đã mất' + (age !== null ? ' · thọ ' + age : '') + '</span>'
        : '<span class="tag tag--song">Còn sống' + (age !== null ? ' · ' + age + ' tuổi' : '') + '</span>') +
      (m.chiNhanh ? '<span class="tag">' + esc(m.chiNhanh) + '</span>' : '') +
      '</div></div></div>';

    h += '<div class="section-t">Thân thế</div><dl class="dl">';
    h += row('Ngày sinh', m.ngaySinh ? fmtDate(m.ngaySinh) + (amSinh ? '<br><span style="color:var(--ink-3);font-size:.82em">' + amSinh.d + '/' + amSinh.m + ' ÂL · năm ' + L.canChiNam(amSinh.y) + ' (' + L.conGiapNam(amSinh.y) + ')</span>' : '') : '');
    h += row('Ngày mất', m.ngayMat ? fmtDate(m.ngayMat) + (amMat ? '<br><span style="color:var(--ink-3);font-size:.82em">Giỗ ngày ' + amMat.d + '/' + amMat.m + ' ÂL</span>' : '') : '');
    h += row('Nơi sinh', m.noiSinh);
    h += row('Quê quán', m.queQuan);
    h += row('Nghề nghiệp', m.ngheNghiep);
    h += row('Học vấn', m.hocVan);
    h += row('Chức vụ', m.chucVu);
    h += row('Nơi an táng', m.noiAnTang);
    h += row('Địa chỉ', m.diaChi);
    h += row('Điện thoại', m.dienThoai ? '<a href="tel:' + esc(m.dienThoai) + '">' + esc(m.dienThoai) + '</a>' : '');
    h += row('Email', m.email ? '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' : '');
    h += '</dl>';

    function relBlock(title, list, mapper) {
      if (!list.length) return '';
      var s = '<div class="section-t">' + title + '</div><div class="rel-list">';
      list.forEach(function (x) { s += mapper(x); });
      return s + '</div>';
    }

    function relItem(p, note) {
      return '<div class="rel-item" data-open="' + esc(p.id) + '">' + avatar(p, 'avatar--sm') +
        '<span><span class="rel-item__n">' + esc(p.hoTen) + '</span>' +
        '<span class="rel-item__m"> ' + esc(lifeText(p)) + '</span></span>' +
        '<span class="rel-item__r">' + esc(note || ('Đời ' + S.genOf(p.id))) + '</span></div>';
    }

    h += relBlock('Cha mẹ', parents, function (p) {
      return relItem(p, p.gioiTinh === 'nam' ? 'Cha' : 'Mẹ');
    });
    h += relBlock('Vợ / chồng', spouses, function (s) {
      var lbl = s.person.gioiTinh === 'nam' ? 'Chồng' : 'Vợ';
      if (s.quanHe === 'ke') lbl += ' (kế)';
      if (s.quanHe === 'ly_hon') lbl += ' (ly hôn)';
      return relItem(s.person, lbl);
    });
    h += relBlock('Con (' + children.length + ')', children, function (c) {
      return relItem(c, (c.gioiTinh === 'nam' ? 'Con trai' : 'Con gái'));
    });
    h += relBlock('Anh chị em (' + siblings.length + ')', siblings, function (c) {
      return relItem(c, K.relation(m.id, c.id).label);
    });

    if (m.tieuSu) h += '<div class="section-t">Tiểu sử</div><div class="prose">' + esc(m.tieuSu) + '</div>';
    if (m.congTrang) h += '<div class="section-t">Công trạng / sự nghiệp</div><div class="prose">' + esc(m.congTrang) + '</div>';
    if (m.ghiChu) h += '<div class="section-t">Ghi chú</div><div class="prose">' + esc(m.ghiChu) + '</div>';

    var desc = S.descendantsOf(m.id);
    if (desc.length) {
      h += '<div class="section-t">Hậu duệ</div><p style="font-size:.9rem;color:var(--ink-2)">Tổng cộng <b>' +
        desc.length + '</b> người thuộc các đời sau.</p>';
    }
    return h;

    function row(k, v) {
      if (!v) return '';
      return '<dt>' + k + '</dt><dd>' + v + '</dd>';
    }
  }

  /* ============================ Định tuyến ============================ */

  var ROUTES = {};
  var current = 'home';

  function go(route, param) {
    location.hash = '#/' + route + (param ? '/' + encodeURIComponent(param) : '');
  }

  function route() {
    var raw = (location.hash || '#/home').replace(/^#\/?/, '');
    var parts = raw.split('/');
    var name = parts[0] || 'home';
    if (!ROUTES[name]) name = 'home';
    current = name;
    $$('.nav-item').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.route === name);
    });
    $('#sidebar').classList.remove('is-open');
    var main = $('#main');
    main.innerHTML = '';
    ROUTES[name](main, parts.slice(1).map(decodeURIComponent));
    if (name !== 'tree') window.scrollTo(0, 0);
  }

  /* ============================ Tìm kiếm ============================ */

  function searchMembers(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    var norm = removeTones(q);
    return S.members().filter(function (m) {
      var hay = removeTones([m.hoTen, m.tenThuong, m.tenTu, m.chiNhanh, m.ngheNghiep, m.queQuan].join(' ').toLowerCase());
      return hay.indexOf(norm) >= 0;
    }).sort(function (a, b) {
      return S.genOf(a.id) - S.genOf(b.id) || a.hoTen.localeCompare(b.hoTen, 'vi');
    });
  }

  function removeTones(s) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  function bindSearch() {
    var input = $('#globalSearch'), box = $('#searchResults');
    var idx = -1, items = [];

    function render(list) {
      items = list.slice(0, 12);
      idx = -1;
      if (!input.value.trim()) { box.classList.remove('is-open'); return; }
      if (!items.length) {
        box.innerHTML = '<div class="sr-empty">Không tìm thấy ai phù hợp</div>';
      } else {
        box.innerHTML = items.map(function (m, i) {
          return '<div class="sr-item" data-i="' + i + '">' + avatar(m, 'avatar--sm') +
            '<span><div class="sr-item__name">' + esc(m.hoTen) + '</div>' +
            '<div class="sr-item__meta">Đời ' + S.genOf(m.id) +
            (lifeText(m) ? ' · ' + esc(lifeText(m)) : '') +
            (m.chiNhanh ? ' · ' + esc(m.chiNhanh) : '') + '</div></span></div>';
        }).join('');
      }
      box.classList.add('is-open');
    }

    input.addEventListener('input', function () { render(searchMembers(input.value)); });
    input.addEventListener('focus', function () { if (input.value.trim()) render(searchMembers(input.value)); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx += e.key === 'ArrowDown' ? 1 : -1;
        if (idx < 0) idx = items.length - 1;
        if (idx >= items.length) idx = 0;
        $$('.sr-item', box).forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
      } else if (e.key === 'Enter') {
        if (items[idx >= 0 ? idx : 0]) {
          openDrawer(items[idx >= 0 ? idx : 0].id);
          box.classList.remove('is-open');
          input.blur();
        }
      } else if (e.key === 'Escape') { box.classList.remove('is-open'); input.blur(); }
    });
    box.addEventListener('click', function (e) {
      var it = e.target.closest('.sr-item');
      if (!it) return;
      openDrawer(items[+it.dataset.i].id);
      box.classList.remove('is-open');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.searchbox')) box.classList.remove('is-open');
    });
  }

  /* ============================ Trang chủ ============================ */

  ROUTES.home = function (main) {
    var d = S.getData();
    var ms = S.members();
    var st = computeStats();
    var upcoming = upcomingList(90).slice(0, 6);

    var h = '<div class="view">';
    h += '<div class="hero">' +
      '<h1>' + esc(d.meta.tenGiaPha || 'Gia phả dòng họ') + '</h1>' +
      '<p>' + esc((d.meta.loiNoiDau || '').split('\n')[0] || 'Nơi lưu giữ phả hệ, ký ức và nề nếp của dòng họ.') + '</p>' +
      '<div class="hero__meta">' +
      (d.meta.thuyTo ? '<span>Thuỷ tổ: <b>' + esc(d.meta.thuyTo) + '</b></span>' : '') +
      (d.meta.queQuan ? '<span>Quê quán: <b>' + esc(d.meta.queQuan) + '</b></span>' : '') +
      (d.meta.tuDuong ? '<span>Từ đường: <b>' + esc(d.meta.tuDuong) + '</b></span>' : '') +
      '<span>Đã ghi: <b>' + ms.length + ' người · ' + st.maxGen + ' đời</b></span>' +
      '</div></div>';

    if (!ms.length) {
      h += emptyState();
      h += '</div>';
      main.innerHTML = h;
      return;
    }

    h += '<div class="grid grid--stats" style="margin-bottom:18px">' +
      stat(st.total, 'Tổng số thành viên', '') +
      stat(st.maxGen, 'Số đời đã ghi', 'gold') +
      stat(st.alive, 'Đang còn sống', 'jade') +
      stat(st.male + ' / ' + st.female, 'Nam / Nữ', 'blue') +
      '</div>';

    h += '<div class="grid grid--2">';

    h += '<div class="card"><div class="card__head"><h2>Sắp tới trong 90 ngày</h2>' +
      '<button class="btn btn--sm" data-go="gio">Xem tất cả</button></div>';
    if (!upcoming.length) {
      h += '<p style="color:var(--ink-3);font-size:.9rem">Không có ngày giỗ hay sự kiện nào trong 90 ngày tới.</p>';
    } else {
      upcoming.forEach(function (u) { h += gioItemHTML(u); });
    }
    h += '</div>';

    h += '<div class="card"><div class="card__head"><h2>Các chi trong họ</h2></div>';
    var chis = st.byChi;
    if (!chis.length) {
      h += '<p style="color:var(--ink-3);font-size:.9rem">Chưa phân chi. Bạn có thể ghi tên chi ở hồ sơ từng người.</p>';
    } else {
      h += '<div class="bar-chart">';
      var mx = Math.max.apply(null, chis.map(function (c) { return c.n; }));
      chis.forEach(function (c, i) {
        h += barRow(c.k, c.n, mx, ['', 'gold', 'jade', 'blue', 'pink'][i % 5]);
      });
      h += '</div>';
    }
    h += '</div>';

    h += '</div>';

    h += '<div class="card" style="margin-top:16px"><div class="card__head"><h2>Mới cập nhật</h2>' +
      '<button class="btn btn--sm" data-go="list">Danh sách đầy đủ</button></div>';
    var recent = ms.slice().sort(function (a, b) {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }).slice(0, 8);
    h += '<div class="rel-list">';
    recent.forEach(function (m) {
      h += '<div class="rel-item" data-open="' + esc(m.id) + '">' + avatar(m, 'avatar--sm') +
        '<span><span class="rel-item__n">' + esc(m.hoTen) + '</span>' +
        '<span class="rel-item__m"> ' + esc(lifeText(m)) + '</span></span>' +
        '<span class="rel-item__r">Đời ' + S.genOf(m.id) + '</span></div>';
    });
    h += '</div></div>';

    if (d.meta.loiNoiDau) {
      h += '<div class="card" style="margin-top:16px"><div class="card__head"><h2>Lời nói đầu</h2></div>' +
        '<div class="prose">' + esc(d.meta.loiNoiDau) + '</div></div>';
    }

    h += '</div>';
    main.innerHTML = h;
  };

  function emptyState() {
    return '<div class="card"><div class="empty">' +
      '<div class="empty__icon">🌱</div>' +
      '<h3>Gia phả đang trống</h3>' +
      '<p>Bắt đầu bằng cách thêm vị Thuỷ tổ (người đời thứ nhất), rồi lần lượt thêm con cháu. ' +
      'Hoặc nạp dữ liệu mẫu để xem thử trước.</p>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn btn--primary" data-act="addFirst">＋ Thêm Thuỷ tổ</button>' +
      '<button class="btn" data-act="loadSample">Nạp dữ liệu mẫu</button>' +
      '<button class="btn" data-act="importFile">Nhập từ tệp sao lưu</button>' +
      '</div></div></div>';
  }

  function stat(v, l, mod) {
    return '<div class="stat' + (mod ? ' stat--' + mod : '') + '"><div class="stat__v">' + v + '</div><div class="stat__l">' + esc(l) + '</div></div>';
  }

  function barRow(label, val, max, mod) {
    var pct = max ? Math.round(val / max * 100) : 0;
    return '<div class="bar-row"><span title="' + esc(label) + '" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(label) + '</span>' +
      '<span class="bar-track"><span class="bar-fill' + (mod ? ' bar-fill--' + mod : '') + '" style="width:' + pct + '%"></span></span>' +
      '<span class="bar-val">' + val + '</span></div>';
  }

  function computeStats() {
    var ms = S.members();
    var gen = S.generations();
    var st = { total: ms.length, male: 0, female: 0, alive: 0, dead: 0, maxGen: 0, byGen: {}, byChi: [], ages: [] };
    var chi = {};
    ms.forEach(function (m) {
      if (m.gioiTinh === 'nu') st.female++; else st.male++;
      if (isDead(m)) st.dead++; else st.alive++;
      var g = gen[m.id] || 1;
      st.maxGen = Math.max(st.maxGen, g);
      st.byGen[g] = (st.byGen[g] || 0) + 1;
      var c = m.chiNhanh || 'Chưa phân chi';
      chi[c] = (chi[c] || 0) + 1;
      var a = ageOf(m);
      if (a !== null && isDead(m)) st.ages.push(a);
    });
    st.byChi = Object.keys(chi).map(function (k) { return { k: k, n: chi[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
    return st;
  }

  /* ============================== Phả đồ ============================== */

  var treeState = { rootId: null, collapsed: {}, showPhoto: true, pz: null, pzCanvas: null, highlight: {} };

  ROUTES.tree = function (main, params) {
    var roots = S.roots();
    if (!S.members().length) {
      main.innerHTML = '<div class="view">' + emptyState() + '</div>';
      return;
    }
    if (params[0] && S.byId(params[0])) treeState.rootId = params[0];
    if (!treeState.rootId || !S.byId(treeState.rootId)) {
      treeState.rootId = roots.length ? roots[0].id : S.members()[0].id;
    }

    var h = '<div class="tree-shell">';
    h += '<div class="tree-toolbar no-print">';
    h += '<label style="font-size:.8rem;color:var(--ink-2)">Gốc phả đồ</label>';
    h += '<select class="select" id="treeRoot" style="width:auto;min-width:200px">';
    var opts = roots.length ? roots : S.members().slice(0, 40);
    var haveRoot = opts.some(function (r) { return r.id === treeState.rootId; });
    if (!haveRoot) {
      var cm = S.byId(treeState.rootId);
      if (cm) h += '<option value="' + esc(cm.id) + '" selected>' + esc(cm.hoTen) + ' (đời ' + S.genOf(cm.id) + ')</option>';
    }
    opts.forEach(function (r) {
      h += '<option value="' + esc(r.id) + '"' + (r.id === treeState.rootId ? ' selected' : '') + '>' +
        esc(r.hoTen) + ' — đời ' + S.genOf(r.id) + '</option>';
    });
    h += '</select>';
    h += '<button class="btn btn--sm" id="btnExpandAll">Mở hết</button>';
    h += '<button class="btn btn--sm" id="btnCollapseAll">Thu gọn</button>';
    h += '<label class="check" style="margin-left:6px"><input type="checkbox" id="chkPhoto"' +
      (treeState.showPhoto ? ' checked' : '') + '> Hiện ảnh</label>';
    h += '<div class="toolbar__spacer"></div>';
    h += '<button class="btn btn--sm" id="btnFit">⤢ Vừa màn hình</button>';
    h += '<button class="btn btn--sm" id="btnPng">⬇ Tải ảnh PNG</button>';
    h += '<button class="btn btn--sm" id="btnPrintTree">🖨 In</button>';
    h += '</div>';

    h += '<div class="tree-viewport" id="treeViewport">' +
      '<div class="tree-canvas" id="treeCanvas"></div>' +
      '<div class="tree-legend no-print">' +
      '<span><i style="background:var(--blue)"></i>Nam</span>' +
      '<span><i style="background:var(--pink)"></i>Nữ</span>' +
      '<span><i style="background:var(--accent);opacity:.55"></i>Vợ chồng</span>' +
      '<span>✝ Đã mất</span><span>Kéo để di chuyển · Ctrl+lăn chuột để phóng to</span>' +
      '</div>' +
      '<div class="tree-zoom no-print">' +
      '<button class="btn btn--icon" id="zIn" aria-label="Phóng to">＋</button>' +
      '<button class="btn btn--icon" id="zOut" aria-label="Thu nhỏ">－</button>' +
      '<button class="btn btn--icon" id="zReset" aria-label="Về mặc định">⟲</button>' +
      '</div></div>';
    h += '</div>';
    main.innerHTML = h;

    drawTree(true);

    $('#treeRoot').addEventListener('change', function () {
      treeState.rootId = this.value;
      treeState.collapsed = {};
      drawTree(true);
    });
    $('#btnExpandAll').addEventListener('click', function () { treeState.collapsed = {}; drawTree(true); });
    $('#btnCollapseAll').addEventListener('click', function () {
      treeState.collapsed = {};
      var root = treeState.rootId;
      S.members().forEach(function (m) {
        if (m.id !== root && S.childrenOf(m.id).length) treeState.collapsed[m.id] = true;
      });
      drawTree(true);
    });
    $('#chkPhoto').addEventListener('change', function () { treeState.showPhoto = this.checked; drawTree(false); });
    $('#btnFit').addEventListener('click', function () { fitTree(); });
    $('#btnPng').addEventListener('click', exportTreePNG);
    $('#btnPrintTree').addEventListener('click', function () { fitTree(); setTimeout(function () { window.print(); }, 200); });
    $('#zIn').addEventListener('click', function () { treeState.pz.zoomIn(); });
    $('#zOut').addEventListener('click', function () { treeState.pz.zoomOut(); });
    $('#zReset').addEventListener('click', function () { fitTree(); });
  };

  var lastLayout = null;

  function drawTree(refit) {
    var canvas = $('#treeCanvas');
    if (!canvas) return;
    var res = T.render(canvas, {
      rootId: treeState.rootId,
      collapsed: treeState.collapsed,
      showPhoto: treeState.showPhoto,
      selectedId: drawerId,
      highlight: treeState.highlight,
      onSelect: function (id) { openDrawer(id); },
      onToggle: function (id) {
        treeState.collapsed[id] = !treeState.collapsed[id];
        drawTree(false);
      }
    });
    lastLayout = res.layout;
    // Mỗi lần vào lại trang phả đồ là một DOM mới — phải gắn lại bộ kéo/phóng
    if (!treeState.pz || treeState.pzCanvas !== canvas) {
      treeState.pz = T.makePanZoom($('#treeViewport'), canvas);
      treeState.pzCanvas = canvas;
    }
    if (refit) setTimeout(fitTree, 30);
    else treeState.pz.apply();
  }

  function fitTree() {
    if (!lastLayout || !treeState.pz) return;
    treeState.pz.fit(lastLayout.maxX - lastLayout.minX, lastLayout.height);
  }

  function exportTreePNG() {
    var svg = $('#treeCanvas svg');
    if (!svg) return;
    var clone = svg.cloneNode(true);
    var css = collectTreeCSS();
    var style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = css;
    clone.insertBefore(style, clone.firstChild);
    var w = +clone.getAttribute('width'), hh = +clone.getAttribute('height');
    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', lastLayout.minX); bg.setAttribute('y', 0);
    bg.setAttribute('width', w); bg.setAttribute('height', hh);
    bg.setAttribute('fill', getVar('--bg'));
    clone.insertBefore(bg, style.nextSibling);

    var xml = new XMLSerializer().serializeToString(clone);
    var svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
    var img = new Image();
    var scale = Math.min(2, 4000 / Math.max(w, hh));
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = Math.round(w * scale); cv.height = Math.round(hh * scale);
      var ctx = cv.getContext('2d');
      ctx.fillStyle = getVar('--bg');
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(function (blob) {
        if (!blob) { toast('Không tạo được ảnh', 'err'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'pha-do-' + todayISO() + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        toast('Đã tải ảnh phả đồ', 'ok');
      }, 'image/png');
    };
    img.onerror = function () { toast('Không xuất được PNG (có thể do ảnh thành viên). Hãy dùng nút In.', 'err'); };
    img.src = svg64;
  }

  function getVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#ffffff';
  }

  /** Gom các biến màu thành CSS nội tuyến cho SVG khi xuất ảnh */
  function collectTreeCSS() {
    var vars = ['--surface', '--border', '--border-2', '--ink', '--ink-2', '--ink-3',
      '--accent', '--accent-soft', '--gold', '--gold-soft', '--blue', '--blue-soft',
      '--pink', '--pink-soft', '--bg', '--serif'];
    var decl = vars.map(function (v) { return v + ':' + getVar(v); }).join(';');
    var out = ':root{' + decl + '}\n';
    $$('link[rel=stylesheet], style').forEach(function () {});
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules;
      try { rules = sheet.cssRules; } catch (e) { return; }
      if (!rules) return;
      Array.prototype.forEach.call(rules, function (r) {
        if (r.selectorText && /tree-(card|link|toggle|svg)|card-/.test(r.selectorText)) {
          out += r.cssText + '\n';
        }
      });
    });
    out += '.tree-card, .tree-toggle { font-family: "Be Vietnam Pro", sans-serif; }\n';
    return out;
  }

  /* ============================== Phả ký ============================== */

  var outlineCollapsed = {};

  ROUTES.outline = function (main) {
    if (!S.members().length) { main.innerHTML = '<div class="view">' + emptyState() + '</div>'; return; }
    var roots = S.roots();
    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Phả ký</h1><p class="page-head__desc">Phả đồ dạng chữ, trình bày theo đời và theo chi — tiện để đọc và in thành sách.</p></div>' +
      '<div class="btn-row no-print"><button class="btn" id="btnOlExpand">Mở hết</button>' +
      '<button class="btn" id="btnOlCollapse">Thu gọn</button>' +
      '<button class="btn" onclick="window.print()">🖨 In / Lưu PDF</button></div></div>';

    h += '<div class="card"><div class="outline" id="outlineRoot">';
    var seen = {};
    roots.forEach(function (r) { h += olNode(r.id, seen); });
    h += '</div></div></div>';
    main.innerHTML = h;

    $('#btnOlExpand').addEventListener('click', function () { outlineCollapsed = {}; route(); });
    $('#btnOlCollapse').addEventListener('click', function () {
      S.members().forEach(function (m) { if (S.childrenOf(m.id).length) outlineCollapsed[m.id] = true; });
      S.roots().forEach(function (r) { outlineCollapsed[r.id] = false; });
      route();
    });
  };

  function olNode(id, seen) {
    if (seen[id]) return '';
    seen[id] = true;
    var m = S.byId(id);
    if (!m) return '';
    var kids = S.childrenOf(id);
    var sp = S.spousesOf(id);
    var col = !!outlineCollapsed[id];
    var h = '<ul><li>';
    h += '<div class="ol-row" data-open="' + esc(id) + '">';
    h += kids.length
      ? '<span class="ol-caret" data-ol="' + esc(id) + '">' + (col ? '▶' : '▼') + '</span>'
      : '<span class="ol-caret">•</span>';
    h += '<span class="tag tag--doi">Đời ' + S.genOf(id) + '</span>';
    h += '<span class="ol-name">' + esc(m.hoTen) + '</span>';
    var meta = [];
    if (lifeText(m)) meta.push(lifeText(m));
    if (isDead(m)) meta.push('✝');
    if (sp.length) meta.push((m.gioiTinh === 'nam' ? 'vợ: ' : 'chồng: ') + sp.map(function (s) { return s.person.hoTen; }).join(', '));
    if (kids.length) meta.push(kids.length + ' con');
    if (m.chiNhanh) meta.push(m.chiNhanh);
    h += '<span class="ol-meta">' + esc(meta.join(' · ')) + '</span>';
    h += '</div>';
    if (kids.length && !col) {
      kids.forEach(function (c) { h += olNode(c.id, seen); });
    }
    h += '</li></ul>';
    return h;
  }

  /* ============================ Danh sách ============================ */

  var listState = { q: '', doi: '', chi: '', gt: '', tt: '', sort: 'doi', dir: 1 };

  ROUTES.list = function (main) {
    if (!S.members().length) { main.innerHTML = '<div class="view">' + emptyState() + '</div>'; return; }
    var chis = {};
    S.members().forEach(function (m) { if (m.chiNhanh) chis[m.chiNhanh] = 1; });
    if (listState.chi && !chis[listState.chi]) listState.chi = '';
    if (listState.doi && +listState.doi > S.maxGen()) listState.doi = '';

    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Danh sách thành viên</h1><p class="page-head__desc">Tra cứu, lọc và sắp xếp toàn bộ người trong họ.</p></div>' +
      '<div class="btn-row no-print">' +
      '<button class="btn" id="btnExpCsv">⬇ Xuất Excel (CSV)</button>' +
      '<button class="btn" onclick="window.print()">🖨 In</button>' +
      '<button class="btn btn--primary" data-act="add">＋ Thêm người</button></div></div>';

    h += '<div class="toolbar no-print">';
    h += '<input class="input" id="fQ" placeholder="Tìm theo tên, nghề, quê…" value="' + esc(listState.q) + '" style="min-width:200px">';
    h += '<select class="select" id="fDoi"><option value="">Tất cả các đời</option>';
    for (var g = 1; g <= S.maxGen(); g++) h += '<option value="' + g + '"' + (listState.doi == g ? ' selected' : '') + '>Đời ' + g + '</option>';
    h += '</select>';
    h += '<select class="select" id="fChi"><option value="">Tất cả các chi</option>';
    Object.keys(chis).sort().forEach(function (c) {
      h += '<option value="' + esc(c) + '"' + (listState.chi === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    });
    h += '</select>';
    h += '<select class="select" id="fGt"><option value="">Nam & Nữ</option>' +
      '<option value="nam"' + (listState.gt === 'nam' ? ' selected' : '') + '>Nam</option>' +
      '<option value="nu"' + (listState.gt === 'nu' ? ' selected' : '') + '>Nữ</option></select>';
    h += '<select class="select" id="fTt"><option value="">Còn sống & đã mất</option>' +
      '<option value="song"' + (listState.tt === 'song' ? ' selected' : '') + '>Còn sống</option>' +
      '<option value="mat"' + (listState.tt === 'mat' ? ' selected' : '') + '>Đã mất</option></select>';
    h += '<div class="toolbar__spacer"></div><span id="listCount" style="font-size:.85rem;color:var(--ink-2)"></span>';
    h += '</div>';

    h += '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      th('hoTen', 'Họ và tên') + th('doi', 'Đời') + th('gioiTinh', 'Giới') +
      th('ngaySinh', 'Năm sinh') + th('ngayMat', 'Năm mất') +
      '<th class="no-sort">Cha</th><th class="no-sort">Vợ / chồng</th>' +
      th('chiNhanh', 'Chi') + '<th class="no-sort">Nghề nghiệp</th>' +
      '</tr></thead><tbody id="listBody"></tbody></table></div></div>';

    main.innerHTML = h;
    renderList();

    ['fQ', 'fDoi', 'fChi', 'fGt', 'fTt'].forEach(function (id) {
      var el = $('#' + id);
      el.addEventListener('input', function () {
        listState.q = $('#fQ').value;
        listState.doi = $('#fDoi').value;
        listState.chi = $('#fChi').value;
        listState.gt = $('#fGt').value;
        listState.tt = $('#fTt').value;
        renderList();
      });
      el.addEventListener('change', function () { el.dispatchEvent(new Event('input')); });
    });

    $$('.tbl thead th[data-sort]').forEach(function (thEl) {
      thEl.addEventListener('click', function () {
        var k = thEl.dataset.sort;
        if (listState.sort === k) listState.dir *= -1;
        else { listState.sort = k; listState.dir = 1; }
        route();
      });
    });

    $('#btnExpCsv').addEventListener('click', function () {
      download('danh-sach-gia-pha-' + todayISO() + '.csv', S.exportCSV(), 'text/csv');
      toast('Đã tải tệp CSV — mở được bằng Excel', 'ok');
    });

    function th(key, label) {
      var ind = listState.sort === key ? '<span class="sort-ind">' + (listState.dir > 0 ? '▲' : '▼') + '</span>' : '';
      return '<th data-sort="' + key + '">' + label + ind + '</th>';
    }
  };

  function filteredMembers() {
    var gen = S.generations();
    var q = removeTones(listState.q.trim().toLowerCase());
    return S.members().filter(function (m) {
      if (listState.doi && String(gen[m.id]) !== String(listState.doi)) return false;
      if (listState.chi && m.chiNhanh !== listState.chi) return false;
      if (listState.gt && m.gioiTinh !== listState.gt) return false;
      if (listState.tt === 'song' && isDead(m)) return false;
      if (listState.tt === 'mat' && !isDead(m)) return false;
      if (q) {
        var hay = removeTones([m.hoTen, m.tenThuong, m.tenTu, m.ngheNghiep, m.queQuan, m.chiNhanh, m.diaChi].join(' ').toLowerCase());
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      var k = listState.sort, va, vb;
      if (k === 'doi') { va = gen[a.id]; vb = gen[b.id]; }
      else { va = a[k] || ''; vb = b[k] || ''; }
      if (typeof va === 'string') return va.localeCompare(vb, 'vi') * listState.dir;
      return (va - vb) * listState.dir;
    });
  }

  function renderList() {
    var body = $('#listBody');
    if (!body) return;
    var list = filteredMembers();
    var gen = S.generations();
    $('#listCount').textContent = list.length + ' / ' + S.members().length + ' người';
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="9"><div class="empty"><div class="empty__icon">🔎</div>' +
        '<h3>Không tìm thấy ai</h3><p>Thử bỏ bớt điều kiện lọc.</p></div></td></tr>';
      return;
    }
    body.innerHTML = list.map(function (m) {
      var f = S.byId(m.fatherId);
      var sp = S.spousesOf(m.id).map(function (s) { return s.person.hoTen; }).join(', ');
      return '<tr data-open="' + esc(m.id) + '">' +
        '<td><div class="person-cell">' + avatar(m, 'avatar--sm') +
        '<span><b>' + esc(m.hoTen) + '</b>' + (m.tenThuong ? '<br><span style="font-size:.78rem;color:var(--ink-3)">' + esc(m.tenThuong) + '</span>' : '') + '</span></div></td>' +
        '<td><span class="tag tag--doi">' + gen[m.id] + '</span></td>' +
        '<td><span class="tag tag--' + (m.gioiTinh === 'nu' ? 'nu">Nữ' : 'nam">Nam') + '</span></td>' +
        '<td class="num">' + (yearOf(m.ngaySinh) || '—') + '</td>' +
        '<td class="num">' + (yearOf(m.ngayMat) || (isDead(m) ? '—' : '')) + '</td>' +
        '<td>' + esc(f ? f.hoTen : '—') + '</td>' +
        '<td>' + esc(sp || '—') + '</td>' +
        '<td>' + esc(m.chiNhanh || '—') + '</td>' +
        '<td>' + esc(m.ngheNghiep || '—') + '</td>' +
        '</tr>';
    }).join('');
  }

  /* ============================ Ngày giỗ ============================ */

  /** Danh sách giỗ + sự kiện trong N ngày tới */
  function upcomingList(days) {
    var today = todayISO();
    var out = [];
    var thisY = new Date().getFullYear();

    S.members().forEach(function (m) {
      if (!isDead(m) || !m.ngayMat) return;
      var am = L.amFromISO(m.ngayMat);
      if (!am) return;
      [thisY, thisY + 1].forEach(function (y) {
        var s = L.lunar2Solar(am.d, am.m, y, 0);
        if (!s[2]) return;
        var iso = L.toISO(s[0], s[1], s[2]);
        var dd = daysBetween(today, iso);
        if (dd >= 0 && dd <= days) {
          out.push({
            kind: 'gio', iso: iso, days: dd, member: m,
            title: 'Giỗ ' + (m.gioiTinh === 'nam' ? 'ông' : 'bà') + ' ' + m.hoTen,
            sub: 'Ngày ' + am.d + '/' + am.m + ' ÂL · mất năm ' + yearOf(m.ngayMat) +
              ' · đời ' + S.genOf(m.id)
          });
        }
      });
    });

    (S.getData().events || []).forEach(function (ev) {
      if (ev.amLich && ev.ngayAm) {
        var p = ev.ngayAm.split('/');
        var ld = +p[0], lm = +p[1];
        if (!ld || !lm) return;
        [thisY, thisY + 1].forEach(function (y) {
          var s = L.lunar2Solar(ld, lm, y, 0);
          if (!s[2]) return;
          var iso = L.toISO(s[0], s[1], s[2]);
          var dd = daysBetween(today, iso);
          if (dd >= 0 && dd <= days) {
            out.push({ kind: 'event', iso: iso, days: dd, event: ev, title: ev.ten,
              sub: 'Ngày ' + ev.ngayAm + ' ÂL' + (ev.diaDiem ? ' · ' + ev.diaDiem : '') });
          }
        });
      } else if (ev.ngay) {
        var y2 = new Date().getFullYear();
        var pp = L.parseISO(ev.ngay);
        if (!pp) return;
        var cands = ev.lapLai === 'hang_nam'
          ? [L.toISO(pp.d, pp.m, y2), L.toISO(pp.d, pp.m, y2 + 1)]
          : [ev.ngay];
        cands.forEach(function (iso) {
          var dd = daysBetween(today, iso);
          if (dd >= 0 && dd <= days) {
            out.push({ kind: 'event', iso: iso, days: dd, event: ev, title: ev.ten,
              sub: fmtDate(iso) + (ev.diaDiem ? ' · ' + ev.diaDiem : '') });
          }
        });
      }
    });

    var seen = {};
    return out.filter(function (o) {
      var k = o.kind + (o.member ? o.member.id : o.event.id) + o.iso;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    }).sort(function (a, b) { return a.days - b.days; });
  }

  var MONTHS = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];

  function gioItemHTML(u) {
    var p = L.parseISO(u.iso);
    var cd = u.days === 0 ? 'Hôm nay' : (u.days === 1 ? 'Ngày mai' : 'còn ' + u.days + ' ngày');
    return '<div class="gio-item' + (u.days <= 14 ? ' is-soon' : '') + '"' +
      (u.member ? ' data-open="' + esc(u.member.id) + '" style="cursor:pointer"' : '') + '>' +
      '<div class="gio-date"><div class="gio-date__d">' + p.d + '</div>' +
      '<div class="gio-date__m">' + MONTHS[p.m - 1] + ' · ' + p.y + '</div></div>' +
      '<div class="gio-body"><div class="gio-body__t">' + (u.kind === 'gio' ? '🕯️ ' : '📅 ') + esc(u.title) + '</div>' +
      '<div class="gio-body__s">' + esc(u.sub) + '</div></div>' +
      '<div class="gio-cd"><b>' + esc(u.days === 0 ? 'Hôm nay' : u.days) + '</b>' +
      (u.days === 0 ? '' : '<span>' + esc(cd.replace('còn ', '').replace(' ngày', ' ngày nữa')) + '</span>') + '</div></div>';
  }

  ROUTES.gio = function (main) {
    var days = 365;
    var list = upcomingList(days);
    var deadCount = S.members().filter(isDead).length;

    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Lịch giỗ &amp; ngày lễ</h1>' +
      '<p class="page-head__desc">Ngày giỗ tính theo âm lịch từ ngày mất, quy đổi sang dương lịch của năm hiện tại và năm tới.</p></div>' +
      '<div class="btn-row no-print"><button class="btn" id="btnIcs">📆 Xuất lịch (.ics)</button>' +
      '<button class="btn" onclick="window.print()">🖨 In</button></div></div>';

    h += '<div class="grid grid--stats" style="margin-bottom:18px">' +
      stat(deadCount, 'Người đã khuất', 'gold') +
      stat(list.filter(function (x) { return x.kind === 'gio'; }).length, 'Ngày giỗ trong 12 tháng tới', '') +
      stat(list.filter(function (x) { return x.days <= 30; }).length, 'Trong 30 ngày tới', 'jade') +
      '</div>';

    h += '<div class="card"><div class="card__head"><h2>Sắp tới</h2></div>';
    if (!list.length) {
      h += '<p style="color:var(--ink-3)">Chưa có dữ liệu ngày mất nào để tính giỗ. ' +
        'Hãy điền ngày mất trong hồ sơ từng người.</p>';
    } else {
      list.forEach(function (u) { h += gioItemHTML(u); });
    }
    h += '</div>';

    var byMonth = {};
    S.members().filter(function (m) { return isDead(m) && m.ngayMat; }).forEach(function (m) {
      var am = L.amFromISO(m.ngayMat);
      if (!am) return;
      (byMonth[am.m] = byMonth[am.m] || []).push({ m: m, am: am });
    });
    h += '<div class="card"><div class="card__head"><h2>Bảng giỗ chạp cả năm (theo tháng âm lịch)</h2></div>';
    var any = false;
    for (var mo = 1; mo <= 12; mo++) {
      if (!byMonth[mo]) continue;
      any = true;
      h += '<div class="section-t">Tháng ' + mo + ' âm lịch</div><div class="rel-list">';
      byMonth[mo].sort(function (a, b) { return a.am.d - b.am.d; }).forEach(function (x) {
        h += '<div class="rel-item" data-open="' + esc(x.m.id) + '">' + avatar(x.m, 'avatar--sm') +
          '<span><span class="rel-item__n">' + esc(x.m.hoTen) + '</span>' +
          '<span class="rel-item__m"> · đời ' + S.genOf(x.m.id) + ' · mất ' + esc(fmtDate(x.m.ngayMat)) + '</span></span>' +
          '<span class="rel-item__r">Giỗ ' + x.am.d + '/' + x.am.m + ' ÂL</span></div>';
      });
      h += '</div>';
    }
    if (!any) h += '<p style="color:var(--ink-3)">Chưa có ai được ghi ngày mất.</p>';
    h += '</div></div>';

    main.innerHTML = h;
    $('#btnIcs').addEventListener('click', function () {
      download('lich-gio-ho-' + todayISO() + '.ics', buildICS(upcomingList(730)), 'text/calendar');
      toast('Đã tải tệp lịch — nhập vào Google Calendar hoặc Lịch iPhone', 'ok');
    });
  };

  function buildICS(list) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mini Gia Pha//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsText(S.getData().meta.tenGiaPha || 'Lịch giỗ dòng họ')];
    list.forEach(function (u, i) {
      var p = L.parseISO(u.iso);
      var dt = p.y + pad(p.m) + pad(p.d);
      var next = L.jdToDate(L.jdFromDate(p.d, p.m, p.y) + 1);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + (u.member ? u.member.id : u.event.id) + '-' + dt + '@giapha');
      lines.push('DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''));
      lines.push('DTSTART;VALUE=DATE:' + dt);
      lines.push('DTEND;VALUE=DATE:' + next[2] + pad(next[1]) + pad(next[0]));
      lines.push('SUMMARY:' + icsText(u.title));
      lines.push('DESCRIPTION:' + icsText(u.sub));
      lines.push('BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY',
        'DESCRIPTION:' + icsText(u.title + ' — còn 3 ngày'), 'END:VALARM');
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function icsText(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  /* ============================== Sự kiện ============================== */

  var EVENT_TYPES = { gio: '🕯️ Giỗ chạp', le: '🏮 Lễ tết', hop: '🤝 Họp họ', cuoi: '💐 Cưới hỏi',
    mung: '🎉 Mừng thọ / khao', xd: '🏛️ Xây dựng từ đường', khac: '📌 Khác' };

  ROUTES.events = function (main) {
    var evs = (S.getData().events || []).slice();
    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Sự kiện dòng họ</h1><p class="page-head__desc">Ngày lễ, họp họ, tảo mộ… lặp hằng năm theo âm lịch hoặc dương lịch.</p></div>' +
      '<div class="btn-row no-print"><button class="btn btn--primary" id="btnAddEvent">＋ Thêm sự kiện</button></div></div>';

    if (!evs.length) {
      h += '<div class="card"><div class="empty"><div class="empty__icon">📅</div>' +
        '<h3>Chưa có sự kiện nào</h3><p>Thêm các mốc thường niên của họ: giỗ Tổ, Thanh minh, họp họ đầu xuân…</p>' +
        '<button class="btn btn--primary" id="btnAddEvent2">＋ Thêm sự kiện đầu tiên</button></div></div>';
    } else {
      h += '<div class="card"><div class="table-wrap"><table class="tbl"><thead><tr>' +
        '<th class="no-sort">Tên sự kiện</th><th class="no-sort">Loại</th><th class="no-sort">Ngày</th>' +
        '<th class="no-sort">Địa điểm</th><th class="no-sort">Lặp lại</th><th class="no-sort"></th></tr></thead><tbody>';
      evs.forEach(function (ev) {
        h += '<tr><td><b>' + esc(ev.ten) + '</b>' +
          (ev.moTa ? '<br><span style="font-size:.78rem;color:var(--ink-3)">' + esc(ev.moTa.slice(0, 90)) + '</span>' : '') + '</td>' +
          '<td>' + esc(EVENT_TYPES[ev.loai] || EVENT_TYPES.khac) + '</td>' +
          '<td>' + esc(ev.amLich ? ev.ngayAm + ' ÂL' : fmtDate(ev.ngay)) + '</td>' +
          '<td>' + esc(ev.diaDiem || '—') + '</td>' +
          '<td>' + (ev.lapLai === 'hang_nam' ? '<span class="tag tag--jade">Hằng năm</span>' : '<span class="tag">Một lần</span>') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn btn--sm" data-ev-edit="' + esc(ev.id) + '">Sửa</button> ' +
          '<button class="btn btn--sm btn--danger" data-ev-del="' + esc(ev.id) + '">Xoá</button></td></tr>';
      });
      h += '</tbody></table></div></div>';
    }
    h += '</div>';
    main.innerHTML = h;

    ['btnAddEvent', 'btnAddEvent2'].forEach(function (id) {
      var b = $('#' + id);
      if (b) b.addEventListener('click', function () { eventForm(null); });
    });
    $$('[data-ev-edit]').forEach(function (b) {
      b.addEventListener('click', function () { eventForm(b.dataset.evEdit); });
    });
    $$('[data-ev-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (confirm('Xoá sự kiện này?')) { S.removeEvent(b.dataset.evDel); toast('Đã xoá sự kiện'); route(); }
      });
    });
  };

  function eventForm(id) {
    var ev = id ? (S.getData().events || []).filter(function (e) { return e.id === id; })[0] : null;
    ev = ev || { ten: '', loai: 'le', amLich: true, ngayAm: '', ngay: '', diaDiem: '', moTa: '', lapLai: 'hang_nam' };
    var h = '<div class="form-grid">';
    h += '<div class="field field--full"><label>Tên sự kiện *</label><input class="input" id="evTen" value="' + esc(ev.ten) + '" placeholder="VD: Giỗ Tổ dòng họ"></div>';
    h += '<div class="field"><label>Loại</label><select class="select" id="evLoai">';
    Object.keys(EVENT_TYPES).forEach(function (k) {
      h += '<option value="' + k + '"' + (ev.loai === k ? ' selected' : '') + '>' + EVENT_TYPES[k] + '</option>';
    });
    h += '</select></div>';
    h += '<div class="field"><label>Loại lịch</label><select class="select" id="evLich">' +
      '<option value="am"' + (ev.amLich ? ' selected' : '') + '>Âm lịch (khuyến nghị)</option>' +
      '<option value="duong"' + (!ev.amLich ? ' selected' : '') + '>Dương lịch</option></select></div>';
    h += '<div class="field" id="wrapAm"><label>Ngày âm lịch (ngày/tháng)</label>' +
      '<input class="input" id="evNgayAm" value="' + esc(ev.ngayAm || '') + '" placeholder="VD: 10/3"><div class="hint">Nhập theo dạng ngày/tháng, ví dụ 19/7</div></div>';
    h += '<div class="field" id="wrapDuong"><label>Ngày dương lịch</label><input class="input" type="date" id="evNgay" value="' + esc(ev.ngay || '') + '"></div>';
    h += '<div class="field"><label>Địa điểm</label><input class="input" id="evDiaDiem" value="' + esc(ev.diaDiem || '') + '"></div>';
    h += '<div class="field"><label>Lặp lại</label><select class="select" id="evLap">' +
      '<option value="hang_nam"' + (ev.lapLai === 'hang_nam' ? ' selected' : '') + '>Hằng năm</option>' +
      '<option value="mot_lan"' + (ev.lapLai !== 'hang_nam' ? ' selected' : '') + '>Chỉ một lần</option></select></div>';
    h += '<div class="field field--full"><label>Mô tả</label><textarea class="textarea" id="evMoTa">' + esc(ev.moTa || '') + '</textarea></div>';
    h += '</div>';

    openModal(id ? 'Sửa sự kiện' : 'Thêm sự kiện', h,
      '<button class="btn" data-close>Huỷ</button><button class="btn btn--primary" id="evSave">Lưu</button>');

    function syncLich() {
      var am = $('#evLich').value === 'am';
      $('#wrapAm').style.display = am ? '' : 'none';
      $('#wrapDuong').style.display = am ? 'none' : '';
    }
    $('#evLich').addEventListener('change', syncLich);
    syncLich();

    $('#evSave').addEventListener('click', function () {
      var ten = $('#evTen').value.trim();
      if (!ten) { toast('Cần nhập tên sự kiện', 'err'); return; }
      var am = $('#evLich').value === 'am';
      var ngayAm = $('#evNgayAm').value.trim();
      if (am && !/^\d{1,2}\/\d{1,2}$/.test(ngayAm)) { toast('Ngày âm lịch nhập theo dạng ngày/tháng, VD 10/3', 'err'); return; }
      if (!am && !$('#evNgay').value) { toast('Cần chọn ngày dương lịch', 'err'); return; }
      var patch = {
        ten: ten, loai: $('#evLoai').value, amLich: am,
        ngayAm: am ? ngayAm : '', ngay: am ? '' : $('#evNgay').value,
        diaDiem: $('#evDiaDiem').value.trim(), moTa: $('#evMoTa').value,
        lapLai: $('#evLap').value
      };
      if (id) S.updateEvent(id, patch); else S.addEvent(patch);
      closeModal();
      toast('Đã lưu sự kiện', 'ok');
      route();
    });
  }

  /* ============================ Tra quan hệ ============================ */

  var relState = { a: '', b: '' };

  ROUTES.relation = function (main, params) {
    if (S.members().length < 2) {
      main.innerHTML = '<div class="view"><div class="card"><div class="empty"><div class="empty__icon">🔗</div>' +
        '<h3>Cần ít nhất 2 người</h3><p>Thêm thành viên vào gia phả rồi quay lại đây để tra cứu cách xưng hô.</p></div></div></div>';
      return;
    }
    if (params[0]) relState.a = params[0];
    var ms = S.members().slice().sort(function (a, b) {
      return S.genOf(a.id) - S.genOf(b.id) || a.hoTen.localeCompare(b.hoTen, 'vi');
    });
    // Bỏ lựa chọn cũ nếu người đó không còn trong dữ liệu (VD sau khi nhập tệp khác)
    if (!relState.a || !S.byId(relState.a)) relState.a = ms[ms.length - 1].id;
    if (!relState.b || !S.byId(relState.b) || relState.b === relState.a) relState.b = ms[0].id;

    function optionsFor(sel) {
      return ms.map(function (m) {
        return '<option value="' + esc(m.id) + '"' + (m.id === sel ? ' selected' : '') + '>' +
          esc(m.hoTen) + ' — đời ' + S.genOf(m.id) + (lifeText(m) ? ' (' + esc(lifeText(m)) + ')' : '') + '</option>';
      }).join('');
    }

    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Tra cứu quan hệ</h1><p class="page-head__desc">Chọn hai người bất kỳ để biết cách xưng hô và đường liên hệ huyết thống giữa họ.</p></div></div>';
    h += '<div class="card"><div class="form-grid">' +
      '<div class="field"><label>Người thứ nhất (người xưng)</label><select class="select" id="relA">' + optionsFor(relState.a) + '</select></div>' +
      '<div class="field"><label>Người thứ hai</label><select class="select" id="relB">' + optionsFor(relState.b) + '</select></div>' +
      '</div><div class="btn-row"><button class="btn" id="relSwap">⇄ Đổi chỗ</button></div></div>';
    h += '<div id="relOut"></div></div>';
    main.innerHTML = h;

    $('#relA').addEventListener('change', function () { relState.a = this.value; renderRel(); });
    $('#relB').addEventListener('change', function () { relState.b = this.value; renderRel(); });
    $('#relSwap').addEventListener('click', function () {
      var t = relState.a; relState.a = relState.b; relState.b = t;
      $('#relA').value = relState.a; $('#relB').value = relState.b;
      renderRel();
    });
    renderRel();
  };

  function renderRel() {
    var out = $('#relOut');
    if (!out) return;
    var A = S.byId(relState.a), B = S.byId(relState.b);
    if (!A || !B) { out.innerHTML = ''; return; }
    if (A.id === B.id) {
      out.innerHTML = '<div class="card"><p style="text-align:center;color:var(--ink-2)">Hãy chọn hai người khác nhau.</p></div>';
      return;
    }
    var r = K.describe(A.id, B.id);
    var h = '<div class="card"><div class="card__head"><h2>Kết quả</h2></div>';
    h += '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center;text-align:center;padding:10px 0">' +
      '<div>' + avatar(A, 'avatar--lg') + '<div style="font-weight:600;margin-top:6px">' + esc(A.hoTen) + '</div>' +
      '<div style="font-size:.78rem;color:var(--ink-3)">Đời ' + S.genOf(A.id) + '</div></div>' +
      '<div style="font-size:1.6rem;color:var(--ink-3)">→</div>' +
      '<div>' + avatar(B, 'avatar--lg') + '<div style="font-weight:600;margin-top:6px">' + esc(B.hoTen) + '</div>' +
      '<div style="font-size:.78rem;color:var(--ink-3)">Đời ' + S.genOf(B.id) + '</div></div>' +
      '</div>';
    h += '<div style="text-align:center;padding:14px;background:var(--accent-soft);border-radius:var(--radius);margin:10px 0">' +
      '<div style="font-family:var(--serif);font-size:1.2rem;font-weight:700;color:var(--accent)">' + esc(r.forward) + '</div>' +
      '<div style="margin-top:6px;color:var(--ink-2);font-size:.92rem">' + esc(r.backward) + '</div></div>';

    if (r.chain && r.chain.length > 1) {
      h += '<div class="section-t">Đường liên hệ</div><div class="chips">';
      r.chain.forEach(function (c, i) {
        h += (i ? '<span style="color:var(--ink-3);align-self:center">→</span>' : '') +
          '<span class="chip" data-open="' + esc(c.id) + '">' + esc(c.hoTen) +
          ' <span style="color:var(--ink-3);font-size:.75em">đời ' + c.doi + '</span></span>';
      });
      h += '</div>';
      if (r.r1.lca) {
        var lca = S.byId(r.r1.lca);
        if (lca && lca.id !== A.id && lca.id !== B.id) {
          h += '<p style="margin-top:12px;font-size:.88rem;color:var(--ink-2)">Tổ tiên chung gần nhất: <b>' +
            esc(lca.hoTen) + '</b> (đời ' + S.genOf(lca.id) + '). ' +
            esc(A.hoTen) + ' cách ' + r.r1.dA + ' đời, ' + esc(B.hoTen) + ' cách ' + r.r1.dB + ' đời.</p>';
        }
      }
    }
    h += '</div>';

    // Bảng xưng hô của A với mọi người
    h += '<div class="card"><div class="card__head"><h2>' + esc(A.hoTen) + ' gọi những người khác là gì?</h2></div>' +
      '<div class="table-wrap"><table class="tbl"><thead><tr><th class="no-sort">Người</th><th class="no-sort">Đời</th>' +
      '<th class="no-sort">Cách gọi</th></tr></thead><tbody>';
    S.members().filter(function (m) { return m.id !== A.id; })
      .sort(function (a, b) { return S.genOf(a.id) - S.genOf(b.id) || a.hoTen.localeCompare(b.hoTen, 'vi'); })
      .forEach(function (m) {
        var rel = K.relation(A.id, m.id);
        h += '<tr data-open="' + esc(m.id) + '"><td><div class="person-cell">' + avatar(m, 'avatar--sm') +
          '<span>' + esc(m.hoTen) + '</span></div></td>' +
          '<td><span class="tag tag--doi">' + S.genOf(m.id) + '</span></td>' +
          '<td>' + (rel.type === 'none' ? '<span style="color:var(--ink-3)">' + esc(rel.label) + '</span>' : '<b>' + esc(rel.label) + '</b>') + '</td></tr>';
      });
    h += '</tbody></table></div></div>';
    out.innerHTML = h;
  }

  /* ============================== Tư liệu ============================== */

  ROUTES.docs = function (main) {
    var docs = S.getData().docs || [];
    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Tư liệu dòng họ</h1><p class="page-head__desc">Nguồn gốc, tộc ước, gia phong, ban chấp sự, các bài viết lưu truyền.</p></div>' +
      '<div class="btn-row no-print"><button class="btn btn--primary" id="btnAddDoc">＋ Thêm bài</button>' +
      '<button class="btn" onclick="window.print()">🖨 In</button></div></div>';

    if (!docs.length) {
      h += '<div class="card"><div class="empty"><div class="empty__icon">📖</div>' +
        '<h3>Chưa có tư liệu</h3><p>Ghi lại nguồn gốc dòng họ, tộc ước, những câu chuyện các cụ kể lại…</p>' +
        '<button class="btn btn--primary" id="btnAddDoc2">＋ Viết bài đầu tiên</button></div></div>';
    } else {
      docs.forEach(function (d) {
        h += '<div class="card"><div class="card__head"><h2>' + esc(d.tieuDe) + '</h2>' +
          '<button class="btn btn--sm no-print" data-doc-edit="' + esc(d.id) + '">Sửa</button>' +
          '<button class="btn btn--sm btn--danger no-print" data-doc-del="' + esc(d.id) + '">Xoá</button></div>' +
          '<div class="prose">' + esc(d.noiDung) + '</div></div>';
      });
    }
    h += '</div>';
    main.innerHTML = h;

    ['btnAddDoc', 'btnAddDoc2'].forEach(function (id) {
      var b = $('#' + id);
      if (b) b.addEventListener('click', function () { docForm(null); });
    });
    $$('[data-doc-edit]').forEach(function (b) { b.addEventListener('click', function () { docForm(b.dataset.docEdit); }); });
    $$('[data-doc-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (confirm('Xoá bài viết này?')) { S.removeDoc(b.dataset.docDel); toast('Đã xoá'); route(); }
      });
    });
  };

  function docForm(id) {
    var doc = id ? (S.getData().docs || []).filter(function (d) { return d.id === id; })[0] : null;
    doc = doc || { tieuDe: '', noiDung: '' };
    var h = '<div class="field"><label>Tiêu đề *</label><input class="input" id="dcT" value="' + esc(doc.tieuDe) + '"></div>' +
      '<div class="field"><label>Nội dung</label><textarea class="textarea" id="dcN" style="min-height:280px">' + esc(doc.noiDung) + '</textarea></div>';
    openModal(id ? 'Sửa bài viết' : 'Thêm bài viết', h,
      '<button class="btn" data-close>Huỷ</button><button class="btn btn--primary" id="dcSave">Lưu</button>', { wide: true });
    $('#dcSave').addEventListener('click', function () {
      var t = $('#dcT').value.trim();
      if (!t) { toast('Cần nhập tiêu đề', 'err'); return; }
      var patch = { tieuDe: t, noiDung: $('#dcN').value };
      if (id) S.updateDoc(id, patch); else S.addDoc(patch);
      closeModal(); toast('Đã lưu', 'ok'); route();
    });
  }

  /* ============================== Thống kê ============================== */

  ROUTES.stats = function (main) {
    if (!S.members().length) { main.innerHTML = '<div class="view">' + emptyState() + '</div>'; return; }
    var st = computeStats();
    var avgAge = st.ages.length ? Math.round(st.ages.reduce(function (a, b) { return a + b; }, 0) / st.ages.length) : null;

    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Thống kê dòng họ</h1><p class="page-head__desc">Bức tranh tổng quát về quy mô và cơ cấu của dòng họ.</p></div>' +
      '<div class="btn-row no-print"><button class="btn" onclick="window.print()">🖨 In</button></div></div>';

    h += '<div class="grid grid--stats" style="margin-bottom:18px">' +
      stat(st.total, 'Tổng thành viên', '') +
      stat(st.maxGen, 'Số đời', 'gold') +
      stat(st.alive, 'Còn sống', 'jade') +
      stat(st.dead, 'Đã khuất', '') +
      stat(st.male, 'Nam', 'blue') +
      stat(st.female, 'Nữ', 'pink') +
      (avgAge !== null ? stat(avgAge, 'Tuổi thọ trung bình (người đã mất)', 'gold') : '') +
      '</div>';

    h += '<div class="grid grid--2">';

    h += '<div class="card"><div class="card__head"><h2>Số người theo đời</h2></div><div class="bar-chart">';
    var mxg = Math.max.apply(null, Object.keys(st.byGen).map(function (k) { return st.byGen[k]; }));
    for (var g = 1; g <= st.maxGen; g++) {
      h += barRow('Đời ' + g, st.byGen[g] || 0, mxg, 'gold');
    }
    h += '</div></div>';

    h += '<div class="card"><div class="card__head"><h2>Số người theo chi</h2></div><div class="bar-chart">';
    var mxc = st.byChi.length ? st.byChi[0].n : 1;
    st.byChi.forEach(function (c, i) { h += barRow(c.k, c.n, mxc, ['', 'jade', 'blue', 'pink', 'gold'][i % 5]); });
    h += '</div></div>';

    // Theo thế hệ sinh
    var decades = {};
    S.members().forEach(function (m) {
      var y = +yearOf(m.ngaySinh);
      if (!y) return;
      var d = Math.floor(y / 10) * 10;
      decades[d] = (decades[d] || 0) + 1;
    });
    var dks = Object.keys(decades).sort();
    if (dks.length) {
      h += '<div class="card"><div class="card__head"><h2>Năm sinh theo thập niên</h2></div><div class="bar-chart">';
      var mxd = Math.max.apply(null, dks.map(function (k) { return decades[k]; }));
      dks.forEach(function (k) { h += barRow(k + 's', decades[k], mxd, 'blue'); });
      h += '</div></div>';
    }

    // Gia đình đông con nhất
    var families = S.members().map(function (m) {
      return { m: m, n: S.childrenOf(m.id).length };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    if (families.length) {
      h += '<div class="card"><div class="card__head"><h2>Đông con nhất</h2></div><div class="rel-list">';
      families.forEach(function (f) {
        h += '<div class="rel-item" data-open="' + esc(f.m.id) + '">' + avatar(f.m, 'avatar--sm') +
          '<span><span class="rel-item__n">' + esc(f.m.hoTen) + '</span>' +
          '<span class="rel-item__m"> · đời ' + S.genOf(f.m.id) + '</span></span>' +
          '<span class="rel-item__r">' + f.n + ' người con</span></div>';
      });
      h += '</div></div>';
    }

    // Hậu duệ nhiều nhất
    var descs = S.members().map(function (m) {
      return { m: m, n: S.descendantsOf(m.id).length };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
    if (descs.length) {
      h += '<div class="card"><div class="card__head"><h2>Nhiều hậu duệ nhất</h2></div><div class="rel-list">';
      descs.forEach(function (f) {
        h += '<div class="rel-item" data-open="' + esc(f.m.id) + '">' + avatar(f.m, 'avatar--sm') +
          '<span><span class="rel-item__n">' + esc(f.m.hoTen) + '</span>' +
          '<span class="rel-item__m"> · đời ' + S.genOf(f.m.id) + '</span></span>' +
          '<span class="rel-item__r">' + f.n + ' hậu duệ</span></div>';
      });
      h += '</div></div>';
    }

    h += '</div>';

    // Thiếu thông tin
    var missing = S.members().filter(function (m) {
      return !m.ngaySinh || (!m.fatherId && !m.motherId && S.genOf(m.id) > 1);
    });
    if (missing.length) {
      h += '<div class="card"><div class="card__head"><h2>Cần bổ sung thông tin (' + missing.length + ')</h2></div>' +
        '<p style="font-size:.88rem;color:var(--ink-2)">Những người còn thiếu ngày sinh hoặc chưa nối được với cha mẹ.</p>' +
        '<div class="rel-list">';
      missing.slice(0, 30).forEach(function (m) {
        var lack = [];
        if (!m.ngaySinh) lack.push('ngày sinh');
        if (!m.fatherId && !m.motherId) lack.push('cha mẹ');
        h += '<div class="rel-item" data-open="' + esc(m.id) + '">' + avatar(m, 'avatar--sm') +
          '<span><span class="rel-item__n">' + esc(m.hoTen) + '</span></span>' +
          '<span class="rel-item__r">thiếu ' + esc(lack.join(', ')) + '</span></div>';
      });
      h += '</div></div>';
    }

    h += '</div>';
    main.innerHTML = h;
  };

  /* ============================== Cài đặt ============================== */

  ROUTES.settings = function (main) {
    var d = S.getData();
    var p = S.prefs();
    var size = 0;
    try { size = (localStorage.getItem('giapha.data.v1') || '').length; } catch (e) {}

    var h = '<div class="view"><div class="page-head"><div class="page-head__t">' +
      '<h1>Cài đặt</h1><p class="page-head__desc">Thông tin dòng họ, sao lưu dữ liệu và bảo vệ trang nội bộ.</p></div></div>';

    h += '<div class="card"><div class="card__head"><h2>Thông tin dòng họ</h2></div><div class="form-grid">' +
      f('Tên gia phả', 'stTen', d.meta.tenGiaPha) +
      f('Họ', 'stHo', d.meta.hoTocs) +
      f('Thuỷ tổ', 'stThuyTo', d.meta.thuyTo) +
      f('Năm lập phả', 'stNam', d.meta.namLap, 'number') +
      f('Quê quán', 'stQue', d.meta.queQuan) +
      f('Từ đường', 'stTuDuong', d.meta.tuDuong) +
      '<div class="field field--full"><label>Lời nói đầu</label><textarea class="textarea" id="stLoi" style="min-height:140px">' + esc(d.meta.loiNoiDau || '') + '</textarea></div>' +
      '</div><div class="btn-row"><button class="btn btn--primary" id="stSave">Lưu thông tin</button></div></div>';

    h += '<div class="card"><div class="card__head"><h2>Sao lưu &amp; khôi phục</h2></div>' +
      '<p style="font-size:.9rem;color:var(--ink-2)">Dữ liệu chỉ nằm trong trình duyệt của thiết bị này. ' +
      '<b>Hãy xuất tệp sao lưu thường xuyên</b> và gửi cho người giữ phả để không mất dữ liệu khi đổi máy hay xoá bộ nhớ trình duyệt.</p>' +
      '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn btn--primary" id="btnExpJson">⬇ Xuất tệp gia phả (.json)</button>' +
      '<button class="btn" id="btnImpJson">⬆ Nhập từ tệp (.json / .ged)</button>' +
      '<button class="btn" id="btnExpCsv2">⬇ Xuất CSV (Excel)</button>' +
      '<button class="btn" id="btnExpGed">⬇ Xuất GEDCOM (.ged)</button>' +
      '</div>' +
      '<p style="font-size:.82rem;color:var(--ink-3);margin-top:12px">Dung lượng đang dùng: <b>' +
      (size / 1024).toFixed(1) + ' KB</b> · Cập nhật lần cuối: <b>' +
      esc(d.meta.updatedAt ? new Date(d.meta.updatedAt).toLocaleString('vi-VN') : '—') + '</b></p></div>';

    h += '<div class="card"><div class="card__head"><h2>Mã truy cập nội bộ</h2></div>' +
      '<p style="font-size:.9rem;color:var(--ink-2)">Đặt một mã đơn giản để người ngoài mở trang không xem được ngay. ' +
      'Đây chỉ là lớp che nhẹ ở phía trình duyệt, <b>không phải bảo mật thật</b> — đừng đăng thông tin nhạy cảm lên trang công khai.</p>' +
      '<div class="form-grid" style="margin-top:10px">' +
      '<div class="field"><label>Mã truy cập (để trống = không khoá)</label>' +
      '<input class="input" type="text" id="stPass" value="' + esc(p.pass || '') + '" placeholder="VD: honguyen2024"></div></div>' +
      '<div class="btn-row"><button class="btn btn--primary" id="stPassSave">Lưu mã</button></div></div>';

    h += '<div class="card"><div class="card__head"><h2>Giao diện</h2></div>' +
      '<div class="btn-row">' +
      '<button class="btn" data-theme-set="light">☀️ Sáng</button>' +
      '<button class="btn" data-theme-set="dark">🌙 Tối</button>' +
      '<button class="btn" data-theme-set="auto">🖥️ Theo hệ thống</button>' +
      '</div></div>';

    h += '<div class="card"><div class="card__head"><h2>Vùng nguy hiểm</h2></div>' +
      '<div class="btn-row">' +
      '<button class="btn" id="btnSample">Nạp lại dữ liệu mẫu</button>' +
      '<button class="btn btn--danger" id="btnWipe">🗑 Xoá toàn bộ &amp; bắt đầu trắng</button>' +
      '</div><p style="font-size:.82rem;color:var(--ink-3);margin-top:10px">Nhớ xuất tệp sao lưu trước khi xoá.</p></div>';

    h += '</div>';
    main.innerHTML = h;

    function f(label, id, val, type) {
      return '<div class="field"><label>' + label + '</label><input class="input" type="' + (type || 'text') +
        '" id="' + id + '" value="' + esc(val === undefined || val === null ? '' : val) + '"></div>';
    }

    $('#stSave').addEventListener('click', function () {
      S.snapshot();
      var meta = S.getData().meta;
      meta.tenGiaPha = $('#stTen').value.trim() || 'Gia phả dòng họ';
      meta.hoTocs = $('#stHo').value.trim();
      meta.thuyTo = $('#stThuyTo').value.trim();
      meta.namLap = +$('#stNam').value || meta.namLap;
      meta.queQuan = $('#stQue').value.trim();
      meta.tuDuong = $('#stTuDuong').value.trim();
      meta.loiNoiDau = $('#stLoi').value;
      S.save();
      refreshChrome();
      toast('Đã lưu thông tin dòng họ', 'ok');
    });

    $('#stPassSave').addEventListener('click', function () {
      S.setPref('pass', $('#stPass').value.trim());
      toast($('#stPass').value.trim() ? 'Đã đặt mã truy cập' : 'Đã bỏ khoá', 'ok');
    });

    $('#btnExpJson').addEventListener('click', function () {
      download('gia-pha-' + todayISO() + '.json', S.exportJSON(), 'application/json');
      toast('Đã tải tệp sao lưu', 'ok');
    });
    $('#btnExpCsv2').addEventListener('click', function () {
      download('danh-sach-gia-pha-' + todayISO() + '.csv', S.exportCSV(), 'text/csv');
    });
    $('#btnExpGed').addEventListener('click', function () {
      download('gia-pha-' + todayISO() + '.ged', S.exportGEDCOM(), 'text/plain');
      toast('Đã tải tệp GEDCOM', 'ok');
    });
    $('#btnImpJson').addEventListener('click', pickImportFile);

    $$('[data-theme-set]').forEach(function (b) {
      b.addEventListener('click', function () { setTheme(b.dataset.themeSet); toast('Đã đổi giao diện'); });
    });

    $('#btnSample').addEventListener('click', function () {
      if (!confirm('Nạp lại dữ liệu mẫu sẽ ghi đè toàn bộ dữ liệu hiện tại. Tiếp tục?')) return;
      S.setData(window.SampleData.build());
      refreshChrome(); toast('Đã nạp dữ liệu mẫu', 'ok'); go('home');
    });
    $('#btnWipe').addEventListener('click', function () {
      if (!confirm('XOÁ TOÀN BỘ dữ liệu gia phả trong trình duyệt này?\nHãy chắc chắn bạn đã xuất tệp sao lưu.')) return;
      if (!confirm('Xác nhận lần cuối: xoá hết và bắt đầu với gia phả trắng?')) return;
      S.setData(S.emptyData());
      refreshChrome(); toast('Đã xoá sạch dữ liệu'); go('home');
    });
  };

  function pickImportFile() {
    var picker = $('#filePicker');
    picker.value = '';
    picker.onchange = function () {
      var file = picker.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        var text = String(fr.result);
        try {
          if (/\.ged$/i.test(file.name) || /^0\s+HEAD/m.test(text)) {
            S.importGEDCOM(text);
            toast('Đã nhập từ GEDCOM', 'ok');
          } else {
            S.importJSON(text);
            toast('Đã nhập dữ liệu gia phả', 'ok');
          }
          refreshChrome();
          treeState.rootId = null;
          go('home');
          route();
        } catch (e) {
          console.error(e);
          toast('Tệp không hợp lệ: ' + e.message, 'err');
        }
      };
      fr.readAsText(file, 'utf-8');
    };
    picker.click();
  }

  /* ========================= Biểu mẫu thành viên ========================= */

  var formPhoto = null;

  function memberForm(id, preset) {
    var m = id ? S.byId(id) : null;
    var isNew = !m;
    m = m || S.normalizeMember(preset || {});
    formPhoto = m.anh || '';

    var others = S.members().filter(function (x) { return x.id !== m.id; })
      .sort(function (a, b) { return S.genOf(a.id) - S.genOf(b.id) || a.hoTen.localeCompare(b.hoTen, 'vi'); });

    function personOptions(selId, filterGt) {
      var s = '<option value="">— Chưa xác định —</option>';
      others.forEach(function (o) {
        if (filterGt && o.gioiTinh !== filterGt) return;
        s += '<option value="' + esc(o.id) + '"' + (selId === o.id ? ' selected' : '') + '>' +
          esc(o.hoTen) + ' — đời ' + S.genOf(o.id) + (lifeText(o) ? ' (' + esc(lifeText(o)) + ')' : '') + '</option>';
      });
      return s;
    }

    var chis = {};
    S.members().forEach(function (x) { if (x.chiNhanh) chis[x.chiNhanh] = 1; });

    var h = '';
    h += '<fieldset class="fieldset"><legend>Ảnh &amp; danh tính</legend>';
    h += '<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px;flex-wrap:wrap">' +
      '<div id="fmPhotoWrap">' + (formPhoto
        ? '<img class="avatar avatar--lg" src="' + esc(formPhoto) + '" alt="">'
        : '<span class="avatar avatar--lg' + (m.gioiTinh === 'nu' ? ' avatar--nu' : '') + '">' + esc(initials(m.hoTen)) + '</span>') + '</div>' +
      '<div class="btn-row"><button type="button" class="btn btn--sm" id="fmPhotoPick">Chọn ảnh</button>' +
      '<button type="button" class="btn btn--sm btn--danger" id="fmPhotoDel">Bỏ ảnh</button></div></div>';
    h += '<div class="form-grid">';
    h += '<div class="field field--full"><label>Họ và tên *</label><input class="input" id="fmTen" value="' + esc(m.hoTen) + '" placeholder="VD: Nguyễn Văn Đức"></div>';
    h += '<div class="field"><label>Tên thường gọi</label><input class="input" id="fmTenThuong" value="' + esc(m.tenThuong) + '"></div>';
    h += '<div class="field"><label>Tên tự / hiệu / thuỵ</label><input class="input" id="fmTenTu" value="' + esc(m.tenTu) + '"></div>';
    h += '<div class="field"><label>Giới tính</label><select class="select" id="fmGt">' +
      '<option value="nam"' + (m.gioiTinh === 'nam' ? ' selected' : '') + '>Nam</option>' +
      '<option value="nu"' + (m.gioiTinh === 'nu' ? ' selected' : '') + '>Nữ</option></select></div>';
    h += '<div class="field"><label>Chi / nhánh</label><input class="input" id="fmChi" list="chiList" value="' + esc(m.chiNhanh) + '" placeholder="VD: Chi Trưởng">' +
      '<datalist id="chiList">' + Object.keys(chis).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>';
    h += '<div class="field"><label>Thứ tự trong nhà</label><input class="input" type="number" id="fmThuTu" value="' + (m.thuTu || 0) + '"><div class="hint">Số nhỏ đứng trước (con cả = 1)</div></div>';
    h += '</div></fieldset>';

    h += '<fieldset class="fieldset"><legend>Sinh — Mất</legend><div class="form-grid">';
    h += '<div class="field"><label>Ngày sinh (dương lịch)</label><input class="input" type="date" id="fmSinh" value="' + esc(m.ngaySinh) + '">' +
      '<div class="hint" id="fmSinhAm"></div></div>';
    h += '<div class="field"><label>Ngày mất (dương lịch)</label><input class="input" type="date" id="fmMat" value="' + esc(m.ngayMat) + '">' +
      '<div class="hint" id="fmMatAm"></div></div>';
    h += '<div class="field"><label>Nơi sinh</label><input class="input" id="fmNoiSinh" value="' + esc(m.noiSinh) + '"></div>';
    h += '<div class="field"><label>Nơi an táng</label><input class="input" id="fmAnTang" value="' + esc(m.noiAnTang) + '"></div>';
    h += '<div class="field field--full"><label class="check"><input type="checkbox" id="fmConSong"' +
      (!isDead(m) ? ' checked' : '') + '> Người này còn sống</label></div>';
    h += '</div></fieldset>';

    h += '<fieldset class="fieldset"><legend>Quan hệ</legend><div class="form-grid">';
    h += '<div class="field"><label>Cha</label><select class="select" id="fmCha">' + personOptions(m.fatherId, 'nam') + '</select></div>';
    h += '<div class="field"><label>Mẹ</label><select class="select" id="fmMe">' + personOptions(m.motherId, 'nu') + '</select></div>';
    h += '<div class="field field--full"><label>Vợ / chồng</label><div class="chips" id="fmSpouses"></div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
      '<select class="select" id="fmSpousePick" style="flex:1;min-width:180px">' + personOptions('') + '</select>' +
      '<button type="button" class="btn btn--sm" id="fmSpouseAdd">＋ Thêm</button></div></div>';
    h += '</div></fieldset>';

    h += '<fieldset class="fieldset"><legend>Đời sống</legend><div class="form-grid">';
    h += '<div class="field"><label>Quê quán</label><input class="input" id="fmQue" value="' + esc(m.queQuan) + '"></div>';
    h += '<div class="field"><label>Nghề nghiệp</label><input class="input" id="fmNghe" value="' + esc(m.ngheNghiep) + '"></div>';
    h += '<div class="field"><label>Học vấn</label><input class="input" id="fmHocVan" value="' + esc(m.hocVan) + '"></div>';
    h += '<div class="field"><label>Chức vụ</label><input class="input" id="fmChucVu" value="' + esc(m.chucVu) + '"></div>';
    h += '<div class="field"><label>Điện thoại</label><input class="input" id="fmDt" value="' + esc(m.dienThoai) + '"></div>';
    h += '<div class="field"><label>Email</label><input class="input" type="email" id="fmEmail" value="' + esc(m.email) + '"></div>';
    h += '<div class="field field--full"><label>Địa chỉ hiện nay</label><input class="input" id="fmDiaChi" value="' + esc(m.diaChi) + '"></div>';
    h += '<div class="field field--full"><label>Tiểu sử</label><textarea class="textarea" id="fmTieuSu">' + esc(m.tieuSu) + '</textarea></div>';
    h += '<div class="field field--full"><label>Công trạng / sự nghiệp</label><textarea class="textarea" id="fmCongTrang">' + esc(m.congTrang) + '</textarea></div>';
    h += '<div class="field field--full"><label>Ghi chú</label><textarea class="textarea" id="fmGhiChu">' + esc(m.ghiChu) + '</textarea></div>';
    h += '</div></fieldset>';

    openModal(isNew ? 'Thêm thành viên' : 'Sửa thông tin: ' + m.hoTen, h,
      '<button class="btn" data-close>Huỷ</button>' +
      '<button class="btn btn--primary" id="fmSave">' + (isNew ? 'Thêm vào gia phả' : 'Lưu thay đổi') + '</button>',
      { wide: true });

    var pendingSpouses = m.spouses.slice();

    function renderSpouses() {
      var box = $('#fmSpouses');
      if (!pendingSpouses.length) {
        box.innerHTML = '<span style="font-size:.84rem;color:var(--ink-3)">Chưa có</span>';
        return;
      }
      box.innerHTML = pendingSpouses.map(function (s, i) {
        var p = S.byId(s.id);
        return '<span class="chip is-on">' + esc(p ? p.hoTen : '?') +
          '<span class="chip__x" data-sp-del="' + i + '">✕</span></span>';
      }).join('');
      $$('[data-sp-del]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          pendingSpouses.splice(+b.dataset.spDel, 1);
          renderSpouses();
        });
      });
    }
    renderSpouses();

    $('#fmSpouseAdd').addEventListener('click', function () {
      var v = $('#fmSpousePick').value;
      if (!v) return;
      if (pendingSpouses.some(function (s) { return s.id === v; })) { toast('Đã có trong danh sách'); return; }
      pendingSpouses.push({ id: v, quanHe: 'vo_chong', ngayCuoi: '' });
      renderSpouses();
    });

    function syncAm() {
      var s = $('#fmSinh').value, mt = $('#fmMat').value;
      var a1 = s ? L.amFromISO(s) : null;
      var a2 = mt ? L.amFromISO(mt) : null;
      $('#fmSinhAm').textContent = a1 ? 'Âm lịch: ' + a1.d + '/' + a1.m + (a1.leap ? ' nhuận' : '') + ' năm ' + L.canChiNam(a1.y) + ' (' + L.conGiapNam(a1.y) + ')' : '';
      $('#fmMatAm').textContent = a2 ? 'Ngày giỗ: ' + a2.d + '/' + a2.m + ' âm lịch' : '';
      if (mt) $('#fmConSong').checked = false;
    }
    $('#fmSinh').addEventListener('change', syncAm);
    $('#fmMat').addEventListener('change', syncAm);
    syncAm();

    $('#fmGt').addEventListener('change', function () {
      var w = $('#fmPhotoWrap');
      if (!formPhoto) {
        w.innerHTML = '<span class="avatar avatar--lg' + (this.value === 'nu' ? ' avatar--nu' : '') + '">' +
          esc(initials($('#fmTen').value)) + '</span>';
      }
    });

    $('#fmPhotoPick').addEventListener('click', function () {
      var pk = $('#photoPicker');
      pk.value = '';
      pk.onchange = function () {
        var file = pk.files[0];
        if (!file) return;
        resizeImage(file, 360, function (dataUrl) {
          formPhoto = dataUrl;
          $('#fmPhotoWrap').innerHTML = '<img class="avatar avatar--lg" src="' + esc(dataUrl) + '" alt="">';
        });
      };
      pk.click();
    });
    $('#fmPhotoDel').addEventListener('click', function () {
      formPhoto = '';
      $('#fmPhotoWrap').innerHTML = '<span class="avatar avatar--lg' + ($('#fmGt').value === 'nu' ? ' avatar--nu' : '') + '">' +
        esc(initials($('#fmTen').value)) + '</span>';
    });

    $('#fmSave').addEventListener('click', function () {
      var ten = $('#fmTen').value.trim();
      if (!ten) { toast('Cần nhập họ tên', 'err'); $('#fmTen').focus(); return; }
      var cha = $('#fmCha').value || null, me = $('#fmMe').value || null;
      if (cha === m.id || me === m.id) { toast('Không thể tự làm cha/mẹ chính mình', 'err'); return; }
      if (!isNew && cha && S.ancestorMap(cha)[m.id] !== undefined && S.ancestorMap(cha)[m.id] > 0) {
        toast('Chọn cha như vậy sẽ tạo vòng lặp trong phả hệ', 'err'); return;
      }
      var patch = {
        hoTen: ten,
        tenThuong: $('#fmTenThuong').value.trim(),
        tenTu: $('#fmTenTu').value.trim(),
        gioiTinh: $('#fmGt').value,
        chiNhanh: $('#fmChi').value.trim(),
        thuTu: +$('#fmThuTu').value || 0,
        ngaySinh: $('#fmSinh').value,
        ngayMat: $('#fmMat').value,
        conSong: $('#fmConSong').checked && !$('#fmMat').value,
        noiSinh: $('#fmNoiSinh').value.trim(),
        noiAnTang: $('#fmAnTang').value.trim(),
        fatherId: cha, motherId: me,
        spouses: pendingSpouses,
        queQuan: $('#fmQue').value.trim(),
        ngheNghiep: $('#fmNghe').value.trim(),
        hocVan: $('#fmHocVan').value.trim(),
        chucVu: $('#fmChucVu').value.trim(),
        dienThoai: $('#fmDt').value.trim(),
        email: $('#fmEmail').value.trim(),
        diaChi: $('#fmDiaChi').value.trim(),
        tieuSu: $('#fmTieuSu').value,
        congTrang: $('#fmCongTrang').value,
        ghiChu: $('#fmGhiChu').value,
        anh: formPhoto
      };
      var saved;
      if (isNew) saved = S.addMember(patch);
      else saved = S.updateMember(m.id, patch);
      closeModal();
      toast(isNew ? 'Đã thêm ' + ten + ' vào gia phả' : 'Đã lưu thay đổi', 'ok');
      refreshChrome();
      route();
      if (saved) setTimeout(function () { openDrawer(saved.id); }, 120);
    });
  }

  function resizeImage(file, maxSize, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.width, hgt = img.height;
        var scale = Math.min(1, maxSize / Math.max(w, hgt));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * scale);
        cv.height = Math.round(hgt * scale);
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { toast('Không đọc được ảnh', 'err'); };
      img.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  }

  /* ============================== Giao diện ============================== */

  function setTheme(mode) {
    S.setPref('theme', mode);
    applyTheme();
  }

  function applyTheme() {
    var mode = S.prefs().theme || 'auto';
    var dark = mode === 'dark' ||
      (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var btn = $('#btnTheme');
    if (btn) btn.textContent = dark ? '☀️' : '🌙';
  }

  function refreshChrome() {
    var d = S.getData();
    $('#brandName').textContent = d.meta.tenGiaPha || 'Gia phả dòng họ';
    $('#brandSub').textContent = d.meta.hoTocs ? 'Họ ' + d.meta.hoTocs : 'Phả hệ nội bộ';
    document.title = (d.meta.tenGiaPha || 'Gia phả') + ' — Phả hệ dòng họ';
    $('#badgeCount').textContent = S.members().length;
    var soon = upcomingList(30).length;
    $('#badgeGio').textContent = soon;
    $('#badgeGio').style.display = soon ? '' : 'none';
    $('#lastSaved').textContent = d.meta.updatedAt
      ? 'Lưu lúc ' + new Date(d.meta.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
      : '';
  }

  /* ============================ Màn hình khoá ============================ */

  function checkLock(done) {
    var pass = S.prefs().pass;
    if (!pass) { done(); return; }
    if (sessionStorage.getItem('giapha.unlocked') === '1') { done(); return; }
    var scr = $('#lockScreen');
    scr.hidden = false;
    $('#app').style.display = 'none';
    var d = S.getData();
    $('#lockTitle').textContent = d.meta.tenGiaPha || 'Gia phả dòng họ';
    $('#lockInput').focus();
    $('#lockForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('#lockInput').value === pass) {
        sessionStorage.setItem('giapha.unlocked', '1');
        scr.hidden = true;
        $('#app').style.display = '';
        done();
      } else {
        $('#lockErr').textContent = 'Mã chưa đúng, thử lại nhé.';
        $('#lockInput').select();
      }
    });
  }

  /* ============================== Khởi động ============================== */

  function boot() {
    applyTheme();
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if ((S.prefs().theme || 'auto') === 'auto') applyTheme();
      });
    }

    var loaded = S.load();
    if (!loaded) {
      // Lần đầu mở: nạp dữ liệu mẫu để người dùng thấy ngay giao diện đầy đủ
      S.setData(window.SampleData.build());
      S.setPref('seeded', true);
    }

    checkLock(function () {
      refreshChrome();
      route();
    });

    S.on(function () { refreshChrome(); });

    window.addEventListener('hashchange', route);

    bindSearch();
    bindGlobalEvents();
  }

  function bindGlobalEvents() {
    $('#btnMenu').addEventListener('click', function () { $('#sidebar').classList.toggle('is-open'); });
    $('#btnTheme').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });
    $('#btnAdd').addEventListener('click', function () { memberForm(null); });

    $$('.nav-item').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.route); });
    });

    $('#drawerClose').addEventListener('click', closeDrawer);
    $('#drawerScrim').addEventListener('click', closeDrawer);
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalScrim').addEventListener('click', function (e) {
      if (e.target === $('#modalScrim')) closeModal();
    });

    // Uỷ nhiệm sự kiện toàn cục
    document.addEventListener('click', function (e) {
      var t = e.target;

      var closeBtn = t.closest('[data-close]');
      if (closeBtn) { closeModal(); return; }

      var goBtn = t.closest('[data-go]');
      if (goBtn) { go(goBtn.dataset.go); return; }

      var openEl = t.closest('[data-open]');
      if (openEl && !t.closest('.ol-caret')) { openDrawer(openEl.dataset.open); return; }

      var caret = t.closest('[data-ol]');
      if (caret) {
        e.stopPropagation();
        var oid = caret.dataset.ol;
        outlineCollapsed[oid] = !outlineCollapsed[oid];
        route();
        return;
      }

      var act = t.closest('[data-act]');
      if (act) handleAction(act.dataset.act);
    });

    // Phím tắt
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($('#modalScrim').classList.contains('is-open')) closeModal();
        else if ($('#drawer').classList.contains('is-open')) closeDrawer();
        return;
      }
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); $('#globalSearch').focus(); $('#globalSearch').select(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) { if (S.redo()) { toast('Đã làm lại'); route(); } }
        else { if (S.undo()) { toast('Đã hoàn tác'); route(); } }
        return;
      }
      if (typing) return;
      if (e.key === 'n' || e.key === 'N') { memberForm(null); }
      if (e.key === '/') { e.preventDefault(); $('#globalSearch').focus(); }
    });

    // Nhắc sao lưu khi rời trang sau khi có thay đổi
    window.addEventListener('beforeunload', function () {
      try { S.save(true); } catch (e) {}
    });
  }

  function handleAction(act) {
    if (act === 'add' || act === 'addFirst') { memberForm(null); return; }
    if (act === 'loadSample') {
      S.setData(window.SampleData.build());
      refreshChrome(); toast('Đã nạp dữ liệu mẫu', 'ok'); route(); return;
    }
    if (act === 'importFile') { pickImportFile(); return; }

    if (!drawerId) return;
    var m = S.byId(drawerId);
    if (!m) return;

    if (act === 'edit') { memberForm(m.id); return; }
    if (act === 'addChild') {
      var preset = m.gioiTinh === 'nam'
        ? { fatherId: m.id, motherId: (m.spouses[0] || {}).id || null, chiNhanh: m.chiNhanh }
        : { motherId: m.id, fatherId: (m.spouses[0] || {}).id || null, chiNhanh: m.chiNhanh };
      preset.thuTu = S.childrenOf(m.id).length + 1;
      memberForm(null, preset);
      return;
    }
    if (act === 'addSpouse') {
      memberForm(null, {
        gioiTinh: m.gioiTinh === 'nam' ? 'nu' : 'nam',
        spouses: [{ id: m.id, quanHe: 'vo_chong', ngayCuoi: '' }],
        chiNhanh: m.chiNhanh
      });
      return;
    }
    if (act === 'focusTree') {
      var anc = S.ancestorMap(m.id);
      var rootId = m.id, best = -1;
      Object.keys(anc).forEach(function (k) { if (anc[k] > best) { best = anc[k]; rootId = k; } });
      treeState.rootId = rootId;
      treeState.collapsed = {};
      closeDrawer();
      go('tree', rootId);
      setTimeout(function () {
        openDrawer(m.id);
        var node = $('.tree-card[data-id="' + m.id + '"]');
        if (node && treeState.pz && lastLayout) {
          var tr = node.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
          if (tr) treeState.pz.centerOn(+tr[1] - lastLayout.minX + T.CARD_W / 2, +tr[2]);
        }
      }, 350);
      return;
    }
    if (act === 'del') {
      var kids = S.childrenOf(m.id);
      var msg = 'Xoá ' + m.hoTen + ' khỏi gia phả?';
      if (kids.length) msg += '\n\nLưu ý: ' + kids.length + ' người con sẽ mất liên kết với người này (không bị xoá).';
      if (!confirm(msg)) return;
      S.removeMember(m.id);
      closeDrawer();
      toast('Đã xoá ' + m.hoTen);
      refreshChrome();
      route();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
