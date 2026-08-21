/* ==========================================================================
   kinship.js — Tính quan hệ & cách xưng hô theo lối Việt Nam
   Trả lời câu hỏi: "A gọi B là gì?"
   ========================================================================== */
(function (global) {
  'use strict';

  var S = global.Store;

  var BAC_TREN = {   // B là bề trên trực hệ của A, theo khoảng cách
    1: { nam: 'cha (bố)', nu: 'mẹ' },
    2: { nam: 'ông', nu: 'bà' },
    3: { nam: 'cụ ông', nu: 'cụ bà' },
    4: { nam: 'kỵ ông', nu: 'kỵ bà' },
    5: { nam: 'ông sơ', nu: 'bà sơ' }
  };
  var BAC_DUOI = { 1: 'con', 2: 'cháu', 3: 'chắt', 4: 'chút', 5: 'chít' };

  function yr(iso) {
    var m = (iso || '').match(/^(\d{4})/);
    return m ? +m[1] : 0;
  }

  /** So sánh tuổi: >0 nghĩa là a lớn tuổi hơn b */
  function olderThan(a, b) {
    var ya = yr(a.ngaySinh), yb = yr(b.ngaySinh);
    if (ya && yb && ya !== yb) return yb - ya;
    if ((a.thuTu || 0) !== (b.thuTu || 0)) return (b.thuTu || 0) - (a.thuTu || 0);
    return 0;
  }

  /** Đường đi lên tổ tiên: { ancestorId: [id A, ..., ancestorId] } */
  function pathsUp(id) {
    var best = {};
    var q = [[id]];
    var guard = 0;
    while (q.length && guard++ < 200000) {
      var path = q.shift();
      var cur = path[path.length - 1];
      if (best[cur] && best[cur].length <= path.length) continue;
      best[cur] = path;
      var m = S.byId(cur);
      if (!m) continue;
      if (path.length > 25) continue;
      if (m.fatherId) q.push(path.concat([m.fatherId]));
      if (m.motherId) q.push(path.concat([m.motherId]));
    }
    return best;
  }

  /** Đường đi lên nhánh nội (chỉ theo cha) — dùng để xác định nội/ngoại */
  function viaSide(path) {
    if (path.length < 2) return '';
    var first = S.byId(path[0]);
    if (!first) return '';
    if (first.fatherId === path[1]) return 'noi';
    if (first.motherId === path[1]) return 'ngoai';
    return '';
  }

  function noiNgoai(side) {
    return side === 'ngoai' ? 'ngoại' : (side === 'noi' ? 'nội' : '');
  }

  /**
   * Quan hệ huyết thống: A gọi B là gì.
   * @returns {null | {label, dA, dB, lca, pathA, pathB, doi}}
   */
  function bloodRelation(aId, bId) {
    if (aId === bId) return { label: 'chính mình', dA: 0, dB: 0, lca: aId, pathA: [aId], pathB: [bId] };
    var pa = pathsUp(aId), pb = pathsUp(bId);
    var best = null;
    Object.keys(pa).forEach(function (anc) {
      if (!pb[anc]) return;
      var dA = pa[anc].length - 1, dB = pb[anc].length - 1;
      var score = dA + dB;
      if (!best || score < best.score ||
        (score === best.score && viaSide(pa[anc]) === 'noi' && viaSide(best.pathA) !== 'noi')) {
        best = { score: score, dA: dA, dB: dB, lca: anc, pathA: pa[anc], pathB: pb[anc] };
      }
    });
    if (!best) return null;
    best.label = nameBlood(aId, bId, best);
    return best;
  }

  function nameBlood(aId, bId, r) {
    var A = S.byId(aId), B = S.byId(bId);
    if (!A || !B) return 'chưa rõ';
    var nam = B.gioiTinh === 'nam';
    var dA = r.dA;   // số đời từ A lên tới tổ tiên chung
    var dB = r.dB;   // số đời từ B lên tới tổ tiên chung

    /* --- dB = 0: tổ tiên chung chính là B → B là bề trên trực hệ của A --- */
    if (dB === 0) {
      var side = noiNgoai(viaSide(pathFromA(aId, bId)));
      var base = BAC_TREN[dA];
      var t = base ? (nam ? base.nam : base.nu)
        : 'tổ ' + (nam ? 'ông' : 'bà') + ' đời trên thứ ' + dA;
      if (dA >= 2 && side) t += ' ' + side;
      return t;
    }

    /* --- dA = 0: tổ tiên chung chính là A → B là hậu duệ trực hệ của A --- */
    if (dA === 0) {
      if (BAC_DUOI[dB]) {
        return BAC_DUOI[dB] + (dB === 1 ? (nam ? ' trai' : ' gái') : (nam ? ' trai' : ' gái'));
      }
      return 'hậu duệ đời dưới thứ ' + dB;
    }

    /* --- Anh chị em ruột --- */
    if (dA === 1 && dB === 1) {
      var older = olderThan(B, A) > 0;
      var cungChaMe = (A.fatherId && A.fatherId === B.fatherId) && (A.motherId && A.motherId === B.motherId);
      var t2 = older ? (nam ? 'anh' : 'chị') : 'em ' + (nam ? 'trai' : 'gái');
      return t2 + (cungChaMe ? ' ruột' : ' (cùng cha khác mẹ / cùng mẹ khác cha)');
    }

    /* --- dA < dB: A ở vai trên, B ở hàng cháu chắt bên nhánh --- */
    if (dA < dB) {
      var buoc = dB - dA;
      var ho = dA >= 2 ? ' họ' : '';
      if (buoc === 1) return 'cháu' + (dA >= 2 ? ' họ' : ' ruột') + ' (' + (nam ? 'trai' : 'gái') + ')';
      if (buoc === 2) return 'chắt' + ho;
      if (buoc === 3) return 'chút' + ho;
      if (buoc === 4) return 'chít' + ho;
      return 'hậu duệ hàng dưới ' + buoc + ' đời' + (dA >= 2 ? ' (bên họ)' : '');
    }

    /* --- dA > dB: B ở vai trên (bác/chú/cô/cậu/dì, ông bà họ) --- */
    if (dA > dB) {
      var buocTren = dA - dB;
      var sideA = noiNgoai(viaSide(r.pathA));
      var hoTag = dB >= 2 ? ' họ' : '';
      if (buocTren === 1) {
        var chaMe = S.byId(r.pathA[1]);            // cha hoặc mẹ của A
        var bLon = chaMe ? olderThan(B, chaMe) > 0 : true;
        if (sideA === 'ngoai') {
          return (nam ? (bLon ? 'bác (bên ngoại)' : 'cậu') : (bLon ? 'bác gái (bên ngoại)' : 'dì')) + hoTag;
        }
        return (nam ? (bLon ? 'bác' : 'chú') : (bLon ? 'bác gái' : 'cô')) + hoTag;
      }
      if (buocTren === 2) {
        var ongBa = S.byId(r.pathA[2]);            // ông hoặc bà của A
        var bLon2 = ongBa ? olderThan(B, ongBa) > 0 : true;
        if (nam) return (bLon2 ? 'ông bác' : 'ông chú') + (sideA ? ' (bên ' + sideA + ')' : '') + hoTag;
        return (sideA === 'ngoai' ? 'bà dì' : 'bà cô') + hoTag;
      }
      if (buocTren === 3) return (nam ? 'cụ ông' : 'cụ bà') + ' (anh/chị/em của cụ)' + hoTag;
      return 'bậc trên ' + buocTren + ' đời trong họ';
    }

    /* --- dA = dB: cùng vai, anh chị em họ --- */
    var doiHo = dA;
    var older2 = olderThan(B, A) > 0;
    var xung = older2 ? (nam ? 'anh' : 'chị') : 'em ' + (nam ? 'trai' : 'gái');
    if (doiHo === 2) return xung + ' họ (con chú con bác)';
    if (doiHo === 3) return xung + ' họ (chung cụ)';
    if (doiHo === 4) return xung + ' họ (chung kỵ)';
    var lca = S.byId(r.lca);
    return xung + ' họ xa' + (lca ? ' (chung tổ ' + lca.hoTen + ')' : '');
  }

  /** Lấy đường đi từ A lên tới B (nếu B là tổ tiên của A) */
  function pathFromA(aId, bId) {
    var pa = pathsUp(aId);
    return pa[bId] || [];
  }

  /**
   * Quan hệ đầy đủ (kể cả bên vợ/chồng, dâu/rể).
   * @returns {{label:string, chain:Array<{id,label}>, type:string}}
   */
  function relation(aId, bId) {
    var A = S.byId(aId), B = S.byId(bId);
    if (!A || !B) return { label: 'Không tìm thấy thành viên', chain: [], type: 'none' };
    if (aId === bId) return { label: 'chính mình', chain: [{ id: aId }], type: 'self' };

    // 1. Vợ chồng trực tiếp
    var direct = A.spouses.filter(function (s) { return s.id === bId; })[0];
    if (direct) {
      var lbl = B.gioiTinh === 'nam' ? 'chồng' : 'vợ';
      if (direct.quanHe === 'ke') lbl = B.gioiTinh === 'nam' ? 'chồng kế' : 'vợ kế';
      if (direct.quanHe === 'ly_hon') lbl += ' (đã ly hôn)';
      return { label: lbl, chain: buildChain([aId, bId]), type: 'spouse' };
    }

    // 2. Huyết thống
    var bl = bloodRelation(aId, bId);
    if (bl) {
      return {
        label: bl.label,
        chain: buildChain(bl.pathA.concat(bl.pathB.slice(0, -1).reverse())),
        type: 'blood', dA: bl.dA, dB: bl.dB, lca: bl.lca
      };
    }

    // 3. B là vợ/chồng của một người có huyết thống với A → dâu/rể
    var viaSpouse = null;
    for (var i = 0; i < B.spouses.length; i++) {
      var x = bloodRelation(aId, B.spouses[i].id);
      if (x) {
        if (!viaSpouse || (x.dA + x.dB) < (viaSpouse.r.dA + viaSpouse.r.dB)) {
          viaSpouse = { r: x, through: B.spouses[i].id };
        }
      }
    }
    if (viaSpouse) {
      return {
        label: inLawLabel(aId, B, viaSpouse.r, viaSpouse.through),
        chain: buildChain(viaSpouse.r.pathA.concat(viaSpouse.r.pathB.slice(0, -1).reverse()).concat([bId])),
        type: 'inlaw'
      };
    }

    // 4. A có vợ/chồng là huyết thống với B → bên vợ / bên chồng
    for (var j = 0; j < A.spouses.length; j++) {
      var sp = S.byId(A.spouses[j].id);
      if (!sp) continue;
      var y = bloodRelation(sp.id, bId);
      if (y) {
        var chong = sp.gioiTinh === 'nam';
        var ben = chong ? 'bên chồng' : 'bên vợ';
        var lbl4;
        if (y.dB === 0 && y.dA === 1) {
          lbl4 = (B.gioiTinh === 'nam' ? 'bố ' : 'mẹ ') + (chong ? 'chồng' : 'vợ');
        } else if (y.dB === 0 && y.dA === 2) {
          lbl4 = (B.gioiTinh === 'nam' ? 'ông ' : 'bà ') + (chong ? 'bên chồng' : 'bên vợ');
        } else if (y.dA === 1 && y.dB === 1) {
          var older4 = olderThan(B, sp) > 0;
          var ve = chong ? 'chồng' : 'vợ';
          lbl4 = B.gioiTinh === 'nam'
            ? (older4 ? 'anh ' + ve : 'em ' + ve)
            : (older4 ? 'chị ' + ve : 'em ' + ve);
        } else {
          lbl4 = y.label + ' ' + ben;
        }
        return {
          label: lbl4,
          chain: buildChain([aId].concat(y.pathA).concat(y.pathB.slice(0, -1).reverse())),
          type: 'inlaw'
        };
      }
    }

    return { label: 'không xác định được quan hệ trực tiếp', chain: [], type: 'none' };
  }

  /** B là vợ/chồng của "through" — mà "through" có quan hệ huyết thống r với A */
  function inLawLabel(aId, B, r, throughId) {
    var A = S.byId(aId);
    var Th = S.byId(throughId);
    var nam = B.gioiTinh === 'nam';
    var dA = r.dA, dB = r.dB;

    // through là hậu duệ của A
    if (dA === 0) {
      if (dB === 1) return nam ? 'con rể' : 'con dâu';
      if (dB === 2) return nam ? 'cháu rể' : 'cháu dâu';
      return nam ? 'rể (hàng cháu chắt)' : 'dâu (hàng cháu chắt)';
    }
    // through là bề trên trực hệ của A
    if (dB === 0) {
      if (dA === 1) return nam ? 'bố dượng' : 'mẹ kế';
      if (dA === 2) return nam ? 'ông (kế)' : 'bà (kế)';
      return nam ? 'cụ ông (kế)' : 'cụ bà (kế)';
    }
    // through là anh chị em ruột của A
    if (dA === 1 && dB === 1) {
      var older = (Th && A) ? olderThan(Th, A) > 0 : false;
      return nam ? (older ? 'anh rể' : 'em rể') : (older ? 'chị dâu' : 'em dâu');
    }
    // through ở vai trên A (chú, bác, cô, cậu, dì…)
    if (dA > dB) {
      var thLabel = Th ? nameBlood(aId, Th.id, r) : '';
      if (nam) {
        return /bác/.test(thLabel) ? 'bác (chồng của ' + thLabel + ')' : 'dượng (chồng của ' + thLabel + ')';
      }
      if (/cậu/.test(thLabel)) return 'mợ (vợ của cậu)';
      if (/bác/.test(thLabel)) return 'bác gái (vợ của bác)';
      if (/chú/.test(thLabel)) return 'thím (vợ của chú)';
      return 'vợ của ' + thLabel;
    }
    // through ở vai dưới A
    if (dA < dB) return nam ? 'cháu rể' : 'cháu dâu';
    // cùng vai — anh chị em họ
    var older2 = (Th && A) ? olderThan(Th, A) > 0 : false;
    return nam ? (older2 ? 'anh rể họ' : 'em rể họ') : (older2 ? 'chị dâu họ' : 'em dâu họ');
  }

  function buildChain(ids) {
    var seen = {};
    var out = [];
    ids.forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      var m = S.byId(id);
      if (m) out.push({ id: id, hoTen: m.hoTen, doi: S.genOf(id) });
    });
    return out;
  }

  /** Văn bản đầy đủ: "A gọi B là ..., B gọi A là ..." */
  function describe(aId, bId) {
    var r1 = relation(aId, bId);
    var r2 = relation(bId, aId);
    var A = S.byId(aId), B = S.byId(bId);
    return {
      forward: A && B ? A.hoTen + ' gọi ' + B.hoTen + ' là ' + r1.label : '',
      backward: A && B ? B.hoTen + ' gọi ' + A.hoTen + ' là ' + r2.label : '',
      chain: r1.chain.length ? r1.chain : r2.chain,
      r1: r1, r2: r2
    };
  }

  global.Kinship = {
    relation: relation,
    bloodRelation: bloodRelation,
    describe: describe,
    pathsUp: pathsUp
  };
})(window);
