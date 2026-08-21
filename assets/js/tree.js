/* ==========================================================================
   tree.js — Bố cục & vẽ phả đồ bằng SVG (zoom, pan, thu gọn nhánh)
   ========================================================================== */
(function (global) {
  'use strict';

  var S = global.Store;
  var NS = 'http://www.w3.org/2000/svg';

  var CARD_W = 182;
  var CARD_H = 74;
  var SPOUSE_GAP = 14;
  var SIB_GAP = 26;
  var LEVEL_H = 142;
  var PAD = 60;

  /* ------------------------- Bố cục (layout) ------------------------- */

  /**
   * Tính bố cục cây từ gốc rootId.
   * @returns {{units:Array, links:Array, width:number, height:number}}
   */
  function layout(rootId, opts) {
    opts = opts || {};
    var collapsed = opts.collapsed || {};
    var units = [];
    var links = [];
    var visited = {};

    function unitMembers(id) {
      var m = S.byId(id);
      if (!m) return [];
      var arr = [m];
      S.spousesOf(id).forEach(function (s) {
        if (!visited[s.person.id]) arr.push(s.person);
      });
      return arr;
    }

    function widthOfUnit(n) {
      n = n || 1;
      return n * CARD_W + (n - 1) * SPOUSE_GAP;
    }

    function kidsOf(id) {
      if (collapsed[id]) return [];
      return S.childrenOf(id).filter(function (c) { return !visited[c.id]; });
    }

    function measure(id) {
      if (visited[id]) return 0;
      visited[id] = true;
      var mem = unitMembers(id);
      mem.slice(1).forEach(function (s) { visited[s.id] = true; });
      var uw = widthOfUnit(mem.length);
      var kids = kidsOf(id);
      var kw = 0;
      var childW = [];
      kids.forEach(function (c, i) {
        var w = measure(c.id);
        childW.push(w);
        kw += w + (i ? SIB_GAP : 0);
      });
      var total = Math.max(uw, kw);
      sizeCache[id] = { uw: uw, kw: kw, total: total, kids: kids, childW: childW, mem: mem };
      return total;
    }

    var sizeCache = {};
    visited = {};
    var rootWidth = measure(rootId);

    var maxY = 0;
    function place(id, left, depth) {
      var c = sizeCache[id];
      if (!c) return;
      var center = left + c.total / 2;
      var ux = center - c.uw / 2;
      var y = PAD + depth * LEVEL_H;
      maxY = Math.max(maxY, y + CARD_H);

      var cards = c.mem.map(function (p, i) {
        return {
          id: p.id, person: p,
          x: ux + i * (CARD_W + SPOUSE_GAP), y: y,
          w: CARD_W, h: CARD_H,
          isSpouse: i > 0,
          doi: S.genOf(p.id)
        };
      });
      units.push({ id: id, cards: cards, x: ux, y: y, w: c.uw, center: center, depth: depth,
        collapsed: !!collapsed[id], childCount: S.childrenOf(id).length });

      // đường nối vợ chồng
      for (var i = 1; i < cards.length; i++) {
        links.push({ type: 'spouse', x1: cards[i - 1].x + CARD_W, y1: y + CARD_H / 2,
          x2: cards[i].x, y2: y + CARD_H / 2 });
      }

      if (!c.kids.length) return;

      var kw = c.kw;
      var startX = center - kw / 2;
      var busY = y + CARD_H + (LEVEL_H - CARD_H) / 2;
      var parentX = cards.length > 1 ? (cards[0].x + CARD_W + (cards[1] ? (cards[1].x - cards[0].x - CARD_W) / 2 : 0)) : center;
      if (cards.length > 1) parentX = cards[0].x + CARD_W + SPOUSE_GAP / 2;

      links.push({ type: 'drop', x1: parentX, y1: y + CARD_H, x2: parentX, y2: busY });

      var childCenters = [];
      var cx = startX;
      c.kids.forEach(function (kid, i) {
        var w = c.childW[i];
        place(kid.id, cx, depth + 1);
        var kc = sizeCache[kid.id];
        var kidCenter = cx + (kc ? kc.total : w) / 2;
        // vị trí thẻ đầu của con
        var kidCardX = kidCenter - (kc ? kc.uw : CARD_W) / 2 + CARD_W / 2;
        childCenters.push(kidCardX);
        links.push({ type: 'up', x1: kidCardX, y1: busY, x2: kidCardX, y2: y + LEVEL_H });
        cx += w + SIB_GAP;
      });

      if (childCenters.length) {
        var minX = Math.min.apply(null, childCenters.concat([parentX]));
        var maxX = Math.max.apply(null, childCenters.concat([parentX]));
        links.push({ type: 'bus', x1: minX, y1: busY, x2: maxX, y2: busY });
      }
    }

    place(rootId, PAD, 0);

    var minX = Infinity, maxX = -Infinity;
    units.forEach(function (u) {
      u.cards.forEach(function (cd) {
        minX = Math.min(minX, cd.x);
        maxX = Math.max(maxX, cd.x + cd.w);
      });
    });
    if (!isFinite(minX)) { minX = 0; maxX = CARD_W; }

    return {
      units: units, links: links,
      minX: minX - PAD, maxX: maxX + PAD,
      width: (maxX - minX) + PAD * 2,
      height: maxY + PAD
    };
  }

  /* --------------------------- Vẽ SVG --------------------------- */

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function yearOf(iso) {
    var m = (iso || '').match(/^(\d{4})/);
    return m ? m[1] : '';
  }

  function lifeSpan(p) {
    var b = yearOf(p.ngaySinh), d = yearOf(p.ngayMat);
    if (!b && !d) return p.ngayMat ? '† chưa rõ năm' : '';
    if (b && d) return b + ' – ' + d;
    if (b) return b + (p.conSong === false ? ' – ?' : '');
    return '? – ' + d;
  }

  /** Cắt chuỗi theo số ký tự ước lượng vừa với chiều rộng */
  function fitLines(text, maxChars, maxLines) {
    var words = (text || '').split(/\s+/).filter(Boolean);
    var lines = [], cur = '';
    words.forEach(function (w) {
      if (!cur) { cur = w; return; }
      if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      lines[maxLines - 1] = last.length > maxChars - 1 ? last.slice(0, maxChars - 1) + '…' : last + '…';
    }
    return lines;
  }

  /**
   * Vẽ toàn bộ phả đồ vào một <svg>.
   * @param {Object} opts { rootId, collapsed, highlight:{}, selectedId, showPhoto, onSelect, onToggle }
   */
  function render(container, opts) {
    opts = opts || {};
    var lo = layout(opts.rootId, opts);
    container.innerHTML = '';

    var svg = el('svg', {
      class: 'tree-svg',
      xmlns: NS,
      viewBox: lo.minX + ' 0 ' + (lo.maxX - lo.minX) + ' ' + lo.height,
      width: (lo.maxX - lo.minX), height: lo.height
    });

    var defs = el('defs');
    // Bóng đổ nhẹ cho thẻ
    defs.innerHTML =
      '<filter id="cardShadow" x="-20%" y="-20%" width="140%" height="150%">' +
      '<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.16"/>' +
      '</filter>';
    svg.appendChild(defs);

    var gLinks = el('g', { class: 'tree-links' });
    var gNodes = el('g', { class: 'tree-nodes' });
    svg.appendChild(gLinks);
    svg.appendChild(gNodes);

    lo.links.forEach(function (l) {
      var line = el('path', {
        class: 'tree-link tree-link--' + l.type,
        d: 'M' + l.x1 + ' ' + l.y1 + ' L' + l.x2 + ' ' + l.y2
      });
      gLinks.appendChild(line);
    });

    var highlight = opts.highlight || {};
    lo.units.forEach(function (u) {
      u.cards.forEach(function (cd) {
        gNodes.appendChild(card(cd, u, opts, highlight));
      });
      if (u.childCount && (u.collapsed || opts.showToggles !== false)) {
        gNodes.appendChild(toggle(u, opts));
      }
    });

    container.appendChild(svg);
    return { svg: svg, layout: lo };
  }

  function card(cd, unit, opts, highlight) {
    var p = cd.person;
    var g = el('g', {
      class: 'tree-card' +
        (p.gioiTinh === 'nu' ? ' is-nu' : ' is-nam') +
        (cd.isSpouse ? ' is-spouse' : '') +
        (p.ngayMat || p.conSong === false ? ' is-mat' : '') +
        (opts.selectedId === p.id ? ' is-selected' : '') +
        (highlight[p.id] ? ' is-highlight' : '') +
        (Object.keys(highlight).length && !highlight[p.id] ? ' is-dim' : ''),
      transform: 'translate(' + cd.x + ',' + cd.y + ')',
      'data-id': p.id,
      tabindex: '0',
      role: 'button'
    });

    g.appendChild(el('rect', { class: 'card-bg', x: 0, y: 0, width: cd.w, height: cd.h, rx: 12, filter: 'url(#cardShadow)' }));
    g.appendChild(el('rect', { class: 'card-accent', x: 0, y: 0, width: 5, height: cd.h, rx: 2.5 }));

    // Ảnh / chữ cái đầu
    var ax = 16, ay = cd.h / 2, ar = 19;
    if (opts.showPhoto !== false && p.anh) {
      var cid = 'clip_' + p.id.replace(/[^a-z0-9]/gi, '');
      var cp = el('clipPath', { id: cid });
      cp.appendChild(el('circle', { cx: ax + ar, cy: ay, r: ar }));
      g.appendChild(cp);
      var img = el('image', {
        x: ax, y: ay - ar, width: ar * 2, height: ar * 2,
        'clip-path': 'url(#' + cid + ')', preserveAspectRatio: 'xMidYMid slice'
      });
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', p.anh);
      img.setAttribute('href', p.anh);
      g.appendChild(img);
      g.appendChild(el('circle', { class: 'card-avatar-ring', cx: ax + ar, cy: ay, r: ar }));
    } else {
      g.appendChild(el('circle', { class: 'card-avatar', cx: ax + ar, cy: ay, r: ar }));
      var initial = (p.hoTen || '?').trim().split(/\s+/).pop().charAt(0).toUpperCase();
      var t0 = el('text', { class: 'card-initial', x: ax + ar, y: ay + 6, 'text-anchor': 'middle' });
      t0.textContent = initial;
      g.appendChild(t0);
    }

    var tx = ax + ar * 2 + 12;
    var maxChars = 17;
    var lines = fitLines(p.hoTen || 'Chưa rõ tên', maxChars, 2);
    var startY = lines.length === 1 ? 30 : 24;
    var nameEl = el('text', { class: 'card-name', x: tx, y: startY });
    lines.forEach(function (ln, i) {
      var ts = el('tspan', { x: tx, dy: i === 0 ? 0 : 15 });
      ts.textContent = ln;
      nameEl.appendChild(ts);
    });
    g.appendChild(nameEl);

    var sub = el('text', { class: 'card-sub', x: tx, y: startY + (lines.length === 1 ? 20 : 34) });
    var span = lifeSpan(p);
    sub.textContent = 'Đời ' + cd.doi + (span ? ' · ' + span : '');
    g.appendChild(sub);

    if (p.ngayMat || p.conSong === false) {
      var cross = el('text', { class: 'card-cross', x: cd.w - 12, y: 20, 'text-anchor': 'end' });
      cross.textContent = '✝';
      g.appendChild(cross);
    }

    var title = el('title');
    title.textContent = p.hoTen + (p.tenThuong ? ' (' + p.tenThuong + ')' : '') +
      '\nĐời ' + cd.doi + (span ? '\n' + span : '');
    g.appendChild(title);

    if (opts.onSelect) {
      g.addEventListener('click', function (e) { e.stopPropagation(); opts.onSelect(p.id); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onSelect(p.id); }
      });
    }
    return g;
  }

  function toggle(u, opts) {
    var cx = u.cards.length > 1 ? u.cards[0].x + CARD_W + SPOUSE_GAP / 2 : u.center;
    var cy = u.y + CARD_H + 12;
    var g = el('g', { class: 'tree-toggle' + (u.collapsed ? ' is-collapsed' : ''), transform: 'translate(' + cx + ',' + cy + ')' });
    g.appendChild(el('circle', { r: 10, cx: 0, cy: 0 }));
    var t = el('text', { x: 0, y: 4, 'text-anchor': 'middle' });
    t.textContent = u.collapsed ? String(u.childCount) : '–';
    g.appendChild(t);
    var ti = el('title');
    ti.textContent = u.collapsed ? 'Mở ' + u.childCount + ' người con' : 'Thu gọn nhánh';
    g.appendChild(ti);
    if (opts.onToggle) {
      g.addEventListener('click', function (e) { e.stopPropagation(); opts.onToggle(u.id); });
    }
    return g;
  }

  /* ------------------------ Zoom & Pan ------------------------ */

  function makePanZoom(viewport, inner) {
    var state = { scale: 1, x: 0, y: 0 };
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;

    function apply() {
      inner.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) scale(' + state.scale + ')';
    }

    viewport.addEventListener('pointerdown', function (e) {
      // Không kéo khi bấm vào thẻ, nút thu gọn hay các nút nổi trên khung
      if (e.button !== 0) return;
      if (e.target.closest('.tree-card, .tree-toggle, .tree-zoom, .tree-legend, button, a, input')) return;
      dragging = true;
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add('is-panning');
      sx = e.clientX; sy = e.clientY; ox = state.x; oy = state.y;
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      state.x = ox + (e.clientX - sx);
      state.y = oy + (e.clientY - sy);
      apply();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      viewport.addEventListener(ev, function () {
        dragging = false;
        viewport.classList.remove('is-panning');
      });
    });
    viewport.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      var rect = viewport.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(mx, my, factor);
    }, { passive: false });

    function zoomAt(mx, my, factor) {
      var ns = Math.min(3, Math.max(0.12, state.scale * factor));
      var k = ns / state.scale;
      state.x = mx - k * (mx - state.x);
      state.y = my - k * (my - state.y);
      state.scale = ns;
      apply();
    }

    return {
      state: state,
      apply: apply,
      zoomIn: function () { var r = viewport.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.2); },
      zoomOut: function () { var r = viewport.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.2); },
      setScale: function (s) { state.scale = s; apply(); },
      reset: function () { state.scale = 1; state.x = 0; state.y = 0; apply(); },
      fit: function (w, h) {
        var r = viewport.getBoundingClientRect();
        if (!w || !h || !r.width) return;
        var s = Math.min((r.width - 40) / w, (r.height - 40) / h, 1.4);
        // Không thu nhỏ quá mức khiến chữ không đọc được — người dùng có thể kéo để xem tiếp
        state.scale = Math.max(0.42, s);
        state.x = (r.width - w * state.scale) / 2;
        state.y = 24;
        apply();
      },
      centerOn: function (x, y) {
        var r = viewport.getBoundingClientRect();
        state.x = r.width / 2 - x * state.scale;
        state.y = r.height / 3 - y * state.scale;
        apply();
      }
    };
  }

  global.Tree = {
    layout: layout,
    render: render,
    makePanZoom: makePanZoom,
    lifeSpan: lifeSpan,
    CARD_W: CARD_W, CARD_H: CARD_H, LEVEL_H: LEVEL_H
  };
})(window);
