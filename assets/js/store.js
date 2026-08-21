/* ==========================================================================
   store.js — Tầng dữ liệu gia phả
   Lưu trong localStorage của trình duyệt + nhập/xuất tệp JSON.
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'giapha.data.v1';
  var KEY_PREFS = 'giapha.prefs.v1';
  var SCHEMA = 1;

  /* ------------------------------ Tiện ích ------------------------------ */

  function uid(prefix) {
    return (prefix || 'm') + '_' + Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function nowISO() { return new Date().toISOString(); }

  /* --------------------------- Cấu trúc rỗng --------------------------- */

  function emptyData() {
    return {
      schema: SCHEMA,
      meta: {
        tenGiaPha: 'Gia phả dòng họ',
        hoTocs: '',
        thuyTo: '',
        namLap: new Date().getFullYear(),
        tuDuong: '',
        queQuan: '',
        loiNoiDau: '',
        updatedAt: nowISO()
      },
      members: [],
      events: [],
      docs: []
    };
  }

  function normalizeMember(m) {
    return {
      id: m.id || uid('m'),
      hoTen: (m.hoTen || '').trim(),
      tenThuong: m.tenThuong || '',
      tenTu: m.tenTu || '',          // tên tự / tên hiệu / thuỵ hiệu
      gioiTinh: m.gioiTinh === 'nu' ? 'nu' : 'nam',
      fatherId: m.fatherId || null,
      motherId: m.motherId || null,
      spouses: Array.isArray(m.spouses) ? m.spouses.map(function (s) {
        return {
          id: s.id,
          quanHe: s.quanHe || 'vo_chong',  // vo_chong | ke | ly_hon
          ngayCuoi: s.ngayCuoi || ''
        };
      }) : [],
      thuTu: typeof m.thuTu === 'number' ? m.thuTu : 0,
      chiNhanh: m.chiNhanh || '',
      ngaySinh: m.ngaySinh || '',
      ngaySinhAm: !!m.ngaySinhAm,     // true nếu ngày nhập là âm lịch
      ngayMat: m.ngayMat || '',
      ngayMatAm: !!m.ngayMatAm,
      gioAm: m.gioAm || '',           // ngày giỗ âm lịch dạng "d/m" (ghi đè nếu cần)
      conSong: m.conSong !== false && !m.ngayMat,
      noiSinh: m.noiSinh || '',
      queQuan: m.queQuan || '',
      noiAnTang: m.noiAnTang || '',
      ngheNghiep: m.ngheNghiep || '',
      hocVan: m.hocVan || '',
      chucVu: m.chucVu || '',
      dienThoai: m.dienThoai || '',
      email: m.email || '',
      diaChi: m.diaChi || '',
      anh: m.anh || '',
      tieuSu: m.tieuSu || '',
      congTrang: m.congTrang || '',
      ghiChu: m.ghiChu || '',
      createdAt: m.createdAt || nowISO(),
      updatedAt: m.updatedAt || nowISO()
    };
  }

  /* ------------------------------- Store ------------------------------- */

  var data = null;
  var listeners = [];
  var undoStack = [];
  var redoStack = [];
  var MAX_UNDO = 40;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        data = migrate(JSON.parse(raw));
      } else {
        data = null;
      }
    } catch (e) {
      console.error('Không đọc được dữ liệu đã lưu:', e);
      data = null;
    }
    return data;
  }

  function migrate(d) {
    if (!d || typeof d !== 'object') return emptyData();
    var base = emptyData();
    d.schema = SCHEMA;
    d.meta = Object.assign(base.meta, d.meta || {});
    d.members = (d.members || []).map(normalizeMember);
    d.events = d.events || [];
    d.docs = d.docs || [];
    return d;
  }

  function save(skipSnapshot) {
    if (!data) return;
    data.meta.updatedAt = nowISO();
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      alert('Không lưu được dữ liệu (bộ nhớ trình duyệt đầy). ' +
        'Hãy xuất tệp sao lưu và bớt ảnh dung lượng lớn.');
      console.error(e);
    }
    if (!skipSnapshot) emit();
  }

  function snapshot() {
    if (!data) return;
    undoStack.push(JSON.stringify(data));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
  }

  function undo() {
    if (!undoStack.length) return false;
    redoStack.push(JSON.stringify(data));
    data = migrate(JSON.parse(undoStack.pop()));
    save();
    return true;
  }

  function redo() {
    if (!redoStack.length) return false;
    undoStack.push(JSON.stringify(data));
    data = migrate(JSON.parse(redoStack.pop()));
    save();
    return true;
  }

  function canUndo() { return undoStack.length > 0; }
  function canRedo() { return redoStack.length > 0; }

  function on(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (f) { try { f(data); } catch (e) { console.error(e); } }); }

  function setData(d) {
    snapshot();
    data = migrate(d);
    save();
  }

  function getData() {
    if (!data) data = emptyData();
    return data;
  }

  /* ---------------------------- Thành viên ---------------------------- */

  function members() { return getData().members; }

  function byId(id) {
    if (!id) return null;
    var list = members();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function addMember(m) {
    snapshot();
    var nm = normalizeMember(m);
    getData().members.push(nm);
    linkSpouseBoth(nm);
    save();
    return nm;
  }

  function updateMember(id, patch) {
    snapshot();
    var m = byId(id);
    if (!m) return null;
    Object.assign(m, normalizeMember(Object.assign({}, m, patch, { id: id })));
    m.updatedAt = nowISO();
    linkSpouseBoth(m);
    save();
    return m;
  }

  /** Bảo đảm quan hệ vợ/chồng là hai chiều */
  function linkSpouseBoth(m) {
    m.spouses.forEach(function (s) {
      var sp = byId(s.id);
      if (!sp) return;
      var found = sp.spouses.filter(function (x) { return x.id === m.id; })[0];
      if (!found) {
        sp.spouses.push({ id: m.id, quanHe: s.quanHe, ngayCuoi: s.ngayCuoi });
      } else {
        found.quanHe = s.quanHe;
        found.ngayCuoi = s.ngayCuoi;
      }
    });
    // gỡ liên kết một chiều còn sót
    members().forEach(function (other) {
      if (other.id === m.id) return;
      var linkedFromOther = other.spouses.some(function (x) { return x.id === m.id; });
      var linkedFromMe = m.spouses.some(function (x) { return x.id === other.id; });
      if (linkedFromOther && !linkedFromMe) {
        other.spouses = other.spouses.filter(function (x) { return x.id !== m.id; });
      }
    });
  }

  function removeMember(id) {
    snapshot();
    var d = getData();
    d.members = d.members.filter(function (m) { return m.id !== id; });
    d.members.forEach(function (m) {
      if (m.fatherId === id) m.fatherId = null;
      if (m.motherId === id) m.motherId = null;
      m.spouses = m.spouses.filter(function (s) { return s.id !== id; });
    });
    save();
  }

  /* ---------------------------- Quan hệ ---------------------------- */

  function childrenOf(id) {
    return members().filter(function (m) {
      return m.fatherId === id || m.motherId === id;
    }).sort(sortSiblings);
  }

  /** Con chung của một cặp (nếu spouseId null: con mà người kia không xác định) */
  function childrenOfCouple(aId, bId) {
    return members().filter(function (m) {
      return (m.fatherId === aId && m.motherId === bId) ||
             (m.fatherId === bId && m.motherId === aId);
    }).sort(sortSiblings);
  }

  function sortSiblings(a, b) {
    if (a.thuTu !== b.thuTu) return (a.thuTu || 0) - (b.thuTu || 0);
    var ay = yearOf(a.ngaySinh), by = yearOf(b.ngaySinh);
    if (ay && by && ay !== by) return ay - by;
    if (a.ngaySinh && b.ngaySinh) return a.ngaySinh < b.ngaySinh ? -1 : 1;
    if (a.ngaySinh) return -1;
    if (b.ngaySinh) return 1;
    return a.hoTen.localeCompare(b.hoTen, 'vi');
  }

  function yearOf(iso) {
    var m = (iso || '').match(/^(\d{4})/);
    return m ? +m[1] : 0;
  }

  function spousesOf(id) {
    var m = byId(id);
    if (!m) return [];
    return m.spouses.map(function (s) {
      var p = byId(s.id);
      return p ? Object.assign({}, s, { person: p }) : null;
    }).filter(Boolean);
  }

  function parentsOf(id) {
    var m = byId(id);
    if (!m) return [];
    return [byId(m.fatherId), byId(m.motherId)].filter(Boolean);
  }

  function siblingsOf(id) {
    var m = byId(id);
    if (!m) return [];
    return members().filter(function (x) {
      if (x.id === id) return false;
      return (m.fatherId && x.fatherId === m.fatherId) ||
             (m.motherId && x.motherId === m.motherId);
    }).sort(sortSiblings);
  }

  /** Các thuỷ tổ: không có cha lẫn mẹ trong dữ liệu */
  function roots() {
    var list = members().filter(function (m) { return !m.fatherId && !m.motherId; });
    // Người đã kết hôn vào dòng họ (dâu/rể) không tính là gốc riêng nếu vợ/chồng có cha mẹ
    var filtered = list.filter(function (m) {
      return !m.spouses.some(function (s) {
        var sp = byId(s.id);
        return sp && (sp.fatherId || sp.motherId);
      });
    });
    var base = filtered.length ? filtered : list;
    // Mỗi cặp vợ chồng chỉ giữ một người làm gốc (ưu tiên người có con)
    var skip = {};
    base.forEach(function (m) {
      if (skip[m.id]) return;
      m.spouses.forEach(function (s) {
        var sp = byId(s.id);
        if (!sp || skip[sp.id] || !base.some(function (x) { return x.id === sp.id; })) return;
        var mine = childrenOf(m.id).length, theirs = childrenOf(sp.id).length;
        if (theirs > mine) skip[m.id] = true;
        else skip[sp.id] = true;
      });
    });
    return base.filter(function (m) { return !skip[m.id]; }).sort(sortSiblings);
  }

  /** Bản đồ id -> đời (đời 1 = thuỷ tổ) */
  var _genCache = null;
  var _genCacheStamp = null;

  function generations() {
    var stamp = getData().meta.updatedAt + ':' + members().length;
    if (_genCache && _genCacheStamp === stamp) return _genCache;
    var gen = {};
    var rs = roots();
    var queue = [];
    rs.forEach(function (r) { gen[r.id] = 1; queue.push(r.id); });
    var guard = 0;
    while (queue.length && guard++ < 100000) {
      var id = queue.shift();
      var g = gen[id];
      // vợ/chồng cùng đời
      spousesOf(id).forEach(function (s) {
        if (gen[s.person.id] === undefined) { gen[s.person.id] = g; queue.push(s.person.id); }
      });
      childrenOf(id).forEach(function (c) {
        if (gen[c.id] === undefined || gen[c.id] < g + 1) {
          gen[c.id] = g + 1; queue.push(c.id);
        }
      });
    }
    members().forEach(function (m) { if (gen[m.id] === undefined) gen[m.id] = 1; });
    _genCache = gen;
    _genCacheStamp = stamp;
    return gen;
  }

  function genOf(id) { return generations()[id] || 1; }

  function maxGen() {
    var g = generations(), max = 1;
    for (var k in g) if (g[k] > max) max = g[k];
    return max;
  }

  /** Tổ tiên trực hệ: {id: khoảng cách} */
  function ancestorMap(id) {
    var out = {};
    var stack = [{ id: id, d: 0 }];
    var seen = {};
    while (stack.length) {
      var cur = stack.pop();
      if (seen[cur.id]) continue;
      seen[cur.id] = true;
      out[cur.id] = Math.min(out[cur.id] === undefined ? Infinity : out[cur.id], cur.d);
      var m = byId(cur.id);
      if (!m) continue;
      if (m.fatherId) stack.push({ id: m.fatherId, d: cur.d + 1 });
      if (m.motherId) stack.push({ id: m.motherId, d: cur.d + 1 });
    }
    return out;
  }

  function descendantsOf(id) {
    var out = [];
    var seen = {};
    var stack = [id];
    while (stack.length) {
      var cur = stack.pop();
      childrenOf(cur).forEach(function (c) {
        if (seen[c.id]) return;
        seen[c.id] = true;
        out.push(c);
        stack.push(c.id);
      });
    }
    return out;
  }

  /* ------------------------ Sự kiện & tài liệu ------------------------ */

  function addEvent(ev) {
    snapshot();
    ev.id = ev.id || uid('e');
    getData().events.push(ev);
    save();
    return ev;
  }
  function updateEvent(id, patch) {
    snapshot();
    var d = getData();
    for (var i = 0; i < d.events.length; i++) {
      if (d.events[i].id === id) { Object.assign(d.events[i], patch); break; }
    }
    save();
  }
  function removeEvent(id) {
    snapshot();
    var d = getData();
    d.events = d.events.filter(function (e) { return e.id !== id; });
    save();
  }

  function addDoc(doc) {
    snapshot();
    doc.id = doc.id || uid('d');
    doc.updatedAt = nowISO();
    getData().docs.push(doc);
    save();
    return doc;
  }
  function updateDoc(id, patch) {
    snapshot();
    var d = getData();
    for (var i = 0; i < d.docs.length; i++) {
      if (d.docs[i].id === id) { Object.assign(d.docs[i], patch, { updatedAt: nowISO() }); break; }
    }
    save();
  }
  function removeDoc(id) {
    snapshot();
    var d = getData();
    d.docs = d.docs.filter(function (x) { return x.id !== id; });
    save();
  }

  /* ------------------------------ Prefs ------------------------------ */

  function prefs() {
    try { return JSON.parse(localStorage.getItem(KEY_PREFS) || '{}'); }
    catch (e) { return {}; }
  }
  function setPref(k, v) {
    var p = prefs();
    p[k] = v;
    localStorage.setItem(KEY_PREFS, JSON.stringify(p));
  }

  /* --------------------------- Nhập / Xuất --------------------------- */

  function exportJSON() {
    return JSON.stringify(getData(), null, 2);
  }

  function importJSON(text) {
    var d = JSON.parse(text);
    if (!d || !Array.isArray(d.members)) throw new Error('Tệp không đúng định dạng gia phả.');
    setData(d);
    return d;
  }

  function exportCSV() {
    var g = generations();
    var cols = ['id', 'hoTen', 'tenThuong', 'gioiTinh', 'doi', 'chiNhanh', 'ngaySinh', 'ngayMat',
      'cha', 'me', 'vo_chong', 'queQuan', 'ngheNghiep', 'noiAnTang', 'dienThoai', 'ghiChu'];
    var rows = [cols.join(',')];
    members().forEach(function (m) {
      var f = byId(m.fatherId), mo = byId(m.motherId);
      var sp = spousesOf(m.id).map(function (s) { return s.person.hoTen; }).join(' | ');
      var vals = [m.id, m.hoTen, m.tenThuong, m.gioiTinh === 'nam' ? 'Nam' : 'Nữ', g[m.id],
        m.chiNhanh, m.ngaySinh, m.ngayMat, f ? f.hoTen : '', mo ? mo.hoTen : '', sp,
        m.queQuan, m.ngheNghiep, m.noiAnTang, m.dienThoai, m.ghiChu];
      rows.push(vals.map(csvCell).join(','));
    });
    return '﻿' + rows.join('\r\n');
  }

  function csvCell(v) {
    v = (v === null || v === undefined) ? '' : String(v);
    if (/[",\r\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  /** Xuất GEDCOM 5.5.1 để tương thích phần mềm gia phả khác */
  function exportGEDCOM() {
    var out = [];
    var d = getData();
    out.push('0 HEAD');
    out.push('1 SOUR MINIGIAPHA');
    out.push('2 NAME Mini Gia Pha');
    out.push('1 GEDC');
    out.push('2 VERS 5.5.1');
    out.push('2 FORM LINEAGE-LINKED');
    out.push('1 CHAR UTF-8');
    out.push('1 DATE ' + gedDate(new Date().toISOString().slice(0, 10)));

    var idxOf = {};
    d.members.forEach(function (m, i) { idxOf[m.id] = 'I' + (i + 1); });

    // Xây danh sách gia đình (cặp vợ chồng + con)
    var fams = [];
    var famKey = {};
    function famFor(hId, wId) {
      var key = (hId || '-') + '::' + (wId || '-');
      if (famKey[key] !== undefined) return famKey[key];
      famKey[key] = fams.length;
      fams.push({ husb: hId, wife: wId, chil: [] });
      return famKey[key];
    }
    d.members.forEach(function (m) {
      m.spouses.forEach(function (s) {
        var other = byId(s.id);
        if (!other) return;
        var h = m.gioiTinh === 'nam' ? m.id : other.id;
        var w = m.gioiTinh === 'nam' ? other.id : m.id;
        famFor(h, w);
      });
    });
    d.members.forEach(function (m) {
      if (m.fatherId || m.motherId) {
        var i = famFor(m.fatherId, m.motherId);
        fams[i].chil.push(m.id);
      }
    });

    d.members.forEach(function (m, i) {
      out.push('0 @' + idxOf[m.id] + '@ INDI');
      out.push('1 NAME ' + gedName(m.hoTen));
      out.push('1 SEX ' + (m.gioiTinh === 'nam' ? 'M' : 'F'));
      if (m.ngaySinh) {
        out.push('1 BIRT');
        out.push('2 DATE ' + gedDate(m.ngaySinh));
        if (m.noiSinh) out.push('2 PLAC ' + m.noiSinh);
      }
      if (m.ngayMat) {
        out.push('1 DEAT');
        out.push('2 DATE ' + gedDate(m.ngayMat));
      }
      if (m.noiAnTang) {
        out.push('1 BURI');
        out.push('2 PLAC ' + m.noiAnTang);
      }
      if (m.ngheNghiep) out.push('1 OCCU ' + m.ngheNghiep);
      if (m.tieuSu) out.push('1 NOTE ' + m.tieuSu.replace(/\r?\n/g, ' '));
      fams.forEach(function (f, fi) {
        if (f.husb === m.id || f.wife === m.id) out.push('1 FAMS @F' + (fi + 1) + '@');
        if (f.chil.indexOf(m.id) >= 0) out.push('1 FAMC @F' + (fi + 1) + '@');
      });
    });

    fams.forEach(function (f, fi) {
      out.push('0 @F' + (fi + 1) + '@ FAM');
      if (f.husb && idxOf[f.husb]) out.push('1 HUSB @' + idxOf[f.husb] + '@');
      if (f.wife && idxOf[f.wife]) out.push('1 WIFE @' + idxOf[f.wife] + '@');
      f.chil.forEach(function (c) { if (idxOf[c]) out.push('1 CHIL @' + idxOf[c] + '@'); });
    });

    out.push('0 TRLR');
    return out.join('\r\n');
  }

  var GED_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function gedDate(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!p) return iso || '';
    return (+p[3]) + ' ' + GED_MONTHS[(+p[2]) - 1] + ' ' + p[1];
  }
  function gedName(full) {
    var parts = (full || '').trim().split(/\s+/);
    if (parts.length < 2) return full;
    var given = parts.pop();
    return given + ' /' + parts.join(' ') + '/';
  }

  /** Nhập GEDCOM cơ bản */
  function importGEDCOM(text) {
    var lines = text.split(/\r?\n/);
    var indi = {}, fam = {}, cur = null, curType = null, sub = null;
    lines.forEach(function (line) {
      var m = /^(\d+)\s+(@[^@]+@\s+)?(\w+)\s*(.*)$/.exec(line.trim());
      if (!m) return;
      var lvl = +m[1], xref = m[2] ? m[2].trim() : null, tag = m[3], val = m[4] || '';
      if (lvl === 0) {
        sub = null;
        if (tag === 'INDI' || val === 'INDI') { curType = 'I'; cur = xref || val; indi[cur] = { id: cur, spouses: [] }; }
        else if (tag === 'FAM' || val === 'FAM') { curType = 'F'; cur = xref || val; fam[cur] = { chil: [] }; }
        else { curType = null; cur = null; }
      } else if (curType === 'I' && cur) {
        var p = indi[cur];
        if (lvl === 1) {
          sub = tag;
          if (tag === 'NAME') p.hoTen = val.replace(/\//g, '').replace(/\s+/g, ' ').trim();
          else if (tag === 'SEX') p.gioiTinh = val.trim() === 'F' ? 'nu' : 'nam';
          else if (tag === 'OCCU') p.ngheNghiep = val;
          else if (tag === 'NOTE') p.tieuSu = val;
          else if (tag === 'FAMC') p._famc = val.trim();
          else if (tag === 'FAMS') (p._fams = p._fams || []).push(val.trim());
        } else if (lvl === 2 && tag === 'DATE') {
          if (sub === 'BIRT') p.ngaySinh = parseGedDate(val);
          if (sub === 'DEAT') { p.ngayMat = parseGedDate(val); p.conSong = false; }
        } else if (lvl === 2 && tag === 'PLAC') {
          if (sub === 'BIRT') p.noiSinh = val;
          if (sub === 'BURI') p.noiAnTang = val;
        }
      } else if (curType === 'F' && cur) {
        if (tag === 'HUSB') fam[cur].husb = val.trim();
        else if (tag === 'WIFE') fam[cur].wife = val.trim();
        else if (tag === 'CHIL') fam[cur].chil.push(val.trim());
      }
    });

    var d = emptyData();
    var idMap = {};
    Object.keys(indi).forEach(function (k) {
      var p = indi[k];
      var nm = normalizeMember({ hoTen: p.hoTen || 'Chưa rõ', gioiTinh: p.gioiTinh, ngaySinh: p.ngaySinh, ngayMat: p.ngayMat, noiSinh: p.noiSinh, noiAnTang: p.noiAnTang, ngheNghiep: p.ngheNghiep, tieuSu: p.tieuSu, conSong: p.conSong });
      idMap[k] = nm.id;
      d.members.push(nm);
    });
    var mById = {};
    d.members.forEach(function (m) { mById[m.id] = m; });
    Object.keys(fam).forEach(function (k) {
      var f = fam[k];
      var h = idMap[f.husb], w = idMap[f.wife];
      if (h && w) {
        mById[h].spouses.push({ id: w, quanHe: 'vo_chong', ngayCuoi: '' });
        mById[w].spouses.push({ id: h, quanHe: 'vo_chong', ngayCuoi: '' });
      }
      f.chil.forEach(function (c) {
        var ci = idMap[c];
        if (!ci) return;
        if (h) mById[ci].fatherId = h;
        if (w) mById[ci].motherId = w;
      });
    });
    setData(d);
    return d;
  }

  function parseGedDate(v) {
    var m = /(\d{1,2})?\s*([A-Z]{3})?\s*(\d{4})/.exec((v || '').toUpperCase());
    if (!m) return '';
    var y = m[3];
    var mo = m[2] ? GED_MONTHS.indexOf(m[2]) + 1 : 1;
    var dd = m[1] ? +m[1] : 1;
    if (!y) return '';
    if (mo < 1) mo = 1;
    return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (dd < 10 ? '0' : '') + dd;
  }

  /* ------------------------------ Export ------------------------------ */

  global.Store = {
    uid: uid, clone: clone, emptyData: emptyData, normalizeMember: normalizeMember,
    load: load, save: save, on: on, getData: getData, setData: setData,
    snapshot: snapshot, undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo,
    members: members, byId: byId, addMember: addMember, updateMember: updateMember,
    removeMember: removeMember, childrenOf: childrenOf, childrenOfCouple: childrenOfCouple,
    spousesOf: spousesOf, parentsOf: parentsOf, siblingsOf: siblingsOf, roots: roots,
    generations: generations, genOf: genOf, maxGen: maxGen,
    ancestorMap: ancestorMap, descendantsOf: descendantsOf, sortSiblings: sortSiblings,
    addEvent: addEvent, updateEvent: updateEvent, removeEvent: removeEvent,
    addDoc: addDoc, updateDoc: updateDoc, removeDoc: removeDoc,
    prefs: prefs, setPref: setPref,
    exportJSON: exportJSON, importJSON: importJSON, exportCSV: exportCSV,
    exportGEDCOM: exportGEDCOM, importGEDCOM: importGEDCOM
  };
})(window);
